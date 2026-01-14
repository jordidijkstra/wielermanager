export function RaceInfo({
  race,
  currentTeam,
  availableCount,
  overlappingRaces,
}) {
  return (
    <div className="race-info">
      <h2>{race.name}</h2>
      <p>{race.startDate} - {race.endDate}</p>

      {availableCount === 0 && (
        <div className="no-riders-warning">
          ❌ <strong>Geen beschikbare renners!</strong> Alle renners zijn al
          geselecteerd voor overlappende races.
        </div>
      )}

      {overlappingRaces.length > 0 && (
        <div className="overlap-warning">
          <strong>⚠️ Let op:</strong> Deze race overlapt met {overlappingRaces.length}{' '}
          andere race(s):
          <ul>
            {overlappingRaces.map(r => (
              <li key={r.id}>
                {r.name} (
                {r.startDate === r.endDate
                  ? r.startDate
                  : `${r.startDate} - ${r.endDate}`}
                )
              </li>
            ))}
          </ul>
        </div>
      )}

      <p>
        Selecteer {race.minRiders || 0} - {race.maxRiders} renners
      </p>
      <p className="team-count">
        Geselecteerd: {currentTeam.length}/{race.maxRiders}
      </p>
    </div>
  );
}
