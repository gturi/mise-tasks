const { spawnSync } = require('../utils/shell-utils.js');

const getGitBranches = (gitBranchCmdArgs) => {
  return spawnSync(`git branch ${gitBranchCmdArgs}`)?.stdout?.toString()
    .split('\n')
    .filter(Boolean) ?? [];
}

const protectedBranches = [
  'main',
  'master',
  'develop'
];

function getLocalBranches() {
  return getGitBranches("--format='%(refname:short)'");
}

function getCurrentBranch() {
  return getGitBranches('--show-current')[0];
}

module.exports = {
  getGitBranches,
  getLocalBranches,
  getCurrentBranch,
  protectedBranches
};
