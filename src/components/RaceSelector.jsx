export function RaceSelector({ races, selectedRaceId, onRaceChange, batchSaveStatus, onSaveAll }) {
  return (
    <div className="race-selector">
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
      <button className="btn-save-all" onClick={onSaveAll}>
        Alle Selecties Opslaan
      </button>
      {batchSaveStatus && <p className="batch-save-status">{batchSaveStatus}</p>}
    </div>
  );
}
