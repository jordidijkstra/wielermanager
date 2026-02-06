import React from 'react';

export default function RiderResultsModal({ 
  isOpen, 
  onClose, 
  rider, 
  results, 
  loading,
  getRaceName 
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Race Resultaten - {rider?.firstname} {rider?.lastname}</h3>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {loading ? (
            <p>⏳ Resultaten laden...</p>
          ) : !results || results.length === 0 ? (
            <p>Geen race resultaten beschikbaar</p>
          ) : (
            <table className="results-table">
              <thead>
                <tr>
                  <th>Race</th>
                  <th>Punten</th>
                </tr>
              </thead>
              <tbody>
                {results.flatMap((result) => {
                  const rows = [];
                  if (result.points > 0) {
                    rows.push(
                      <tr key={`${result.raceId}-points`}>
                        <td>{result.raceName || getRaceName(result.raceId)}</td>
                        <td className="points-cell">{result.points}</td>
                      </tr>
                    );
                  }
                  if (result.raceLeaderPoints && result.raceLeaderPoints > 0) {
                    rows.push(
                      <tr key={`${result.raceId}-leader`} className="race-leader-points-row">
                        <td className="race-leader-label">Race Leader - {result.raceName || getRaceName(result.raceId)}</td>
                        <td className="points-cell race-leader-points">{result.raceLeaderPoints}</td>
                      </tr>
                    );
                  }
                  return rows;
                })}
              </tbody>
              <tfoot>
                <tr className="total-row">
                  <td><strong>Totaal</strong></td>
                  <td className="points-cell"><strong>{results.reduce((sum, r) => sum + (Number(r.points) || 0) + (Number(r.raceLeaderPoints) || 0), 0)}</strong></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
