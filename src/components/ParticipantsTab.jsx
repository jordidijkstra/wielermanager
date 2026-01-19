import { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getAllRaces } from '../services/raceService';
import '../css/admin.css';

export default function ParticipantsTab() {
  const [races, setRaces] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRaceId, setSelectedRaceId] = useState(null);
  const [editingRaceId, setEditingRaceId] = useState(null);
  const [editData, setEditData] = useState({});
  const [approvingRaceId, setApprovingRaceId] = useState(null);

  // Load all races and participants
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const allRaces = await getAllRaces();
        setRaces(allRaces);
        
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

  const getRaceName = (raceId) => {
    return races.find(r => String(r.id) === String(raceId))?.name || `Race ${raceId}`;
  };

  const getRaceStartDate = (raceId) => {
    return races.find(r => r.id === raceId)?.startDate || '';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('nl-NL', { year: 'numeric', month: '2-digit', day: '2-digit' });
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
  };

  const saveEdit = async (raceId) => {
    try {
      const updatedData = {
        participants: editData.participants || [],
        status: editData.status,
        submittedAt: editData.submittedAt,
        approvedAt: editData.approvedAt
      };

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
              {editData.participants?.map((p, idx) => (
                <div key={idx} className="participant-item">
                  <input
                    type="number"
                    value={p.riderId}
                    onChange={(e) => {
                      const updated = [...(editData.participants || [])];
                      updated[idx] = { ...p, riderId: parseInt(e.target.value) };
                      setEditData({ ...editData, participants: updated });
                    }}
                  />
                  <button
                    className="btn-delete-small"
                    onClick={() => {
                      const updated = editData.participants.filter((_, i) => i !== idx);
                      setEditData({ ...editData, participants: updated });
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
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
                  <th>Rider ID</th>
                </tr>
              </thead>
              <tbody>
                {participants
                  .find(p => p.raceId === approvingRaceId)
                  ?.participants?.map((p, idx) => (
                    <tr key={idx}>
                      <td>{p.riderId}</td>
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
