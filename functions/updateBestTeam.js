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

    // Greedy selection: add riders by points while staying under budget
    for (const rider of availableRiders) {
      const riderCost = rider.price || 0;
      
      if (totalBudget + riderCost <= BUDGET && team.length < MAX_RIDERS) {
        team.push({
          id: rider.id,
          firstname: rider.firstname,
          lastname: rider.lastname,
          price: rider.price,
          points: rider.points,
          teamId: rider.teamId
        });
        totalBudget += riderCost;
        totalPoints += rider.points || 0;
      }
    }

    // If we have less than 14 riders, add more until we reach minimum
    if (team.length < MIN_RIDERS) {
      for (const rider of availableRiders) {
        if (!team.find(t => t.id === rider.id) && team.length < MAX_RIDERS) {
          team.push({
            id: rider.id,
            firstname: rider.firstname,
            lastname: rider.lastname,
            price: rider.price,
            points: rider.points,
            teamId: rider.teamId
          });
          totalPoints += rider.points || 0;
        }
        if (team.length >= MIN_RIDERS) break;
      }
    }

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
