const fs = require("fs");
const { varargEnvVariableToArray } = require('../../utils/shell-utils.js');
const PortalCommon = require('../portal-common.js');

/**
 * @param {string[]} linkNames
 */
function deletePortal(linkNames) {
  linkNames.values()
    .map(bookmarkName => PortalCommon.getSanitizezLinkName(bookmarkName))
    .forEach(bookmarkName => deleteLink(bookmarkName));
}

/**
 * @param {string} linkName
 */
function deleteLink(linkName) {
  const linkPath = PortalCommon.getLinkPath(linkName);

  if (!fs.existsSync(linkPath)) {
    console.warn(`Link "${linkName}" does not exist`);
    return;
  }

  fs.unlinkSync(linkPath);

  console.info(`Removed link "${linkName}"`);
}

function main() {
  const { usage_link_names } = process.env;
  const linkNames = varargEnvVariableToArray(usage_link_names);
  deletePortal(linkNames);
}

main();
