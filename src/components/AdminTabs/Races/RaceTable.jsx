import React from 'react';
import Pagination from '../../Shared/Pagination';
import { safeDate, getStatusByDate, getStatusClass } from '../../../utils/raceUtils';

export default function RaceTable({
  races,
  editingState,
  categories,
  results,
  participantsMap,
  dispatch,
  onSaveEdit,
  onDelete,
  onResultAction,
  onParticipantsAction,
  pagination
}) {
  const startEditRace = (race) => {
    dispatch({ type: 'START_EDIT', payload: { id: race.id, data: { ...race } } });
  };

  const { currentPage, totalPages, onGoToPage, onPrevPage, onNextPage } = pagination;

  return (
    <div className="races-table">
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
          {races.map((race) => (
            <tr key={`${race.id}`}>
              <td>{race.id}</td>
              <td>
                {editingState.id === race.id ? (
                  <input
                    type="text"
                    value={editingState.data.name || ''}
                    onChange={(e) => dispatch({ type: 'UPDATE_EDIT_DATA', payload: { name: e.target.value } })}
                  />
                ) : (
                  race.name
                )}
              </td>
              <td>
                {editingState.id === race.id ? (
                  <input
                    type="date"
                    value={editingState.data.startDate || ''}
                    onChange={(e) => dispatch({ type: 'UPDATE_EDIT_DATA', payload: { startDate: e.target.value } })}
                  />
                ) : (
                  safeDate(race.startDate)?.toLocaleDateString('en-CA') || '-'
                )}
              </td>
              <td>
                {editingState.id === race.id ? (
                  <input
                    type="date"
                    value={editingState.data.endDate || ''}
                    onChange={(e) => dispatch({ type: 'UPDATE_EDIT_DATA', payload: { endDate: e.target.value } })}
                  />
                ) : (
                  safeDate(race.endDate)?.toLocaleDateString('en-CA') || '-'
                )}
              </td>
              <td>
                {editingState.id === race.id ? (
                  <select
                    value={editingState.data.categoryId || ''}
                    onChange={(e) => dispatch({ type: 'UPDATE_EDIT_DATA', payload: { categoryId: e.target.value ? parseInt(e.target.value) : null } })}
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
                {editingState.id === race.id ? (
                  <input
                    type="number"
                    value={editingState.data.maxRiders || ''}
                    onChange={(e) => dispatch({ type: 'UPDATE_EDIT_DATA', payload: { maxRiders: parseInt(e.target.value) } })}
                  />
                ) : (
                  race.maxRiders || '-'
                )}
              </td>
              <td>
                {editingState.id === race.id ? (
                  <span className={getStatusClass(getStatusByDate(editingState.data.startDate, editingState.data.endDate))}>
                    {getStatusByDate(editingState.data.startDate, editingState.data.endDate)}
                  </span>
                ) : (
                  <span className={getStatusClass(getStatusByDate(race.startDate, race.endDate))}>
                    {getStatusByDate(race.startDate, race.endDate)}
                  </span>
                )}
              </td>
              <td>
                {editingState.id === race.id ? (
                  <>
                    <button 
                      className="btn-edit"
                      onClick={() => onSaveEdit(race.id)}
                    >
                      Opslaan
                    </button>
                    <button 
                      className="btn-delete"
                      onClick={() => dispatch({ type: 'CANCEL_EDIT' })}
                    >
                      Annuleren
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      className="btn-edit"
                      onClick={() => startEditRace(race)}
                      title="Bewerk"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    {!race.tourId && (
                      <>
                        {participantsMap[race.id] ? (
                          <span className="btn-disabled" title="Startlijst al ingediend">
                            <i className="fas fa-list"></i>
                          </span>
                        ) : (
                          <button 
                            className="btn-edit"
                            onClick={() => onParticipantsAction(race.id)}
                            title="Startlijst importeren"
                          >
                            <i className="fas fa-list"></i>
                          </button>
                        )}
                      </>
                    )}
                    {results.find(r => r.raceId === race.id) ? (
                      <span className="btn-disabled" title="Resultaat al ingediend">
                        <i className="fas fa-bar-chart"></i>
                      </span>
                    ) : (
                      <button 
                        className="btn-edit"
                        onClick={() => onResultAction(race.id)}
                        title="Resultaat toevoegen"
                      >
                        <i className="fas fa-bar-chart"></i>
                      </button>
                    )}
                    <button 
                      className="btn-delete"
                      onClick={() => onDelete(race.id)}
                      title="Verwijder"
                    >
                      <i className="fas fa-trash"></i>
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
               <td colSpan="8">
                 <Pagination
                   currentPage={currentPage}
                   totalPages={totalPages}
                   onGoToPage={onGoToPage}
                   onPrevPage={onPrevPage}
                   onNextPage={onNextPage}
                 />
               </td>
             </tr>
           </tfoot>
        )}
      </table>
    </div>
  );
}