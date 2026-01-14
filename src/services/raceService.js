import { collection, doc, getDocs, getDoc, setDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';

// Haal alle races op, gesorteerd op startDate
export const getAllRaces = async () => {
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
  
  // Detecteer overlaps en voeg informatie toe
  return races.map(race => ({
    ...race,
    overlappingRaces: getOverlappingRaceIds(race, races)
  }));
};

// Detecteer welke races overlappen met een gegeven race
const getOverlappingRaceIds = (race, allRaces) => {
  // Valide race check
  if (!race.startDate || !race.endDate || race.startDate.includes('xx') || !race.name?.trim()) return [];
  
  const raceStart = new Date(race.startDate);
  const raceEnd = new Date(race.endDate);
  
  if (isNaN(raceStart.getTime()) || isNaN(raceEnd.getTime())) return [];
  
  return allRaces
    .filter(other => {
      if (other.id === race.id) return false; // Sluit jezelf uit
      
      // Veel strengere filtering - alleen valide races
      if (!other.startDate || !other.endDate) return false;
      if (other.startDate.includes('xx') || other.endDate.includes('xx')) return false;
      if (!other.name || !other.name.trim()) return false;
      if (other.tourId !== null) return false; // Stages uitsluiten
      if (other.name.includes('Championship')) return false;
      if (other.name.includes('Stage')) return false;
      
      const otherStart = new Date(other.startDate);
      const otherEnd = new Date(other.endDate);
      
      if (isNaN(otherStart.getTime()) || isNaN(otherEnd.getTime())) return false;
      
      // Check of races overlappen
      return raceStart <= otherEnd && raceEnd >= otherStart;
    })
    .map(race => race.id);
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

// Selecteer automatisch de beste renners voor een race
export const getAutoSelectedRiders = (race, allRiders, raceTeams, ridersInOverlappingRaces, raceParticipants = null) => {
  if (!race || !allRiders) return [];
  
  const minRiders = race.minRiders || 1;
  const maxRiders = race.maxRiders || 7;
  
  // Filter beschikbare renners:
  // - Moeten prijs hebben
  // - Mogen niet al in overlappende race zitten
  // - Moeten deelnemer zijn (als deelnemerslijst beschikbaar)
  const availableRiders = allRiders.filter(rider => {
    if (!rider.price || rider.price <= 0) return false;
    if (ridersInOverlappingRaces.includes(parseInt(rider.id))) return false;
    
    // Filter op race participants als beschikbaar
    if (raceParticipants && raceParticipants.length > 0) {
      const riderId = parseInt(rider.id);
      const isParticipant = raceParticipants.some(p => p.riderId === riderId);
      if (!isParticipant) return false;
    }
    
    return true;
  });
  
  // Sorteer op prijs (hoogste eerst = beste waarde)
  const sortedByPrice = availableRiders.sort((a, b) => b.price - a.price);
  
  // Selecteer tot maxRiders, maar liever minRiders als minimum
  const targetCount = Math.min(maxRiders, Math.max(minRiders, Math.floor(sortedByPrice.length * 0.6)));
  
  return sortedByPrice.slice(0, targetCount).map(r => parseInt(r.id));
};

// Selecteer automatisch de beste renners voor ALLE races
export const getAutoSelectedForAllRaces = (races, allRiders) => {
  if (!races || !allRiders) return {};
  
  const allRaceTeams = {}; // Gebruiken we om al geselecteerde renners bij te houden
  const result = {};
  
  races.forEach(race => {
    const minRiders = race.minRiders || 1;
    const maxRiders = race.maxRiders || 7;
    
    // Renners die al in overlappende races geselecteerd zijn
    const ridersInOverlappingRaces = new Set();
    (race.overlappingRaces || []).forEach(overlapRaceId => {
      const overlapTeam = allRaceTeams[overlapRaceId] || [];
      overlapTeam.forEach(riderId => ridersInOverlappingRaces.add(riderId));
    });
    
    // Filter beschikbare renners
    const availableRiders = allRiders.filter(rider => {
      if (!rider.price || rider.price <= 0) return false;
      if (ridersInOverlappingRaces.has(parseInt(rider.id))) return false;
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

// Controleer hoeveel beschikbare renners er zijn voor een race
export const getAvailableRidersCount = (race, allRiders, ridersInOverlappingRaces) => {
  if (!race || !allRiders) return 0;
  
  return allRiders.filter(rider => {
    if (!rider.price || rider.price <= 0) return false;
    if (ridersInOverlappingRaces.includes(parseInt(rider.id))) return false;
    return true;
  }).length;
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


