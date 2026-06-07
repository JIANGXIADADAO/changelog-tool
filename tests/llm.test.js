// llm.test.js — LLM client tests
// Source: designer→builder.md §技术栈 (DeepSeek primary), §非功能需求 (fallback)

const { describe, it } = require('node:test');
const assert = require('node:assert');
const llm = require('../lib/llm');

describe('getProvider()', () => {
  // DB §技术栈: DeepSeek is the default provider
  it('should return deepseek provider by default', () => {
    const config = {
      llm: {
        provider: 'deepseek',
        deepseek: { apiKey: 'test', model: 'deepseek-chat' },
        openai: { apiKey: '' },
        anthropic: { apiKey: '' }
      }
    };
    const provider = llm.getProvider(config);
    assert.strictEqual(provider.name, 'DeepSeek');
  });

  it('should return openai provider when configured', () => {
    const config = {
      llm: {
        provider: 'openai',
        deepseek: { apiKey: '' },
        openai: { apiKey: 'test', model: 'gpt-4o-mini' },
        anthropic: { apiKey: '' }
      }
    };
    const provider = llm.getProvider(config);
    assert.strictEqual(provider.name, 'OpenAI');
  });

  // DB §技术栈: Three providers supported
  it('should support all three providers', () => {
    assert.ok(llm.PROVIDERS.deepseek, 'Should have deepseek');
    assert.ok(llm.PROVIDERS.openai, 'Should have openai');
    assert.ok(llm.PROVIDERS.anthropic, 'Should have anthropic');
  });

  // DB §非功能需求: Unknown provider throws clear error
  it('should throw for unknown provider', () => {
    const config = { llm: { provider: 'unknown' } };
    assert.throws(() => llm.getProvider(config), /Unknown LLM provider/);
  });
});

describe('classifyWithRules()', () => {
  // DB §非功能需求: Fallback output is valid markdown
  it('should return valid markdown string', async () => {
    const result = await llm.classifyWithRules([]);
    assert.strictEqual(typeof result, 'string');
    assert.ok(result.startsWith('## [Unreleased]'));
  });

  // DB §组件规格: PR numbers preserved as links
  it('should include PR numbers in output', async () => {
    const prs = [{ number: 123, title: 'Test PR', body: '', labels: [], user: 'dev', html_url: '' }];
    const result = await llm.classifyWithRules(prs);
    assert.ok(result.includes('#123'), 'Should include PR number');
  });

  // DB §F001: CC prefixes recognized: feat:, fix:, feat(scope):
  it('should recognize feat: prefix', async () => {
    const prs = [{ number: 1, title: 'feat(auth): Add OAuth', body: '', labels: [], user: 'dev', html_url: '' }];
    const result = await llm.classifyWithRules(prs);
    assert.ok(result.includes('### Added'), 'feat: → Added');
  });

  it('should recognize fix: prefix', async () => {
    const prs = [{ number: 2, title: 'fix(login): Handle null session', body: '', labels: [], user: 'dev', html_url: '' }];
    const result = await llm.classifyWithRules(prs);
    assert.ok(result.includes('### Fixed'), 'fix: → Fixed');
  });

  // DB §组件规格: Labels take priority over title prefixes
  it('should use labels over title when both present', async () => {
    const prs = [{ number: 3, title: 'fix: Something', body: '', labels: ['feature'], user: 'dev', html_url: '' }];
    const result = await llm.classifyWithRules(prs);
    // Label 'feature' checked first → Added
    assert.ok(result.includes('### Added'), 'Label should take priority');
  });
});
