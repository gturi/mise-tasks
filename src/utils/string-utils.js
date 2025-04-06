module.exports = {
  /**
   * @param {string} s
   * @returns {boolean}
   */
  isBlank(s) {
    return s === undefined || s === null || s.trim().length === 0;
  }
}
