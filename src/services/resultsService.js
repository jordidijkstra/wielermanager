import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

// Cache for results
let resultsCache = null;
let resultsCacheTimestamp = 0;
const RESULTS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Haal alle results op (met caching)
export const getAllResults = async () => {
  const now = Date.now();
  
  // Check if cache is still valid
  if (resultsCache && (now - resultsCacheTimestamp) < RESULTS_CACHE_DURATION) {
    console.log('✅ Using cached results');
    return resultsCache;
  }
  
  console.log('📡 Fetching results from Firestore');
  const querySnapshot = await getDocs(collection(db, 'results'));
  const results = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  resultsCache = results;
  resultsCacheTimestamp = now;
  return results;
};

// Haal results voor een specifieke race op
export const getResultsByRace = async (raceId) => {
  const allResults = await getAllResults();
  return allResults.filter(result => result.raceId === raceId);
};

// Cache invalidation function
export const invalidateResultsCache = () => {
  console.log('🔄 Invalidating results cache');
  resultsCache = null;
  resultsCacheTimestamp = 0;
};

// Recalculate team points for a specific race (stage)
// Call this after editing a result to update all users' calculated points
export const recalculateTeamPointsForRace = async (raceId, races) => {
  try {
    console.log(`🔄 Recalculating team points for race ${raceId}...`);
    
    const [usersSnapshot, raceResult] = await Promise.all([
      getDocs(collection(db, 'users')),
      getAllResults()
    ]);

    const race = races.find(r => r.id === parseInt(raceId) || r.id === raceId);
    if (!race) {
      console.warn(`⚠️ Race ${raceId} not found`);
      return;
    }

    const result = raceResult.find(r => r.raceId === parseInt(raceId) || r.raceId === raceId);
    if (!result || !result.entries) {
      console.warn(`⚠️ No result found for race ${raceId}`);
      return;
    }

    let updated = 0;

    // Process each user
    for (const userDoc of usersSnapshot.docs) {
      try {
        const userId = userDoc.id;

        // Get user's teams (selections)
        const teamsSnapshot = await getDocs(collection(db, `users/${userId}/teams`));
        const userTeams = {};
        teamsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          userTeams[parseInt(doc.id)] = {
            riderIds: data.riderIds || [],
            calculatedPoints: data.calculatedPoints || 0,
            riderPoints: data.riderPoints || {}
          };
        });

        // Get user's team
        const teamDoc = await getDocs(collection(db, 'teams'));
        const userTeamData = teamDoc.docs.find(d => d.id === userId);
        if (!userTeamData || !userTeamData.data().riders) {
          continue;
        }

        const teamRiders = userTeamData.data().riders || [];

        // Determine race ID to check for selections (tour ID for stages)
        const raceIdNum = typeof race.id === 'string' ? parseInt(race.id) : race.id;
        let raceIdToCheck = raceIdNum;
        if (race.tourId != null) {
          raceIdToCheck = typeof race.tourId === 'string' ? parseInt(race.tourId) : race.tourId;
        }

        // Get selected riders
        const selectedRiderIds = new Set((userTeams[raceIdToCheck] && userTeams[raceIdToCheck].riderIds) || []);

        // Calculate total points and per-rider breakdown
        let totalPoints = 0;
        const riderPoints = {};

        result.entries.forEach(entry => {
          const isInTeam = teamRiders.some(r => r.id === entry.riderId);
          const isSelected = selectedRiderIds.has(entry.riderId);
          const points = entry.points || 0;

          if (isInTeam && isSelected) {
            totalPoints += points;
          }

          // Store per-rider points
          riderPoints[entry.riderId] = points;
        });

        // Save updated points
        const existingData = userTeams[raceIdNum] ? { riderIds: userTeams[raceIdNum].riderIds } : {};
        await setDoc(
          doc(db, `users/${userId}/teams`, String(raceIdNum)),
          {
            ...existingData,
            calculatedPoints: totalPoints,
            riderPoints: riderPoints,
            lastCalculated: new Date()
          },
          { merge: true }
        );

        updated++;
        console.log(`✅ User ${userId}, Race ${raceIdNum}: ${totalPoints} points`);
      } catch (err) {
        console.error(`❌ Error processing user for race ${raceId}:`, err);
      }
    }

    console.log(`✅ Recalculation complete for race ${raceId}. Updated ${updated} users.`);
    invalidateResultsCache();
  } catch (err) {
    console.error('❌ Error recalculating team points:', err);
    throw err;
  }
};
