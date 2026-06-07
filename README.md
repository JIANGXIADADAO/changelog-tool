# CHANGELOG — AI-powered release notes

> Automatically scan Git history, classify PRs with DeepSeek AI, and generate beautiful, structured CHANGELOG.md files. CLI + Web Dashboard.

## Why

Open source maintainers spend 30-60 minutes per release manually compiling changelogs — scrolling through closed PRs, categorizing each one, writing summaries, formatting markdown. It's tedious, error-prone, and the #1 documented pain point in release-note-related GitHub issues (47% of all RN issues — [Empirical Software Engineering, 2024](https://dl.acm.org/doi/10.1007/s10664-024-10486-0)).

CHANGELOG replaces that 30-60 minutes with **3 seconds**.

## Features

- **AI-Powered Classification** — DeepSeek (default), OpenAI, or Anthropic. PRs categorized into Added/Changed/Fixed/Removed
- **Dual Interface** — CLI for quick generation, Web Dashboard for visual preview and editing
- **One-Click Publish** — Push directly to GitHub Releases
- **Smart Fallback** — AI fails? Falls back to rule-based classification. No crash, no blank output
- **Zero Config Start** — `changelog init && changelog generate` and you have a preview
- **Conventional Commits Compatible** — Works with or without CC; AI enhances existing CC workflows

## Quick Start

```bash
# Install
npm install -g @jiangxiadadao/changelog

# Configure (DeepSeek API key required for AI mode)
changelog init
changelog config set llm.deepseek.apiKey sk-your-key

# Generate (from latest tag to HEAD)
changelog generate

# Or with explicit range
changelog generate --from v1.2.0 --to HEAD

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
| **Free** | ¥0/month | Public repos, 3 generations/month, CLI only |
| **Standard** | ¥30/month | Unlimited generations, Web Dashboard, auto-publish |
| **Team** | ¥80/month | Private repos, multi-repo, custom templates, team access |

## Requirements

- Node.js >= 18
- Git
- DeepSeek, OpenAI, or Anthropic API key
- GitHub token (for publishing releases): `changelog config set github.token ghp_xxx`

## Links

- [Full CLI Reference](./cli-reference.md) — 7 个命令的完整手册
- [Web Dashboard + Configuration Guide](./quickstart.md) — OAuth 登录、预览面板、配置详解
- [CHANGELOG Examples](./examples.md) — AI 生成 vs 规则分类效果对比
