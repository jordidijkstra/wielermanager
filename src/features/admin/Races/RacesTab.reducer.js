export const DEFAULT_RACE = {
  name: '',
  startDate: '',
  endDate: '',
  categoryId: null,
  maxRiders: 7,
  tourId: null,
};

export const INITIAL_STATE = {
  ui: {
    showAddForm: false,
    openRiderDropdowns: {},
    openParticipantDropdowns: {},
  },
  forms: {
    newRace: DEFAULT_RACE
  },
  editing: {
    id: null,
    data: {}
  },
  modals: {
    result: null, // { type, raceId, pointsCount } or null
    participants: null // raceId or null
  },
  data: {
    resultEntries: [],
    participantEntries: [],
    raceParticipants: {} // Map of raceId -> participants array
  },
  filters: {
    search: '',
    category: null
  },
  search: {
    riders: {}, // For result entries: { index: searchTerm }
    participants: {} // For participant entries: { index: searchTerm }
  },
  pagination: {
    current: 1,
    perPage: 20
  }
};

export const reducer = (state, action) => {
  switch (action.type) {
    // UI Actions
    case 'TOGGLE_ADD_FORM':
      return { ...state, ui: { ...state.ui, showAddForm: !state.ui.showAddForm } };
    case 'SET_OPEN_RIDER_DROPDOWNS':
      return { ...state, ui: { ...state.ui, openRiderDropdowns: action.payload } };
    case 'SET_OPEN_PARTICIPANT_DROPDOWNS':
      return { ...state, ui: { ...state.ui, openParticipantDropdowns: action.payload } };
    
    // Form Actions
    case 'UPDATE_NEW_RACE':
      return { ...state, forms: { ...state.forms, newRace: { ...state.forms.newRace, ...action.payload } } };
    case 'RESET_NEW_RACE':
      return { ...state, forms: { ...state.forms, newRace: DEFAULT_RACE }, ui: { ...state.ui, showAddForm: false } };

    // Edit Actions
    case 'START_EDIT':
      return { ...state, editing: { id: action.payload.id, data: action.payload.data } };
    case 'UPDATE_EDIT_DATA':
      return { ...state, editing: { ...state.editing, data: { ...state.editing.data, ...action.payload } } };
    case 'CANCEL_EDIT':
      return { ...state, editing: { id: null, data: {} } };

    // Modal Actions
    case 'OPEN_RESULT_MODAL':
      return { ...state, modals: { ...state.modals, result: action.payload } };
    case 'CLOSE_RESULT_MODAL':
      return { 
        ...state, 
        modals: { ...state.modals, result: null }, 
        data: { ...state.data, resultEntries: [] },
        search: { ...state.search, riders: {} }
      };
    case 'OPEN_PARTICIPANTS_MODAL':
      return { ...state, modals: { ...state.modals, participants: action.payload } };
    case 'CLOSE_PARTICIPANTS_MODAL':
      return {
        ...state,
        modals: { ...state.modals, participants: null },
        data: { ...state.data, participantEntries: [] },
        search: { ...state.search, participants: {} }
      };

    // Data Actions
    case 'SET_RACE_PARTICIPANTS':
      return { ...state, data: { ...state.data, raceParticipants: action.payload } };
    case 'SET_RESULT_ENTRIES':
      return { ...state, data: { ...state.data, resultEntries: action.payload } };
    case 'UPDATE_RESULT_ENTRY':
      {
        const newEntries = [...state.data.resultEntries];
        newEntries[action.payload.index] = { ...newEntries[action.payload.index], ...action.payload.data };
        return { ...state, data: { ...state.data, resultEntries: newEntries } };
      }
    case 'SET_PARTICIPANT_ENTRIES':
      return { ...state, data: { ...state.data, participantEntries: action.payload } };
    case 'UPDATE_PARTICIPANT_ENTRY':
      {
        const newEntries = [...state.data.participantEntries];
        newEntries[action.payload.index] = { ...newEntries[action.payload.index], ...action.payload.data };
        return { ...state, data: { ...state.data, participantEntries: newEntries } };
      }

    // Filter Actions
    case 'SET_SEARCH_TERM':
      return { ...state, filters: { ...state.filters, search: action.payload }, pagination: { ...state.pagination, current: 1 } };
    case 'SET_CATEGORY_FILTER':
      return { ...state, filters: { ...state.filters, category: action.payload }, pagination: { ...state.pagination, current: 1 } };
    
    // Search within Modals
    case 'SET_RIDER_SEARCH_FILTERS':
        return { ...state, search: { ...state.search, riders: action.payload } };
    case 'SET_PARTICIPANT_SEARCH_FILTERS':
        return { ...state, search: { ...state.search, participants: action.payload } };

    // Pagination
    case 'SET_PAGE':
      return { ...state, pagination: { ...state.pagination, current: action.payload } };

    default:
      return state;
  }
};
