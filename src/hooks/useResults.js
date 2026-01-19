import { useState, useEffect } from 'react';
import { getAllResults } from '../services/resultsService';
import { setDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';

export function useResults() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadResults = async () => {
    setLoading(true);
    try {
      const data = await getAllResults();
      setResults(data);
    } catch (err) {
      console.error('Fout bij laden results:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResults();
  }, []);

  // Add result
  const addResult = async (resultData) => {
    try {
      const maxId = results.length > 0 ? Math.max(...results.map(r => parseInt(r.id) || 0)) : 0;
      const newId = (maxId + 1).toString();

      const docData = {
        id: newId,
        ...resultData
      };
      
      console.log('📝 Saving to Firestore, doc ID:', newId);
      console.log('📝 Doc data:', docData);

      await setDoc(doc(db, 'results', newId), docData);
      
      console.log('✅ Document saved to Firestore');
      await loadResults();
      return newId;
    } catch (err) {
      console.error('Fout bij toevoegen result:', err);
      throw err;
    }
  };

  // Edit result
  const editResult = async (resultId, resultData) => {
    try {
      await setDoc(doc(db, 'results', String(resultId)), resultData);
      await loadResults();
    } catch (err) {
      console.error('Fout bij bijwerken result:', err);
      throw err;
    }
  };

  // Delete result
  const deleteResult = async (resultId) => {
    try {
      await deleteDoc(doc(db, 'results', String(resultId)));
      await loadResults();
    } catch (err) {
      console.error('Fout bij verwijderen result:', err);
      throw err;
    }
  };

  return { results, loading, reload: loadResults, addResult, editResult, deleteResult };
}
