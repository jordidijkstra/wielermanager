import { collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

// Cache for riders
let ridersCache = null;
let ridersCacheTimestamp = 0;
const RIDERS_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

export const getAllRiders = async () => {
  const now = Date.now();
  
  // Check if cache is still valid
  if (ridersCache && (now - ridersCacheTimestamp) < RIDERS_CACHE_DURATION) {
    console.log('✅ Using cached riders');
    return ridersCache;
  }
  
  console.log('📡 Fetching riders from Firestore');
  const snapshot = await getDocs(collection(db, 'riders'));
  const riders = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  ridersCache = riders;
  ridersCacheTimestamp = now;
  return riders;
};

export const getAverageRiderPrice = async () => {
  const riders = await getAllRiders();
  const filteredRiders = riders.filter(rider => rider.price > 5000000);
  
  if (filteredRiders.length === 0) return 0;
  
  const totalPrice = filteredRiders.reduce((sum, rider) => sum + (rider.price || 0), 0);
  return totalPrice / filteredRiders.length;
};

export const updateRider = async ({ id, firstname, lastname, firstnameWithoutSpecialChars, lastnameWithoutSpecialChars, teamId, price, points }) => {
  const riderRef = doc(db, 'riders', id.toString());
  await setDoc(riderRef, {
    id: Number(id),
    firstname,
    lastname,
    firstnameWithoutSpecialChars: firstnameWithoutSpecialChars || '',
    lastnameWithoutSpecialChars: lastnameWithoutSpecialChars || '',
    teamId: Number(teamId),
    price: Number(price),
    points: Number(points) || 0
  }, { merge: true });
};

export const updateRidersPointsFromResults = async (raceResults, raceId = null) => {
  // raceResults is an array of { riderId, points }
  // raceId is optional - if provided, will also save per-race stats
  const updates = {};
  
  for (const result of raceResults) {
    // Skip rider 911 (placeholder/test rider)
    if (!result.riderId || result.riderId === '911' || result.riderId === 911 || result.points === undefined) continue;
    
    const riderId = result.riderId.toString();
    if (!updates[riderId]) {
      updates[riderId] = 0;
    }
    updates[riderId] += Number(result.points || 0);
  }
  
  // Update each rider's points
  for (const [riderId, pointsToAdd] of Object.entries(updates)) {
    try {
      const riderRef = doc(db, 'riders', riderId);
      const currentRiderDoc = await getDoc(riderRef);
      const currentRider = currentRiderDoc.exists() ? currentRiderDoc.data() : null;
      
      const currentPoints = currentRider?.points || 0;
      const newPoints = currentPoints + pointsToAdd;
      
      await setDoc(riderRef, {
        points: newPoints
      }, { merge: true });
      
      console.log(`✅ Punten geupdate voor rider ${riderId}: ${currentPoints} + ${pointsToAdd} = ${newPoints}`);

      // Also save per-race points if raceId is provided
      if (raceId) {
        const riderResultRef = doc(db, 'riders', riderId, 'riderResults', String(raceId));
        await setDoc(riderResultRef, {
          raceId,
          points: pointsToAdd,
          timestamp: new Date().toISOString()
        }, { merge: true });
        console.log(`📊 Race punten opgeslagen voor rider ${riderId} in race ${raceId}: ${pointsToAdd}`);
      }
    } catch (error) {
      console.error(`Error updating points for rider ${riderId}:`, error);
    }
  }

  // Invalidate cache so next load gets fresh data
  invalidateRidersCache();
};

export const removeRidersPointsFromResults = async (raceResults, raceId = null) => {
  // raceResults is an array of { riderId, points } - verwijder deze punten
  const updates = {};
  
  for (const result of raceResults) {
    // Skip rider 911 (placeholder/test rider)
    if (!result.riderId || result.riderId === '911' || result.riderId === 911 || result.points === undefined) continue;
    
    const riderId = result.riderId.toString();
    if (!updates[riderId]) {
      updates[riderId] = 0;
    }
    updates[riderId] += Number(result.points || 0);
  }
  
  // Update each rider's points (subtract)
  for (const [riderId, pointsToRemove] of Object.entries(updates)) {
    try {
      const riderRef = doc(db, 'riders', riderId);
      const currentRiderDoc = await getDoc(riderRef);
      const currentRider = currentRiderDoc.exists() ? currentRiderDoc.data() : null;
      
      const currentPoints = currentRider?.points || 0;
      const newPoints = Math.max(0, currentPoints - pointsToRemove); // Ensure no negative points
      
      await setDoc(riderRef, {
        points: newPoints
      }, { merge: true });
      
      console.log(`✅ Punten verwijderd voor rider ${riderId}: ${currentPoints} - ${pointsToRemove} = ${newPoints}`);

      // Also remove per-race points if raceId is provided
      if (raceId) {
        const riderResultRef = doc(db, 'riders', riderId, 'riderResults', String(raceId));
        await setDoc(riderResultRef, {
          points: 0,
          removed: true,
          timestamp: new Date().toISOString()
        }, { merge: true });
        console.log(`📊 Race punten verwijderd voor rider ${riderId} in race ${raceId}`);
      }
    } catch (error) {
      console.error(`Error removing points for rider ${riderId}:`, error);
    }
  }
  
  // Invalidate cache
  invalidateRidersCache();
};

// Cache invalidation function
export const invalidateRidersCache = () => {
  console.log('🔄 Invalidating riders cache');
  ridersCache = null;
  ridersCacheTimestamp = 0;
};

// Get per-race points for a specific rider
export const getRiderRacePoints = async (riderId) => {
  try {
    console.log(`🔍 Fetching riderResults from riders/${riderId}/riderResults`);
    const riderResultsSnap = await getDocs(collection(db, 'riders', riderId.toString(), 'riderResults'));
    console.log(`📦 Retrieved ${riderResultsSnap.docs.length} documents from riderResults subcollection`);
    
    const racePoints = riderResultsSnap.docs.map(doc => {
      console.log(`  - Document ID: ${doc.id}, Data:`, doc.data());
      return {
        raceId: doc.id,
        ...doc.data()
      };
    }).filter(r => !r.removed);
    
    console.log(`📊 Retrieved ${racePoints.length} race points for rider ${riderId} (after filtering removed entries)`);
    return racePoints;
  } catch (error) {
    console.error(`Error fetching race points for rider ${riderId}:`, error);
    return [];
  }
};

// Get total points from race history (for statistics)
export const getTotalPointsFromRaces = async (riderId) => {
  const racePoints = await getRiderRacePoints(riderId);
  const totalFromRaces = racePoints
    .filter(r => !r.removed)
    .reduce((sum, r) => sum + (Number(r.points) || 0), 0);
  
  return totalFromRaces;
};

// Add race leader (GC) points to a rider
// Used for multi-day races (stages) to award points to the race leader
export const addRaceLeaderPoints = async (riderId, raceLeaderPoints, raceId = null, raceName = null) => {
  if (!riderId || !raceLeaderPoints || raceLeaderPoints <= 0) {
    console.warn('⚠️ Invalid race leader points data');
    return;
  }

  try {
    const riderId_str = riderId.toString();
    const riderRef = doc(db, 'riders', riderId_str);
    const currentRiderDoc = await getDoc(riderRef);
    const currentRider = currentRiderDoc.exists() ? currentRiderDoc.data() : null;
    
    const currentPoints = currentRider?.points || 0;
    const newPoints = currentPoints + raceLeaderPoints;
    
    await setDoc(riderRef, {
      points: newPoints
    }, { merge: true });
    
    console.log(`✅ Race leader punten geupdate voor rider ${riderId}: ${currentPoints} + ${raceLeaderPoints} = ${newPoints}`);

    // Also save per-race race leader points if raceId is provided
    if (raceId) {
      const riderResultRef = doc(db, 'riders', riderId_str, 'riderResults', String(raceId));
      const existingData = await getDoc(riderResultRef);
      const existingPoints = existingData.exists() ? (existingData.data().points || 0) : 0;
      const existingRaceLeader = existingData.exists() ? (existingData.data().raceLeaderPoints || 0) : 0;
      const existingRaceName = existingData.exists() ? existingData.data().raceName : raceName;
      
      // Update with race leader points (don't overwrite existing points)
      await setDoc(riderResultRef, {
        raceId: String(raceId),
        raceName: existingRaceName || raceName,
        points: existingPoints,
        raceLeaderPoints: existingRaceLeader + raceLeaderPoints,
        timestamp: new Date().toISOString()
      }, { merge: true });
      console.log(`🏆 Race leader punten opgeslagen voor rider ${riderId} in race ${raceId} (${existingRaceName || raceName}): ${raceLeaderPoints}`);
    }
    
    // Invalidate cache
    invalidateRidersCache();
  } catch (error) {
    console.error(`Error adding race leader points for rider ${riderId}:`, error);
  }
};