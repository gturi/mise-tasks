#!/usr/bin/env node

import fs from 'fs';
import { homedir } from 'os';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
process.chdir(__dirname);

console.log(process.cwd())

const src = path.join(__dirname, 'src');

const miseTasks = fs.readdirSync(src).values()
  .map(directory => path.join(src, directory, 'tasks.toml'))
  .filter(tomlTasksFile => fs.existsSync(tomlTasksFile))
  .toArray();

const miseConfig = `
[task_config]
includes = ${JSON.stringify(miseTasks, null, 2)}
`;

const miseConfigDirectory = path.join(homedir(), '.config', 'mise');

fs.mkdirSync(miseConfigDirectory, { recursive: true });

const miseConfigFile = path.join(miseConfigDirectory, 'config.toml');

// TODO: use mise native commands when available

fs.appendFileSync(miseConfigFile, miseConfig);

console.log(`Appended the following task configuration to '${miseConfigFile}':`)
console.log(miseConfig);

(async () => {
  const misePortalActivation = await prompt("Do you want to activate mise portal functionality in your shell? [s/N]: ");

  if (misePortalActivation?.trim() !== 's') {
    console.warn(`Mise portal activation aborted`);
    return;
  }

  const shellType = await prompt("For which shell? [bash/zsh]: ");
  if (shellType !== 'bash' && shellType !== 'zsh') {
    console.error(`Shell '${shellType}' is not supported`);
    return;
  }

  const shellRcFile = path.join(homedir(), `.${shellType}rc`);
  const activationCommand = `
  eval "$(mise run portal-activate --command w ${shellType})"
  `;
  fs.appendFileSync(shellRcFile, activationCommand.split('\n').map(line => line.trim()).join('\n'));

  console.log(`Appended '${activationCommand}' to '${shellRcFile}'`)
})();
