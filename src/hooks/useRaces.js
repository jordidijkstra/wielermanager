import { useState, useEffect, useMemo } from 'react';
import { getAllRaces, getRaceById, getRaceTeam, saveRaceTeam, getUserRaceTeams, invalidateRacesCache } from '../services/raceService';
import { setDoc, deleteDoc, doc, collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

export function useRaces(user) {
  const [races, setRaces] = useState([]);
  const [userRaceTeams, setUserRaceTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState('');

  // Laad alle races
  const loadRaces = async () => {
    try {
      setLoading(true);
      const racesData = await getAllRaces();
      setRaces(racesData);
    } catch (err) {
      console.error('Fout bij laden races:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Set up real-time listener
    setLoading(true);
    try {
      const racesRef = collection(db, 'races');
      const unsubscribe = onSnapshot(racesRef, (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRaces(data);
        setLoading(false);
        console.log('🔄 Real-time races update:', data.length, 'races');
      }, (error) => {
        console.error('Error in real-time listener:', error);
        setLoading(false);
      });
      
      return () => unsubscribe();
    } catch (err) {
      console.error('Fout bij setup real-time listener:', err);
      setLoading(false);
    }
  }, []);

  // Memoize races array om onnodig re-renders te voorkomen
  // Sort races: main races first (by endDate), then stages (by startDate)
  // This ensures:
  // 1. RaceCountdown finds main races first chronologically
  // 2. TeamDetails correctly groups speeldagen by endDate/startDate
  const memoizedRaces = useMemo(() => {
    return [...races].sort((a, b) => {
      // Separate main races and stages
      const aIsStage = a.tourId != null && a.tourId !== undefined;
      const bIsStage = b.tourId != null && b.tourId !== undefined;
      
      // Main races come before stages
      if (!aIsStage && bIsStage) return -1;
      if (aIsStage && !bIsStage) return 1;
      
      // Within same category, sort by relevant date
      if (!aIsStage && !bIsStage) {
        // Both main races: sort by endDate
        const dateA = a.endDate || a.startDate || '';
        const dateB = b.endDate || b.startDate || '';
        return new Date(dateA) - new Date(dateB);
      }
      
      // Both stages: sort by startDate
      const dateA = a.startDate || '';
      const dateB = b.startDate || '';
      return new Date(dateA) - new Date(dateB);
    });
  }, [races]);

  // Laad user's race teams wanneer user verandert
  useEffect(() => {
    const loadUserRaceTeams = async () => {
      if (!user) return;
      try {
        const teams = await getUserRaceTeams(user.uid);
        setUserRaceTeams(teams);
      } catch (err) {
        console.error('Fout bij laden race teams:', err);
      }
    };
    loadUserRaceTeams();
  }, [user]);

  // Sla race team op
  const saveTeamForRace = async (raceId, riderIds, riders, totalPrice) => {
    if (!user) {
      setSaveStatus('Je moet ingelogd zijn');
      return;
    }
    
    try {
      setSaveStatus('Aan het opslaan...');
      await saveRaceTeam({
        userId: user.uid,
        raceId,
        riderIds,
        riders,
        totalPrice
      });
      
      // Herlaad user's race teams
      const teams = await getUserRaceTeams(user.uid);
      setUserRaceTeams(teams);
      
      setSaveStatus('Race team opgeslagen! ✓');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (err) {
      setSaveStatus('Fout bij opslaan: ' + err.message);
      console.error(err);
    }
  };

  // Voeg nieuwe race toe
  const addRace = async (raceData) => {
    try {
      const maxId = races.length > 0 ? Math.max(...races.map(r => parseInt(r.id) || 0)) : 0;
      const newId = maxId + 1;
      
      await setDoc(doc(db, 'races', String(newId)), {
        id: newId,
        ...raceData
      });
      
      invalidateRacesCache();
      await loadRaces();
    } catch (err) {
      console.error('Fout bij toevoegen race:', err);
      throw err;
    }
  };

  // Update race
  const editRace = async (raceId, raceData) => {
    try {
      await setDoc(doc(db, 'races', String(raceId)), raceData);
      invalidateRacesCache();
      await loadRaces();
    } catch (err) {
      console.error('Fout bij bijwerken race:', err);
      throw err;
    }
  };

  // Verwijder race
  const removeRace = async (raceId) => {
    try {
      await deleteDoc(doc(db, 'races', String(raceId)));
      invalidateRacesCache();
      await loadRaces();
    } catch (err) {
      console.error('Fout bij verwijderen race:', err);
      throw err;
    }
  };

  // Memoize the entire return object so the reference doesn't change unnecessarily
  const returnValue = useMemo(() => ({
    races: memoizedRaces,
    userRaceTeams,
    loading,
    error,
    saveStatus,
    saveTeamForRace,
    getRaceById,
    getRaceTeam,
    addRace,
    editRace,
    removeRace,
    reload: loadRaces
  }), [memoizedRaces, userRaceTeams, loading, error, saveStatus]);

  return returnValue;
}
