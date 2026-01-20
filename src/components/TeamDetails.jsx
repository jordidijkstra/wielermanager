import PropTypes from 'prop-types';

export default function TeamDetails({
  teamDetails,
  calculateTeamPoints,
  races,
  results,
  getRiderName,
  getCyclingJerseyPath,
  getUserName,
  handleCloseDetails
}) {
  const teamPoints = calculateTeamPoints(teamDetails);

  return (
    <div className="rankings">
      <div className="team-details-header">
        <button 
          className="btn-back" 
          onClick={handleCloseDetails}
          title="Terug naar Rankings (of druk ESC)"
        >
          ← Terug naar Rankings
        </button>
      </div>
      
      <div className="team-details">
        <h2>Team Details</h2>
        <div className="team-info">
          <p><strong>Team:</strong> {getUserName(teamDetails.id)}</p>
          <p><strong>Totale Punten:</strong> <span className="team-points">{teamPoints}</span></p>
        </div>

        <div className="team-riders">
          <h3>Renners in dit team:</h3>
          {teamDetails.riders && teamDetails.riders.length > 0 ? (
            <div className="riders-grid">
              {teamDetails.riders
                .sort((a, b) => b.price - a.price)
                .map(rider => {
                  const riderPoints = races.reduce((sum, race) => {
                    const raceResult = results.find(r => r.raceId === race.id);
                    if (raceResult && raceResult.entries) {
                      const entry = raceResult.entries.find(e => e.riderId === rider.id);
                      return sum + (entry?.points || 0);
                    }
                    return sum;
                  }, 0);

                  return (
                    <div key={rider.id} className="rider-card">
                      <img
                        src={getCyclingJerseyPath(rider.teamId)}
                        alt={getRiderName(rider)}
                        className="rider-image"
                        onError={(e) => e.target.src = '/assets/default.webp'}
                      />
                      <div className="rider-info">
                        <p className="rider-name">{getRiderName(rider)}</p>
                        <p className="rider-team">{rider.team}</p>
                        <p className="rider-price">€{(rider.price / 1000000).toFixed(1)}M</p>
                        <p className="rider-points">{riderPoints} pts</p>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="no-riders">Geen renners in dit team</p>
          )}
        </div>
      </div>
    </div>
  );
}

TeamDetails.propTypes = {
  teamDetails: PropTypes.object.isRequired,
  calculateTeamPoints: PropTypes.func.isRequired,
  races: PropTypes.array.isRequired,
  results: PropTypes.array.isRequired,
  getRiderName: PropTypes.func.isRequired,
  getCyclingJerseyPath: PropTypes.func.isRequired,
  getUserName: PropTypes.func.isRequired,
  handleCloseDetails: PropTypes.func.isRequired
};
