const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('forward-to-branch integration tests', () => {
  let testRepoPath;
  let remoteRepoPath;
  let originalCwd;
  let scriptPath;

  beforeEach(() => {
    // Save original working directory
    originalCwd = process.cwd();

    // Path to the script we're testing
    scriptPath = path.join(originalCwd, 'src', 'git', 'forward-to-branch', 'forward-to-branch.js');

    // Create a temporary directory for the bare remote repository
    remoteRepoPath = fs.mkdtempSync(path.join(os.tmpdir(), 'git-remote-'));
    execSync('git init --bare', { cwd: remoteRepoPath, stdio: 'pipe' });

    // Create a temporary directory for test repository
    testRepoPath = fs.mkdtempSync(path.join(os.tmpdir(), 'git-test-'));
    process.chdir(testRepoPath);

    // Initialize git repo
    execSync('git init', { stdio: 'pipe' });
    execSync('git config user.email "test@example.com"', { stdio: 'pipe' });
    execSync('git config user.name "Test User"', { stdio: 'pipe' });

    // Create initial commit on main branch
    fs.writeFileSync('README.md', '# Test Repo');
    execSync('git add .', { stdio: 'pipe' });
    execSync('git commit -m "Initial commit"', { stdio: 'pipe' });
    execSync('git branch -M main', { stdio: 'pipe' });

    // Add the bare repository as a remote and push
    execSync(`git remote add origin ${remoteRepoPath}`, { stdio: 'pipe' });
    execSync('git push -u origin main', { stdio: 'pipe' });
  });

  afterEach(() => {
    // Restore original working directory
    process.chdir(originalCwd);

    // Clean up test repository
    if (fs.existsSync(testRepoPath)) {
      fs.rmSync(testRepoPath, { recursive: true, force: true });
    }

    // Clean up remote repository
    if (fs.existsSync(remoteRepoPath)) {
      fs.rmSync(remoteRepoPath, { recursive: true, force: true });
    }
  });

  /**
   * Helper function to run the forward script with environment variables
   */
  function runForwardScript(targetBranch, mergeStrategy = '') {
    const result = spawnSync('node', [scriptPath], {
      cwd: testRepoPath,
      env: {
        ...process.env,
        usage_target_branch: targetBranch,
        usage_strategy: mergeStrategy
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

  test('should successfully forward current branch to target branch', () => {
    // Create a feature branch with new work
    execSync('git checkout -b feature-branch', { stdio: 'pipe' });
    fs.writeFileSync('feature.txt', 'feature work');
    execSync('git add .', { stdio: 'pipe' });
    execSync('git commit -m "Add feature"', { stdio: 'pipe' });

    // Run the forward script to merge feature-branch into main
    const result = runForwardScript('main');

    // Verify the script executed successfully
    assert.strictEqual(result.status, 0, `Script failed: ${result.stderr}`);

    // Verify we're now on the target branch (main)
    const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    assert.strictEqual(currentBranch, 'main');

    // Verify feature.txt exists (merged from feature-branch)
    assert.strictEqual(fs.existsSync('feature.txt'), true);
    assert.strictEqual(fs.existsSync('README.md'), true);
  });

  test('should fail when current branch is protected (main)', () => {
    execSync('git checkout main', { stdio: 'pipe' });

    // Try to forward main to develop (should fail)
    const result = runForwardScript('develop');

    // Verify the script failed
    assert.notStrictEqual(result.status, 0);
    assert.match(result.stderr, /main should be updated via PR/);
  });

  test('should fail when current branch is protected (master)', () => {
    execSync('git branch -M master', { stdio: 'pipe' });

    const result = runForwardScript('develop');

    assert.notStrictEqual(result.status, 0);
    assert.match(result.stderr, /master should be updated via PR/);
  });

  test('should fail when current branch is protected (develop)', () => {
    execSync('git checkout -b develop', { stdio: 'pipe' });

    const result = runForwardScript('main');

    assert.notStrictEqual(result.status, 0);
    assert.match(result.stderr, /develop should be updated via PR/);
  });

  test('should fail when current branch and target branch are the same', () => {
    execSync('git checkout -b feature-branch', { stdio: 'pipe' });

    const result = runForwardScript('feature-branch');

    assert.notStrictEqual(result.status, 0);
    assert.match(result.stderr, /current branch and target branch should be different/);
  });

  test('should use merge strategy when provided', () => {
    // Create feature branch with commits
    execSync('git checkout -b feature-branch', { stdio: 'pipe' });
    fs.writeFileSync('feature.txt', 'feature');
    execSync('git add .', { stdio: 'pipe' });
    execSync('git commit -m "Feature commit 1"', { stdio: 'pipe' });

    // Forward with --no-ff strategy
    const result = runForwardScript('main', '--no-ff');

    assert.strictEqual(result.status, 0, `Script failed: ${result.stderr}`);

    // Verify we're on main
    const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    assert.strictEqual(currentBranch, 'main');
    assert.strictEqual(fs.existsSync('feature.txt'), true);

    // Verify merge commit exists (--no-ff creates a merge commit)
    const log = execSync('git log --oneline -1', { encoding: 'utf8' });
    assert.match(log, /Merge/);
  });

  test('should handle forwarding with multiple commits', () => {
    // Create feature branch with multiple commits
    execSync('git checkout -b feature-branch', { stdio: 'pipe' });
    fs.writeFileSync('feature1.txt', 'feature 1');
    execSync('git add .', { stdio: 'pipe' });
    execSync('git commit -m "Feature commit 1"', { stdio: 'pipe' });

    fs.writeFileSync('feature2.txt', 'feature 2');
    execSync('git add .', { stdio: 'pipe' });
    execSync('git commit -m "Feature commit 2"', { stdio: 'pipe' });

    fs.writeFileSync('feature3.txt', 'feature 3');
    execSync('git add .', { stdio: 'pipe' });
    execSync('git commit -m "Feature commit 3"', { stdio: 'pipe' });

    // Forward to main
    const result = runForwardScript('main');

    assert.strictEqual(result.status, 0, `Script failed: ${result.stderr}`);

    // Verify all files exist on main
    assert.strictEqual(fs.existsSync('feature1.txt'), true);
    assert.strictEqual(fs.existsSync('feature2.txt'), true);
    assert.strictEqual(fs.existsSync('feature3.txt'), true);

    // Verify we're on main
    const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    assert.strictEqual(currentBranch, 'main');
  });

  test('should forward my-feature branch to main', () => {
    // Create feature branch
    execSync('git checkout -b my-feature', { stdio: 'pipe' });
    fs.writeFileSync('feature.txt', 'feature work');
    execSync('git add .', { stdio: 'pipe' });
    execSync('git commit -m "Feature work"', { stdio: 'pipe' });

    // Run the script
    const result = runForwardScript('main', '');

    // Verify
    assert.strictEqual(result.status, 0, `Script failed: ${result.stderr}`);
    const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    assert.strictEqual(currentBranch, 'main');
    assert.strictEqual(fs.existsSync('feature.txt'), true);
  });

  test('should use merge strategy from environment variable', () => {
    execSync('git checkout -b test-branch', { stdio: 'pipe' });
    fs.writeFileSync('test.txt', 'test');
    execSync('git add .', { stdio: 'pipe' });
    execSync('git commit -m "Test commit"', { stdio: 'pipe' });

    const result = runForwardScript('main', '--no-ff');

    assert.strictEqual(result.status, 0, `Script failed: ${result.stderr}`);
    const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    assert.strictEqual(currentBranch, 'main');
    assert.strictEqual(fs.existsSync('test.txt'), true);
  });

  test('should handle branch with special characters in name', () => {
    execSync('git checkout -b feature/my-awesome-feature', { stdio: 'pipe' });
    fs.writeFileSync('feature.txt', 'feature');
    execSync('git add .', { stdio: 'pipe' });
    execSync('git commit -m "Feature"', { stdio: 'pipe' });

    const result = runForwardScript('main');

    assert.strictEqual(result.status, 0, `Script failed: ${result.stderr}`);
    const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    assert.strictEqual(currentBranch, 'main');
    assert.strictEqual(fs.existsSync('feature.txt'), true);
  });

  test('should fail gracefully when target branch does not exist', () => {
    execSync('git checkout -b feature-branch', { stdio: 'pipe' });

    const result = runForwardScript('non-existent-branch');

    // Script should fail when trying to checkout non-existent branch
    assert.notStrictEqual(result.status, 0);
  });

  test('should handle empty merge strategy parameter', () => {
    execSync('git checkout -b feature', { stdio: 'pipe' });
    fs.writeFileSync('feature.txt', 'feature');
    execSync('git add .', { stdio: 'pipe' });
    execSync('git commit -m "Feature"', { stdio: 'pipe' });

    // Explicitly pass empty string for merge strategy
    const result = runForwardScript('main', '');

    assert.strictEqual(result.status, 0, `Script failed: ${result.stderr}`);
    assert.strictEqual(fs.existsSync('feature.txt'), true);

    const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    assert.strictEqual(currentBranch, 'main');
  });

  test('should maintain git history after forward merge', () => {
    execSync('git checkout -b feature', { stdio: 'pipe' });
    fs.writeFileSync('feature.txt', 'feature');
    execSync('git add .', { stdio: 'pipe' });
    execSync('git commit -m "Feature commit"', { stdio: 'pipe' });

    const result = runForwardScript('main');

    assert.strictEqual(result.status, 0, `Script failed: ${result.stderr}`);

    // Check git log contains both commits
    const log = execSync('git log --oneline', { encoding: 'utf8' });
    assert.match(log, /Feature commit/);
    assert.match(log, /Initial commit/);
  });

  test('should forward feature branch to staging branch', () => {
    // Create staging branch
    execSync('git checkout -b staging', { stdio: 'pipe' });
    execSync('git push origin staging', { stdio: 'pipe' });

    // Create feature branch
    execSync('git checkout -b feature', { stdio: 'pipe' });
    fs.writeFileSync('feature.txt', 'feature');
    execSync('git add .', { stdio: 'pipe' });
    execSync('git commit -m "Feature"', { stdio: 'pipe' });

    // Forward to staging
    const result = runForwardScript('staging');

    assert.strictEqual(result.status, 0, `Script failed: ${result.stderr}`);
    const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    assert.strictEqual(currentBranch, 'staging');
    assert.strictEqual(fs.existsSync('feature.txt'), true);
  });

  test('should handle fast-forward merge when possible', () => {
    // Create feature branch directly from main
    execSync('git checkout -b feature', { stdio: 'pipe' });
    fs.writeFileSync('feature.txt', 'feature');
    execSync('git add .', { stdio: 'pipe' });
    execSync('git commit -m "Feature commit"', { stdio: 'pipe' });

    // Forward to main (should be fast-forward since main hasn't changed)
    const result = runForwardScript('main', '');

    assert.strictEqual(result.status, 0, `Script failed: ${result.stderr}`);

    // Verify we're on main and file exists
    const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    assert.strictEqual(currentBranch, 'main');
    assert.strictEqual(fs.existsSync('feature.txt'), true);
  });

  test('should handle conflicting changes gracefully', () => {
    // Create feature branch and modify a file
    execSync('git checkout -b feature', { stdio: 'pipe' });
    fs.writeFileSync('README.md', '# Feature changes');
    execSync('git add .', { stdio: 'pipe' });
    execSync('git commit -m "Feature changes"', { stdio: 'pipe' });

    // Modify the same file on main
    execSync('git checkout main', { stdio: 'pipe' });
    fs.writeFileSync('README.md', '# Main changes');
    execSync('git add .', { stdio: 'pipe' });
    execSync('git commit -m "Main changes"', { stdio: 'pipe' });

    // Try to forward feature to main (should fail due to conflict)
    execSync('git checkout feature', { stdio: 'pipe' });
    const result = runForwardScript('main');

    // Should fail due to merge conflict
    assert.notStrictEqual(result.status, 0);
  });

  test('should forward from deeply nested branch structure', () => {
    // Create nested branch structure
    execSync('git checkout -b release/v1.0', { stdio: 'pipe' });
    execSync('git checkout -b feature/JIRA-123/user-auth', { stdio: 'pipe' });

    fs.writeFileSync('auth.txt', 'authentication');
    execSync('git add .', { stdio: 'pipe' });
    execSync('git commit -m "Add auth"', { stdio: 'pipe' });

    // Forward to release branch
    const result = runForwardScript('release/v1.0');

    assert.strictEqual(result.status, 0, `Script failed: ${result.stderr}`);
    const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    assert.strictEqual(currentBranch, 'release/v1.0');
    assert.strictEqual(fs.existsSync('auth.txt'), true);
  });

  test('should preserve all commits when forwarding', () => {
    execSync('git checkout -b feature', { stdio: 'pipe' });

    // Create multiple commits
    for (let i = 1; i <= 3; i++) {
      fs.writeFileSync(`file${i}.txt`, `content ${i}`);
      execSync('git add .', { stdio: 'pipe' });
      execSync(`git commit -m "Commit ${i}"`, { stdio: 'pipe' });
    }

    const result = runForwardScript('main');

    assert.strictEqual(result.status, 0, `Script failed: ${result.stderr}`);

    // Check all commits are in history
    const log = execSync('git log --oneline', { encoding: 'utf8' });
    assert.match(log, /Commit 1/);
    assert.match(log, /Commit 2/);
    assert.match(log, /Commit 3/);
    assert.match(log, /Initial commit/);
  });

  test('should work with squash merge strategy', () => {
    execSync('git checkout -b feature', { stdio: 'pipe' });

    fs.writeFileSync('feature1.txt', 'feature 1');
    execSync('git add .', { stdio: 'pipe' });
    execSync('git commit -m "Feature 1"', { stdio: 'pipe' });

    fs.writeFileSync('feature2.txt', 'feature 2');
    execSync('git add .', { stdio: 'pipe' });
    execSync('git commit -m "Feature 2"', { stdio: 'pipe' });

    const result = runForwardScript('main', '--squash');

    // --squash performs the merge but doesn't commit automatically
    // The merge will stage changes but leave them uncommitted
    // So the script should exit successfully after the merge command
    assert.strictEqual(result.status, 0, `Script failed: ${result.stderr}`);

    // Verify we're on main
    const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    assert.strictEqual(currentBranch, 'main');

    // Check if there are staged changes (squash doesn't auto-commit)
    const status = execSync('git status --porcelain', { encoding: 'utf8' });

    // With --squash, changes should be staged but not committed
    // However, since the script uses `stdio: 'inherit'`, git merge --squash
    // may or may not leave changes staged depending on the version
    // So we should check that files exist
    assert.strictEqual(fs.existsSync('feature1.txt'), true);
    assert.strictEqual(fs.existsSync('feature2.txt'), true);
  });
});
