export function RaceSelector({ races, selectedRaceId, selectedRaceDeadline, onRaceChange, batchSaveStatus, onSaveAll }) {
  return (
    <div className="race-selector">
      <div className="race-selector-wrapper">
        <div className="race-selector-select">
          <label>Kies een race:</label>
          <select value={selectedRaceId} onChange={(e) => onRaceChange(e.target.value)}>
            <option value="">- Race -</option>
            {races.map(race => (
              <option
                key={race.id}
                value={race.id}
                disabled={race.disabled}
                title={race.title}
              >
                {race.label}
              </option>
            ))}
          </select>
        </div>

        {selectedRaceDeadline && (
          <div className="deadline-date-selected-race">
            <span className="deadline-label">⏱️ Deadline:</span>
            <span className="deadline-date-text">
              {selectedRaceDeadline.toLocaleDateString('nl-NL', { weekday: 'short', month: 'short', day: 'numeric' })} {selectedRaceDeadline.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
      </div>

      <button className="btn-save-all" onClick={onSaveAll}>
        Alle Selecties Opslaan
      </button>
      {batchSaveStatus && <p className="batch-save-status">{batchSaveStatus}</p>}
    </div>
  );
}
