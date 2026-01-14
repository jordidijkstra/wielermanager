import { useState, useEffect } from 'react';
import { getAllRaces } from '../services/raceService';
import { getAllRaceCategories } from '../services/raceCategoryService';
import { getPointsByCategory } from '../services/pointsByCategoryService';
import '../css/pointsTables.css';

export default function PointsTables() {
  const [races, setRaces] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pointsData, setPointsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedRaceId, setSelectedRaceId] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Load all races and categories
        const racesData = await getAllRaces();
        const categoriesData = await getAllRaceCategories();
        
        setRaces(racesData);
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

  // When category changes, select the first race in that category
  useEffect(() => {
    if (selectedCategoryId) {
      const racesInCategory = races.filter(r => r.categoryId === selectedCategoryId);
      if (racesInCategory.length > 0) {
        setSelectedRaceId(racesInCategory[0].id);
      } else {
        setSelectedRaceId(null);
      }
    }
  }, [selectedCategoryId, races]);

  // Load points when race is selected
  useEffect(() => {
    const loadPoints = async () => {
      if (!selectedRaceId) return;

      try {
        // Find the selected race
        const selectedRace = races.find(r => r.id === selectedRaceId);
        if (!selectedRace) return;

        // Find the category for this race
        const category = categories.find(c => c.id === selectedRace.categoryId);
        if (!category) return;

        // Get points for this category
        const points = await getPointsByCategory(category.id);
        setPointsData({ race: selectedRace, category, points });
      } catch (err) {
        console.error('Error loading points:', err);
        setError('Fout bij laden van punten');
      }
    };

    loadPoints();
  }, [selectedRaceId, races, categories]);

  if (loading) {
    return <div className="points-tables-container"><p>Puntentabellen laden...</p></div>;
  }

  if (error) {
    return <div className="points-tables-container"><p className="error">{error}</p></div>;
  }

  // Get races for selected category
  const racesInSelectedCategory = selectedCategoryId 
    ? races.filter(r => r.categoryId === selectedCategoryId)
    : [];

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

      {/* Race Selector */}
      {selectedCategoryId && (
        <div className="race-selector">
          <label htmlFor="race-dropdown">Selecteer een koers:</label>
          <select
            id="race-dropdown"
            className="race-dropdown"
            value={selectedRaceId || ''}
            onChange={(e) => setSelectedRaceId(parseInt(e.target.value))}
          >
            <option value="">-- Kies een koers --</option>
            {racesInSelectedCategory.map(race => (
              <option key={race.id} value={race.id}>
                {race.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Points Table */}
      {pointsData && (
        <div className="points-table-wrapper">
          <h2>{pointsData.race.name}</h2>
          <p className="category-label">Categorie: {pointsData.category.name}</p>
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
