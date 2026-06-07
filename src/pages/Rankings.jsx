import { useState, useEffect, useMemo } from 'react';
import { useRaces } from '../hooks/useRaces';
import { useResults } from '../hooks/useResults';
import { useCyclingTeams } from '../hooks/useCyclingTeams';
import { useRankingsData } from '../hooks/useRankingsData';
import TeamDetails from '../features/team/TeamDetails';
import '../css/rankings.css';

export default function Rankings({ user, resetTrigger }) {
  const { races } = useRaces(user);
  const { results } = useResults();
  const { teams } = useCyclingTeams();
  
  const { 
    allTeams, 
    allUsers,
    allUserRaceTeams, 
    allRiders, 
    loading, 
    error 
  } = useRankingsData(resetTrigger);

  const [teamDetails, setTeamDetails] = useState(null);
  
  // Calculate best possible team locally to ensure budget constraints
  const bestTeamCalculated = useMemo(() => {
    if (!allRiders.length) return null;

    const BUDGET = 300000000; // 300 miljoen
    const MIN_RIDERS = 14;
    const MAX_RIDERS = 30;

    // Filter riders with price and points, sort by points descending
    // Note: ensure rider point properties are valid numbers
    const availableRiders = allRiders
      .filter(rider => rider.price && (rider.points || rider.totalPoints))
      .map(rider => ({
        ...rider,
        points: rider.points || rider.totalPoints || 0 // normalize points property
      }))
      .sort((a, b) => b.points - a.points); // Meeste punten eerst

    // Greedy selectie: voeg renners toe naar aantal punten, zolang we onder budget blijven
    let team = [];
    let ignoredRiderIds = new Set();
    
    // Helper to calculate current cost
    const getCost = (t) => t.reduce((sum, r) => sum + (r.price || 0), 0);

    // Loop to ensure we get a valid team (MIN_RIDERS constraint) within budget
    let iterations = 0;
    const MAX_ITERATIONS = 100; // safety break

    while (iterations < MAX_ITERATIONS) {
      iterations++;
      
      // 1. Try to fill team
      for (const rider of availableRiders) {
        if (team.some(t => t.id === rider.id) || ignoredRiderIds.has(rider.id)) continue;
        
        const currentCost = getCost(team);
        const riderCost = rider.price || 0;
        
        if (currentCost + riderCost <= BUDGET && team.length < MAX_RIDERS) {
          team.push(rider);
        }
      }
      
      // 2. Check constraints
      if (team.length >= MIN_RIDERS) {
        break; // Success
      }
      
      if (team.length === 0) {
        break; // Impossible
      }
      
      // 3. Remove most expensive to make space
      const sortedByPrice = [...team].sort((a, b) => {
        const priceDiff = (b.price || 0) - (a.price || 0);
        if (priceDiff !== 0) return priceDiff;
        return (a.points || 0) - (b.points || 0);
      });
      
      const mostExpensive = sortedByPrice[0];
      
      team = team.filter(t => t.id !== mostExpensive.id);
      ignoredRiderIds.add(mostExpensive.id);
    }

    // Sort by points descending
    team.sort((a, b) => b.points - a.points);
    
    // Calculate total points
    const totalPoints = team.reduce((sum, r) => sum + r.points, 0);

    return {
      id: 'bestteam',
      isVirtual: true,
      riders: team,
      totalPoints,
      riderCount: team.length,
      totalBudget: getCost(team)
    };
  }, [allRiders]);

  // Reset team details when Rankings menu is clicked (resetTrigger changes)
  useEffect(() => {
    setTeamDetails(null);
  }, [resetTrigger]);

  // Add keyboard shortcut (ESC) to close team details
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Escape' && teamDetails) {
        handleCloseDetails();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [teamDetails]);

  // Helper: Get races for current speeldag (closest date)
  const getCurrentSpeeldagRaces = () => {
    if (!races || races.length === 0) return [];
    
    // Group races by date (same as TeamDetails logic)
    const grouped = {};
    races.forEach(race => {
      // Use endDate for main races, startDate for stages
      const date = race.tourId == null 
        ? (race.endDate || race.startDate) 
        : (race.startDate || 'onbekend');
        
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(race);
    });

    const dates = Object.keys(grouped).sort();
    if (dates.length === 0) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find the closest date index
    let closestIdx = 0;
    let minDiff = Infinity;

    dates.forEach((dateStr, idx) => {
      const dateObj = new Date(dateStr);
      const diff = Math.abs(dateObj - today);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });
    
    const targetDate = dates[closestIdx];
    return grouped[targetDate] || [];
  };

  const currentSpeeldagRaces = getCurrentSpeeldagRaces();

  // Calculate speeldag points for a team
  const calculateSpeeldagPoints = (team) => {
    // 1. Virtual Team (Best Team)
    if (team.isVirtual || team.id === 'bestteam') {
      if (!team.riders || team.riders.length === 0) return 0;
      
      // Sum points from results for current speeldag races
      let speeldagTotal = 0;
      
      currentSpeeldagRaces.forEach(race => {
        // Find result for this race
        const raceResult = results.find(r => r.raceId === race.id);
        if (raceResult && raceResult.entries) {
          team.riders.forEach(rider => {
            const entry = raceResult.entries.find(e => e.riderId === rider.id);
            if (entry) {
              speeldagTotal += (entry.points || 0);
            }
          });
        }
      });
      
      return speeldagTotal;
    }
    
    // 2. Normal Team (User)
    let speeldagTotal = 0;
    const userId = team.id;
    const userTeams = allUserRaceTeams[userId] || {};

    currentSpeeldagRaces.forEach(race => {
      const raceId = race.id;
      // Selections are stored at tour ID for stages, points calculation is usually per raceId but let's check structure
      // userTeams is map of raceId -> calculatedPoints.
      // If userTeams stores points per raceId, we just sum them.
      
      const raceData = userTeams[raceId];
      if (raceData && raceData.calculatedPoints) {
        speeldagTotal += raceData.calculatedPoints;
      }
    });

    return speeldagTotal;
  };

  // Calculate total points for a team (memoized)
  // Using pre-calculated points from Cloud Function for normal teams
  // For virtual teams, sum points from all riders
  const calculateTeamPoints = (team) => {
    // Special handling for virtual teams (bestteam)
    if (team.isVirtual || team.id === 'bestteam') {
      if (!team.riders || team.riders.length === 0) return 0;
      // Sum all points from all riders in the virtual team
      return team.riders.reduce((total, rider) => {
        return total + (rider.totalPoints || 0);
      }, 0);
    }
    
    // For normal teams, use pre-calculated points from Cloud Function
    let totalPoints = 0;
    const userId = team.id;
    const userTeams = allUserRaceTeams[userId] || {};

    // Sum all pre-calculated points from each race
    Object.values(userTeams).forEach(raceData => {
      if (raceData && raceData.calculatedPoints) {
        totalPoints += raceData.calculatedPoints;
      }
    });

    return totalPoints;
  };

  // Rankings table view (memoized)
  // Only user teams sorted by points, bestteam added at end without ranking
  const rankedTeams = (() => {
    // Current speeldag races for points calc
    const speeldagRaces = getCurrentSpeeldagRaces();

    const calculateSpeeldagPoints = (team) => {
      // 1. Virtual Team (Best Team)
      if (team.isVirtual || team.id === 'bestteam') {
        if (!team.riders || team.riders.length === 0) return 0;
        
        let speeldagTotal = 0;
        
        speeldagRaces.forEach(race => {
          // Find result for this race
          const raceIdNum = typeof race.id === 'string' ? parseInt(race.id) : race.id;
          const raceResult = results && results.find(r => r.raceId === raceIdNum);
          if (raceResult && raceResult.entries) {
            team.riders.forEach(rider => {
              const entry = raceResult.entries.find(e => e.riderId === rider.id);
              if (entry) {
                speeldagTotal += (entry.points || 0);
              }
            });
          }
        });
        
        return speeldagTotal;
      }
      
      // 2. Normal Team (User)
      let speeldagTotal = 0;
      const userId = team.id;
      const userTeamsData = allUserRaceTeams[userId] || {};
  
      speeldagRaces.forEach(race => {
        const raceIdNum = typeof race.id === 'string' ? parseInt(race.id) : race.id;
        const raceData = userTeamsData[raceIdNum];
        if (raceData && raceData.calculatedPoints) {
          speeldagTotal += raceData.calculatedPoints;
        }
      });
  
      return speeldagTotal;
    };

    const userTeams = allTeams
      .filter(team => team.id !== 'bestteam')
      .map(team => ({
        ...team,
        totalPoints: calculateTeamPoints(team),
        speeldagPoints: calculateSpeeldagPoints(team)
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints);
    
    // Add bestteam at the end with data from local calculation (to ensure validity)
    if (bestTeamCalculated && bestTeamCalculated.riders && bestTeamCalculated.riders.length > 0) {
      // Use local calculation as it respects budget constraint
      const bestTeam = {
        ...bestTeamCalculated,
        // Ensure points match the calculated sum
        totalPoints: bestTeamCalculated.totalPoints || 0
      };
      // Calculate speeldag points for best team
      bestTeam.speeldagPoints = calculateSpeeldagPoints(bestTeam);
      
      userTeams.push(bestTeam);
    }
    
    return userTeams;
  })();

  // Get best team from stored metadata or local calc
  const getBestTeam = () => {
    if (bestTeamCalculated) {
      return bestTeamCalculated;
    }
    // Fallback if not yet calculated
    return {
      id: 'bestteam',
      isVirtual: true,
      totalPoints: 0,
      riderCount: 0,
      totalBudget: 0,
      riders: []
    };
  };

  const getRiderName = (rider) => {
    return `${rider.firstname} ${rider.lastname}`;
  };

  const getCyclingJerseyPath = (teamId) => {
    const team = teams?.find(t => t.id === teamId);
    return team?.cyclingKit
      ? `/assets/${team.cyclingKit}`
      : '/assets/default.webp';
  };

  const getUserName = (userId) => {
    // Handle virtual teams
    if (userId === 'best-team') {
      return 'Virtual Manager';
    }
    
    const userData = allUsers.find(u => u.id === userId);
    if (userData) {
      return userData.firstname && userData.lastname 
        ? `${userData.firstname} ${userData.lastname}`
        : userId;
    }
    console.warn('❌ User not found:', userId, 'Available users:', allUsers.map(u => u.id));
    return userId; // Fallback to user ID if user not found
  };

  const getTeamDisplayName = (userId) => {
    // Handle virtual teams
    if (userId === 'best-team') {
      return 'Ultimate Team';
    }
    
    const userData = allUsers.find(u => u.id === userId);
    if (userData) {
      // Als teamnaam is ingesteld, toon die; anders toon voornaam en achternaam
      if (userData.teamName && userData.teamName.trim()) {
        return userData.teamName;
      }
      return userData.firstname && userData.lastname 
        ? `${userData.firstname} ${userData.lastname}`
        : userId;
    }
    return userId; // Fallback to user ID if user not found
  };

  const isTeamCreationDeadlinePassed = () => {
    // Check if all races deadlines have passed
    // For each race, check if both the standard deadline AND any user-specific deadlines have passed
    if (races.length === 0) return false;
    
    // For now, use a simple check: show message if current time is before first race
    // In a production system, you might want to check if ANY user can still submit
    const now = new Date();
    const firstRace = races[0];
    
    if (!firstRace || !firstRace.startDate) return false;
    
    // Deadline is race day at 09:00
    const deadline = new Date(firstRace.startDate);
    deadline.setHours(9, 0, 0, 0);
    
    return now > deadline;
  };

  const handleTeamClick = (team) => {
    // Pass both the team and the user ID
    setTeamDetails({ ...team, userId: team.id });
  };

  const handleCloseDetails = () => {
    setTeamDetails(null);
  };

  // Render loading state
  if (loading) {
    return (
      <div className="rankings">
        <h1>Rankings</h1>
        <p className="loading-message">Teams laden...</p>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="rankings">
        <h1>Rankings</h1>
        <p className="error-message">{error}</p>
      </div>
    );
  }

  // Render team details view
  if (teamDetails) {
    return (
      <TeamDetails
        teamDetails={teamDetails}
        calculateTeamPoints={calculateTeamPoints}
        races={races}
        results={results}
        getRiderName={getRiderName}
        getCyclingJerseyPath={getCyclingJerseyPath}
        getUserName={getUserName}
        handleCloseDetails={handleCloseDetails}
      />
    );
  }

  return (
    <div className="rankings">
      <h1>Rankings</h1>

      {rankedTeams.length === 0 ? (
        <p className="no-teams-message">Geen teams gevonden</p>
      ) : (
        <div className="rankings-table-container">
          <table className="rankings-table">
            <thead>
              <tr>
                <th className="rank">Plaats</th>
                <th className="team-name">Ploeg</th>
                <th className="points">Speeldag punten</th>
                <th className="points">Punten</th>
                <th className="action"></th>
              </tr>
            </thead>
            <tbody>
              {/* User teams and best team */}
              {rankedTeams.map((team, index) => (
                <tr 
                  key={team.id} 
                  className={`team-row ${team.id === 'bestteam' ? 'best-team-row' : ''}`}
                >
                  <td className="rank">
                    {team.id === 'bestteam' ? '🏆' : index + 1}
                  </td>
                  <td className="team-name">
                    <div className="team-info-cell">
                      <div className="team-name-display">
                        {team.id === 'bestteam' ? '🏆 Ultimate Team' : getTeamDisplayName(team.id)}
                      </div>
                      {team.id !== 'bestteam' && (
                        <div className="manager-name-display">{getUserName(team.id)}</div>
                      )}
                    </div>
                  </td>
                  <td className="points">
                    <span className="speeldag-points-rankings">{team.speeldagPoints || 0}</span>
                  </td>
                  <td className="points">
                    <span className="points-badge">{team.totalPoints}</span>
                  </td>
                  <td className="action">
                    <button 
                      className="btn-view-team"
                      onClick={() => handleTeamClick({...team, userId: team.id})}
                    >
                      Bekijk ploeg
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
