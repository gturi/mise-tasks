const { printCompletion } = require('../../utils/shell-utils.js');
const PortalCommon = require('../portal-common.js');

function targetCompletion() {
  return PortalCommon.getInstalledPortalNames();
}

function main() {
  printCompletion(targetCompletion());
}

main();
