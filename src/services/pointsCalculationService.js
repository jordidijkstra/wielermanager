import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Calculate total maximum points that can still be scored with a team
 * Takes into account:
 * - Only races that haven't been raced yet (status !== 'completed' and !== 'raced')
 * - Max riders per race
 * - Max points per rider = sum of ALL positions for that race's category
 */
export const calculateMaxPossibleTeamPoints = async () => {
  try {
    // Get all races
    const racesSnapshot = await getDocs(collection(db, 'races'));
    const races = racesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Filter for races that haven't been raced yet
    const upcomingRaces = races.filter(race => {
      return race.status !== 'completed' && race.status !== 'raced';
    });

    if (upcomingRaces.length === 0) {
      return {
        totalMaxPoints: 0,
        upcomingRacesCount: 0,
        races: [],
        breakdown: 'Geen races meer beschikbaar'
      };
    }

    // Get all points per category data
    const pointsPerCategorySnapshot = await getDocs(collection(db, 'pointsPerCategory'));
    const pointsPerCategory = {};
    
    pointsPerCategorySnapshot.docs.forEach(doc => {
      pointsPerCategory[doc.id] = doc.data();
    });

    let totalMaxPoints = 0;
    const raceBreakdown = [];

    // Calculate for each upcoming race
    for (const race of upcomingRaces) {
      const maxRiders = race.maxRiders || 8; // Default to 8 if not specified
      
      // Get max points per rider for this race's category
      // Max points = sum of all positions in pointsPerCategory
      const categoryPoints = pointsPerCategory[race.categoryId];
      let maxPointsPerRider = 0;

      if (categoryPoints && categoryPoints.points && Array.isArray(categoryPoints.points)) {
        // Sum ALL position points (not just top 3)
        maxPointsPerRider = categoryPoints.points.reduce((sum, p) => sum + (p.points || 0), 0);
      }

      const raceMaxPoints = maxRiders * maxPointsPerRider;
      totalMaxPoints += raceMaxPoints;

      raceBreakdown.push({
        raceId: race.id,
        raceName: race.name,
        raceDate: race.startDate,
        maxRiders,
        maxPointsPerRider,
        raceMaxPoints
      });
    }

    return {
      totalMaxPoints,
      upcomingRacesCount: upcomingRaces.length,
      races: raceBreakdown,
      breakdown: `${upcomingRaces.length} races × max riders × (som van alle positiepunten)`
    };
  } catch (error) {
    console.error('Fout bij berekenen max punten:', error);
    throw error;
  }
};

/**
 * Simpler version: just count races and calculate based on current settings
 */
export const calculateMaxPointsSimple = async () => {
  try {
    // Get all races
    const racesSnapshot = await getDocs(collection(db, 'races'));
    const races = racesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Filter for races that haven't been raced yet
    const upcomingRaces = races.filter(race => {
      return race.status !== 'completed' && race.status !== 'raced';
    });

    // Get points per category for average estimation
    const pointsPerCategorySnapshot = await getDocs(collection(db, 'pointsPerCategory'));
    let avgMaxPointsPerRider = 35; // default fallback

    if (pointsPerCategorySnapshot.docs.length > 0) {
      // Calculate average max points across all categories
      let totalCategoryPoints = 0;
      let categoryCount = 0;

      pointsPerCategorySnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.points && Array.isArray(data.points)) {
          const categoryMaxPoints = data.points.reduce((sum, p) => sum + (p.points || 0), 0);
          totalCategoryPoints += categoryMaxPoints;
          categoryCount++;
        }
      });

      avgMaxPointsPerRider = categoryCount > 0 ? Math.round(totalCategoryPoints / categoryCount) : 35;
    }

    // Calculate average max riders
    const avgMaxRiders = upcomingRaces.length > 0 
      ? Math.round(upcomingRaces.reduce((sum, r) => sum + (r.maxRiders || 8), 0) / upcomingRaces.length)
      : 8;

    const totalMaxPoints = upcomingRaces.length * avgMaxRiders * avgMaxPointsPerRider;

    return {
      totalMaxPoints,
      upcomingRacesCount: upcomingRaces.length,
      avgMaxRiders,
      avgMaxPointsPerRider,
      races: upcomingRaces.map(r => ({
        name: r.name,
        date: r.startDate,
        maxRiders: r.maxRiders || 8
      }))
    };
  } catch (error) {
    console.error('Fout bij berekenen max punten (simple):', error);
    throw error;
  }
};

