import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

export const ensureUserDocument = async (user) => {
  if (!user) return;

  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      email: user.email,
      role: 'user',
      budget: 380000000,
      createdAt: serverTimestamp()
    });
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