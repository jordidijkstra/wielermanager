import { useState } from 'react';
import { autoFillRaceTeamsLocal } from '../services/autoFillService';
import '../css/adminTools.css';

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
    </div>
  );
}
