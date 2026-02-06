import React from 'react';

export default function AddRaceForm({ 
  formData, 
  dispatch, 
  categories, 
  categoriesLoading, 
  onSave 
}) {
  return (
    <div className="add-rider-form">
      <h3>Nieuwe race</h3>
      <div className="form-row">
        <div className="form-field">
          <input
            type="text"
            id='raceName'
            name='raceName'
            value={formData.name}
            onChange={(e) => dispatch({ type: 'UPDATE_NEW_RACE', payload: { name: e.target.value } })}
          />
          <label htmlFor="raceName">Racenaam</label>
        </div>
        <div className="form-field">
          <input
            type="number"
            id='maxRiders'
            name='maxRiders'
            value={formData.maxRiders}
            onChange={(e) => dispatch({ type: 'UPDATE_NEW_RACE', payload: { maxRiders: e.target.value } })}
          />
          <label htmlFor="maxRiders">Max renners</label>
        </div>
      </div>
      <div className="form-row">
        <div className="form-field">
          <input
            type="date"
            id='startDate'
            name='startDate'
            value={formData.startDate}
            onChange={(e) => dispatch({ type: 'UPDATE_NEW_RACE', payload: { startDate: e.target.value } })}
          />
          <label htmlFor="startDate">Startdatum</label>
        </div>
        <div className="form-field">
          <input
            type="date"
            id='endDate'
            name='endDate'
            value={formData.endDate}
            onChange={(e) => dispatch({ type: 'UPDATE_NEW_RACE', payload: { endDate: e.target.value } })}
          />
          <label htmlFor="endDate">Einddatum</label>
        </div>
      </div>
      <div className="form-row">
        <div className="form-field">
          <select
            id='categoryId'
            name='categoryId'
            value={formData.categoryId || ''}
            onChange={(e) => dispatch({ type: 'UPDATE_NEW_RACE', payload: { categoryId: e.target.value ? parseInt(e.target.value) : null } })}
            disabled={categoriesLoading}
          >
            <option value="">
              {categoriesLoading ? '... Laden ...' : '-- Selecteer een categorie --'}
            </option>
            {categories.length > 0 ? (
              categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name || `Categorie ${category.id}`}
                </option>
              ))
            ) : (
              <option disabled>Geen categorieën beschikbaar</option>
            )}
          </select>
          <label htmlFor="categoryId" id="categoryId-label">Categorie</label>
        </div>
        <div className="form-field">
          <input
            type="number"
            id='tourId'
            name='tourId'
            value={formData.tourId || ''}
            onChange={(e) => dispatch({ type: 'UPDATE_NEW_RACE', payload: { tourId: e.target.value ? parseInt(e.target.value) : null } })}
          />
          <label htmlFor="tourId">Tour ID (optioneel)</label>
        </div>
      </div>
      <button className="btn-riders-save" onClick={onSave}>Opslaan</button>
    </div>
  );
}