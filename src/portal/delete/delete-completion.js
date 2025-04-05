const { printCompletion } = require('../../utils/shell-utils.js');
const PortalCommon = require('../portal-common.js');

/**
 * @returns {string[]}
 */
function getDeletePortalCompletion() {
  // TODO: filter out the linkNames taht are already present in the cli
  return PortalCommon.getInstalledPortalNames();
}

function main() {
  const completionArray = getDeletePortalCompletion();
  printCompletion(completionArray);
}

main();
