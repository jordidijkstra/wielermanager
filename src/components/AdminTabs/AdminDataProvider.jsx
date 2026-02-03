import React, { createContext, useContext } from 'react';
import { useRiders } from '../../hooks/useRiders';
import { useRaces } from '../../hooks/useRaces';
import { useCyclingTeams } from '../../hooks/useCyclingTeams';
import { useResults } from '../../hooks/useResults';

const AdminDataContext = createContext(null);

export function AdminDataProvider({ children }) {
  // Initialize hooks once at the top level
  // Since this component stays mounted when switching tabs, 
  // the subscriptions/fetches in these hooks will persist.
  const ridersData = useRiders();
  const racesData = useRaces();
  const teamsData = useCyclingTeams();
  const resultsData = useResults();

  const value = {
    ridersData,
    racesData,
    teamsData,
    resultsData
  };

  return (
    <AdminDataContext.Provider value={value}>
      {children}
    </AdminDataContext.Provider>
  );
}

export function useAdminData() {
  const context = useContext(AdminDataContext);
  if (!context) {
    throw new Error('useAdminData must be used within an AdminDataProvider');
  }
  return context;
}
