import { useState, useEffect } from 'react';
import { collection, getDocs, setDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getAllRaceCategories } from '../services/raceCategoryService';
import '../css/pointsTab.css';

export default function PointsTab() {
  const [categories, setCategories] = useState([]);
  const [pointsData, setPointsData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingPoints, setEditingPoints] = useState([]);

  // Load categories and points data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load categories
        const cats = await getAllRaceCategories();
        console.log('Loaded categories:', cats);
        setCategories(cats);

        // Load points per category from Firestore
        const pointsSnapshot = await getDocs(collection(db, 'pointsPerCategory'));
        console.log('Points snapshot docs:', pointsSnapshot.docs.length);
        
        const pointsMap = {};
        
        pointsSnapshot.forEach(docSnapshot => {
          const data = docSnapshot.data();
          console.log('Doc:', docSnapshot.id, 'Data:', data);
          
          // Probeer beide categoryId (als getal en string) te gebruiken als key
          const categoryId = data.categoryId || docSnapshot.id;
          const key = String(categoryId); // Converteer naar string voor consistent keying
          
          // Extract de punten array en zorg dat het getallen zijn
          let pointsArray = [];
          if (Array.isArray(data.points)) {
            pointsArray = data.points.map(p => {
              // Als p een object is, probeer de 'points' property te extraheren
              if (typeof p === 'object' && p !== null) {
                return parseInt(p.points || p.value || 0);
              }
              // Anders converteer naar getal
              return parseInt(p || 0);
            });
          }
          
          console.log('Processed points for category', categoryId, ':', pointsArray);
          
          pointsMap[key] = {
            id: docSnapshot.id,
            categoryId: categoryId,
            points: pointsArray
          };
        });
        
        console.log('Final pointsMap:', pointsMap);
        setPointsData(pointsMap);
      } catch (err) {
        console.error('Fout bij laden data:', err);
        setSaveStatus('❌ Fout bij laden data');
      } finally {
        setLoading(false);
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
    
    setEditingCategoryId(categoryId);
    setEditingPoints(pointsArray);
  };

  const handleEditPointsChange = (position, newValue) => {
    const newPoints = [...editingPoints];
    while (newPoints.length <= position) {
      newPoints.push(0);
    }
    newPoints[position] = parseInt(newValue) || 0;
    setEditingPoints(newPoints);
  };

  const handleAddPositionToEdit = () => {
    setEditingPoints([...editingPoints, 0]);
  };

  const handleRemovePositionFromEdit = (position) => {
    setEditingPoints(editingPoints.filter((_, idx) => idx !== position));
  };

  const handleSaveEdit = async () => {
    try {
      setSaving(true);
      setSaveStatus('Opslaan...');

      const key = String(editingCategoryId);
      const categoryData = pointsData[key] || { categoryId: editingCategoryId };
      const docId = categoryData.id || editingCategoryId;
      
      console.log('Saving points for category:', editingCategoryId, 'DocId:', docId, 'Points:', editingPoints);
      
      await setDoc(doc(db, 'pointsPerCategory', docId), {
        categoryId: editingCategoryId,
        points: editingPoints
      });

      setSaveStatus('✅ Punten opgeslagen!');
      setTimeout(() => setSaveStatus(''), 3000);
      
      // Update local data
      setPointsData(prev => ({
        ...prev,
        [key]: {
          id: docId,
          categoryId: editingCategoryId,
          points: editingPoints
        }
      }));

      // Close editor
      setEditingCategoryId(null);
    } catch (err) {
      console.error('Fout bij opslaan:', err);
      setSaveStatus('❌ Fout bij opslaan');
    } finally {
      setSaving(false);
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
                onClick={() => setEditingCategoryId(null)}
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
