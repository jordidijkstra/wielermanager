import { useState, useEffect } from 'react';
import { getUserTeam, saveUserTeam } from '../services/teamService';

export function useUserTeam(user, budget) {
  const [selectedRiders, setSelectedRiders] = useState([]);
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    const loadTeam = async () => {
      try {
        const teamData = await getUserTeam(user.uid);
        if (teamData && teamData.riders) {
          setSelectedRiders(teamData.riders);
        }
      } catch (err) {
        console.error('Fout bij laden team:', err);
      }
    };
    if (user) loadTeam();
  }, [user]);

  const getTotalSpent = () => selectedRiders.reduce((sum, r) => sum + r.price, 0);

  const addRider = (rider) => {
    if (selectedRiders.length >= 30) return alert('Max 30 renners!');
    if (selectedRiders.find(r => r.id === rider.id)) return alert('Deze renner zit al in je team!');
    if (getTotalSpent() + rider.price > budget) return alert('Budget overschreden!');
    setSelectedRiders([...selectedRiders, rider]);
  };

  const removeRider = (riderId) => {
    setSelectedRiders(selectedRiders.filter(r => r.id !== riderId));
  };

  const saveTeam = async () => {
  setSaveStatus('Opslaan...');
  console.log('Saving team for user:', user.uid);
    try {
      await saveUserTeam({
        userId: user.uid,
        riders: selectedRiders,
        totalSpent: getTotalSpent(),
        lastUpdated: new Date().toISOString()
      });
      setSaveStatus('Team opgeslagen! ✓');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (err) {
      setSaveStatus('Fout bij opslaan');
      console.error(err);
    }
  };

  return { selectedRiders, addRider, removeRider, saveTeam, saveStatus, getTotalSpent };
}