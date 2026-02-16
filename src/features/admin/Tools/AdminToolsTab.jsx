import { useState, useEffect } from 'react';
import { autoFillRaceTeamsLocal } from '../../../services/autoFillService';
import { getAutoFillLogs } from '../../../services/systemLogsService';
import '../../../css/adminTools.css';

export default function AdminToolsTab() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState(null);
  const [scheduledLogs, setScheduledLogs] = useState(null);
  const [logsLoading, setLogsLoading] = useState(true);

  useEffect(() => {
    loadScheduledLogs();
  }, []);

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
