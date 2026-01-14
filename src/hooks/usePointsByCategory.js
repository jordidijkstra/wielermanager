import { useState, useEffect } from 'react';
import { getPointsByCategory } from '../services/pointsByCategoryService';

export function usePointsByCategory() {
  const [pointsByCategory, setPointsByCategory] = useState({});
  const [loading, setLoading] = useState(false);

  const loadPointsForCategory = async (categoryId) => {
    if (pointsByCategory[categoryId]) {
      return pointsByCategory[categoryId];
    }

    setLoading(true);
    try {
      const points = await getPointsByCategory(categoryId);
      setPointsByCategory(prev => ({
        ...prev,
        [categoryId]: points
      }));
      return points;
    } catch (error) {
      console.error('Error loading points:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  return { pointsByCategory, loading, loadPointsForCategory };
}
