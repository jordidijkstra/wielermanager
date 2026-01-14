import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

// Haal alle race categories op
export const getAllRaceCategories = async () => {
  const querySnapshot = await getDocs(collection(db, 'raceCategories'));
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};
