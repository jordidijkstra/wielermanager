import { useEffect, useReducer } from 'react';
import { getAllRaceCategories } from '../../services/raceCategoryService';
import { getAllPointsPerCategory, savePointsPerCategory } from '../../services/pointsByCategoryService';
import { INITIAL_STATE, reducer } from './PointsTab.reducer';
import '../../css/pointsTab.css';

export default function PointsTab() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const { categories, pointsData, loading, saving, saveStatus, editingCategoryId, editingPoints } = state;

  // Load categories and points data
  useEffect(() => {
    const loadData = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        // Load categories
        const cats = await getAllRaceCategories();
        console.log('Loaded categories:', cats);

        // Load points per category
        const pointsMap = await getAllPointsPerCategory();
        console.log('Final pointsMap:', pointsMap);
        
        dispatch({ 
            type: 'DATA_LOADED', 
            payload: { categories: cats, pointsMap: pointsMap }
        });
      } catch (err) {
        console.error('Fout bij laden data:', err);
        dispatch({ type: 'LOAD_ERROR' });
      }
    };
    loadData();
  }, []);

  const handleEditClick = (categoryId) => {
    const key = String(categoryId);
    const catPoints = pointsData[key] || { categoryId, points: [] };
    console.log('Edit clicked for category:', categoryId, 'Raw points:', catPoints.points);
    
    // Zorg ervoor dat punten getallen zijn (niet objecten)
    const pointsArray = Array.isArray(catPoints.points) 
      ? catPoints.points.map(p => {
          if (typeof p === 'object' && p !== null) {
            return parseInt(p.points || p.value || 0);
          }
          return parseInt(p || 0);
        })
      : [];
    console.log('EditingPoints array (processed):', pointsArray);
    
    dispatch({ 
        type: 'START_EDIT', 
        payload: { categoryId, points: pointsArray } 
    });
  };

  const handleEditPointsChange = (position, newValue) => {
    dispatch({ 
        type: 'UPDATE_POINT_VALUE', 
        payload: { index: position, value: newValue } 
    });
  };

  const handleAddPositionToEdit = () => {
    dispatch({ type: 'ADD_POINT_POSITION' });
  };

  const handleRemovePositionFromEdit = (position) => {
    dispatch({ type: 'REMOVE_POINT_POSITION', payload: position });
  };

  const handleSaveEdit = async () => {
    try {
      dispatch({ type: 'SET_SAVING', payload: true });

      const key = String(editingCategoryId);
      const categoryData = pointsData[key] || { categoryId: editingCategoryId };
      const docId = categoryData.id || editingCategoryId;
      
      console.log('Saving points for category:', editingCategoryId, 'DocId:', docId, 'Points:', editingPoints);
      
      await savePointsPerCategory(docId, editingCategoryId, editingPoints);

      dispatch({
        type: 'SAVE_SUCCESS',
        payload: {
            categoryId: editingCategoryId,
            id: docId,
            points: editingPoints
        }
      });
      
    } catch (err) {
      console.error('Fout bij opslaan:', err);
      dispatch({ type: 'SAVE_ERROR' });
    }
  };

  if (loading) {
    return <div className="points-tab"><p>Data laden...</p></div>;
  }

  return (
    <div className="points-tab">
      <h2>Punten per categorie beheren</h2>
      
      {saveStatus && <div className={`save-status ${saveStatus.includes('✅') ? 'success' : 'error'}`}>{saveStatus}</div>}

      {editingCategoryId ? (
        // Edit modal
        <div className="edit-modal">
          <div className="modal-content">
            <h3>Punten bewerken - {categories.find(c => c.id === editingCategoryId)?.name}</h3>
            
            <table className="points-table">
              <thead>
                <tr>
                  <th>Positie</th>
                  <th>Punten</th>
                  <th>Actie</th>
                </tr>
              </thead>
              <tbody>
                {console.log('Rendering editingPoints:', editingPoints)}
                {editingPoints && editingPoints.length > 0 ? (
                  editingPoints.map((pts, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td>
                        <input 
                          type="number"
                          min="0"
                          value={pts || 0}
                          onChange={(e) => handleEditPointsChange(idx, e.target.value)}
                          className="input-points"
                        />
                      </td>
                      <td>
                        <button 
                          className="btn-remove"
                          onClick={() => handleRemovePositionFromEdit(idx)}
                          title="Verwijder rij"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center' }}>Geen posities ingesteld</td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="modal-buttons">
              <button 
                className="btn-add-position"
                onClick={handleAddPositionToEdit}
              >
                + Positie toevoegen
              </button>
              <button 
                className="btn-save-points"
                onClick={handleSaveEdit}
                disabled={saving}
              >
                {saving ? '⏳ Opslaan...' : '💾 Opslaan'}
              </button>
              <button 
                className="btn-cancel"
                onClick={() => dispatch({ type: 'CANCEL_EDIT' })}
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Categories table
        <table className="categories-table">
          <thead>
            <tr>
              <th>Categorie</th>
              <th>Aantal Posities</th>
              <th>Actie</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(category => {
              const key = String(category.id);
              const catPoints = pointsData[key] || { categoryId: category.id, points: [] };
              const pointsCount = catPoints.points?.length || 0;
              
              return (
                <tr key={category.id}>
                  <td>{category.name}</td>
                  <td>{pointsCount}</td>
                  <td>
                    <button 
                      className="btn-edit"
                      onClick={() => handleEditClick(category.id)}
                      title="Bewerk punten"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
