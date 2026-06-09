# CHANGELOG / 变更日志生成器

> AI 自动扫描 Git 提交记录 → 生成漂亮的 CHANGELOG.md。CLI + Web 双界面。
>
> AI scans your Git history → generates beautiful, structured CHANGELOG.md. CLI + Web Dashboard.

---

## 这是什么？/ What is this?

**你每次发新版本，都要手动写更新日志吗？** 一条条翻 commit、分门别类、写摘要——30 分钟起步。CHANGELOG 帮你自动完成：扫描 Git、AI 分类润色、一键发布到 GitHub Release。

**Do you manually write release notes for every version?** Scrolling through commits, categorizing, writing summaries — 30+ minutes every time. CHANGELOG does it automatically: scan Git, AI classification, one-click publish to GitHub Release.

---

## 快速开始 / Quick Start

> 按你的情况选一条路径。每条路径 3 步以内。
> Pick a path based on what you have. Each path is 3 steps or less.

---

### 路径 A：我就想试试，什么都不配 / Path A: Zero config, just try it

> 不需要注册任何账号。1 分钟看到效果。
> No account needed. See results in 1 minute.

```bash
# 1. 安装 / Install
npm install -g @jiangxiadadao/changelog

# 2. 进入你的项目（任意 git 项目） / Go to your git project
cd your-project

# 3. 生成 / Generate
changelog generate --no-ai
```

**你会看到 / You'll see：**

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

✅ 零配置，立即得到一份分类好的 changelog。分类基于关键词智能识别（`Add` → Added，`Fix` → Fixed 等）。

Zero config, instant changelog. Classification uses smart keyword detection.

---

### 路径 B：我有 DeepSeek API key，想要更好的质量 / Path B: I have a DeepSeek key, want AI quality

> AI 能理解 commit 的真实含义、合并相关条目、写出人类可读的摘要。
> AI understands commit semantics, merges related entries, writes human-readable summaries.

```bash
# 1. 初始化配置 / Init config
changelog init

# 2. 设置 API key / Set API key
changelog config set llm.deepseek.apiKey sk-你的key

# 3. 生成 / Generate
changelog generate
```

**你会看到 / You'll see：**

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

✅ AI 直接分析你的 commit 历史——不需要 GitHub PR。效果对比路径 A：
- 规则分类：`fix: handle null` → `Fixed - handle null (abc1234)`
- AI 分类：`fix: handle null` → `Fixed - Login redirect loop when session expires`

AI directly analyzes your commits — no GitHub PRs needed.

---

### 路径 C：我有 GitHub PR，要最高质量 / Path C: I use GitHub PRs, want best quality

> PR 有标题、描述、标签，AI 能获得更完整的信息，输出最准确。
> PRs have titles, descriptions, and labels — AI gets richer context, produces the most accurate output.

```bash
# 前置：配好 GitHub token / Prerequisite: set up GitHub token
# 去 https://github.com/settings/tokens 创建一个 token（勾选 repo）
# Go to https://github.com/settings/tokens, create a token (check "repo")

changelog config set github.token ghp_你的token

# 生成（指定仓库） / Generate (specify repo)
changelog generate --owner 你的用户名 --repo 你的仓库名
```

**你会看到 / You'll see：**

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

✅ PR 级别的 AI 分类——最准确。合并的 commit 不会重复出现，内部 PR（CI/文档/格式化）自动跳过。

PR-level AI classification — most accurate. Merged commits won't appear twice. Internal PRs (CI/docs/formatting) are automatically skipped.

---

### 路径 D：我要发布到 GitHub Release / Path D: I want to publish to GitHub Release

```bash
# 前置：先跑一次 generate（会自动保存预览）
# Prerequisite: run generate first (auto-saves a preview)

changelog generate --owner 你的用户名 --repo 你的仓库名

# 发布 / Publish
changelog publish
```

✅ 自动检测 git remote、创建 GitHub Release。加 `--draft` 可以先存草稿。

Auto-detects git remote, creates GitHub Release. Add `--draft` to save as draft first.

---

## 命令速查 / Command Reference

| 命令 / Command | 干什么 / What it does |
|---------------|----------------------|
| `changelog init` | 创建配置文件 `.changelogrc` / Create config file |
| `changelog generate` | 生成 changelog（AI 模式） / Generate with AI |
| `changelog generate --no-ai` | 生成 changelog（规则模式，不调 AI） / Generate without AI |
| `changelog generate --from v1.0.0 --to HEAD` | 指定版本范围 / Specify version range |
| `changelog generate --format json` | JSON 格式输出（给脚本用） / JSON output for scripting |
| `changelog publish` | 发布到 GitHub Release / Publish to GitHub Release |
| `changelog serve` | 启动 Web Dashboard / Start Web Dashboard |
| `changelog status` | 查看当前配置 / Show current config |
| `changelog config show` | 查看完整配置（敏感值已隐藏） / Show full config (secrets masked) |
| `changelog config set <key> <value>` | 修改配置 / Modify config |

---

## 支持的 AI / Supported AI Providers

| 提供商 / Provider | 设置方式 / Setup | 费用 / Cost |
|-------------------|------------------|-------------|
| **DeepSeek**（默认/default） | `changelog config set llm.deepseek.apiKey sk-xxx` | ¥1/百万 tokens |
| OpenAI | `changelog config set llm.provider openai`<br>`changelog config set llm.openai.apiKey sk-xxx` | $2.5-15/百万 tokens |
| Anthropic | `changelog config set llm.provider anthropic`<br>`changelog config set llm.anthropic.apiKey sk-ant-xxx`<br>`npm install @anthropic-ai/sdk` | $3-15/百万 tokens |

> **推荐 / Recommended**：DeepSeek。最便宜（¥1/百万 tokens）、默认配置、零额外依赖。
> DeepSeek is the cheapest (¥1/M tokens), default provider, zero extra dependencies.

---

## 定价 / Pricing

| 套餐 / Plan | 价格 / Price | 包含 / Includes |
|-------------|-------------|-----------------|
| **Free** | ¥0/月 | CLI 全功能：generate / publish / status / config。无限仓库、无限生成次数<br>Full CLI: generate, publish, status, config. Unlimited repos and generations |
| **Pro** | ¥5/月 | Free 全部 + Web Dashboard（可视化预览、OAuth 登录、多仓库管理）<br>Everything in Free + Web Dashboard (visual preview, OAuth login, repo management) |

> 免费版完全可用——没有"3 次/月"之类的隐藏限制。
> Free tier is fully functional — no hidden limits like "3 generations per month".

---

## 常见问题 / FAQ

<details>
<summary><b>Q: 我不配 API key 能用吗？ / Can I use it without an API key?</b></summary>

**能。** 跑 `changelog generate --no-ai`。工具会用关键词智能分类你的 commit。效果不如 AI，但完全可用、完全免费。

**Yes.** Run `changelog generate --no-ai`. The tool uses keyword-based classification. Quality is lower than AI, but it's fully functional and completely free.
</details>

<details>
<summary><b>Q: 为什么我配了 API key，输出还显示 AI: false？ / I set an API key, why does it say AI: false?</b></summary>

**99% 的情况：你加了 `--no-ai` 参数。** 去掉它，再跑一次 `changelog generate`。

**99% of the time: you passed `--no-ai`.** Remove it and run `changelog generate` again.

如果还是 AI: false，key 可能没配对。跑 `changelog config show` 检查。
If it still shows AI: false, your key might not be set correctly. Run `changelog config show` to check.
</details>

<details>
<summary><b>Q: 我没有 GitHub PR，AI 还有用吗？ / I don't use GitHub PRs. Is AI still useful?</b></summary>

**有用。** 没有 PR 时，AI 会直接分析你的 commit message。AI 能：
- 理解 commit 的真实意图（`fix: handle null` → "修复了登录过期后的重定向死循环"）
- 合并相关 commit（3 条关于同一个功能的 commit → 1 条摘要）
- 跳过内部 commit（CI 配置、格式化、merge commit 自动忽略）

**Yes.** Without PRs, AI analyzes your commit messages directly. AI can:
- Understand what commits actually mean
- Merge related commits into single entries
- Skip internal commits (CI config, formatting, merge commits)
</details>

<details>
<summary><b>Q: 怎么拿到 DeepSeek API key？ / How do I get a DeepSeek API key?</b></summary>

1. 注册 [platform.deepseek.com](https://platform.deepseek.com)
2. 在左侧菜单找到 "API Keys" → 创建一个新 key
3. 充值 ¥10（够用很久）

Sign up at [platform.deepseek.com](https://platform.deepseek.com), create an API key, top up ¥10 (lasts a very long time).
</details>

<details>
<summary><b>Q: 我是 Git 新手，对命令行不熟…… / I'm new to Git and CLI...</b></summary>

没关系。你最可能的情况：

1. 打开终端，cd 到你的项目目录
2. 跑 `npx @jiangxiadadao/changelog generate --no-ai`
3. 看到输出了吗？这就是你的第一份 changelog。

不需要 git tag、不需要分支、不需要任何 Git 知识。如果你的 commit message 是中文，AI 也能处理。

No worries, here's your most likely path:
1. Open terminal, cd to your project
2. Run `npx @jiangxiadadao/changelog generate --no-ai`
3. See the output? That's your first changelog.

No git tags, no branches, no Git knowledge needed. Chinese commit messages are fully supported.
</details>

<details>
<summary><b>Q: 怎么创建 Git tag？ / How do I create a Git tag?</b></summary>

```bash
git tag v1.0.0          # 创建 tag / Create tag
git push origin v1.0.0  # 推送到 GitHub / Push to GitHub
```

创建 tag 后，CHANGELOG 可以自动检测版本范围、生成更准确的更新日志。
After tagging, CHANGELOG can auto-detect version ranges for more accurate logs.
</details>

---

## 环境要求 / Requirements

- **Node.js** >= 18
- **Git**（你的项目目录需要是 git 仓库 / your project must be a git repo）
- **DeepSeek / OpenAI / Anthropic API key**（仅 AI 模式需要 / only needed for AI mode）
- **GitHub token**（仅 publish 和 PR 模式需要 / only needed for publish and PR mode）

---

## 链接 / Links

- [GitHub](https://github.com/JIANGXIADADAO/changelog-tool) — 源码、issue、release / Source code, issues, releases
- [npm](https://www.npmjs.com/package/@jiangxiadadao/changelog) — 包页面 / Package page
