import { useState, useEffect } from 'react';
import { getUserBudget } from '../services/userService';

export function useUserBudget(user) {
  const [budget, setBudget] = useState(380000000);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !user.uid) {
      setLoading(false);
      return;
    }

    const fetchBudget = async () => {
      try {
        const userBudget = await getUserBudget(user.uid);
        setBudget(userBudget);
      } catch (err) {
        console.error('Error loading budget:', err);
        setBudget(380000000);
      } finally {
        setLoading(false);
      }
    };

    fetchBudget();
  }, [user]);

  return { budget, loading };
}
