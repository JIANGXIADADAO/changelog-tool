// GitHub API client via Octokit
const { Octokit } = require('@octokit/rest');

function createClient(token) {
  return new Octokit({ auth: token });
}

async function getMergedPRs(octokit, owner, repo, since, until = 'HEAD') {
  // Get PRs merged between two refs
  // We fetch closed PRs and filter by merge date
  const prs = [];
  let page = 1;

  while (true) {
    const { data } = await octokit.pulls.list({
      owner,
      repo,
      state: 'closed',
      sort: 'updated',
      direction: 'desc',
      per_page: 100,
      page
    });

    if (data.length === 0) break;

    for (const pr of data) {
      if (!pr.merged_at) continue;
      prs.push({
        number: pr.number,
        title: pr.title,
        body: pr.body || '',
        labels: pr.labels.map(l => l.name),
        merged_at: pr.merged_at,
        user: pr.user?.login || 'unknown',
        html_url: pr.html_url
      });
    }

    page++;
    if (page > 10) break; // safety limit: 1000 PRs
  }

  return prs;
}

async function createRelease(octokit, owner, repo, tagName, body, draft = false) {
  const { data } = await octokit.repos.createRelease({
    owner,
    repo,
    tag_name: tagName,
    name: tagName,
    body,
    draft,
    prerelease: tagName.includes('-')
  });
  return data;
}

async function listRepos(octokit) {
  const { data } = await octokit.repos.listForAuthenticatedUser({
    sort: 'updated',
    per_page: 100
  });
  return data.map(r => ({
    owner: r.owner.login,
    name: r.name,
    full_name: r.full_name,
    description: r.description,
    stars: r.stargazers_count,
    language: r.language,
    default_branch: r.default_branch
  }));
}

async function getAuthenticatedUser(octokit) {
  const { data } = await octokit.users.getAuthenticated();
  return { id: data.id, login: data.login, avatar: data.avatar_url };
}

module.exports = { createClient, getMergedPRs, createRelease, listRepos, getAuthenticatedUser };
