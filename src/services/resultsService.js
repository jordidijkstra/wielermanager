import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

// Haal alle results op
export const getAllResults = async () => {
  const querySnapshot = await getDocs(collection(db, 'results'));
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

// Haal results voor een specifieke race op
export const getResultsByRace = async (raceId) => {
  const querySnapshot = await getDocs(collection(db, 'results'));
  return querySnapshot.docs
    .filter(doc => doc.data().raceId === raceId)
    .map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
};
