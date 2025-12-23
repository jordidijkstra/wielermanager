import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export const getUserTeam = async (userId) => {
  const snap = await getDoc(doc(db, 'teams', userId));
  return snap.exists() ? snap.data() : null;
};

export const saveUserTeam = async ({ userId, riders, totalSpent, lastUpdated }) => {
  if (!userId) throw new Error('Geen uid meegegeven aan saveUserTeam');
  await setDoc(doc(db, 'teams', userId), {
    userId,
    riders,
    totalSpent,
    lastUpdated: lastUpdated
  });
};