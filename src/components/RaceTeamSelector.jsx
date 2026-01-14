import { useState, useEffect } from 'react';
import { useRaces } from '../hooks/useRaces';
import { getRaceParticipants, filterRidersByParticipants } from '../services/raceService';
import { getCyclingTeams } from '../services/cyclingTeamService';
import { RaceSelector } from './RaceSelector';
import { RaceTeamBuilder } from './RaceTeamBuilder';
import '../css/raceTeamSelector.css';

const INITIAL_RIDERS_COUNT = 7;

export default function RaceTeamSelector({ user, selectedRiders }) {
  const [selectedRace, setSelectedRace] = useState(null);
  const [raceTeams, setRaceTeams] = useState({});
  const [batchSaveStatus, setBatchSaveStatus] = useState('');
  const [raceParticipants, setRaceParticipants] = useState(null);
  const [cyclingTeams, setCyclingTeams] = useState([]);
  
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

  // Load saved race teams
  useEffect(() => {
    if (!userRaceTeams?.length) return;
    
    const teamsMap = userRaceTeams.reduce((acc, raceTeam) => ({
      ...acc,
      [raceTeam.raceId]: raceTeam.riderIds || []
    }), {});
    
    setRaceTeams(teamsMap);
  }, [userRaceTeams]);

  // Load participants and auto-select riders when race is selected
  useEffect(() => {
    if (!selectedRace) return;

    const loadParticipants = async () => {
      try {
        const participants = await getRaceParticipants(selectedRace.id);
        setRaceParticipants(participants);

        if (participants) {
          const availableRiders = filterRidersByParticipants(selectedRiders, participants);
          const autoSelectedIds = availableRiders
            .slice(0, INITIAL_RIDERS_COUNT)
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
  }, [selectedRace, selectedRiders]);

  const handleRiderToggle = (riderId) => {
    if (!selectedRace) return;

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

  const getFilteredRaces = () => {
    return races.filter(race =>
      race.tourId == null &&
      !race.name?.includes('Championship') &&
      race.name?.trim() &&
      !race.name.includes('Stage') &&
      !race.startDate?.includes('xx')
    );
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
      const selectedRidersFiltered = selectedRiders.filter(r =>
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
          const selectedRidersFiltered = selectedRiders.filter(r =>
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

    return {
      id: race.id,
      label: `${race.startDate} - ${race.name}${
        isUnavailable ? ' ❌ (geen renners beschikbaar)' : ''
      }${hasOverlap && !isUnavailable ? ` ⚠️ (${race.overlappingRaces.length} overlap)` : ''}`,
      disabled: isUnavailable,
      title: isUnavailable ? 'Geen renners beschikbaar' : '',
      race,
    };
  });

  const handleRaceChange = (raceId) => {
    const option = raceOptions.find(opt => String(opt.id) === raceId);
    setSelectedRace(option?.race || null);
  };

  return (
    <div className="race-team-selector">
      <h1>Maak hier je selectie per race</h1>

      <RaceSelector
        races={raceOptions}
        selectedRaceId={selectedRace?.id || ''}
        onRaceChange={handleRaceChange}
        batchSaveStatus={batchSaveStatus}
        onSaveAll={saveAllRaceTeams}
      />

      <RaceTeamBuilder
        selectedRace={selectedRace}
        currentTeam={currentTeam}
        raceParticipants={raceParticipants}
        ridersInOverlappingRaces={ridersInOverlappingRaces}
        selectedRiders={selectedRiders}
        getTeamJerseyPath={getTeamJerseyPath}
        filterRidersByParticipants={filterRidersByParticipants}
        getAvailableCount={getAvailableCount}
        getAllOverlappingRaces={getAllOverlappingRaces}
        onRiderToggle={handleRiderToggle}
        onSaveTeam={saveRaceTeam}
        saveStatus={saveStatus}
      />
    </div>
  );
}