function getDirectories(source) {
  const fs = require('fs');
  return fs.readdirSync(source, { withFileTypes: true })
    .filter(file => file.isDirectory())
    .map(file => file.name);
}

function forEach(command) {
  const path = require('path');

  const { execSync } = require('child_process');

  const workingDir = process.cwd();

  getDirectories(workingDir).forEach(dir => {
    const childDir = path.join(workingDir, dir);
    process.chdir(childDir);

    const executionMessage = `Executing command in ${childDir}`;
    const separator = '-'.repeat(executionMessage.length);

    const message = [
      `\n\n${separator}`,
      executionMessage,
      `${separator}\n`
    ].join('\n');

    console.log(message);

    try {
      execSync(command, { stdio: "inherit" });
    } catch (error) {
      console.error(`Failed executing command '${command}' in ${process.cwd()} (exit code: ${error.status})`);
    }

    console.log(`\n${separator}`);
  });

};

function main() {
  const { usage_command } = process.env;
  forEach(usage_command);
}

main();
