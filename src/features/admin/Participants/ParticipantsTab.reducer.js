export const INITIAL_STATE = {
  races: [],
  riders: [],
  teams: [],
  participants: [],
  loading: true,
  editingRaceId: null,
  editData: {},
  approvingRaceId: null,
  riderSearchFilters: {}, // object key: index, value: search string
  openRiderDropdowns: {}, // object key: index, value: boolean
};

export const reducer = (state, action) => {
  switch (action.type) {
    case 'DATA_LOADED':
      return {
        ...state,
        races: action.payload.races,
        riders: action.payload.riders,
        participants: action.payload.participants,
        teams: action.payload.teams || [],
        loading: false,
      };
    
    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'START_EDIT':
      return {
        ...state,
        editingRaceId: action.payload.raceId,
        editData: action.payload.data,
        riderSearchFilters: action.payload.filters || {},
        openRiderDropdowns: {},
        approvingRaceId: null
      };

    case 'CANCEL_EDIT':
      return {
        ...state,
        editingRaceId: null,
        editData: {},
        riderSearchFilters: {},
        openRiderDropdowns: {}
      };

    case 'UPDATE_EDIT_DATA':
      return {
        ...state,
        editData: action.payload,
        riderSearchFilters: action.filters || state.riderSearchFilters 
      };

    case 'UPDATE_EDIT_STATUS':
      return {
        ...state,
        editData: {
          ...state.editData,
          status: action.payload
        }
      };

    case 'START_APPROVE':
      return {
        ...state,
        approvingRaceId: action.payload,
        editingRaceId: null,
        editData: {}
      };

    case 'CANCEL_APPROVE':
      return {
        ...state,
        approvingRaceId: null
      };

    case 'OPERATION_SUCCESS':
      // Used for delete, save, approve success to update list and clear modes
      return {
        ...state,
        participants: action.payload,
        editingRaceId: null,
        editData: {},
        approvingRaceId: null,
        riderSearchFilters: {},
        openRiderDropdowns: {}
      };

    case 'SET_SEARCH_FILTER':
      return {
        ...state,
        riderSearchFilters: {
          ...state.riderSearchFilters,
          [action.payload.index]: action.payload.value
        },
        openRiderDropdowns: {
          ...state.openRiderDropdowns,
          [action.payload.index]: true
        }
      };
      
    case 'OPEN_DROPDOWN': 
      return {
        ...state,
        openRiderDropdowns: {
          ...state.openRiderDropdowns,
          [action.payload.index]: true
        }
      };
        
    case 'CLOSE_DROPDOWN':
      return {
        ...state,
        openRiderDropdowns: {
          ...state.openRiderDropdowns,
          [action.payload.index]: false
        }
      };

    case 'SELECT_RIDER': {
      const { index, rider } = action.payload;
      const updatedParticipants = [...(state.editData.participants || [])];
      updatedParticipants[index] = { riderId: rider.id };
      
      return {
        ...state,
        editData: { ...state.editData, participants: updatedParticipants },
        riderSearchFilters: { 
          ...state.riderSearchFilters, 
          [index]: `${rider.firstname} ${rider.lastname}` 
        },
        openRiderDropdowns: { 
          ...state.openRiderDropdowns, 
          [index]: false 
        }
      };
    }
    
    case 'ADD_PARTICIPANT_ROW':
      return {
        ...state,
        editData: {
          ...state.editData,
          participants: [...(state.editData.participants || []), { riderId: null }]
        }
      };

    case 'REMOVE_PARTICIPANT_ROW': {
      const idxToRemove = action.payload;
      const updatedParticipants = state.editData.participants.filter((_, i) => i !== idxToRemove);
      
      // Re-index filters and dropdowns
      const newFilters = {};
      const newDropdowns = {};
      let newIdx = 0;
      
      state.editData.participants.forEach((_, originalIdx) => {
        if (originalIdx !== idxToRemove) {
          if (state.riderSearchFilters[originalIdx]) {
            newFilters[newIdx] = state.riderSearchFilters[originalIdx];
          }
          if (state.openRiderDropdowns[originalIdx]) {
            newDropdowns[newIdx] = state.openRiderDropdowns[originalIdx];
          }
          newIdx++;
        }
      });

      return {
        ...state,
        editData: { ...state.editData, participants: updatedParticipants },
        riderSearchFilters: newFilters,
        openRiderDropdowns: newDropdowns
      };
    }

    default:
      return state;
  }
};