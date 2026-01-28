import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

export const getUserTeam = async (userId) => {
  const snap = await getDoc(doc(db, 'teams', userId));
  return snap.exists() ? snap.data() : null;
};

export const saveUserTeam = async ({ userId, riders, totalSpent, lastUpdated }) => {
  if (!userId) throw new Error('Geen uid meegegeven aan saveUserTeam');
  await setDoc(doc(db, 'teams', userId), {
    userId,
    riders,
    totalSpent,
    lastUpdated: lastUpdated,
    lastSavedAt: serverTimestamp()
  });
};

/**
 * Check if team editing deadline has passed
 * Deadline = first race that starts AFTER team was last saved
 * @param {Object} team - Team object from Firestore with lastSavedAt timestamp
 * @param {Array} races - Array of race objects with startDate
 * @returns {boolean} true if deadline has passed (cannot edit team)
 */
export const isTeamEditingDeadlinePassed = (team, races) => {
  if (!team || !team.lastSavedAt || !races || races.length === 0) {
    return false; // Can edit if no team or no races
  }

  // Get when team was last saved
  const teamSavedTime = team.lastSavedAt.toDate ? team.lastSavedAt.toDate() : new Date(team.lastSavedAt);
  
  // Sort races by startDate to ensure we process them chronologically
  const sortedRaces = [...races].sort((a, b) => {
    if (!a.startDate || !b.startDate) return 0;
    return new Date(a.startDate) - new Date(b.startDate);
  });
  
  // Find first race that starts AFTER the team was saved
  let nextRace = null;
  for (const race of sortedRaces) {
    if (!race.startDate) continue;
    const raceDate = new Date(race.startDate);
    if (raceDate > teamSavedTime) {
      nextRace = race;
      break;
    }
  }

  if (!nextRace) return false; // No upcoming races after save, can still edit

  // Deadline = next race start date (9 AM on that day)
  const deadline = new Date(nextRace.startDate);
  deadline.setHours(9, 0, 0, 0);
  
  const now = new Date();
  const isPassed = now > deadline;
  
  // DEBUG LOG
  console.log('🏁 Team Deadline Check:', {
    'Team saved at': teamSavedTime.toLocaleString('nl-NL'),
    'Current time': now.toLocaleString('nl-NL'),
    'Closest upcoming race (after save)': nextRace.name,
    'Race start (deadline)': deadline.toLocaleString('nl-NL'),
    'Deadline passed?': isPassed
  });
  
  return isPassed; // Cannot edit if current time is past race start
};