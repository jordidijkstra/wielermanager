import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { getAllRaces, getRaceParticipants } from '../../../services/raceService';
import { autoFillRaceTeamsLocal } from '../../../services/autoFillService';
import { getAutoFillLogs } from '../../../services/systemLogsService';
import '../../../css/adminTools.css';

export default function AdminToolsTab() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState(null);
  const [scheduledLogs, setScheduledLogs] = useState(null);
  const [logsLoading, setLogsLoading] = useState(true);
  
  // State for startlist availability check
  const [upcomingRaces, setUpcomingRaces] = useState([]);
  const [selectedRaceId, setSelectedRaceId] = useState('');
  const [availabilityResults, setAvailabilityResults] = useState(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);

const [showAllUsers, setShowAllUsers] = useState(false);

  useEffect(() => {
    loadScheduledLogs();
    loadRelevantRaces();
  }, []);

  const loadRelevantRaces = async () => {
    try {
      const allRaces = await getAllRaces();
      const now = new Date();
      
      // 1. Filter out stages and sort by date
      const validRaces = allRaces
        .filter(r => r.tourId === null || r.tourId === undefined)
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

      if (validRaces.length === 0) return;

      // 2. Find the index of the first future race
      const nextRaceIndex = validRaces.findIndex(r => new Date(r.startDate) > now);
      
      let relevantRaces = [];

      if (nextRaceIndex === -1) {
        // No future races -> End of season? 
        // Take the last batch of races
        const lastRace = validRaces[validRaces.length - 1];
        const lastDate = new Date(lastRace.startDate).toDateString();
        relevantRaces = validRaces.filter(r => new Date(r.startDate).toDateString() === lastDate);
      } else {
        // We have a future race at `nextRaceIndex`
        const nextRace = validRaces[nextRaceIndex];
        const nextDate = new Date(nextRace.startDate).toDateString();
        
        // Find ALL future races sharing this same START DATE
        const futureBatch = validRaces.filter(r => new Date(r.startDate).toDateString() === nextDate);
        
        // Start with the future ones
        relevantRaces = [...futureBatch];

        // 3. ALSO include the most recent past race batch (if exists)
        if (nextRaceIndex > 0) {
          const prevRace = validRaces[nextRaceIndex - 1];
          const prevDate = new Date(prevRace.startDate).toDateString();
          const pastBatch = validRaces.filter(r => new Date(r.startDate).toDateString() === prevDate);
          
          // Add past races to the list
          // Combined: [Past ... Future]
          relevantRaces = [...pastBatch, ...relevantRaces].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        }
      }

      setUpcomingRaces(relevantRaces);

      // Default selection logic:
      if (relevantRaces.length > 0) {
        // Preference: The nearest future race. If none, the last past race.
        const firstFuture = relevantRaces.find(r => new Date(r.startDate) > now);
        
        if (firstFuture) {
           setSelectedRaceId(firstFuture.id);
        } else {
           // If everything is in the past, pick the last one
           setSelectedRaceId(relevantRaces[relevantRaces.length - 1].id);
        }
      }
    } catch (err) {
      console.error('Error loading races:', err);
    }
  };

  const loadScheduledLogs = async () => {
    try {
      setLogsLoading(true);
      const logs = await getAutoFillLogs();
      setScheduledLogs(logs);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLogsLoading(false);
    }
  };

  const checkAvailability = async () => {
    if (!selectedRaceId || upcomingRaces.length === 0) {
      alert('Geen komende race gevonden');
      return;
    }

    setIsCheckingAvailability(true);
    setAvailabilityResults(null);

    try {
      // 1. Get the race details to know max riders
      // Convert both IDs to strings for robust comparison
      const race = upcomingRaces.find(r => String(r.id) === String(selectedRaceId));
      if (!race) {
        throw new Error(`Race niet gevonden (ID: ${selectedRaceId})`);
      }

      const maxRiders = race.maxRiders || 7; // Default to 7 like in RaceTeamSelector (was 99 which is too high)

      // 2. Get race participants (start list)
      const participants = await getRaceParticipants(selectedRaceId);
      console.log(`Race participants fetched for ${selectedRaceId}: ${participants ? participants.length : 'NULL'}`);
      
      const participantIds = new Set();
      if (participants && Array.isArray(participants)) {
        participants.forEach(p => {
          // Use riderId if available, otherwise id
          const id = p.riderId || p.id;
          if (id) participantIds.add(Number(id)); // Ensure number for consistency
        });
      }

      if (participantIds.size === 0) {
        alert('Let op: Geen deelnemers gevonden voor deze race. De startlijst is mogelijk nog niet ingeladen.');
      }

      // 3. Get user details (displayName, email)
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersMap = new Map();
      usersSnapshot.forEach(doc => {
        usersMap.set(doc.id, {
            displayName: doc.data().displayName || 'Onbekende Gebruiker',
            email: doc.data().email
        });
      });
      console.log(`Users fetched: ${usersMap.size}`);

      // 4. Get all teams and map to users
      const teamsSnapshot = await getDocs(collection(db, 'teams'));
      console.log(`Teams fetched: ${teamsSnapshot.size}`);
      
      const usersData = [];

      teamsSnapshot.forEach(doc => {
        const teamData = doc.data(); 
        const userId = doc.id; // Team doc ID is the userId
        const userInfo = usersMap.get(userId);

        if (userInfo && teamData.riders && Array.isArray(teamData.riders)) {
          // Extract rider IDs from the array of objects (handle both object with .id and direct ID)
          const teamIds = teamData.riders.map(r => Number(r.id || r)).filter(id => !isNaN(id));
          
          usersData.push({
            id: userId,
            displayName: userInfo.displayName,
            email: userInfo.email,
            team: teamIds
          });
        }
      });
      console.log(`Valid users with teams found: ${usersData.length}`);

      // 4. Calculate availability for each user
      const results = [];

      for (const user of usersData) {
        // Find intersection of user's team and race participants
        const availableRiders = user.team.filter(riderId => participantIds.has(riderId));
        
        // Push ALL users, but mark excess ones
        results.push({
          user: user.displayName,
          email: user.email,
          availableCount: availableRiders.length,
          maxAllowed: maxRiders,
          excess: availableRiders.length > maxRiders ? availableRiders.length - maxRiders : 0,
          isExcess: availableRiders.length > maxRiders,
          totalTeamSize: user.team.length, // Total main team size
          riderIds: availableRiders
        });
      }

      // Sort by excess count (highest first), then by available count
      results.sort((a, b) => {
        if (b.excess !== a.excess) return b.excess - a.excess;
        return b.availableCount - a.availableCount;
      });
      
      setAvailabilityResults(results);

    } catch (error) {
      console.error('Error checking availability:', error);
      alert('Error bij controleren beschikbaarheid: ' + error.message);
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  const handleAutoFill = async () => {
    if (!confirm('Dit zal automatisch race teams opvullen voor alle users zonder selectie. Weet je het zeker?')) {
      return;
    }

    setIsProcessing(true);
    setResults([]);
    setSummary(null);

    try {
      const result = await autoFillRaceTeamsLocal();
      
      setResults(result.results || []);
      setSummary({
        processedUsers: result.processedUsers,
        filledTeams: result.filledTeams,
        success: result.success
      });

      if (result.success) {
        console.log('✅ Auto-fill completed successfully');
      } else {
        console.error('❌ Auto-fill failed:', result.error);
      }
    } catch (error) {
      console.error('Error:', error);
      setResults([`Error: ${error.message}`]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="admin-tools-tab">
      <h2>Admin Tools</h2>

      <div className="tools-section">
        <h3>Race Team Auto-Fill</h3>
        <p>Vul automatisch race teams op voor alle users zonder selectie, voor races met verlopen deadlines.</p>
        
        <button 
          className="btn-admin-tool"
          onClick={handleAutoFill}
          disabled={isProcessing}
        >
          {isProcessing ? '⏳ Verwerking...' : '🚀 Auto-Fill Starten'}
        </button>
      </div>

      {summary && (
        <div className={`tools-summary ${summary.success ? 'success' : 'error'}`}>
          <h4>
            {summary.success ? '✅ Voltooid' : '❌ Fout'}
          </h4>
          <p><strong>Users verwerkt:</strong> {summary.processedUsers}</p>
          <p><strong>Race teams ingevuld:</strong> {summary.filledTeams}</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="tools-results">
          <h4>Details:</h4>
          {results.map((result, idx) => (
            <div key={idx}>
              {result}
            </div>
          ))}
        </div>
      )}

      {/* --- Check Availability Section --- */}
      <div className="tools-section">
        <h3>Startlijst Beschikbaarheid Check</h3>
        <p>
          Controleer of users te veel renners op de startlijst hebben. 
          De selectie toont de eerstvolgende race(s) en de meest recent verlopen race(s).
        </p>
        
        <div className="tool-controls">
          {upcomingRaces.length > 0 ? (
            <>
              {upcomingRaces.length === 1 ? (
                <div className="race-select-upcoming">
                  <strong>{upcomingRaces[0].name}</strong> ({new Date(upcomingRaces[0].startDate).toLocaleDateString()})
                </div>
              ) : (
                <select 
                  value={selectedRaceId} 
                  onChange={(e) => setSelectedRaceId(e.target.value)}
                  className="race-select"
                >
                  {upcomingRaces.map(race => {
                    const isFuture = new Date(race.startDate) > new Date();
                    const marker = isFuture ? '🔜' : '⏮️';
                    return (
                      <option key={race.id} value={race.id}>
                        {marker} {race.name} ({new Date(race.startDate).toLocaleDateString()})
                      </option>
                    );
                  })}
                </select>
              )}

              <button 
                className="btn-admin-tool"
                onClick={checkAvailability}
                disabled={isCheckingAvailability}
              >
                {isCheckingAvailability ? '🔍 Controleren...' : '⚠️ Check Beschikbaarheid'}
              </button>

              {availabilityResults && (
                <div className="filter-controls">
                  <label>
                    <input 
                      type="checkbox" 
                      checked={showAllUsers} 
                      onChange={(e) => setShowAllUsers(e.target.checked)} 
                    />
                    Toon alle users (ook zonder problemen)
                  </label>
                </div>
              )}
            </>
          ) : (
             <p className="no-race-msg">Geen komende races gevonden.</p>
          )}
        </div>

        {availabilityResults && (
          <div className="availability-results">
            {availabilityResults.length === 0 ? (
              <p className="success-msg">⚠️ Geen users gevonden in de database.</p>
            ) : (
              <div>
                <h4>
                  {availabilityResults.filter(r => r.isExcess).length} Users met te veel actieve renners
                  {showAllUsers && ` (Totaal: ${availabilityResults.length} users)`}
                </h4>

                {!showAllUsers && availabilityResults.filter(r => r.isExcess).length === 0 && (
                  <p className="success-msg" style={{marginBottom: '10px'}}>
                    ✅ Iedereen zit binnen de limiet! Vink "Toon alle users" aan om details te zien.
                  </p>
                )}

                <div className="excess-table-container">
                  <table className="excess-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Email</th>
                        <th>Main Team</th>
                        <th>Op Startlijst</th>
                        <th>Max</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {availabilityResults
                        .filter(res => showAllUsers || res.isExcess)
                        .map((res, idx) => (
                        <tr key={idx} className={res.isExcess ? 'row-excess' : 'row-ok'}>
                          <td>{res.user}</td>
                          <td>{res.email}</td>
                          <td>{res.totalTeamSize}</td>
                          <td className="bold-cell">{res.availableCount}</td>
                          <td>{res.maxAllowed}</td>
                          <td className={res.isExcess ? 'excess-count' : 'ok-count'}>
                            {res.isExcess ? `+${res.excess} te veel` : '✅ OK'}
                          </td>
                        </tr>
                      ))}
                      {availabilityResults.filter(res => showAllUsers || res.isExcess).length === 0 && (
                         <tr>
                           <td colSpan="6" style={{textAlign: 'center', padding: '20px', color: '#666'}}>
                             Geen users om weer te geven met de huidige filters.
                           </td>
                         </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="tools-section">
        <h3>Geplande Auto-Fill Logs</h3>
        {logsLoading ? (
          <p>⏳ Logs laden...</p>
        ) : scheduledLogs ? (
          <div className="scheduled-logs">
            <div className="log-info">
              <p><strong>Status:</strong> {scheduledLogs.status}</p>
              <p><strong>Laatste uitvoering:</strong> {new Date(scheduledLogs.lastRun).toLocaleString('nl-NL')}</p>
              <p><strong>Uitvoeringstijd:</strong> {scheduledLogs.executionTime}ms</p>
              <p><strong>Users verwerkt:</strong> {scheduledLogs.processedUsers || 0}</p>
              <p><strong>Race teams ingevuld:</strong> {scheduledLogs.filledTeams || 0}</p>
            </div>
            
            {scheduledLogs.logs && scheduledLogs.logs.length > 0 && (
              <div className="log-details">
                <h4>Logberichten:</h4>
                <div className="log-list">
                  {scheduledLogs.logs.map((log, idx) => (
                    <div key={idx} className="log-entry">
                      <span className="log-time">
                        {new Date(log.timestamp).toLocaleTimeString('nl-NL')}
                      </span>
                      <span className="log-message">{log.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {scheduledLogs.error && (
              <div className="log-error">
                <strong>Fout:</strong> {scheduledLogs.error}
              </div>
            )}

            <button 
              className="btn-admin-tool"
              onClick={loadScheduledLogs}
            >
              🔄 Logs verversen
            </button>
          </div>
        ) : (
          <p>Geen logs beschikbaar. De geplande taak is nog niet uitgevoerd.</p>
        )}
      </div>
    </div>
  );
}
