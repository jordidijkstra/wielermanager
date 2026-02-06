export const INITIAL_STATE = {
  // Inline editing (table view)
  editingId: null,
  editData: {},
  
  // File upload
  uploading: false,
  
  // Pagination
  currentPage: 1,
  
  // Full Result Editing (Modal)
  editingResult: null,
  resultRenners: [],
  riderSearchFilters: {},
  openRiderDropdowns: {},
  
  // Race Leader Editing (Modal)
  editRaceLeaderMode: false,
  editRaceLeaderSearch: '',
  editRaceLeaderDropdown: false,
  selectedEditRaceLeaderId: null,
  
  // Approval (Modal)
  approvingResult: null,
  approveRenners: [],
  approveRiderSearchFilters: {},
  approveOpenRiderDropdowns: {},
  approveEditingIndex: null,
  
  // Race Leader Approval (Modal)
  approveRaceLeaderMode: false,
  approveRaceLeaderSearch: '',
  approveRaceLeaderDropdown: false,
  selectedApproveRaceLeaderId: null,
};

export const reducer = (state, action) => {
  switch (action.type) {
    // General
    case 'SET_UPLOADING':
      return { ...state, uploading: action.payload };
    case 'SET_CURRENT_PAGE':
      return { ...state, currentPage: action.payload };

    // Inline Editing
    case 'START_INLINE_EDIT':
      return {
        ...state,
        editingId: action.payload.id,
        editData: { ...action.payload }
      };
    case 'UPDATE_INLINE_EDIT_DATA':
      return {
        ...state,
        editData: { ...state.editData, ...action.payload }
      };
    case 'CANCEL_INLINE_EDIT':
      return { ...state, editingId: null, editData: {} };

    // Full Result Editing
    case 'OPEN_EDIT_RESULT':
      return {
        ...state,
        editingResult: action.payload.result,
        resultRenners: action.payload.resultRenners,
        riderSearchFilters: action.payload.filters,
        // Reset leader editing states
        editRaceLeaderMode: false,
        editRaceLeaderSearch: '',
        editRaceLeaderDropdown: false,
        selectedEditRaceLeaderId: action.payload.result.raceLeader || null
      };
    case 'CLOSE_EDIT_RESULT':
      return {
        ...state,
        editingResult: null,
        resultRenners: [],
        riderSearchFilters: {},
        selectedEditRaceLeaderId: null
      };
    case 'UPDATE_RESULT_RENNERS':
      return { ...state, resultRenners: action.payload };
    case 'UPDATE_RIDER_SEARCH_FILTERS':
      return { ...state, riderSearchFilters: action.payload };
    case 'SET_OPEN_RIDER_DROPDOWNS':
      return { ...state, openRiderDropdowns: { ...state.openRiderDropdowns, ...action.payload } };
    
    // Edit Race Leader
    case 'SET_EDIT_RACE_LEADER_MODE':
      return { ...state, editRaceLeaderMode: action.payload };
    case 'SET_EDIT_RACE_LEADER_SEARCH':
      return { ...state, editRaceLeaderSearch: action.payload };
    case 'SET_EDIT_RACE_LEADER_DROPDOWN':
      return { ...state, editRaceLeaderDropdown: action.payload };
    case 'SET_SELECTED_EDIT_RACE_LEADER_ID':
      return { ...state, selectedEditRaceLeaderId: action.payload };

    // Approval
    case 'OPEN_APPROVE_RESULT':
      return {
        ...state,
        approvingResult: action.payload.result,
        approveRenners: action.payload.resultRenners,
        // Reset approval leader states
        approveRaceLeaderMode: false,
        approveRaceLeaderSearch: '',
        approveRaceLeaderDropdown: false,
        selectedApproveRaceLeaderId: action.payload.result.raceLeader || null
      };
    case 'CLOSE_APPROVE_RESULT':
      return {
        ...state,
        approvingResult: null,
        approveRenners: [],
        approveRiderSearchFilters: {},
        approveOpenRiderDropdowns: {},
        selectedApproveRaceLeaderId: null
      };
    case 'UPDATE_APPROVE_RENNERS':
      return { ...state, approveRenners: action.payload };
    case 'UPDATE_APPROVE_RIDER_SEARCH_FILTERS':
      return { ...state, approveRiderSearchFilters: action.payload };
    case 'SET_APPROVE_OPEN_RIDER_DROPDOWNS':
      return { ...state, approveOpenRiderDropdowns: { ...state.approveOpenRiderDropdowns, ...action.payload } };
    case 'SET_APPROVE_EDITING_INDEX':
      return { ...state, approveEditingIndex: action.payload };

    // Approve Race Leader
    case 'SET_APPROVE_RACE_LEADER_MODE':
      return { ...state, approveRaceLeaderMode: action.payload };
    case 'SET_APPROVE_RACE_LEADER_SEARCH':
      return { ...state, approveRaceLeaderSearch: action.payload };
    case 'SET_APPROVE_RACE_LEADER_DROPDOWN':
      return { ...state, approveRaceLeaderDropdown: action.payload };
    case 'SET_SELECTED_APPROVE_RACE_LEADER_ID':
      return { ...state, selectedApproveRaceLeaderId: action.payload };

    default:
      return state;
  }
};
