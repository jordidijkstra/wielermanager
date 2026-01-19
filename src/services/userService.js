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