module.exports = {
  isWindows: process.platform === "win32",
  isGitBashSession: process.env.MSYSTEM === 'MINGW64'
}
