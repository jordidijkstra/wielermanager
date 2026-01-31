import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

// Cache for pointsPerCategory
let pointsCategoryCache = null;
let pointsCategoryCacheTimestamp = 0;
const POINTS_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export const getPointsByCategory = async (categoryId) => {
  try {
    // Try to fetch directly using categoryId as doc ID first
    const docRef = doc(db, 'pointsPerCategory', String(categoryId));
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log('✅ Found data for categoryId', categoryId);
      return formatPoints(data);
    }
    
    // Fallback: check cache or load all and search
    const now = Date.now();
    let allPointsData = pointsCategoryCache;
    
    if (!allPointsData || (now - pointsCategoryCacheTimestamp) > POINTS_CACHE_DURATION) {
      console.log('📡 Loading pointsPerCategory cache');
      const snapshot = await getDocs(collection(db, 'pointsPerCategory'));
      allPointsData = {};
      snapshot.forEach(doc => {
        allPointsData[doc.id] = doc.data();
      });
      pointsCategoryCache = allPointsData;
      pointsCategoryCacheTimestamp = now;
    }
    
    // Search in cache
    let foundData = null;
    for (const [key, data] of Object.entries(allPointsData)) {
      if (data.categoryId === categoryId || key === String(categoryId)) {
        foundData = data;
        break;
      }
    }
    
    if (foundData) {
      console.log('✅ Found data for categoryId', categoryId, 'in cache');
      return formatPoints(foundData);
    }
    
    console.log('⚠️ No data found for categoryId:', categoryId);
    return [];
  } catch (error) {
    console.error('Fout bij laden pointByCategory:', error);
    return [];
  }
};

const formatPoints = (data) => {
  if (data.points && Array.isArray(data.points)) {
    // Sort op position als het objecten zijn
    if (data.points.length > 0 && typeof data.points[0] === 'object' && data.points[0].position) {
      return data.points
        .sort((a, b) => a.position - b.position)
        .map(p => p.points);
    }
    // Anders retourneer ze gewoon (als het al een array van numbers is)
    return data.points;
  }
  return [];
};

export const invalidatePointsCategoryCache = () => {
  console.log('🔄 Invalidating pointsPerCategory cache');
  pointsCategoryCache = null;
  pointsCategoryCacheTimestamp = 0;
};
