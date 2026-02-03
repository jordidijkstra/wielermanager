import React, { useState, useEffect, useReducer, useMemo } from 'react';
import { useAdminData } from './AdminDataProvider';
import { useRaces } from '../../hooks/useRaces'; // Fallback / mixed usage helper
import { useRiderActions } from '../../hooks/useRiderActions';
import RiderTable from '../RiderTable';
import RiderResultsModal from '../RiderResultsModal';
import AddRiderForm from '../AddRiderForm';
import { INITIAL_STATE, reducer } from './RidersTab.reducer';

const RIDERS_PER_PAGE = 50;

const FORM_FIELDS = [
  { row: 1, name: 'firstname', label: 'Voornaam', type: 'text' },
  { row: 1, name: 'lastname', label: 'Achternaam', type: 'text' },
  { row: 2, name: 'firstnameWithoutSpecialChars', label: 'Voornaam (zonder speciale tekens)', type: 'text' },
  { row: 2, name: 'lastnameWithoutSpecialChars', label: 'Achternaam (zonder speciale tekens)', type: 'text' },
  { row: 3, name: 'price', label: 'Prijs (min. €500.000)', type: 'number', min: 500000, max: 200000000, step: 500000 },
  { row: 3, name: 'points', label: 'Punten', type: 'number', min: 0, step: 1 },
];

const EDITABLE_FIELDS = [
  { name: 'firstname', label: 'Voornaam' },
  { name: 'lastname', label: 'Achternaam' },
  { name: 'firstnameWithoutSpecialChars', label: 'Voornaam (spec. tekens)' },
  { name: 'lastnameWithoutSpecialChars', label: 'Achternaam (spec. tekens)' },
  { name: 'price', label: 'Prijs', type: 'number', format: (val) => (val / 1000000).toFixed(1) + ' M' },
  { name: 'points', label: 'Punten', type: 'number' },
  { name: 'teamId', label: 'Team', options: true },
];

const formatPrice = (price) => (price / 1000000).toFixed(1) + ' M';

const EditableCell = ({ isEditing, editValue, displayValue, onChange, type = 'text', options = null }) => {
  if (!isEditing) return <>{displayValue}</>;
  
  if (options) {
    return (
      <select value={editValue || ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">-- Selecteer team --</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>{opt.name || opt.id}</option>
        ))}
      </select>
    );
  }

  return (
    <input
      type={type}
      value={editValue || ''}
      onChange={(e) => onChange(e.target.value)}
      {...(type === 'number' && { min: 0 })}
    />
  );
};

export default function RidersTab() {
  const { ridersData, teamsData, racesData, resultsData } = useAdminData();
  const { riders, loading, reload, editRider, deleteRider: deleteRiderFromHook, addRider } = ridersData;
  const { teams } = teamsData;
  const { races, reload: reloadRaces } = racesData;
  const { reload: reloadResults } = resultsData;
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const [searchInput, setSearchInput] = useState(state.filters.search);

  // Sync search input with local state immediately, but with global filter with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
        dispatch({ type: 'SET_SEARCH', payload: searchInput });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const actions = useRiderActions(state, dispatch, {
    editRider,
    deleteRider: deleteRiderFromHook,
    addRider,
    reloadResults,
    reloadRaces
  });

  const sortedTeams = [...teams].sort((a, b) => a.name.localeCompare(b.name));

  const handleSort = (field) => {
    dispatch({ type: 'SET_SORT', payload: field });
  };

  const toggleSort = () => {
    dispatch({ type: 'TOGGLE_SORT' });
  };

  const getRaceName = (raceId) => races.find(r => r.id === raceId)?.name || `Race ${raceId}`;

  const handleResetFilters = () => {
    setSearchInput('');
    dispatch({ type: 'RESET_FILTERS' });
  };

  const handleAddRider = async () => {
    const { firstname, lastname, firstnameWithoutSpecialChars, lastnameWithoutSpecialChars, price, teamId, points } = state.form.newRider;

    if (!firstname || !lastname || !firstnameWithoutSpecialChars || !lastnameWithoutSpecialChars) {
      alert('Alle velden zijn verplicht');
      return;
    }

    const priceNum = Number(price);
    if (!priceNum || priceNum < 500000) {
        alert('Prijs moet minimaal €500.000 zijn');
        return;
    }

    // Ensure types are correct before sending to API
    const data = {
      ...state.form.newRider,
      price: priceNum,
      teamId: (teamId && teamId !== "") ? Number(teamId) : null,
      points: points ? Number(points) : 0
    };

    await actions.addNewRider(data);
  };

  const filteredRiders = useMemo(() => riders.filter(rider => {
    const matchesSearch = rider.firstnameWithoutSpecialChars?.toLowerCase().includes(state.filters.search.toLowerCase()) || rider.lastnameWithoutSpecialChars?.toLowerCase().includes(state.filters.search.toLowerCase());
    const matchesTeam = !state.filters.teamId || rider.teamId === state.filters.teamId;
    return matchesSearch && matchesTeam;
  }), [riders, state.filters.search, state.filters.teamId]);

  const sortedRiders = useMemo(() => [...filteredRiders].sort((a, b) => {
    const getCompareValue = (rider, field) => field === 'id' ? parseInt(rider.id) || 0 : rider[field] || 0;
    const result = getCompareValue(a, state.sort.field) - getCompareValue(b, state.sort.field);
    return state.sort.direction === 'asc' ? result : -result;
  }), [filteredRiders, state.sort.field, state.sort.direction]);

  const totalPages = Math.ceil(sortedRiders.length / RIDERS_PER_PAGE);
  const paginatedRiders = sortedRiders.slice((state.pagination.current - 1) * RIDERS_PER_PAGE, state.pagination.current * RIDERS_PER_PAGE);

  useEffect(() => dispatch({ type: 'SET_PAGE', payload: 1 }), [state.filters.search, state.filters.teamId]);

  if (loading) return <div><p>Renners laden...</p></div>;

  return (
    <div className="tab-content">
      <h2>Overzicht renners</h2>
      
      <div className="admin-controls">
        <input
          type="text"
          placeholder="Zoek renner..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="search-box"
        />

        <div className="team-filter">
          <label htmlFor="team-filter">Filter op team:</label>
          <select
            id="team-filter"
            value={state.filters.teamId || ''}
            onChange={(e) => dispatch({ type: 'SET_TEAM_FILTER', payload: e.target.value ? parseInt(e.target.value) : null })}
          >
            <option value="">-- Alle teams --</option>
            {sortedTeams.map(team => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
        </div>

        {(state.filters.search || state.filters.teamId) && (
          <button className="btn-reset" onClick={handleResetFilters} title="Filters wissen" style={{ marginRight: '10px' }}>
            <i className="fas fa-times"></i> Reset
          </button>
        )}
        
        <button className="btn-add-rider" onClick={() => dispatch({ type: 'TOGGLE_ADD_FORM' })}>
          {state.form.showAdd ? 'Annuleren' : '+ Voeg renner toe'}
        </button>

        <button className="btn-reload" onClick={() => reload()} title="Ververs renners data">
          <i className="fas fa-spin fa-sync-alt"></i>
        </button>
      </div>

      <AddRiderForm
        show={state.form.showAdd}
        formData={state.form.newRider}
        formFields={FORM_FIELDS}
        teams={sortedTeams}
        isSaving={state.ui.isSaving}
        onUpdate={(field, value) => dispatch({ type: 'UPDATE_NEW_RIDER', payload: { field, value } })}
        onSave={handleAddRider}
      />

      <div className="admin-stats">
        <p>
          Totaal renners: <strong>{riders.length}</strong>
          {(state.filters.search || state.filters.teamId) && <> | Gevonden: <strong>{sortedRiders.length}</strong></>}
          &nbsp;| Per pagina: <strong>{RIDERS_PER_PAGE}</strong>
        </p>
      </div>

      <RiderTable
        columns={[
          { key: 'id', label: 'ID', sortable: true },
          ...EDITABLE_FIELDS.map(field => ({
            key: field.name,
            label: field.label,
            sortable: field.name === 'points',
            render: (rider) => (
              <EditableCell
                isEditing={state.editing.id === rider.id}
                editValue={state.editing.data[field.name]}
                displayValue={
                    field.format ? field.format(rider[field.name]) : 
                    (field.name === 'teamId' ? 
                      (sortedTeams.find(t => t.id === rider.teamId)?.name || rider.teamId || '-') 
                      : (rider[field.name] || 0)
                    )
                }
                onChange={(v) => dispatch({ type: 'UPDATE_EDIT_DATA', payload: { field: field.name, value: v } })}
                type={field.type || 'text'}
                options={field.options ? sortedTeams : null}
              />
            )
          })),
          {
            key: 'actions',
            label: 'Acties',
            render: (rider) => (
              state.editing.id === rider.id ? (
                <>
                  <button className="btn-edit" onClick={() => actions.saveEdit(rider.id)} disabled={state.ui.isSaving}>{state.ui.isSaving ? '⏳' : 'Opslaan'}</button>
                  <button className="btn-delete" onClick={() => dispatch({ type: 'CANCEL_EDIT' })} disabled={state.ui.isSaving}>Annuleren</button>
                </>
              ) : (
                <>
                  <button className="btn-edit" onClick={() => dispatch({ type: 'START_EDIT', payload: { id: rider.id, data: { ...rider } } })} disabled={state.ui.isSaving} title="Bewerk renner"><i className="fas fa-edit"></i></button>
                  <button className="btn-view" onClick={() => actions.viewRiderResults(rider.id)} disabled={state.ui.isSaving} title="Bekijk race resultaten"><i className="fas fa-chart-bar"></i></button>
                  <button className="btn-delete" onClick={() => actions.deleteRider(rider.id)} disabled={state.ui.isSaving} title="Verwijder renner"><i className="fas fa-trash"></i></button>
                </>
              )
            )
          }
        ]}
        data={paginatedRiders}
        sortConfig={state.sort}
        onSort={(field) => field === state.sort.field ? toggleSort() : handleSort(field)}
        pagination={{
          current: state.pagination.current,
          totalPages: totalPages
        }}
        onPageChange={(page) => dispatch({ type: 'SET_PAGE', payload: page })}
        rowClassName={(rider) => state.editing.id === rider.id ? 'editing' : ''}
      />

      <RiderResultsModal
        isOpen={!!state.modal.results}
        onClose={() => dispatch({ type: 'RESET_MODAL' })}
        rider={state.modal.results ? riders.find(r => r.id === state.modal.results.riderId) : null}
        results={state.modal.results?.results}
        loading={state.modal.loading}
        getRaceName={getRaceName}
      />
    </div>
  );
}
