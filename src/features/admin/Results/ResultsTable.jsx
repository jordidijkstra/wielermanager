import React from 'react';

export function ResultsTable({
    sortedResults,
    paginatedResults,
    editingId,
    editData,
    races,
    dispatch,
    saveEdit,
    openEditResult,
    approveResult,
    removeResult,
    currentPage,
    totalPages,
    goToPrevPage,
    goToNextPage,
    getRaceName,
    getRaceStartDate,
    getRaceEndDate,
    formatDate
}) {

    return (
        <div className="results-table">
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Race</th>
                        <th>Start datum</th>
                        <th>Eind datum</th>
                        <th>Status</th>
                        <th>Acties</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedResults.length > 0 ? (
                        paginatedResults.map((result) => (
                            <tr key={result.id}>
                                <td>{result.id}</td>
                                <td>
                                    {editingId === result.id ? (
                                        <select
                                            value={editData.raceId || ''}
                                            onChange={(e) => dispatch({ type: 'UPDATE_INLINE_EDIT_DATA', payload: { raceId: e.target.value ? parseInt(e.target.value) : null } })}
                                        >
                                            <option value="">-- Selecteer race --</option>
                                            {races.map((race) => (
                                                <option key={race.id} value={race.id}>
                                                    {race.name}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        getRaceName(result.raceId)
                                    )}
                                </td>
                                <td>{formatDate(getRaceStartDate(result.raceId))}</td>
                                <td>{formatDate(getRaceEndDate(result.raceId))}</td>
                                <td>
                                    {editingId === result.id ? (
                                        <select
                                            value={editData.status || ''}
                                            onChange={(e) => dispatch({ type: 'UPDATE_INLINE_EDIT_DATA', payload: { status: e.target.value } })}
                                        >
                                            <option value="">-- Selecteer status --</option>
                                            <option value="nog geen resultaat">Nog geen resultaat</option>
                                            <option value="ingediend">Ingediend</option>
                                            <option value="gecontrolleerd">Gecontrolleerd</option>
                                        </select>
                                    ) : (
                                        <span className={`status-badge status-${result.status?.toLowerCase().replace(/\s+/g, '-')}`}>
                                            {result.status || 'nog geen resultaat'}
                                        </span>
                                    )}
                                </td>
                                <td>
                                    {editingId === result.id ? (
                                        <>
                                            <button
                                                className="btn-edit"
                                                onClick={() => saveEdit(result.id)}
                                            >
                                                Opslaan
                                            </button>
                                            <button
                                                className="btn-delete"
                                                onClick={() => dispatch({ type: 'CANCEL_INLINE_EDIT' })}
                                            >
                                                Annuleren
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                className="btn-edit"
                                                onClick={() => openEditResult(result)}
                                            >
                                                <i className="fas fa-edit"></i>
                                            </button>
                                            {result.status === 'ingediend' && (
                                                <button
                                                    className="btn-approve"
                                                    onClick={() => approveResult(result.id)}
                                                    title="Uitslag controleren en goedkeuren"
                                                >
                                                    Controleer
                                                </button>
                                            )}
                                            <button
                                                className="btn-delete"
                                                onClick={() => removeResult(result.id)}
                                            >
                                                <i className="fas fa-trash"></i>
                                            </button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                                Geen resultaten beschikbaar
                            </td>
                        </tr>
                    )}
                </tbody>
                {sortedResults.length > 0 && totalPages > 1 && (
                    <tfoot>
                        <tr>
                            <td colSpan="6" style={{ textAlign: 'center', padding: '15px' }}>
                                <button
                                    className="pagination-btn"
                                    onClick={goToPrevPage}
                                    disabled={currentPage === 1}
                                >
                                    Vorige
                                </button>
                                <span className="pagination-info" style={{ margin: '0 20px' }}>
                                    Pagina {currentPage} van {totalPages}
                                </span>
                                <button
                                    className="pagination-btn"
                                    onClick={goToNextPage}
                                    disabled={currentPage === totalPages}
                                >
                                    Volgende
                                </button>
                            </td>
                        </tr>
                    </tfoot>
                )}
            </table>
        </div>
    );
}
