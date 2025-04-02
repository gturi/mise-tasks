const { execSync } = require('child_process');

/**
 * @param {string[]} gitBranches
 */
function purgeBranch(gitBranches) {
  const sharedLogic = require('./purge-shared-logic');

  const forbiddenBranchNames = sharedLogic.getForbiddenBranchNames();

  const nonDeletableBranches = gitBranches
    .filter(branch => forbiddenBranchNames.includes(branch))
    .join(', ');

  if (nonDeletableBranches.length > 0) {
    throw new Error(`Branches '${nonDeletableBranches}' cannot be deleted`);
  }

  const gitBranchesToString = gitBranches.join(' ');
  execSync(`git branch -d ${gitBranchesToString}`);
  execSync(`git push origin --delete ${gitBranchesToString}`);
};

function main() {
  const { usage_branches } = process.env;
  purgeBranch(usage_branches.split(' '));
}

main();
