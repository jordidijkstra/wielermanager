import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

let teamsCache = null;
let teamsCacheTimestamp = 0;
const TEAMS_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

export const getCyclingTeams = async () => {
  try {
    const now = Date.now();
    
    // Check if cache is still valid
    if (teamsCache && (now - teamsCacheTimestamp) < TEAMS_CACHE_DURATION) {
      console.log('✅ Using cached cycling teams');
      return teamsCache;
    }
    
    console.log('📡 Fetching cycling teams from Firestore');
    const snapshot = await getDocs(collection(db, 'cyclingTeams'));
    const teams = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    teamsCache = teams;
    teamsCacheTimestamp = now;
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
};

// Cache invalidation function
export const invalidateCyclingTeamsCache = () => {
  console.log('🔄 Invalidating cycling teams cache');
  teamsCache = null;
  teamsCacheTimestamp = 0;
};