import { useState, useEffect } from 'react';
import '../css/riderEditModal.css';

export default function RiderEditModal({ rider, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    price: 0,
    teamId: null
  });

  useEffect(() => {
    if (rider) {
      setFormData({
        firstname: rider.firstname || '',
        lastname: rider.lastname || '',
        price: rider.price || 0,
        teamId: rider.teamId || null
      });
    }
  }, [rider]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...rider,
      ...formData,
      price: parseInt(formData.price) || 0,
      teamId: formData.teamId ? parseInt(formData.teamId) : null
    });
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Bewerk renner</h2>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="firstname">Voornaam</label>
            <input
              type="text"
              id="firstname"
              value={formData.firstname}
              onChange={(e) => setFormData({ ...formData, firstname: e.target.value })}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="lastname">Achternaam</label>
            <input
              type="text"
              id="lastname"
              value={formData.lastname}
              onChange={(e) => setFormData({ ...formData, lastname: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label htmlFor="price">Prijs (€)</label>
            <input
              type="number"
              id="price"
              min="500000"
              max="200000000"
              step="500000"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            />
            <small>{(formData.price / 1000000).toFixed(1)}M</small>
          </div>

          <div className="form-group">
            <label htmlFor="teamId">Team ID</label>
            <input
              type="number"
              id="teamId"
              value={formData.teamId || ''}
              onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onCancel}>
              Annuleren
            </button>
            <button type="submit" className="btn-save">
              Opslaan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
