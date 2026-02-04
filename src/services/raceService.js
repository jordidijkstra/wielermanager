import { collection, doc, getDocs, getDoc, setDoc, query, where, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

// Cache for races
let racesCache = null;
let racesCacheTimestamp = 0;
const RACES_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Invalidate cache function
export const invalidateRacesCache = () => {
  console.log('🔄 Invalidating races cache');
  racesCache = null;
  racesCacheTimestamp = 0;
};

// Haal alle races op, gesorteerd op startDate (met caching)
export const getAllRaces = async () => {
  const now = Date.now();
  
  // Check if cache is still valid
  if (racesCache && (now - racesCacheTimestamp) < RACES_CACHE_DURATION) {
    console.log('✅ Using cached races');
    return racesCache;
  }
  
  console.log('📡 Fetching races from Firestore');
  const querySnapshot = await getDocs(collection(db, 'races'));
  const races = querySnapshot.docs
    .map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    .sort((a, b) => {
      const dateA = new Date(a.startDate);
      const dateB = new Date(b.startDate);
      
      // Invalid dates gaan naar het einde
      if (isNaN(dateA.getTime())) return 1;
      if (isNaN(dateB.getTime())) return -1;
      
      return dateA - dateB;
    });
  
  racesCache = races;
  racesCacheTimestamp = now;
  return races;
};


export const getAllRaceParticipants = async () => {
    try {
        const participantsSnapshot = await getDocs(collection(db, 'raceParticipants'));
        const participantsMap = {};
        participantsSnapshot.docs.forEach(doc => {
            participantsMap[doc.id] = doc.data().participants || [];
        });
        return participantsMap;
    } catch (error) {
        console.error('Error fetching all race participants:', error);
        throw error;
    }
};

export const fetchRaceParticipantsList = async () => {
  try {
    const participantsSnapshot = await getDocs(collection(db, 'raceParticipants'));
    const participantsList = participantsSnapshot.docs.map(doc => ({
      raceId: doc.id,
      status: doc.data().status || 'ingediend',
      participants: doc.data().participants || [],
      submittedAt: doc.data().submittedAt,
      approvedAt: doc.data().approvedAt
    }));
    return participantsList;
  } catch (error) {
    console.error('Error fetching race participants list:', error);
    throw error;
  }
};

export const updateRaceParticipants = async (raceId, data) => {
  try {
    await setDoc(doc(db, 'raceParticipants', String(raceId)), data);
  } catch (error) {
    console.error(`Error updating race participants for race ${raceId}:`, error);
    throw error;
  }
};

export const deleteRaceParticipants = async (raceId) => {
  try {
    await deleteDoc(doc(db, 'raceParticipants', String(raceId)));
  } catch (error) {
    console.error(`Error deleting race participants for race ${raceId}:`, error);
    throw error;
  }
};

export const cleanupUserTeams = async (raceId, participantRiderIds) => {
  try {
    // Get all users
    const usersSnapshot = await getDocs(collection(db, 'users'));
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      
      // Get this user's race team for this race
      const raceTeamRef = doc(db, 'users', userId, 'teams', String(raceId));
      const raceTeamSnap = await getDoc(raceTeamRef);
      
      if (raceTeamSnap.exists()) {
        const raceTeam = raceTeamSnap.data();
        const currentRiderIds = raceTeam.riderIds || [];
        
        // Filter out riders that are no longer in participants
        const updatedRiderIds = currentRiderIds.filter(riderId => 
          participantRiderIds.includes(riderId)
        );
        
        // If any riders were removed, update the race team
        if (updatedRiderIds.length < currentRiderIds.length) {
          await setDoc(raceTeamRef, {
            ...raceTeam,
            riderIds: updatedRiderIds,
            riders: raceTeam.riders?.filter(rider => updatedRiderIds.includes(rider.id)) || []
          });
          console.log(`✅ Verwijderde ${currentRiderIds.length - updatedRiderIds.length} rennerselecties voor user ${userId}`);
        }
      }
    }
  } catch (err) {
    console.error('Error cleaning up user teams:', err);
    // Don't throw - this is a secondary operation
  }
};

// Haal een specifieke race op
export const getRaceById = async (raceId) => {
  const snap = await getDoc(doc(db, 'races', raceId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

// Haal race team op voor user en race
export const getRaceTeam = async (userId, raceId) => {
  const snap = await getDoc(doc(db, 'users', userId, 'teams', String(raceId)));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

// Sla race team op
export const saveRaceTeam = async ({ userId, raceId, riderIds, riders, totalPrice }) => {
  if (!userId || !raceId) throw new Error('userId en raceId zijn verplicht');
  
  await setDoc(doc(db, 'users', userId, 'teams', String(raceId)), {
    riderIds,
    riders,
    totalPrice,
    savedAt: new Date().toISOString()
  });
};

// Haal alle race teams op voor een user
export const getUserRaceTeams = async (userId) => {
  const querySnapshot = await getDocs(collection(db, 'users', userId, 'teams'));
  return querySnapshot.docs.map(doc => ({
    raceId: parseInt(doc.id),
    ...doc.data()
  }));
};

// Selecteer automatisch de beste renners voor ALLE races
export const getAutoSelectedForAllRaces = (races, allRiders) => {
  if (!races || !allRiders) return {};
  
  const allRaceTeams = {}; // Gebruiken we om al geselecteerde renners bij te houden
  const result = {};
  
  races.forEach(race => {
    const minRiders = race.minRiders || 0;
    const maxRiders = race.maxRiders || 7;
    
    // Filter beschikbare renners
    const availableRiders = allRiders.filter(rider => {
      if (parseInt(rider.id) === 911) return false; // Exclude dummy rider 911
      if (!rider.price || rider.price <= 0) return false;
      return true;
    });
    
    // Sorteer op prijs (hoogste eerst = beste waarde)
    const sortedByPrice = availableRiders.sort((a, b) => b.price - a.price);
    
    // Selecteer tot maxRiders
    const targetCount = Math.min(maxRiders, Math.max(minRiders, Math.floor(sortedByPrice.length * 0.6)));
    const selectedIds = sortedByPrice.slice(0, targetCount).map(r => parseInt(r.id));
    
    result[race.id] = selectedIds;
    allRaceTeams[race.id] = selectedIds; // Voor volgende iteraties
  });
  
  return result;
};

// Haal deelnemerslijst op voor een race
export const getRaceParticipants = async (raceId) => {
  try {
    const docRef = doc(db, 'raceParticipants', String(raceId));
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return data.participants || [];
    }
    return null; // Geen deelnemerslijst beschikbaar
  } catch (error) {
    console.error('Error fetching race participants:', error);
    return null;
  }
};

// Filter renners die niet deelnemen aan een race
export const filterRidersByParticipants = (riders, participants) => {
  if (!participants || participants.length === 0) return riders;
  
  const participantRiderIds = new Set(
    participants
      .filter(p => p.riderId !== null && p.riderId !== undefined)
      .map(p => p.riderId)
  );
  
  return riders.filter(rider => {
    return participantRiderIds.has(parseInt(rider.id));
  });
};

// Sla deelnemerslijst op voor een race
export const saveRaceParticipants = async (raceId, participants) => {
  if (!raceId) throw new Error('raceId is verplicht');
  
  await setDoc(doc(db, 'raceParticipants', String(raceId)), {
    participants: participants || [],
    updatedAt: new Date().toISOString()
  });
};

// Verwijder een renner uit alle race teams van een user
export const removeRiderFromAllRaceTeams = async (userId, riderId) => {
  if (!userId || !riderId) throw new Error('userId en riderId zijn verplicht');
  
  try {
    // Haal alle race teams voor deze user
    const userRaceTeams = await getUserRaceTeams(userId);
    
    // Voor elk race team: verwijder de renner
    for (const raceTeam of userRaceTeams) {
      const raceId = raceTeam.raceId;
      const currentRiderIds = raceTeam.riderIds || [];
      
      // Filter de verwijderde renner eruit
      const updatedRiderIds = currentRiderIds.filter(id => id !== riderId);
      
      // Haal de rider objecten op voor de remaining riders
      const updatedRiders = raceTeam.riders ? 
        raceTeam.riders.filter(r => r.id !== riderId) : 
        [];
      
      // Bereken de nieuwe totale prijs
      const updatedTotalPrice = updatedRiders.reduce((sum, r) => sum + (r.price || 0), 0);
      
      // Update of verwijder het race team
      if (updatedRiderIds.length === 0) {
        // Als er geen renners meer zijn, verwijder het hele team
        await deleteDoc(doc(db, 'users', userId, 'teams', String(raceId)));
        console.log(`✅ Race team ${raceId} verwijderd (geen renners meer)`);
      } else {
        // Update het race team met de gefilterde renners
        await setDoc(doc(db, 'users', userId, 'teams', String(raceId)), {
          riderIds: updatedRiderIds,
          riders: updatedRiders,
          totalPrice: updatedTotalPrice,
          savedAt: new Date().toISOString()
        });
        console.log(`✅ Renner ${riderId} verwijderd uit race team ${raceId}`);
      }
    }
  } catch (error) {
    console.error(`Error removing rider ${riderId} from all race teams:`, error);
    throw error;
  }
};
