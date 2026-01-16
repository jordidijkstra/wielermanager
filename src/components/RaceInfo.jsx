export function RaceInfo({
  race,
  currentTeam,
  availableCount,
}) {
  return (
    <div className="race-info">
      <h2>{race.name}</h2>
      <p>{race.startDate} - {race.endDate}</p>

      <p>
        Selecteer {race.minRiders || 0} - {race.maxRiders} renners
      </p>
      <p className="team-count">
        Geselecteerd: {currentTeam.length}/{race.maxRiders}
      </p>
    </div>
  );
}
