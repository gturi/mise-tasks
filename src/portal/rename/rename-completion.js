const { printCompletion } = require('../../utils/shell-utils.js');
const PortalCommon = require('../portal-common.js');

/**
 * @returns {string[]}
 */
function getRenamePortalCompletion() {
  return PortalCommon.getInstalledPortalNames();
}

function main() {
  const completionArray = getRenamePortalCompletion();
  printCompletion(completionArray);
}

main();
