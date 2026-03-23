import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getAllUsers } from '../services/userService';

// Simple cache for teams data
let teamsCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useRankingsData(resetTrigger) {
  const [allTeams, setAllTeams] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allUserRaceTeams, setAllUserRaceTeams] = useState({});
  const [allRiders, setAllRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        
        const now = Date.now();
        const shouldUseCache = teamsCache && (now - cacheTimestamp) < CACHE_DURATION;
        
        // Load all data in parallel
        const [ridersSnapshot, teamsSnapshot, usersData] = await Promise.all([
          getDocs(collection(db, 'riders')),
          shouldUseCache ? Promise.resolve(null) : getDocs(collection(db, 'teams')),
          getAllUsers()
        ]);

        // Process riders
        const ridersData = ridersSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter(rider => rider.id !== '911' && rider.id !== 911);
        setAllRiders(ridersData);

        // Process teams
        if (shouldUseCache) {
          console.log('✅ Using cached teams data');
          setAllTeams(teamsCache);
        } else if (teamsSnapshot) {
          console.log('📡 Fetching teams from Firestore');
          const teams = [];
          
          teamsSnapshot.forEach(doc => {
            // Skip bestteam - it's loaded separately via real-time listener or calculated locally
            if (doc.id === 'bestteam') return;
            
            teams.push({
              id: doc.id,
              ...doc.data()
            });
          });

          teamsCache = teams;
          cacheTimestamp = now;
          setAllTeams(teams);
        }
        
        // Set users
        setAllUsers(usersData);
        
        // Load all user race teams for points calculation
        const userRaceTeamsMap = {};
        // We use a for...of loop to handle async operations sequentially or we could map and Promise.all
        // The original code used a loop
        for (const userDoc of usersData) {
          const userId = userDoc.id;
          try {
            const teamsSnapshot = await getDocs(collection(db, `users/${userId}/teams`));
            const userTeams = {};
            teamsSnapshot.forEach(doc => {
              const data = doc.data();
              userTeams[parseInt(doc.id)] = {
                riderIds: data.riderIds || [],
                calculatedPoints: data.calculatedPoints || 0,
                riderPoints: data.riderPoints || {}
              };
            });
            userRaceTeamsMap[userId] = userTeams;
          } catch (err) {
            console.error(`Error loading race teams for user ${userId}:`, err);
          }
        }
        setAllUserRaceTeams(userRaceTeamsMap);
        
      } catch (err) {
        console.error('Fout bij laden data:', err);
        setError('Kon data niet laden. Controleer je Firestore permissions.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [resetTrigger]);

  return { 
    allTeams, 
    allUsers, 
    allUserRaceTeams, 
    allRiders, 
    loading, 
    error 
  };
}
