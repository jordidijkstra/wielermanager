import { useState, useEffect } from 'react';
import { useRiders } from '../hooks/useRiders';
import { useCyclingTeams } from '../hooks/useCyclingTeams';
import { getRiderRacePoints } from '../services/riderService';
import { useRaces } from '../hooks/useRaces';

export default function RidersTab() {
  const { riders, loading, reload, editRider, deleteRider: deleteRiderFromHook, addRider } = useRiders();
  const { teams } = useCyclingTeams();
  const { races } = useRaces();
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [sortBy, setSortBy] = useState('id-asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTeamFilter, setSelectedTeamFilter] = useState(null);
  const [selectedRiderResults, setSelectedRiderResults] = useState(null);
  const [riderResultsLoading, setRiderResultsLoading] = useState(false);
  const RIDERS_PER_PAGE = 50;
  const [newRider, setNewRider] = useState({
    firstname: '',
    lastname: '',
    firstnameWithoutSpecialChars: '',
    lastnameWithoutSpecialChars: '',
    price: 500000,
    teamId: null,
    points: 0
  });

  const toggleSort = () => {
    setSortBy(sortBy === 'id-asc' ? 'id-desc' : 'id-asc');
  };

  const startEdit = (rider) => {
    setEditingId(rider.id);
    setEditData({ ...rider });
  };

  const saveEdit = async (riderId) => {
    try {
      await editRider(riderId, {
        firstname: editData.firstname || '',
        lastname: editData.lastname || '',
        firstnameWithoutSpecialChars: editData.firstnameWithoutSpecialChars || '',
        lastnameWithoutSpecialChars: editData.lastnameWithoutSpecialChars || '',
        teamId: editData.teamId ? parseInt(editData.teamId) : null,
        price: editData.price ? parseInt(editData.price) : 0,
        points: editData.points ? parseInt(editData.points) : 0
      });
      
      setEditingId(null);
      console.log('✅ Rider updated:', riderId);
    } catch (error) {
      console.error('Error updating rider:', error);
      alert('Fout bij opslaan');
    }
  };

  const deleteRider = async (riderId) => {
    if (!confirm('Zeker weten dat je deze renner wilt verwijderen?')) return;
    
    try {
      await deleteRiderFromHook(riderId);
      console.log('✅ Rider deleted:', riderId);
    } catch (error) {
      console.error('Error deleting rider:', error);
      alert('Fout bij verwijderen');
    }
  };

  const viewRiderResults = async (riderId) => {
    try {
      setRiderResultsLoading(true);
      const results = await getRiderRacePoints(riderId);
      setSelectedRiderResults({ riderId, results });
    } catch (error) {
      console.error('Error loading rider results:', error);
      alert('Fout bij laden resultaten');
    } finally {
      setRiderResultsLoading(false);
    }
  };

  const getRaceName = (raceId) => {
    return races.find(r => r.id === raceId)?.name || `Race ${raceId}`;
  };

  const addNewRider = async () => {
    if (!newRider.firstname || !newRider.lastname || !newRider.firstnameWithoutSpecialChars || !newRider.lastnameWithoutSpecialChars) {
      alert('Alle velden zijn verplicht');
      return;
    }

    try {
      await addRider({
        firstname: newRider.firstname,
        lastname: newRider.lastname,
        firstnameWithoutSpecialChars: newRider.firstnameWithoutSpecialChars,
        lastnameWithoutSpecialChars: newRider.lastnameWithoutSpecialChars,
        price: parseInt(newRider.price) || 0,
        teamId: newRider.teamId ? parseInt(newRider.teamId) : null,
        points: parseInt(newRider.points) || 0
      });

      setNewRider({
        firstname: '',
        lastname: '',
        firstnameWithoutSpecialChars: '',
        lastnameWithoutSpecialChars: '',
        price: 500000,
        teamId: null,
        points: 0
      });
      setShowAddForm(false);
      console.log('✅ New rider added');
    } catch (error) {
      console.error('Error adding rider:', error);
      alert('Fout bij toevoegen');
    }
  };

  const filteredRiders = riders.filter(rider => {
    const matchesSearch = rider.firstnameWithoutSpecialChars?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rider.lastnameWithoutSpecialChars?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTeam = !selectedTeamFilter || rider.teamId === selectedTeamFilter;
    return matchesSearch && matchesTeam;
  });

  const sortedRiders = [...filteredRiders].sort((a, b) => {
    const idA = parseInt(a.id) || 0;
    const idB = parseInt(b.id) || 0;
    if (sortBy === 'id-asc') {
      return idA - idB;
    } else {
      return idB - idA;
    }
  });

  const totalPages = Math.ceil(sortedRiders.length / RIDERS_PER_PAGE);
  const startIndex = (currentPage - 1) * RIDERS_PER_PAGE;
  const endIndex = startIndex + RIDERS_PER_PAGE;
  const paginatedRiders = sortedRiders.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedTeamFilter]);

  if (loading) return <div><p>Renners laden...</p></div>;

  return (
    <div className="tab-content">
      <h2>Overzicht renners</h2>
      
      <div className="admin-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Zoek renner..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="team-filter">
          <label htmlFor="team-filter">Filter op team:</label>
          <select
            id="team-filter"
            value={selectedTeamFilter || ''}
            onChange={(e) => setSelectedTeamFilter(e.target.value ? parseInt(e.target.value) : null)}
          >
            <option value="">-- Alle teams --</option>
            {[...teams].sort((a, b) => a.name.localeCompare(b.name)).map(team => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
        
        <button 
          className="btn-add-rider"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Annuleren' : '+ Voeg renner toe'}
        </button>

        <button 
          className="btn-reload"
          onClick={() => reload()}
          title="Ververs renners data"
        >
          🔄 Verversen
        </button>
      </div>

      {showAddForm && (
        <div className="add-rider-form">
          <h3>Gegevens renner</h3>
          <div className="form-row">
            <div className="form-field">
              <input
                type="text"
                id='firstname'
                name='firstname'
                value={newRider.firstname}
                onChange={(e) => setNewRider({ ...newRider, firstname: e.target.value })}
              />
              <label htmlFor="firstname">Voornaam</label>
            </div>
            <div className="form-field">
              <input
                type="text"
                id='lastname'
                name='lastname'
                value={newRider.lastname}
                onChange={(e) => setNewRider({ ...newRider, lastname: e.target.value })}
              />
              <label htmlFor="lastname">Achternaam</label>
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <input
                type="text"
                id='firstnameWithoutSpecialChars'
                name='firstnameWithoutSpecialChars'
                value={newRider.firstnameWithoutSpecialChars}
                onChange={(e) => setNewRider({ ...newRider, firstnameWithoutSpecialChars: e.target.value })}
              />
              <label htmlFor="firstnameWithoutSpecialChars">Voornaam (zonder speciale tekens)</label>
            </div>
            <div className="form-field">
              <input
                type="text"
                id='lastnameWithoutSpecialChars'
                name='lastnameWithoutSpecialChars'
                value={newRider.lastnameWithoutSpecialChars}
                onChange={(e) => setNewRider({ ...newRider, lastnameWithoutSpecialChars: e.target.value })}
              />
              <label htmlFor="lastnameWithoutSpecialChars">Achternaam (zonder speciale tekens)</label>
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <input
                type="number"
                id='price'
                name='price'
                min="500000"
                max="200000000"
                step="500000"
                value={newRider.price || 500000}
                onChange={(e) => setNewRider({ ...newRider, price: e.target.value })}
              />
              <label htmlFor="price">Prijs (min. €500.000)</label>
            </div>
            <div className="form-field">
              <input
                type="number"
                id='points'
                name='points'
                min="0"
                step="1"
                value={newRider.points || 0}
                onChange={(e) => setNewRider({ ...newRider, points: e.target.value })}
              />
              <label htmlFor="points">Punten</label>
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <select
                id='teamId'
                name='teamId'
                value={newRider.teamId || ''}
                onChange={(e) => setNewRider({ ...newRider, teamId: e.target.value })}
                style={{ padding: '12px 10px 8px 10px', border: '2px solid #ddd', borderRadius: '4px', fontSize: '14px', background: '#f9f9f9' }}
              >
                <option value="">-- Selecteer team --</option>
                {[...teams].sort((a, b) => a.name.localeCompare(b.name)).map((team) => (
                  <option key={team.id} value={team.id}>{team.name || team.id}</option>
                ))}
              </select>
              <label htmlFor="teamId" id="teamId-label">Team</label>
            </div>
          </div>
          <button className="btn-riders-save" onClick={addNewRider}>Opslaan</button>
        </div>
      )}

      <div className="admin-stats">
        <p>
          Totaal renners: <strong>{riders.length}</strong>
          {(searchTerm || selectedTeamFilter) && <> | Gevonden: <strong>{sortedRiders.length}</strong></>}
          | Per pagina: <strong>{RIDERS_PER_PAGE}</strong>
        </p>
      </div>

      <div className="riders-table">
        <table>
            <thead>
              <tr>
                <th onClick={toggleSort} style={{cursor: 'pointer'}}>
                  ID {sortBy === 'id-asc' ? '↑' : '↓'}
                </th>
                <th>Voornaam</th>
                <th>Achternaam</th>
                <th>Voornaam (zonder speciale tekens)</th>
                <th>Achternaam (zonder speciale tekens)</th>
                <th>Prijs (€)</th>
                <th>Punten</th>
                <th>Team ID</th>
                <th>Acties</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRiders.map((rider, index) => (
                <tr key={`${rider.id}-${index}`} className={editingId === rider.id ? 'editing' : ''}>
                  <td>{rider.id}</td>
                  <td>
                    {editingId === rider.id ? (
                      <input
                        type="text"
                        value={editData.firstname || ''}
                        onChange={(e) => setEditData({ ...editData, firstname: e.target.value })}
                      />
                    ) : (
                      rider.firstname
                    )}
                  </td>
                  <td>
                    {editingId === rider.id ? (
                      <input
                        type="text"
                        value={editData.lastname || ''}
                        onChange={(e) => setEditData({ ...editData, lastname: e.target.value })}
                      />
                    ) : (
                      rider.lastname
                    )}
                  </td>
                  <td>
                    {editingId === rider.id ? (
                      <input
                        type="text"
                        value={editData.firstnameWithoutSpecialChars || ''}
                        onChange={(e) => setEditData({ ...editData, firstnameWithoutSpecialChars: e.target.value })}
                      />
                    ) : (
                      rider.firstnameWithoutSpecialChars
                    )}
                  </td>
                  <td>
                    {editingId === rider.id ? (
                      <input
                        type="text"
                        value={editData.lastnameWithoutSpecialChars || ''}
                        onChange={(e) => setEditData({ ...editData, lastnameWithoutSpecialChars: e.target.value })}
                      />
                    ) : (
                      rider.lastnameWithoutSpecialChars
                    )}
                  </td>
                  <td>
                    {editingId === rider.id ? (
                      <input
                        type="number"
                        min="500000"
                        max="200000000"
                        step="500000"
                        value={editData.price || 0}
                        onChange={(e) => setEditData({ ...editData, price: e.target.value })}
                      />
                    ) : (
                      (rider.price / 1000000).toFixed(1) + ' M'
                    )}
                  </td>
                  <td>
                    {editingId === rider.id ? (
                      <input
                        type="number"
                        min="0"
                        value={editData.points || 0}
                        onChange={(e) => setEditData({ ...editData, points: e.target.value })}
                      />
                    ) : (
                      rider.points || 0
                    )}
                  </td>
                  <td>
                    {editingId === rider.id ? (
                      <select
                        value={editData.teamId || ''}
                        onChange={(e) => setEditData({ ...editData, teamId: e.target.value })}
                      >
                        <option value="">-- Selecteer team --</option>
                        {teams.map((team) => (
                          <option key={team.id} value={team.id}>{team.name || team.id}</option>
                        ))}
                      </select>
                    ) : (
                      rider.teamId || '-'
                    )}
                  </td>
                  <td>
                    {editingId === rider.id ? (
                      <>
                        <button 
                          className="btn-edit"
                          onClick={() => saveEdit(rider.id)}
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
                          onClick={() => startEdit(rider)}
                        >
                          Bewerk
                        </button>
                        <button 
                          className="btn-view"
                          onClick={() => viewRiderResults(rider.id)}
                          title="Bekijk race resultaten"
                        >
                          📊 Resultaten
                        </button>
                        <button 
                          className="btn-delete"
                          onClick={() => deleteRider(rider.id)}
                        >
                          Verwijder
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {paginatedRiders.length > 0 && (
              <tfoot>
              <tr>
                <td colSpan="8">
                  <div className="pagination-riders">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        style={{
                          padding: '8px 12px',
                          margin: '0 4px',
                          background: currentPage === pageNum ? '#fca311' : '#fff',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: currentPage === pageNum ? 'bold' : 'normal'
                        }}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            </tfoot>
            )}
        </table>
      </div>

      {selectedRiderResults && (
        <div className="modal-overlay" onClick={() => setSelectedRiderResults(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Race Resultaten - {riders.find(r => r.id === selectedRiderResults.riderId)?.firstname} {riders.find(r => r.id === selectedRiderResults.riderId)?.lastname}</h3>
              <button className="btn-close" onClick={() => setSelectedRiderResults(null)}>✕</button>
            </div>

            <div className="modal-body">
              {riderResultsLoading ? (
                <p>⏳ Resultaten laden...</p>
              ) : selectedRiderResults.results.length === 0 ? (
                <p>Geen race resultaten beschikbaar</p>
              ) : (
                <table className="results-table">
                  <thead>
                    <tr>
                      <th>Race</th>
                      <th>Punten</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRiderResults.results.map((result) => (
                      <tr key={result.raceId}>
                        <td>{getRaceName(result.raceId)}</td>
                        <td className="points-cell">{result.points}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="total-row">
                      <td><strong>Totaal</strong></td>
                      <td className="points-cell"><strong>{selectedRiderResults.results.reduce((sum, r) => sum + (Number(r.points) || 0), 0)}</strong></td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
