// LLM client: DeepSeek (primary) + OpenAI + Anthropic (optional)
const OpenAI = require('openai');

const PROVIDERS = {
  deepseek: {
    name: 'DeepSeek',
    createClient(config) {
      return new OpenAI({
        apiKey: config.llm.deepseek.apiKey,
        baseURL: config.llm.deepseek.baseURL || 'https://api.deepseek.com/v1'
      });
    },
    model(config) {
      return config.llm.deepseek.model || 'deepseek-chat';
    }
  },
  openai: {
    name: 'OpenAI',
    createClient(config) {
      return new OpenAI({
        apiKey: config.llm.openai.apiKey
      });
    },
    model(config) {
      return config.llm.openai.model || 'gpt-4o-mini';
    }
  },
  anthropic: {
    name: 'Anthropic',
    createClient(config) {
      // Anthropic uses a different SDK. Use OpenAI-compatible mode if available,
      // otherwise throw a helpful error.
      return null; // Will be handled by generate()
    },
    model(config) {
      return config.llm.anthropic.model || 'claude-sonnet-4-6';
    }
  }
};

function getProvider(config) {
  const provider = config.llm.provider || 'deepseek';
  const impl = PROVIDERS[provider];
  if (!impl) throw new Error(`Unknown LLM provider: ${provider}. Supported: deepseek, openai, anthropic`);
  return impl;
}

async function generateChangelog(prs, config) {
  const provider = getProvider(config);

  // Handle Anthropic separately (different SDK)
  if (config.llm.provider === 'anthropic') {
    return generateWithAnthropic(prs, config);
  }

  // DeepSeek and OpenAI both use OpenAI-compatible API
  const client = provider.createClient(config);
  const model = provider.model(config);
  const providerName = provider.name;

  const prListText = prs.map(pr => {
    const labels = pr.labels.length > 0 ? ` [${pr.labels.join(', ')}]` : '';
    return `PR #${pr.number}: ${pr.title}${labels}\n  Description: ${(pr.body || '').substring(0, 200)}`;
  }).join('\n\n');

  const systemPrompt = `You are a release notes writer for open source projects.
Given a list of merged Pull Requests, generate a structured CHANGELOG.md following the Keep a Changelog format.

Rules:
1. Categorize each PR into exactly one of: Added (new features), Changed (changes in existing functionality), Fixed (bug fixes), Removed (deprecated features).
2. Write a clear, human-readable one-line summary for each PR. Make it understandable to end users, not just developers.
3. Preserve the PR number as a link: (#123)
4. If a PR doesn't fit any category or is purely internal (CI, tests, docs), skip it.
5. Output ONLY the markdown, starting with the version header. No preamble, no explanation.
6. If there are no PRs for a category, omit that category entirely.`;

  const userPrompt = `Generate a changelog for the following merged PRs:\n\n${prListText}\n\nFormat:
## [VERSION] - YYYY-MM-DD
### Added
- Summary (#N)
### Changed
- Summary (#N)
### Fixed
- Summary (#N)
### Removed
- Summary (#N)`;

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.3,
    max_tokens: 4000
  });

  return response.choices[0].message.content;
}

async function generateWithAnthropic(prs, config) {
  // Anthropic SDK is optional; provide friendly error if not installed
  let Anthropic;
  try {
    Anthropic = require('@anthropic-ai/sdk');
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') {
      throw new Error('Anthropic SDK is not installed. Install it with: npm install @anthropic-ai/sdk');
    }
    throw e;
  }

  const anthropic = new Anthropic({ apiKey: config.llm.anthropic.apiKey });
  const model = config.llm.anthropic.model || 'claude-sonnet-4-6';

  const prListText = prs.map(pr => {
    const labels = pr.labels.length > 0 ? ` [${pr.labels.join(', ')}]` : '';
    return `PR #${pr.number}: ${pr.title}${labels}\n  Description: ${(pr.body || '').substring(0, 200)}`;
  }).join('\n\n');

  const response = await anthropic.messages.create({
    model,
    max_tokens: 4000,
    temperature: 0.3,
    system: `You are a release notes writer for open source projects. Given a list of merged Pull Requests, generate a structured CHANGELOG.md following the Keep a Changelog format. Categorize into: Added, Changed, Fixed, Removed. Skip purely internal PRs (CI, tests, docs). Output ONLY the markdown.`,
    messages: [{
      role: 'user',
      content: `Generate a changelog for the following merged PRs:\n\n${prListText}\n\nFormat:\n## [VERSION] - YYYY-MM-DD\n### Added\n- Summary (#N)\n### Changed\n- Summary (#N)\n### Fixed\n- Summary (#N)\n### Removed\n- Summary (#N)`
    }]
  });

  return response.content[0].text;
}

async function classifyWithRules(prs) {
  // Rule-based fallback when LLM fails
  const categories = { Added: [], Changed: [], Fixed: [], Removed: [] };

  for (const pr of prs) {
    const title = pr.title.toLowerCase();
    const labels = pr.labels.map(l => l.toLowerCase());

    // Phase 1: Labels first — explicit human annotation takes priority over title prefixes
    if (labels.includes('breaking') || labels.includes('breaking change')) {
      categories.Changed.push(`- ${pr.title} (#${pr.number})`);
    } else if (labels.includes('bug') || labels.includes('fix')) {
      categories.Fixed.push(`- ${pr.title} (#${pr.number})`);
    } else if (labels.includes('enhancement') || labels.includes('feature')) {
      categories.Added.push(`- ${pr.title} (#${pr.number})`);
    } else if (labels.includes('deprecated') || labels.includes('removed')) {
      categories.Removed.push(`- ${pr.title} (#${pr.number})`);
    // Phase 2: Title prefix fallback (only when no label matched)
    } else if (title.includes('breaking:')) {
      categories.Changed.push(`- ${pr.title} (#${pr.number})`);
    } else if (title.startsWith('fix:') || title.startsWith('fix(')) {
      categories.Fixed.push(`- ${pr.title} (#${pr.number})`);
    } else if (title.startsWith('feat:') || title.startsWith('feat(')) {
      categories.Added.push(`- ${pr.title} (#${pr.number})`);
    // Phase 3: No label and no recognized prefix → default to Changed
    } else {
      categories.Changed.push(`- ${pr.title} (#${pr.number})`);
    }
  }

  const sections = [];
  for (const [cat, items] of Object.entries(categories)) {
    if (items.length > 0) {
      sections.push(`### ${cat}\n${items.join('\n')}`);
    }
  }

  return `## [Unreleased]\n\n${sections.join('\n\n')}`;
}

// ── Commit classification (no PRs) ──────────────────────────────────────────

async function classifyCommitsWithAnthropic(commits, config) {
  let Anthropic;
  try {
    Anthropic = require('@anthropic-ai/sdk');
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') {
      throw new Error('Anthropic SDK is not installed. Install it with: npm install @anthropic-ai/sdk');
    }
    throw e;
  }

  const anthropic = new Anthropic({ apiKey: config.llm.anthropic.apiKey });
  const model = config.llm.anthropic.model || 'claude-sonnet-4-6';

  const commitText = commits.map(c =>
    `${c.hash.substring(0, 7)} ${c.message.split('\n')[0]}`
  ).join('\n');

  const response = await anthropic.messages.create({
    model,
    max_tokens: 4000,
    temperature: 0.3,
    system: `You are a release notes writer. Given a list of git commits, generate a structured CHANGELOG.md following Keep a Changelog format. Categorize into: Added (new features), Changed (changes in existing functionality), Fixed (bug fixes), Removed (deprecated features). Merge related commits into a single entry when they address the same change. Write clear, human-readable one-line summaries. Skip purely internal commits (CI, tests, formatting, merge commits). Use EXACTLY "[VERSION]" and "YYYY-MM-DD" as placeholders — do NOT fill in actual values. Output ONLY the markdown.`,
    messages: [{
      role: 'user',
      content: `Generate a changelog:\n\n${commitText}\n\nFormat:\n## [VERSION] - YYYY-MM-DD\n### Added\n- Summary\n### Changed\n- Summary\n### Fixed\n- Summary\n### Removed\n- Summary`
    }]
  });

  return response.content[0].text;
}

async function classifyCommits(commits, config) {
  // Route Anthropic separately (different SDK)
  if (config.llm.provider === 'anthropic') {
    return classifyCommitsWithAnthropic(commits, config);
  }

  // DeepSeek and OpenAI both use OpenAI-compatible API
  const provider = getProvider(config);
  const client = provider.createClient(config);
  const model = provider.model(config);

  const commitText = commits.map(c =>
    `${c.hash.substring(0, 7)} ${c.message.split('\n')[0]}`
  ).join('\n');

  const systemPrompt = `You are a release notes writer. Given a list of git commits, generate a structured CHANGELOG.md following Keep a Changelog format.

Rules:
1. Categorize each meaningful change into: Added (new features), Changed (changes in existing functionality), Fixed (bug fixes), Removed (deprecated features).
2. Merge related commits into a single human-readable entry.
3. Write summaries for end users, not developers.
4. Skip purely internal commits (CI config, formatting, merge commits, version bumps).
5. Use EXACTLY "[VERSION]" and "YYYY-MM-DD" as placeholders — do NOT fill in actual version numbers or dates.
6. Output ONLY the markdown. No preamble, no explanation.`;

  const userPrompt = `Generate a changelog for these commits:\n\n${commitText}\n\nFormat:
## [VERSION] - YYYY-MM-DD
### Added
- Summary
### Changed
- Summary
### Fixed
- Summary
### Removed
- Summary`;

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.3,
    max_tokens: 4000
  });

  return response.choices[0].message.content;
}

// ── Alias (generator.js calls this for PRs) ──────────────────────────────────
const classifyPRs = generateChangelog;

module.exports = { generateChangelog, classifyPRs, classifyCommits, classifyWithRules, getProvider, PROVIDERS };
