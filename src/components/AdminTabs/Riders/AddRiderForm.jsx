import React from 'react';

const FormField = ({ field, value, onChange }) => (
  <div className="form-field">
    <input
      type={field.type}
      id={field.name}
      name={field.name}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      {...(field.type === 'number' && { min: field.min, max: field.max, step: field.step })}
    />
    <label htmlFor={field.name}>{field.label}</label>
  </div>
);

export default function AddRiderForm({ 
  show, 
  formData, 
  formFields, 
  teams, 
  isSaving, 
  onUpdate, 
  onSave 
}) {
  if (!show) return null;

  const formFieldsByRow = formFields.reduce((acc, field) => {
    if (!acc[field.row]) acc[field.row] = [];
    acc[field.row].push(field);
    return acc;
  }, {});

  return (
    <div className="add-rider-form">
      <h3>Gegevens renner</h3>
      {Object.entries(formFieldsByRow).map((row) => (
        <div key={row[0]} className="form-row">
          {row[1].map(field => (
            <FormField
              key={field.name}
              field={field}
              value={formData[field.name]}
              onChange={(value) => onUpdate(field.name, value)}
            />
          ))}
        </div>
      ))}
      <div className="form-row">
        <div className="form-field">
          <select
            id='teamId'
            value={formData.teamId || ''}
            onChange={(e) => onUpdate('teamId', e.target.value)}
            style={{ padding: '12px 10px 8px 10px', border: '2px solid #ddd', borderRadius: '4px', fontSize: '14px', background: '#f9f9f9' }}
          >
            <option value="">-- Selecteer team --</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>{team.name || team.id}</option>
            ))}
          </select>
          <label htmlFor="teamId">Team</label>
        </div>
      </div>
      <button className="btn-riders-save" onClick={onSave} disabled={isSaving}>
        {isSaving ? '⏳ Opslaan...' : 'Opslaan'}
      </button>
    </div>
  );
}
