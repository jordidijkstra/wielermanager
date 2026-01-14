import { useState, useRef } from 'react';
import { useResults } from '../hooks/useResults';
import { useRaces } from '../hooks/useRaces';
import { useRiders } from '../hooks/useRiders';
import { usePointsByCategory } from '../hooks/usePointsByCategory';
import '../css/resultsTab.css';

export default function ResultsTab() {
  const { results, loading: resultsLoading, editResult, deleteResult, addResult } = useResults();
  const { races } = useRaces();
  const { riders } = useRiders();
  const { loadPointsForCategory } = usePointsByCategory();
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [uploading, setUploading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingResult, setEditingResult] = useState(null);
  const [resultRenners, setResultRenners] = useState([]);
  const [riderSearchFilters, setRiderSearchFilters] = useState({});
  const [openRiderDropdowns, setOpenRiderDropdowns] = useState({});
  const [approvingResult, setApprovingResult] = useState(null);
  const [approveRenners, setApproveRenners] = useState([]);
  const [approveRiderSearchFilters, setApproveRiderSearchFilters] = useState({});
  const [approveOpenRiderDropdowns, setApproveOpenRiderDropdowns] = useState({});
  const [approveEditingIndex, setApproveEditingIndex] = useState(null);
  const resultsPerPage = 50;
  const fileInputRef = useRef(null);

  // Helper function to normalize text (remove diacritics and special characters)
  const normalizeText = (text) => {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .toLowerCase();
  };

  const getRaceName = (raceId) => {
    return races.find(r => r.id === raceId)?.name || `Race ${raceId}`;
  };

  const getRaceStartDate = (raceId) => {
    return races.find(r => r.id === raceId)?.startDate || '';
  };

  const getRaceEndDate = (raceId) => {
    return races.find(r => r.id === raceId)?.endDate || '9999-12-31';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('nl-NL', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('pdf')) {
      alert('Alleen PDF bestanden zijn toegestaan');
      return;
    }

    setUploading(true);
    try {
      // TODO: PDF parsing logica hier implementeren
      // Voor nu: placeholder voor toekomstige PDF parsing
      const formData = new FormData();
      formData.append('file', file);
      
      console.log('📄 PDF geüpload:', file.name);
      alert('PDF upload gestart. De parsing logica wordt nog geïmplementeerd.');
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading PDF:', error);
      alert('Fout bij uploaden PDF');
    } finally {
      setUploading(false);
    }
  };

  const saveEdit = async (resultId) => {
    try {
      await editResult(resultId, {
        raceId: editData.raceId,
        status: editData.status
      });
      setEditingId(null);
      console.log('✅ Resultaat bijgewerkt');
    } catch (error) {
      console.error('Error updating result:', error);
      alert('Fout bij bijwerken resultaat');
    }
  };

  const removeResult = async (resultId) => {
    if (confirm('Zeker weten dat je dit resultaat wilt verwijderen?')) {
      try {
        await deleteResult(resultId);
        console.log('✅ Resultaat verwijderd');
      } catch (error) {
        console.error('Error deleting result:', error);
        alert('Fout bij verwijderen resultaat');
      }
    }
  };

  const startEdit = (result) => {
    setEditingId(result.id);
    setEditData({ ...result });
  };

  const openEditResult = async (result) => {
    console.log('🔍 openEditResult called with:', result);
    setEditingResult(result);
    
    // Reset search filters eerst
    const newSearchFilters = {};
    
    // Parse de renners uit het result object
    if (result.entries && Array.isArray(result.entries)) {
      console.log('✅ Entries gevonden:', result.entries);
      setResultRenners(result.entries);
      
      // Vul de search filters met de namen van geselecteerde renners
      result.entries.forEach((entry, idx) => {
        if (entry.riderId) {
          const rider = riders.find(r => r.id === entry.riderId);
          if (rider) {
            newSearchFilters[idx] = `${rider.firstname} ${rider.lastname}`;
          }
        }
      });
    } else {
      console.log('❌ Geen entries gevonden in result. Result object:', result);
      console.log('Result keys:', Object.keys(result));
      setResultRenners([]);
    }
    
    setRiderSearchFilters(newSearchFilters);
  };

  const updateResultRenner = (index, riderId) => {
    const updated = [...resultRenners];
    updated[index] = { ...updated[index], riderId };
    setResultRenners(updated);
  };

  const saveEditResult = async () => {
    if (!editingResult) return;
    
    console.log('💾 Saving result with entries:', resultRenners);
    
    try {
      await editResult(editingResult.id, {
        ...editingResult,
        entries: resultRenners
      });
      setEditingResult(null);
      setResultRenners([]);
      setRiderSearchFilters({});
      console.log('✅ Resultaat met renners bijgewerkt');
    } catch (error) {
      console.error('Error updating result:', error);
      alert('Fout bij bijwerken resultaat');
    }
  };

  const approveResult = async (resultId) => {
    try {
      const result = results.find(r => r.id === resultId);
      if (!result) return;
      
      // Toon de approval modal
      setApprovingResult(result);
      if (result.entries && Array.isArray(result.entries)) {
        setApproveRenners(result.entries);
      } else {
        setApproveRenners([]);
      }
    } catch (error) {
      console.error('Error preparing approval:', error);
      alert('Fout bij voorbereiding goedkeuring');
    }
  };

  const confirmApproveResult = async () => {
    if (!approvingResult) return;
    
    try {
      await editResult(approvingResult.id, {
        ...approvingResult,
        entries: approveRenners,
        status: 'gecontrolleerd'
      });
      setApprovingResult(null);
      setApproveRenners([]);
      setApproveRiderSearchFilters({});
      setApproveOpenRiderDropdowns({});
      console.log('✅ Uitslag goedgekeurd');
    } catch (error) {
      console.error('Error approving result:', error);
      alert('Fout bij goedkeuren resultaat');
    }
  };

  const updateApproveRenner = (index, riderId) => {
    const updated = [...approveRenners];
    if (updated[index]) {
      updated[index].riderId = riderId;
      setApproveRenners(updated);
      
      // Update search filter
      const rider = riders.find(r => r.id === riderId);
      if (rider) {
        const newFilters = { ...approveRiderSearchFilters };
        newFilters[index] = `${rider.firstname} ${rider.lastname}`;
        setApproveRiderSearchFilters(newFilters);
      }
      
      // Close dropdown
      const newOpenDropdowns = { ...approveOpenRiderDropdowns };
      delete newOpenDropdowns[index];
      setApproveOpenRiderDropdowns(newOpenDropdowns);
    }
  };

  // Sort results by race endDate
  const sortedResults = [...results].sort((a, b) => {
    const dateA = getRaceEndDate(a.raceId);
    const dateB = getRaceEndDate(b.raceId);
    return new Date(dateA) - new Date(dateB);
  });

  console.log('📊 Results loaded:', results);

  // Pagination logic
  const totalPages = Math.ceil(sortedResults.length / resultsPerPage);
  const paginatedResults = sortedResults.slice(
    (currentPage - 1) * resultsPerPage,
    currentPage * resultsPerPage
  );

  const goToPrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  if (resultsLoading) return <div><p>Resultaten laden...</p></div>;

  return (
    <div className="tab-content">
      <h2>Resultaten beheren</h2>

      <div className="admin-stats">
        <p>Totaal resultaten: <strong>{results.length}</strong></p>
      </div>

      <div className="riders-table">
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
                        onChange={(e) => setEditData({ ...editData, raceId: e.target.value ? parseInt(e.target.value) : null })}
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
                        onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                      >
                        <option value="">-- Selecteer status --</option>
                        <option value="ingediend">Ingediend</option>
                        <option value="nog geen resultaat">Nog geen resultaat</option>
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
                          onClick={() => setEditingId(null)}
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
                          Bewerk
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
                          Verwijder
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

      {editingResult !== null && (
        <div className="result-edit-modal-overlay" onClick={() => setEditingResult(null)} />
      )}

      {editingResult !== null && (
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
                  const selectedRider = riders.find(r => r.id === entry.riderId);
                  
                  return (
                    <tr key={idx}>
                      <td><strong>{idx + 1}</strong></td>
                      <td className="result-edit-renner-cell">
                        <input
                          type="text"
                          placeholder="Type renner naam..."
                          value={searchTerm}
                          onChange={(e) => {
                            setRiderSearchFilters({...riderSearchFilters, [idx]: e.target.value});
                            setOpenRiderDropdowns({...openRiderDropdowns, [idx]: true});
                          }}
                          onFocus={() => setOpenRiderDropdowns({...openRiderDropdowns, [idx]: true})}
                          onBlur={() => setTimeout(() => setOpenRiderDropdowns({...openRiderDropdowns, [idx]: false}), 200)}
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
                                    setRiderSearchFilters({...riderSearchFilters, [idx]: `${rider.firstname} ${rider.lastname}`});
                                    setOpenRiderDropdowns({...openRiderDropdowns, [idx]: false});
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

          <div className="result-edit-buttons">
            <button 
              onClick={() => setEditingResult(null)}
              className="result-edit-cancel-btn"
            >
              Annuleren
            </button>
            <button 
              onClick={saveEditResult}
              className="result-edit-save-btn"
            >
              Opslaan
            </button>
          </div>
        </div>
      )}

      {approvingResult !== null && (
        <div className="result-approve-modal-overlay" onClick={() => setApprovingResult(null)} />
      )}

      {approvingResult !== null && (
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
                                setApproveRiderSearchFilters(newFilters);
                                
                                // Open dropdown if typing
                                if (e.target.value && !isDropdownOpen) {
                                  const newDropdowns = { ...approveOpenRiderDropdowns };
                                  newDropdowns[idx] = true;
                                  setApproveOpenRiderDropdowns(newDropdowns);
                                }
                              }}
                              onFocus={() => {
                                const newDropdowns = { ...approveOpenRiderDropdowns };
                                newDropdowns[idx] = true;
                                setApproveOpenRiderDropdowns(newDropdowns);
                              }}
                              onBlur={() => {
                                // Close dropdown after a delay to allow click registration
                                setTimeout(() => {
                                  const newDropdowns = { ...approveOpenRiderDropdowns };
                                  delete newDropdowns[idx];
                                  setApproveOpenRiderDropdowns(newDropdowns);
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
                                setApproveEditingIndex(idx);
                                const newFilters = { ...approveRiderSearchFilters };
                                if (selectedRider) {
                                  newFilters[idx] = `${selectedRider.firstname} ${selectedRider.lastname}`;
                                }
                                setApproveRiderSearchFilters(newFilters);
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

          <div className="result-approve-buttons">
            <button 
              onClick={() => setApprovingResult(null)}
              className="result-approve-cancel-btn"
            >
              Annuleren
            </button>
            <button 
              onClick={confirmApproveResult}
              className="result-approve-confirm-btn"
            >
              Goedkeuren
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
