const isWindows = require('../utils/platform-utils.js').isWindows;
const path = require('node:path');
const os = require("os");
const fs = require("fs");

module.exports = {
  getSanitizezLinkName(linkName) {
    const result = isWindows && !linkName.endsWith('.lnk') ? `${linkName}.lnk` : linkName;

    if (!result.includes(' ')) {
      return result;
    }

    console.warn("Link name cannot contain spaces, replacing them with dashes");
    return result.replace(' ', '-');
  },
  /**
   * @param {string} linkName
   * @returns {string}
   */
  getLinkPath(linkName) {
    return path.resolve(getLinkDirectoryPath(), linkName);
  },
  linkDirectoryPath: getLinkDirectoryPath(),
  /**
   *
   * @param {string} fileName
   * @returns {boolean}
   */
  isLink(fileName) {
    if (fileName.includes(' ')) {
      return false;
    }

    const linkPath = this.getLinkPath(fileName);
    if (!fs.existsSync(linkPath)) {
      return false;
    }

    if (isWindows) {
      // not very precise, but good enough for now
      return fileName.endsWith('.lnk');
    } else {
      return fs.lstatSync(linkPath).isSymbolicLink();
    }
  },
  /**
   * @returns {string[]}
   */
  getInstalledPortalNames() {
    return fs.readdirSync(this.linkDirectoryPath)
      .filter(file => this.isLink(file));
  }
}

/**
 *
 * @returns {string}
 */
function getLinkDirectoryPath() {
  return path.resolve(os.homedir(), '.shell-portals');
}
