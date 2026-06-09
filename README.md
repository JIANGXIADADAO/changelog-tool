# CHANGELOG — AI-Powered Release Notes

> AI scans your Git history → generates beautiful, structured CHANGELOG.md. CLI + Web Dashboard.

[📖 中文版 / Chinese Version →](README.zh.md)

---

## What is this?

**Do you manually write release notes for every version?** Scrolling through commits, categorizing, writing summaries — 30+ minutes every time. CHANGELOG does it automatically: scan Git, AI classification, one-click publish to GitHub Release.

---

## Quick Start

> Pick a path based on what you have. Each path is 3 steps or less.

---

### Path A: Zero config, just try it

> No account needed. See results in 1 minute.

```bash
# 1. Install
npm install -g @jiangxiadadao/changelog

# 2. Go to your git project
cd your-project

# 3. Generate
changelog generate --no-ai
```

**You'll see:**

```
Auto-detected latest tag: v1.0.0
Scanning changes from v1.0.0 to HEAD...

## [Unreleased]
### Added
- Login page (a1b2c3d)
### Fixed
- Null pointer crash (e4f5g6h)

Stats: 3 commits, 0 PRs, AI: false
```

✅ Zero config, instant changelog. Classification uses smart keyword detection (`Add` → Added, `Fix` → Fixed, etc.).

---

### Path B: I have a DeepSeek API key, want AI quality

> AI understands commit semantics, merges related entries, writes human-readable summaries.

```bash
# 1. Init config
changelog init

# 2. Set API key
changelog config set llm.deepseek.apiKey sk-your-key

# 3. Generate
changelog generate
```

**You'll see:**

```
Classifying commits with deepseek...

## [Unreleased]
### Added
- New user registration flow with email verification
### Fixed
- Login redirect loop when session expires
### Removed
- Deprecated v1 API endpoints

Stats: 12 commits, 0 PRs, AI: true
```

✅ AI directly analyzes your commits — no GitHub PRs needed. Compare with Path A:
- Rule-based: `fix: handle null` → `Fixed - handle null (abc1234)`
- AI: `fix: handle null` → `Fixed - Login redirect loop when session expires`

---

### Path C: I use GitHub PRs, want best quality

> PRs have titles, descriptions, and labels — AI gets richer context, produces the most accurate output.

```bash
# Prerequisite: set up GitHub token
# Go to https://github.com/settings/tokens, create a token (check "repo")

changelog config set github.token ghp_your-token

# Generate with repo info
changelog generate --owner your-username --repo your-repo
```

**You'll see:**

```
Scanning changes from v1.2.0 to HEAD...
Classifying PRs with deepseek...

## [Unreleased]
### Added
- Social login (Google + GitHub) (#142)
- Dark mode support (#138)
### Fixed
- Memory leak in WebSocket connection (#145)

Stats: 47 commits, 6 PRs, AI: true
```

✅ PR-level AI classification — most accurate. Merged commits won't appear twice. Internal PRs (CI/docs/formatting) are automatically skipped.

---

### Path D: I want to publish to GitHub Release

```bash
# Prerequisite: run generate first (auto-saves a preview)
changelog generate --owner your-username --repo your-repo

# Publish
changelog publish
```

✅ Auto-detects git remote, creates GitHub Release. Add `--draft` to save as draft first.

---

## Command Reference

| Command | What it does |
|---------|-------------|
| `changelog init` | Create `.changelogrc` config file |
| `changelog generate` | Generate changelog (AI mode) |
| `changelog generate --no-ai` | Generate without AI (keyword rules) |
| `changelog generate --from v1.0.0 --to HEAD` | Specify version range |
| `changelog generate --format json` | JSON output (for scripting) |
| `changelog publish` | Publish to GitHub Release |
| `changelog serve` | Start Web Dashboard |
| `changelog status` | Show current config and repo info |
| `changelog config show` | Show full config (secrets masked) |
| `changelog config set <key> <value>` | Modify a config value |

---

## Supported AI Providers

| Provider | Setup | Cost |
|----------|-------|------|
| **DeepSeek** (default) | `changelog config set llm.deepseek.apiKey sk-xxx` | ¥1/M tokens |
| OpenAI | `changelog config set llm.provider openai`<br>`changelog config set llm.openai.apiKey sk-xxx` | $2.5-15/M tokens |
| Anthropic | `changelog config set llm.provider anthropic`<br>`changelog config set llm.anthropic.apiKey sk-ant-xxx`<br>`npm install @anthropic-ai/sdk` | $3-15/M tokens |

> **Recommended**: DeepSeek. Cheapest (¥1/M tokens), default provider, zero extra dependencies.

---

## Pricing

| Plan | Price | Includes |
|------|-------|----------|
| **Free** | ¥0/month | Full CLI: generate, publish, status, config. Unlimited repos and generations |
| **Pro** | ¥5/month | Everything in Free + Web Dashboard (visual preview, OAuth login, repo management) |

> Free tier is fully functional — no hidden limits like "3 generations per month".

---

## FAQ

<details>
<summary><b>Q: Can I use it without an API key?</b></summary>

**Yes.** Run `changelog generate --no-ai`. The tool uses keyword-based classification. Quality is lower than AI, but it's fully functional and completely free.
</details>

<details>
<summary><b>Q: I set an API key, why does it still say AI: false?</b></summary>

**99% of the time: you passed `--no-ai`.** Remove it and run `changelog generate` again.

If it still shows AI: false, your key might not be set correctly. Run `changelog config show` to check.
</details>

<details>
<summary><b>Q: I don't use GitHub PRs. Is AI still useful?</b></summary>

**Yes.** Without PRs, AI analyzes your commit messages directly. AI can:
- Understand what commits actually mean
- Merge 3 related commits into 1 clean entry
- Skip internal commits (CI config, formatting, merge commits)
</details>

<details>
<summary><b>Q: How do I get a DeepSeek API key?</b></summary>

1. Sign up at [platform.deepseek.com](https://platform.deepseek.com)
2. Go to "API Keys" in the sidebar → create a new key
3. Top up ¥10 (lasts a very long time for changelog generation)
</details>

<details>
<summary><b>Q: I'm new to Git and the command line...</b></summary>

No worries. Your most likely path:
1. Open terminal, cd to your project
2. Run `npx @jiangxiadadao/changelog generate --no-ai`
3. See the output? That's your first changelog.

No git tags, no branches, no Git knowledge needed. Chinese commit messages are fully supported.
</details>

<details>
<summary><b>Q: How do I create a Git tag?</b></summary>

```bash
git tag v1.0.0          # Create tag
git push origin v1.0.0  # Push to GitHub
```

After tagging, CHANGELOG can auto-detect version ranges for more accurate logs.
</details>

---

## Requirements

- **Node.js** >= 18
- **Git** (your project must be a git repo)
- **API key** (DeepSeek / OpenAI / Anthropic — only needed for AI mode)
- **GitHub token** (only needed for publish and PR mode)

---

## Links

- [GitHub](https://github.com/JIANGXIADADAO/changelog-tool) — source code, issues, releases
- [npm](https://www.npmjs.com/package/@jiangxiadadao/changelog) — package page
