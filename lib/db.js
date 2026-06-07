// JSON file store — zero-dependency, portable, "硬盘即公司" philosophy
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', '.changelog');
const DB_PATH = path.join(DATA_DIR, 'store.json');

function read() {
  if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify({ users: [], repos: [], changelogs: [], nextId: 1 }));
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch {
    return { users: [], repos: [], changelogs: [], nextId: 1 };
  }
}

function write(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function nextId(data) {
  return data.nextId++;
}

// Users
function upsertUser(githubId, login, token) {
  const data = read();
  let user = data.users.find(u => u.github_id === githubId);
  if (user) {
    user.github_token = token;
  } else {
    user = { id: nextId(data), github_id: githubId, github_login: login, github_token: token, plan: 'free', created_at: new Date().toISOString() };
    data.users.push(user);
  }
  write(data);
  return user;
}

function getUserByToken(token) {
  const data = read();
  return data.users.find(u => u.github_token === token);
}

// Repos
function listRepos(userId) {
  const data = read();
  return data.repos.filter(r => r.user_id === userId);
}

function upsertRepo(userId, owner, name) {
  const data = read();
  let repo = data.repos.find(r => r.user_id === userId && r.github_owner === owner && r.github_name === name);
  if (!repo) {
    repo = { id: nextId(data), user_id: userId, github_owner: owner, github_name: name, settings: '{}', connected_at: new Date().toISOString() };
    data.repos.push(repo);
    write(data);
  }
  return repo;
}

// Changelogs
function saveChangelog(repoId, { fromTag, toTag, version, markdown, status = 'draft' }) {
  const data = read();
  const entry = {
    id: nextId(data),
    repository_id: repoId,
    from_tag: fromTag,
    to_tag: toTag,
    version: version || toTag,
    status,
    entries: '[]',
    markdown_output: markdown,
    github_release_url: null,
    created_at: new Date().toISOString()
  };
  data.changelogs.push(entry);
  write(data);
  return entry;
}

function listChangelogs(repoId) {
  const data = read();
  return data.changelogs.filter(c => c.repository_id === repoId).reverse();
}

module.exports = { upsertUser, getUserByToken, listRepos, upsertRepo, saveChangelog, listChangelogs };
