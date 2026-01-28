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
 * Deadline = next race start date after team was last saved
 * @param {Object} team - Team object from Firestore with lastSavedAt timestamp
 * @param {Array} races - Array of race objects with startDate
 * @returns {boolean} true if deadline has passed (cannot edit team)
 */
export const isTeamEditingDeadlinePassed = (team, races) => {
  if (!team || !team.lastSavedAt || !races || races.length === 0) {
    return false; // Can edit if no team or no races
  }

  // Get next race after team was last saved
  const teamSavedTime = team.lastSavedAt.toDate ? team.lastSavedAt.toDate() : new Date(team.lastSavedAt);
  
  // Find first race that starts AFTER the team was saved
  const nextRace = races.find((race) => {
    if (!race.startDate) return false;
    const raceDate = new Date(race.startDate);
    return raceDate > teamSavedTime;
  });

  if (!nextRace) return false; // No upcoming races, can still edit

  // Deadline = next race start date
  const deadline = new Date(nextRace.startDate);
  const now = new Date();
  
  const isPassed = now > deadline;
  
  // DEBUG LOG
  console.log('🏁 Team Deadline Check:', {
    'Team saved at': teamSavedTime.toLocaleString('nl-NL'),
    'Next race': nextRace.name,
    'Next race start': deadline.toLocaleString('nl-NL'),
    'Current time': now.toLocaleString('nl-NL'),
    'Deadline passed?': isPassed
  });
  
  return isPassed; // Cannot edit if current time is past race start
};