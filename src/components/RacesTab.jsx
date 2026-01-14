import { useState } from 'react';
import * as XLSX from 'xlsx';
import { useRaces } from '../hooks/useRaces';
import { useRacesCategories } from '../hooks/useRacesCategories';
import { useResults } from '../hooks/useResults';
import { useRiders } from '../hooks/useRiders';
import { usePointsByCategory } from '../hooks/usePointsByCategory';
import '../css/racesTab.css';

export default function RacesTab() {
  const { races, loading: racesLoading, reload: reloadRaces, addRace, editRace, removeRace } = useRaces();
  const { categories, loading: categoriesLoading } = useRacesCategories();
  const { results, addResult } = useResults();
  const { riders } = useRiders();
  const { loadPointsForCategory } = usePointsByCategory();
  const [showAddRaceForm, setShowAddRaceForm] = useState(false);
  const [editingRaceId, setEditingRaceId] = useState(null);
  const [editRaceData, setEditRaceData] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [showResultModal, setShowResultModal] = useState(null);
  const [resultEntries, setResultEntries] = useState([]);
  const [riderSearchFilters, setRiderSearchFilters] = useState({});
  const [openRiderDropdowns, setOpenRiderDropdowns] = useState({});
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState(null);
  const racesPerPage = 50;
  const [newRace, setNewRace] = useState({
    name: '',
    startDate: '',
    endDate: '',
    categoryId: null,
    maxRiders: 7,
    tourId: null,
  });

  // Helper function to normalize text (remove diacritics and special characters)
  const normalizeText = (text) => {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .toLowerCase();
  };

  // Handle Excel file import
  const handleExcelImport = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        const updatedEntries = [...resultEntries];
        const newSearchFilters = { ...riderSearchFilters };
        let matchedCount = 0;
        
        rows.forEach((row) => {
          const positie = parseInt(row[0]) - 1; // Convert to 0-indexed
          const fullName = String(row[1] || '').trim();

          if (positie >= 0 && positie < updatedEntries.length && fullName) {
            // Find rider with fuzzy matching on normalized full name
            const normalizedSearch = normalizeText(fullName);
            
            // Split name to try both orders (voornaam achternaam vs achternaam voornaam)
            const nameParts = fullName.split(/\s+/).filter(p => p.length > 0);

            const matchedRider = riders.find(rider => {
              const riderFullname = normalizeText(
                `${rider.firstnameWithoutSpecialChars || rider.firstname || ''} ${rider.lastnameWithoutSpecialChars || rider.lastname || ''}`
              );
              
              // Check multiple matching strategies
              if (riderFullname.includes(normalizedSearch)) return true;
              if (normalizedSearch.includes(riderFullname)) return true;
              
              // Check if all name parts match anywhere in rider's name
              return nameParts.every(part => riderFullname.includes(normalizeText(part)));
            });

            if (matchedRider) {
              updatedEntries[positie].riderId = matchedRider.id;
              updatedEntries[positie].excelFullName = fullName;
              newSearchFilters[positie] = `${matchedRider.firstname} ${matchedRider.lastname}`;
              matchedCount++;
              console.log(`✅ Gevonden: "${fullName}" -> ${matchedRider.firstname} ${matchedRider.lastname}`);
            } else {
              // Mark as not found but use default rider ID 911
              updatedEntries[positie].riderId = 911;
              updatedEntries[positie].excelFullName = fullName;
              newSearchFilters[positie] = `⚠️ ${fullName} - renner bestaat niet in wielermanager`;
              console.log(`⚠️ Niet gevonden: "${fullName}" -> ID 911 (default ingevuld)`);
            }
          }
        });

        setResultEntries(updatedEntries);
        setRiderSearchFilters(newSearchFilters);
        alert(`✅ Excel gegevens ingeladen! ${rows.length} rijen verwerkt, ${matchedCount} renners gevonden.`);
      } catch (error) {
        console.error('Fout bij importeren Excel:', error);
        alert('❌ Fout bij importeren Excel-bestand');
      }
    };
    
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  };

  // Helper function to determine status based on startDate and endDate
  const getStatusByDate = (startDate, endDate) => {
    if (!startDate || !endDate) return 'to be announced';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const raceEndDate = new Date(endDate);
    raceEndDate.setHours(0, 0, 0, 0);
    
    const raceStartDate = new Date(startDate);
    raceStartDate.setHours(0, 0, 0, 0);
    
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    if (raceEndDate < today) {
      return 'raced';
    } else if (raceStartDate <= sevenDaysFromNow) {
      return 'raced soon';
    } else {
      return 'raced later';
    }
  };

  // Helper function to get CSS class based on status
  const getStatusClass = (status) => {
    switch (status) {
      case 'raced':
        return 'status-raced';
      case 'raced soon':
        return 'status-raced-soon';
      case 'raced later':
        return 'status-raced-later';
      case 'to be announced':
        return 'status-tba';
      default:
        return '';
    }
  };

  const addNewRace = async () => {
    if (!newRace.name || !newRace.startDate || !newRace.endDate) {
      alert('Naam, startdatum en einddatum zijn verplicht');
      return;
    }

    try {
      const computedStatus = getStatusByDate(newRace.startDate, newRace.endDate);

      await addRace({
        name: newRace.name,
        startDate: newRace.startDate,
        endDate: newRace.endDate,
        categoryId: newRace.categoryId,
        maxRiders: parseInt(newRace.maxRiders),
        tourId: newRace.tourId,
        status: computedStatus
      });

      setNewRace({ name: '', startDate: '', endDate: '', categoryId: null, maxRiders: 8, tourId: null });
      setShowAddRaceForm(false);
      console.log('✅ Nieuwe race toegevoegd');
    } catch (error) {
      console.error('Error adding race:', error);
      alert('Fout bij toevoegen race');
    }
  };

  const startEditRace = (race) => {
    setEditingRaceId(race.id);
    setEditRaceData({ ...race });
  };

  const saveEditRace = async (raceId) => {
    try {
      const computedStatus = getStatusByDate(editRaceData.startDate, editRaceData.endDate);
      const updatedRaceData = { 
        ...editRaceData, 
        status: computedStatus,
        maxRiders: parseInt(editRaceData.maxRiders)
      };
      
      await editRace(raceId, updatedRaceData);
      setEditingRaceId(null);
      console.log('✅ Race bijgewerkt');
    } catch (error) {
      console.error('Error updating race:', error);
      alert('Fout bij bijwerken race');
    }
  };

  const deleteRace = async (raceId) => {
    if (confirm('Weet je zeker dat je deze race wilt verwijderen?')) {
      try {
        await removeRace(raceId);
        console.log('✅ Race verwijderd');
      } catch (error) {
        console.error('Error deleting race:', error);
        alert('Fout bij verwijderen race');
      }
    }
  };

  if (racesLoading) return <div><p>Races laden...</p></div>;

  // Sort races by endDate
  const sortedRaces = [...races].sort((a, b) => {
    const dateA = new Date(a.endDate || '9999-12-31');
    const dateB = new Date(b.endDate || '9999-12-31');
    return dateA - dateB;
  });

  // Filter by category if selected
  const filteredRaces = selectedCategoryFilter
    ? sortedRaces.filter(race => race.categoryId === selectedCategoryFilter)
    : sortedRaces;

  // Pagination logic
  const totalPages = Math.ceil(filteredRaces.length / racesPerPage);
  const paginatedRaces = filteredRaces.slice(
    (currentPage - 1) * racesPerPage,
    currentPage * racesPerPage
  );

  const goToPrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const getResultForRace = (raceId) => {
    return results.find(r => r.raceId === raceId);
  };

  const getRaceCategoryId = (raceId) => {
    const race = races.find(r => r.id === raceId);
    return race?.categoryId;
  };

  const handleResultAction = async (raceId) => {
    const result = getResultForRace(raceId);
    if (result) {
      // Als resultaat bestaat, toon bestaand resultaat
      setShowResultModal({ type: 'existing', raceId, resultId: result.id });
    } else {
      // Geen resultaat -> load punten van categorie
      const categoryId = getRaceCategoryId(raceId);
      console.log('Race', raceId, 'categoryId:', categoryId);
      
      let points = [];
      if (categoryId) {
        points = await loadPointsForCategory(categoryId);
        console.log('Loaded points:', points);
      }
      
      // Maak entries met punten pre-ingevuld
      const emptyEntries = (points || []).map(pointValue => ({ 
        riderId: null, 
        points: pointValue,
        excelFullName: null
      }));
      
      setResultEntries(emptyEntries);
      setShowResultModal({ type: 'form', raceId, pointsCount: emptyEntries.length });
    }
  };

  const updateResultEntry = (index, field, value) => {
    const updated = [...resultEntries];
    updated[index] = { ...updated[index], [field]: field === 'riderId' ? (value ? parseInt(value) : null) : parseInt(value) || 0 };
    setResultEntries(updated);
  };

  const submitResults = async () => {
    const raceId = showResultModal.raceId;
    
    console.log('🔥 submitResults - raceId:', raceId);
    console.log('🔥 submitResults - resultEntries:', resultEntries);
    
    // Valideer dat alle invoervelden ingevuld zijn (riderId of waarschuwingstekst)
    const allFilled = resultEntries.every(entry => {
      const searchText = riderSearchFilters[resultEntries.indexOf(entry)];
      return entry.riderId !== null || (searchText && searchText.includes('renner bestaat niet in wielermanager'));
    });
    if (!allFilled) {
      alert('Vul alle renners in');
      return;
    }

    try {
      const dataToSave = { raceId, status: 'ingediend', entries: resultEntries };
      console.log('💾 Data to save:', dataToSave);
      
      await addResult(dataToSave);
      
      setShowResultModal(null);
      setResultEntries([]);
      setRiderSearchFilters({});
      console.log('✅ Resultaten ingevoerd voor race:', raceId);
    } catch (error) {
      console.error('Error submitting results:', error);
      alert('Fout bij opslaan resultaten');
    }
  };

  return (
    <div className="tab-content">
      <h2>Races beheren</h2>
      
      <div className="admin-controls">
        <button 
          className="btn-add-rider"
          onClick={() => setShowAddRaceForm(!showAddRaceForm)}
        >
          {showAddRaceForm ? 'Annuleren' : '+ Nieuwe race'}
        </button>
      </div>

      {showAddRaceForm && (
        <div className="add-rider-form">
          <h3>Nieuwe race</h3>
          <div className="form-row">
            <div className="form-field">
              <input
                type="text"
                id='raceName'
                name='raceName'
                value={newRace.name}
                onChange={(e) => setNewRace({ ...newRace, name: e.target.value })}
              />
              <label htmlFor="raceName">Racenaam</label>
            </div>
            <div className="form-field">
              <input
                type="number"
                id='maxRiders'
                name='maxRiders'
                value={newRace.maxRiders}
                onChange={(e) => setNewRace({ ...newRace, maxRiders: e.target.value })}
              />
              <label htmlFor="maxRiders">Max renners</label>
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <input
                type="date"
                id='startDate'
                name='startDate'
                value={newRace.startDate}
                onChange={(e) => setNewRace({ ...newRace, startDate: e.target.value })}
              />
              <label htmlFor="startDate">Startdatum</label>
            </div>
            <div className="form-field">
              <input
                type="date"
                id='endDate'
                name='endDate'
                value={newRace.endDate}
                onChange={(e) => setNewRace({ ...newRace, endDate: e.target.value })}
              />
              <label htmlFor="endDate">Einddatum</label>
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <select
                id='categoryId'
                name='categoryId'
                value={newRace.categoryId || ''}
                onChange={(e) => setNewRace({ ...newRace, categoryId: e.target.value ? parseInt(e.target.value) : null })}
                disabled={categoriesLoading}
              >
                <option value="">
                  {categoriesLoading ? '... Laden ...' : '-- Selecteer een categorie --'}
                </option>
                {categories.length > 0 ? (
                  categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name || `Categorie ${category.id}`}
                    </option>
                  ))
                ) : (
                  <option disabled>Geen categorieën beschikbaar</option>
                )}
              </select>
              <label htmlFor="categoryId" id="categoryId-label">Categorie</label>
            </div>
            <div className="form-field">
              <input
                type="number"
                id='tourId'
                name='tourId'
                value={newRace.tourId || ''}
                onChange={(e) => setNewRace({ ...newRace, tourId: e.target.value ? parseInt(e.target.value) : null })}
              />
              <label htmlFor="tourId">Tour ID (optioneel)</label>
            </div>
          </div>
          <button className="btn-riders-save" onClick={addNewRace}>Opslaan</button>
        </div>
      )}

      <div className="admin-stats">
        <p>Totaal Races: <strong>{filteredRaces.length}</strong></p>
      </div>

      {/* Category Filter Dropdown */}
      <div className="category-filter">
        <label htmlFor="category-filter">Filter op categorie:</label>
        <select
          id="category-filter"
          value={selectedCategoryFilter || ''}
          onChange={(e) => {
            setSelectedCategoryFilter(e.target.value ? parseInt(e.target.value) : null);
            setCurrentPage(1);
          }}
        >
          <option value="">-- Alle categorieën --</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="riders-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Naam</th>
              <th>Startdatum</th>
              <th>Einddatum</th>
              <th>Categorie</th>
              <th>Max renners</th>
              <th>Status</th>
              <th>Acties</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRaces.map((race) => (
              <tr key={`${race.id}`}>
                <td>{race.id}</td>
                <td>
                  {editingRaceId === race.id ? (
                    <input
                      type="text"
                      value={editRaceData.name || ''}
                      onChange={(e) => setEditRaceData({ ...editRaceData, name: e.target.value })}
                    />
                  ) : (
                    race.name
                  )}
                </td>
                <td>
                  {editingRaceId === race.id ? (
                    <input
                      type="date"
                      value={editRaceData.startDate || ''}
                      onChange={(e) => setEditRaceData({ ...editRaceData, startDate: e.target.value })}
                    />
                  ) : (
                    race.startDate || '-'
                  )}
                </td>
                <td>
                  {editingRaceId === race.id ? (
                    <input
                      type="date"
                      value={editRaceData.endDate || ''}
                      onChange={(e) => setEditRaceData({ ...editRaceData, endDate: e.target.value })}
                    />
                  ) : (
                    race.endDate || '-'
                  )}
                </td>
                <td>
                  {editingRaceId === race.id ? (
                    <select
                      value={editRaceData.categoryId || ''}
                      onChange={(e) => setEditRaceData({ ...editRaceData, categoryId: e.target.value ? parseInt(e.target.value) : null })}
                    >
                      <option value="">-- Selecteer --</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  ) : (
                    categories.find(c => c.id === race.categoryId)?.name || '-'
                  )}
                </td>
                <td>
                  {editingRaceId === race.id ? (
                    <input
                      type="number"
                      value={editRaceData.maxRiders || ''}
                      onChange={(e) => setEditRaceData({ ...editRaceData, maxRiders: parseInt(e.target.value) })}
                    />
                  ) : (
                    race.maxRiders || '-'
                  )}
                </td>
                <td>
                  {editingRaceId === race.id ? (
                    <span className={getStatusClass(getStatusByDate(editRaceData.startDate, editRaceData.endDate))}>
                      {getStatusByDate(editRaceData.startDate, editRaceData.endDate)}
                    </span>
                  ) : (
                    <span className={getStatusClass(race.status || getStatusByDate(race.startDate, race.endDate))}>
                      {race.status || getStatusByDate(race.startDate, race.endDate)}
                    </span>
                  )}
                </td>
                <td>
                  {editingRaceId === race.id ? (
                    <>
                      <button 
                        className="btn-edit"
                        onClick={() => saveEditRace(race.id)}
                      >
                        Opslaan
                      </button>
                      <button 
                        className="btn-delete"
                        onClick={() => setEditingRaceId(null)}
                      >
                        Annuleren
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        className="btn-edit"
                        onClick={() => startEditRace(race)}
                      >
                        Bewerk
                      </button>
                      <button 
                        className="btn-edit"
                        onClick={() => handleResultAction(race.id)}
                        title="Resultaat toevoegen"
                      >
                        Resultaat
                      </button>
                      <button 
                        className="btn-delete"
                        onClick={() => deleteRace(race.id)}
                      >
                        Verwijder
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          {totalPages > 1 && (
            <tfoot>
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '15px' }}>
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

      {showResultModal !== null && (
        <div className="result-modal-content">
          {showResultModal.type === 'existing' && (
            <>
              <h3>Resultaat beschikbaar</h3>
              <p>Deze race heeft al een resultaat in het systeem.</p>
              <p className="result-modal-message">
                Ga naar het <strong>Resultaten</strong> tabblad om de details te bekijken en te beheren.
              </p>
              <div className="result-modal-buttons">
                <button 
                  onClick={() => setShowResultModal(null)}
                  className="result-modal-close-btn"
                >
                  Sluiten
                </button>
              </div>
            </>
          )}

          {showResultModal.type === 'form' && (
            <>
              <h3>Resultaten invoeren</h3>
              <p className="result-modal-info">
                Race ID: <strong>{showResultModal.raceId}</strong> | Invoervelden: <strong>{showResultModal.pointsCount}</strong>
              </p>

              <div className="excel-import-section">
                <label className="excel-import-label">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleExcelImport}
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
                    {resultEntries.map((entry, idx) => {
                      const searchTerm = riderSearchFilters[idx] || '';
                      const normalizedSearch = normalizeText(searchTerm);
                      const filteredRiders = riders.filter(rider => {
                        const riderFullName = `${rider.firstnameWithoutSpecialChars || ''} ${rider.lastnameWithoutSpecialChars || ''}`.toLowerCase();
                        return riderFullName.includes(normalizedSearch);
                      });
                      const selectedRider = riders.find(r => r.id === entry.riderId);
                      
                      return (
                        <tr key={idx}>
                          <td><span className="result-entry-position">{idx + 1}</span></td>
                          <td className="result-entry-renner-cell">
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
                              className="result-entry-renner-input"
                            />
                            {openRiderDropdowns[idx] && (
                              <div className="result-entry-dropdown">
                                {filteredRiders.length === 0 ? (
                                  <div className="result-entry-dropdown-empty">Geen renners gevonden</div>
                                ) : (
                                  filteredRiders.map((rider) => (
                                    <div
                                      key={rider.id}
                                      onClick={() => {
                                        updateResultEntry(idx, 'riderId', rider.id);
                                        setRiderSearchFilters({...riderSearchFilters, [idx]: `${rider.firstname} ${rider.lastname}`});
                                        setOpenRiderDropdowns({...openRiderDropdowns, [idx]: false});
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

              <div className="result-modal-buttons">
                <button 
                  onClick={() => setShowResultModal(null)}
                  className="result-modal-cancel-btn"
                >
                  Annuleren
                </button>
                <button 
                  onClick={submitResults}
                  className="result-modal-save-btn"
                >
                  Opslaan
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {showResultModal !== null && (
        <div 
          className="result-modal-overlay"
          onClick={() => setShowResultModal(null)}
        />
      )}
    </div>
  );
}
