import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
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

export const updateRidersPointsFromResults = async (raceResults) => {
  // raceResults is an array of { riderId, points }
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
      const currentRiderDoc = await getDocs(collection(db, 'riders'));
      const currentRider = currentRiderDoc.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .find(r => r.id === riderId);
      
      const currentPoints = currentRider?.points || 0;
      await setDoc(riderRef, {
        points: currentPoints + pointsToAdd
      }, { merge: true });
      
      console.log(`✅ Punten geupdate voor rider ${riderId}: +${pointsToAdd}`);
    } catch (error) {
      console.error(`Error updating points for rider ${riderId}:`, error);
    }
  }
};

export const removeRidersPointsFromResults = async (raceResults) => {
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
      const currentRiderDoc = await getDocs(collection(db, 'riders'));
      const currentRider = currentRiderDoc.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .find(r => r.id === riderId);
      
      const currentPoints = currentRider?.points || 0;
      const newPoints = Math.max(0, currentPoints - pointsToRemove); // Ensure no negative points
      await setDoc(riderRef, {
        points: newPoints
      }, { merge: true });
      
      console.log(`✅ Punten verwijderd voor rider ${riderId}: -${pointsToRemove}`);
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