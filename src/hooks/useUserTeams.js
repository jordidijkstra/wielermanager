import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export function useUserTeams(user, races) {
  const [userTeams, setUserTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserTeams = async () => {
      try {
        setLoading(true);
        const userTeamsRef = doc(db, 'users', user.uid, 'teams', 'allTeams');
        const teamsSnapshot = await getDoc(userTeamsRef);
        
        if (teamsSnapshot.exists()) {
          setUserTeams(Object.values(teamsSnapshot.data()) || []);
        } else {
          // Load teams from individual race documents
          const allTeams = [];
          if (races && races.length > 0) {
            for (const race of races) {
              const teamRef = doc(db, 'users', user.uid, 'teams', String(race.id));
              const teamSnap = await getDoc(teamRef);
              if (teamSnap.exists()) {
                allTeams.push({
                  raceId: race.id,
                  raceName: race.name,
                  raceStart: race.startDate,
                  ...teamSnap.data()
                });
              }
            }
          }
          setUserTeams(allTeams);
        }
      } catch (err) {
        console.error('Error loading user teams:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user && races && races.length > 0) {
      loadUserTeams();
    }
  }, [user, races]);

  return { userTeams, loading };
}
