const fs = require('node:fs');
const path = require('node:path');
const isWindows = require('../../utils/platform-utils.js').isWindows;
const PathUtils = require('../../utils/path-utils.js');
const StringUtils = require('../../utils/string-utils.js');
const { runSync, runPowershellScriptSync } = require('../../utils/shell-utils.js');
const PortalCommon = require('../portal-common.js');

class CreatePortal {
  /**
   *
   * @param {string | undefined} directory
   * @param {string | undefined} linkName
   */
  constructor(directory, linkName) {
    this.directory = directory;
    this.linkName = linkName;
  }
}

/**
 *
 * @param {CreatePortal} input
 */
function create(input) {
  const directory = getTargetDirectory(input);

  const linkName = getLinkName(input, directory);

  const linkPath = PortalCommon.getLinkPath(linkName);

  if (fs.existsSync(linkPath)) {
    console.error(`Error: linkName '${linkName}' already exists!`);
    return -1;
  }

  if (!fs.existsSync(PortalCommon.linkDirectoryPath)) {
    fs.mkdirSync(PortalCommon.linkDirectoryPath);
  }

  createLink(directory, linkPath);

  console.log(`Created portal "${linkName}" -> "${directory}"`);
}

/**
 * @param {CreatePortal} input
 */
function getTargetDirectory(input) {
  return StringUtils.isBlank(input.directory)
    ? process.cwd()
    : PathUtils.resolvePath(input.directory);

}

/**
 * @param {CreatePortal} input
 * @param {string} directory
 */
function getLinkName(input, directory) {
  let linkName = StringUtils.isBlank(input.linkName)
    ? path.basename(directory)
    : input.linkName;

  return PortalCommon.getSanitizezLinkName(linkName);
}

/**
 *
 * @param {string} directory directory to link
 * @param {string} linkPath path where the link will be created at
 */
function createLink(directory, linkPath) {
  if (isWindows) {
    const createShortcut = path.resolve(__dirname, 'create-shortcut.ps1');
    runPowershellScriptSync(createShortcut, directory, linkPath);
  } else {
    runSync('ln', '-s', directory, linkPath);
  }
}

function main() {
  const { usage_directory, usage_link_name } = process.env;
  const input = new CreatePortal(usage_directory, usage_link_name);
  create(input);
}

main();
