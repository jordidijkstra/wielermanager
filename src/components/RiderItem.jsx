export function RiderItem({
  rider,
  isSelected,
  isUnavailable,
  jerseyPath,
  onToggle,
}) {
  return (
    <div
      className={`rider-item ${isSelected ? 'selected' : ''} ${
        isUnavailable ? 'unavailable' : ''
      }`}
      onClick={onToggle}
      title={
        isUnavailable
          ? 'Al geselecteerd voor overlappende race'
          : ''
      }
    >
      <div className="rider-jersey">
        <img
          src={jerseyPath}
          alt={`${rider.firstname} ${rider.lastname} jersey`}
        />
      </div>
      <div className="rider-name">
        {rider.firstname} {rider.lastname}
      </div>
      <div className="rider-price">
        €{(rider.price / 1000000).toFixed(1)}M
      </div>
      {isSelected && <div className="checkmark">✓</div>}
      {isUnavailable && !isSelected && (
        <div className="unavailable-badge">Niet beschikbaar</div>
      )}
    </div>
  );
}
