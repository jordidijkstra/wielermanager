import { useState, useEffect, useRef } from 'react';
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
  const autoSavedRaces = useRef(new Set()); // Track which races have been auto-saved
  
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

  // Clear auto-save tracking when race is selected/changed
  // This allows reprocessing if race data is updated (e.g., deadline changed)
  useEffect(() => {
    if (selectedRace) {
      autoSavedRaces.current.delete(selectedRace.id);
    }
  }, [selectedRace?.id]);

  // Check if deadline has passed and auto-save/auto-fill
  useEffect(() => {
    if (!selectedRace || !raceParticipants) return;

    const now = new Date();
    const deadline = new Date(selectedRace.startDate);
    deadline.setHours(9, 0, 0, 0); // Deadline is 09:00 on startDate
    const deadlineHasPassed = deadline <= now;

    if (!deadlineHasPassed) return;

    const raceId = selectedRace.id;
    
    // Only process each race once
    if (autoSavedRaces.current.has(raceId)) return;
    
    autoSavedRaces.current.add(raceId);
    
    const currentTeam = raceTeams[raceId] || [];
    const maxRidersForRace = selectedRace.maxRiders || INITIAL_RIDERS_COUNT;
    const existingSavedTeam = userRaceTeams?.find(rt => rt.raceId === raceId);
    
    console.log(`⏱️ Deadline verstreken voor race ${selectedRace.name}. Processing...`);
    
    // Determine which team to work with
    const teamToProcess = existingSavedTeam?.riderIds || currentTeam;
    const teamSize = teamToProcess.length;
    
    if (teamSize === 0) {
      // No team at all - skip
      return;
    }
    
    if (teamSize >= maxRidersForRace) {
      // Team already at max - just save if not saved yet
      if (!existingSavedTeam && currentTeam.length > 0) {
        console.log(`✅ Saving unsaved team with ${teamSize} riders...`);
        saveRaceTeam();
      }
      return;
    }
    
    // Team has less than maxRiders - auto-fill
    console.log(`⏱️ Auto-filling race ${selectedRace.name} from ${teamSize} to ${maxRidersForRace} riders...`);
    
    const availableRiders = filterRidersByParticipants(userTeamRiders, raceParticipants)
      .filter(rider => 
        parseInt(rider.id) !== 911 && // Exclude dummy rider 911
        !teamToProcess.includes(parseInt(rider.id)) // Exclude already selected riders
      )
      .sort((a, b) => b.price - a.price); // Sort by price (best riders first)
    
    const additionalRiders = availableRiders
      .slice(0, maxRidersForRace - teamSize)
      .map(rider => parseInt(rider.id));
    
    const updatedTeam = [...teamToProcess, ...additionalRiders];
    
    // Update state
    setRaceTeams(prevTeams => ({
      ...prevTeams,
      [raceId]: updatedTeam
    }));
    
    // Auto-save the updated team
    setTimeout(() => {
      const selectedRidersForRace = userTeamRiders.filter(r =>
        updatedTeam.includes(parseInt(r.id))
      );
      const totalPrice = selectedRidersForRace.reduce((sum, r) => sum + r.price, 0);
      console.log(`✅ Auto-saving race ${selectedRace.name} with ${updatedTeam.length} riders`);
      saveTeamForRace(raceId, updatedTeam, selectedRidersForRace, totalPrice);
    }, 100);
  }, [selectedRace, raceParticipants, raceTeams, userRaceTeams, userTeamRiders]);

  // Load participants and auto-select riders when race is selected
  useEffect(() => {
    if (!selectedRace) return;

    const loadParticipants = async () => {
      try {
        const participants = await getRaceParticipants(selectedRace.id);
        setRaceParticipants(participants);

        const maxRidersForRace = selectedRace.maxRiders || INITIAL_RIDERS_COUNT;
        
        // Check if there's already a saved team for this race
        const existingTeam = userRaceTeams?.find(rt => rt.raceId === selectedRace.id);
        
        if (existingTeam && existingTeam.riderIds) {
          // Use the saved team
          let teamToUse = [...existingTeam.riderIds];
          
          // If saved team has less than maxRiders, try to fill it up
          if (teamToUse.length < maxRidersForRace && participants) {
            const availableRiders = filterRidersByParticipants(userTeamRiders, participants)
              .filter(rider => 
                parseInt(rider.id) !== 911 && // Exclude dummy rider 911
                !teamToUse.includes(parseInt(rider.id)) // Exclude already selected riders
              )
              .sort((a, b) => b.price - a.price); // Sort by price (best riders first)
            
            const additionalRiders = availableRiders
              .slice(0, maxRidersForRace - teamToUse.length)
              .map(rider => parseInt(rider.id));
            
            teamToUse = [...teamToUse, ...additionalRiders];
          }
          
          setRaceTeams(prevTeams => ({
            ...prevTeams,
            [selectedRace.id]: teamToUse
          }));
        } else if (participants) {
          // Auto-selection: selecteer renners tot maxRiders bereikt is
          // Kies altijd de duurste renners eerst (beste renners)
          const availableRiders = filterRidersByParticipants(userTeamRiders, participants)
            .filter(rider => parseInt(rider.id) !== 911) // Exclude dummy rider 911
            .sort((a, b) => b.price - a.price); // Sort by price (best riders first)

          const autoSelectedIds = availableRiders
            .slice(0, maxRidersForRace)
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
    const now = new Date();
    return races.filter(race => {
      // Basisfilters
      if (race.tourId != null) return false;
      if (!race.name?.trim()) return false;
      if (race.name.includes('Stage')) return false;
      if (race.startDate?.includes('xx')) return false;
      
      // Check deadline: exclude races where deadline has passed (09:00 on startDate)
      if (race.startDate) {
        const deadline = new Date(race.startDate);
        deadline.setHours(9, 0, 0, 0);
        if (deadline <= now) return false;
      }
      
      return true;
    });
  };

  const getAvailableCount = (race) => {
    return userTeamRiders.length;
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

  // Prepare race options for selector
  const raceOptions = sortedRaces.map(race => {
    const hasSavedTeam = userRaceTeams?.some(rt => rt.raceId === race.id);
    const startDate = new Date(race.startDate);
    const deadline = new Date(race.startDate);
    deadline.setHours(9, 0, 0, 0);

    return {
      id: race.id,
      label: `${race.startDate} - ${race.name}${hasSavedTeam ? ' ✅' : ''}`,
      race,
      deadline: deadline,
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
        selectedRiders={userTeamRiders}
        getTeamJerseyPath={getTeamJerseyPath}
        filterRidersByParticipants={filterRidersByParticipants}
        getAvailableCount={getAvailableCount}
        onRiderToggle={handleRiderToggle}
        onSaveTeam={saveRaceTeam}
        saveStatus={saveStatus}
        isDeadlinePassed={isDeadlinePassed(selectedRace)}
        userRaceTeams={userRaceTeams}
      />
    </div>
  );
}