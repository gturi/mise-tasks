const { execSync, spawnSync } = require('child_process');

function exec(command) {
    execSync(command, { stdio: 'inherit' });
}

function commitAndGetHash() {
  const printSeparator = () => console.log('-'.repeat(50));

  printSeparator();

  exec('git status');

  // TODO: prompt user to check if he wants to proceed

  printSeparator();

  exec('git commit');

  printSeparator();

  exec('git status');

  printSeparator();

  exec('git rev-parse --verify HEAD');

  printSeparator();
};

function main() {
    commitAndGetHash();
}

main();
