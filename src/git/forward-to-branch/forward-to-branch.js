const { execSync } = require('child_process');

function exec(command) {
  execSync(command, { stdio: 'inherit' });
}

/**
 *
 * @param {string} targetBranch
 * @param {string} mergeStrategy
 */
function forwardToBranch(targetBranch, mergeStrategy = '') {
  const gitSharedLogic = require('../git-shared-logic');

  const currentBranch = gitSharedLogic.getCurrentBranch();
  const protectedBranches = gitSharedLogic.protectedBranches;
  if (protectedBranches.includes(currentBranch)) {
    throw new Error(`${currentBranch} should be updated via PR`);
  }

  if (currentBranch === targetBranch) {
    throw new Error(`current branch and target branch should be different`);
  }

  exec(`git checkout ${targetBranch}`);
  exec(`git merge ${mergeStrategy} ${currentBranch}`);
}

function main() {
  const { usage_target_branch, usage_strategy } = process.env;
  forwardToBranch(usage_target_branch, usage_strategy);
}

main();
