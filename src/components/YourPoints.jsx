import { useRiders } from '../hooks/useRiders';
import { useUserTeam } from '../hooks/useUserTeam';
import { usePointsByCategory } from '../hooks/usePointsByCategory';
import { useCyclingTeams } from '../hooks/useCyclingTeams';
import '../css/yourPoints.css';

export default function YourPoints({ user }) {
  const { riders } = useRiders();
  const { selectedRiders } = useUserTeam(user, 10000000);
  const { pointsByCategory } = usePointsByCategory();
  const { teams } = useCyclingTeams();

  if (!selectedRiders || selectedRiders.length === 0) {
    return (
      <div className="your-points">
        <h1>Jouw Punten</h1>
        <p className="no-data-message">Je hebt nog geen team samengesteld</p>
      </div>
    );
  }

  const formatPrice = (price) => '€' + (price / 1000000).toFixed(1) + 'M';
  const getFullName = (rider) => `${rider.firstname} ${rider.lastname}`;

  const getTeamJerseyPath = (teamId) => {
    const team = teams?.find(t => t.id === teamId);
    return team?.cyclingKit
      ? `/assets/${team.cyclingKit}`
      : '/assets/default.webp';
  };

  // Get points for each rider by their category
  const getRiderPoints = (rider) => {
    if (!rider.categoryId || !pointsByCategory[rider.categoryId]) {
      return 0;
    }
    const points = pointsByCategory[rider.categoryId];
    const riderPoint = points.find(p => p.riderId === rider.id);
    return riderPoint ? riderPoint.points : 0;
  };

  const totalPoints = selectedRiders.reduce((sum, rider) => sum + getRiderPoints(rider), 0);

  return (
    <div className="your-points">
      <h1>Jouw Punten</h1>

      <div className="yourpoints-section">
        <div className="yourpoints-header">
          <h2>Jouw Team - {selectedRiders.length} Renners</h2>
          <div className="yourpoints-total-points">
            <span className="label">Totaal Punten:</span>
            <span className="value">{totalPoints}</span>
          </div>
        </div>
        
        <div className="yourpoints-riders-list">
          {[...selectedRiders]
            .sort((a, b) => b.price - a.price)
            .map(rider => {
              const jerseyPath = getTeamJerseyPath(rider.teamId);
              const riderPoints = getRiderPoints(rider);
              return (
                <div key={rider.id} className="yourpoints-rider">
                  <img 
                    src={jerseyPath}
                    alt="jersey" 
                    className="yourpoints-rider-jersey"
                    onError={(e) => e.target.src = '/assets/default.webp'}
                  />
                  <div className="yourpoints-rider-info">
                    <div className="yourpoints-rider-name">{getFullName(rider)}</div>
                  </div>
                  <div className="yourpoints-rider-actions">
                    <span className="yourpoints-rider-points">{riderPoints} pts</span>
                  </div>
                </div>
              );
            })}
          {Array.from({ length: 30 - selectedRiders.length }).map((_, idx) => (
            <div key={`placeholder-${idx}`} className="yourpoints-rider placeholder"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
