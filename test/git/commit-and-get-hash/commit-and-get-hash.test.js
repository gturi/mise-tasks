const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('commit-and-get-hash integration tests', () => {
  let testRepoPath;
  let originalCwd;
  let scriptPath;

  beforeEach(() => {
    // Save original working directory
    originalCwd = process.cwd();

    // Path to the script we're testing
    scriptPath = path.join(originalCwd, 'src', 'git', 'commit-and-get-hash', 'commit-and-get-hash.js');

    // Create a temporary directory for test repository
    testRepoPath = fs.mkdtempSync(path.join(os.tmpdir(), 'git-commit-test-'));
    process.chdir(testRepoPath);
  });

  afterEach(() => {
    // Restore original working directory
    process.chdir(originalCwd);

    // Clean up test repository
    if (fs.existsSync(testRepoPath)) {
      fs.rmSync(testRepoPath, { recursive: true, force: true });
    }
  });

  /**
   * Helper function to run the commit script
   */
  function runCommitScript(env = {}) {
    const result = spawnSync('node', [scriptPath], {
      cwd: testRepoPath,
      env: {
        ...process.env,
        ...env
      },
      encoding: 'utf8'
    });

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      status: result.status,
      error: result.error
    };
  }

  test('should fail when not in a git repository', () => {
    const result = runCommitScript();
    
    assert.notStrictEqual(result.status, 0);
    assert.match(result.stdout + result.stderr, /not a git repository/i);
  });

  test('should fail when there are no changes to commit', () => {
    // Initialize git repo
    execSync('git init', { stdio: 'pipe' });
    execSync('git config user.email "test@example.com"', { stdio: 'pipe' });
    execSync('git config user.name "Test User"', { stdio: 'pipe' });

    // Try to run the script
    const result = runCommitScript();

    assert.notStrictEqual(result.status, 0);
    assert.match(result.stdout + result.stderr, /nothing to commit/i);
  });

  test('should successfully commit staged changes and output the commit hash', () => {
    // Initialize git repo
    execSync('git init', { stdio: 'pipe' });
    execSync('git config user.email "test@example.com"', { stdio: 'pipe' });
    execSync('git config user.name "Test User"', { stdio: 'pipe' });

    // Create an initial commit so we have a HEAD
    fs.writeFileSync('README.md', '# Initial README');
    execSync('git add README.md', { stdio: 'pipe' });
    execSync('git commit -m "Initial commit"', { stdio: 'pipe' });

    // Create a new file and stage it
    fs.writeFileSync('file.txt', 'some content');
    execSync('git add file.txt', { stdio: 'pipe' });

    // Configure a mock editor via GIT_EDITOR env var to commit automatically without prompt
    const mockEditor = `node -e "require('fs').writeFileSync(process.argv[process.argv.length - 1], 'Commit from integration test')"`
    
    const result = runCommitScript({
      GIT_EDITOR: mockEditor
    });

    assert.strictEqual(result.status, 0, `Script failed: ${result.stderr}`);

    // Verify git status and hash in stdout
    // The script prints rev-parse --verify HEAD. Let's find the hash in the output.
    const stdoutLines = result.stdout.trim().split('\n');
    
    // Find lines that look like a 40-character hex SHA-1 hash
    const hashes = stdoutLines.filter(line => /^[0-9a-f]{40}$/.test(line.trim()));
    assert.strictEqual(hashes.length, 1, `Expected to find exactly one commit hash, got: ${JSON.stringify(hashes)}`);

    const commitHash = hashes[0].trim();

    // Verify the commit exists and matches the hash
    const gitLogHash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    assert.strictEqual(commitHash, gitLogHash);

    // Verify the commit message is what the mock editor wrote
    const commitMsg = execSync('git log -1 --pretty=%B', { encoding: 'utf8' }).trim();
    assert.strictEqual(commitMsg, 'Commit from integration test');
  });
});
