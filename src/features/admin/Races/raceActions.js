import { getStatusByDate } from '../../../utils/raceUtils';

/**
 * Handles adding a new race
 * 
 * @param {Object} newRaceData - The form data for the new race
 * @param {Function} addRace - API function to add a race
 * @param {Function} reloadRaces - Function to reload racaes data
 * @param {Function} dispatch - Reducer dispatch function
 */
export const handleAddNewRace = async (newRaceData, addRace, reloadRaces, dispatch) => {
  if (!newRaceData.name || !newRaceData.startDate || !newRaceData.endDate) {
    alert('Naam, startdatum en einddatum zijn verplicht');
    return;
  }

  try {
    const computedStatus = getStatusByDate(newRaceData.startDate, newRaceData.endDate);

    await addRace({
      name: newRaceData.name,
      startDate: newRaceData.startDate,
      endDate: newRaceData.endDate,
      categoryId: newRaceData.categoryId,
      maxRiders: parseInt(newRaceData.maxRiders),
      tourId: newRaceData.tourId,
      status: computedStatus
    });

    await reloadRaces();
    console.log('✅ Races cache gecleared');

    dispatch({ type: 'RESET_NEW_RACE' });
    console.log('✅ Nieuwe race toegevoegd');
  } catch (error) {
    console.error('Error adding race:', error);
    alert('Fout bij toevoegen race');
  }
};

/**
 * Handles saving an edited race
 * 
 * @param {string} raceId - ID of the race being edited
 * @param {Object} editRaceData - The updated data
 * @param {Function} editRace - API function to update a race
 * @param {Function} reloadRaces - Function to reload races data
 * @param {Function} dispatch - Reducer dispatch function
 */
export const handleSaveEditRace = async (raceId, editRaceData, editRace, reloadRaces, dispatch) => {
  try {
    const computedStatus = getStatusByDate(editRaceData.startDate, editRaceData.endDate);
    const updatedRaceData = { 
      ...editRaceData, 
      status: computedStatus,
      maxRiders: parseInt(editRaceData.maxRiders)
    };
    
    await editRace(raceId, updatedRaceData);
    
    await reloadRaces();
    console.log('✅ Races cache gecleared');
    
    dispatch({ type: 'CANCEL_EDIT' });
    console.log('✅ Race bijgewerkt');
  } catch (error) {
    console.error('Error updating race:', error);
    alert('Fout bij bijwerken race');
  }
};

/**
 * Handles deleting a race
 * 
 * @param {string} raceId - ID of the race to delete
 * @param {Function} removeRace - API function to remove a race
 * @param {Function} reloadRaces - Function to reload races data
 */
export const handleDeleteRace = async (raceId, removeRace, reloadRaces) => {
  if (confirm('Weet je zeker dat je deze race wilt verwijderen?')) {
    try {
      await removeRace(raceId);
      
      await reloadRaces();
      console.log('✅ Races cache gecleared');
      
      console.log('✅ Race verwijderd');
    } catch (error) {
      console.error('Error deleting race:', error);
      alert('Fout bij verwijderen race');
    }
  }
};
