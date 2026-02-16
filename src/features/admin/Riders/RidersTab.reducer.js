export const DEFAULT_RIDER = {
  firstname: '',
  lastname: '',
  firstnameWithoutSpecialChars: '',
  lastnameWithoutSpecialChars: '',
  price: 500000,
  teamId: null,
  points: 0
};

export const INITIAL_STATE = {
  editing: { id: null, data: {} },
  form: { showAdd: false, newRider: DEFAULT_RIDER },
  filters: { search: '', teamId: null },
  sort: { field: 'id', direction: 'asc' },
  pagination: { current: 1 },
  ui: { isSaving: false },
  modal: { results: null, loading: false }
};

export const reducer = (state, action) => {
  switch (action.type) {
    case 'START_EDIT':
      return { ...state, editing: { id: action.payload.id, data: action.payload.data } };
    case 'UPDATE_EDIT_DATA':
      return { ...state, editing: { ...state.editing, data: { ...state.editing.data, [action.payload.field]: action.payload.value } } };
    case 'CANCEL_EDIT':
      return { ...state, editing: { id: null, data: {} } };
    case 'TOGGLE_ADD_FORM':
      return { ...state, form: { ...state.form, showAdd: !state.form.showAdd } };
    case 'UPDATE_NEW_RIDER':
      return { ...state, form: { ...state.form, newRider: { ...state.form.newRider, [action.payload.field]: action.payload.value } } };
    case 'RESET_NEW_RIDER':
      return { ...state, form: { showAdd: false, newRider: DEFAULT_RIDER } };
    case 'SET_SEARCH':
      return { ...state, filters: { ...state.filters, search: action.payload }, pagination: { current: 1 } };
    case 'SET_TEAM_FILTER':
      return { ...state, filters: { ...state.filters, teamId: action.payload }, pagination: { current: 1 } };
    case 'RESET_FILTERS':
      return { ...state, filters: { search: '', teamId: null }, pagination: { current: 1 } };
    case 'SET_SORT':
      return { ...state, sort: { field: action.payload, direction: 'asc' } };
    case 'TOGGLE_SORT':
      return { ...state, sort: { ...state.sort, direction: state.sort.direction === 'asc' ? 'desc' : 'asc' } };
    case 'SET_PAGE':
      return { ...state, pagination: { current: action.payload } };
    case 'SET_SAVING':
      return { ...state, ui: { isSaving: action.payload } };
    case 'SET_MODAL_RESULTS':
      return { ...state, modal: { results: action.payload, loading: false } };
    case 'SET_MODAL_LOADING':
      return { ...state, modal: { ...state.modal, loading: action.payload } };
    case 'RESET_MODAL':
      return { ...state, modal: { results: null, loading: false } };
    default:
      return state;
  }
};
