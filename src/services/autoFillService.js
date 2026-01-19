import { collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Auto-fill race teams for all users after deadline has passed
 * This runs locally instead of via Cloud Function
 */
export const autoFillRaceTeamsLocal = async () => {
  try {
    console.log('Starting local auto-fill race teams process...');
    
    const now = new Date();
    let processedUsers = 0;
    let filledTeams = 0;
    const results = [];

    // Get all races
    console.log('Step 1: Loading all races...');
    const racesSnapshot = await getDocs(collection(db, 'races'));
    const races = racesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log(`Loaded ${races.length} races`);

    // Filter races where deadline has passed
    const passedDeadlineRaces = races.filter(race => {
      if (!race.startDate) return false;
      const deadline = new Date(race.startDate);
      deadline.setHours(9, 0, 0, 0);
      return deadline <= now;
    });

    console.log(`Found ${passedDeadlineRaces.length} races with passed deadlines`);
    results.push(`Found ${passedDeadlineRaces.length} races with passed deadlines`);

    if (passedDeadlineRaces.length === 0) {
      results.push('No races with passed deadlines');
      return { success: true, processedUsers, filledTeams, results };
    }

    // Get all users with saved teams
    console.log('Step 2: Loading all user teams...');
    const usersSnapshot = await getDocs(collection(db, 'teams'));
    console.log(`Found ${usersSnapshot.docs.length} users with teams`);

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userTeam = userDoc.data();

      if (!userTeam || !userTeam.riders || userTeam.riders.length === 0) {
        console.log(`Skipping user ${userId} - no riders in team`);
        continue;
      }

      processedUsers++;
      let userFilled = 0;
      console.log(`Processing user ${userId} with ${userTeam.riders.length} riders`);

      // Check each race with passed deadline
      for (const race of passedDeadlineRaces) {
        const raceId = race.id;
        console.log(`  Checking race ${raceId} (${race.name}) for user ${userId}...`);

        try {
          // Check if user already has a saved team for this race
          const raceTeamRef = doc(db, 'users', userId, 'teams', String(raceId));
          const raceTeamSnap = await getDoc(raceTeamRef);
          const maxRiders = race.maxRiders || 7;

          let teamToProcess = [];
          let isExistingTeam = false;

          if (raceTeamSnap.exists()) {
            // Team already exists - check if it needs to be filled
            teamToProcess = raceTeamSnap.data().riderIds || [];
            isExistingTeam = true;
            console.log(`    Found existing team with ${teamToProcess.length} riders`);
          }

          // Check if team has less than maxRiders
          if (teamToProcess.length >= maxRiders) {
            console.log(`    Team already has ${teamToProcess.length} riders (max is ${maxRiders}) - skipping`);
            continue;
          }

          console.log(`    Team has ${teamToProcess.length} riders - auto-filling with max ${maxRiders} riders`);

          // Get race participants to filter available riders
          const participantsRef = doc(db, 'raceParticipants', String(raceId));
          const participantsSnap = await getDoc(participantsRef);
          const participants = participantsSnap.exists() ? participantsSnap.data().participants || [] : [];
          console.log(`    Found ${participants.length} race participants`);

          // Filter available riders (in user's team AND in race participants AND not already selected)
          const participantRiderIds = new Set(
            participants
              .filter(p => p.riderId !== null && p.riderId !== undefined)
              .map(p => p.riderId)
          );

          const teamToProcessSet = new Set(teamToProcess);
          const availableRiders = userTeam.riders.filter(rider => {
            const riderId = parseInt(rider.id);
            return riderId !== 911 && // Exclude dummy rider
              participantRiderIds.has(riderId) &&
              !teamToProcessSet.has(riderId); // Don't re-add already selected riders
          });

          console.log(`    Available riders to add: ${availableRiders.length}`);

          // Sort by price (highest = best) and select top (maxRiders - currentSize)
          const neededRiders = maxRiders - teamToProcess.length;
          const sortedRiders = availableRiders
            .sort((a, b) => b.price - a.price)
            .slice(0, neededRiders);

          if (sortedRiders.length === 0) {
            if (isExistingTeam && teamToProcess.length > 0) {
              console.log(`    ⚠️ No additional riders available to fill team for user ${userId}, race ${raceId}`);
              results.push(`⚠️ User ${userId}: team has ${teamToProcess.length}/${maxRiders} riders, no more available`);
            } else {
              console.log(`    ⚠️ No available riders for user ${userId} in race ${raceId}`);
              results.push(`⚠️ No available riders for user ${userId}, race ${raceId}`);
            }
            continue;
          }

          // Build complete updated team
          const updatedRiderIds = [...teamToProcess, ...sortedRiders.map(r => parseInt(r.id))];
          const updatedRiderObjects = [
            ...(raceTeamSnap.exists() ? (raceTeamSnap.data().riders || []) : []),
            ...sortedRiders
          ];
          const totalPrice = updatedRiderObjects.reduce((sum, r) => sum + (r.price || 0), 0);

          console.log(`    Saving race team with ${updatedRiderIds.length} riders (added ${sortedRiders.length})...`);
          await setDoc(raceTeamRef, {
            riderIds: updatedRiderIds,
            riders: updatedRiderObjects,
            totalPrice,
            savedAt: new Date().toISOString(),
            autoFilled: true
          });

          filledTeams++;
          userFilled++;
          console.log(`    ✅ ${isExistingTeam ? 'Updated' : 'Auto-filled'} race ${raceId} for user ${userId} with ${updatedRiderIds.length} riders`);
        } catch (raceError) {
          console.error(`    ❌ Error processing race ${raceId} for user ${userId}:`, raceError.message);
          results.push(`❌ Error for user ${userId}, race ${raceId}: ${raceError.message}`);
        }
      }

      if (userFilled > 0) {
        results.push(`✅ User ${userId}: filled ${userFilled} race team(s)`);
      }
    }

    console.log(`Completed: processed ${processedUsers} users, auto-filled ${filledTeams} race teams`);
    results.push(`\n✅ COMPLETED: Processed ${processedUsers} users, auto-filled ${filledTeams} race teams`);

    return { success: true, processedUsers, filledTeams, results };
  } catch (error) {
    console.error('Error in autoFillRaceTeamsLocal:', error);
    console.error('Error stack:', error.stack);
    return { 
      success: false, 
      error: error.message,
      results: [`Error: ${error.message}`, `Stack: ${error.stack}`]
    };
  }
};
