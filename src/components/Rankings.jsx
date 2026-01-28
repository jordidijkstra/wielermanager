import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, getDocs, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useRaces } from '../hooks/useRaces';
import { useResults } from '../hooks/useResults';
import { useCyclingTeams } from '../hooks/useCyclingTeams';
import { getAllUsers } from '../services/userService';
import TeamDetails from './TeamDetails';
import '../css/rankings.css';

// Simple cache for teams data
let teamsCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default function Rankings({ user, resetTrigger }) {
  const { races } = useRaces(user);
  const { results } = useResults();
  const { teams } = useCyclingTeams();
  const [allTeams, setAllTeams] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allUserRaceTeams, setAllUserRaceTeams] = useState({});
  const [teamDetails, setTeamDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Reset team details when Rankings menu is clicked (resetTrigger changes)
  useEffect(() => {
    setTeamDetails(null);
  }, [resetTrigger]);

  // Load all teams and users from Firestore (cached)
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Check if cache is still valid
        const now = Date.now();
        if (teamsCache && (now - cacheTimestamp) < CACHE_DURATION) {
          console.log('Using cached teams data');
          setAllTeams(teamsCache);
          setLoading(false);
        } else {
          console.log('Fetching teams from Firestore');
          const teamsSnapshot = await getDocs(collection(db, 'teams'));
          const teams = [];
          
          teamsSnapshot.forEach(doc => {
            teams.push({
              id: doc.id,
              ...doc.data()
            });
          });

          teamsCache = teams;
          cacheTimestamp = now;
          setAllTeams(teams);
        }
        
        // Load all users
        const usersData = await getAllUsers();
        setAllUsers(usersData);
        
        // Load all user race teams for points calculation
        const userRaceTeamsMap = {};
        for (const userDoc of usersData) {
          const userId = userDoc.id;
          try {
            const teamsSnapshot = await getDocs(collection(db, `users/${userId}/teams`));
            const userTeams = {};
            teamsSnapshot.forEach(doc => {
              const data = doc.data();
              userTeams[parseInt(doc.id)] = {
                riderIds: data.riderIds || [],
                calculatedPoints: data.calculatedPoints || 0,
                riderPoints: data.riderPoints || {}
              };
            });
            userRaceTeamsMap[userId] = userTeams;
          } catch (err) {
            console.error(`Error loading race teams for user ${userId}:`, err);
          }
        }
        setAllUserRaceTeams(userRaceTeamsMap);
        
        setLoading(false);
      } catch (err) {
        console.error('Fout bij laden data:', err);
        setError('Kon data niet laden. Controleer je Firestore permissions.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

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

  // Calculate total points for a team (memoized)
  // Using pre-calculated points from Cloud Function
  const calculateTeamPoints = useCallback((team) => {
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
  }, [allUserRaceTeams]);

  // Rankings table view (memoized)
  const rankedTeams = useMemo(() => {
    return allTeams
      .map(team => ({
        ...team,
        totalPoints: calculateTeamPoints(team)
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints);
  }, [allTeams, calculateTeamPoints]);

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
    
    // Deadline is 1 day before first race at 09:00
    const deadline = new Date(firstRace.startDate);
    deadline.setHours(9, 0, 0, 0);
    deadline.setDate(deadline.getDate() - 1);
    
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

      {!isTeamCreationDeadlinePassed() ? (
        <p className="no-teams-message">Rankings zijn zichtbaar nadat teams ingediend zijn</p>
      ) : rankedTeams.length === 0 ? (
        <p className="no-teams-message">Geen teams gevonden</p>
      ) : (
        <div className="rankings-table-container">
          <table className="rankings-table">
            <thead>
              <tr>
                <th className="rank">Plaats</th>
                <th className="team-name">Ploeg</th>
                <th className="points">Punten</th>
                <th className="action"></th>
              </tr>
            </thead>
            <tbody>
              {rankedTeams.map((team, index) => (
                <tr key={team.id} className="team-row">
                  <td className="rank">{index + 1}</td>
                  <td className="team-name">
                    <div className="team-info-cell">
                      <div className="team-name-display">{getTeamDisplayName(team.id)}</div>
                      <div className="manager-name-display">{getUserName(team.id)}</div>
                    </div>
                  </td>
                  <td className="points">
                    <span className="points-badge">{team.totalPoints}</span>
                  </td>
                  <td className="action">
                    <button 
                      className="btn-view-team"
                      onClick={() => handleTeamClick(team)}
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
