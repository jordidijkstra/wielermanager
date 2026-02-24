import { useState, useEffect } from 'react';
import { getAllResults } from '../services/resultsService';
import { setDoc, deleteDoc, doc, collection, onSnapshot, getDoc } from 'firebase/firestore';
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
    // Set up real-time listener
    setLoading(true);
    try {
      const resultsRef = collection(db, 'results');
      const unsubscribe = onSnapshot(resultsRef, (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setResults(data);
        setLoading(false);
        console.log('🔄 Real-time results update:', data.length, 'results');
      }, (error) => {
        console.error('Error in real-time listener:', error);
        setLoading(false);
      });
      
      return () => unsubscribe();
    } catch (err) {
      console.error('Fout bij setup real-time listener:', err);
      setLoading(false);
    }
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
      console.log('📝 Editing result:', String(resultId));
      console.log('📝 New data before cleaning:', resultData);
      
      // Remove any UI-only or unwanted fields before saving
      const cleanData = { ...resultData };
      delete cleanData.removed;
      delete cleanData.deleted;
      delete cleanData.isRaceLeader;
      delete cleanData.key;
      
      // Clean entries array - remove UI-only fields
      if (cleanData.entries && Array.isArray(cleanData.entries)) {
        cleanData.entries = cleanData.entries.map(entry => {
          const clean = { ...entry };
          delete clean.removed;
          delete clean.deleted;
          delete clean.isRaceLeader;
          delete clean.key;
          return clean;
        });
      }
      
      // Remove undefined values (Firestore doesn't allow undefined)
      Object.keys(cleanData).forEach(key => {
        if (cleanData[key] === undefined) {
          delete cleanData[key];
        }
      });
      
      console.log('📝 Clean data to save:', cleanData);
      await setDoc(doc(db, 'results', String(resultId)), cleanData, { merge: true });
      console.log('✅ Result saved to Firestore');
      
      // Reload all results to ensure UI is updated
      await loadResults();
      console.log('✅ Results reloaded');
    } catch (err) {
      console.error('Fout bij bijwerken result:', err);
      throw err;
    }
  };

  // Delete result
  const deleteResult = async (resultId) => {
    try {
      console.log(`🗑️ Deleting result ${resultId}...`);
      
      // Get the result first to know which rider results to clean up
      const resultRef = doc(db, 'results', String(resultId));
      const resultSnap = await getDoc(resultRef);

      if (resultSnap.exists()) {
        const resultData = resultSnap.data();
        const raceId = resultData.raceId;

        // If we found the raceId and entries, delete corresponding rider results
        if (raceId && resultData.entries && Array.isArray(resultData.entries)) {
          console.log(`🧹 Cleaning up rider results for race ${raceId}...`);
          
          const deletePromises = resultData.entries.map(async (entry) => {
            if (entry.riderId) {
              const riderResultRef = doc(db, 'riders', String(entry.riderId), 'riderResults', String(raceId));
              try {
                await deleteDoc(riderResultRef);
              } catch (e) {
                console.warn(`Failed to delete rider result for rider ${entry.riderId}:`, e);
              }
            }
          });
          
          await Promise.all(deletePromises);
          console.log(`✅ Cleaned up ${deletePromises.length} rider results`);
        }
      }

      // Finally delete the main result document
      await deleteDoc(resultRef);
      console.log('✅ Main result document deleted');
      
      await loadResults();
    } catch (err) {
      console.error('Fout bij verwijderen result:', err);
      throw err;
    }
  };

  return { results, loading, reload: loadResults, addResult, editResult, deleteResult };
}
