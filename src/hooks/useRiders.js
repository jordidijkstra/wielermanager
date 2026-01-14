import { useState, useEffect } from 'react';
import { getAllRiders, updateRider } from '../services/riderService';
import { setDoc, deleteDoc, doc, collection } from 'firebase/firestore';
import { db } from '../firebase/config';

export function useRiders() {
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadRiders = async () => {
    setLoading(true);
    try {
      const data = await getAllRiders();
      setRiders(data);
    } catch (err) {
      console.error('Fout bij laden riders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRiders();
  }, []);

  // Edit/update rider
  const editRider = async (riderId, riderData) => {
    try {
      await updateRider({
        id: String(riderId),
        ...riderData
      });
      await loadRiders();
    } catch (err) {
      console.error('Fout bij bijwerken rider:', err);
      throw err;
    }
  };

  // Delete rider
  const deleteRider = async (riderId) => {
    try {
      await deleteDoc(doc(db, 'riders', String(riderId)));
      await loadRiders();
    } catch (err) {
      console.error('Fout bij verwijderen rider:', err);
      throw err;
    }
  };

  // Add new rider
  const addRider = async (riderData) => {
    try {
      const maxId = riders.length > 0 ? Math.max(...riders.map(r => parseInt(r.id) || 0)) : 0;
      const newId = (maxId + 1).toString();

      await setDoc(doc(collection(db, 'riders'), newId), {
        id: newId,
        ...riderData
      });

      await loadRiders();
      return newId;
    } catch (err) {
      console.error('Fout bij toevoegen rider:', err);
      throw err;
    }
  };

  return { riders, loading, reload: loadRiders, editRider, deleteRider, addRider };
}