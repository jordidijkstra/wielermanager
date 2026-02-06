import { useState, useEffect } from 'react';
import { getAllRaceCategories } from '../../services/raceCategoryService';
import { getPointsByCategory } from '../../services/pointsByCategoryService';
import '../../css/pointsTables.css';

export default function PointsTables() {
  const [categories, setCategories] = useState([]);
  const [pointsData, setPointsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const categoriesData = await getAllRaceCategories();
        setCategories(categoriesData);
        
        // Set first category as selected
        if (categoriesData.length > 0) {
          setSelectedCategoryId(categoriesData[0].id);
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Fout bij laden van gegevens');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Load points when category changes
  useEffect(() => {
    const loadPoints = async () => {
      if (!selectedCategoryId) return;

      try {
        const category = categories.find(c => c.id === selectedCategoryId);
        if (!category) return;

        const points = await getPointsByCategory(category.id);
        setPointsData({ category, points });
      } catch (err) {
        console.error('Error loading points:', err);
        setError('Fout bij laden van punten');
      }
    };

    loadPoints();
  }, [selectedCategoryId, categories]);

  if (loading) {
    return <div className="points-tables-container"><p>Puntentabellen laden...</p></div>;
  }

  if (error) {
    return <div className="points-tables-container"><p className="error">{error}</p></div>;
  }

  return (
    <main className="points-tables-container">
      <h1>Puntentabellen</h1>

      {/* Category Selector */}
      <div className="race-selector">
        <label htmlFor="category-dropdown">Selecteer een categorie:</label>
        <select
          id="category-dropdown"
          className="race-dropdown"
          value={selectedCategoryId || ''}
          onChange={(e) => setSelectedCategoryId(parseInt(e.target.value))}
        >
          <option value="">-- Kies een categorie --</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {/* Points Table */}
      {pointsData && (
        <div className="points-table-wrapper">
          <h2>Puntentabel: {pointsData.category.name}</h2>
          <table className="points-table">
            <thead>
              <tr>
                <th>Positie</th>
                <th>Punten</th>
              </tr>
            </thead>
            <tbody>
              {pointsData.points && pointsData.points.length > 0 ? (
                pointsData.points.map((points, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{points}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="2" className="no-data">Geen puntgegevens beschikbaar</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
