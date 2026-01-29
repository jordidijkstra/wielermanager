const { autoFillRaceTeams, autoFillRaceTeamsScheduled } = require('./autoFillRaceTeams');
const { calculateTeamPointsOnResultChange, calculateTeamPointsScheduled } = require('./calculateTeamPoints');
const { updateBestTeamScheduled } = require('./updateBestTeam');

module.exports = {
  autoFillRaceTeams,
  autoFillRaceTeamsScheduled,
  calculateTeamPointsOnResultChange,
  calculateTeamPointsScheduled,
  updateBestTeamScheduled
};
