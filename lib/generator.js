// Core generation engine: git + GitHub + LLM → structured CHANGELOG
const git = require('./git');
const github = require('./github');
const llm = require('./llm');
const config = require('./config');

async function generate({ fromTag, toTag = 'HEAD', owner, repo, dir = process.cwd(), useAI = true }) {
  const cfg = config.load();

  // 1. Get commits from local git
  const commits = await git.getCommits(fromTag, toTag, dir);

  // 2. Get PRs from GitHub (if repo info provided)
  let prs = [];
  if (owner && repo && cfg.github.token) {
    const octokit = github.createClient(cfg.github.token);
    prs = await github.getMergedPRs(octokit, owner, repo, fromTag, toTag);
  }

  // 3. If we have no PRs, build changelog from commits only
  if (prs.length === 0) {
    return generateFromCommits(commits);
  }

  // 4. Generate with AI or rules
  let markdown;
  if (useAI && cfg.llm[cfg.llm.provider]?.apiKey) {
    try {
      markdown = await llm.generateChangelog(prs, cfg);
    } catch (e) {
      console.error(`AI generation failed (${e.message}), falling back to rule-based classification.`);
      markdown = await llm.classifyWithRules(prs);
    }
  } else {
    if (useAI) {
      console.error(`No API key configured for ${cfg.llm.provider}. Set it in .changelogrc or run \`changelog config set llm.${cfg.llm.provider}.apiKey <key>\`. Falling back to rule-based classification.`);
    }
    markdown = await llm.classifyWithRules(prs);
  }

  // 5. Add version header
  const versionHeader = toTag === 'HEAD' ? 'Unreleased' : toTag;
  const date = new Date().toISOString().split('T')[0];
  const fullMarkdown = markdown.replace('## [VERSION]', `## [${versionHeader}]`).replace('YYYY-MM-DD', date);

  return {
    markdown: fullMarkdown,
    stats: {
      commits: commits.length,
      prs: prs.length,
      usedAI: useAI && !!cfg.llm[cfg.llm.provider]?.apiKey
    }
  };
}

function generateFromCommits(commits) {
  const categories = { Added: [], Changed: [], Fixed: [], Removed: [] };

  for (const c of commits) {
    const msg = c.message.split('\n')[0]; // First line only
    if (msg.startsWith('feat:') || msg.startsWith('feat(')) {
      categories.Added.push(`- ${msg.replace(/^feat(\(.*?\))?:\s*/, '')} (${c.hash.substring(0, 7)})`);
    } else if (msg.startsWith('fix:') || msg.startsWith('fix(')) {
      categories.Fixed.push(`- ${msg.replace(/^fix(\(.*?\))?:\s*/, '')} (${c.hash.substring(0, 7)})`);
    } else if (msg.includes('BREAKING CHANGE') || msg.includes('breaking:')) {
      categories.Changed.push(`- **Breaking:** ${msg.replace(/^[^:]+:\s*/, '')} (${c.hash.substring(0, 7)})`);
    } else {
      categories.Changed.push(`- ${msg} (${c.hash.substring(0, 7)})`);
    }
  }

  const sections = [];
  for (const [cat, items] of Object.entries(categories)) {
    if (items.length > 0) sections.push(`### ${cat}\n${items.join('\n')}`);
  }

  return {
    markdown: `## [Unreleased]\n\n${sections.join('\n\n')}`,
    stats: { commits: commits.length, prs: 0, usedAI: false }
  };
}

async function publish({ owner, repo, tagName, markdown, draft = false }) {
  const cfg = config.load();
  if (!cfg.github.token) throw new Error('GitHub token not configured. Set github.token in .changelogrc');

  const octokit = github.createClient(cfg.github.token);
  const release = await github.createRelease(octokit, owner, repo, tagName, markdown, draft);
  return release.html_url;
}

module.exports = { generate, publish };
