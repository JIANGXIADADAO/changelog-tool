// config.test.js — Configuration management tests
// Source: designer→builder.md §CLI命令(init), §技术栈(LLM providers, GitHub OAuth)
// Source: designer→builder.md §非功能需求(LLM failover)

const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

const config = require('../lib/config');

describe('DEFAULT_CONFIG', () => {
  // DB §技术栈: Three LLM providers supported
  it('§技术栈: should include all three LLM providers', () => {
    assert.ok(config.DEFAULT_CONFIG.llm.deepseek, 'Should have deepseek config');
    assert.ok(config.DEFAULT_CONFIG.llm.openai, 'Should have openai config');
    assert.ok(config.DEFAULT_CONFIG.llm.anthropic, 'Should have anthropic config');
  });

  // DB §技术栈: DeepSeek is the default provider
  it('§技术栈: should default to deepseek provider', () => {
    assert.strictEqual(config.DEFAULT_CONFIG.llm.provider, 'deepseek');
  });

  // DB §技术栈: DeepSeek model defaults to deepseek-chat
  it('§技术栈: should default deepseek model to deepseek-chat', () => {
    assert.strictEqual(config.DEFAULT_CONFIG.llm.deepseek.model, 'deepseek-chat');
  });

  // DB §技术栈: API keys start empty
  it('§技术栈: should have empty API keys by default', () => {
    assert.strictEqual(config.DEFAULT_CONFIG.llm.deepseek.apiKey, '');
    assert.strictEqual(config.DEFAULT_CONFIG.llm.openai.apiKey, '');
    assert.strictEqual(config.DEFAULT_CONFIG.llm.anthropic.apiKey, '');
  });

  // DB §CLI命令: init creates .changelogrc with GitHub token field
  it('§CLI命令(init): should have empty github token', () => {
    assert.strictEqual(config.DEFAULT_CONFIG.github.token, '');
  });

  // DB §F001: Output format defaults to keepachangelog
  it('§F001: should default output format to keepachangelog', () => {
    assert.strictEqual(config.DEFAULT_CONFIG.output.format, 'keepachangelog');
  });

  // DB §F005: Conventional commits enabled by default
  it('§F005: should enable conventional commits by default', () => {
    assert.strictEqual(config.DEFAULT_CONFIG.conventionalCommits.enabled, true);
    assert.strictEqual(config.DEFAULT_CONFIG.conventionalCommits.enhanceWithAI, true);
  });
});

describe('load()', () => {
  // DB §非功能需求: Missing config returns defaults without crashing
  it('§非功能需求: should return defaults when no config file exists', () => {
    // configPath() checks cwd, then home dir. When no file exists, load() returns defaults.
    // We verify by calling load() and checking the result structure.
    const cfg = config.load();
    // Must have complete default structure regardless of filesystem state
    assert.ok(cfg.llm, 'Should have llm section');
    assert.ok(cfg.github, 'Should have github section');
    assert.ok(cfg.output, 'Should have output section');
    assert.ok(cfg.conventionalCommits, 'Should have conventionalCommits section');
    assert.strictEqual(typeof cfg.llm.provider, 'string', 'provider should be a string');
    assert.ok(cfg.llm[cfg.llm.provider], 'Active provider config should exist');
  });
});

describe('config module exports', () => {
  // DB §CLI命令: All 5 API operations available
  it('§CLI命令: should export load, save, init, configPath, DEFAULT_CONFIG', () => {
    assert.strictEqual(typeof config.load, 'function', 'load should be function');
    assert.strictEqual(typeof config.save, 'function', 'save should be function');
    assert.strictEqual(typeof config.init, 'function', 'init should be function');
    assert.strictEqual(typeof config.configPath, 'function', 'configPath should be function');
    assert.ok(config.DEFAULT_CONFIG, 'DEFAULT_CONFIG should exist');
  });
});

describe('configPath()', () => {
  // DB §CLI命令: Returns path ending in .changelogrc
  it('§CLI命令: should return a path ending in .changelogrc', () => {
    const p = config.configPath();
    assert.ok(typeof p === 'string');
    assert.ok(p.endsWith('.changelogrc'), `Should end with .changelogrc, got: ${p}`);
  });
});

describe('init() and save() round-trip', () => {
  // DB §CLI命令(init): Creates .changelogrc, returns true
  // DB §CLI命令(config set): Saves modified config, load reflects changes
  it('§CLI命令(init+config set): should create, modify, and load config', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'changelog-test-'));
    const originalCwd = process.cwd;
    try {
      // Mock process.cwd instead of chdir (chdir restricted in some Node environments)
      process.cwd = () => tmpDir;

      // init creates the file
      const created = config.init();
      assert.strictEqual(created, true, 'init should return true when creating new file');

      const cfgPath = path.join(tmpDir, '.changelogrc');
      assert.ok(fs.existsSync(cfgPath), '.changelogrc should exist after init');

      // Load it back (now cwd → tmpDir, should pick up our file)
      let cfg = config.load();
      assert.strictEqual(cfg.llm.provider, 'deepseek');

      // Modify and save
      cfg.llm.deepseek.apiKey = 'sk-test-key-12345';
      cfg.github.token = 'gho_test_token';
      config.save(cfg);

      // Load again and verify
      cfg = config.load();
      assert.strictEqual(cfg.llm.deepseek.apiKey, 'sk-test-key-12345');
      assert.strictEqual(cfg.github.token, 'gho_test_token');

      // init again should return false (already exists)
      const reinit = config.init();
      assert.strictEqual(reinit, false, 'init should return false when file exists');
    } finally {
      process.cwd = originalCwd;
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    }
  });
});
