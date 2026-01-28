import { useState, useRef, useEffect } from 'react';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useResults } from '../hooks/useResults';
import { useRaces } from '../hooks/useRaces';
import { useRiders } from '../hooks/useRiders';
import { usePointsByCategory } from '../hooks/usePointsByCategory';
import { updateRidersPointsFromResults, removeRidersPointsFromResults, setRaceLeaderPoints, getRaceLeaderPointsForCategory } from '../services/riderService';
import { recalculateTeamPointsForRace } from '../services/resultsService';
import { getPointsByCategory } from '../services/pointsByCategoryService';
import '../css/resultsTab.css';

export default function ResultsTab() {
  const { results, loading: resultsLoading, editResult, deleteResult, addResult, reload: reloadResults } = useResults();
  const { races } = useRaces();
  const { riders, reload: reloadRiders } = useRiders();
  const { loadPointsForCategory } = usePointsByCategory();
  const reloadResultsRef = useRef(reloadResults);
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
  const [editRaceLeaderMode, setEditRaceLeaderMode] = useState(false);
  const [editRaceLeaderSearch, setEditRaceLeaderSearch] = useState('');
  const [editRaceLeaderDropdown, setEditRaceLeaderDropdown] = useState(false);
  const [approveRaceLeaderMode, setApproveRaceLeaderMode] = useState(false);
  const [approveRaceLeaderSearch, setApproveRaceLeaderSearch] = useState('');
  const [approveRaceLeaderDropdown, setApproveRaceLeaderDropdown] = useState(false);
  const [selectedEditRaceLeaderId, setSelectedEditRaceLeaderId] = useState(null);
  const [selectedApproveRaceLeaderId, setSelectedApproveRaceLeaderId] = useState(null);
  const [editRaceLeaderPoints, setEditRaceLeaderPoints] = useState(0);
  const [approveRaceLeaderPoints, setApproveRaceLeaderPoints] = useState(0);
  const resultsPerPage = 50;
  const fileInputRef = useRef(null);

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

      const raceCategoryRef = doc(db, 'raceCategories', String(race.categoryId));
      const raceCategoryDoc = await getDoc(raceCategoryRef);
      
      if (!raceCategoryDoc.exists()) {
        console.warn(`⚠️ Race category ${race.categoryId} not found`);
        return 0;
      }

      const categoryData = raceCategoryDoc.data();
      const raceLeaderCategoryId = categoryData.raceleaderCategory;
      console.log(`🏆 Race category ${race.categoryId} data:`, categoryData, '| raceleaderCategory:', raceLeaderCategoryId);

      if (!raceLeaderCategoryId) {
        console.log(`ℹ️ Race category ${race.categoryId} has no race leader category`);
        return 0;
      }

      // Get the race leader points from pointsPerCategory
      const pointsCategoryRef = doc(db, 'pointsPerCategory', String(raceLeaderCategoryId));
      const pointsCategoryDoc = await getDoc(pointsCategoryRef);

      if (!pointsCategoryDoc.exists()) {
        console.warn(`⚠️ Points category ${raceLeaderCategoryId} not found`);
        return 0;
      }

      const pointsCategoryData = pointsCategoryDoc.data();
      // First position (index 0) contains the race leader points
      const raceLeaderPoints = pointsCategoryData.points?.[0] || 0;

      console.log(`🏆 Race leader points for race ${raceId}: ${raceLeaderPoints} (category: ${race.categoryId}, pointsCategory: ${raceLeaderCategoryId})`);
      return raceLeaderPoints;
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
    setEditingId(result.id);
    setEditData({ ...result });
  };

  const openEditResult = async (result) => {
    console.log('🔍 openEditResult called with:', result);
    setEditingResult(result);
    
    // Reset search filters en race leader states
    const newSearchFilters = {};
    setEditRaceLeaderMode(false);
    setEditRaceLeaderSearch('');
    setEditRaceLeaderDropdown(false);
    setEditRaceLeaderPoints(0);  // Reset race leader points input
    // Set race leader from result.raceLeader field
    setSelectedEditRaceLeaderId(result.raceLeader || null);
    
    // Parse de renners uit het result object
    if (result.entries && Array.isArray(result.entries)) {
      console.log('✅ Entries gevonden:', result.entries);
      
      // Restore race leader flag from result.raceLeader field (for display purposes)
      const updatedEntries = result.entries.map(entry => ({
        ...entry,
        isRaceLeader: result.raceLeader && result.raceLeader === entry.riderId
      }));
      console.log('🏆 Restored race leader:', result.raceLeader, 'entries:', updatedEntries);
      
      setResultRenners(updatedEntries);
      
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
      setUploading(true);
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
          const oldRiderResultRef = doc(db, 'riders', oldRaceLeaderRiderId.toString(), 'riderResults', String(editingResult.raceId));
          const oldResultDoc = await getDoc(oldRiderResultRef);
          const oldRaceLeaderPoints = oldResultDoc.exists() ? (oldResultDoc.data().raceLeaderPoints || 0) : 0;
          
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
      
      setEditingResult(null);
      setResultRenners([]);
      setRiderSearchFilters({});
      setSelectedEditRaceLeaderId(null);
    } catch (error) {
      console.error('Error updating result:', error);
      alert('Fout bij bijwerken resultaat');
    } finally {
      setUploading(false);
    }
  };

  const approveResult = async (resultId) => {
    try {
      const result = results.find(r => r.id === resultId);
      if (!result) return;
      
      // Toon de approval modal
      setApprovingResult(result);
      setApproveRaceLeaderPoints(0);  // Reset race leader points input
      // Set race leader from result.raceLeader field
      setSelectedApproveRaceLeaderId(result.raceLeader || null);
      if (result.entries && Array.isArray(result.entries)) {
        // Restore race leader from result document
        const updatedEntries = result.entries.map(entry => ({
          ...entry,
          isRaceLeader: result.raceLeader && result.raceLeader === entry.riderId
        }));
        setApproveRenners(updatedEntries);
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
      setUploading(true);
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
      
      // Update riders' points based on their results - only add points when approving
      // NOTE: Race leader points are handled separately via setRaceLeaderPoints()
      if (approveRenners && approveRenners.length > 0) {
        const pointsData = approveRenners
          .filter(entry => entry.riderId && entry.points !== undefined)
          .map(entry => ({
            riderId: entry.riderId,
            points: Number(entry.points) || 0
          }));
        
        if (pointsData.length > 0) {
          console.log('➕ Adding approval points:', pointsData);
          await updateRidersPointsFromResults(pointsData, approvingResult.raceId);
          console.log('✅ Rijderspunten geupdate vanuit race resultaten met race history');
        }
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
      setApprovingResult(null);
      setApproveRenners([]);
      setApproveRiderSearchFilters({});
      setApproveOpenRiderDropdowns({});
      setSelectedApproveRaceLeaderId(null);
      setCurrentPage(1);
      
      console.log('✅ Uitslag goedgekeurd en UI gereset');
      alert('✅ Uitslag goedgekeurd!');
    } catch (error) {
      console.error('Error approving result:', error);
      alert('❌ Fout bij goedkeuren resultaat: ' + error.message);
    } finally {
      setUploading(false);
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

          {/* Race Leader Selector */}
          {editingResult && (
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
                        setEditRaceLeaderSearch(e.target.value);
                        setEditRaceLeaderDropdown(true);
                      }}
                      onFocus={() => setEditRaceLeaderDropdown(true)}
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
                                setSelectedEditRaceLeaderId(rider.id);
                                setEditRaceLeaderMode(false);
                                setEditRaceLeaderSearch('');
                                setEditRaceLeaderDropdown(false);
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
                      setEditRaceLeaderMode(false);
                      setEditRaceLeaderSearch('');
                      setEditRaceLeaderDropdown(false);
                    }}
                    style={{ marginTop: '10px' }}
                  >
                    Annuleren
                  </button>
                </div>
              ) : (
                <button
                  className="race-leader-btn"
                  onClick={() => setEditRaceLeaderMode(true)}
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
                      setSelectedEditRaceLeaderId(null);
                      setEditRaceLeaderPoints(0);
                    }}
                    style={{ marginLeft: '10px' }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          )}

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
              disabled={uploading}
            >
              {uploading ? '⏳ Opslaan...' : 'Opslaan'}
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

          {/* Race Leader Selector for Approve */}
          {approvingResult && (
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
                        setApproveRaceLeaderSearch(e.target.value);
                        setApproveRaceLeaderDropdown(true);
                      }}
                      onFocus={() => setApproveRaceLeaderDropdown(true)}
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
                                setSelectedApproveRaceLeaderId(rider.id);
                                setApproveRaceLeaderMode(false);
                                setApproveRaceLeaderSearch('');
                                setApproveRaceLeaderDropdown(false);
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
                      setApproveRaceLeaderMode(false);
                      setApproveRaceLeaderSearch('');
                      setApproveRaceLeaderDropdown(false);
                    }}
                    style={{ marginTop: '10px' }}
                  >
                    Annuleren
                  </button>
                </div>
              ) : (
                <button
                  className="race-leader-btn"
                  onClick={() => setApproveRaceLeaderMode(true)}
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
                      setSelectedApproveRaceLeaderId(null);
                      setApproveRaceLeaderPoints(0);
                    }}
                    style={{ marginLeft: '10px' }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="result-approve-buttons">
            <button 
              onClick={() => setApprovingResult(null)}
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
      )}

    </div>
  );
}
