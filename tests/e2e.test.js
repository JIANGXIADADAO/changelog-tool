// e2e.test.js — End-to-end tests against real git repositories
// Source: quality-retrospective.md §差距#5 (E2E + real data missing)
// Scenarios: A (real repo generate), B (non-git error), C (config round-trip), D (status)

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

const CLI_SCRIPT = path.resolve(__dirname, '..', 'bin', 'changelog.js');
// Use the company monorepo (rich git history) for real-repo tests
const REAL_REPO = path.resolve(__dirname, '..', '..', '..', '..');
const TMP_PREFIX = 'changelog-e2e-';

function cli(args, cwd) {
  const cmd = `node ${JSON.stringify(CLI_SCRIPT)} ${args.join(' ')}`;
  try {
    const out = execSync(cmd, { encoding: 'utf-8', cwd, stdio: 'pipe', maxBuffer: 10 * 1024 * 1024 });
    return { stdout: out, stderr: '', status: 0 };
  } catch (e) {
    return { stdout: e.stdout || '', stderr: e.stderr || '', status: e.status || 1 };
  }
}

// CLI mixes info messages with JSON output; extract the JSON block
function parseJSON(stdout) {
  // Find the outermost JSON object (handles nested objects)
  const firstBrace = stdout.indexOf('{');
  if (firstBrace === -1) throw new Error('No JSON found in output: ' + stdout);

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = firstBrace; i < stdout.length; i++) {
    const ch = stdout[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return JSON.parse(stdout.substring(firstBrace, i + 1));
    }
  }
  throw new Error('Unterminated JSON in output');
}

// ================================================================
// Scenario A — Real git repo + generate --no-ai
// ================================================================
describe('E2E A — Real repo generate --no-ai', { timeout: 30_000 }, () => {

  it('A-1: produces valid Keep a Changelog output from real commits', () => {
    const { stdout, stderr, status } = cli([
      'generate', '--no-ai', '--format', 'json', '--from', 'HEAD~1',
    ], REAL_REPO);

    assert.strictEqual(status, 0, `exit 0 expected, got ${status}: ${stderr}`);
    const result = parseJSON(stdout);

    // Valid KAC header
    assert.ok(result.markdown.startsWith('## [Unreleased]'), 'must start with ## [Unreleased]');
    // At least one category
    assert.ok(/###\s+(Added|Changed|Fixed|Removed)/.test(result.markdown), 'must have category heading');
    // At least one entry
    assert.ok(result.markdown.includes('- '), 'must have list entries');
    // Stats correct
    assert.ok(result.stats.commits >= 1, `commits >= 1, got ${result.stats.commits}`);
    assert.strictEqual(result.stats.usedAI, false);
    assert.strictEqual(result.stats.prs, 0);
  });

  it('A-2: each commit produces one output bullet', () => {
    const { stdout } = cli([
      'generate', '--no-ai', '--format', 'json', '--from', 'HEAD~1',
    ], REAL_REPO);

    const result = parseJSON(stdout);
    const bullets = (result.markdown.match(/^- /gm) || []).length;
    assert.strictEqual(bullets, result.stats.commits,
      `bullets (${bullets}) should equal commits (${result.stats.commits})`);
  });

  it('A-3: handles generating from first commit without crash', () => {
    const { stdout, status } = cli([
      'generate', '--no-ai', '--format', 'json', '--from', 'HEAD~2',
    ], REAL_REPO);

    assert.strictEqual(status, 0);
    const result = parseJSON(stdout);
    assert.ok(result.stats.commits >= 2, `should have >= 2 commits, got ${result.stats.commits}`);
  });
});

// ================================================================
// Scenario B — Non-git directory error handling
// ================================================================
describe('E2E B — Non-git directory', () => {
  let tmpDir;

  before(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), TMP_PREFIX + 'non-git-')); });
  after(() => { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {} });

  it('B-1: gives friendly error, not raw git fatal', () => {
    const { stdout, stderr, status } = cli(['generate', '--no-ai'], tmpDir);

    assert.notStrictEqual(status, 0, 'must exit non-zero');
    const output = stdout + stderr;
    // Must NOT contain raw git error
    assert.ok(!output.includes('fatal:'), 'must not contain raw "fatal:"');
    // Must contain user-friendly guidance
    assert.ok(
      output.includes('not a Git repository') || output.includes('git init'),
      'must contain friendly guidance message'
    );
  });
});

// ================================================================
// Scenario C — Config set/show round-trip with masking
// ================================================================
describe('E2E C — Config set/show round-trip', () => {
  let tmpDir;

  before(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), TMP_PREFIX + 'config-')); });
  after(() => { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {} });

  it('C-1: init creates .changelogrc', () => {
    const { status } = cli(['init'], tmpDir);
    assert.strictEqual(status, 0);
    assert.ok(fs.existsSync(path.join(tmpDir, '.changelogrc')));
  });

  it('C-2: set + show round-trip for non-sensitive values', () => {
    cli(['config', 'set', 'output.format', 'conventional'], tmpDir);
    const { stdout } = cli(['config', 'show'], tmpDir);
    const cfg = JSON.parse(stdout);
    assert.strictEqual(cfg.output.format, 'conventional');
  });

  it('C-3: sensitive values masked in config show', () => {
    cli(['config', 'set', 'llm.deepseek.apiKey', 'sk-test-masked-12345'], tmpDir);
    const { stdout } = cli(['config', 'show'], tmpDir);
    const cfg = JSON.parse(stdout);
    assert.strictEqual(cfg.llm.deepseek.apiKey, '***', 'API key must be masked');
    assert.ok(!stdout.includes('sk-test-masked-12345'), 'plaintext key must not leak');
    assert.strictEqual(cfg.llm.provider, 'deepseek', 'non-sensitive fields remain visible');
  });

  it('C-4: config set outputs JSON section (not old format)', () => {
    const { stdout } = cli(['config', 'set', 'github.token', 'ghp_test1234'], tmpDir);
    // New format: JSON output of top-level section
    assert.ok(stdout.includes('"github"'), 'should output JSON with top-level key');
    const parsed = JSON.parse(stdout);
    assert.ok(parsed.github, 'should have github section');
  });
});

// ================================================================
// Scenario D — Status command
// ================================================================
describe('E2E D — Status command', () => {

  it('D-1: shows all expected fields in real repo', () => {
    const { stdout, status } = cli(['status'], REAL_REPO);
    assert.strictEqual(status, 0);
    assert.ok(stdout.includes('Config:'), 'must show Config path');
    assert.ok(stdout.includes('LLM'), 'must show LLM section');
    assert.ok(stdout.includes('GitHub'), 'must show GitHub section');
    assert.ok(stdout.includes('Tags'), 'must show Tags section');
  });

  it('D-2: handles no-config directory without crash', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), TMP_PREFIX + 'status-'));
    try {
      const { stdout, status } = cli(['status'], tmpDir);
      assert.strictEqual(status, 0);
      assert.ok(stdout.includes('Config:'), 'should show config path with defaults');
    } finally {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    }
  });
});
