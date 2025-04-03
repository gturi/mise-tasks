/**
 * @return {string[]}
 */
function getLocalBranches() {
  const gitSharedLogic = require('../git-shared-logic');

  const currentBranch = gitSharedLogic.getCurrentBranch();
  const localBranches = gitSharedLogic.getLocalBranches();

  return localBranches.filter(branch => branch !== currentBranch);
};

function logLocalBranches() {
  console.log(getLocalBranches().join(' '));
}

function main() {
  logLocalBranches();
}

main();
