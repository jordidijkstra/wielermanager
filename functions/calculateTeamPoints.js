const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Cloud Function: Calculate and store team points for a specific race
 * Triggered when a result document is created, updated, or deleted
 * Now optimized to only process the changed race
 */
exports.calculateTeamPointsOnResultChange = functions.region('europe-west1').firestore
  .document('results/{resultId}')
  .onWrite(async (change, context) => {
    try {
      // Get the changed result document
      const resultDoc = change.after.exists ? change.after.data() : null;
      if (!resultDoc || !resultDoc.raceId) {
        console.log('⚠️ No result data or raceId found');
        return;
      }

      const raceId = resultDoc.raceId;
      console.log(`📊 Calculating points for race ${raceId}...`);
      
      // Get only the necessary data
      const [usersSnapshot, racesSnapshot] = await Promise.all([
        db.collection('users').get(),
        db.collection('races').get()
      ]);

      const races = racesSnapshot.docs.map(doc => ({ id: parseInt(doc.id), ...doc.data() }));
      const race = races.find(r => r.id === raceId);

      if (!race) {
        console.warn(`⚠️ Race ${raceId} not found`);
        return;
      }

      // Process each user for this specific race
      const users = usersSnapshot.docs;
      let processed = 0;
      let errors = 0;

      for (const userDoc of users) {
        try {
          const userId = userDoc.id;

          // Get user's teams (selections)
          const teamsSnapshot = await db.collection(`users/${userId}/teams`).get();
          const userTeams = {};
          teamsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            userTeams[parseInt(doc.id)] = {
              riderIds: data.riderIds || [],
              calculatedPoints: data.calculatedPoints || 0,
              riderPoints: data.riderPoints || {}
            };
          });

          // Get user's cycling team
          const teamDoc = await db.collection('teams').doc(userId).get();
          if (!teamDoc.exists) {
            continue;
          }

          const teamData = teamDoc.data();
          const teamRiders = teamData.riders || [];

          // Process only the changed race
          const raceIdNum = typeof race.id === 'string' ? parseInt(race.id) : race.id;
          const raceResult = resultDoc;

          if (!raceResult.entries) {
            continue;
          }

          // Get selected riders for this race
          // If it's a stage, use the main tour selection
          let raceIdToCheck = raceIdNum;
          if (race.tourId != null) {
            raceIdToCheck = typeof race.tourId === 'string' ? parseInt(race.tourId) : race.tourId;
          }

          const selectedRiderIds = new Set((userTeams[raceIdToCheck] && userTeams[raceIdToCheck].riderIds) || []);

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

          // Save calculated points to user's team document (use race ID / stage ID)
          await db.collection(`users/${userId}/teams`).doc(String(raceIdNum)).set({
            riderIds: userTeams[raceIdToCheck]?.riderIds || [],
            calculatedPoints: totalPoints,
            riderPoints: riderPoints,
            lastCalculated: admin.firestore.Timestamp.now()
          }, { merge: true });

          console.log(`✅ User ${userId}, Race ${raceIdNum}: ${totalPoints} points`);
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
            const data = doc.data();
            userTeams[parseInt(doc.id)] = {
              riderIds: data.riderIds || [],
              calculatedPoints: data.calculatedPoints || 0,
              riderPoints: data.riderPoints || {}
            };
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

            const selectedRiderIds = new Set((userTeams[raceIdToCheck] && userTeams[raceIdToCheck].riderIds) || []);
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

            // Save for scheduled function (use race ID / stage ID with merge)
            await db.collection(`users/${userId}/teams`).doc(String(raceIdNum)).set({
              riderIds: userTeams[raceIdToCheck]?.riderIds || [],
              calculatedPoints: totalPoints,
              riderPoints: riderPoints,
              lastCalculated: admin.firestore.Timestamp.now()
            }, { merge: true });
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
