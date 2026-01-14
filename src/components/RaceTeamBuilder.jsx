import { RaceInfo } from './RaceInfo';
import { RidersGrid } from './RidersGrid';

export function RaceTeamBuilder({
  selectedRace,
  currentTeam,
  raceParticipants,
  ridersInOverlappingRaces,
  selectedRiders,
  getTeamJerseyPath,
  filterRidersByParticipants,
  getAvailableCount,
  getAllOverlappingRaces,
  onRiderToggle,
  onSaveTeam,
  saveStatus,
}) {
  if (!selectedRace) return null;

  const availableCount = getAvailableCount(selectedRace);
  const overlappingRaces = getAllOverlappingRaces(selectedRace);

  return (
    <div className="race-team-builder">
      <RaceInfo
        race={selectedRace}
        currentTeam={currentTeam}
        availableCount={availableCount}
        overlappingRaces={overlappingRaces}
      />

      {raceParticipants === null ? (
        <div className="available-riders-for-race">
          <p className="participants-info">
            Nog geen deelnemerslijst beschikbaar voor deze race
          </p>
        </div>
      ) : (
        <>
          <div className="available-riders-for-race">
            <h3>Renners beschikbaar in jouw team voor {selectedRace.name}</h3>
            <RidersGrid
              riders={selectedRiders}
              currentTeam={currentTeam}
              raceParticipants={raceParticipants}
              ridersInOverlappingRaces={ridersInOverlappingRaces}
              getTeamJerseyPath={getTeamJerseyPath}
              filterRidersByParticipants={filterRidersByParticipants}
              onRiderToggle={onRiderToggle}
            />
          </div>

          <button className="btn-save" onClick={onSaveTeam}>
            Selectie Opslaan
          </button>
          {saveStatus && <p className="save-status">{saveStatus}</p>}
        </>
      )}
    </div>
  );
}
