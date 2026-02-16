import { getTeamJerseyPath } from '../../services/cyclingTeamService';
import { formatPrice, getFullName } from '../../utils/formatters';

export default function SelectedTeam({ selectedRiders, onRemoveRider, onSaveTeam, saveStatus, deadlinePassed }) {
  return (
    <div className="selected-team">
      <div className="section-header">
        <h2>Jouw Team</h2>
        {deadlinePassed && (
          <div className="deadline-warning">
            ⏱️ Deadline verstreken - Team kan niet meer aangepast worden
          </div>
        )}
        {selectedRiders.length > 0 && (
          <button
            className="btn-save-teambuilder"
            onClick={onSaveTeam}
            disabled={selectedRiders.length < 14 || deadlinePassed}
            title={selectedRiders.length < 14 ? "Je team moet minimaal 14 renners bevatten" : deadlinePassed ? "Deadline verstreken - team kan niet meer aangepast worden" : ""}
          >
            Opslaan <i className="fas fa-save"></i>
          </button>
        )}
      </div>
      {saveStatus && <div className="save-status">{saveStatus}</div>}
      
      {selectedRiders.length === 0 ? (
        <div className="empty-team">
          <p>Je hebt nog geen renners geselecteerd.</p>
          <p>Kies maximaal 30 renners uit de lijst hiernaast.</p>
        </div>
      ) : (
        <div className="selected-riders-list">
          {[...selectedRiders]
          .sort((a, b) => b.price - a.price)
          .map(rider => {
            const jerseyPath = getTeamJerseyPath(rider.teamId);
            return (
            <div key={rider.id} className="selected-rider">
              <img 
                src={jerseyPath}
                alt="jersey" 
                className="selected-rider-jersey"
                onError={(e) => e.target.src = '/assets/default.webp'}
              />
              <div className="selected-rider-info">
                <div className="selected-rider-name">{getFullName(rider)}</div>
              </div>
              <div className="selected-rider-actions">
                <span className="selected-rider-price">{formatPrice(rider.price)}</span>
                <button 
                  className="btn-remove"
                  onClick={() => onRemoveRider(rider.id)}
                  disabled={deadlinePassed}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
          )})}
          {Array.from({ length: 30 - selectedRiders.length }).map((_, idx) => (
            <div key={`placeholder-${idx}`} className="selected-rider placeholder"></div>
          ))}
        </div>
      )}
    </div>
  );
}
