import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { collection, getDocs, doc, setDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getAllRaces } from '../services/raceService';
import { getAllRiders } from '../services/riderService';
import '../css/participantsTab.css';

export default function ParticipantsTab() {
  const [races, setRaces] = useState([]);
  const [riders, setRiders] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRaceId, setSelectedRaceId] = useState(null);
  const [editingRaceId, setEditingRaceId] = useState(null);
  const [editData, setEditData] = useState({});
  const [approvingRaceId, setApprovingRaceId] = useState(null);
  const [riderSearchFilters, setRiderSearchFilters] = useState({});
  const [openRiderDropdowns, setOpenRiderDropdowns] = useState({});

  // Load all races and participants
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const allRaces = await getAllRaces();
        setRaces(allRaces);
        
        const allRiders = await getAllRiders();
        setRiders(allRiders);
        
        // Load participants for all races
        const participantsSnapshot = await getDocs(collection(db, 'raceParticipants'));
        const participantsMap = {};
        participantsSnapshot.docs.forEach(doc => {
          participantsMap[doc.id] = {
            raceId: doc.id,
            status: doc.data().status || 'ingediend',
            participants: doc.data().participants || [],
            submittedAt: doc.data().submittedAt,
            approvedAt: doc.data().approvedAt
          };
        });
        setParticipants(Object.values(participantsMap));
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Helper function to normalize text (remove diacritics and special characters)
  const normalizeText = (text) => {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .toLowerCase();
  };

  const getRaceName = (raceId) => {
    return races.find(r => String(r.id) === String(raceId))?.name || `Race ${raceId}`;
  };

  const getRiderName = (riderId) => {
    const rider = riders.find(r => r.id === riderId);
    if (rider) {
      return `${rider.firstname} ${rider.lastname}`;
    }
    return `Renner ${riderId}`;
  };

  const getRaceStartDate = (raceId) => {
    return races.find(r => r.id === raceId)?.startDate || '';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('nl-NL', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const handleExcelImportParticipants = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        const updatedParticipants = [];
        const seenRiderIds = new Set();
        const duplicates = [];
        let matchedCount = 0;
        
        rows.forEach((row, rowIdx) => {
          const fullName = String(row[0] || '').trim();

          if (!fullName) return; // Skip empty rows

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
            // Check for duplicates
            if (seenRiderIds.has(matchedRider.id)) {
              duplicates.push(`${matchedRider.firstname} ${matchedRider.lastname} (rij ${rowIdx + 1})`);
              return;
            }
            
            seenRiderIds.add(matchedRider.id);
            updatedParticipants.push({ riderId: matchedRider.id });
            matchedCount++;
            console.log(`✅ Gevonden: "${fullName}" -> ${matchedRider.firstname} ${matchedRider.lastname}`);
          } else {
            console.log(`⚠️ Niet gevonden: "${fullName}"`);
          }
        });

        if (duplicates.length > 0) {
          const duplicateList = duplicates.join('\n');
          alert(`❌ Dubbele renners gevonden:\n\n${duplicateList}\n\nZe zijn niet toegevoegd. Controleer het Excel-bestand.`);
          return;
        }

        if (matchedCount === 0) {
          alert('❌ Geen renners gevonden in het Excel-bestand');
          return;
        }

        setEditData({
          ...editData,
          participants: updatedParticipants
        });

        alert(`✅ Excel gegevens ingeladen! ${matchedCount} renners toegevoegd.`);
      } catch (error) {
        console.error('Fout bij importeren Excel:', error);
        alert('❌ Fout bij importeren Excel-bestand');
      }
    };
    
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  };

  const getFilteredRiders = (index) => {
    const searchText = riderSearchFilters[index] || '';
    if (!searchText) return [];

    const normalizedSearch = normalizeText(searchText);
    return riders.filter(rider => {
      const riderFullname = normalizeText(
        `${rider.firstname || ''} ${rider.lastname || ''}`
      );
      return riderFullname.includes(normalizedSearch);
    });
  };

  const handleApproveParticipants = async (raceId) => {
    try {
      setApprovingRaceId(null);
      const updatedData = {
        participants: participants.find(p => p.raceId === raceId)?.participants || [],
        status: 'definitief',
        approvedAt: new Date().toISOString(),
        submittedAt: participants.find(p => p.raceId === raceId)?.submittedAt
      };

      await setDoc(doc(db, 'raceParticipants', raceId), updatedData);

      // Update local state
      setParticipants(
        participants.map(p =>
          p.raceId === raceId ? { ...p, ...updatedData } : p
        )
      );
      alert('✅ Startlijst definitief doorgegeven');
    } catch (err) {
      console.error('Error approving participants:', err);
      alert('Fout bij goedkeuren startlijst');
    }
  };

  const handleDeleteParticipants = async (raceId) => {
    if (!window.confirm('Wil je deze startlijst verwijderen?')) return;

    try {
      await deleteDoc(doc(db, 'raceParticipants', raceId));
      setParticipants(participants.filter(p => p.raceId !== raceId));
      alert('✅ Startlijst verwijderd');
    } catch (err) {
      console.error('Error deleting participants:', err);
      alert('Fout bij verwijderen startlijst');
    }
  };

  const handleStartEdit = (participantData) => {
    setEditingRaceId(participantData.raceId);
    setEditData({ ...participantData });
    
    // Populate rider search filters with existing rider names
    const newFilters = {};
    participantData.participants?.forEach((p, idx) => {
      if (p.riderId) {
        newFilters[idx] = getRiderName(p.riderId);
      }
    });
    setRiderSearchFilters(newFilters);
  };

  const saveEdit = async (raceId) => {
    try {
      const updatedData = {
        participants: editData.participants || [],
        status: editData.status
      };

      // Only include timestamps if they exist
      if (editData.submittedAt) {
        updatedData.submittedAt = editData.submittedAt;
      }
      if (editData.approvedAt) {
        updatedData.approvedAt = editData.approvedAt;
      }

      await setDoc(doc(db, 'raceParticipants', raceId), updatedData);

      // Update local state
      setParticipants(
        participants.map(p =>
          p.raceId === raceId ? { ...p, ...updatedData } : p
        )
      );
      setEditingRaceId(null);
      alert('✅ Startlijst bijgewerkt');
    } catch (err) {
      console.error('Error saving participants:', err);
      alert('Fout bij opslaan startlijst');
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'ingediend':
        return '#fca311';
      case 'definitief':
        return '#28a745';
      default:
        return '#999';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'ingediend':
        return '📋 Ingediend';
      case 'definitief':
        return '✅ Definitief';
      default:
        return status;
    }
  };

  if (loading) return <div className="tab-content">Laden...</div>;

  if (participants.length === 0) {
    return (
      <div className="tab-content">
        <h2>📋 Startlijsten</h2>
        <p className="no-data-message">Geen startlijsten ingediend</p>
      </div>
    );
  }

  return (
    <div className="tab-content">
      <h2>📋 Startlijsten</h2>

      {editingRaceId ? (
        // EDIT MODE
        <div className="edit-form">
          <div className="form-group">
            <label>Race:</label>
            <input type="text" value={getRaceName(editingRaceId)} disabled />
          </div>

          <div className="form-group">
            <label>Status:</label>
            <select
              value={editData.status || 'ingediend'}
              onChange={(e) => setEditData({ ...editData, status: e.target.value })}
            >
              <option value="ingediend">📋 Ingediend</option>
              <option value="definitief">✅ Definitief</option>
            </select>
          </div>

          <div className="form-group">
            <label>Deelnemers ({editData.participants?.length || 0}):</label>
            <div className="participants-list-edit">
              {editData.participants?.map((p, idx) => {
                const filteredRiders = getFilteredRiders(idx);
                const isDropdownOpen = openRiderDropdowns[idx];
                const searchValue = riderSearchFilters[idx] || '';
                
                return (
                  <div key={idx} className="participant-item search-container">
                    <div className="rider-search-wrapper">
                      <input
                        type="text"
                        value={searchValue}
                        onChange={(e) => {
                          setRiderSearchFilters({ ...riderSearchFilters, [idx]: e.target.value });
                          setOpenRiderDropdowns({ ...openRiderDropdowns, [idx]: true });
                        }}
                        onFocus={() => setOpenRiderDropdowns({ ...openRiderDropdowns, [idx]: true })}
                        placeholder="Zoek renner..."
                        className="rider-search-input"
                      />
                      
                      {isDropdownOpen && searchValue && filteredRiders.length > 0 && (
                        <div className="rider-dropdown">
                          {filteredRiders.slice(0, 10).map((rider) => (
                            <div
                              key={rider.id}
                              className="rider-option"
                              onClick={() => {
                                const updated = [...(editData.participants || [])];
                                updated[idx] = { riderId: rider.id };
                                setEditData({ ...editData, participants: updated });
                                setRiderSearchFilters({ ...riderSearchFilters, [idx]: `${rider.firstname} ${rider.lastname}` });
                                setOpenRiderDropdowns({ ...openRiderDropdowns, [idx]: false });
                              }}
                            >
                              {rider.firstname} {rider.lastname}
                            </div>
                          ))}
                        </div>
                      )}

                      {isDropdownOpen && searchValue && filteredRiders.length === 0 && (
                        <div className="rider-dropdown">
                          <div className="rider-option rider-option-notfound">
                            Geen renners gevonden
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <button
                      className="btn-delete-small"
                      onClick={() => {
                        const updated = editData.participants.filter((_, i) => i !== idx);
                        setEditData({ ...editData, participants: updated });
                        const newFilters = { ...riderSearchFilters };
                        delete newFilters[idx];
                        setRiderSearchFilters(newFilters);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="button-group">
              <button
                className="btn-add-small"
                onClick={() => {
                  setEditData({
                    ...editData,
                    participants: [...(editData.participants || []), { riderId: null }]
                  });
                }}
              >
                ➕ Renner toevoegen
              </button>
              <label className="excel-import-label excel-import-no-margin">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleExcelImportParticipants}
                  className="file-input-hidden"
                />
                <span className="excel-import-button">
                  📊 Excel importeren
                </span>
              </label>
            </div>
          </div>

          <div className="form-actions">
            <button className="btn-save-participants" onClick={() => saveEdit(editingRaceId)}>
              💾 Opslaan
            </button>
            <button
              className="btn-cancel"
              onClick={() => {
                setEditingRaceId(null);
                setEditData({});
              }}
            >
              ❌ Annuleren
            </button>
          </div>
        </div>
      ) : approvingRaceId ? (
        // APPROVE MODE
        <div className="approve-form">
          <h3>Controleer startlijst: {getRaceName(approvingRaceId)}</h3>
          
          <div className="participants-list">
            <p className="count-info">
              Totaal deelnemers: <strong>{participants.find(p => p.raceId === approvingRaceId)?.participants?.length || 0}</strong>
            </p>
            <table className="participants-mini-table">
              <thead>
                <tr>
                  <th>Renner</th>
                </tr>
              </thead>
              <tbody>
                {participants
                  .find(p => p.raceId === approvingRaceId)
                  ?.participants?.map((p, idx) => (
                    <tr key={idx}>
                      <td>{getRiderName(p.riderId)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="form-actions">
            <button
              className="btn-approve"
              onClick={() => handleApproveParticipants(approvingRaceId)}
            >
              ✅ Definitief Doorgeven
            </button>
            <button
              className="btn-cancel"
              onClick={() => setApprovingRaceId(null)}
            >
              ❌ Annuleren
            </button>
          </div>
        </div>
      ) : (
        // LIST MODE
        <table className="admin-table participants-main-table">
          <thead>
            <tr>
              <th>Race</th>
              <th>Deelnemers</th>
              <th>Status</th>
              <th>Acties</th>
            </tr>
          </thead>
          <tbody>
            {participants.map(participant => (
              <tr key={participant.raceId}>
                <td className="race-name">
                  <strong>{getRaceName(participant.raceId)}</strong>
                </td>
                <td className="center">{participant.participants?.length || 0}</td>
                <td className="center">
                  <span
                    className="status-badge"
                    style={{ backgroundColor: getStatusBadgeColor(participant.status) }}
                  >
                    {getStatusLabel(participant.status)}
                  </span>
                </td>
                <td className="actions-cell">
                  {participant.status === 'ingediend' ? (
                    <>
                      <button
                        className="btn-approve"
                        onClick={() => setApprovingRaceId(participant.raceId)}
                        title="Controleren en definitief doorgeven"
                      >
                        🔍 Controleer
                      </button>
                    </>
                  ) : (
                    <span className="status-label">Goedgekeurd</span>
                  )}
                  <button
                    className="btn-edit"
                    onClick={() => handleStartEdit(participant)}
                    title="Startlijst bewerken"
                  >
                    ✏️ Bewerk
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() => handleDeleteParticipants(participant.raceId)}
                    title="Startlijst verwijderen"
                  >
                    🗑️ Verwijder
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
