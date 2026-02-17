import { collection, getDocs, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
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
  if (!raceResults || raceResults.length === 0) return;
  
  // Calculate total points to remove per rider
  const updates = {};
  
  for (const entry of raceResults) {
    if (!entry.riderId || entry.riderId === '911' || entry.riderId === 911) continue;
    
    // Support either { riderId, points } or simplified format
    const riderId = String(entry.riderId);
    const pointsToRemove = Number(entry.points) || 0;
    
    if (pointsToRemove > 0) {
      if (!updates[riderId]) {
        updates[riderId] = 0;
      }
      updates[riderId] += pointsToRemove;
    }
  }
  
  // Apply updates to each rider
  for (const riderId of Object.keys(updates)) {
    try {
      const pointsToRemove = updates[riderId];
      const riderRef = doc(db, 'riders', riderId);
      
      // Get current points
      const riderSnap = await getDoc(riderRef);
      if (riderSnap.exists()) {
        const currentPoints = riderSnap.data().points || 0;
        const newPoints = Math.max(0, currentPoints - pointsToRemove);
        
        await setDoc(riderRef, { points: newPoints }, { merge: true });
        console.log(`✅ Punten verwijderd voor rider ${riderId}: ${currentPoints} - ${pointsToRemove} = ${newPoints}`);
      }
      
      // If we know the raceId, we should delete the riderResult document entirely
      // instead of just setting points to 0. This keeps the subcollection clean.
      if (raceId) {
        // First try to delete the specific race result
        const resultRef = doc(db, `riders/${riderId}/riderResults`, String(raceId));
        await deleteDoc(resultRef);
        console.log(`🗑️ Race resultaat document verwijderd voor rider ${riderId} in race ${raceId}`);
      }
    } catch (error) {
      console.error(`Error removing points for rider ${riderId}:`, error);
    }
  }
  
  invalidateRidersCache();
};
  
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

/**
 * Get results for a specific rider in a specific race
 */
export const getRiderResult = async (riderId, raceId) => {
  try {
    const docRef = doc(db, 'riders', riderId.toString(), 'riderResults', String(raceId));
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error(`Error getting rider result for rider ${riderId} race ${raceId}:`, error);
    return null;
  }
};

/**
 * Get race leader points for a specific race category
 * Looks up the raceLeaderCategorie in the raceCategory document
 * Then fetches the points from pointsPerCategory
 */
export const getRaceLeaderPointsForCategory = async (raceCategoryId) => {
  if (!raceCategoryId) {
    console.warn('⚠️ No race category ID provided');
    return 0;
  }

  try {
    // Get the race category
    const raceCategoryRef = doc(db, 'raceCategories', String(raceCategoryId));
    const raceCategoryDoc = await getDoc(raceCategoryRef);
    
    if (!raceCategoryDoc.exists()) {
      console.warn(`⚠️ Race category ${raceCategoryId} not found`);
      return 0;
    }

    const raceCategoryData = raceCategoryDoc.data();
    // Check both potential field names for compatibility
    const raceLeaderCategoryId = raceCategoryData.raceLeaderCategorie || raceCategoryData.raceleaderCategory;

    if (!raceLeaderCategoryId) {
      console.log(`ℹ️ Race category ${raceCategoryId} has no race leader category`);
      return 0;
    }

    // Get the race leader points from pointsPerCategory
    const pointsCategoryRef = doc(db, 'pointsPerCategory', String(raceLeaderCategoryId));
    const pointsCategoryDoc = await getDoc(pointsCategoryRef);

    if (!pointsCategoryDoc.exists()) {
      console.warn(`⚠️ Points category ${raceLeaderCategoryId} not found`);
      return 0;
    }

    const pointsCategoryData = pointsCategoryDoc.data();
    // Assume first position (index 0) contains the race leader points
    const raceLeaderPoints = pointsCategoryData.points?.[0] || 0;

    console.log(`🏆 Race leader points for category ${raceCategoryId}: ${raceLeaderPoints} (from pointsPerCategory: ${raceLeaderCategoryId})`);
    return raceLeaderPoints;
  } catch (error) {
    console.error(`Error getting race leader points for category ${raceCategoryId}:`, error);
    return 0;
  }
};

/**
 * Sets race leader points for a rider in a specific race
 * Replaces existing race leader points (does not add to them)
 * Can set to 0 to remove race leader points
 */
export const setRaceLeaderPoints = async (riderId, raceLeaderPoints, raceId = null, raceName = null, oldRaceLeaderPoints = 0) => {
  if (!riderId || raceId === null) {
    console.warn('⚠️ Invalid race leader points data');
    return;
  }

  try {
    const riderId_str = riderId.toString();
    const pointsDifference = (raceLeaderPoints || 0) - (oldRaceLeaderPoints || 0);
    
    // Update rider's total points if there's a difference
    if (pointsDifference !== 0) {
      const riderRef = doc(db, 'riders', riderId_str);
      const currentRiderDoc = await getDoc(riderRef);
      const currentRider = currentRiderDoc.exists() ? currentRiderDoc.data() : null;
      
      const currentPoints = currentRider?.points || 0;
      const newPoints = currentPoints + pointsDifference;
      
      await setDoc(riderRef, {
        points: newPoints
      }, { merge: true });
      
      console.log(`✅ Race leader punten geupdate voor rider ${riderId}: ${currentPoints} + ${pointsDifference} = ${newPoints}`);
    }

    // Update per-race race leader points
    const riderResultRef = doc(db, 'riders', riderId_str, 'riderResults', String(raceId));
    const existingData = await getDoc(riderResultRef);
    const existingPoints = existingData.exists() ? (existingData.data().points || 0) : 0;
    const existingRaceName = existingData.exists() ? existingData.data().raceName : raceName;
    
    // Set (replace) race leader points
    await setDoc(riderResultRef, {
      raceId: String(raceId),
      raceName: existingRaceName || raceName,
      points: existingPoints,
      raceLeaderPoints: raceLeaderPoints || 0,
      timestamp: new Date().toISOString()
    }, { merge: true });
    console.log(`🏆 Race leader punten ingesteld voor rider ${riderId} in race ${raceId} (${existingRaceName || raceName}): ${raceLeaderPoints || 0}`);
    
    // Invalidate cache
    invalidateRidersCache();
  } catch (error) {
    console.error(`Error setting race leader points for rider ${riderId}:`, error);
  }
};