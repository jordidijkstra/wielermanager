import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export const getAllRiders = async () => {
  const snapshot = await getDocs(collection(db, 'riders'));
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

export const getAverageRiderPrice = async () => {
  const riders = await getAllRiders();
  const filteredRiders = riders.filter(rider => rider.price > 5000000);
  
  if (filteredRiders.length === 0) return 0;
  
  const totalPrice = filteredRiders.reduce((sum, rider) => sum + (rider.price || 0), 0);
  return totalPrice / filteredRiders.length;
};

export const updateRider = async ({ id, firstname, lastname, firstnameWithoutSpecialChars, lastnameWithoutSpecialChars, teamId, price }) => {
  const riderRef = doc(db, 'riders', id.toString());
  await setDoc(riderRef, {
    id: Number(id),
    firstname,
    lastname,
    firstnameWithoutSpecialChars: firstnameWithoutSpecialChars || '',
    lastnameWithoutSpecialChars: lastnameWithoutSpecialChars || '',
    teamId: Number(teamId),
    price: Number(price)
  }, { merge: true });
};