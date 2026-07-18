const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('sync-current-branch-completion integration tests', () => {
  let testRepoPath;
  let originalCwd;
  let scriptPath;

  beforeEach(() => {
    // Save original working directory
    originalCwd = process.cwd();

    // Path to the script we're testing
    scriptPath = path.join(originalCwd, 'src', 'git', 'sync-current-branch', 'sync-current-branch-completion.js');

    // Create a temporary directory for test repository
    testRepoPath = fs.mkdtempSync(path.join(os.tmpdir(), 'git-test-completion-'));
    process.chdir(testRepoPath);

    // Initialize git repo
    execSync('git init', { stdio: 'pipe' });
    execSync('git config user.email "test@example.com"', { stdio: 'pipe' });
    execSync('git config user.name "Test User"', { stdio: 'pipe' });

    // Create initial commit on main branch so we have a valid HEAD
    fs.writeFileSync('README.md', '# Test Repo');
    execSync('git add .', { stdio: 'pipe' });
    execSync('git commit -m "Initial commit"', { stdio: 'pipe' });
    execSync('git branch -M main', { stdio: 'pipe' });
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
   * Helper function to run the completion script
   */
  function runCompletionScript() {
    const result = spawnSync('node', [scriptPath], {
      cwd: testRepoPath,
      env: {
        ...process.env
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

  test('should return empty output when there is only one branch (current branch)', () => {
    const result = runCompletionScript();

    assertThatResultHasNoError(result);
    assert.strictEqual(result.stdout.trim(), '');
  });

  test('should output all other local branches excluding current branch', () => {
    // Create additional local branches
    execSync('git branch branch-a', { stdio: 'pipe' });
    execSync('git branch branch-b', { stdio: 'pipe' });

    const result = runCompletionScript();

    assertThatResultHasNoError(result);

    const branches = result.stdout.trim().split('\n').map(b => b.trim()).filter(Boolean).sort();

    assert.deepStrictEqual(branches, ['branch-a', 'branch-b']);
  });

  test('should exclude current branch when not on main branch', () => {
    // Create additional local branches
    execSync('git branch branch-a', { stdio: 'pipe' });
    execSync('git branch branch-b', { stdio: 'pipe' });

    // Switch to branch-a
    execSync('git checkout branch-a', { stdio: 'pipe' });

    const result = runCompletionScript();

    assertThatResultHasNoError(result);

    const branches = result.stdout.trim().split('\n').map(b => b.trim()).filter(Boolean).sort();

    assert.deepStrictEqual(branches, ['branch-b', 'main']);
  });

  test('should output branches containing special characters in their name', () => {
    // Create branch with slash/special characters
    execSync('git branch feature/my-feature', { stdio: 'pipe' });
    execSync('git branch bugfix/issue-123', { stdio: 'pipe' });

    const result = runCompletionScript();

    assertThatResultHasNoError(result);

    const branches = result.stdout.trim().split('\n').map(b => b.trim()).filter(Boolean).sort();

    assert.deepStrictEqual(branches, ['bugfix/issue-123', 'feature/my-feature']);
  });

  test('should handle running outside of a git repository gracefully', () => {
    // Create a temporary non-git directory
    const nonGitDir = fs.mkdtempSync(path.join(os.tmpdir(), 'non-git-'));

    const result = spawnSync('node', [scriptPath], {
      cwd: nonGitDir,
      env: { ...process.env },
      encoding: 'utf8'
    });

    // Clean up temporary non-git directory
    fs.rmSync(nonGitDir, { recursive: true, force: true });

    assertThatResultHasNoError(result);
    assert.strictEqual(result.stdout.trim(), '');
  });

  function assertThatResultHasNoError(result) {
    assert.strictEqual(result.stderr, '');
    assert.strictEqual(result.error, undefined);
    assert.strictEqual(result.status, 0);
  }
});
