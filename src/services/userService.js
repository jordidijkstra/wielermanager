import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

// Cache for user data
let usersCache = null;
let usersCacheTimestamp = 0;
const USERS_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

export const ensureUserDocument = async (user, userData = {}) => {
  if (!user) return;

  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      email: user.email,
      firstname: userData.firstname || '',
      lastname: userData.lastname || '',
      role: 'user',
      budget: 380000000,
      createdAt: serverTimestamp()
    });
    // Invalidate cache after creating new user
    invalidateUsersCache();
  }
};

export const getUserBudget = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data().budget || 380000000;
    }
    return 380000000;
  } catch (err) {
    console.error('Error fetching user budget:', err);
    return 380000000;
  }
};

// Get all users (cached)
export const getAllUsers = async () => {
  try {
    const now = Date.now();
    
    // Check if cache is still valid
    if (usersCache && (now - usersCacheTimestamp) < USERS_CACHE_DURATION) {
      console.log('✅ Using cached users');
      return usersCache;
    }
    
    console.log('📡 Fetching users from Firestore');
    const snapshot = await getDocs(collection(db, 'users'));
    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    usersCache = users;
    usersCacheTimestamp = now;
    return users;
  } catch (err) {
    console.error('Error loading users:', err);
    return usersCache || [];
  }
};

// Cache invalidation function
export const invalidateUsersCache = () => {
  console.log('🔄 Invalidating users cache');
  usersCache = null;
  usersCacheTimestamp = 0;
};

/**
 * Calculate team building deadline for a user based on their registration date
 * and the next upcoming race
 * @param {Object} user - User object from Firestore with createdAt timestamp
 * @param {Array} races - Array of race objects, should be sorted by startDate
 * @returns {Date|null} The deadline date (startDate of next race after user creation - 1 day at 9:00 AM)
 */
export const getUserTeamBuildingDeadline = (user, races) => {
  if (!user || !user.createdAt || !races || races.length === 0) {
    return null;
  }

  // Convert Firestore timestamp to Date
  const userCreatedTime = user.createdAt.toDate ? user.createdAt.toDate() : new Date(user.createdAt);

  // Find the first race that starts AFTER the user was created
  // (or use first race overall if all races are before user creation)
  let targetRace = races.find((race) => {
    if (!race.startDate) return false;
    const raceDate = new Date(race.startDate);
    return raceDate > userCreatedTime;
  });

  // If no future race found, use the first race overall
  if (!targetRace) {
    targetRace = races.find((race) => race.startDate);
  }

  if (!targetRace || !targetRace.startDate) {
    return null;
  }

  // Calculate deadline: race day at 10:00 AM
  const deadline = new Date(targetRace.startDate);
  deadline.setHours(17, 0, 0, 0);

  return deadline;
};

export const getUserData = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      return null;
    }
    return {
      id: snap.id,
      ...snap.data()
    };
  } catch (err) {
    console.error('Error fetching user data:', err);
    return null;
  }
};