import { useState, useEffect } from 'react';
import { getCyclingTeams } from '../services/cyclingTeamService';

export function useCyclingTeams() {
  const [teams, setTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(true);

  const loadCyclingTeams = async () => {
    setLoadingTeams(true);
    try {
      const data = await getCyclingTeams();
      setTeams(data);
    } catch (err) {
      console.error('Fout bij laden riders:', err);
    } finally {
      setLoadingTeams(false);
    }
  };

  useEffect(() => {
    loadCyclingTeams();
  }, []);

  return { teams, loadingTeams, reload: loadCyclingTeams };
}