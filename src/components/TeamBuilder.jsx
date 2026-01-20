import { useRiders } from '../hooks/useRiders';
import { useUserTeam } from '../hooks/useUserTeam';
import { useCyclingTeams } from '../hooks/useCyclingTeams';
import { useUserBudget } from '../hooks/useUserBudget';
import SelectedTeam from './SelectedTeam';
import AvailableRiders from './AvailableRiders';
import { formatPrice } from '../utils/formatters';
import '../css/TeamBuilder.css';

function TeamBuilder({ user }) {
  const { budget, loading: budgetLoading } = useUserBudget(user);
  const { riders, loading } = useRiders();
  const { selectedRiders, addRider, removeRider, saveTeam, saveStatus, getTotalSpent } = useUserTeam(user, budget);
  const { teams } = useCyclingTeams();

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
        />
        <AvailableRiders
          riders={riders}
          teams={teams}
          selectedRiders={selectedRiders}
          remainingBudget={getRemainingBudget()}
          onAddRider={addRider}
        />
      </div>
    </div>
  );
}

export default TeamBuilder;
