import { getRiderRacePoints } from '../services/riderService';

const clearCaches = async (reloadResults, reloadRaces) => {
  await Promise.all([reloadResults(), reloadRaces()]);
};

export const useRiderActions = (state, dispatch, { editRider, deleteRider: deleteRiderFromHook, addRider, reloadResults, reloadRaces }) => {
  const saveEdit = async (riderId) => {
    const data = {
      firstname: state.editing.data.firstname || '',
      lastname: state.editing.data.lastname || '',
      firstnameWithoutSpecialChars: state.editing.data.firstnameWithoutSpecialChars || '',
      lastnameWithoutSpecialChars: state.editing.data.lastnameWithoutSpecialChars || '',
      teamId: state.editing.data.teamId ? parseInt(state.editing.data.teamId) : null,
      price: state.editing.data.price ? parseInt(state.editing.data.price) : 0,
      points: state.editing.data.points ? parseInt(state.editing.data.points) : 0
    };

    dispatch({ type: 'SET_SAVING', payload: true });
    try {
      await editRider(riderId, data);
      await clearCaches(reloadResults, reloadRaces);
      dispatch({ type: 'CANCEL_EDIT' });
      console.log('✅ Rider updated:', riderId);
    } catch (error) {
      console.error('Error updating rider:', error);
      alert('Fout bij opslaan');
    } finally {
      dispatch({ type: 'SET_SAVING', payload: false });
    }
  };

  const deleteRider = async (riderId) => {
    if (!confirm('Zeker weten dat je deze renner wilt verwijderen?')) return;
    
    dispatch({ type: 'SET_SAVING', payload: true });
    try {
      await deleteRiderFromHook(riderId);
      await clearCaches(reloadResults, reloadRaces);
      console.log('✅ Rider deleted:', riderId);
    } catch (error) {
      console.error('Error deleting rider:', error);
      alert('Fout bij verwijderen');
    } finally {
      dispatch({ type: 'SET_SAVING', payload: false });
    }
  };

  const viewRiderResults = async (riderId) => {
    try {
      dispatch({ type: 'SET_MODAL_LOADING', payload: true });
      const results = await getRiderRacePoints(riderId);
      dispatch({ type: 'SET_MODAL_RESULTS', payload: { riderId, results } });
    } catch (error) {
      console.error('Error loading rider results:', error);
      alert('Fout bij laden resultaten');
    }
  };

  const addNewRider = async (data) => {
    dispatch({ type: 'SET_SAVING', payload: true });
    try {
      await addRider(data);
      await clearCaches(reloadResults, reloadRaces);
      dispatch({ type: 'RESET_NEW_RIDER' });
      console.log('✅ New rider added');
    } catch (error) {
      console.error('Error adding rider:', error);
      alert('Fout bij toevoegen');
    } finally {
      dispatch({ type: 'SET_SAVING', payload: false });
    }
  };

  return {
    saveEdit,
    deleteRider,
    viewRiderResults,
    addNewRider
  };
};
