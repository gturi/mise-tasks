function getDeletableBranches() {
  const sharedLogic = require('./purge-shared-logic.js');
  // TODO: exclude from the deletable branches those that are already passed as an argument
  console.log(sharedLogic.getDeletableBranches().join(' '));
};

function main() {
  getDeletableBranches();
}

main();
