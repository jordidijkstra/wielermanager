import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

let teamsCache = null;

export const getCyclingTeams = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'cyclingTeams'));
    const teams = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    teamsCache = teams;
    return teams;
  } catch (err) {
    console.error('Error loading cycling teams:', err);
    return teamsCache || [];
  }
};

export const getTeamJerseyPath = (teamId) => {
  const team = teamsCache?.find(t => t.id === teamId);
  return team?.cyclingKit
    ? `/assets/${team.cyclingKit}`
    : '/assets/default.webp';
}