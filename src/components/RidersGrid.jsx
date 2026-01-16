import { RiderItem } from './RiderItem';

export function RidersGrid({
  riders,
  currentTeam,
  raceParticipants,
  getTeamJerseyPath,
  filterRidersByParticipants,
  onRiderToggle,
  isDeadlinePassed,
  savedTeamRiderIds,
}) {
  const availableRiders = riders.filter(rider =>
    parseInt(rider.id) !== 911 && // Exclude dummy rider 911
    filterRidersByParticipants([rider], raceParticipants).length > 0
  );

  if (availableRiders.length === 0) {
    return <p className="no-riders-message">Geen renners beschikbaar</p>;
  }

  return (
    <div className="riders-grid">
      {availableRiders.map(rider => {
        const riderId = parseInt(rider.id);
        const isSelected = currentTeam.includes(riderId);
        const isSaved = (savedTeamRiderIds?.has(riderId) && isSelected) || false;

        return (
          <RiderItem
            key={rider.id}
            rider={rider}
            isSelected={isSelected}
            isSaved={isSaved}
            isUnavailable={isDeadlinePassed}
            jerseyPath={getTeamJerseyPath(rider.teamId)}
            onToggle={() =>
              !isDeadlinePassed && onRiderToggle(riderId)
            }
          />
        );
      })}
    </div>
  );
}
