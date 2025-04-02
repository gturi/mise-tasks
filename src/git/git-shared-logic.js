const { spawnSync } = require('../utils/shell-utils.js');

const getGitBranches = (...args) => {
  return spawnSync('git', 'branch', ...args)?.stdout?.toString()
    .split('\n')
    .filter(branch => branch !== '') ?? [];
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
