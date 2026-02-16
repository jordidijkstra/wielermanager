import { useEffect } from 'react';
import { useRiders } from '../hooks/useRiders';
import { useUserTeam } from '../hooks/useUserTeam';
import { useCyclingTeams } from '../hooks/useCyclingTeams';
import { useUserBudget } from '../hooks/useUserBudget';
import { useTeamDeadline } from '../hooks/useTeamDeadline';
import SelectedTeam from '../features/team/SelectedTeam';
import AvailableRiders from '../features/team/AvailableRiders';
import { formatPrice } from '../utils/formatters';
import '../css/TeamBuilder.css';

function TeamBuilder({ user, setCurrentPage }) {
  const { budget, loading: budgetLoading } = useUserBudget(user);
  const { riders, loading } = useRiders();
  const { selectedRiders, addRider, removeRider, saveTeam, saveStatus, getTotalSpent, deadlinePassed } = useUserTeam(user, budget);
  const { teams } = useCyclingTeams();
  const { deadlinePassed: checkDeadline } = useTeamDeadline(user);

  // Redirect if deadline has passed
  useEffect(() => {
    if (checkDeadline) {
      console.log('⏱️ Deadline passed - redirecting to home');
      setCurrentPage('home');
    }
  }, [checkDeadline, setCurrentPage]);

  const getRemainingBudget = () => budget - getTotalSpent();

  if (loading || budgetLoading) {
    return <div className="team-builder loading">Laden...</div>;
  }

  return (
    <div className="team-builder">
      <div className="team-header">
        <h1>Stel je Team Samen</h1>
        <div className="budget-info">
          <div className="budget-stat">
            <span className="label">Budget:</span>
            <span className="value">{formatPrice(budget)}</span>
          </div>
          <div className="budget-stat">
            <span className="label">Uitgegeven:</span>
            <span className="value spent">{formatPrice(getTotalSpent())}</span>
          </div>
          <div className="budget-stat">
            <span className="label">Resterend:</span>
            <span className={`value ${getRemainingBudget() < 0 ? 'over-budget' : ''}`}>
              {formatPrice(getRemainingBudget())}
            </span>
          </div>
          <div className="budget-stat">
            <span className="label">Renners:</span>
            <span className="value">{selectedRiders.length}/30</span>
          </div>
        </div>
      </div>

      <div className="team-content">
        <SelectedTeam
          selectedRiders={selectedRiders}
          onRemoveRider={removeRider}
          onSaveTeam={saveTeam}
          saveStatus={saveStatus}
          deadlinePassed={deadlinePassed}
        />
        <AvailableRiders
          riders={riders}
          teams={teams}
          selectedRiders={selectedRiders}
          remainingBudget={getRemainingBudget()}
          onAddRider={addRider}
          deadlinePassed={deadlinePassed}
        />
      </div>
    </div>
  );
}

export default TeamBuilder;
