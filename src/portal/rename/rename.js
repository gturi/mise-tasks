const fs = require("fs");
const PortalCommon = require('../portal-common.js');

/**
 *
 * @param {string} linkName
 * @param {string} newLinkName
 */
function rename(linkName, newLinkName) {
  const sanitizedLinkName = PortalCommon.getSanitizezLinkName(linkName);
  const sanitizeNewLinkName = PortalCommon.getSanitizezLinkName(newLinkName);

  const linkPath = PortalCommon.getLinkPath(sanitizedLinkName);
  if (!fs.existsSync(linkPath)) {
    console.error(`Portal link "${sanitizedLinkName}" does not exist`);
    return;
  }

  const newLinkPath = PortalCommon.getLinkPath(sanitizeNewLinkName);
  if (fs.existsSync(newLinkPath)) {
    console.error(`Portal link "${newLinkPath}" already exists`);
    return;
  }

  fs.renameSync(linkPath, newLinkPath);

  console.log(`Renamend portal link "${sanitizedLinkName}" to "${sanitizeNewLinkName}"`);
};

function main() {
  const { usage_link_name, usage_new_link_name } = process.env;
  rename(usage_link_name, usage_new_link_name);
}

main();
