import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

export const getCyclingTeams = async () => {
  const snapshot = await getDocs(collection(db, 'cyclingTeams'));
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

const teams = await getCyclingTeams();

export const getTeamJerseyPath = (teamId) => {
  const team = teams.find(t => t.id === teamId);
  return team?.cyclingKit
    ? `/assets/${team.cyclingKit}`
    : '/assets/default.webp';
}