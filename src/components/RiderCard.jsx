import { getTeamJerseyPath } from '../services/cyclingTeamService';
import { formatPrice, getFullName } from '../utils/formatters';

export default function RiderCard({ rider, selectedRiders, remainingBudget, onAdd, isDisabled }) {
  return (
    <div className={`rider-card-teambuilder ${isDisabled ? 'disabled' : ''}`}>
      <img 
        src={getTeamJerseyPath(rider.teamId)}
        alt="jersey" 
        className="rider-jersey-teambuilder"
        onError={(e) => e.target.src = '/assets/default.webp'}
      />
      <div className="rider-info-teambuilder">
        <div className="rider-name-teambuilder">{getFullName(rider)}</div>
      </div>
      <div className="rider-actions-teambuilder">
        <span className="rider-price-teambuilder">{formatPrice(rider.price)}</span>
        {selectedRiders.find(r => r.id === rider.id) ? (
          <span style={{ display: 'inline-block', width: '32px', height: '32px' }}></span>
        ) : remainingBudget >= rider.price && !isDisabled ? (
          <button
            className="btn-add"
            onClick={() => onAdd(rider)}
          >
            <i className="fas fa-plus"></i>
          </button>
        ) : (
          <span style={{ display: 'inline-block', width: '32px', height: '32px' }}></span>
        )}
      </div>
    </div>
  );
}
