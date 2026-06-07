// Config management: .changelogrc file
const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_FILENAME = '.changelogrc';
const DEFAULT_CONFIG = {
  llm: {
    provider: 'deepseek',       // deepseek | openai | anthropic
    deepseek: {
      apiKey: '',
      model: 'deepseek-chat',
      baseURL: 'https://api.deepseek.com/v1'
    },
    openai: {
      apiKey: '',
      model: 'gpt-4o-mini'
    },
    anthropic: {
      apiKey: '',
      model: 'claude-sonnet-4-6'
    }
  },
  github: {
    token: ''                   // Personal access token (CLI mode) or OAuth (Web mode)
  },
  output: {
    format: 'keepachangelog',   // keepachangelog | conventional | custom
    file: 'CHANGELOG.md'
  },
  conventionalCommits: {
    enabled: true,              // Auto-detect and use CC types
    enhanceWithAI: true         // Use AI to enhance CC summaries
  }
};

function configPath() {
  // Project-local config takes precedence, then home directory
  const local = path.join(process.cwd(), CONFIG_FILENAME);
  if (fs.existsSync(local)) return local;
  return path.join(os.homedir(), CONFIG_FILENAME);
}

function load() {
  const p = configPath();
  if (!fs.existsSync(p)) return { ...DEFAULT_CONFIG };

  try {
    const user = JSON.parse(fs.readFileSync(p, 'utf-8'));
    return deepMerge(DEFAULT_CONFIG, user);
  } catch (e) {
    console.error(`Warning: Failed to parse ${p}, using defaults.`);
    return { ...DEFAULT_CONFIG };
  }
}

function save(config) {
  const p = path.join(process.cwd(), CONFIG_FILENAME);
  fs.writeFileSync(p, JSON.stringify(config, null, 2));
}

function init() {
  const p = path.join(process.cwd(), CONFIG_FILENAME);
  if (fs.existsSync(p)) {
    console.log(`${CONFIG_FILENAME} already exists.`);
    return false;
  }
  save(DEFAULT_CONFIG);
  console.log(`Created ${CONFIG_FILENAME}`);
  return true;
}

function deepMerge(base, overlay) {
  const result = { ...base };
  for (const key of Object.keys(overlay)) {
    if (overlay[key] && typeof overlay[key] === 'object' && !Array.isArray(overlay[key])) {
      result[key] = deepMerge(base[key] || {}, overlay[key]);
    } else {
      result[key] = overlay[key];
    }
  }
  return result;
}

module.exports = { load, save, init, configPath, DEFAULT_CONFIG };
