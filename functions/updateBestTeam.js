const functions = require('firebase-functions');
const admin = require('firebase-admin');

const db = admin.firestore();

async function recalculateBestTeam(triggerSource) {
  try {
    console.log(`🔄 Recalculating best team (triggered by: ${triggerSource})`);

    // Get all riders
    const ridersSnap = await db.collection('riders').get();
    const riders = [];
    
    ridersSnap.forEach(doc => {
      if (doc.id !== '911' && doc.id !== 911) {
        riders.push({
          id: doc.id,
          ...doc.data()
        });
      }
    });

    // Calculate best possible team
    const BUDGET = 300000000; // 300 miljoen
    const MIN_RIDERS = 14;
    const MAX_RIDERS = 30;

    // Filter riders with price and points, sort by points descending
    const availableRiders = riders
      .filter(rider => rider.price && rider.points)
      .sort((a, b) => b.points - a.points);

    let team = [];
    let totalBudget = 0;
    let totalPoints = 0;
    const ignoredRiderIds = new Set();
    
    // Helper to calculate current stats
    const getStats = (t) => t.reduce((acc, r) => ({
      cost: acc.cost + (r.price || 0),
      points: acc.points + (r.points || 0)
    }), { cost: 0, points: 0 });

    // Loop to ensure we get a valid team (MIN_RIDERS constraint) within budget
    let iterations = 0;
    const MAX_ITERATIONS = 100; // prevent infinite loops

    while (iterations < MAX_ITERATIONS) {
      iterations++;
      
      // 1. Try to fill team with available riders
      for (const rider of availableRiders) {
        if (team.some(t => t.id === rider.id) || ignoredRiderIds.has(rider.id)) continue;
        
        const currentStats = getStats(team);
        const riderCost = rider.price || 0;
        
        if (currentStats.cost + riderCost <= BUDGET && team.length < MAX_RIDERS) {
          team.push(rider);
        }
      }
      
      // 2. Check if we met the constraint
      if (team.length >= MIN_RIDERS) {
        break; // Valid team found
      }
      
      // 3. If not, remove most expensive rider to free up budget for cheaper ones
      if (team.length === 0) {
        console.warn("Could not find any valid team with MIN_RIDERS constraint");
        break; 
      }
      
      // Find most expensive in current team
      const sortedByPrice = [...team].sort((a, b) => {
        const priceDiff = (b.price || 0) - (a.price || 0);
        if (priceDiff !== 0) return priceDiff;
        return (a.points || 0) - (b.points || 0); // ascending points -> remove lower points first if price equal
      });
      
      const mostExpensive = sortedByPrice[0];
      
      // Remove from team and ignore for future passes
      team = team.filter(t => t.id !== mostExpensive.id);
      ignoredRiderIds.add(mostExpensive.id);
      
      console.log(`Removed expensive rider ${mostExpensive.lastname} (${mostExpensive.price}) to make room for more riders. Team size: ${team.length}`);
    }

    // Calculate final stats
    const finalStats = getStats(team);
    totalBudget = finalStats.cost;
    totalPoints = finalStats.points;

    // Map to result format
    team = team.map(rider => ({
      id: rider.id,
      firstname: rider.firstname,
      lastname: rider.lastname,
      price: rider.price,
      points: rider.points,
      teamId: rider.teamId
    }));

    // Sort team by points descending
    team = team.sort((a, b) => b.points - a.points);

    // Save to Firestore
    const bestTeamData = {
      id: 'best-team',
      isVirtual: true,
      riders: team,
      totalPoints: totalPoints,
      riderCount: team.length,
      totalBudget: totalBudget,
      lastUpdated: admin.firestore.Timestamp.now(),
      updatedBySource: triggerSource
    };

    console.log(`💾 Saving best team to teams/bestteam:`, bestTeamData);
    await db.collection('teams').doc('bestteam').set(bestTeamData);

    console.log(`✅ Best team updated: ${team.length} riders, €${(totalBudget / 1000000).toFixed(1)}M budget, ${totalPoints} total points`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error recalculating best team:', error);
    throw error;
  }
}

/**
 * Scheduled function to recalculate best team daily
 * Runs at 23:55 CET every day to ensure all daily updates are processed
 */
exports.updateBestTeamScheduled = functions.region('europe-west1').pubsub
  .schedule('55 23 * * *')  // 23:55 CET daily (22:55 UTC in winter, 21:55 UTC in summer)
  .timeZone('Europe/Amsterdam')
  .onRun(async (context) => {
    try {
      console.log('⏰ Scheduled best team update triggered');
      await recalculateBestTeam('scheduled:daily');
      return { success: true };
    } catch (error) {
      console.error('❌ Error in scheduled best team update:', error);
      throw error;
    }
  });
