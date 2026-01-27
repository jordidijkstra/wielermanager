export function RaceInfo({
  race,
  currentTeam,
  availableCount,
  podiumPoints,
}) {
  return (
    <div className="race-info">
      <div className="race-info-container-left">
        <h2>{race.name}</h2>
        <p>{race.startDate} - {race.endDate}</p>

        <p>
          Selecteer {race.minRiders || 0} - {race.maxRiders} renners
        </p>
        <p className="team-count">
          Geselecteerd: {currentTeam.length}/{race.maxRiders}
        </p>
      </div>

      {podiumPoints && Array.isArray(podiumPoints) && (
        <div className="podium-points race-info-container-right">
          <h4>Podium Punten</h4>
          {podiumPoints[1] && (
            <div className="podium-position">
              <span className="position-points">{podiumPoints[1]} pts</span>
              <span className="medal silver">2de</span>
            </div>
          )}
          <div className="podium-position">
            <span className="position-points">{podiumPoints[0]} pts</span>
            <span className="medal gold">1ste</span>
          </div>
          {podiumPoints[2] && (
            <div className="podium-position">
              <span className="position-points">{podiumPoints[2]} pts</span>
              <span className="medal bronze">3de</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
