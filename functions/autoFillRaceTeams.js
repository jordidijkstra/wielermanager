const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Cloud Function: Auto-fill race teams for users after deadline has passed
 * Triggered via HTTP endpoint or Cloud Scheduler
 */
exports.autoFillRaceTeams = functions.https.onRequest(async (req, res) => {
  try {
    console.log('Starting auto-fill race teams process...');
    
    const now = new Date();
    let processedUsers = 0;
    let filledTeams = 0;

    // Get all races
    const racesSnapshot = await db.collection('races').get();
    const races = racesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Filter races where deadline has passed
    const passedDeadlineRaces = races.filter(race => {
      if (!race.startDate) return false;
      const deadline = new Date(race.startDate);
      deadline.setHours(9, 0, 0, 0);
      return deadline <= now;
    });

    console.log(`Found ${passedDeadlineRaces.length} races with passed deadlines`);

    if (passedDeadlineRaces.length === 0) {
      return res.json({ success: true, message: 'No races with passed deadlines' });
    }

    // Get all users with saved teams
    const usersSnapshot = await db.collection('teams').get();

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userTeam = userDoc.data();

      if (!userTeam || !userTeam.riders || userTeam.riders.length === 0) {
        continue;
      }

      processedUsers++;

      // Check each race with passed deadline
      for (const race of passedDeadlineRaces) {
        const raceId = race.id;

        // Check if user already has a saved team for this race
        const raceTeamRef = db.collection('users').doc(userId).collection('teams').doc(String(raceId));
        const raceTeamSnap = await raceTeamRef.get();

        if (raceTeamSnap.exists()) {
          // Team already exists - skip
          continue;
        }

        // User doesn't have a saved team for this race - auto-fill
        const maxRiders = race.maxRiders || 7;
        const userRiderIds = userTeam.riders.map(r => parseInt(r.id));

        // Get race participants to filter available riders
        const participantsRef = db.collection('raceParticipants').doc(String(raceId));
        const participantsSnap = await participantsRef.get();
        const participants = participantsSnap.exists() ? participantsSnap.data().participants || [] : [];

        // Filter available riders (in user's team AND in race participants)
        const participantRiderIds = new Set(
          participants
            .filter(p => p.riderId !== null && p.riderId !== undefined)
            .map(p => p.riderId)
        );

        const availableRiders = userTeam.riders.filter(rider => {
          const riderId = parseInt(rider.id);
          return riderId !== 911 && // Exclude dummy rider
            participantRiderIds.has(riderId);
        });

        // Sort by price (highest = best) and select top maxRiders
        const sortedRiders = availableRiders
          .sort((a, b) => b.price - a.price)
          .slice(0, maxRiders);

        if (sortedRiders.length === 0) {
          console.log(`No available riders for user ${userId} in race ${raceId}`);
          continue;
        }

        // Save the auto-filled team
        const riderIds = sortedRiders.map(r => parseInt(r.id));
        const totalPrice = sortedRiders.reduce((sum, r) => sum + (r.price || 0), 0);

        await raceTeamRef.set({
          riderIds,
          riders: sortedRiders,
          totalPrice,
          savedAt: new Date().toISOString(),
          autoFilled: true
        });

        filledTeams++;
        console.log(`Auto-filled race ${raceId} for user ${userId} with ${riderIds.length} riders`);
      }
    }

    return res.json({
      success: true,
      message: `Processed ${processedUsers} users, auto-filled ${filledTeams} race teams`
    });
  } catch (error) {
    console.error('Error in autoFillRaceTeams:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Cloud Function: Scheduled trigger (runs daily at 10:00 UTC)
 * Automatically fills race teams after deadlines pass
 */
exports.autoFillRaceTeamsScheduled = functions.pubsub
  .schedule('0 10 * * *')
  .timeZone('UTC')
  .onRun(async (context) => {
    try {
      console.log('Running scheduled auto-fill race teams at', new Date().toISOString());
      
      const now = new Date();
      let processedUsers = 0;
      let filledTeams = 0;

      // Get all races
      const racesSnapshot = await db.collection('races').get();
      const races = racesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filter races where deadline has passed
      const passedDeadlineRaces = races.filter(race => {
        if (!race.startDate) return false;
        const deadline = new Date(race.startDate);
        deadline.setHours(9, 0, 0, 0);
        return deadline <= now;
      });

      console.log(`Found ${passedDeadlineRaces.length} races with passed deadlines`);

      if (passedDeadlineRaces.length === 0) {
        console.log('No races with passed deadlines');
        return null;
      }

      // Get all users with saved teams
      const usersSnapshot = await db.collection('teams').get();

      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const userTeam = userDoc.data();

        if (!userTeam || !userTeam.riders || userTeam.riders.length === 0) {
          continue;
        }

        processedUsers++;

        // Check each race with passed deadline
        for (const race of passedDeadlineRaces) {
          const raceId = race.id;

          // Check if user already has a saved team for this race
          const raceTeamRef = db.collection('users').doc(userId).collection('teams').doc(String(raceId));
          const raceTeamSnap = await raceTeamRef.get();

          if (raceTeamSnap.exists()) {
            // Team already exists - skip
            continue;
          }

          // User doesn't have a saved team for this race - auto-fill
          const maxRiders = race.maxRiders || 7;

          // Get race participants to filter available riders
          const participantsRef = db.collection('raceParticipants').doc(String(raceId));
          const participantsSnap = await participantsRef.get();
          const participants = participantsSnap.exists() ? participantsSnap.data().participants || [] : [];

          // Filter available riders (in user's team AND in race participants)
          const participantRiderIds = new Set(
            participants
              .filter(p => p.riderId !== null && p.riderId !== undefined)
              .map(p => p.riderId)
          );

          const availableRiders = userTeam.riders.filter(rider => {
            const riderId = parseInt(rider.id);
            return riderId !== 911 && // Exclude dummy rider
              participantRiderIds.has(riderId);
          });

          // Sort by price (highest = best) and select top maxRiders
          const sortedRiders = availableRiders
            .sort((a, b) => b.price - a.price)
            .slice(0, maxRiders);

          if (sortedRiders.length === 0) {
            console.log(`No available riders for user ${userId} in race ${raceId}`);
            continue;
          }

          // Save the auto-filled team
          const riderIds = sortedRiders.map(r => parseInt(r.id));
          const totalPrice = sortedRiders.reduce((sum, r) => sum + (r.price || 0), 0);

          await raceTeamRef.set({
            riderIds,
            riders: sortedRiders,
            totalPrice,
            savedAt: new Date().toISOString(),
            autoFilled: true
          });

          filledTeams++;
          console.log(`Auto-filled race ${raceId} for user ${userId} with ${riderIds.length} riders`);
        }
      }

      console.log(`Completed: processed ${processedUsers} users, auto-filled ${filledTeams} race teams`);
      return null;
    } catch (error) {
      console.error('Error in scheduled autoFillRaceTeams:', error);
      throw error;
    }
  });
