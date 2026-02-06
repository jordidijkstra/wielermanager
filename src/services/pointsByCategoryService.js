import { collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
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

export const getAllPointsPerCategory = async () => {
  try {
    const pointsSnapshot = await getDocs(collection(db, 'pointsPerCategory'));
    const pointsMap = {};
    
    pointsSnapshot.forEach(docSnapshot => {
      const data = docSnapshot.data();
      
      const categoryId = data.categoryId || docSnapshot.id;
      const key = String(categoryId);
      
      let pointsArray = [];
      if (Array.isArray(data.points)) {
        pointsArray = data.points.map(p => {
          if (typeof p === 'object' && p !== null) {
            return parseInt(p.points || p.value || 0);
          }
          return parseInt(p || 0);
        });
      }
      
      pointsMap[key] = {
        id: docSnapshot.id,
        categoryId: categoryId,
        points: pointsArray
      };
    });
    
    return pointsMap;
  } catch (error) {
    console.error('Error getting all points per category:', error);
    throw error;
  }
};

export const savePointsPerCategory = async (docId, categoryId, points) => {
  try {
    await setDoc(doc(db, 'pointsPerCategory', String(docId)), {
      categoryId: categoryId,
      points: points
    });
    
    // Invalidate cache
    invalidatePointsCategoryCache();
  } catch (error) {
    console.error('Error saving points per category:', error);
    throw error;
  }
};
