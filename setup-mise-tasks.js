#!/usr/bin/env node

import { readdirSync, existsSync, appendFileSync } from 'fs';
import { homedir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
process.chdir(__dirname);

console.log(process.cwd())

const src = path.join(__dirname, 'src');

const miseTasks = readdirSync(src).values()
  .map(directory => path.join(src, directory, 'tasks.toml'))
  .filter(tomlTasksFile => existsSync(tomlTasksFile))
  .toArray();

const miseConfig = `
[task_config]
includes = ${JSON.stringify(miseTasks, null, 2)}
`;

const miseConfigFile = path.join(homedir(), '.config', 'mise', 'config.toml');

// TODO: use mise native commands when available

console.log(`Appending the task configuration to '${miseConfigFile}'`)
console.log(miseConfig);

appendFileSync(miseConfigFile, miseConfig);
