import { useState, useEffect } from 'react';
import { useUserTeam } from '../hooks/useUserTeam';
import { useCyclingTeams } from '../hooks/useCyclingTeams';
import { useRaces } from '../hooks/useRaces';
import { useResults } from '../hooks/useResults';
import { getUserRaceTeams } from '../services/raceService';
import '../css/yourPoints.css';

export default function YourPoints({ user }) {
  const { selectedRiders } = useUserTeam(user, 10000000);
  const { teams } = useCyclingTeams();
  const { races } = useRaces(user);
  const { results } = useResults();
  const [userRaceTeams, setUserRaceTeams] = useState({});
  const [currentSpeeldagIndex, setCurrentSpeeldagIndex] = useState(0);
  const [showAllRacers, setShowAllRacers] = useState(false);

  // Load user's race teams
  useEffect(() => {
    const loadRaceTeams = async () => {
      if (!user) return;
      try {
        const teams = await getUserRaceTeams(user.uid);
        // Convert array to object keyed by raceId for easy lookup
        const teamsMap = {};
        teams.forEach(team => {
          teamsMap[team.raceId] = team.riderIds || [];
        });
        setUserRaceTeams(teamsMap);
      } catch (err) {
        console.error('Fout bij laden race teams:', err);
      }
    };
    loadRaceTeams();
  }, [user]);

  if (!selectedRiders || selectedRiders.length === 0) {
    return (
      <div className="your-points">
        <h1>Jouw Punten</h1>
        <p className="no-data-message">Je hebt nog geen team samengesteld</p>
      </div>
    );
  }

  const getFullName = (rider) => `${rider.firstname} ${rider.lastname}`;

  const getTeamJerseyPath = (teamId) => {
    const team = teams?.find(t => t.id === teamId);
    return team?.cyclingKit
      ? `/assets/${team.cyclingKit}`
      : '/assets/default.webp';
  };

  // Group races by speeldag (endDate for main races, startDate for stages)
  const groupRacesByDate = () => {
    const grouped = {};
    races.forEach(race => {
      if (race.name?.includes('Championship')) return; // Skip championships
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

  if (sortedDates.length === 0) {
    return (
      <div className="your-points">
        <h1>Jouw Punten</h1>
        <p className="no-data-message">Geen races beschikbaar</p>
      </div>
    );
  }

  // Get selected rider IDs for a race or tour
  const getSelectedRiderIdsForRace = (raceId, tourId = null) => {
    // If this is a stage and there's a selected team for the main tour, use that
    if (tourId != null && userRaceTeams[tourId]) {
      return userRaceTeams[tourId];
    }
    // Otherwise use the specific race team
    return userRaceTeams[raceId] || [];
  };

  // Get points for each rider from race results
  const getRiderPointsFromResults = (riderId, raceId) => {
    // Find the result for this race
    const raceResult = results.find(r => r.raceId === raceId);
    if (!raceResult || !raceResult.entries) {
      return 0;
    }
    
    // Find this rider in the result entries
    const entry = raceResult.entries.find(e => e.riderId === riderId);
    return entry ? (entry.points || 0) : 0;
  };

  const getPointsForSpeeldag = (speeldagRaces) => {
    let totalPts = 0;
    speeldagRaces.forEach(race => {
      const selectedRiderIds = getSelectedRiderIdsForRace(race.id, race.tourId);
      selectedRiderIds.forEach(riderId => {
        totalPts += getRiderPointsFromResults(riderId, race.id);
      });
    });
    return totalPts;
  };

  // Build a map of all riders to display: all team members + riders with earned points
  const getAllRidersToDisplay = (speeldagRaces) => {
    const riderMap = new Map(); // riderId -> { rider, isSelectedForSpeeldag, earnedPoints }
    
    // First, collect all selected riders FOR THIS SPEELDAG
    const speeldagSelectedRiders = new Set();
    speeldagRaces.forEach(race => {
      const selectedRiderIds = getSelectedRiderIdsForRace(race.id, race.tourId);
      selectedRiderIds.forEach(riderId => speeldagSelectedRiders.add(riderId));
    });
    
    // Add ALL team members (whole team)
    selectedRiders.forEach(rider => {
      const isSelectedForSpeeldag = speeldagSelectedRiders.has(rider.id);
      riderMap.set(rider.id, {
        riderObj: rider,
        isSelectedForSpeeldag,
        earnedPoints: 0
      });
    });
    
    // Then, add earned points info for riders (including non-team members who earned)
    speeldagRaces.forEach(race => {
      const raceResult = results.find(r => r.raceId === race.id);
      if (raceResult && raceResult.entries) {
        raceResult.entries.forEach(entry => {
          if (entry.points > 0) {
            if (riderMap.has(entry.riderId)) {
              // Update earned points for team member
              riderMap.get(entry.riderId).earnedPoints += entry.points;
            }
          }
        });
      }
    });
    
    return Array.from(riderMap.values())
      .sort((a, b) => {
        // Selected for this speeldag first
        if (a.isSelectedForSpeeldag !== b.isSelectedForSpeeldag) {
          return a.isSelectedForSpeeldag ? -1 : 1;
        }
        // Then by price (team order)
        return b.riderObj.price - a.riderObj.price;
      });
  };

  const currentSpeeldagDate = sortedDates[currentSpeeldagIndex] || sortedDates[0];
  const currentSpeeldagRaces = racesByDate[currentSpeeldagDate];
  const speeldagPoints = getPointsForSpeeldag(currentSpeeldagRaces);
  const ridersToDisplay = getAllRidersToDisplay(currentSpeeldagRaces);

  const handlePrevious = () => {
    if (currentSpeeldagIndex > 0) {
      setCurrentSpeeldagIndex(currentSpeeldagIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentSpeeldagIndex < sortedDates.length - 1) {
      setCurrentSpeeldagIndex(currentSpeeldagIndex + 1);
    }
  };

  // Calculate total points across all speeldagen
  const totalPoints = sortedDates.reduce((sum, date) => {
    return sum + getPointsForSpeeldag(racesByDate[date]);
  }, 0);

  return (
    <div className="your-points">
      <h1>Jouw Punten</h1>

      <div className="yourpoints-header">
        <h2>Totaal: {totalPoints} Punten</h2>
      </div>

      <div className="yourpoints-speeldag-container">
        <button 
          className="btn-speeldag-nav btn-prev"
          onClick={handlePrevious}
          disabled={currentSpeeldagIndex === 0}
          aria-label="Vorige speeldag"
        >
          &lt;
        </button>

        <div className="yourpoints-speeldag-section">
          <div className="speeldag-header">
            <div className="speeldag-info">
              <h3>Speeldag: {currentSpeeldagDate}</h3>
              <div className="speeldag-races">
                {currentSpeeldagRaces.map(race => (
                  <span key={race.id} className="race-badge">
                    {race.name}
                    {race.tourId != null && ' (Stage)'}
                  </span>
                ))}
              </div>
            </div>
            <div className="speeldag-points">
              <span className="label">Punten:</span>
              <span className="value">{speeldagPoints}</span>
            </div>
          </div>

          <div className="yourpoints-riders-list">
            {ridersToDisplay.length > 0 ? (
              <>
                {ridersToDisplay.map(item => {
                  const rider = item.riderObj;
                  if (!rider) return null;
                  
                  const jerseyPath = getTeamJerseyPath(rider.teamId);
                  const displayPoints = item.earnedPoints; // Toon alle punten, ook van niet-geselecteerden

                  return (
                    <div
                      key={rider.id}
                      className={`yourpoints-rider ${item.isSelectedForSpeeldag ? 'selected' : 'not-selected'}`}
                    >
                      <img
                        src={jerseyPath}
                        alt="jersey"
                        className="yourpoints-rider-jersey"
                        onError={(e) => e.target.src = '/assets/default.webp'}
                      />
                      <div className="yourpoints-rider-info">
                        <div className="yourpoints-rider-name">{getFullName(rider)}</div>
                        {!item.isSelectedForSpeeldag && (
                          <div className="yourpoints-rider-status">
                            Niet voor deze speeldag
                          </div>
                        )}
                      </div>
                      <div className="yourpoints-rider-actions">
                        <span className={`yourpoints-rider-points ${displayPoints > 0 ? 'active' : ''}`}>
                          {displayPoints} pts
                        </span>
                      </div>
                    </div>
                  );
                })}
                {ridersToDisplay.some(r => !r.isSelectedForSpeeldag) && (
                  <div className="yourpoints-legend">
                    <small>💡 Grijze renners zijn niet geselecteerd voor deze speeldag (punten tellen niet mee)</small>
                  </div>
                )}
              </>
            ) : (
              <div className="yourpoints-legend">
                <small>Geen renners in je team voor deze speeldag</small>
              </div>
            )}
          </div>
        </div>

        <button 
          className="btn-speeldag-nav btn-next"
          onClick={handleNext}
          disabled={currentSpeeldagIndex === sortedDates.length - 1}
          aria-label="Volgende speeldag"
        >
          &gt;
        </button>
      </div>

      <div className="speeldag-indicator">
        Speeldag {currentSpeeldagIndex + 1} van {sortedDates.length}
      </div>
    </div>
  );
}
