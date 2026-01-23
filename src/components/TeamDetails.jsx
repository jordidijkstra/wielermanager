import PropTypes from 'prop-types';
import { useState, useMemo } from 'react';

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
  const [currentSpeeldagIndex, setCurrentSpeeldagIndex] = useState(null);
  const teamPoints = calculateTeamPoints(teamDetails);

  // Get unique race dates sorted
  const sortedDates = useMemo(() => {
    const uniqueDates = [...new Set(races.map(r => r.startDate))].filter(d => d);
    return uniqueDates.sort((a, b) => new Date(a) - new Date(b));
  }, [races]);

  // Determine closest speeldag to today on first render
  useMemo(() => {
    if (currentSpeeldagIndex === null && sortedDates.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let closestDateIndex = 0;
      let closestDiff = Math.abs(new Date(sortedDates[0]).getTime() - today.getTime());
      
      sortedDates.forEach((date, idx) => {
        const speeldagDate = new Date(date);
        speeldagDate.setHours(0, 0, 0, 0);
        const diff = Math.abs(speeldagDate.getTime() - today.getTime());
        if (diff < closestDiff) {
          closestDiff = diff;
          closestDateIndex = idx;
        }
      });
      
      setCurrentSpeeldagIndex(closestDateIndex);
    }
  }, [sortedDates, currentSpeeldagIndex]);

  // Get races for current speeldag
  const currentSpeeldagRaces = useMemo(() => {
    if (currentSpeeldagIndex === null || sortedDates.length === 0) return [];
    const currentDate = sortedDates[currentSpeeldagIndex];
    return races.filter(r => r.startDate === currentDate);
  }, [races, currentSpeeldagIndex, sortedDates]);

  // Calculate points for current speeldag
  const speeldagPoints = useMemo(() => {
    let totalPoints = 0;
    currentSpeeldagRaces.forEach(race => {
      const raceResult = results.find(r => r.raceId === race.id);
      if (raceResult && raceResult.entries && teamDetails.riders) {
        raceResult.entries.forEach(entry => {
          if (teamDetails.riders.some(r => r.id === entry.riderId)) {
            totalPoints += entry.points || 0;
          }
        });
      }
    });
    return totalPoints;
  }, [currentSpeeldagRaces, results, teamDetails.riders]);

  // Get riders with points on current speeldag
  const ridersWithSpeeldagPoints = useMemo(() => {
    if (!teamDetails.riders || teamDetails.riders.length === 0) return [];
    
    return teamDetails.riders
      .map(rider => {
        const riderSpeeldagPoints = currentSpeeldagRaces.reduce((sum, race) => {
          const raceResult = results.find(r => r.raceId === race.id);
          if (raceResult && raceResult.entries) {
            const entry = raceResult.entries.find(e => e.riderId === rider.id);
            return sum + (entry?.points || 0);
          }
          return sum;
        }, 0);
        
        return { ...rider, points: riderSpeeldagPoints };
      })
      .filter(rider => rider.points > 0)
      .sort((a, b) => b.points - a.points);
  }, [teamDetails.riders, currentSpeeldagRaces, results]);

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

        {/* Speeldag selector */}
        {sortedDates.length > 0 && currentSpeeldagIndex !== null && (
          <div className="speeldag-selector">
            <div className="speeldag-controls">
              <button 
                onClick={() => setCurrentSpeeldagIndex(Math.max(0, currentSpeeldagIndex - 1))}
                disabled={currentSpeeldagIndex === 0}
                className="speeldag-nav-btn"
              >
                ← Vorige
              </button>
              
              <div className="speeldag-info">
                <span className="speeldag-label">Speeldag: {currentSpeeldagIndex + 1} / {sortedDates.length}</span>
                <span className="speeldag-date">{new Date(sortedDates[currentSpeeldagIndex]).toLocaleDateString('nl-NL', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                <span className="speeldag-points">Punten deze speeldag: <strong>{speeldagPoints}</strong></span>
              </div>
              
              <button 
                onClick={() => setCurrentSpeeldagIndex(Math.min(sortedDates.length - 1, currentSpeeldagIndex + 1))}
                disabled={currentSpeeldagIndex === sortedDates.length - 1}
                className="speeldag-nav-btn"
              >
                Volgende →
              </button>
            </div>
          </div>
        )}

        {/* Renners met punten op deze speeldag */}
        {ridersWithSpeeldagPoints.length > 0 && (
          <div className="riders-active-speeldag">
            <h3>Punten gescoord op deze speeldag:</h3>
            <div className="riders-grid">
              {ridersWithSpeeldagPoints.map(rider => {
                const riderTotalPoints = races.reduce((sum, race) => {
                  const raceResult = results.find(r => r.raceId === race.id);
                  if (raceResult && raceResult.entries) {
                    const entry = raceResult.entries.find(e => e.riderId === rider.id);
                    return sum + (entry?.points || 0);
                  }
                  return sum;
                }, 0);

                return (
                  <div key={rider.id} className="rider-card rider-card-active">
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
                      <div className="rider-points-breakdown">
                        <p className="rider-points-speeldag">Speeldag: <strong>{rider.points}</strong> pts</p>
                        <p className="rider-points-total">Totaal: <strong>{riderTotalPoints}</strong> pts</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="team-riders">
          <h3>Renners in dit team:</h3>
          {teamDetails.riders && teamDetails.riders.length > 0 ? (
            <div className="riders-grid">
              {teamDetails.riders
                .sort((a, b) => b.price - a.price)
                .map(rider => {
                  const riderSpeeldagPoints = currentSpeeldagRaces.reduce((sum, race) => {
                    const raceResult = results.find(r => r.raceId === race.id);
                    if (raceResult && raceResult.entries) {
                      const entry = raceResult.entries.find(e => e.riderId === rider.id);
                      return sum + (entry?.points || 0);
                    }
                    return sum;
                  }, 0);

                  const riderTotalPoints = races.reduce((sum, race) => {
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
                        <div className="rider-points-breakdown">
                          <p className="rider-points-speeldag">Speeldag: <strong>{riderSpeeldagPoints}</strong> pts</p>
                          <p className="rider-points-total">Totaal: <strong>{riderTotalPoints}</strong> pts</p>
                        </div>
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
