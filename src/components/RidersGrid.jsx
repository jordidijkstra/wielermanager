import { RiderItem } from './RiderItem';

export function RidersGrid({
  riders,
  currentTeam,
  raceParticipants,
  ridersInOverlappingRaces,
  getTeamJerseyPath,
  filterRidersByParticipants,
  onRiderToggle,
  isDeadlinePassed,
  savedTeamRiderIds,
}) {
  const availableRiders = riders.filter(rider =>
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
        const isUnavailable = ridersInOverlappingRaces.has(riderId);

        return (
          <RiderItem
            key={rider.id}
            rider={rider}
            isSelected={isSelected}
            isSaved={isSaved}
            isUnavailable={(ridersInOverlappingRaces.has(riderId) && !isSelected) || isDeadlinePassed}
            jerseyPath={getTeamJerseyPath(rider.teamId)}
            onToggle={() =>
              (!ridersInOverlappingRaces.has(riderId) || isSelected) && !isDeadlinePassed && onRiderToggle(riderId)
            }
          />
        );
      })}
    </div>
  );
}
