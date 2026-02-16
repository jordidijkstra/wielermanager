import React from 'react';

export function EditResultModal({
    editingResult,
    resultRenners,
    riders,
    riderSearchFilters,
    openRiderDropdowns,
    editRaceLeaderMode,
    editRaceLeaderSearch,
    editRaceLeaderDropdown,
    selectedEditRaceLeaderId,
    dispatch,
    saveEditResult,
    uploading,
    getRaceName,
    normalizeText
}) {
    if (!editingResult) return null;

    const updateResultRenner = (index, riderId) => {
        const updated = [...resultRenners];
        updated[index] = { ...updated[index], riderId };
        dispatch({ type: 'UPDATE_RESULT_RENNERS', payload: updated });
    };

    return (
        <>
            <div className="result-edit-modal-overlay" onClick={() => dispatch({ type: 'CLOSE_EDIT_RESULT' })} />
            <div className="result-edit-modal-content">
                <h3>Uitslag bewerken</h3>
                <p className="result-edit-info">
                    Race: <strong>{getRaceName(editingResult.raceId)}</strong>
                </p>

                <div className="result-edit-table-container">
                    <table className="result-edit-table">
                        <thead>
                            <tr>
                                <th>Positie</th>
                                <th>Renner</th>
                            </tr>
                        </thead>
                        <tbody>
                            {resultRenners.map((entry, idx) => {
                                const searchTerm = riderSearchFilters[idx] || '';
                                const normalizedSearch = normalizeText(searchTerm);
                                const filteredRiders = riders.filter(rider => {
                                    const riderFullName = `${rider.firstnameWithoutSpecialChars || ''} ${rider.lastnameWithoutSpecialChars || ''}`.toLowerCase();
                                    return riderFullName.includes(normalizedSearch);
                                });
                                // const selectedRider = riders.find(r => r.id === entry.riderId); // Unused variable in original code too?

                                return (
                                    <tr key={idx}>
                                        <td><strong>{idx + 1}</strong></td>
                                        <td className="result-edit-renner-cell">
                                            <input
                                                type="text"
                                                placeholder="Type renner naam..."
                                                value={searchTerm}
                                                onChange={(e) => {
                                                    dispatch({ type: 'UPDATE_RIDER_SEARCH_FILTERS', payload: { ...riderSearchFilters, [idx]: e.target.value } });
                                                    dispatch({ type: 'SET_OPEN_RIDER_DROPDOWNS', payload: { [idx]: true } });
                                                }}
                                                onFocus={() => dispatch({ type: 'SET_OPEN_RIDER_DROPDOWNS', payload: { [idx]: true } })}
                                                onBlur={() => setTimeout(() => dispatch({ type: 'SET_OPEN_RIDER_DROPDOWNS', payload: { [idx]: false } }), 200)}
                                                className="result-edit-renner-input"
                                            />
                                            {openRiderDropdowns[idx] && (
                                                <div className="result-edit-dropdown">
                                                    {filteredRiders.length === 0 ? (
                                                        <div className="result-edit-dropdown-empty">Geen renners gevonden</div>
                                                    ) : (
                                                        filteredRiders.map((rider) => (
                                                            <div
                                                                key={rider.id}
                                                                onClick={() => {
                                                                    updateResultRenner(idx, rider.id);
                                                                    dispatch({ type: 'UPDATE_RIDER_SEARCH_FILTERS', payload: { ...riderSearchFilters, [idx]: `${rider.firstname} ${rider.lastname}` } });
                                                                    dispatch({ type: 'SET_OPEN_RIDER_DROPDOWNS', payload: { [idx]: false } });
                                                                }}
                                                                className={`result-edit-dropdown-item ${entry.riderId === rider.id ? 'selected' : ''}`}
                                                            >
                                                                {rider.firstname} {rider.lastname}
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Race Leader Selector */}
                <div className="result-race-leader-section">
                    {editRaceLeaderMode ? (
                        <div className="race-leader-selector">
                            <label>🏆 Race Leader selecteren:</label>
                            <div style={{ position: 'relative', marginTop: '10px' }}>
                                <input
                                    type="text"
                                    placeholder="Zoek renner..."
                                    value={editRaceLeaderSearch}
                                    onChange={(e) => {
                                        dispatch({ type: 'SET_EDIT_RACE_LEADER_SEARCH', payload: e.target.value });
                                        dispatch({ type: 'SET_EDIT_RACE_LEADER_DROPDOWN', payload: true });
                                    }}
                                    onFocus={() => dispatch({ type: 'SET_EDIT_RACE_LEADER_DROPDOWN', payload: true })}
                                    className="race-leader-search-input"
                                />

                                {editRaceLeaderDropdown && (
                                    <div className="race-leader-dropdown">
                                        {riders
                                            .filter(rider => {
                                                const normalizedSearch = normalizeText(editRaceLeaderSearch);
                                                const riderFullName = normalizeText(`${rider.firstname} ${rider.lastname}`);
                                                return riderFullName.includes(normalizedSearch);
                                            })
                                            .slice(0, 10)
                                            .map(rider => (
                                                <div
                                                    key={rider.id}
                                                    className="race-leader-dropdown-item"
                                                    onClick={() => {
                                                        // Store race leader ID separately (no need to be in entries)
                                                        dispatch({ type: 'SET_SELECTED_EDIT_RACE_LEADER_ID', payload: rider.id });
                                                        dispatch({ type: 'SET_EDIT_RACE_LEADER_MODE', payload: false });
                                                        dispatch({ type: 'SET_EDIT_RACE_LEADER_SEARCH', payload: '' });
                                                        dispatch({ type: 'SET_EDIT_RACE_LEADER_DROPDOWN', payload: false });
                                                    }}
                                                >
                                                    {rider.firstname} {rider.lastname}
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                            <button
                                className="race-leader-cancel-btn"
                                onClick={() => {
                                    dispatch({ type: 'SET_EDIT_RACE_LEADER_MODE', payload: false });
                                    dispatch({ type: 'SET_EDIT_RACE_LEADER_SEARCH', payload: '' });
                                    dispatch({ type: 'SET_EDIT_RACE_LEADER_DROPDOWN', payload: false });
                                }}
                                style={{ marginTop: '10px' }}
                            >
                                Annuleren
                            </button>
                        </div>
                    ) : (
                        <button
                            className="race-leader-btn"
                            onClick={() => dispatch({ type: 'SET_EDIT_RACE_LEADER_MODE', payload: true })}
                        >
                            🏆 Selecteer Race Leader
                        </button>
                    )}

                    {/* Display selected race leader */}
                    {selectedEditRaceLeaderId && (
                        <div className="race-leader-selected">
                            <strong>Race Leader:</strong> {riders.find(r => r.id === selectedEditRaceLeaderId)?.firstname} {riders.find(r => r.id === selectedEditRaceLeaderId)?.lastname}
                            <button
                                className="race-leader-remove-btn"
                                onClick={() => {
                                    dispatch({ type: 'SET_SELECTED_EDIT_RACE_LEADER_ID', payload: null });
                                }}
                                style={{ marginLeft: '10px' }}
                            >
                                ✕
                            </button>
                        </div>
                    )}
                </div>

                <div className="result-edit-buttons">
                    <button
                        onClick={() => dispatch({ type: 'CLOSE_EDIT_RESULT' })}
                        className="result-edit-cancel-btn"
                    >
                        Annuleren
                    </button>
                    <button
                        onClick={saveEditResult}
                        className="result-edit-save-btn"
                        disabled={uploading}
                    >
                        {uploading ? '⏳ Opslaan...' : 'Opslaan'}
                    </button>
                </div>
            </div>
        </>
    );
}
