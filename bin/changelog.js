#!/usr/bin/env node
// CLI entry point: changelog command
const { Command } = require('commander');
const generator = require('../lib/generator');
const git = require('../lib/git');
const config = require('../lib/config');
const path = require('path');

const program = new Command();

program
  .name('changelog')
  .description('AI-powered CHANGELOG generator — DeepSeek + OpenAI + Anthropic')
  .version('0.1.0');

// changelog init
program.command('init')
  .description('Initialize .changelogrc in the current directory')
  .action(() => {
    config.init();
  });

// changelog generate
program.command('generate')
  .description('Generate CHANGELOG from git history')
  .option('--from <tag>', 'Starting tag/commit')
  .option('--to <tag>', 'Ending tag/commit (default: HEAD)', 'HEAD')
  .option('--owner <owner>', 'GitHub repo owner (for PR data)')
  .option('--repo <repo>', 'GitHub repo name (for PR data)')
  .option('--format <format>', 'Output format: md | json', 'md')
  .option('--dry-run', 'Preview only, do not write to file')
  .option('--no-ai', 'Skip AI, use rule-based classification')
  .action(async (opts) => {
    try {
      let fromTag = opts.from;
      if (!fromTag) {
        fromTag = await git.getLatestTag();
        if (fromTag) {
          console.log(`Auto-detected latest tag: ${fromTag}`);
        } else {
          // No tags — fall back to first commit
          fromTag = await git.getFirstCommit();
          if (fromTag) {
            console.log(`No tags found. Using first commit: ${fromTag.substring(0, 7)}`);
          } else {
            console.error('No git history found in this directory.');
            process.exit(1);
          }
        }
      }

      console.log(`Scanning changes from ${fromTag} to ${opts.to}...`);

      const result = await generator.generate({
        fromTag,
        toTag: opts.to,
        owner: opts.owner,
        repo: opts.repo,
        dir: process.cwd(),
        useAI: opts.ai
      });

      if (opts.format === 'json') {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log('\n' + '─'.repeat(60));
        console.log(result.markdown);
        console.log('─'.repeat(60));
        console.log(`\nStats: ${result.stats.commits} commits, ${result.stats.prs} PRs, AI: ${result.stats.usedAI}`);
      }

      if (!opts.dryRun) {
        const fs = require('fs');
        const outFile = path.join(process.cwd(), '.changelog', 'preview.md');
        fs.mkdirSync(path.dirname(outFile), { recursive: true });
        fs.writeFileSync(outFile, result.markdown);
        console.log(`\nPreview saved to ${outFile}`);
        console.log('Run `changelog publish` to push to GitHub Release.');
      }
    } catch (e) {
      console.error(`Error: ${e.message}`);
      process.exit(1);
    }
  });

// changelog publish
program.command('publish')
  .description('Publish generated CHANGELOG as a GitHub Release')
  .option('--owner <owner>', 'GitHub repo owner')
  .option('--repo <repo>', 'GitHub repo name')
  .option('--tag <tag>', 'Release tag name')
  .option('--draft', 'Create as draft release')
  .action(async (opts) => {
    try {
      const fs = require('fs');
      const previewPath = path.join(process.cwd(), '.changelog', 'preview.md');

      if (!fs.existsSync(previewPath)) {
        console.error('No preview found. Run `changelog generate` first.');
        process.exit(1);
      }

      const markdown = fs.readFileSync(previewPath, 'utf-8');
      const tagName = opts.tag || 'Unreleased';

      // Auto-detect owner/repo from git remote
      let owner = opts.owner;
      let repo = opts.repo;
      if (!owner || !repo) {
        const simpleGit = require('simple-git');
        const remotes = await simpleGit(process.cwd()).getRemotes(true);
        const origin = remotes.find(r => r.name === 'origin');
        if (origin && origin.refs?.fetch) {
          const match = origin.refs.fetch.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
          if (match) {
            owner = owner || match[1];
            repo = repo || match[2];
          }
        }
      }

      if (!owner || !repo) {
        console.error('Could not detect GitHub repo. Use --owner and --repo options.');
        process.exit(1);
      }

      console.log(`Publishing ${tagName} to ${owner}/${repo}...`);
      const url = await generator.publish({ owner, repo, tagName, markdown, draft: opts.draft });
      console.log(`Published: ${url}`);
    } catch (e) {
      console.error(`Error: ${e.message}`);
      process.exit(1);
    }
  });

// changelog serve
program.command('serve')
  .description('Start the Web Dashboard')
  .option('--port <port>', 'Port to listen on', '3000')
  .action(async (opts) => {
    try {
      // Lazy-load web server
      const server = require('../web/server');
      await server.start(parseInt(opts.port));
    } catch (e) {
      console.error(`Error starting server: ${e.message}`);
      process.exit(1);
    }
  });

// changelog status
program.command('status')
  .description('Show current configuration')
  .action(async () => {
    const cfg = config.load();
    const p = config.configPath();
    console.log(`Config: ${p}`);
    console.log(`LLM Provider: ${cfg.llm.provider}`);
    console.log(`LLM Key set: ${!!cfg.llm[cfg.llm.provider]?.apiKey}`);
    console.log(`GitHub Token set: ${!!cfg.github.token}`);

    try {
      const tags = await git.getTags();
      console.log(`Tags found: ${tags.length > 0 ? tags.slice(0, 5).join(', ') + (tags.length > 5 ? '...' : '') : 'none'}`);
    } catch (e) {
      console.log('Tags: (not a git repository or no tags)');
    }
  });

// changelog config
const configCmd = program.command('config')
  .description('Manage configuration');

configCmd.command('set <key> <value>')
  .description('Set a config value (e.g., llm.deepseek.apiKey sk-xxx)')
  .action((key, value) => {
    const cfg = config.load();
    const keys = key.split('.');
    let target = cfg;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!target[keys[i]]) target[keys[i]] = {};
      target = target[keys[i]];
    }
    target[keys[keys.length - 1]] = value;
    config.save(cfg);
    console.log(`Set ${key} = ${value.substring(0, 8)}...`);
  });

configCmd.command('show')
  .description('Show current configuration (masked)')
  .action(() => {
    const cfg = config.load();
    const masked = JSON.parse(JSON.stringify(cfg));
    if (masked.llm?.deepseek?.apiKey) masked.llm.deepseek.apiKey = '***';
    if (masked.llm?.openai?.apiKey) masked.llm.openai.apiKey = '***';
    if (masked.llm?.anthropic?.apiKey) masked.llm.anthropic.apiKey = '***';
    if (masked.github?.token) masked.github.token = '***';
    console.log(JSON.stringify(masked, null, 2));
  });

program.parse();
