import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
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
  const [teamDetails, setTeamDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Reset team details when Rankings menu is clicked (resetTrigger changes)
  useEffect(() => {
    console.log('Resetting teamDetails due to resetTrigger:', resetTrigger);
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
        console.log('✅ Loaded users:', usersData.length, usersData.map(u => ({id: u.id, name: `${u.firstname} ${u.lastname}`, role: u.role})));
        setAllUsers(usersData);
        
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
        console.log('ESC toets ingedrukt, terug naar rankings');
        handleCloseDetails();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [teamDetails]);

  // Calculate total points for a team (memoized)
  const calculateTeamPoints = useCallback((team) => {
    let totalPoints = 0;

    // Iterate through all races
    races.forEach(race => {
      const raceResult = results.find(r => r.raceId === race.id);
      if (raceResult && raceResult.entries) {
        // Check if any rider from the team earned points in this race
        raceResult.entries.forEach(entry => {
          if (team.riders && team.riders.some(r => r.id === entry.riderId)) {
            totalPoints += entry.points || 0;
          }
        });
      }
    });

    return totalPoints;
  }, [races, results]);

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
    console.log('👤 getTeamDisplayName for:', userId, '- Found:', !!userData, '- User data:', userData);
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
    // Check if first race has passed (deadline is day before race start at 09:00)
    if (races.length === 0) return false;
    
    const firstRace = races[0];
    if (!firstRace.startDate) return false;
    
    const deadline = new Date(2026, 0, 19);
    deadline.setHours(9, 0, 0, 0);
    return new Date() > deadline;
  };

  const handleTeamClick = (team) => {
    setTeamDetails(team);
  };

  const handleCloseDetails = () => {
    console.log('Terug naar rankings geklikt');
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
