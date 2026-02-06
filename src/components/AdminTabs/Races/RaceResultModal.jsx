import React from 'react';
import Modal from '../../Shared/Modal';
import { normalizeText } from '../../../utils/textUtils';

export default function RaceResultModal({ 
  isOpen, 
  onClose, 
  modalData, 
  entries, 
  searchFilters, 
  openDropdowns, 
  riders, 
  dispatch, 
  onSubmit, 
  onExcelImport 
}) {
  const updateResultEntry = (index, field, value) => {
    const updated = [...entries];
    updated[index] = { 
      ...updated[index], 
      [field]: field === 'riderId' ? (value ? parseInt(value) : null) : parseInt(value) || 0 
    };
    dispatch({ type: 'SET_RESULT_ENTRIES', payload: updated });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalData?.type === 'existing' ? 'Resultaat beschikbaar' : 'Resultaten invoeren'}
      footer={
        modalData?.type === 'existing' ? (
          <button 
            onClick={onClose}
            className="result-modal-close-btn"
            style={{ padding: '8px 16px', background: '#333', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
          >
            Sluiten
          </button>
        ) : (
          <>
            <button 
              onClick={onClose}
              className="result-modal-cancel-btn"
            >
              Annuleren
            </button>
            <button 
              onClick={onSubmit}
              className="result-modal-save-btn"
            >
              Opslaan
            </button>
          </>
        )
      }
    >
      {modalData?.type === 'existing' && (
        <>
          <p>Deze race heeft al een resultaat in het systeem.</p>
          <p className="result-modal-message">
            Ga naar het <strong>Resultaten</strong> tabblad om de details te bekijken en te beheren.
          </p>
        </>
      )}

      {modalData?.type === 'form' && (
        <>
          <p className="result-modal-info">
            Race ID: <strong>{modalData.raceId}</strong> | Invoervelden: <strong>{modalData.pointsCount}</strong>
          </p>

          <div className="excel-import-section">
            <label className="excel-import-label">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={onExcelImport}
              />
              <span className="excel-import-button">
                📊 Excel importeren
              </span>
              <span className="excel-import-hint">(Kolom A: Positie, B: Achternaam en Voornaam)</span>
            </label>
          </div>

          <div>
            <table className="result-entry-table">
              <thead>
                <tr>
                  <th>Positie</th>
                  <th>Renner</th>
                  <th>Punten</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, idx) => {
                  const searchTerm = searchFilters[idx] || '';
                  const normalizedSearch = normalizeText(searchTerm);
                  const filteredRiders = riders.filter(rider => {
                    const riderFullName = `${rider.firstnameWithoutSpecialChars || ''} ${rider.lastnameWithoutSpecialChars || ''}`.toLowerCase();
                    return riderFullName.includes(normalizedSearch);
                  });
                  
                  return (
                    <tr key={idx}>
                      <td><span className="result-entry-position">{idx + 1}</span></td>
                      <td className="result-entry-renner-cell">
                        <input
                          type="text"
                          placeholder="Type renner naam..."
                          value={searchTerm}
                          onChange={(e) => {
                            dispatch({ type: 'SET_RIDER_SEARCH_FILTERS', payload: {...searchFilters, [idx]: e.target.value} });
                            dispatch({ type: 'SET_OPEN_RIDER_DROPDOWNS', payload: {...openDropdowns, [idx]: true} });
                          }}
                          onFocus={() => dispatch({ type: 'SET_OPEN_RIDER_DROPDOWNS', payload: {...openDropdowns, [idx]: true} })}
                          onBlur={() => setTimeout(() => dispatch({ type: 'SET_OPEN_RIDER_DROPDOWNS', payload: {...openDropdowns, [idx]: false} }), 200)}
                          className="result-entry-renner-input"
                        />
                        {openDropdowns[idx] && (
                          <div className="result-entry-dropdown">
                            {filteredRiders.length === 0 ? (
                              <div className="result-entry-dropdown-empty">Geen renners gevonden</div>
                            ) : (
                              filteredRiders.map((rider) => (
                                <div
                                  key={rider.id}
                                  onClick={() => {
                                    updateResultEntry(idx, 'riderId', rider.id);
                                    dispatch({ type: 'SET_RIDER_SEARCH_FILTERS', payload: {...searchFilters, [idx]: `${rider.firstname} ${rider.lastname}`} });
                                    dispatch({ type: 'SET_OPEN_RIDER_DROPDOWNS', payload: {...openDropdowns, [idx]: false} });
                                  }}
                                  className={`result-entry-dropdown-item ${entry.riderId === rider.id ? 'selected' : ''}`}
                                >
                                  {rider.firstname} {rider.lastname}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </td>
                      <td className="result-entry-points-cell">
                        <span className="result-entry-points-value">{entry.points}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
}