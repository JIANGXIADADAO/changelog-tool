// Web server: Express + GitHub OAuth + API routes
const express = require('express');
const session = require('express-session');
const path = require('path');
const crypto = require('crypto');
const github = require('../lib/github');
const generator = require('../lib/generator');
const db = require('../lib/db');
const config = require('../lib/config');

const app = express();

// Generate a random session secret on first run
const SESSION_SECRET = crypto.randomBytes(32).toString('hex');

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// GitHub OAuth login redirect
app.get('/auth/github', (req, res) => {
  const cfg = config.load();
  const clientId = cfg.github.clientId;
  if (!clientId) {
    return res.status(500).send('GitHub OAuth not configured. Set github.clientId in .changelogrc');
  }
  const redirectUri = `http://localhost:${req.app.get('port')}/auth/github/callback`;
  const scope = 'repo,user';
  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauthState = state;
  res.redirect(`https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`);
});

// GitHub OAuth callback
app.get('/auth/github/callback', async (req, res) => {
  const { code, state } = req.query;
  if (state !== req.session.oauthState) {
    return res.status(400).send('Invalid state');
  }

  const cfg = config.load();
  try {
    // Exchange code for access token
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        client_id: cfg.github.clientId,
        client_secret: cfg.github.clientSecret,
        code
      })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error_description);

    req.session.githubToken = data.access_token;
    req.session.save(() => res.redirect('/'));
  } catch (e) {
    res.status(500).send(`OAuth failed: ${e.message}`);
  }
});

// Auth middleware
function requireAuth(req, res, next) {
  if (req.session.githubToken) return next();
  res.status(401).json({ error: 'Not authenticated' });
}

// API: Get current user
app.get('/api/user', requireAuth, async (req, res) => {
  try {
    const octokit = github.createClient(req.session.githubToken);
    const user = await github.getAuthenticatedUser(octokit);
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// API: List user's repos
app.get('/api/repos', requireAuth, async (req, res) => {
  try {
    const octokit = github.createClient(req.session.githubToken);
    const repos = await github.listRepos(octokit);
    res.json(repos);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// API: Get repo tags
app.get('/api/repos/:owner/:repo/tags', requireAuth, async (req, res) => {
  try {
    // Tags are read from local git in CLI mode.
    // For web-only mode, we could use GitHub API, but that requires
    // the user to have cloned the repo. For now, return an empty list
    // and let the user enter tags manually in the web UI.
    res.json({ tags: [], message: 'Enter tags manually or use CLI with local repo' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// API: Generate changelog (web)
app.post('/api/generate', requireAuth, async (req, res) => {
  try {
    const { owner, repo, fromTag, toTag = 'HEAD' } = req.body;
    if (!owner || !repo || !fromTag) {
      return res.status(400).json({ error: 'owner, repo, and fromTag are required' });
    }

    const cfg = config.load();
    // Use the user's OAuth token for GitHub access
    cfg.github.token = req.session.githubToken;

    const result = await generator.generate({
      fromTag,
      toTag,
      owner,
      repo,
      useAI: true
    });

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// API: Publish changelog (web)
app.post('/api/publish', requireAuth, async (req, res) => {
  try {
    const { owner, repo, tagName, markdown, draft = false } = req.body;
    if (!owner || !repo || !tagName || !markdown) {
      return res.status(400).json({ error: 'owner, repo, tagName, and markdown are required' });
    }

    const cfg = config.load();
    cfg.github.token = req.session.githubToken;

    const url = await generator.publish({ owner, repo, tagName, markdown, draft });
    res.json({ url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// API: Auth status
app.get('/api/auth/status', (req, res) => {
  res.json({
    authenticated: !!req.session.githubToken,
    provider: config.load().llm.provider
  });
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function start(port = 3000) {
  app.set('port', port);
  return new Promise((resolve) => {
    app.listen(port, () => {
      console.log(`\n  CHANGELOG Dashboard → http://localhost:${port}\n`);
      resolve();
    });
  });
}

module.exports = { start, app };
