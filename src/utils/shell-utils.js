const { spawnSync: builtinSpawnSync, SpawnSyncReturns } = require('node:child_process');

module.exports = {
  /**
   * @param {string} powershellScript
   * @param {string[]} args
   */
  runPowershellScriptSync(powershellScript, ...args) {
    runSync('powershell', '-c', powershellScript, ...args);
  },
  /**
   * @param {string} command
   * @param {string[]} args
   */
  runSync(command, ...args) {
    runSync(command, ...args);
  },
  /**
   * @param {string} command
   * @param {string[]} args
   * @returns {SpawnSyncReturns<Buffer>}
   */
  spawnSync(command, ...args) {
    return spawnSync(command, ...args);
  },
  /**
   *
   * @param {string[]} args
   * @returns {string[]}
   */
  sanitizeArgs(...args) {
    return sanitizeArgs(args);
  },
  /**
   *
   * @param {string} varargEnvVariable
   * @returns {string[]}
   */
  varargEnvVariableToArray(varargEnvVariable) {
    // TODO: if the variable is "foo 'bar baz'"" the splitting will be wrong!
    return varargEnvVariable.split(' ');
  },
  /**
   *
   * @param {string[]} completionArray
   */
  printCompletion(completionArray) {
    console.log(completionArray.join(' '));
  }
}

/**
 * Spawn function to be used when the command output
 * should be displayed in the console
 *
 * @param {string} command
 * @param {string[]} args
 */
function runSync(command, ...args) {
  const sanitizedArgs = sanitizeArgs(args);
  builtinSpawnSync(command, sanitizedArgs, {
    stdio: "inherit",
    shell: true
  });
}

/**
 * Spawn function to be used when it is necessary
 * to manipulate the command output in the program
 *
 * @param {string} command
 * @param {string[]} args
 * @returns {SpawnSyncReturns<Buffer>}
 */
function spawnSync(command, ...args) {
  const sanitizedArgs = sanitizeArgs(args);
  return builtinSpawnSync(command, sanitizedArgs, {
    shell: true
  });
}

/**
 *
 * @param {string[]} args
 * @returns {string[]}
 */
function sanitizeArgs(args) {
  return args.map(arg => arg.includes(' ') ? `"${arg}"` : arg);
}
