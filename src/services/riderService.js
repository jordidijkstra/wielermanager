import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export const getAllRiders = async () => {
  const snapshot = await getDocs(collection(db, 'riders'));
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

export const updateRider = async ({ id, firstname, lastname, teamId, price }) => {
  const riderRef = doc(db, 'riders', id.toString());
  await setDoc(riderRef, {
    id: Number(id),
    firstname,
    lastname,
    teamId: Number(teamId),
    price: Number(price)
  }, { merge: true });
};