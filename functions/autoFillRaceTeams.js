const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Fixed: Changed .exists() to .exists property (v7.0)

/**
 * Cloud Function: Auto-fill race teams for users after deadline has passed
 * Triggered via HTTP endpoint or Cloud Scheduler
 */
exports.autoFillRaceTeams = functions.region('europe-west1').https.onRequest(async (req, res) => {
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

    // Filter races where autofill window is still open (1 day before deadline until end of race day)
    // Also exclude stages since they share the same selection as the general classification
    const upcomingDeadlineRaces = races.filter(race => {
      if (!race.startDate) return false;
      if (race.name && race.name.includes('Stage')) return false; // Exclude stages
      const deadline = new Date(race.startDate);
      deadline.setHours(9, 0, 0, 0);
      const deadlineMinusOneDay = new Date(deadline);
      deadlineMinusOneDay.setDate(deadlineMinusOneDay.getDate() - 1);
      deadlineMinusOneDay.setHours(0, 0, 0, 0); // Start from 00:00 on the day before
      const endOfRaceDay = new Date(deadline);
      endOfRaceDay.setDate(endOfRaceDay.getDate() + 1);
      endOfRaceDay.setHours(0, 0, 0, 0); // End at 00:00 on the day after (i.e., end of race day)
      const isInWindow = now >= deadlineMinusOneDay && now < endOfRaceDay;
      console.log(`Race ${race.id}: deadline=${deadline.toISOString()}, now=${now.toISOString()}, inWindow=${isInWindow}`);
      return isInWindow; // Autofill works from (deadline - 1 day at 00:00) until end of race day
    });

    console.log(`Found ${upcomingDeadlineRaces.length} races with upcoming deadlines`);

    if (upcomingDeadlineRaces.length === 0) {
      return res.json({ success: true, message: 'No races with upcoming deadlines' });
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

      // Check each race with upcoming deadline
      for (const race of upcomingDeadlineRaces) {
        const raceId = race.id;
        const maxRiders = race.maxRiders || 7;

        // Check if user already has a saved team for this race
        const raceTeamRef = db.collection('users').doc(userId).collection('teams').doc(String(raceId));
        const raceTeamSnap = await raceTeamRef.get();

        let currentTeam = [];
        let isExistingTeam = false;

        if (raceTeamSnap.exists) {
          // Team already exists - check if it needs to be filled
          currentTeam = raceTeamSnap.data().riderIds || [];
          isExistingTeam = true;
        }

        // Check if team has less than maxRiders
        if (currentTeam.length >= maxRiders) {
          console.log(`Team already has ${currentTeam.length} riders (max is ${maxRiders}) - skipping`);
          continue;
        }

        // Get race participants to filter available riders
        const participantsRef = db.collection('raceParticipants').doc(String(raceId));
        const participantsSnap = await participantsRef.get();
        const participants = participantsSnap.exists ? participantsSnap.data().participants || [] : [];

        // Filter available riders (in user's team AND in race participants AND not already selected)
        const participantRiderIds = new Set(
          participants
            .filter(p => p.riderId !== null && p.riderId !== undefined)
            .map(p => p.riderId)
        );

        const currentTeamSet = new Set(currentTeam);
        const availableRiders = userTeam.riders.filter(rider => {
          const riderId = parseInt(rider.id);
          return riderId !== 911 && // Exclude dummy rider
            participantRiderIds.has(riderId) &&
            !currentTeamSet.has(riderId); // Don't re-add already selected riders
        });

        // Sort by price (highest = best) and select needed riders
        const neededRiders = maxRiders - currentTeam.length;
        const sortedRiders = availableRiders
          .sort((a, b) => b.price - a.price)
          .slice(0, neededRiders);

        if (sortedRiders.length === 0) {
          if (isExistingTeam && currentTeam.length > 0) {
            console.log(`No additional riders available to fill team for user ${userId}, race ${raceId}`);
          } else {
            console.log(`No available riders for user ${userId} in race ${raceId}`);
          }
          continue;
        }

        // Build complete updated team
        const updatedRiderIds = [...currentTeam, ...sortedRiders.map(r => parseInt(r.id))];
        const updatedRiderObjects = [
          ...(isExistingTeam && raceTeamSnap.data().riders ? raceTeamSnap.data().riders : []),
          ...sortedRiders
        ];
        const totalPrice = updatedRiderObjects.reduce((sum, r) => sum + (r.price || 0), 0);

        await raceTeamRef.set({
          riderIds: updatedRiderIds,
          riders: updatedRiderObjects,
          totalPrice,
          savedAt: new Date().toISOString(),
          autoFilled: true
        });

        filledTeams++;
        console.log(`${isExistingTeam ? 'Updated' : 'Auto-filled'} race ${raceId} for user ${userId} with ${updatedRiderIds.length} riders`);
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
exports.autoFillRaceTeamsScheduled = functions.region('europe-west1').pubsub
  .schedule('0 10 * * *')
  .timeZone('UTC')
  .onRun(async (context) => {
    const startTime = new Date();
    
    // ALTIJD logs wegschrijven, zelfs als er iets fout gaat
    try {
      console.log('[AUTO-FILL] Scheduled task started at ' + startTime.toISOString());
      
      // Eerst even logs opslaan dat we zijn gestart
      await db.collection('system_logs').doc('autoFillScheduled').set({
        lastRun: startTime.toISOString(),
        status: 'running',
        message: 'Task started'
      }, { merge: true });
      
      const logs = [];
      
      const addLog = (message) => {
        console.log('[AUTO-FILL] ' + message);
        logs.push({
          timestamp: new Date().toISOString(),
          message
        });
      };

      addLog('Running scheduled auto-fill race teams at ' + startTime.toISOString());
      
      const now = new Date();
      let processedUsers = 0;
      let filledTeams = 0;

      // Get all races
      const racesSnapshot = await db.collection('races').get();
      const races = racesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filter races where autofill window is still open (1 day before deadline until end of race day)
      // Also exclude stages since they share the same selection as the general classification
      const upcomingDeadlineRaces = races.filter(race => {
        if (!race.startDate) return false;
        if (race.name && race.name.includes('Stage')) return false; // Exclude stages
        const deadline = new Date(race.startDate);
        deadline.setHours(9, 0, 0, 0);
        const deadlineMinusOneDay = new Date(deadline);
        deadlineMinusOneDay.setDate(deadlineMinusOneDay.getDate() - 1);
        deadlineMinusOneDay.setHours(0, 0, 0, 0); // Start from 00:00 on the day before
        const endOfRaceDay = new Date(deadline);
        endOfRaceDay.setDate(endOfRaceDay.getDate() + 1);
        endOfRaceDay.setHours(0, 0, 0, 0); // End at 00:00 on the day after (i.e., end of race day)
        const isInWindow = now >= deadlineMinusOneDay && now < endOfRaceDay;
        addLog(`Race ${race.id}: deadline=${deadline.toISOString()}, now=${now.toISOString()}, inWindow=${isInWindow}`);
        return isInWindow; // Autofill works from (deadline - 1 day at 00:00) until end of race day
      });

      addLog(`Found ${upcomingDeadlineRaces.length} races with upcoming deadlines`);

      if (upcomingDeadlineRaces.length === 0) {
        addLog('No races with upcoming deadlines');
        
        // Save logs to Firestore
        await db.collection('system_logs').doc('autoFillScheduled').set({
          lastRun: startTime.toISOString(),
          executionTime: Date.now() - startTime.getTime(),
          logs,
          processedUsers: 0,
          filledTeams: 0,
          status: 'completed'
        }, { merge: true });
        
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

        // Get user name from users collection
        let userName = userId;
        try {
          const userDocRef = await db.collection('users').doc(userId).get();
          if (userDocRef.exists) {
            const userData = userDocRef.data();
            userName = userData.firstname && userData.lastname 
              ? `${userData.firstname} ${userData.lastname}` 
              : userData.email || userId;
          }
        } catch (e) {
          // If error, just use userId
          console.log(`Could not fetch user ${userId} name:`, e.message);
        }

        processedUsers++;

        // Check each race with upcoming deadline
        for (const race of upcomingDeadlineRaces) {
          const raceId = race.id;
          const maxRiders = race.maxRiders || 7;

          // Check if user already has a saved team for this race
          const raceTeamRef = db.collection('users').doc(userId).collection('teams').doc(String(raceId));
          const raceTeamSnap = await raceTeamRef.get();

          let currentTeam = [];
          let isExistingTeam = false;

          if (raceTeamSnap.exists) {
            // Team already exists - check if it needs to be filled
            currentTeam = raceTeamSnap.data().riderIds || [];
            isExistingTeam = true;
          }

          // Check if team has less than maxRiders
          if (currentTeam.length >= maxRiders) {
            addLog(`Team already has ${currentTeam.length} riders (max is ${maxRiders}) - skipping for user ${userId}, race ${raceId}`);
            continue;
          }

          // Get race participants to filter available riders
          const participantsRef = db.collection('raceParticipants').doc(String(raceId));
          const participantsSnap = await participantsRef.get();
          const participants = participantsSnap.exists ? participantsSnap.data().participants || [] : [];

          // Filter available riders (in user's team AND in race participants AND not already selected)
          const participantRiderIds = new Set(
            participants
              .filter(p => p.riderId !== null && p.riderId !== undefined)
              .map(p => p.riderId)
          );

          const currentTeamSet = new Set(currentTeam);
          const availableRiders = userTeam.riders.filter(rider => {
            const riderId = parseInt(rider.id);
            return riderId !== 911 && // Exclude dummy rider
              participantRiderIds.has(riderId) &&
              !currentTeamSet.has(riderId); // Don't re-add already selected riders
          });

          // Sort by price (highest = best) and select needed riders
          const neededRiders = maxRiders - currentTeam.length;
          const sortedRiders = availableRiders
            .sort((a, b) => b.price - a.price)
            .slice(0, neededRiders);

          if (sortedRiders.length === 0) {
            if (isExistingTeam && currentTeam.length > 0) {
              addLog(`No additional riders available to fill team for ${userName}, race ${raceId}`);
            } else {
              addLog(`No available riders for ${userName} in race ${raceId}`);
            }
            continue;
          }

          // Build complete updated team
          const updatedRiderIds = [...currentTeam, ...sortedRiders.map(r => parseInt(r.id))];
          const updatedRiderObjects = [
            ...(isExistingTeam && raceTeamSnap.data().riders ? raceTeamSnap.data().riders : []),
            ...sortedRiders
          ];
          const totalPrice = updatedRiderObjects.reduce((sum, r) => sum + (r.price || 0), 0);

          await raceTeamRef.set({
            riderIds: updatedRiderIds,
            riders: updatedRiderObjects,
            totalPrice,
            savedAt: new Date().toISOString(),
            autoFilled: true
          });

          filledTeams++;
          addLog(`${isExistingTeam ? 'Updated' : 'Auto-filled'} race ${raceId} for ${userName} with ${updatedRiderIds.length} riders`);
        }
      }

      addLog(`Completed: processed ${processedUsers} users, auto-filled ${filledTeams} race teams`);
      
      // Save logs to Firestore
      await db.collection('system_logs').doc('autoFillScheduled').set({
        lastRun: startTime.toISOString(),
        executionTime: Date.now() - startTime.getTime(),
        logs,
        processedUsers,
        filledTeams,
        status: 'completed'
      }, { merge: true });
      
      return null;
    } catch (error) {
      console.error('Error in scheduled autoFillRaceTeams:', error);
      addLog(`ERROR: ${error.message}`);
      
      // Save error logs to Firestore
      await db.collection('system_logs').doc('autoFillScheduled').set({
        lastRun: startTime.toISOString(),
        executionTime: Date.now() - startTime.getTime(),
        logs,
        status: 'error',
        error: error.message
      }, { merge: true });
      
      throw error;
    }
  });
