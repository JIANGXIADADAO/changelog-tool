// Frontend app: Dashboard, repo browsing, generation, publishing

let currentRepo = null;

// ---- Auth ----
async function checkAuth() {
  try {
    const res = await fetch('/api/auth/status');
    const data = await res.json();
    if (data.authenticated) {
      document.getElementById('login-btn').style.display = 'none';
      document.getElementById('logout-btn').style.display = '';
      loadUser();
      loadRepos();
    } else {
      document.getElementById('login-btn').style.display = '';
      document.getElementById('logout-btn').style.display = 'none';
      document.getElementById('empty-repos').style.display = 'block';
    }
  } catch (e) {
    console.error('Auth check failed:', e);
  }
}

function login() {
  window.location.href = '/auth/github';
}

function logout() {
  // Clear session by reloading — server-side session will expire
  window.location.reload();
}

async function loadUser() {
  try {
    const res = await fetch('/api/user');
    const user = await res.json();
    document.getElementById('user-info').textContent = user.login;
  } catch (e) {
    // not critical
  }
}

// ---- Repos ----
async function loadRepos() {
  try {
    const res = await fetch('/api/repos');
    const repos = await res.json();
    const grid = document.getElementById('repo-grid');
    const empty = document.getElementById('empty-repos');

    if (repos.length === 0) {
      grid.innerHTML = '';
      empty.style.display = 'block';
      return;
    }

    empty.style.display = 'none';
    const langColors = { JavaScript: 'js', TypeScript: 'ts', Python: 'py', Go: 'go', Rust: 'rust' };

    grid.innerHTML = repos.map(r => `
      <div class="repo-card" onclick="selectRepo('${r.owner}', '${r.name}')">
        <h3>${r.owner}/${r.name}</h3>
        <div class="repo-desc">${r.description || ''}</div>
        <div class="repo-meta">
          ${r.language ? `<span><span class="repo-dot ${langColors[r.language] || ''}"></span>${r.language}</span>` : ''}
          <span>★ ${r.stars}</span>
        </div>
      </div>
    `).join('');
  } catch (e) {
    document.getElementById('repo-grid').innerHTML =
      `<div class="error-state">Failed to load repositories: ${e.message}</div>`;
  }
}

function selectRepo(owner, name) {
  currentRepo = { owner, name };
  document.getElementById('view-dashboard').style.display = 'none';
  document.getElementById('view-generate').style.display = 'block';
  document.getElementById('generate-repo-name').textContent = `${owner}/${name}`;
  document.getElementById('from-tag').value = '';
  document.getElementById('generate-result').style.display = 'none';
  document.getElementById('generate-loading').style.display = 'none';
  document.getElementById('generate-error').style.display = 'none';
}

function showDashboard() {
  currentRepo = null;
  document.getElementById('view-dashboard').style.display = 'block';
  document.getElementById('view-generate').style.display = 'none';
}

// ---- Generate ----
async function doGenerate() {
  if (!currentRepo) return;

  const fromTag = document.getElementById('from-tag').value.trim();
  const toTag = document.getElementById('to-tag').value.trim() || 'HEAD';

  if (!fromTag) {
    showError('Please enter a starting tag (e.g., v1.2.0).');
    return;
  }

  document.getElementById('generate-loading').style.display = 'block';
  document.getElementById('generate-result').style.display = 'none';
  document.getElementById('generate-error').style.display = 'none';

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        owner: currentRepo.owner,
        repo: currentRepo.name,
        fromTag,
        toTag
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Generation failed');
    }

    const data = await res.json();

    document.getElementById('generate-loading').style.display = 'none';
    document.getElementById('generate-result').style.display = 'block';
    document.getElementById('preview-content').textContent = data.markdown;
    document.getElementById('generate-stats').textContent =
      `${data.stats.commits} commits · ${data.stats.prs} PRs · AI: ${data.stats.usedAI ? '✓' : '✗ (rules)'}`;
  } catch (e) {
    document.getElementById('generate-loading').style.display = 'none';
    showError(e.message);
  }
}

// ---- Publish ----
async function doPublish() {
  if (!currentRepo) return;

  const markdown = document.getElementById('preview-content').textContent;
  const draft = document.getElementById('draft-checkbox').checked;

  // Extract version from markdown or prompt
  const fromTag = document.getElementById('from-tag').value.trim();
  const toTag = document.getElementById('to-tag').value.trim() || 'HEAD';
  const tagName = toTag === 'HEAD' ? fromTag : toTag;

  try {
    const res = await fetch('/api/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        owner: currentRepo.owner,
        repo: currentRepo.name,
        tagName,
        markdown,
        draft
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Publish failed');
    }

    const data = await res.json();
    alert(`Published: ${data.url}`);
  } catch (e) {
    showError(`Publish failed: ${e.message}`);
  }
}

function showError(msg) {
  const el = document.getElementById('generate-error');
  el.textContent = msg;
  el.style.display = 'block';
}

// ---- Init ----
checkAuth();
