const { printCompletion } = require('../../utils/shell-utils.js');

/**
 * @return {string[]}
 */
function getLocalBranches() {
  const gitSharedLogic = require('../git-shared-logic.js');

  const currentBranch = gitSharedLogic.getCurrentBranch();
  const localBranches = gitSharedLogic.getLocalBranches();

  return localBranches.filter(branch => branch !== currentBranch);
};

function main() {
  printCompletion(getLocalBranches());
}

main();
