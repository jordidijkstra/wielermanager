import { RaceInfo } from './RaceInfo';
import { RidersGrid } from './RidersGrid';

export function RaceTeamBuilder({
  selectedRace,
  currentTeam,
  raceParticipants,
  selectedRiders,
  getTeamJerseyPath,
  filterRidersByParticipants,
  getAvailableCount,
  onRiderToggle,
  onSaveTeam,
  saveStatus,
  isDeadlinePassed,
  userRaceTeams,
  raceMaxPoints,
}) {
  if (!selectedRace) return null;

  // Get saved riders for this race
  const savedTeamRiderIds = new Set(
    userRaceTeams?.find(rt => rt.raceId === selectedRace.id)?.riderIds || []
  );

  const availableCount = getAvailableCount(selectedRace);

  return (
    <div className="race-team-builder">
      <RaceInfo
        race={selectedRace}
        currentTeam={currentTeam}
        availableCount={availableCount}
        podiumPoints={raceMaxPoints?.[selectedRace?.id]}
      />

      {isDeadlinePassed && (
        <div className="deadline-passed-warning">
          <h3>⏱️ Deadline Verstreken</h3>
          <p>De inschrijving voor deze race is gesloten. Je selectie is automatisch opgeslagen.</p>
        </div>
      )}

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
              getTeamJerseyPath={getTeamJerseyPath}
              filterRidersByParticipants={filterRidersByParticipants}
              onRiderToggle={onRiderToggle}
              isDeadlinePassed={isDeadlinePassed}
              savedTeamRiderIds={savedTeamRiderIds}
            />
          </div>

          <button className="btn-save-race-team" onClick={onSaveTeam} disabled={isDeadlinePassed}>
            {isDeadlinePassed ? '✓ Selectie Opgeslagen' : 'Selectie Opslaan'}
          </button>
          {saveStatus && <p className="save-status">{saveStatus}</p>}
        </>
      )}
    </div>
  );
}
