const path = require('node:path');
const fs = require('node:fs');
const { isWindows, isGitBashSession } = require('../../utils/platform-utils.js');
const sanitizeArgs = require('../../utils/shell-utils.js').sanitizeArgs;
const PortalCommon = require('../portal-common.js');
const { spawnSync } = require('node:child_process');

/**
 *
 * @param {*} linkName
 */
function target(linkName) {
  const sanitizedLinkName = PortalCommon.getSanitizezLinkName(linkName);

  if (!PortalCommon.isLink(sanitizedLinkName)) {
    console.error(`Link ${sanitizedLinkName} does not exists!`);
    return -1;
  }

  const linkPath = PortalCommon.getLinkPath(sanitizedLinkName);

  console.log(getLinkTarget(linkPath));
}

/**
 *
 * @param {string} linkPath
 * @return {string}
 */
function getLinkTarget(linkPath) {
  if (isWindows) {
    const getShortcutTarget = path.resolve(__dirname, 'get-shortcut-target.ps1');
    const sanitizedArgs = sanitizeArgs(linkPath);
    const windowsStylePath = spawnSync(getShortcutTarget, sanitizedArgs, {
      shell: 'powershell.exe'
    }).stdout.toString();

    return isGitBashSession ? toUnixPath(windowsStylePath) : windowsStylePath;
  } else {
    return fs.realpathSync(linkPath);
  }
}

/**
 *
 * @param {string} windowsStylePath
 * @return {string}
 */
function toUnixPath(windowsStylePath) {
  // Replace backslashes with forward slashes
  const unixPath = windowsStylePath.replace(/\\/g, '/');

  // Convert drive letter to lowercase and prepend with '/'
  return unixPath.replace(
    /^([a-zA-Z]):/,
    (_, driveLetter) => `/${driveLetter.toLowerCase()}`
  );
}

function main() {
  const { usage_link_name } = process.env;
  target(usage_link_name);
}

main();
