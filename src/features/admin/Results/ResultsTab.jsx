import { useRef, useEffect, useReducer } from 'react';
import { useResults } from '../../../hooks/useResults';
import { useRaces } from '../../../hooks/useRaces';
import { useRiders } from '../../../hooks/useRiders';
import { updateRidersPointsFromResults, removeRidersPointsFromResults, setRaceLeaderPoints, getRaceLeaderPointsForCategory, getRiderResult } from '../../../services/riderService';
import { recalculateTeamPointsForRace } from '../../../services/resultsService';
import { INITIAL_STATE, reducer } from './ResultsTab.reducer';
import { EditResultModal } from './EditResultModal';
import { ApproveResultModal } from './ApproveResultModal';
import { ResultsTable } from './ResultsTable';
import '../../../css/resultsTab.css';

export default function ResultsTab() {
  const { results, loading: resultsLoading, editResult, deleteResult, reload: reloadResults } = useResults();
  const { races } = useRaces();
  const { riders, reload: reloadRiders } = useRiders();
  const reloadResultsRef = useRef(reloadResults);
  const resultsPerPage = 50;

  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const {
      editingId, editData, uploading, currentPage,
      editingResult, resultRenners, riderSearchFilters, openRiderDropdowns,
      approvingResult, approveRenners, approveRiderSearchFilters, approveOpenRiderDropdowns,
      approveEditingIndex,
      editRaceLeaderMode, editRaceLeaderSearch, editRaceLeaderDropdown, selectedEditRaceLeaderId,
      approveRaceLeaderMode, approveRaceLeaderSearch, approveRaceLeaderDropdown, selectedApproveRaceLeaderId
  } = state;

  // Update ref whenever reloadResults changes
  useEffect(() => {
    reloadResultsRef.current = reloadResults;
  }, [reloadResults]);

  // Auto-reload results when component becomes visible/active
  useEffect(() => {
    const reloadResultsData = async () => {
      try {
        console.log('🔄 Bezig met herladen van resultaten...');
        await reloadResultsRef.current();
        console.log('✅ Resultaten cache opnieuw geladen');
      } catch (error) {
        console.error('Error reloading results:', error);
      }
    };
    
    // Use a small delay to ensure tab is fully switched
    const timer = setTimeout(() => {
      reloadResultsData();
    }, 150);
    
    return () => clearTimeout(timer);
  }, []);

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


  /**
   * Get race leader points for a given race
   * Gets the race's category and checks if it has raceLeaderCategorie
   * Then fetches the points from pointsPerCategory
   */
  const getRaceLeaderPointsForRace = async (raceId) => {
    if (!raceId) {
      console.warn('⚠️ No race ID provided');
      return 0;
    }

    try {
      // Get the race
      const race = races.find(r => r.id === raceId);
      if (!race) {
        console.warn(`⚠️ Race ${raceId} not found`);
        return 0;
      }

      // Get the race's category
      if (!race.categoryId) {
        console.log(`ℹ️ Race ${raceId} has no category`);
        return 0;
      }

      return await getRaceLeaderPointsForCategory(race.categoryId);
    } catch (error) {
      console.error(`Error getting race leader points for race ${raceId}:`, error);
      return 0;
    }
  };

  const saveEdit = async (resultId) => {
    try {
      await editResult(resultId, {
        raceId: editData.raceId,
        status: editData.status
      });
      
      // Cache clearing
      await reloadRiders();
      console.log('✅ Renners cache gecleared');
      await reloadResults();
      console.log('✅ Resultaten cache gecleared');
      
      dispatch({ type: 'CANCEL_INLINE_EDIT' });
      console.log('✅ Resultaat bijgewerkt');
    } catch (error) {
      console.error('Error updating result:', error);
      alert('Fout bij bijwerken resultaat');
    }
  };

  const removeResult = async (resultId) => {
    if (confirm('Zeker weten dat je dit resultaat wilt verwijderen?')) {
      try {
        // Find the result first to get the entries with points
        const result = results.find(r => r.id === resultId);
        
        // Remove riders' points if this result was approved
        if (result && result.status === 'gecontrolleerd' && result.entries && result.entries.length > 0) {
          const pointsData = result.entries
            .filter(entry => entry.riderId && entry.points !== undefined)
            .map(entry => ({
              riderId: entry.riderId,
              points: Number(entry.points) || 0
            }));
          
          if (pointsData.length > 0) {
            await removeRidersPointsFromResults(pointsData);
            console.log('✅ Rijderspunten verwijderd');
          }
        }
        
        // Delete the result
        await deleteResult(resultId);
        console.log('✅ Resultaat verwijderd');
        
        // Reload caches to ensure all data is fresh
        await reloadRiders();
        console.log('✅ Renners cache gecleared');
        await reloadResults();
        console.log('✅ Resultaten cache gecleared');
      } catch (error) {
        console.error('Error deleting result:', error);
        alert('Fout bij verwijderen resultaat');
      }
    }
  };

  const startEdit = (result) => {
    dispatch({ type: 'START_INLINE_EDIT', payload: result });
  };

  const openEditResult = async (result) => {
    console.log('🔍 openEditResult called with:', result);
    // setEditingResult(result); REMOVED
    
    // Reset search filters en race leader states
    const newSearchFilters = {};
    // setEditRaceLeaderMode(false); REMOVED
    // ... all reset logic is now in reducer ...
    // setEditRaceLeaderPoints(0);  // Reset race leader points input
    // Set race leader from result.raceLeader field
    // setSelectedEditRaceLeaderId(result.raceLeader || null); REMOVED
    
    // Parse de renners uit het result object
    let updatedEntries = []; // Changed to local var
    if (result.entries && Array.isArray(result.entries)) {
      console.log('✅ Entries gevonden:', result.entries);
      
      // Restore race leader flag from result.raceLeader field (for display purposes)
      updatedEntries = result.entries.map(entry => ({
        ...entry,
        isRaceLeader: result.raceLeader && result.raceLeader === entry.riderId
      }));
      console.log('🏆 Restored race leader:', result.raceLeader, 'entries:', updatedEntries);
      
      // setResultRenners(updatedEntries); REMOVED
      
      // Vul de search filters met de namen van geselecteerde renners
      updatedEntries.forEach((entry, idx) => {
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
      // setResultRenners([]); REMOVED
    }
    
    // setRiderSearchFilters(newSearchFilters); REMOVED
    
    dispatch({
        type: 'OPEN_EDIT_RESULT',
        payload: {
            result,
            resultRenners: updatedEntries,
            filters: newSearchFilters
        }
    });
  };

  const updateResultRenner = (index, riderId) => {
    const updated = [...resultRenners];
    updated[index] = { ...updated[index], riderId };
    dispatch({ type: 'UPDATE_RESULT_RENNERS', payload: updated });
  };

  const saveEditResult = async () => {
    if (!editingResult) return;
    
    console.log('💾 Saving result with entries:', resultRenners);
    
    try {
      dispatch({ type: 'SET_UPLOADING', payload: true });
      // Check if this is a stage (has tourId)
      const race = races.find(r => r.id === editingResult.raceId);
      const isStage = race && race.tourId != null;
      console.log('🏁 Race check - isStage:', isStage, 'race:', race);
      
      // Get race leader points dynamically via raceLeaderCategorie
      let raceLeaderPoints = 0;
      if (isStage && selectedEditRaceLeaderId) {
        raceLeaderPoints = await getRaceLeaderPointsForRace(editingResult.raceId);
        console.log('🏆 Race leader points for race:', raceLeaderPoints);
      }
      
      // Get race leader ID from separate state (can be any rider, not necessarily in entries)
      const raceLeaderRiderId = selectedEditRaceLeaderId || null;
      console.log('🏆 Race leader riderId:', raceLeaderRiderId);
      
      // Only process entries that have actually changed
      const oldEntriesMap = new Map((editingResult.entries || []).map(e => [e.riderId?.toString(), e]));
      const newEntriesMap = new Map(resultRenners.map(e => [e.riderId?.toString(), e]));
      
      // Find entries that were removed or changed
      const pointsToRemove = [];
      for (const [riderId, oldEntry] of oldEntriesMap) {
        const newEntry = newEntriesMap.get(riderId);
        if (!newEntry) {
          // Entry was removed
          pointsToRemove.push({ riderId, points: Number(oldEntry.points) || 0 });
        } else if (Number(newEntry.points) !== Number(oldEntry.points)) {
          // Points changed - remove old, add new difference
          const difference = Number(oldEntry.points) || 0;
          pointsToRemove.push({ riderId, points: difference });
        }
      }
      
      // Find entries that are new or changed
      const pointsToAdd = [];
      for (const [riderId, newEntry] of newEntriesMap) {
        const oldEntry = oldEntriesMap.get(riderId);
        if (!oldEntry) {
          // New entry
          pointsToAdd.push({ riderId, points: Number(newEntry.points) || 0 });
        } else if (Number(newEntry.points) !== Number(oldEntry.points)) {
          // Points changed - add only the difference
          const difference = Number(newEntry.points) - (Number(oldEntry.points) || 0);
          pointsToAdd.push({ riderId, points: difference });
        }
      }
      
      // Remove changed/deleted points
      if (pointsToRemove.length > 0) {
        console.log('🔄 Removing changed/deleted points:', pointsToRemove);
        await removeRidersPointsFromResults(pointsToRemove, editingResult.raceId);
        console.log('✅ Oude punten verwijderd');
      }
      
      // Update the result document
      // Remove isRaceLeader field from entries (UI-only property)
      // NOTE: Race leader is stored in separate 'raceLeader' field - don't filter from entries
      const cleanEntries = resultRenners
        .map(({ isRaceLeader, ...entry }) => entry);
      await editResult(editingResult.id, {
        raceId: editingResult.raceId,
        raceName: editingResult.raceName,
        date: editingResult.date,
        status: editingResult.status,
        entries: cleanEntries,
        raceLeader: raceLeaderRiderId  // Separate field for race leader
      });
      console.log('✅ Resultaat met renners en race leader bijgewerkt');
      
      // Add new/changed points
      if (pointsToAdd.length > 0) {
        console.log('➕ Adding new/changed points:', pointsToAdd);
        await updateRidersPointsFromResults(pointsToAdd, editingResult.raceId);
        console.log('✅ Nieuwe punten toegekend vanuit bewerkte resultaten');
      }
      
      // Award/remove race leader points (only for stages AND only if race leader changed)
      if (isStage && raceLeaderPoints > 0) {
        // Get old race leader data if this result was edited before
        let oldRaceLeaderRiderId = editingResult.raceLeader || null;
        
        // Only process if race leader actually changed
        if (oldRaceLeaderRiderId !== raceLeaderRiderId) {
          // If race leader changed, remove old points first
          if (oldRaceLeaderRiderId) {
            console.log(`🏆 Removing race leader points from old leader ${oldRaceLeaderRiderId}`);
            await setRaceLeaderPoints(oldRaceLeaderRiderId, 0, editingResult.raceId, getRaceName(editingResult.raceId), 0);
          }
          
          // Set new race leader points
          if (raceLeaderRiderId) {
            console.log(`🏆 Setting race leader points - riderId: ${raceLeaderRiderId}, points: ${raceLeaderPoints}, raceId: ${editingResult.raceId}`);
            await setRaceLeaderPoints(raceLeaderRiderId, raceLeaderPoints, editingResult.raceId, getRaceName(editingResult.raceId), 0);
            console.log(`✅ Race leader punten ingesteld voor renner ${raceLeaderRiderId}`);
          }
        } else {
          // Race leader unchanged - no action needed
          console.log(`ℹ️ Race leader niet gewijzigd (${raceLeaderRiderId}), geen punten aanpassing`);
        }
      } else if (isStage && editingResult.raceLeader && !raceLeaderRiderId) {
        // Race leader was removed (no new race leader)
        const oldRaceLeaderRiderId = editingResult.raceLeader;
        
        // Get the old race leader's current race leader points
        try {
          const oldResult = await getRiderResult(oldRaceLeaderRiderId, editingResult.raceId);
          const oldRaceLeaderPoints = oldResult ? (oldResult.raceLeaderPoints || 0) : 0;
          
          console.log(`🏆 Removing race leader points from ${oldRaceLeaderRiderId} (was: ${oldRaceLeaderPoints})`);
          await setRaceLeaderPoints(oldRaceLeaderRiderId, 0, editingResult.raceId, getRaceName(editingResult.raceId), oldRaceLeaderPoints);
        } catch (error) {
          console.error(`❌ Error removing race leader points from ${oldRaceLeaderRiderId}:`, error);
        }
      }
      
      // Recalculate team points for all users for this race
      if (editingResult.raceId) {
        await recalculateTeamPointsForRace(editingResult.raceId, races);
        console.log('✅ Team punten per stage herberekend voor alle gebruikers');
      }
      
      // Reload caches to ensure all data is fresh
      await reloadRiders();
      console.log('✅ Renners cache gecleared');
      await reloadResults();
      console.log('✅ Resultaten cache gecleared');
      
      dispatch({ type: 'CLOSE_EDIT_RESULT' });
    } catch (error) {
      console.error('Error updating result:', error);
      alert('Fout bij bijwerken resultaat');
    } finally {
      dispatch({ type: 'SET_UPLOADING', payload: false });
    }
  };

  const approveResult = async (resultId) => {
    try {
      const result = results.find(r => r.id === resultId);
      if (!result) return;
      
      // Toon de approval modal
      // setApprovingResult(result); REMOVED
      // setApproveRaceLeaderPoints(0);  // Reset race leader points input
      // Set race leader from result.raceLeader field
      // setSelectedApproveRaceLeaderId(result.raceLeader || null); REMOVED

      let updatedEntries = [];
      if (result.entries && Array.isArray(result.entries)) {
        // Restore race leader from result document
        updatedEntries = result.entries.map(entry => ({
          ...entry,
          isRaceLeader: result.raceLeader && result.raceLeader === entry.riderId
        }));
        // setApproveRenners(updatedEntries); REMOVED
      } else {
        // setApproveRenners([]); REMOVED
      }

      dispatch({
        type: 'OPEN_APPROVE_RESULT',
        payload: {
            result,
            resultRenners: updatedEntries
        }
      });
    } catch (error) {
      console.error('Error preparing approval:', error);
      alert('Fout bij voorbereiding goedkeuring');
    }
  };

  const confirmApproveResult = async () => {
    if (!approvingResult) return;
    
    try {
      dispatch({ type: 'SET_UPLOADING', payload: true });
      console.log('Goedkeuren resultaat:', approvingResult.id);
      
      // Check if this is a stage (has tourId)
      const race = races.find(r => r.id === approvingResult.raceId);
      const isStage = race && race.tourId != null;
      
      // Get race leader points dynamically via raceLeaderCategorie
      let raceLeaderPoints = 0;
      if (isStage && selectedApproveRaceLeaderId) {
        raceLeaderPoints = await getRaceLeaderPointsForRace(approvingResult.raceId);
        console.log('🏆 Race leader points for race:', raceLeaderPoints);
      }
      
      // Get race leader ID from separate state (can be any rider, not necessarily in entries)
      const raceLeaderRiderId = selectedApproveRaceLeaderId || null;
      console.log('🏆 Approve - Race leader riderId:', raceLeaderRiderId);
      
      // Zorg ervoor dat status op 'gecontrolleerd' staat
      // Remove isRaceLeader field from entries (UI-only property)
      // NOTE: Race leader is stored in separate 'raceLeader' field - don't filter from entries
      const cleanEntries = approveRenners
        .map(({ isRaceLeader, ...entry }) => entry);
      const updatedResult = {
        raceId: approvingResult.raceId,
        raceName: approvingResult.raceName,
        date: approvingResult.date,
        entries: cleanEntries,
        raceLeader: raceLeaderRiderId,  // Separate field for race leader
        status: 'gecontrolleerd'
      };
      
      console.log('Updated result with status:', updatedResult);
      
      // Update the result in Firestore
      const result = await editResult(approvingResult.id, updatedResult);
      console.log('✅ Result opgeslagen in Firestore');
      
      // Update riders' points based on their results - only add points when approving for the FIRST TIME
      // NOTE: Race leader points are handled separately via setRaceLeaderPoints()
      // Only add points if result was previously NOT approved (status was 'ingediend' or 'nog geen resultaat')
      if (approvingResult.status !== 'gecontrolleerd' && approveRenners && approveRenners.length > 0) {
        const pointsData = approveRenners
          .filter(entry => entry.riderId && entry.points !== undefined)
          .map(entry => ({
            riderId: entry.riderId,
            points: Number(entry.points) || 0
          }));
        
        if (pointsData.length > 0) {
          console.log('➕ Adding approval points (first approval):', pointsData);
          await updateRidersPointsFromResults(pointsData, approvingResult.raceId);
          console.log('✅ Rijderspunten geupdate vanuit race resultaten met race history');
        }
      } else if (approvingResult.status === 'gecontrolleerd') {
        console.log('ℹ️ Result already approved, skipping point addition (points already assigned)');
      }
      
      // Award/remove race leader points (only for stages)
      if (isStage && raceLeaderPoints > 0) {
        // Get old race leader data if this result was edited before
        let oldRaceLeaderRiderId = null;
        if (approvingResult.raceLeader) {
          oldRaceLeaderRiderId = approvingResult.raceLeader;
        }
        
        // If race leader changed, remove old points first
        if (oldRaceLeaderRiderId && oldRaceLeaderRiderId !== raceLeaderRiderId) {
          console.log(`🏆 Removing race leader points from old leader ${oldRaceLeaderRiderId}`);
          await setRaceLeaderPoints(oldRaceLeaderRiderId, 0, approvingResult.raceId, getRaceName(approvingResult.raceId), 0);
        }
        
        // Set new race leader points
        if (raceLeaderRiderId) {
          console.log(`🏆 Setting race leader points - riderId: ${raceLeaderRiderId}, points: ${raceLeaderPoints}, raceId: ${approvingResult.raceId}`);
          await setRaceLeaderPoints(raceLeaderRiderId, raceLeaderPoints, approvingResult.raceId, getRaceName(approvingResult.raceId), 0);
          console.log(`✅ Race leader punten ingesteld voor renner ${raceLeaderRiderId}`);
        } else if (oldRaceLeaderRiderId) {
          // Race leader was removed
          console.log(`🏆 Removing race leader points from ${oldRaceLeaderRiderId}`);
          await setRaceLeaderPoints(oldRaceLeaderRiderId, 0, approvingResult.raceId, getRaceName(approvingResult.raceId), 0);
        }
      } else if (isStage && approvingResult.raceLeader && !raceLeaderRiderId) {
        // Race leader was removed (no new race leader)
        const oldRaceLeaderRiderId = approvingResult.raceLeader;
        console.log(`🏆 Removing race leader points from ${oldRaceLeaderRiderId}`);
        await setRaceLeaderPoints(oldRaceLeaderRiderId, 0, approvingResult.raceId, getRaceName(approvingResult.raceId), 0);
      }
      
      // Reload caches to ensure all data is fresh
      await reloadRiders();
      console.log('✅ Renners cache gecleared');
      await reloadResults();
      console.log('✅ Resultaten cache gecleared');
      
      // Reset alle states
      dispatch({ type: 'CLOSE_APPROVE_RESULT' });
      dispatch({ type: 'SET_CURRENT_PAGE', payload: 1 });
      
      console.log('✅ Uitslag goedgekeurd en UI gereset');
      alert('✅ Uitslag goedgekeurd!');
    } catch (error) {
      console.error('Error approving result:', error);
      alert('❌ Fout bij goedkeuren resultaat: ' + error.message);
    } finally {
      dispatch({ type: 'SET_UPLOADING', payload: false });
    }
  };

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

  // Sort results by race endDate
  const sortedResults = [...results].sort((a, b) => {
      // Sort by ID descending (newest/highest ID first)
      return Number(b.id) - Number(a.id);
  });

  // Pagination logic
  const totalPages = Math.ceil(sortedResults.length / resultsPerPage);
  const paginatedResults = sortedResults.slice(
    (currentPage - 1) * resultsPerPage,
    currentPage * resultsPerPage
  );

  const goToPrevPage = () => {
    if (currentPage > 1) dispatch({ type: 'SET_CURRENT_PAGE', payload: currentPage - 1 });
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) dispatch({ type: 'SET_CURRENT_PAGE', payload: currentPage + 1 });
  };

  if (resultsLoading) return <div><p>Resultaten laden...</p></div>;

  return (
    <div className="tab-content">
      <h2>Resultaten beheren</h2>

      <div className="admin-controls" style={{ marginBottom: '20px' }}>
        <button 
          className="btn-reload"
          onClick={() => {
            console.log('🔄 Manual refresh triggered');
            reloadResultsRef.current();
          }}
          disabled={uploading}
          title="Ververs resultaten"
        >
          <i className="fas fa-sync-alt"></i> Ververs
        </button>
      </div>

      <div className="admin-stats">
        <p>Totaal resultaten: <strong>{results.length}</strong></p>
      </div>

      <ResultsTable
        sortedResults={sortedResults}
        paginatedResults={paginatedResults}
        editingId={editingId}
        editData={editData}
        races={races}
        dispatch={dispatch}
        saveEdit={saveEdit}
        openEditResult={openEditResult}
        approveResult={approveResult}
        removeResult={removeResult}
        currentPage={currentPage}
        totalPages={totalPages}
        goToPrevPage={goToPrevPage}
        goToNextPage={goToNextPage}
        getRaceName={getRaceName}
        getRaceStartDate={getRaceStartDate}
        getRaceEndDate={getRaceEndDate}
        formatDate={formatDate}
      />

      <EditResultModal
        editingResult={editingResult}
        resultRenners={resultRenners}
        riders={riders}
        riderSearchFilters={riderSearchFilters}
        openRiderDropdowns={openRiderDropdowns}
        editRaceLeaderMode={editRaceLeaderMode}
        editRaceLeaderSearch={editRaceLeaderSearch}
        editRaceLeaderDropdown={editRaceLeaderDropdown}
        selectedEditRaceLeaderId={selectedEditRaceLeaderId}
        dispatch={dispatch}
        saveEditResult={saveEditResult}
        uploading={uploading}
        getRaceName={getRaceName}
        normalizeText={normalizeText}
      />

      <ApproveResultModal
        approvingResult={approvingResult}
        approveRenners={approveRenners}
        riders={riders}
        approveRiderSearchFilters={approveRiderSearchFilters}
        approveOpenRiderDropdowns={approveOpenRiderDropdowns}
        approveEditingIndex={approveEditingIndex}
        approveRaceLeaderMode={approveRaceLeaderMode}
        approveRaceLeaderSearch={approveRaceLeaderSearch}
        approveRaceLeaderDropdown={approveRaceLeaderDropdown}
        selectedApproveRaceLeaderId={selectedApproveRaceLeaderId}
        dispatch={dispatch}
        confirmApproveResult={confirmApproveResult}
        uploading={uploading}
        getRaceName={getRaceName}
        normalizeText={normalizeText}
      />

    </div>
  );
}
