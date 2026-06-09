# CHANGELOG — AI-powered release notes

> Automatically scan Git history, classify PRs with DeepSeek AI, and generate beautiful, structured CHANGELOG.md files. CLI + Web Dashboard.

## Why

Open source maintainers spend 30-60 minutes per release manually compiling changelogs — scrolling through closed PRs, categorizing each one, writing summaries, formatting markdown. It's tedious, error-prone, and the #1 documented pain point in release-note-related GitHub issues (47% of all RN issues — [Empirical Software Engineering, 2024](https://dl.acm.org/doi/10.1007/s10664-024-10486-0)).

CHANGELOG replaces that 30-60 minutes with **3 seconds**.

## Features

- **AI-Powered Classification** — DeepSeek (default), OpenAI, or Anthropic. PRs categorized into Added/Changed/Fixed/Removed
- **No AI? No Problem** — `--no-ai` uses smart keyword detection (e.g. "Add login" → Added, "Fix crash" → Fixed). Works with zero config
- **Dual Interface** — CLI for quick generation, Web Dashboard for visual preview and editing
- **One-Click Publish** — Push directly to GitHub Releases
- **Smart Fallback** — AI fails? Falls back to rule-based classification. No crash, no blank output
- **Conventional Commits Compatible** — `feat:`/`fix:` prefixes recognized; AI enhances existing CC workflows

## Quick Start

```bash
# Install
npm install -g @jiangxiadadao/changelog

# Quick try — no API key needed
changelog generate --no-ai

# Full power with AI (DeepSeek, ¥1/1M tokens)
changelog init
changelog config set llm.deepseek.apiKey sk-your-key
changelog generate

# Or with explicit range + GitHub PR data
changelog generate --from v1.0.0 --to HEAD --owner you --repo your-project

# Start Web Dashboard
changelog serve
```

## Supported LLM Providers

| Provider | Setup |
|----------|-------|
| **DeepSeek** (default) | `changelog config set llm.deepseek.apiKey sk-xxx` |
| OpenAI | `changelog config set llm.provider openai` + `changelog config set llm.openai.apiKey sk-xxx` |
| Anthropic | `changelog config set llm.provider anthropic` + `changelog config set llm.anthropic.apiKey sk-ant-xxx` |

## CLI Commands

| Command | Description |
|---------|-------------|
| `changelog init` | Create `.changelogrc` |
| `changelog generate` | Generate CHANGELOG preview |
| `changelog publish` | Publish to GitHub Release |
| `changelog serve` | Start Web Dashboard |
| `changelog status` | Show config and repo info |
| `changelog config` | Manage configuration |

## Pricing

| Plan | Price | Includes |
|------|-------|----------|
| **Free** | ¥0/month | CLI: generate / publish / status / config. Unlimited repos, unlimited generations |
| **Pro** | ¥5/month | Everything in Free + Web Dashboard (visual preview, OAuth login, repo management) |

> All features work without a credit card. The Free tier is fully functional — no artificial limits on generations or repos.

## Requirements

- Node.js >= 18
- Git
- DeepSeek, OpenAI, or Anthropic API key
- GitHub token (for publishing releases): `changelog config set github.token ghp_xxx`

## Links

- [GitHub Repository](https://github.com/JIANGXIADADAO/changelog-tool) — source code, issues, releases
- [npm Package](https://www.npmjs.com/package/@jiangxiadadao/changelog)
