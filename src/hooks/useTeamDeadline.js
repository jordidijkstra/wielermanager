import { useState, useEffect } from 'react';
import { getUserTeam, isTeamEditingDeadlinePassed } from '../services/teamService';
import { useRaces } from './useRaces';

export function useTeamDeadline(user) {
  const [deadlinePassed, setDeadlinePassed] = useState(false);
  const { races } = useRaces(user);

  useEffect(() => {
    if (!user) {
      setDeadlinePassed(false);
      return;
    }

    const checkDeadline = async () => {
      try {
        const teamData = await getUserTeam(user.uid);
        if (teamData && races.length > 0) {
          const isPassed = isTeamEditingDeadlinePassed(teamData, races);
          setDeadlinePassed(isPassed);
        } else {
          setDeadlinePassed(false);
        }
      } catch (err) {
        console.error('Fout bij checken deadline:', err);
        setDeadlinePassed(false);
      }
    };

    checkDeadline();
  }, [user, races]);

  return { deadlinePassed };
}
