import { useState } from 'react';
import { autoFillRaceTeamsLocal } from '../services/autoFillService';

export default function AdminToolsTab() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState(null);

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
          style={{
            padding: '10px 20px',
            backgroundColor: isProcessing ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          {isProcessing ? '⏳ Verwerking...' : '🚀 Auto-Fill Starten'}
        </button>
      </div>

      {summary && (
        <div className="tools-summary" style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: summary.success ? '#e8f5e9' : '#ffebee',
          border: `2px solid ${summary.success ? '#4CAF50' : '#f44336'}`,
          borderRadius: '4px'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: summary.success ? '#2e7d32' : '#c62828' }}>
            {summary.success ? '✅ Voltooид' : '❌ Fout'}
          </h4>
          <p><strong>Users verwerkt:</strong> {summary.processedUsers}</p>
          <p><strong>Race teams ingevuld:</strong> {summary.filledTeams}</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="tools-results" style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#f5f5f5',
          border: '1px solid #ddd',
          borderRadius: '4px',
          maxHeight: '300px',
          overflowY: 'auto',
          fontFamily: 'monospace',
          fontSize: '12px'
        }}>
          <h4>Details:</h4>
          {results.map((result, idx) => (
            <div key={idx} style={{ marginBottom: '5px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {result}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
