// db.test.js — JSON file store tests
// Source: designer→builder.md §技术栈 (JSON file storage, zero-dependency)
// Source: designer→builder.md §Web Dashboard路由 (repo列表, 历史)

const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('db module exports', () => {
  const db = require('../lib/db');

  // DB §技术栈: Zero-dependency JSON file store with 6 operations
  it('§技术栈: should export all CRUD operations', () => {
    assert.strictEqual(typeof db.upsertUser, 'function', 'upsertUser');
    assert.strictEqual(typeof db.getUserByToken, 'function', 'getUserByToken');
    assert.strictEqual(typeof db.listRepos, 'function', 'listRepos');
    assert.strictEqual(typeof db.upsertRepo, 'function', 'upsertRepo');
    assert.strictEqual(typeof db.saveChangelog, 'function', 'saveChangelog');
    assert.strictEqual(typeof db.listChangelogs, 'function', 'listChangelogs');
  });
});

describe('upsertUser() + getUserByToken()', () => {
  const db = require('../lib/db');

  // DB §Web Dashboard: User authenticated via GitHub OAuth token
  it('§Web Dashboard(/auth): should create and retrieve a user', () => {
    const token = 'gho_test_token_' + Date.now();
    const user = db.upsertUser(12345, 'testuser', token);
    assert.strictEqual(user.github_id, 12345);
    assert.strictEqual(user.github_login, 'testuser');
    assert.strictEqual(user.github_token, token);
    assert.ok(user.id > 0, 'Should have numeric id');

    const found = db.getUserByToken(token);
    assert.ok(found, 'Should find user by token');
    assert.strictEqual(found.github_login, 'testuser');
  });

  // DB §Web Dashboard: Re-auth with same github_id updates token
  it('§Web Dashboard(/auth): should update existing user on re-auth', () => {
    const githubId = 99999;
    const token1 = 'gho_token_v1_' + Date.now();
    const token2 = 'gho_token_v2_' + Date.now();

    const u1 = db.upsertUser(githubId, 'returning_user', token1);
    const u2 = db.upsertUser(githubId, 'returning_user', token2);

    // Same user, updated token
    assert.strictEqual(u1.id, u2.id, 'Should return same user id');
    assert.strictEqual(u2.github_token, token2, 'Should have updated token');

    // Old token should no longer find user
    const found1 = db.getUserByToken(token1);
    const found2 = db.getUserByToken(token2);
    assert.strictEqual(found1, undefined, 'Old token should not find user');
    assert.ok(found2, 'New token should find user');
  });
});

describe('upsertRepo() + listRepos()', () => {
  const db = require('../lib/db');

  // DB §Web Dashboard路由: / route shows repo list
  it('§Web Dashboard(/): should create and list repos', () => {
    const user = db.upsertUser(20000, 'repouser', 'gho_repo_' + Date.now());

    db.upsertRepo(user.id, 'owner1', 'repo-a');
    db.upsertRepo(user.id, 'owner1', 'repo-b');
    db.upsertRepo(user.id, 'owner2', 'repo-c');

    const repos = db.listRepos(user.id);
    assert.strictEqual(repos.length, 3, 'Should have 3 repos');
    assert.ok(repos.every(r => r.user_id === user.id), 'All repos belong to user');
  });

  // DB §Web Dashboard路由: Duplicate repo returns existing
  it('§Web Dashboard(/): should not duplicate repos', () => {
    const user = db.upsertUser(30000, 'dedupeuser', 'gho_dedup_' + Date.now());

    const r1 = db.upsertRepo(user.id, 'owner', 'samerepo');
    const r2 = db.upsertRepo(user.id, 'owner', 'samerepo');

    assert.strictEqual(r1.id, r2.id, 'Should return same repo id');
  });
});

describe('saveChangelog() + listChangelogs()', () => {
  const db = require('../lib/db');
  const uid = Date.now(); // Unique run key to avoid cross-run data leak

  // DB §F001 + §F003: Generated changelogs stored and retrievable
  it('§F001 + §F003: should save and list changelogs for a repo', () => {
    const suffix = '_cl_' + uid;
    const user = db.upsertUser(uid + 1, 'changeloguser' + suffix, 'gho' + suffix);
    const repo = db.upsertRepo(user.id, 'owner' + suffix, 'changelog-repo' + suffix);

    db.saveChangelog(repo.id, {
      fromTag: 'v1.0.0',
      toTag: 'v1.1.0',
      version: 'v1.1.0',
      markdown: '## v1.1.0\n\n### Added\n- Feature A',
      status: 'published'
    });

    db.saveChangelog(repo.id, {
      fromTag: 'v1.1.0',
      toTag: 'HEAD',
      version: 'Unreleased',
      markdown: '## Unreleased\n\n### Fixed\n- Bug fix',
      status: 'draft'
    });

    const changelogs = db.listChangelogs(repo.id);
    assert.strictEqual(changelogs.length, 2, 'Should have 2 changelogs');

    // Most recent first
    assert.strictEqual(changelogs[0].version, 'Unreleased');
    assert.strictEqual(changelogs[0].status, 'draft');
    assert.strictEqual(changelogs[1].version, 'v1.1.0');
    assert.strictEqual(changelogs[1].status, 'published');
  });

  // DB §F001: Changelog entry has all required fields
  it('§F001: should include all required fields in changelog entry', () => {
    const suffix = '_field_' + uid;
    const user = db.upsertUser(uid + 2, 'fielduser' + suffix, 'gho' + suffix);
    const repo = db.upsertRepo(user.id, 'owner' + suffix, 'field-repo' + suffix);

    const entry = db.saveChangelog(repo.id, {
      fromTag: 'v2.0.0',
      toTag: 'v2.1.0',
      markdown: 'test'
    });

    assert.ok(entry.id > 0, 'Should have id');
    assert.strictEqual(entry.repository_id, repo.id);
    assert.strictEqual(entry.from_tag, 'v2.0.0');
    assert.strictEqual(entry.to_tag, 'v2.1.0');
    assert.strictEqual(entry.status, 'draft', 'Should default to draft');
    assert.ok(entry.created_at, 'Should have created_at timestamp');
  });

  // DB §边界状态: Empty changelog list for repo with no history
  it('§边界状态: should return empty list for repo with no changelogs', () => {
    const suffix = '_empty_' + uid;
    const user = db.upsertUser(uid + 3, 'emptyuser' + suffix, 'gho' + suffix);
    const repo = db.upsertRepo(user.id, 'owner' + suffix, 'empty-repo' + suffix);

    const changelogs = db.listChangelogs(repo.id);
    assert.strictEqual(changelogs.length, 0);
  });
});
