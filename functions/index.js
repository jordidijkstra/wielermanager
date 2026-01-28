const { autoFillRaceTeams, autoFillRaceTeamsScheduled } = require('./autoFillRaceTeams');
const { calculateTeamPointsOnResultChange, calculateTeamPointsScheduled } = require('./calculateTeamPoints');
const { updateBestTeam, updateBestTeamOnRiderPoints } = require('./updateBestTeam');

module.exports = {
  autoFillRaceTeams,
  autoFillRaceTeamsScheduled,
  calculateTeamPointsOnResultChange,
  calculateTeamPointsScheduled,
  updateBestTeam,
  updateBestTeamOnRiderPoints
};
