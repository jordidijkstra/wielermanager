import { useState, useEffect } from 'react';
import { useRaces } from '../hooks/useRaces';
import { getRaceParticipants, filterRidersByParticipants } from '../services/raceService';
import { getCyclingTeams } from '../services/cyclingTeamService';
import { getUserTeam } from '../services/teamService';
import { RaceSelector } from './RaceSelector';
import { RaceTeamBuilder } from './RaceTeamBuilder';
import '../css/raceTeamSelector.css';

const INITIAL_RIDERS_COUNT = 7;

export default function RaceTeamSelector({ user, selectedRiders }) {
  const [selectedRace, setSelectedRace] = useState(null);
  const [selectedRaceDeadline, setSelectedRaceDeadline] = useState(null);
  const [raceTeams, setRaceTeams] = useState({});
  const [batchSaveStatus, setBatchSaveStatus] = useState('');
  const [raceParticipants, setRaceParticipants] = useState(null);
  const [cyclingTeams, setCyclingTeams] = useState([]);
  const [userTeamRiders, setUserTeamRiders] = useState([]);
  
  const { races, loading, userRaceTeams, saveTeamForRace, saveStatus } = useRaces(user);

  // Load cycling teams for jersey images
  useEffect(() => {
    const loadTeams = async () => {
      try {
        const teams = await getCyclingTeams();
        setCyclingTeams(teams);
      } catch (err) {
        console.error('Error loading cycling teams:', err);
      }
    };
    loadTeams();
  }, []);

  // Load user's team riders (NOT global selectedRiders from TeamBuilder)
  useEffect(() => {
    if (!user) {
      setUserTeamRiders([]);
      return;
    }

    const loadUserTeamRiders = async () => {
      try {
        const teamData = await getUserTeam(user.uid);
        if (teamData && teamData.riders) {
          setUserTeamRiders(teamData.riders);
        }
      } catch (err) {
        console.error('Error loading user team riders:', err);
      }
    };
    loadUserTeamRiders();
  }, [user]);

  // Reload user team riders when save status changes (after successful save)
  useEffect(() => {
    if (!saveStatus.includes('opgeslagen') || !user) return;

    const reloadUserTeamRiders = async () => {
      try {
        const teamData = await getUserTeam(user.uid);
        if (teamData && teamData.riders) {
          setUserTeamRiders(teamData.riders);
        }
      } catch (err) {
        console.error('Error reloading user team riders:', err);
      }
    };
    reloadUserTeamRiders();
  }, [saveStatus, user]);

  // Load saved race teams
  useEffect(() => {
    if (!userRaceTeams?.length) return;
    
    const teamsMap = userRaceTeams.reduce((acc, raceTeam) => ({
      ...acc,
      [raceTeam.raceId]: raceTeam.riderIds || []
    }), {});
    
    setRaceTeams(teamsMap);
  }, [userRaceTeams]);

  // Auto-select the first upcoming race on component mount
  useEffect(() => {
    if (!selectedRace && races && races.length > 0) {
      const now = new Date();
      
      // Find first upcoming race (same logic as RaceCountdown)
      for (const race of races) {
        if (!race.startDate) continue;
        if (race.status === 'raced') continue;
        if (race.tourId !== null && race.tourId !== undefined) continue; // Skip stages
        
        const startDate = new Date(race.startDate);
        if (startDate <= now) continue;
        
        // Found the first upcoming race
        setSelectedRace(race);
        const deadline = new Date(race.startDate);
        deadline.setHours(9, 0, 0, 0);
        setSelectedRaceDeadline(deadline);
        break;
      }
    }
  }, [races, selectedRace]);

  // Check if deadline has passed and auto-save
  useEffect(() => {
    if (!selectedRace || !selectedRaceDeadline) return;

    const now = new Date();
    const deadline = new Date(selectedRace.startDate);
    deadline.setHours(9, 0, 0, 0); // Deadline is 09:00 on startDate
    const deadlineHasPassed = deadline <= now;

    if (deadlineHasPassed) {
      const raceId = selectedRace.id;
      const team = raceTeams[raceId] || [];
      
      // Only auto-save if we have a valid team and it hasn't been saved yet
      if (team.length > 0 && !userRaceTeams?.some(rt => rt.raceId === raceId)) {
        console.log(`⏱️ Deadline verstreken voor race ${selectedRace.name}. Automatisch opslaan...`);
        saveRaceTeam();
      }
    }
  }, [selectedRace, selectedRaceDeadline, raceTeams, userRaceTeams]);

  // Load participants and auto-select riders when race is selected
  useEffect(() => {
    if (!selectedRace) return;

    const loadParticipants = async () => {
      try {
        const participants = await getRaceParticipants(selectedRace.id);
        setRaceParticipants(participants);

        // Check if there's already a saved team for this race
        const existingTeam = userRaceTeams?.find(rt => rt.raceId === selectedRace.id);
        
        if (existingTeam && existingTeam.riderIds) {
          // Use the saved team
          setRaceTeams(prevTeams => ({
            ...prevTeams,
            [selectedRace.id]: existingTeam.riderIds
          }));
        } else if (participants) {
          // Intelligent auto-selection for this race
          const raceImportance = getRaceImportance(selectedRace);
          
          // Get all other races and their importance
          const filteredRaces = getFilteredRaces();
          const moreImportantRaces = filteredRaces.filter(r => 
            getRaceImportance(r) < raceImportance && raceTeams[r.id]?.length > 0
          );
          
          // Get riders already used in more important races (only if races overlap)
          let usedInMoreImportant = new Set();
          for (const moreImportantRace of moreImportantRaces) {
            // Only exclude riders if races overlap
            if (selectedRace.overlappingRaces?.includes(moreImportantRace.id)) {
              moreImportantRace.riderIds?.forEach(id => usedInMoreImportant.add(id));
            }
          }
          
          // Get riders in overlapping races
          const overlappingRiderIds = new Set(
            (selectedRace.overlappingRaces || []).flatMap(rId => raceTeams[rId] || [])
          );

          const availableRiders = filterRidersByParticipants(userTeamRiders, participants)
            .filter(rider => {
              const riderId = parseInt(rider.id);
              return !usedInMoreImportant.has(riderId) && !overlappingRiderIds.has(riderId);
            })
            .sort((a, b) => b.price - a.price); // Sort by price (best riders first)

          const autoSelectedIds = availableRiders
            .slice(0, selectedRace.maxRiders || INITIAL_RIDERS_COUNT)
            .map(rider => parseInt(rider.id));

          setRaceTeams(prevTeams => ({
            ...prevTeams,
            [selectedRace.id]: autoSelectedIds
          }));
        }
      } catch (err) {
        console.error('Error loading participants:', err);
      }
    };

    loadParticipants();
  }, [selectedRace, userRaceTeams, userTeamRiders]);

  const handleRiderToggle = (riderId) => {
    if (!selectedRace) return;
    
    // Check if deadline has passed (09:00 on startDate)
    const deadline = new Date(selectedRace.startDate);
    deadline.setHours(9, 0, 0, 0);
    const now = new Date();
    if (deadline <= now) {
      alert('❌ De deadline voor deze race is verstreken. Je kunt de selectie niet meer wijzigen.');
      return;
    }

    const raceId = selectedRace.id;
    const team = raceTeams[raceId] || [];

    if (team.includes(riderId)) {
      setRaceTeams({
        ...raceTeams,
        [raceId]: team.filter(id => id !== riderId)
      });
    } else if (team.length < selectedRace.maxRiders) {
      setRaceTeams({
        ...raceTeams,
        [raceId]: [...team, riderId]
      });
    } else {
      alert(`Je kunt maximaal ${selectedRace.maxRiders} renners selecteren voor deze race!`);
    }
  };

  const getTeamJerseyPath = (teamId) => {
    const team = cyclingTeams.find(t => t.id === teamId);
    return team?.cyclingKit ? `/assets/${team.cyclingKit}` : '/assets/default.webp';
  };

  const isDeadlinePassed = (race) => {
    if (!race?.startDate) return false;
    const deadline = new Date(race.startDate);
    deadline.setHours(9, 0, 0, 0); // Deadline is 09:00 on startDate
    const now = new Date();
    return deadline <= now;
  };

  const getFilteredRaces = () => {
    return races.filter(race =>
      race.tourId == null &&
      !race.name?.includes('Championship') &&
      race.name?.trim() &&
      !race.name.includes('Stage') &&
      !race.startDate?.includes('xx')
    );
  };

  // Get race importance based on category priority
  const getRaceImportance = (race) => {
    const categoryImportance = {
      1: 1,    // Grand Tours (most important)
      2: 2,    // Stage Races
      3: 3,    // One-day races
      4: 4,    // Other
    };
    return categoryImportance[race.categoryId] || 10;
  };

  const getAvailableCount = (race) => {
    if (!race.overlappingRaces) return selectedRiders.length;

    const overlappingRiderIds = new Set(
      race.overlappingRaces.flatMap(raceId => raceTeams[raceId] || [])
    );

    return selectedRiders.filter(
      rider => (!overlappingRiderIds.has(parseInt(rider.id)) && rider.price > 0)
    ).length;
  };

  const getRidersInOverlappingRaces = () => {
    if (!selectedRace?.overlappingRaces) return new Set();

    return new Set(
      selectedRace.overlappingRaces.flatMap(raceId => raceTeams[raceId] || [])
    );
  };

  const getAllOverlappingRaces = (race) => {
    const sortedRaces = getFilteredRaces();
    return (race.overlappingRaces || [])
      .map(raceId => sortedRaces.find(r => r.id === raceId))
      .filter(Boolean);
  };

  const saveRaceTeam = async () => {
    if (!selectedRace) return;

    const raceId = selectedRace.id;
    const team = raceTeams[raceId] || [];
    const { minRiders = 0, maxRiders } = selectedRace;

    if (team.length < minRiders || team.length > maxRiders) {
      alert(`Je team moet minimaal ${minRiders} en maximaal ${maxRiders} renners bevatten!`);
      return;
    }

    try {
      const selectedRidersFiltered = userTeamRiders.filter(r =>
        team.includes(parseInt(r.id))
      );
      const totalPrice = selectedRidersFiltered.reduce((sum, r) => sum + r.price, 0);

      await saveTeamForRace(raceId, team, selectedRidersFiltered, totalPrice);
    } catch (err) {
      console.error('Error saving team:', err);
      alert('Fout bij opslaan');
    }
  };

  const saveAllRaceTeams = async () => {
    try {
      setBatchSaveStatus('Alle teams aan het opslaan...');
      const sortedRaces = getFilteredRaces();
      let savedCount = 0;
      let errorCount = 0;

      for (const [raceId, team] of Object.entries(raceTeams)) {
        if (!team?.length) continue;

        const race = sortedRaces.find(r => r.id === parseInt(raceId));
        if (!race) continue;

        const { minRiders = 0, maxRiders } = race;

        if (team.length < minRiders || team.length > maxRiders) {
          console.warn(`Race ${race.name}: invalid team size ${team.length}`);
          errorCount++;
          continue;
        }

        try {
          const selectedRidersFiltered = userTeamRiders.filter(r =>
            team.includes(parseInt(r.id))
          );
          const totalPrice = selectedRidersFiltered.reduce((sum, r) => sum + r.price, 0);

          await saveTeamForRace(parseInt(raceId), team, selectedRidersFiltered, totalPrice);
          savedCount++;
        } catch (err) {
          console.error(`Error saving race ${race.name}:`, err);
          errorCount++;
        }
      }

      const successMsg = `✅ ${savedCount} race${savedCount === 1 ? '' : 's'} opgeslagen`;
      const errorMsg = errorCount > 0 ? `, ${errorCount} fout(en)` : '';
      setBatchSaveStatus(successMsg + errorMsg + '!');
    } catch (err) {
      console.error('Error saving all races:', err);
      setBatchSaveStatus('❌ Fout bij opslaan');
    }

    setTimeout(() => setBatchSaveStatus(''), 3000);
  };

  if (loading) return <div>Races laden...</div>;

  const sortedRaces = getFilteredRaces();
  const currentTeam = selectedRace ? raceTeams[selectedRace.id] || [] : [];
  const ridersInOverlappingRaces = getRidersInOverlappingRaces();

  // Prepare race options for selector
  const raceOptions = sortedRaces.map(race => {
    const available = getAvailableCount(race);
    const hasOverlap = race.overlappingRaces?.length > 0;
    const isUnavailable = available === 0;
    const hasSavedTeam = userRaceTeams?.some(rt => rt.raceId === race.id);
    const startDate = new Date(race.startDate);
    const formattedDate = startDate.toLocaleDateString('nl-NL', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
    const formattedDeadline = `${formattedDate}, 09:00`;

    return {
      id: race.id,
      label: `${race.startDate} - ${race.name}${
        hasSavedTeam ? ' ✅' : ''
      }${
        isUnavailable ? ' ❌ (geen renners beschikbaar)' : ''
      }${hasOverlap && !isUnavailable ? ` ⚠️ (${race.overlappingRaces.length} overlap)` : ''}`,
      disabled: isUnavailable,
      title: isUnavailable ? 'Geen renners beschikbaar' : '',
      race,
      deadline: formattedDeadline,
    };
  });

  const handleRaceChange = (raceId) => {
    const option = raceOptions.find(opt => String(opt.id) === String(raceId));
    setSelectedRace(option?.race || null);
    setSelectedRaceDeadline(option?.deadline || null);
  };

  return (
    <div className="race-team-selector">
      <h1>Maak hier je selectie per race</h1>

      <RaceSelector
        races={raceOptions}
        selectedRaceId={selectedRace?.id || ''}
        selectedRaceDeadline={selectedRaceDeadline}
        onRaceChange={handleRaceChange}
        batchSaveStatus={batchSaveStatus}
        onSaveAll={saveAllRaceTeams}
      />

      <RaceTeamBuilder
        selectedRace={selectedRace}
        currentTeam={currentTeam}
        raceParticipants={raceParticipants}
        ridersInOverlappingRaces={ridersInOverlappingRaces}
        selectedRiders={userTeamRiders}
        getTeamJerseyPath={getTeamJerseyPath}
        filterRidersByParticipants={filterRidersByParticipants}
        getAvailableCount={getAvailableCount}
        getAllOverlappingRaces={getAllOverlappingRaces}
        onRiderToggle={handleRiderToggle}
        onSaveTeam={saveRaceTeam}
        saveStatus={saveStatus}
        isDeadlinePassed={isDeadlinePassed(selectedRace)}
        userRaceTeams={userRaceTeams}
      />
    </div>
  );
}