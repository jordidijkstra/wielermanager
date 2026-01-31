import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

// Cache for race categories
let raceCategoriesCache = null;
let raceCategoriesCacheTimestamp = 0;
const RACE_CATEGORIES_CACHE_DURATION = 60 * 60 * 1000; // 60 minutes (categories rarely change)

// Haal alle race categories op (met caching)
export const getAllRaceCategories = async () => {
  try {
    const now = Date.now();
    
    // Check if cache is still valid
    if (raceCategoriesCache && (now - raceCategoriesCacheTimestamp) < RACE_CATEGORIES_CACHE_DURATION) {
      console.log('✅ Using cached race categories');
      return raceCategoriesCache;
    }
    
    console.log('📡 Fetching race categories from Firestore');
    const querySnapshot = await getDocs(collection(db, 'raceCategories'));
    const categories = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    raceCategoriesCache = categories;
    raceCategoriesCacheTimestamp = now;
    return categories;
  } catch (error) {
    console.error('Error loading race categories:', error);
    return raceCategoriesCache || [];
  }
};

// Cache invalidation
export const invalidateRaceCategoriesCache = () => {
  console.log('🔄 Invalidating race categories cache');
  raceCategoriesCache = null;
  raceCategoriesCacheTimestamp = 0;
};
