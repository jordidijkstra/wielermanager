const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Cloud Function: Calculate and store team points for all users
 * Triggered when a result document is created, updated, or deleted
 */
exports.calculateTeamPointsOnResultChange = functions.region('europe-west1').firestore
  .document('results/{resultId}')
  .onWrite(async (change, context) => {
    try {
      console.log('📊 Starting team points calculation...');
      
      // Get all data needed
      const [usersSnapshot, racesSnapshot, resultsSnapshot] = await Promise.all([
        db.collection('users').get(),
        db.collection('races').get(),
        db.collection('results').get()
      ]);

      const races = racesSnapshot.docs.map(doc => ({ id: parseInt(doc.id), ...doc.data() }));
      const results = resultsSnapshot.docs.map(doc => ({ id: parseInt(doc.id), ...doc.data() }));

      // Process each user
      const users = usersSnapshot.docs;
      let processed = 0;
      let errors = 0;

      for (const userDoc of users) {
        try {
          const userId = userDoc.id;
          console.log(`Processing user: ${userId}`);

          // Get user's teams (selections)
          const teamsSnapshot = await db.collection(`users/${userId}/teams`).get();
          const userTeams = {};
          teamsSnapshot.docs.forEach(doc => {
            userTeams[parseInt(doc.id)] = doc.data().riderIds || [];
          });

          // Get user's cycling team
          const teamDoc = await db.collection('teams').doc(userId).get();
          if (!teamDoc.exists) {
            console.log(`No cycling team found for user ${userId}`);
            continue;
          }

          const teamData = teamDoc.data();
          const teamRiders = teamData.riders || [];

          // Calculate points for each race
          for (const race of races) {
            const raceIdNum = typeof race.id === 'string' ? parseInt(race.id) : race.id;
            const raceResult = results.find(r => r.raceId === raceIdNum);

            if (!raceResult || !raceResult.entries) {
              continue;
            }

            // Get selected riders for this race
            // If it's a stage, use the main tour selection
            let raceIdToCheck = raceIdNum;
            if (race.tourId != null) {
              raceIdToCheck = typeof race.tourId === 'string' ? parseInt(race.tourId) : race.tourId;
            }

            const selectedRiderIds = new Set(userTeams[raceIdToCheck] || []);

            // Calculate total points and per-rider breakdown
            let totalPoints = 0;
            const riderPoints = {};

            raceResult.entries.forEach(entry => {
              const isInTeam = teamRiders.some(r => r.id === entry.riderId);
              const isSelected = selectedRiderIds.has(entry.riderId);
              const points = entry.points || 0;

              if (isInTeam && isSelected) {
                totalPoints += points;
              }

              // Store per-rider points regardless of selection (for display)
              riderPoints[entry.riderId] = points;
            });

            // Save calculated points to user's team document (use stage ID)
            await db.collection(`users/${userId}/teams`).doc(String(raceIdNum)).update({
              calculatedPoints: totalPoints,
              riderPoints: riderPoints,
              lastCalculated: admin.firestore.Timestamp.now()
            }).catch(async (err) => {
              if (err.code === 'not-found') {
                // Document doesn't exist yet, create it
                const existingData = userTeams[raceIdNum] ? { riderIds: userTeams[raceIdNum] } : {};
                await db.collection(`users/${userId}/teams`).doc(String(raceIdNum)).set({
                  ...existingData,
                  calculatedPoints: totalPoints,
                  riderPoints: riderPoints,
                  lastCalculated: admin.firestore.Timestamp.now()
                });
              }
            });

            console.log(`✅ User ${userId}, Race ${raceIdNum}: ${totalPoints} points`);
          }

          processed++;
        } catch (err) {
          console.error(`Error processing user ${userDoc.id}:`, err);
          errors++;
        }
      }

      console.log(`✅ Points calculation complete: ${processed} users processed, ${errors} errors`);
      return { processed, errors };
    } catch (err) {
      console.error('❌ Error in calculateTeamPointsOnResultChange:', err);
      throw err;
    }
  });

/**
 * Scheduled function: Recalculate all team points daily
 * Runs every day at 2 AM UTC
 */
exports.calculateTeamPointsScheduled = functions.region('europe-west1').pubsub
  .schedule('0 2 * * *')
  .timeZone('UTC')
  .onRun(async (context) => {
    try {
      console.log('📊 [SCHEDULED] Starting team points calculation...');

      const [usersSnapshot, racesSnapshot, resultsSnapshot] = await Promise.all([
        db.collection('users').get(),
        db.collection('races').get(),
        db.collection('results').get()
      ]);

      const races = racesSnapshot.docs.map(doc => ({ id: parseInt(doc.id), ...doc.data() }));
      const results = resultsSnapshot.docs.map(doc => ({ id: parseInt(doc.id), ...doc.data() }));

      let processed = 0;
      let errors = 0;

      for (const userDoc of usersSnapshot.docs) {
        try {
          const userId = userDoc.id;

          const teamsSnapshot = await db.collection(`users/${userId}/teams`).get();
          const userTeams = {};
          teamsSnapshot.docs.forEach(doc => {
            userTeams[parseInt(doc.id)] = doc.data().riderIds || [];
          });

          const teamDoc = await db.collection('teams').doc(userId).get();
          if (!teamDoc.exists) {
            continue;
          }

          const teamData = teamDoc.data();
          const teamRiders = teamData.riders || [];

          for (const race of races) {
            const raceIdNum = typeof race.id === 'string' ? parseInt(race.id) : race.id;
            const raceResult = results.find(r => r.raceId === raceIdNum);

            if (!raceResult || !raceResult.entries) {
              continue;
            }

            let raceIdToCheck = raceIdNum;
            if (race.tourId != null) {
              raceIdToCheck = typeof race.tourId === 'string' ? parseInt(race.tourId) : race.tourId;
            }

            const selectedRiderIds = new Set(userTeams[raceIdToCheck] || []);
            let totalPoints = 0;
            const riderPoints = {};

            raceResult.entries.forEach(entry => {
              const isInTeam = teamRiders.some(r => r.id === entry.riderId);
              const isSelected = selectedRiderIds.has(entry.riderId);
              const points = entry.points || 0;

              if (isInTeam && isSelected) {
                totalPoints += points;
              }

              riderPoints[entry.riderId] = points;
            });

            // Save for scheduled function (use stage ID)
            await db.collection(`users/${userId}/teams`).doc(String(raceIdNum)).update({
              calculatedPoints: totalPoints,
              riderPoints: riderPoints,
              lastCalculated: admin.firestore.Timestamp.now()
            }).catch(async (err) => {
              if (err.code === 'not-found') {
                const existingData = userTeams[raceIdNum] ? { riderIds: userTeams[raceIdNum] } : {};
                await db.collection(`users/${userId}/teams`).doc(String(raceIdNum)).set({
                  ...existingData,
                  calculatedPoints: totalPoints,
                  riderPoints: riderPoints,
                  lastCalculated: admin.firestore.Timestamp.now()
                });
              }
            });
          }

          processed++;
        } catch (err) {
          console.error(`Error processing user ${userDoc.id}:`, err);
          errors++;
        }
      }

      console.log(`✅ [SCHEDULED] Points calculation complete: ${processed} users, ${errors} errors`);
      return { processed, errors };
    } catch (err) {
      console.error('❌ Error in calculateTeamPointsScheduled:', err);
      throw err;
    }
  });
