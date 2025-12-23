import { useState, useEffect } from 'react';
import { getAllRiders } from '../services/riderService';

export function useRiders() {
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadRiders = async () => {
    setLoading(true);
    try {
      const data = await getAllRiders();
      setRiders(data);
    } catch (err) {
      console.error('Fout bij laden riders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRiders();
  }, []);

  return { riders, loading, reload: loadRiders };
}