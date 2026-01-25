const { autoFillRaceTeams, autoFillRaceTeamsScheduled } = require('./autoFillRaceTeams');
const { calculateTeamPointsOnResultChange, calculateTeamPointsScheduled } = require('./calculateTeamPoints');

module.exports = {
  autoFillRaceTeams,
  autoFillRaceTeamsScheduled,
  calculateTeamPointsOnResultChange,
  calculateTeamPointsScheduled
};
