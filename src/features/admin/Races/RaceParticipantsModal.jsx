import React from 'react';
import Modal from '../../../components/common/Modal';
import { normalizeText } from '../../../utils/textUtils';

export default function RaceParticipantsModal({
  isOpen,
  onClose,
  raceId,
  entries,
  searchFilters,
  openDropdowns,
  riders,
  dispatch,
  onSubmit,
  onExcelImport
}) {
  const addParticipantEntry = () => {
    const newEntries = [...entries, { riderId: null }];
    dispatch({ type: 'SET_PARTICIPANT_ENTRIES', payload: newEntries });
  };

  const removeParticipantEntry = (index) => {
    const updated = entries.filter((_, i) => i !== index);
    
    // We also need to realign filters and dropdowns indices
    // This logic was in the parent, we can try to keep it simple here 
    // or we might need to rely on the parent's reducer to handle the complex state update correctly.
    // The previous implementation did complex reassignment:
    /*
    const newSearchFilters = {};
    const newDropdowns = {};
    let newIdx = 0;
    state.data.participantEntries.forEach((_, oldIdx) => {
      if (oldIdx !== index) {
        if (state.search.participants[oldIdx]) ...
      }
    });
    */
   
   // Actually, passing dispatch and asking parent reducers to do atomic updates is better, 
   // but the reducer currently is generic (SET_PARTICIPANT_ENTRIES). 
   // I'll replicate the logic here or create a new action type?
   // Let's replicate the logic from the parent for now as it uses the props.
   
    const newSearchFilters = {};
    const newDropdowns = {};
    let newIdx = 0;
    
    entries.forEach((_, oldIdx) => {
      if (oldIdx !== index) {
        if (searchFilters[oldIdx]) {
          newSearchFilters[newIdx] = searchFilters[oldIdx];
        }
        if (openDropdowns[oldIdx]) {
          newDropdowns[newIdx] = openDropdowns[oldIdx];
        }
        newIdx++;
      }
    });
    
    dispatch({ type: 'SET_PARTICIPANT_ENTRIES', payload: updated });
    dispatch({ type: 'SET_PARTICIPANT_SEARCH_FILTERS', payload: newSearchFilters });
    dispatch({ type: 'SET_OPEN_PARTICIPANT_DROPDOWNS', payload: newDropdowns });
  };

  const updateParticipantEntry = (index, riderId) => {
    dispatch({ 
      type: 'UPDATE_PARTICIPANT_ENTRY', 
      payload: { index, data: { riderId: riderId ? parseInt(riderId) : null } } 
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Startlijst importeren"
      footer={
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
      }
    >
      <p className="result-modal-info">
        Race ID: <strong>{raceId}</strong>
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
          <span className="excel-import-hint">(Kolom A: Renner voornaam en achternaam)</span>
        </label>
      </div>

      <div>
        <table className="result-entry-table">
          <thead>
            <tr>
              <th>Renner</th>
              <th>Acties</th>
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
                  <td className="result-entry-renner-cell">
                    <input
                      type="text"
                      placeholder="Type renner naam..."
                      value={searchTerm}
                      onChange={(e) => {
                        dispatch({ type: 'SET_PARTICIPANT_SEARCH_FILTERS', payload: {...searchFilters, [idx]: e.target.value} });
                        dispatch({ type: 'SET_OPEN_PARTICIPANT_DROPDOWNS', payload: {...openDropdowns, [idx]: true} });
                      }}
                      onFocus={() => dispatch({ type: 'SET_OPEN_PARTICIPANT_DROPDOWNS', payload: {...openDropdowns, [idx]: true} })}
                      onBlur={() => setTimeout(() => dispatch({ type: 'SET_OPEN_PARTICIPANT_DROPDOWNS', payload: {...openDropdowns, [idx]: false} }), 200)}
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
                                updateParticipantEntry(idx, rider.id);
                                dispatch({ type: 'SET_PARTICIPANT_SEARCH_FILTERS', payload: {...searchFilters, [idx]: `${rider.firstname} ${rider.lastname}`} });
                                dispatch({ type: 'SET_OPEN_PARTICIPANT_DROPDOWNS', payload: {...openDropdowns, [idx]: false} });
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
                  <td>
                    <button 
                      onClick={() => removeParticipantEntry(idx)}
                      className="btn-delete"
                      style={{ padding: '5px 10px', fontSize: '12px' }}
                    >
                      Verwijder
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button 
          onClick={addParticipantEntry}
          className="btn-edit"
          style={{ marginTop: '10px' }}
        >
          + Renner toevoegen
        </button>
      </div>
    </Modal>
  );
}