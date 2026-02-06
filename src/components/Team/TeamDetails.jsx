import PropTypes from 'prop-types';
import React, { useState, useMemo, useEffect } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { getRiderRacePoints } from '../../services/riderService';

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
  const [closestDateIndex, setClosestDateIndex] = useState(0);
  const [userRaceTeams, setUserRaceTeams] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedRiderResults, setSelectedRiderResults] = useState(null);
  const [riderResultsLoading, setRiderResultsLoading] = useState(false);
  const [riderRaceLeaderPoints, setRiderRaceLeaderPoints] = useState({});
  
  // Load race leader points for all team riders
  useEffect(() => {
    const loadRaceLeaderPoints = async () => {
      if (!teamDetails.riders || teamDetails.riders.length === 0) return;
      
      const leaderPoints = {};
      
      for (const rider of teamDetails.riders) {
        try {
          const riderResultsSnap = await getDocs(collection(db, 'riders', rider.id.toString(), 'riderResults'));
          riderResultsSnap.docs.forEach(doc => {
            const data = doc.data();
            const raceId = doc.id;
            if (data.raceLeaderPoints && data.raceLeaderPoints > 0) {
              leaderPoints[`${rider.id}-${raceId}`] = data.raceLeaderPoints;
            }
          });
        } catch (err) {
          console.error(`Error loading race leader points for rider ${rider.id}:`, err);
        }
      }
      
      console.log('✅ Loaded race leader points:', leaderPoints);
      setRiderRaceLeaderPoints(leaderPoints);
    };
    
    loadRaceLeaderPoints();
  }, [teamDetails.riders, teamDetails.isVirtual]);
  
  // Calculate team points - handle virtual teams specially
  const teamPoints = useMemo(() => {
    if (teamDetails.isVirtual && teamDetails.riders) {
      // For virtual teams, sum all points from all riders across all races
      // Include both regular points and race leader points
      return teamDetails.riders.reduce((total, rider) => {
        const riderTotalPoints = results.reduce((sum, raceResult) => {
          if (raceResult.entries) {
            const entry = raceResult.entries.find(e => e.riderId === rider.id);
            const entryPoints = entry?.points || 0;
            // Get race leader points from the loaded data using race ID as string
            const raceIdStr = String(raceResult.raceId);
            const raceLeaderBonus = riderRaceLeaderPoints[`${rider.id}-${raceIdStr}`] || 0;
            return sum + entryPoints + raceLeaderBonus;
          }
          return sum;
        }, 0);
        return total + riderTotalPoints;
      }, 0);
    }
    
    // For normal teams, use the provided calculateTeamPoints function
    return calculateTeamPoints(teamDetails);
  }, [teamDetails, calculateTeamPoints, results, riderRaceLeaderPoints]);

  // Load user's race teams (including pre-calculated points)
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
          const data = doc.data();
          teamsMap[parseInt(doc.id)] = {
            riderIds: data.riderIds || [],
            calculatedPoints: data.calculatedPoints || 0,
            riderPoints: data.riderPoints || {}
          };
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

  const viewRiderResults = async (riderId, riderName) => {
    try {
      setRiderResultsLoading(true);
      const results = await getRiderRacePoints(riderId);
      setSelectedRiderResults({ riderId, riderName, results });
    } catch (error) {
      console.error('Error loading rider results:', error);
      alert('Fout bij laden resultaten');
    } finally {
      setRiderResultsLoading(false);
    }
  };

  const getRaceName = (raceId) => {
    return races.find(r => r.id === raceId)?.name || `Race ${raceId}`;
  };

  // Group races by speeldag (endDate for main races, startDate for stages)
  const groupRacesByDate = () => {
    const grouped = {};
    races.forEach(race => {
      // Use endDate for main races (GC), startDate for stages
      const date = race.tourId == null ? (race.endDate || race.startDate) : (race.startDate || 'onbekend');
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(race);
    });
    
    // Sort each date's races: main tours first, then their stages
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => {
        // Main tours (tourId == null) before stages
        if ((a.tourId == null) !== (b.tourId == null)) {
          return a.tourId == null ? -1 : 1;
        }
        return 0;
      });
    });
    
    return grouped;
  };

  const racesByDate = groupRacesByDate();
  const sortedDates = Object.keys(racesByDate).sort();

  // Determine closest speeldag to today on first render
  useEffect(() => {
    if (sortedDates.length === 0) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let closestIdx = 0;
    let closestDiff = Math.abs(new Date(sortedDates[0]).getTime() - today.getTime());
    
    sortedDates.forEach((date, idx) => {
      const speeldagDate = new Date(date);
      speeldagDate.setHours(0, 0, 0, 0);
      const diff = Math.abs(speeldagDate.getTime() - today.getTime());
      
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIdx = idx;
      }
    });
    
    setClosestDateIndex(closestIdx);
  }, []);

  // Get races for current speeldag
  const currentSpeeldagRaces = useMemo(() => {
    if (sortedDates.length === 0) return [];
    const currentDate = sortedDates[closestDateIndex];
    return racesByDate[currentDate] || [];
  }, [racesByDate, closestDateIndex, sortedDates]);

  // Calculate points for current speeldag (only from selected riders)
  // Using pre-calculated points from Cloud Function
  // For virtual teams, sum points from the riders directly
  const speeldagPoints = useMemo(() => {
    // If this is a virtual team (best possible team), calculate from rider points directly
    if (teamDetails.isVirtual && teamDetails.riders) {
      return currentSpeeldagRaces.reduce((totalPoints, race) => {
        const raceIdNum = typeof race.id === 'string' ? parseInt(race.id) : race.id;
        const raceIdStr = String(raceIdNum);
        const raceResult = results.find(r => r.raceId === raceIdNum);
        
        if (raceResult && raceResult.entries) {
          // Sum points from all riders in the team for this race
          teamDetails.riders.forEach(rider => {
            const entry = raceResult.entries.find(e => e.riderId === rider.id);
            if (entry) {
              const entryPoints = entry.points || 0;
              const raceLeaderBonus = riderRaceLeaderPoints[`${rider.id}-${raceIdStr}`] || 0;
              totalPoints += entryPoints + raceLeaderBonus;
            }
          });
        }
        return totalPoints;
      }, 0);
    }

    // For normal teams, use pre-calculated points from stored selections
    let totalPoints = 0;
    currentSpeeldagRaces.forEach(race => {
      const raceIdNum = typeof race.id === 'string' ? parseInt(race.id) : race.id;
      
      // Points are always stored under race ID (stage ID for stages, race ID for normal races)
      const raceTeamData = userRaceTeams[raceIdNum];
      if (raceTeamData && raceTeamData.calculatedPoints) {
        totalPoints += raceTeamData.calculatedPoints;
      }
    });
    return totalPoints;
  }, [currentSpeeldagRaces, userRaceTeams, teamDetails.isVirtual, teamDetails.riders, results, riderRaceLeaderPoints]);

  // Get riders not selected but with points on current speeldag
  const ridersNotSelectedButWithPoints = useMemo(() => {
    if (!teamDetails.riders || teamDetails.riders.length === 0) return [];
    if (currentSpeeldagRaces.length === 0) return [];
    
    // For virtual teams, show all riders with their points (no "not selected" concept)
    if (teamDetails.isVirtual) {
      return teamDetails.riders
        .map(rider => {
          const riderSpeeldagPoints = currentSpeeldagRaces.reduce((sum, race) => {
            const raceIdNum = typeof race.id === 'string' ? parseInt(race.id) : race.id;
            const raceResult = results.find(r => r.raceId === raceIdNum);
            if (raceResult && raceResult.entries) {
              const entry = raceResult.entries.find(e => e.riderId === rider.id);
              return sum + (entry?.points || 0);
            }
            return sum;
          }, 0);
          return { ...rider, points: riderSpeeldagPoints };
        })
        .sort((a, b) => b.points - a.points);
    }
    
    // Collect all rider IDs selected for this speeldag
    const selectedRiderIds = new Set();
    currentSpeeldagRaces.forEach(race => {
      const raceIdNum = typeof race.id === 'string' ? parseInt(race.id) : race.id;
      let raceIdToCheck = raceIdNum;
      if (race.tourId != null) {
        raceIdToCheck = typeof race.tourId === 'string' ? parseInt(race.tourId) : race.tourId;
      }
      const raceTeamData = userRaceTeams[raceIdToCheck];
      if (raceTeamData && raceTeamData.riderIds) {
        raceTeamData.riderIds.forEach(riderId => selectedRiderIds.add(riderId));
      }
    });
    
    // Find riders who are NOT selected but have points
    return teamDetails.riders
      .filter(rider => !selectedRiderIds.has(rider.id))
      .map(rider => {
        const riderSpeeldagPoints = currentSpeeldagRaces.reduce((sum, race) => {
          const raceIdNum = typeof race.id === 'string' ? parseInt(race.id) : race.id;
          const raceResult = results.find(r => r.raceId === raceIdNum);
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
  }, [teamDetails.riders, teamDetails.isVirtual, currentSpeeldagRaces, results, userRaceTeams]);

  // Get riders that are selected for current speeldag (with or without points)
  const ridersSelectedForSpeeldag = useMemo(() => {
    if (!teamDetails.riders || teamDetails.riders.length === 0) return [];
    if (currentSpeeldagRaces.length === 0) return [];
    
    // For virtual teams, all riders are "selected"
    if (teamDetails.isVirtual) {
      return teamDetails.riders
        .map(rider => {
          const riderSpeeldagPoints = currentSpeeldagRaces.reduce((sum, race) => {
            const raceIdNum = typeof race.id === 'string' ? parseInt(race.id) : race.id;
            const raceIdStr = String(raceIdNum);
            const raceResult = results.find(r => r.raceId === raceIdNum);
            if (raceResult && raceResult.entries) {
              const entry = raceResult.entries.find(e => e.riderId === rider.id);
              if (entry) {
                const entryPoints = entry.points || 0;
                const raceLeaderBonus = riderRaceLeaderPoints[`${rider.id}-${raceIdStr}`] || 0;
                return sum + entryPoints + raceLeaderBonus;
              }
            }
            return sum;
          }, 0);
          return { ...rider, points: riderSpeeldagPoints };
        })
        .sort((a, b) => b.points - a.points);
    }
    
    // Collect all rider IDs selected for this speeldag
    // For stages, use the main tour selection; for main races, use their own selection
    const selectedRiderIds = new Set();
    currentSpeeldagRaces.forEach(race => {
      const raceIdNum = typeof race.id === 'string' ? parseInt(race.id) : race.id;
      let raceIdToCheck = raceIdNum;
      
      // If this is a stage, use the main tour selection
      if (race.tourId != null) {
        raceIdToCheck = typeof race.tourId === 'string' ? parseInt(race.tourId) : race.tourId;
      }
      
      const raceTeamData = userRaceTeams[raceIdToCheck];
      if (raceTeamData && raceTeamData.riderIds) {
        raceTeamData.riderIds.forEach(riderId => selectedRiderIds.add(riderId));
      }
    });
    
    // Filter team riders to only those selected for this speeldag
    return teamDetails.riders
      .filter(rider => selectedRiderIds.has(rider.id))
      .map(rider => {
        const riderSpeeldagPoints = currentSpeeldagRaces.reduce((sum, race) => {
          const raceIdNum = typeof race.id === 'string' ? parseInt(race.id) : race.id;
          const raceIdStr = String(raceIdNum);
          const raceResult = results.find(r => r.raceId === raceIdNum);
          if (raceResult && raceResult.entries) {
            const entry = raceResult.entries.find(e => e.riderId === rider.id);
            const entryPoints = entry?.points || 0;
            const raceLeaderBonus = riderRaceLeaderPoints[`${rider.id}-${raceIdStr}`] || 0;
            return sum + entryPoints + raceLeaderBonus;
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
  }, [teamDetails.riders, currentSpeeldagRaces, results, userRaceTeams, riderRaceLeaderPoints]);

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
        <div className="header-top">
          <button 
            className="btn-back" 
            onClick={handleCloseDetails}
            title="Terug naar Rankings (of druk ESC)"
          >
            ← Terug naar Rankings
          </button>
        </div>

        {/* Speeldag selector - fixed at top for easy navigation */}
        {sortedDates.length > 0 && (
          <div className="speeldag-selector">
            <div className="speeldag-controls">
              <button 
                onClick={() => setClosestDateIndex(Math.max(0, closestDateIndex - 1))}
                disabled={closestDateIndex === 0}
                className="speeldag-nav-btn"
              >
                ← Vorige
              </button>
              
              <div className="speeldag-info">
                <span className="speeldag-label">Speeldag: {closestDateIndex + 1} / {sortedDates.length}</span>
                <span className="speeldag-date">{new Date(sortedDates[closestDateIndex]).toLocaleDateString('nl-NL', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                <span className="speeldag-points">Punten deze speeldag: <strong>{speeldagPoints}</strong></span>
              </div>
              
              <button 
                onClick={() => setClosestDateIndex(Math.min(sortedDates.length - 1, closestDateIndex + 1))}
                disabled={closestDateIndex === sortedDates.length - 1}
                className="speeldag-nav-btn"
              >
                Volgende →
              </button>
            </div>
          </div>
        )}
      </div>
      
      <div className="team-details">
        <h2>Team Details</h2>
        <div className="team-info">
          <p><strong>Team:</strong> {getUserName(teamDetails.id)}</p>
          <p><strong>Totale Punten:</strong> <span className="team-points">{teamPoints}</span></p>
        </div>

        {/* Renners in dit team */}
        <div className="team-riders">
          <h3>Renners in dit team:</h3>
          {teamDetails.riders && teamDetails.riders.length > 0 ? (
            <div className="riders-grid">
              {teamDetails.riders
                .map(rider => {
                  // Collect all selected riders for this speeldag
                  const selectedRiderIds = new Set();
                  currentSpeeldagRaces.forEach(race => {
                    const raceIdNum = typeof race.id === 'string' ? parseInt(race.id) : race.id;
                    // Selections are stored at tour ID for stages
                    let raceIdForSelection = raceIdNum;
                    if (race.tourId != null) {
                      raceIdForSelection = typeof race.tourId === 'string' ? parseInt(race.tourId) : race.tourId;
                    }
                    const raceTeamData = userRaceTeams[raceIdForSelection];
                    if (raceTeamData && raceTeamData.riderIds) {
                      raceTeamData.riderIds.forEach(riderId => selectedRiderIds.add(riderId));
                    }
                  });
                  
                  const isSelectedForThisSpeeldag = selectedRiderIds.has(rider.id);
                  
                  // Calculate speeldag points
                  let riderAllSpeeldagPoints = 0;
                  
                  if (teamDetails.isVirtual) {
                    // For virtual teams, get points from race results directly
                    riderAllSpeeldagPoints = currentSpeeldagRaces.reduce((sum, race) => {
                      const raceIdNum = typeof race.id === 'string' ? parseInt(race.id) : race.id;
                      const raceIdStr = String(raceIdNum);
                      const raceResult = results.find(r => r.raceId === raceIdNum);
                      if (raceResult && raceResult.entries) {
                        const entry = raceResult.entries.find(e => e.riderId === rider.id);
                        if (entry) {
                          const entryPoints = entry.points || 0;
                          const raceLeaderBonus = riderRaceLeaderPoints[`${rider.id}-${raceIdStr}`] || 0;
                          return sum + entryPoints + raceLeaderBonus;
                        }
                      }
                      return sum;
                    }, 0);
                  } else {
                    // For normal teams, get pre-calculated points
                    riderAllSpeeldagPoints = currentSpeeldagRaces.reduce((sum, race) => {
                      const raceIdNum = typeof race.id === 'string' ? parseInt(race.id) : race.id;
                      const raceTeamData = userRaceTeams[raceIdNum];
                      if (raceTeamData && raceTeamData.riderPoints && raceTeamData.riderPoints[rider.id]) {
                        return sum + raceTeamData.riderPoints[rider.id];
                      }
                      return sum;
                    }, 0);
                  }

                  return {
                    ...rider,
                    speeldagPoints: riderAllSpeeldagPoints,
                    isSelected: isSelectedForThisSpeeldag || teamDetails.isVirtual // For virtual teams, all riders are "selected"
                  };
                })
                .sort((a, b) => {
                  // First sort: selected riders before non-selected
                  if (a.isSelected !== b.isSelected) {
                    return a.isSelected ? -1 : 1; // selected (true) comes first
                  }
                  // Then sort by speeldag points descending
                  if (a.speeldagPoints !== b.speeldagPoints) {
                    return b.speeldagPoints - a.speeldagPoints;
                  }
                  // Then by price descending
                  return b.price - a.price;
                })
                .map(rider => {
                  return (
                    <div 
                      key={rider.id} 
                      className={`rider-card ${rider.isSelected ? 'rider-card-selected-speeldag' : 'rider-card-not-selected-speeldag'}`}
                      onClick={() => viewRiderResults(rider.id, getRiderName(rider))}
                      style={{ cursor: 'pointer' }}
                      title="Klik voor race resultaten"
                    >
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
                          <p className="rider-points-total">Speeldag: <strong>{rider.speeldagPoints}</strong> pts</p>
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

      {selectedRiderResults && (
        <div className="modal-overlay" onClick={() => setSelectedRiderResults(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Race Resultaten - {selectedRiderResults.riderName}</h3>
              <button className="btn-close" onClick={() => setSelectedRiderResults(null)}>✕</button>
            </div>

            <div className="modal-body">
              {riderResultsLoading ? (
                <p>⏳ Resultaten laden...</p>
              ) : selectedRiderResults.results.length === 0 ? (
                <p>Geen race resultaten beschikbaar</p>
              ) : (
                <table className="results-table">
                  <thead>
                    <tr>
                      <th>Race</th>
                      <th>Punten</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRiderResults.results.map((result) => (
                      <React.Fragment key={result.raceId}>
                        {result.points > 0 && (
                          <tr>
                            <td>{getRaceName(result.raceId)}</td>
                            <td className="points-cell">{result.points}</td>
                          </tr>
                        )}
                        {result.raceLeaderPoints && result.raceLeaderPoints > 0 && (
                          <tr key={`${result.raceId}-leader`} className="race-leader-points-row">
                            <td className="race-leader-label">Race Leader - {result.raceName}</td>
                            <td className="points-cell race-leader-points">{result.raceLeaderPoints}</td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="total-row">
                      <td><strong>Totaal</strong></td>
                      <td className="points-cell"><strong>{selectedRiderResults.results.reduce((sum, r) => sum + (Number(r.points) || 0) + (Number(r.raceLeaderPoints) || 0), 0)}</strong></td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
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
