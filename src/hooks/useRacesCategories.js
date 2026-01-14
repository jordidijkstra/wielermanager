import { useState, useEffect } from 'react';
import { getAllRaceCategories } from '../services/raceCategoryService';

export function useRacesCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const categoriesData = await getAllRaceCategories();
      setCategories(categoriesData);
    } catch (err) {
      console.error('Fout bij laden race categories:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const reload = async () => {
    await loadCategories();
  };

  return { categories, loading, error, reload };
}
