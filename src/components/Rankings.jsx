import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, getDocs, doc, getDoc, onSnapshot } from 'firebase/firestore';
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
  const [allRiders, setAllRiders] = useState([]);
  const [bestTeamData, setBestTeamData] = useState(null);

  // Reset team details when Rankings menu is clicked (resetTrigger changes)
  useEffect(() => {
    setTeamDetails(null);
  }, [resetTrigger]);

  // Load all teams and users from Firestore (cached)
  useEffect(() => {
    // Set up real-time listener for best team data
    try {
      const bestTeamRef = doc(db, 'teams', 'bestteam');
      const unsubscribe = onSnapshot(bestTeamRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          setBestTeamData(docSnapshot.data());
          console.log('🔄 Best team data updated:', docSnapshot.data());
        }
      }, (error) => {
        console.error('Error listening to best team:', error);
      });
      
      return () => unsubscribe();
    } catch (err) {
      console.error('Fout bij setup best team listener:', err);
    }
  }, []);

  // Load other data (riders, teams, users)
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Load riders
        const ridersSnapshot = await getDocs(collection(db, 'riders'));
        const ridersData = ridersSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter(rider => rider.id !== '911' && rider.id !== 911);
        setAllRiders(ridersData);
        
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
            // Skip bestteam - it's loaded separately via real-time listener
            if (doc.id === 'bestteam') return;
            
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
  // Using pre-calculated points from Cloud Function for normal teams
  // For virtual teams, sum points from all riders
  const calculateTeamPoints = useCallback((team) => {
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
  }, [allUserRaceTeams]);

  // Rankings table view (memoized)
  // Only user teams sorted by points, bestteam added at end without ranking
  const rankedTeams = useMemo(() => {
    const userTeams = allTeams
      .filter(team => team.id !== 'bestteam')
      .map(team => ({
        ...team,
        totalPoints: calculateTeamPoints(team)
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints);
    
    // Add bestteam at the end with data from bestTeamData (real-time listener)
    if (bestTeamData && bestTeamData.riders && bestTeamData.riders.length > 0) {
      userTeams.push({
        ...bestTeamData,
        id: 'bestteam',
        isVirtual: true,
        totalPoints: bestTeamData.totalPoints || 0
      });
    }
    
    return userTeams;
  }, [allTeams, bestTeamData, calculateTeamPoints]);

  // Get best team from stored metadata (calculated by Cloud Function)
  const getBestTeam = useCallback(() => {
    if (bestTeamData) {
      return bestTeamData;
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
  }, [bestTeamData]);

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

      {rankedTeams.length === 0 ? (
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
