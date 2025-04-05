const path = require('node:path');

module.exports = {
  /**
   * @param {string} p
   * @returns {string}
   */
  resolvePath(p) {
    return path.isAbsolute(p) ? p : path.join(process.cwd(), p);
  }
}
