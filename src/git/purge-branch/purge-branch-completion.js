const { printCompletion } = require('../../utils/shell-utils.js');
const sharedLogic = require('./purge-shared-logic.js');

/**
 * @return {string[]}
 */
function getDeletableBranches() {
  // TODO: exclude from the deletable branches those that are already passed as an argument
  return sharedLogic.getDeletableBranches();
};

function main() {
  printCompletion(getDeletableBranches());
}

main();
