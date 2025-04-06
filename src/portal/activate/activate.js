const PortalCommon = require('../portal-common.js');

/**
 * @param {string} shellType
 * @param {string} command
 */
function activate(shellType = 'bash', command = 'warp') {
  if (command === '') {
    console.error('Error: command cannot be empty');
    return -1;
  }

  if (command.includes(' ')) {
    console.error('Error: command cannot contain whitespaces');
    return -1;
  }

  const shellCompletion = require(`./template/${shellType}.js`);

  console.log(shellCompletion(PortalCommon.linkDirectoryPath, command));
}

function main() {
  const { usage_shell_type, usage_command } = process.env;
  activate(usage_shell_type, usage_command);
}

main();
