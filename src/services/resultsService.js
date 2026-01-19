import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

// Cache for results
let resultsCache = null;
let resultsCacheTimestamp = 0;
const RESULTS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Haal alle results op (met caching)
export const getAllResults = async () => {
  const now = Date.now();
  
  // Check if cache is still valid
  if (resultsCache && (now - resultsCacheTimestamp) < RESULTS_CACHE_DURATION) {
    console.log('✅ Using cached results');
    return resultsCache;
  }
  
  console.log('📡 Fetching results from Firestore');
  const querySnapshot = await getDocs(collection(db, 'results'));
  const results = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  resultsCache = results;
  resultsCacheTimestamp = now;
  return results;
};

// Haal results voor een specifieke race op
export const getResultsByRace = async (raceId) => {
  const allResults = await getAllResults();
  return allResults.filter(result => result.raceId === raceId);
};

// Cache invalidation function
export const invalidateResultsCache = () => {
  console.log('🔄 Invalidating results cache');
  resultsCache = null;
  resultsCacheTimestamp = 0;
};
