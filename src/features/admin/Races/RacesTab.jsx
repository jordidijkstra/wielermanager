import { useEffect, useReducer } from 'react';
import { useAdminData } from '../Tools/AdminDataProvider';
import { useRacesCategories } from '../../../hooks/useRacesCategories';
import { usePointsByCategory } from '../../../hooks/usePointsByCategory';
import { saveRaceParticipants, getAllRaceParticipants } from '../../../services/raceService';
import { recalculateTeamPointsForRace } from '../../../services/resultsService';
import { getStatusByDate, safeDate } from '../../../utils/raceUtils';
import { INITIAL_STATE, reducer } from './RacesTab.reducer';
import '../../../css/racesTab.css';

// Sub-components
import RaceTable from './RaceTable';
import RaceResultModal from './RaceResultModal';
import RaceParticipantsModal from './RaceParticipantsModal';
import AddRaceForm from './AddRaceForm';
import { processResultsExcel, processParticipantsExcel } from './excelHandlers';
import { handleAddNewRace, handleSaveEditRace, handleDeleteRace } from './raceActions';


export default function RacesTab() {
  const { racesData, resultsData, ridersData } = useAdminData();
  const { races, loading: racesLoading, reload: reloadRaces, addRace, editRace, removeRace } = racesData;
  const { categories, loading: categoriesLoading } = useRacesCategories();
  const { results, addResult, reload: reloadResults } = resultsData;
  const { riders, reload: reloadRiders } = ridersData;
  const { loadPointsForCategory } = usePointsByCategory();
  
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  
  // Load race participants when component mounts
  useEffect(() => {
    const loadParticipants = async () => {
      try {
        const participantsMap = await getAllRaceParticipants();
        dispatch({ type: 'SET_RACE_PARTICIPANTS', payload: participantsMap });
      } catch (err) {
        console.error('Error loading race participants:', err);
      }
    };
    loadParticipants();
  }, []);

  // Handle Excel file import
  const handleExcelImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await processResultsExcel(file, state.data.resultEntries, state.search.riders, riders);
      if (result) {
        dispatch({ type: 'SET_RESULT_ENTRIES', payload: result.updatedEntries });
        dispatch({ type: 'SET_RIDER_SEARCH_FILTERS', payload: result.newSearchFilters });
        alert(`✅ Excel gegevens ingeladen! ${result.totalRows} rijen verwerkt, ${result.matchedCount} renners gevonden.`);
      }
    } catch (error) {
      console.error('Fout bij importeren Excel:', error);
      alert('❌ Fout bij importeren Excel-bestand');
    }
    event.target.value = '';
  };

  const addNewRace = () => {
    handleAddNewRace(state.forms.newRace, addRace, reloadRaces, dispatch);
  };

  const saveEditRace = (raceId) => {
    handleSaveEditRace(raceId, state.editing.data, editRace, reloadRaces, dispatch);
  };

  const deleteRace = (raceId) => {
    handleDeleteRace(raceId, removeRace, reloadRaces);
  };

  // Sorting logic
  const sortedRaces = (() => {
    // Enable map-sort-map pattern (Schwartzian transform) for better performance
    const mapped = races.map((race, index) => {
      const sDate = safeDate(race.startDate);
      const eDate = safeDate(race.endDate);
      const farFuture = new Date('9999-12-31').getTime();
      
      const isAK = race.name && race.name.toLowerCase().includes('algemeen klassement');
      const sortDate = (isAK ? (eDate || sDate) : sDate) || new Date(farFuture);
      
      const status = getStatusByDate(race.startDate, race.endDate);
      const isRaced = status === 'raced';

      return { index, race, sortDate: sortDate.getTime(), isRaced };
    });

    mapped.sort((a, b) => {
        if (a.isRaced && !b.isRaced) return 1;
        if (!a.isRaced && b.isRaced) return -1;
        return a.sortDate - b.sortDate;
    });

    return mapped.map(el => el.race);
  })();

  const { category: selectedCategoryFilter, search: searchTerm } = state.filters;
  const { current: currentPage, perPage: racesPerPage } = state.pagination;

  // Reset pagination when filters change
  useEffect(() => {
    dispatch({ type: 'SET_PAGE', payload: 1 });
  }, [selectedCategoryFilter, searchTerm]);

  // Filter by category and search term
  const filteredRaces = (() => {
    return sortedRaces.filter((race) => {
      const matchesCategory = !selectedCategoryFilter || race.categoryId === selectedCategoryFilter;
      const matchesSearch = !searchTerm || race.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  })();

  // Pagination logic
  const { totalPages, paginatedRaces } = (() => {
    const total = Math.ceil(filteredRaces.length / racesPerPage);
    const paginated = filteredRaces.slice(
      (currentPage - 1) * racesPerPage,
      currentPage * racesPerPage
    );
    return { totalPages: total, paginatedRaces: paginated };
  })();

  const goToPrevPage = () => {
    if (currentPage > 1) dispatch({ type: 'SET_PAGE', payload: currentPage - 1 });
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) dispatch({ type: 'SET_PAGE', payload: currentPage + 1 });
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
      dispatch({ 
        type: 'OPEN_RESULT_MODAL', 
        payload: { type: 'existing', raceId, resultId: result.id } 
      });
    } else {
      const categoryId = getRaceCategoryId(raceId);
      
      let points = [];
      if (categoryId) {
        points = await loadPointsForCategory(categoryId);
      }
      
      const emptyEntries = (points || []).map(pointValue => ({ 
        riderId: null, 
        points: pointValue,
        excelFullName: null
      }));
      
      dispatch({ type: 'SET_RESULT_ENTRIES', payload: emptyEntries });
      dispatch({ 
        type: 'OPEN_RESULT_MODAL', 
        payload: { type: 'form', raceId, pointsCount: emptyEntries.length } 
      });
    }
  };

  const handleParticipantsAction = (raceId) => {
    dispatch({ type: 'OPEN_PARTICIPANTS_MODAL', payload: raceId });
  };

  const handleParticipantsExcelImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await processParticipantsExcel(file, riders);
      if (result) {
        dispatch({ type: 'SET_PARTICIPANT_ENTRIES', payload: result.updatedEntries });
        dispatch({ type: 'SET_PARTICIPANT_SEARCH_FILTERS', payload: result.newSearchFilters });
        alert(`✅ Excel gegevens ingeladen! ${result.totalRows} rijen verwerkt, ${result.matchedCount} renners gevonden.`);
      }
    } catch (error) {
      console.error('Fout bij importeren Excel:', error);
      alert('❌ Fout bij importeren Excel-bestand');
    }
    event.target.value = '';
  };

  const submitParticipants = async () => {
    const raceId = state.modals.participants;
    
    // Valideer dat alle invoervelden ingevuld zijn
    const allFilled = state.data.participantEntries.every(entry => entry.riderId !== null);
    if (!allFilled) {
      alert('Alle renners moeten ingevuld zijn');
      return;
    }

    try {
      await saveRaceParticipants(raceId, state.data.participantEntries);
      
      // Update local state
      const updatedParticipants = {
        ...state.data.raceParticipants,
        [raceId]: state.data.participantEntries
      };
      
      dispatch({ type: 'SET_RACE_PARTICIPANTS', payload: updatedParticipants });
      
      dispatch({ type: 'CLOSE_PARTICIPANTS_MODAL' });
      alert('✅ Startlijst opgeslagen');
    } catch (error) {
      console.error('Error submitting participants:', error);
      alert('Fout bij opslaan startlijst');
    }
  };

  const submitResults = async () => {
    if (!state.modals.result) return;
    const raceId = state.modals.result.raceId;
    
    console.log('🔥 submitResults - raceId:', raceId);
    console.log('🔥 submitResults - resultEntries:', state.data.resultEntries);
    
    // Valideer dat alle invoervelden ingevuld zijn (riderId of waarschuwingstekst)
    const allFilled = state.data.resultEntries.every(entry => {
      const searchText = state.search.riders[state.data.resultEntries.indexOf(entry)];
      return entry.riderId !== null || (searchText && searchText.includes('renner bestaat niet in wielermanager'));
    });
    if (!allFilled) {
      alert('Vul alle renners in');
      return;
    }

    try {
      // Remove isRaceLeader field from entries (UI-only property)
      const cleanEntries = state.data.resultEntries.map(({ isRaceLeader, ...entry }) => entry);
      const dataToSave = { raceId, status: 'ingediend', entries: cleanEntries };
      console.log('💾 Data to save:', dataToSave);
      
      const newResultId = await addResult(dataToSave);
      console.log('✅ Resultaat toegevoegd met ID:', newResultId);

      // Don't assign points yet - points are only assigned when result is approved
      // (in ResultsTab confirmApproveResult)
      console.log('ℹ️ Resultaat ingediend - punten worden toegekend bij goedkeuring');
      
      // Recalculate team points for all users for this race
      await recalculateTeamPointsForRace(raceId, races);
      console.log('✅ Team punten per stage herberekend voor alle gebruikers');
      
      // Reload caches to ensure all data is fresh
      try {
        await reloadRiders();
        console.log('✅ Renners cache gecleared');
      } catch (err) {
        console.error('Error reloading riders:', err);
      }
      
      try {
        await reloadResults();
        console.log('✅ Resultaten cache gecleared');
      } catch (err) {
        console.error('Error reloading results:', err);
      }
      
      dispatch({ type: 'CLOSE_RESULT_MODAL' });
      console.log('✅ Resultaten ingevoerd voor race:', raceId);
      alert('✅ Resultaten succesvol opgeslagen!');
    } catch (error) {
      console.error('Error submitting results:', error);
      alert('Fout bij opslaan resultaten');
    }
  };

  if (racesLoading) return <div><p>Races laden...</p></div>;

  return (
    <div className="tab-content">
      <h2>Races beheren</h2>
      
      <div className="races-filters-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div className="filters-left" style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-box">
            <input
              type="text"
              placeholder="Zoek op racenaam..."
              value={searchTerm}
              onChange={(e) => dispatch({ type: 'SET_SEARCH_TERM', payload: e.target.value })}
              className="search-input"
            />
          </div>

          <div className="category-filter">
            <label htmlFor="category-filter" style={{ marginRight: '10px' }}>Filter:</label>
            <select
              id="category-filter"
              value={selectedCategoryFilter || ''}
              onChange={(e) => dispatch({ type: 'SET_CATEGORY_FILTER', payload: e.target.value ? parseInt(e.target.value) : null })}
            >
              <option value="">-- Alle categorieën --</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="filters-right" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <span className="stats-text">Totaal: <strong>{filteredRaces.length}</strong></span>
          <button 
            className="btn-add-rider"
            onClick={() => dispatch({ type: 'TOGGLE_ADD_FORM' })}
          >
            {state.ui.showAddForm ? 'Annuleren' : '+ Nieuwe race'}
          </button>
        </div>
      </div>

      {state.ui.showAddForm && (
        <AddRaceForm 
            formData={state.forms.newRace}
            dispatch={dispatch}
            categories={categories}
            categoriesLoading={categoriesLoading}
            onSave={addNewRace}
        />
      )}

      <RaceTable
        races={paginatedRaces}
        editingState={state.editing}
        categories={categories}
        results={results}
        participantsMap={state.data.raceParticipants}
        dispatch={dispatch}
        onSaveEdit={saveEditRace}
        onDelete={deleteRace}
        onResultAction={handleResultAction}
        onParticipantsAction={handleParticipantsAction}
        pagination={{
            currentPage,
            totalPages,
            onGoToPage: (page) => dispatch({ type: 'SET_PAGE', payload: page }),
            onPrevPage: goToPrevPage,
            onNextPage: goToNextPage
        }}
      />

      <RaceResultModal
        isOpen={state.modals.result !== null}
        onClose={() => dispatch({ type: 'CLOSE_RESULT_MODAL' })}
        modalData={state.modals.result}
        entries={state.data.resultEntries}
        searchFilters={state.search.riders}
        openDropdowns={state.ui.openRiderDropdowns}
        riders={riders}
        dispatch={dispatch}
        onSubmit={submitResults}
        onExcelImport={handleExcelImport}
      />

      <RaceParticipantsModal
        isOpen={state.modals.participants !== null}
        onClose={() => dispatch({ type: 'CLOSE_PARTICIPANTS_MODAL' })}
        raceId={state.modals.participants}
        entries={state.data.participantEntries}
        searchFilters={state.search.participants}
        openDropdowns={state.ui.openParticipantDropdowns}
        riders={riders}
        dispatch={dispatch}
        onSubmit={submitParticipants}
        onExcelImport={handleParticipantsExcelImport}
      />
    </div>
  );
}
