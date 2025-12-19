const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('sync-current-branch integration tests', () => {
  let testRepoPath;
  let remoteRepoPath;
  let originalCwd;
  let scriptPath;

  beforeEach(() => {
    // Save original working directory
    originalCwd = process.cwd();

    // Path to the script we're testing
    scriptPath = path.join(originalCwd, 'src', 'git', 'sync-current-branch', 'sync-current-branch.js');

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
   * Helper function to run the sync script with environment variables
   */
  function runSyncScript(targetBranch, mergeStrategy = '') {
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

  test('should successfully merge target branch into current branch', () => {
    // Create a feature branch
    execSync('git checkout -b feature-branch', { stdio: 'pipe' });
    fs.writeFileSync('feature.txt', 'feature work');
    execSync('git add .', { stdio: 'pipe' });
    execSync('git commit -m "Add feature"', { stdio: 'pipe' });

    // Add new commit to main and push to remote
    execSync('git checkout main', { stdio: 'pipe' });
    fs.writeFileSync('main.txt', 'main work');
    execSync('git add .', { stdio: 'pipe' });
    execSync('git commit -m "Add main work"', { stdio: 'pipe' });
    execSync('git push origin main', { stdio: 'pipe' });

    // Switch back to feature branch
    execSync('git checkout feature-branch', { stdio: 'pipe' });

    // Run the sync script
    const result = runSyncScript('main');

    // Verify the script executed successfully
    assert.strictEqual(result.status, 0, `Script failed: ${result.stderr}`);

    // Verify we're still on feature branch
    const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    assert.strictEqual(currentBranch, 'feature-branch');

    // Verify main.txt exists (merged from main)
    assert.strictEqual(fs.existsSync('main.txt'), true);
    assert.strictEqual(fs.existsSync('feature.txt'), true);
  });

  test('should fail when current branch is protected (main)', () => {
    execSync('git checkout main', { stdio: 'pipe' });

    // Try to sync main with develop (should fail)
    const result = runSyncScript('develop');

    // Verify the script failed
    assert.notStrictEqual(result.status, 0);
    assert.match(result.stderr, /main should be updated via PR/);
  });

  test('should fail when current branch is protected (master)', () => {
    execSync('git branch -M master', { stdio: 'pipe' });
    execSync('git push origin master', { stdio: 'pipe' });

    const result = runSyncScript('develop');

    assert.notStrictEqual(result.status, 0);
    assert.match(result.stderr, /master should be updated via PR/);
  });

  test('should fail when current branch is protected (develop)', () => {
    execSync('git checkout -b develop', { stdio: 'pipe' });
    execSync('git push origin develop', { stdio: 'pipe' });

    const result = runSyncScript('main');

    assert.notStrictEqual(result.status, 0);
    assert.match(result.stderr, /develop should be updated via PR/);
  });

  test('should fail when current branch and target branch are the same', () => {
    execSync('git checkout -b feature-branch', { stdio: 'pipe' });

    const result = runSyncScript('feature-branch');

    assert.notStrictEqual(result.status, 0);
    assert.match(result.stderr, /current branch and target branch should be different/);
  });

  test('should use merge strategy when provided', () => {
    // Create feature branch with commits
    execSync('git checkout -b feature-branch', { stdio: 'pipe' });
    fs.writeFileSync('feature.txt', 'feature');
    execSync('git add .', { stdio: 'pipe' });
    execSync('git commit -m "Feature commit 1"', { stdio: 'pipe' });

    // Add commits to main and push
    execSync('git checkout main', { stdio: 'pipe' });
    fs.writeFileSync('main.txt', 'main');
    execSync('git add .', { stdio: 'pipe' });
    execSync('git commit -m "Main commit 1"', { stdio: 'pipe' });
    execSync('git push origin main', { stdio: 'pipe' });

    execSync('git checkout feature-branch', { stdio: 'pipe' });

    // Merge with --no-ff strategy
    const result = runSyncScript('main', '--no-ff');

    assert.strictEqual(result.status, 0, `Script failed: ${result.stderr}`);

    // Verify merge happened
    const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    assert.strictEqual(currentBranch, 'feature-branch');
    assert.strictEqual(fs.existsSync('main.txt'), true);

    // Verify merge commit exists (--no-ff creates a merge commit even for fast-forward)
    const log = execSync('git log --oneline -1', { encoding: 'utf8' });
    assert.match(log, /Merge/);
  });

  test('should handle merge with multiple commits on both branches', () => {
    // Create feature branch with multiple commits
    execSync('git checkout -b feature-branch', { stdio: 'pipe' });
    fs.writeFileSync('feature1.txt', 'feature 1');
    execSync('git add .', { stdio: 'pipe' });
    execSync('git commit -m "Feature commit 1"', { stdio: 'pipe' });

    fs.writeFileSync('feature2.txt', 'feature 2');
    execSync('git add .', { stdio: 'pipe' });
    execSync('git commit -m "Feature commit 2"', { stdio: 'pipe' });

    // Add multiple commits to main and push
    execSync('git checkout main', { stdio: 'pipe' });
    fs.writeFileSync('main1.txt', 'main 1');
    execSync('git add .', { stdio: 'pipe' });
    execSync('git commit -m "Main commit 1"', { stdio: 'pipe' });

    fs.writeFileSync('main2.txt', 'main 2');
    execSync('git add .', { stdio: 'pipe' });
    execSync('git commit -m "Main commit 2"', { stdio: 'pipe' });
    execSync('git push origin main', { stdio: 'pipe' });

    execSync('git checkout feature-branch', { stdio: 'pipe' });

    // Run sync
    const result = runSyncScript('main');

    assert.strictEqual(result.status, 0, `Script failed: ${result.stderr}`);

    // Verify all files exist
    assert.strictEqual(fs.existsSync('feature1.txt'), true);
    assert.strictEqual(fs.existsSync('feature2.txt'), true);
    assert.strictEqual(fs.existsSync('main1.txt'), true);
    assert.strictEqual(fs.existsSync('main2.txt'), true);
  });

  test('should sync my-feature branch with main', () => {
    // Setup
    execSync('git checkout -b my-feature', { stdio: 'pipe' });
    fs.writeFileSync('feature.txt', 'feature work');
    execSync('git add .', { stdio: 'pipe' });
    execSync('git commit -m "Feature work"', { stdio: 'pipe' });

    execSync('git checkout main', { stdio: 'pipe' });
    fs.writeFileSync('main.txt', 'main work');
    execSync('git add .', { stdio: 'pipe' });
    execSync('git commit -m "Main work"', { stdio: 'pipe' });
    execSync('git push origin main', { stdio: 'pipe' });

    execSync('git checkout my-feature', { stdio: 'pipe' });

    // Run the script
    const result = runSyncScript('main', '');

    // Verify
    assert.strictEqual(result.status, 0, `Script failed: ${result.stderr}`);
    const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    assert.strictEqual(currentBranch, 'my-feature');
    assert.strictEqual(fs.existsSync('main.txt'), true);
    assert.strictEqual(fs.existsSync('feature.txt'), true);
  });

  test('should use merge strategy from environment variable', () => {
    execSync('git checkout -b test-branch', { stdio: 'pipe' });
    fs.writeFileSync('test.txt', 'test');
    execSync('git add .', { stdio: 'pipe' });
    execSync('git commit -m "Test commit"', { stdio: 'pipe' });

    execSync('git checkout main', { stdio: 'pipe' });
    fs.writeFileSync('update.txt', 'update');
    execSync('git add .', { stdio: 'pipe' });
    execSync('git commit -m "Update"', { stdio: 'pipe' });
    execSync('git push origin main', { stdio: 'pipe' });

    execSync('git checkout test-branch', { stdio: 'pipe' });

    const result = runSyncScript('main', '--no-ff');

    assert.strictEqual(result.status, 0, `Script failed: ${result.stderr}`);
    const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    assert.strictEqual(currentBranch, 'test-branch');
    assert.strictEqual(fs.existsSync('update.txt'), true);
  });

  test('should handle branch with special characters in name', () => {
    execSync('git checkout -b feature/my-awesome-feature', { stdio: 'pipe' });
    fs.writeFileSync('feature.txt', 'feature');
    execSync('git add .', { stdio: 'pipe' });
    execSync('git commit -m "Feature"', { stdio: 'pipe' });

    execSync('git checkout main', { stdio: 'pipe' });
    fs.writeFileSync('main.txt', 'main');
    execSync('git add .', { stdio: 'pipe' });
    execSync('git commit -m "Main"', { stdio: 'pipe' });
    execSync('git push origin main', { stdio: 'pipe' });

    execSync('git checkout feature/my-awesome-feature', { stdio: 'pipe' });

    const result = runSyncScript('main');

    assert.strictEqual(result.status, 0, `Script failed: ${result.stderr}`);
    const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    assert.strictEqual(currentBranch, 'feature/my-awesome-feature');
    assert.strictEqual(fs.existsSync('main.txt'), true);
  });

  test('should work when target branch is ahead by multiple commits', () => {
    execSync('git checkout -b feature', { stdio: 'pipe' });

    execSync('git checkout main', { stdio: 'pipe' });
    for (let i = 1; i <= 5; i++) {
      fs.writeFileSync(`file${i}.txt`, `content ${i}`);
      execSync('git add .', { stdio: 'pipe' });
      execSync(`git commit -m "Commit ${i}"`, { stdio: 'pipe' });
    }
    execSync('git push origin main', { stdio: 'pipe' });

    execSync('git checkout feature', { stdio: 'pipe' });

    const result = runSyncScript('main');

    assert.strictEqual(result.status, 0, `Script failed: ${result.stderr}`);

    // Verify all files are present
    for (let i = 1; i <= 5; i++) {
      assert.strictEqual(fs.existsSync(`file${i}.txt`), true);
    }
  });

  test('should fail gracefully when target branch does not exist', () => {
    execSync('git checkout -b feature-branch', { stdio: 'pipe' });

    const result = runSyncScript('non-existent-branch');

    // Script should fail when trying to checkout non-existent branch
    assert.notStrictEqual(result.status, 0);
  });

  test('should handle empty merge strategy parameter', () => {
    execSync('git checkout -b feature', { stdio: 'pipe' });
    fs.writeFileSync('feature.txt', 'feature');
    execSync('git add .', { stdio: 'pipe' });
    execSync('git commit -m "Feature"', { stdio: 'pipe' });

    execSync('git checkout main', { stdio: 'pipe' });
    fs.writeFileSync('main.txt', 'main');
    execSync('git add .', { stdio: 'pipe' });
    execSync('git commit -m "Main"', { stdio: 'pipe' });
    execSync('git push origin main', { stdio: 'pipe' });

    execSync('git checkout feature', { stdio: 'pipe' });

    // Explicitly pass empty string for merge strategy
    const result = runSyncScript('main', '');

    assert.strictEqual(result.status, 0, `Script failed: ${result.stderr}`);
    assert.strictEqual(fs.existsSync('main.txt'), true);
  });

  test('should maintain git history after merge', () => {
    execSync('git checkout -b feature', { stdio: 'pipe' });
    fs.writeFileSync('feature.txt', 'feature');
    execSync('git add .', { stdio: 'pipe' });
    execSync('git commit -m "Feature commit"', { stdio: 'pipe' });

    execSync('git checkout main', { stdio: 'pipe' });
    fs.writeFileSync('main.txt', 'main');
    execSync('git add .', { stdio: 'pipe' });
    execSync('git commit -m "Main commit"', { stdio: 'pipe' });
    execSync('git push origin main', { stdio: 'pipe' });

    execSync('git checkout feature', { stdio: 'pipe' });

    const result = runSyncScript('main');

    assert.strictEqual(result.status, 0, `Script failed: ${result.stderr}`);

    // Check git log contains both commits
    const log = execSync('git log --oneline', { encoding: 'utf8' });
    assert.match(log, /Feature commit/);
    assert.match(log, /Main commit/);
    assert.match(log, /Initial commit/);
  });

  test('should pull latest changes from remote when syncing', () => {
    // Create a feature branch
    execSync('git checkout -b feature', { stdio: 'pipe' });
    fs.writeFileSync('feature.txt', 'feature');
    execSync('git add .', { stdio: 'pipe' });
    execSync('git commit -m "Feature"', { stdio: 'pipe' });

    // Simulate someone else pushing to main by creating another clone
    const anotherClonePath = fs.mkdtempSync(path.join(os.tmpdir(), 'git-clone-'));
    execSync(`git clone ${remoteRepoPath} ${anotherClonePath}`, { stdio: 'pipe' });

    // Make changes in the other clone
    fs.writeFileSync(path.join(anotherClonePath, 'remote-change.txt'), 'remote change');
    execSync('git add .', { cwd: anotherClonePath, stdio: 'pipe' });
    execSync('git commit -m "Remote change"', { cwd: anotherClonePath, stdio: 'pipe' });
    execSync('git push origin main', { cwd: anotherClonePath, stdio: 'pipe' });

    // Clean up the clone
    fs.rmSync(anotherClonePath, { recursive: true, force: true });

    // Now sync feature branch - it should pull the remote changes
    const result = runSyncScript('main');

    assert.strictEqual(result.status, 0, `Script failed: ${result.stderr}`);

    // Verify the remote change was pulled and merged
    assert.strictEqual(fs.existsSync('remote-change.txt'), true);
    assert.strictEqual(fs.existsSync('feature.txt'), true);
  });
});
