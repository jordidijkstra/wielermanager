import React from 'react';

export function ApproveResultModal({
    approvingResult,
    approveRenners,
    riders,
    approveRiderSearchFilters,
    approveOpenRiderDropdowns,
    approveEditingIndex,
    approveRaceLeaderMode,
    approveRaceLeaderSearch,
    approveRaceLeaderDropdown,
    selectedApproveRaceLeaderId,
    dispatch,
    confirmApproveResult,
    uploading,
    getRaceName,
    normalizeText
}) {
    if (!approvingResult) return null;

    const updateApproveRenner = (index, riderId) => {
        const updated = [...approveRenners];
        if (updated[index]) {
            updated[index].riderId = riderId;
            dispatch({ type: 'UPDATE_APPROVE_RENNERS', payload: updated });

            // Update search filter
            const rider = riders.find(r => r.id === riderId);
            if (rider) {
                const newFilters = { ...approveRiderSearchFilters };
                newFilters[index] = `${rider.firstname} ${rider.lastname}`;
                dispatch({ type: 'UPDATE_APPROVE_RIDER_SEARCH_FILTERS', payload: newFilters });
            }

            // Close dropdown
            const newOpenDropdowns = { ...approveOpenRiderDropdowns };
            delete newOpenDropdowns[index];
            dispatch({ type: 'SET_APPROVE_OPEN_RIDER_DROPDOWNS', payload: newOpenDropdowns });
        }
    };

    return (
        <>
            <div className="result-approve-modal-overlay" onClick={() => dispatch({ type: 'CLOSE_APPROVE_RESULT' })} />
            <div className="result-approve-modal-content">
                <h3>Uitslag controleren</h3>
                <p className="result-approve-info">
                    Race: <strong>{getRaceName(approvingResult.raceId)}</strong>
                </p>

                <div className="result-approve-table-container">
                    <table className="result-approve-table">
                        <thead>
                            <tr>
                                <th>Positie</th>
                                {approveRenners.some(entry => entry.excelFullName) && <th>Excel naam</th>}
                                <th>Ingevulde renner</th>
                            </tr>
                        </thead>
                        <tbody>
                            {approveRenners.map((entry, idx) => {
                                const selectedRider = riders.find(r => r.id === entry.riderId);
                                const searchValue = approveRiderSearchFilters[idx] || '';
                                const isDropdownOpen = approveOpenRiderDropdowns[idx] || false;
                                const isEditingThis = approveEditingIndex === idx;
                                const hasExcelData = approveRenners.some(e => e.excelFullName);

                                // Filter riders based on search value
                                const normalizedSearch = normalizeText(searchValue);
                                const filteredRiders = riders.filter(rider => {
                                    if (!normalizedSearch) return false;
                                    const riderFullname = normalizeText(
                                        `${rider.firstnameWithoutSpecialChars || rider.firstname || ''} ${rider.lastnameWithoutSpecialChars || rider.lastname || ''}`
                                    );
                                    return riderFullname.includes(normalizedSearch) || normalizedSearch.includes(riderFullname);
                                });

                                return (
                                    <tr key={idx}>
                                        <td><strong>{idx + 1}</strong></td>
                                        {hasExcelData && <td className="result-approve-excel-name">{entry.excelFullName || '-'}</td>}
                                        <td className="result-approve-renner-cell">
                                            {isEditingThis ? (
                                                <div style={{ position: 'relative' }}>
                                                    <input
                                                        type="text"
                                                        value={searchValue}
                                                        onChange={(e) => {
                                                            const newFilters = { ...approveRiderSearchFilters };
                                                            newFilters[idx] = e.target.value;
                                                            dispatch({ type: 'UPDATE_APPROVE_RIDER_SEARCH_FILTERS', payload: newFilters });

                                                            // Open dropdown if typing
                                                            if (e.target.value && !isDropdownOpen) {
                                                                dispatch({ type: 'SET_APPROVE_OPEN_RIDER_DROPDOWNS', payload: { [idx]: true } });
                                                            }
                                                        }}
                                                        onFocus={() => {
                                                            dispatch({ type: 'SET_APPROVE_OPEN_RIDER_DROPDOWNS', payload: { [idx]: true } });
                                                        }}
                                                        onBlur={() => {
                                                            // Close dropdown after a delay to allow click registration
                                                            setTimeout(() => {
                                                                dispatch({ type: 'SET_APPROVE_OPEN_RIDER_DROPDOWNS', payload: { [idx]: false } });
                                                            }, 200);
                                                        }}
                                                        placeholder="Zoek renner..."
                                                        className="result-approve-renner-input"
                                                        autoFocus
                                                    />

                                                    {isDropdownOpen && searchValue && (
                                                        <div className="result-approve-dropdown">
                                                            {filteredRiders.length > 0 ? (
                                                                filteredRiders.map(rider => (
                                                                    <div
                                                                        key={rider.id}
                                                                        className={`result-approve-dropdown-item ${selectedRider?.id === rider.id ? 'selected' : ''}`}
                                                                        onClick={() => updateApproveRenner(idx, rider.id)}
                                                                    >
                                                                        {rider.firstname} {rider.lastname}
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <div className="result-approve-dropdown-item" style={{ color: '#999' }}>
                                                                    Geen renners gevonden
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="result-approve-renner-display">
                                                    <span className="result-approve-renner-name">
                                                        {selectedRider
                                                            ? `${selectedRider.firstname} ${selectedRider.lastname}`
                                                            : `ID: ${entry.riderId}`
                                                        }
                                                    </span>
                                                    <button
                                                        className="result-approve-edit-btn"
                                                        onClick={() => {
                                                            dispatch({ type: 'SET_APPROVE_EDITING_INDEX', payload: idx });
                                                            const newFilters = { ...approveRiderSearchFilters };
                                                            if (selectedRider) {
                                                                newFilters[idx] = `${selectedRider.firstname} ${selectedRider.lastname}`;
                                                            }
                                                            dispatch({ type: 'UPDATE_APPROVE_RIDER_SEARCH_FILTERS', payload: newFilters });
                                                        }}
                                                    >
                                                        Bewerk
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Race Leader Selector for Approve */}
                <div className="result-race-leader-section">
                    {approveRaceLeaderMode ? (
                        <div className="race-leader-selector">
                            <label>🏆 Race Leader selecteren:</label>
                            <div style={{ position: 'relative', marginTop: '10px' }}>
                                <input
                                    type="text"
                                    placeholder="Zoek renner..."
                                    value={approveRaceLeaderSearch}
                                    onChange={(e) => {
                                        dispatch({ type: 'SET_APPROVE_RACE_LEADER_SEARCH', payload: e.target.value });
                                        dispatch({ type: 'SET_APPROVE_RACE_LEADER_DROPDOWN', payload: true });
                                    }}
                                    onFocus={() => dispatch({ type: 'SET_APPROVE_RACE_LEADER_DROPDOWN', payload: true })}
                                    className="race-leader-search-input"
                                />

                                {approveRaceLeaderDropdown && (
                                    <div className="race-leader-dropdown">
                                        {riders
                                            .filter(rider => {
                                                const normalizedSearch = normalizeText(approveRaceLeaderSearch);
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
                                                        dispatch({ type: 'SET_SELECTED_APPROVE_RACE_LEADER_ID', payload: rider.id });
                                                        dispatch({ type: 'SET_APPROVE_RACE_LEADER_MODE', payload: false });
                                                        dispatch({ type: 'SET_APPROVE_RACE_LEADER_SEARCH', payload: '' });
                                                        dispatch({ type: 'SET_APPROVE_RACE_LEADER_DROPDOWN', payload: false });
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
                                    dispatch({ type: 'SET_APPROVE_RACE_LEADER_MODE', payload: false });
                                    dispatch({ type: 'SET_APPROVE_RACE_LEADER_SEARCH', payload: '' });
                                    dispatch({ type: 'SET_APPROVE_RACE_LEADER_DROPDOWN', payload: false });
                                }}
                                style={{ marginTop: '10px' }}
                            >
                                Annuleren
                            </button>
                        </div>
                    ) : (
                        <button
                            className="race-leader-btn"
                            onClick={() => dispatch({ type: 'SET_APPROVE_RACE_LEADER_MODE', payload: true })}
                        >
                            🏆 Selecteer Race Leader
                        </button>
                    )}

                    {/* Display selected race leader */}
                    {selectedApproveRaceLeaderId && (
                        <div className="race-leader-selected">
                            <strong>Race Leader:</strong> {riders.find(r => r.id === selectedApproveRaceLeaderId)?.firstname} {riders.find(r => r.id === selectedApproveRaceLeaderId)?.lastname}
                            <button
                                className="race-leader-remove-btn"
                                onClick={() => {
                                    dispatch({ type: 'SET_SELECTED_APPROVE_RACE_LEADER_ID', payload: null });
                                }}
                                style={{ marginLeft: '10px' }}
                            >
                                ✕
                            </button>
                        </div>
                    )}
                </div>

                <div className="result-approve-buttons">
                    <button
                        onClick={() => dispatch({ type: 'CLOSE_APPROVE_RESULT' })}
                        className="result-approve-cancel-btn"
                        disabled={uploading}
                    >
                        Annuleren
                    </button>
                    <button
                        onClick={confirmApproveResult}
                        className="result-approve-confirm-btn"
                        disabled={uploading}
                    >
                        {uploading ? '⏳ Goedkeuren...' : 'Goedkeuren'}
                    </button>
                </div>
            </div>
        </>
    );
}
