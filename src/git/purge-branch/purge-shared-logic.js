const gitSharedLogic = require('../git-shared-logic');

/**
 *
 * @returns {string[]}
 */
const getForbiddenBranchNames = () => {
  const currentBranch = gitSharedLogic.getCurrentBranch();
  return [...gitSharedLogic.protectedBranches, currentBranch];
}

/**
 *
 * @returns {string[]}
 */
const getDeletableBranches = () => {
  const localBranches = gitSharedLogic.getLocalBranches();
  const forbidden = getForbiddenBranchNames();
  return localBranches.filter(branchName => !forbidden.includes(branchName));
}

module.exports = {
  getDeletableBranches,
  getForbiddenBranchNames
};
