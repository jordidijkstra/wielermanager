export const INITIAL_STATE = {
  categories: [],
  pointsData: {},
  loading: true,
  saving: false,
  saveStatus: '',
  editingCategoryId: null,
  editingPoints: []
};

export const reducer = (state, action) => {
  switch (action.type) {
    case 'DATA_LOADED':
      return {
        ...state,
        categories: action.payload.categories,
        pointsData: action.payload.pointsMap,
        loading: false
      };
      
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
      
    case 'SET_SAVING':
      return { 
        ...state, 
        saving: true, 
        saveStatus: 'Opslaan...' 
      };
      
    case 'START_EDIT':
      return {
        ...state,
        editingCategoryId: action.payload.categoryId,
        editingPoints: action.payload.points,
        saveStatus: ''
      };
      
    case 'CANCEL_EDIT':
      return {
        ...state,
        editingCategoryId: null,
        editingPoints: []
      };
      
    case 'UPDATE_POINT_VALUE': {
      const { index, value } = action.payload;
      const newPoints = [...state.editingPoints];
      // Ensure array is long enough
      while (newPoints.length <= index) {
        newPoints.push(0);
      }
      newPoints[index] = parseInt(value) || 0;
      
      return {
        ...state,
        editingPoints: newPoints
      };
    }
    
    case 'ADD_POINT_POSITION':
      return {
        ...state,
        editingPoints: [...state.editingPoints, 0]
      };
      
    case 'REMOVE_POINT_POSITION':
      return {
        ...state,
        editingPoints: state.editingPoints.filter((_, idx) => idx !== action.payload)
      };
      
    case 'SAVE_SUCCESS': {
        const { key, docId, points } = action.payload;
        return {
            ...state,
            saving: false,
            saveStatus: '✅ Punten opgeslagen!',
            editingCategoryId: null,
            editingPoints: [],
            pointsData: {
                ...state.pointsData,
                [key]: {
                    id: docId,
                    categoryId: state.editingCategoryId,
                    points: points
                }
            }
        };
    }
    
    case 'SAVE_ERROR':
        return {
            ...state,
            saving: false,
            saveStatus: action.payload || '❌ Fout bij opslaan'
        };

    case 'CLEAR_STATUS':
        return {
            ...state,
            saveStatus: ''
        };

    case 'LOAD_ERROR':
        return {
            ...state,
            loading: false,
            saveStatus: '❌ Fout bij laden data'
        };

    default:
      return state;
  }
};