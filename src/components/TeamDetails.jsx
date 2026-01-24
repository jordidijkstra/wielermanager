import PropTypes from 'prop-types';
import { useState, useMemo, useEffect } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

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
  const [userRaceTeams, setUserRaceTeams] = useState({});
  const [loading, setLoading] = useState(true);
  const teamPoints = calculateTeamPoints(teamDetails);

  // Load user's race teams
  useEffect(() => {
    const loadRaceTeams = async () => {
      try {
        if (!teamDetails.userId) {
          setLoading(false);
          return;
        }

        // Get user's race teams
        const teamsSnapshot = await getDocs(collection(db, `users/${teamDetails.userId}/teams`));
        const teamsMap = {};
        teamsSnapshot.docs.forEach(doc => {
          teamsMap[parseInt(doc.id)] = doc.data().riderIds || [];
        });
        setUserRaceTeams(teamsMap);
      } catch (err) {
        console.error('Error loading race teams:', err);
      } finally {
        setLoading(false);
      }
    };

    loadRaceTeams();
  }, [teamDetails.userId]);

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

  // Get riders that are selected for current speeldag (with or without points)
  const ridersSelectedForSpeeldag = useMemo(() => {
    if (!teamDetails.riders || teamDetails.riders.length === 0) return [];
    if (currentSpeeldagRaces.length === 0) return [];
    
    // Collect all rider IDs selected for this speeldag
    // For stages, use the main tour selection; for main races, use their own selection
    const selectedRiderIds = new Set();
    currentSpeeldagRaces.forEach(race => {
      let raceIdToCheck = race.id;
      
      // If this is a stage, use the main tour selection
      if (race.tourId != null) {
        raceIdToCheck = race.tourId;
      }
      
      const riderIds = userRaceTeams[raceIdToCheck] || [];
      riderIds.forEach(riderId => selectedRiderIds.add(riderId));
    });
    
    // Filter team riders to only those selected for this speeldag
    return teamDetails.riders
      .filter(rider => selectedRiderIds.has(rider.id))
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
      .sort((a, b) => {
        // Sort by: first those with points (descending), then by price (descending)
        if (a.points !== b.points) {
          return b.points - a.points;
        }
        return b.price - a.price;
      });
  }, [teamDetails.riders, currentSpeeldagRaces, results, userRaceTeams]);

  if (loading) {
    return (
      <div className="rankings">
        <p>Team laden...</p>
      </div>
    );
  }

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

        {/* Renners die actief zijn op deze speeldag */}
        {ridersSelectedForSpeeldag.length > 0 && (
          <div className="riders-active-speeldag">
            <h3>Geselecteerd voor deze speeldag:</h3>
            <div className="riders-grid">
              {ridersSelectedForSpeeldag.map(rider => {
                const riderTotalPoints = races.reduce((sum, race) => {
                  const raceResult = results.find(r => r.raceId === race.id);
                  if (raceResult && raceResult.entries) {
                    const entry = raceResult.entries.find(e => e.riderId === rider.id);
                    return sum + (entry?.points || 0);
                  }
                  return sum;
                }, 0);

                return (
                  <div key={rider.id} className={`rider-card ${rider.points > 0 ? 'rider-card-active' : 'rider-card-selected'}`}>
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
