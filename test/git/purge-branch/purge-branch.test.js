const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('purge-branch integration tests', () => {
  let testRepoPath;
  let remoteRepoPath;
  let originalCwd;
  let scriptPath;

  beforeEach(() => {
    // Save original working directory
    originalCwd = process.cwd();

    // Path to the script we're testing
    scriptPath = path.join(originalCwd, 'src', 'git', 'purge-branch', 'purge-branch.js');

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
   * Helper function to run the purge script with environment variables
   */
  function runPurgeScript(branches) {
    const env = { ...process.env };
    if (branches !== undefined) {
      env.usage_branches = branches;
    } else {
      delete env.usage_branches;
    }

    const result = spawnSync('node', [scriptPath], {
      cwd: testRepoPath,
      env,
      encoding: 'utf8'
    });

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      status: result.status,
      error: result.error
    };
  }

  test('should successfully delete a single branch locally and remotely', () => {
    // Create feature branch
    execSync('git checkout -b feature-1', { stdio: 'pipe' });
    fs.writeFileSync('feature1.txt', 'feature 1');
    execSync('git add .', { stdio: 'pipe' });
    execSync('git commit -m "Add feature 1"', { stdio: 'pipe' });
    execSync('git push -u origin feature-1', { stdio: 'pipe' });

    // Merge to main
    execSync('git checkout main', { stdio: 'pipe' });
    execSync('git merge feature-1', { stdio: 'pipe' });
    execSync('git push origin main', { stdio: 'pipe' });

    // Run the purge script
    const result = runPurgeScript('feature-1');

    // Verify it succeeded
    assert.strictEqual(result.status, 0, `Script failed: ${result.stderr}`);

    // Verify local branch is deleted
    const localBranches = execSync('git branch', { encoding: 'utf8' });
    assert.ok(!localBranches.includes('feature-1'), 'Local branch should be deleted');

    // Verify remote branch is deleted
    const remoteBranches = execSync('git ls-remote --heads origin feature-1', { encoding: 'utf8' }).trim();
    assert.strictEqual(remoteBranches, '', 'Remote branch should be deleted');
  });

  test('should successfully delete multiple branches locally and remotely', () => {
    // Create feature-1
    execSync('git checkout -b feature-1', { stdio: 'pipe' });
    fs.writeFileSync('feature1.txt', 'feature 1');
    execSync('git add .', { stdio: 'pipe' });
    execSync('git commit -m "Add feature 1"', { stdio: 'pipe' });
    execSync('git push -u origin feature-1', { stdio: 'pipe' });

    // Create feature-2
    execSync('git checkout main', { stdio: 'pipe' });
    execSync('git checkout -b feature-2', { stdio: 'pipe' });
    fs.writeFileSync('feature2.txt', 'feature 2');
    execSync('git add .', { stdio: 'pipe' });
    execSync('git commit -m "Add feature 2"', { stdio: 'pipe' });
    execSync('git push -u origin feature-2', { stdio: 'pipe' });

    // Merge both to main
    execSync('git checkout main', { stdio: 'pipe' });
    execSync('git merge feature-1', { stdio: 'pipe' });
    execSync('git merge feature-2', { stdio: 'pipe' });
    execSync('git push origin main', { stdio: 'pipe' });

    // Run purge script for both
    const result = runPurgeScript('feature-1 feature-2');

    assert.strictEqual(result.status, 0, `Script failed: ${result.stderr}`);

    const localBranches = execSync('git branch', { encoding: 'utf8' });
    assert.ok(!localBranches.includes('feature-1'), 'feature-1 should be deleted locally');
    assert.ok(!localBranches.includes('feature-2'), 'feature-2 should be deleted locally');

    const remote1 = execSync('git ls-remote --heads origin feature-1', { encoding: 'utf8' }).trim();
    const remote2 = execSync('git ls-remote --heads origin feature-2', { encoding: 'utf8' }).trim();
    assert.strictEqual(remote1, '', 'feature-1 should be deleted remotely');
    assert.strictEqual(remote2, '', 'feature-2 should be deleted remotely');
  });

  test('should fail when trying to delete a protected branch (main)', () => {
    const result = runPurgeScript('main');

    assert.notStrictEqual(result.status, 0);
    assert.match(result.stderr, /Branches 'main' cannot be deleted/);

    // Verify main still exists locally
    const localBranches = execSync('git branch', { encoding: 'utf8' });
    assert.ok(localBranches.includes('main'));
  });

  test('should fail when trying to delete a protected branch (master)', () => {
    // Create master branch
    execSync('git checkout -b master', { stdio: 'pipe' });
    execSync('git push -u origin master', { stdio: 'pipe' });
    execSync('git checkout main', { stdio: 'pipe' });

    const result = runPurgeScript('master');

    assert.notStrictEqual(result.status, 0);
    assert.match(result.stderr, /Branches 'master' cannot be deleted/);

    const localBranches = execSync('git branch', { encoding: 'utf8' });
    assert.ok(localBranches.includes('master'));
  });

  test('should fail when trying to delete a protected branch (develop)', () => {
    // Create develop branch
    execSync('git checkout -b develop', { stdio: 'pipe' });
    execSync('git push -u origin develop', { stdio: 'pipe' });
    execSync('git checkout main', { stdio: 'pipe' });

    const result = runPurgeScript('develop');

    assert.notStrictEqual(result.status, 0);
    assert.match(result.stderr, /Branches 'develop' cannot be deleted/);

    const localBranches = execSync('git branch', { encoding: 'utf8' });
    assert.ok(localBranches.includes('develop'));
  });

  test('should fail when trying to delete the current branch', () => {
    // Create feature-1 and stay on it
    execSync('git checkout -b feature-1', { stdio: 'pipe' });
    fs.writeFileSync('feature1.txt', 'feature 1');
    execSync('git add .', { stdio: 'pipe' });
    execSync('git commit -m "Add feature 1"', { stdio: 'pipe' });
    execSync('git push -u origin feature-1', { stdio: 'pipe' });

    const result = runPurgeScript('feature-1');

    assert.notStrictEqual(result.status, 0);
    assert.match(result.stderr, /Branches 'feature-1' cannot be deleted/);

    const localBranches = execSync('git branch', { encoding: 'utf8' });
    assert.ok(localBranches.includes('feature-1'));
  });

  test('should fail and not delete any branches if one of them is forbidden', () => {
    // Create feature-1
    execSync('git checkout -b feature-1', { stdio: 'pipe' });
    fs.writeFileSync('feature1.txt', 'feature 1');
    execSync('git add .', { stdio: 'pipe' });
    execSync('git commit -m "Add feature 1"', { stdio: 'pipe' });
    execSync('git push -u origin feature-1', { stdio: 'pipe' });

    execSync('git checkout main', { stdio: 'pipe' });

    // Try to delete both feature-1 and main (which is protected)
    const result = runPurgeScript('feature-1 main');

    assert.notStrictEqual(result.status, 0);
    assert.match(result.stderr, /Branches 'main' cannot be deleted/);

    // Verify feature-1 was NOT deleted
    const localBranches = execSync('git branch', { encoding: 'utf8' });
    assert.ok(localBranches.includes('feature-1'));
  });

  test('should fail when trying to delete an unmerged branch', () => {
    // Create feature-1 and push it
    execSync('git checkout -b feature-1', { stdio: 'pipe' });
    fs.writeFileSync('feature1.txt', 'feature 1');
    execSync('git add .', { stdio: 'pipe' });
    execSync('git commit -m "Add feature 1"', { stdio: 'pipe' });
    execSync('git push -u origin feature-1', { stdio: 'pipe' });

    // Add another commit that is NOT pushed
    fs.writeFileSync('feature1_unpushed.txt', 'unpushed');
    execSync('git add .', { stdio: 'pipe' });
    execSync('git commit -m "Unpushed commit"', { stdio: 'pipe' });

    execSync('git checkout main', { stdio: 'pipe' });

    const result = runPurgeScript('feature-1');

    assert.notStrictEqual(result.status, 0);
    assert.match(result.stderr, /not fully merged/i);
  });

  test('should fail when no branches are specified', () => {
    const result = runPurgeScript('');

    assert.notStrictEqual(result.status, 0);
  });
});
