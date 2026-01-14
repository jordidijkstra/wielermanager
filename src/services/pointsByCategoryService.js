import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

export const getPointsByCategory = async (categoryId) => {
  try {
    // Haal alle pointsPerCategory documents op
    const snapshot = await getDocs(collection(db, 'pointsPerCategory'));
    
    // Zoek naar het document met matching categoryId
    let foundData = null;
    snapshot.forEach(doc => {
      if (doc.data().categoryId === categoryId || doc.id === String(categoryId)) {
        foundData = doc.data();
      }
    });

    if (foundData) {
      console.log('Found data for categoryId', categoryId, ':', foundData);
      // points is een array met [{points: 25, position: 1}, {points: 20, position: 2}, ...]
      // Retourneer alleen de punten waarden in volgorde van position
      if (foundData.points && Array.isArray(foundData.points)) {
        // Sort op position als het objecten zijn
        if (foundData.points.length > 0 && typeof foundData.points[0] === 'object' && foundData.points[0].position) {
          return foundData.points
            .sort((a, b) => a.position - b.position)
            .map(p => p.points);
        }
        // Anders retourneer ze gewoon (als het al een array van numbers is)
        return foundData.points;
      }
      return [];
    }
    
    console.log('No data found for categoryId:', categoryId);
    return [];
  } catch (error) {
    console.error('Fout bij laden pointByCategory:', error);
    return [];
  }
};
