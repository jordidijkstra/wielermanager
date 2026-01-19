import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useRaces } from '../hooks/useRaces';
import { useResults } from '../hooks/useResults';
import '../css/rankings.css';

// Simple cache for teams data
let teamsCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default function Rankings({ user }) {
  const { races } = useRaces(user);
  const { results } = useResults();
  const [allTeams, setAllTeams] = useState([]);
  const [teamDetails, setTeamDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load all teams from Firestore (cached)
  useEffect(() => {
    const loadAllTeams = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Check if cache is still valid
        const now = Date.now();
        if (teamsCache && (now - cacheTimestamp) < CACHE_DURATION) {
          console.log('Using cached teams data');
          setAllTeams(teamsCache);
          setLoading(false);
          return;
        }
        
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
      } catch (err) {
        console.error('Fout bij laden teams:', err);
        setError('Kon teams niet laden. Controleer je Firestore permissions.');
      } finally {
        setLoading(false);
      }
    };

    loadAllTeams();
  }, []);

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

  const handleTeamClick = (team) => {
    setTeamDetails(team);
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
    const teamPoints = calculateTeamPoints(teamDetails);
    
    return (
      <div className="rankings">
        <button className="btn-back" onClick={handleCloseDetails}>← Terug naar Rankings</button>
        
        <div className="team-details">
          <h2>Team Details</h2>
          <div className="team-info">
            <p><strong>Team ID:</strong> {teamDetails.id}</p>
            <p><strong>Totale Budget:</strong> €{(teamDetails.totalSpent || 0).toLocaleString('nl-NL')}</p>
            <p><strong>Totale Punten:</strong> <span className="team-points">{teamPoints}</span></p>
            <p><strong>Aantal Renners:</strong> {teamDetails.riders?.length || 0}</p>
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
                          src={rider.image || '/assets/default.webp'}
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
                <th className="rank">#</th>
                <th className="team-id">Team ID</th>
                <th className="points">Punten</th>
                <th className="riders">Renners</th>
                <th className="budget">Budget</th>
                <th className="action">Bekijk</th>
              </tr>
            </thead>
            <tbody>
              {rankedTeams.map((team, index) => (
                <tr key={team.id} className="team-row">
                  <td className="rank">{index + 1}</td>
                  <td className="team-id">{team.id}</td>
                  <td className="points">
                    <span className="points-badge">{team.totalPoints}</span>
                  </td>
                  <td className="riders">{team.riders?.length || 0}</td>
                  <td className="budget">€{(team.totalSpent || 0).toLocaleString('nl-NL')}</td>
                  <td className="action">
                    <button 
                      className="btn-view-team"
                      onClick={() => handleTeamClick(team)}
                    >
                      Bekijk →
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
