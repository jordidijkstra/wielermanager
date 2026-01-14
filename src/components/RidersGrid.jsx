import { RiderItem } from './RiderItem';

export function RidersGrid({
  riders,
  currentTeam,
  raceParticipants,
  ridersInOverlappingRaces,
  getTeamJerseyPath,
  filterRidersByParticipants,
  onRiderToggle,
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
        const isUnavailable = ridersInOverlappingRaces.has(riderId);

        return (
          <RiderItem
            key={rider.id}
            rider={rider}
            isSelected={isSelected}
            isUnavailable={isUnavailable && !isSelected}
            jerseyPath={getTeamJerseyPath(rider.teamId)}
            onToggle={() =>
              (!isUnavailable || isSelected) && onRiderToggle(riderId)
            }
          />
        );
      })}
    </div>
  );
}
