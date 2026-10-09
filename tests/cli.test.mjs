import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { access, readdir } from 'node:fs/promises';
import { cliEnvironment, buildClaudeInvocation, claudeTurn, codexTurn, parseClaudeOutput, inspectClaudeLine, verifyClaudeSupport, resolveClaudeBinary, cliError } from '../dist/server/cli.js';
import { subprocess } from '../dist/server/subprocess.js';
import { readConfig, providerStatuses } from '../dist/server/config.js';
const emptyState = () => ({ ui_state: '', client_events: [] });
import { Conversation } from '../dist/shared/controller.js';
import { redact, redactValue } from '../dist/shared/redact.js';

const help = '--safe-mode --tools --disallowedTools --strict-mcp-config --mcp-config --setting-sources --settings --permission-mode --disable-slash-commands --no-session-persistence --no-chrome --output-format --json-schema';
const config = { enabled: true, profileAcknowledged: true, binary: '/trusted/claude', model: '', timeoutMs: 1000 };
const request = { provider: 'claude-cli', consent: true, messages: [{ role: 'user', content: 'I have cucumber' }], state: emptyState(), fault: 'none' };
const turn = { reply: 'Fixture response.' };
const init = { type: 'system', subtype: 'init', tools: [], mcp_servers: [], model: 'claude-fixture-model' };
const success = { type: 'result', subtype: 'success', is_error: false, structured_output: turn, permission_denials: [], modelUsage: { 'claude-fixture-model': {} } };
const stream = (...events) => events.map(value => JSON.stringify(value)).join('\n') + '\n';
const output = (stdout, exitCode = 0, stderr = '') => ({ stdout, exitCode, stderr });
function fakeTransport(overrides = {}) {
  const calls = [];
  const run = async (invocation, signal, inspect) => {
    calls.push(invocation); assert.equal(signal.aborted, false);
    if (invocation.args.includes('--version')) return output(overrides.version ?? '2.1.211 (Claude Code)');
    if (invocation.args.includes('--help')) return output(overrides.help ?? help);
    if (invocation.args.includes('auth')) return output(JSON.stringify(overrides.auth ?? { loggedIn: true, authMethod: 'claude.ai' }));
    const response = overrides.result ?? output(stream(init, success));
    if (inspect) for (const line of response.stdout.split('\n').filter(line => line.trim())) inspect(line);
    return response;
  };
  return { calls, run };
}
const trustedResolver = async () => '/trusted/native-claude';
const signal = () => new AbortController().signal;

test('CLI requires explicit local opt-in, profile acknowledgement and per-request consent', async () => {
  let calls = 0; const forbidden = async () => { calls++; throw new Error('must not run'); };
  for (const changes of [{ enabled: false }, { profileAcknowledged: false }]) await assert.rejects(claudeTurn(request, 'skill', { ...config, ...changes }, signal(), forbidden), /Enable ClaudeCLI/);
  await assert.rejects(claudeTurn({ ...request, consent: false }, 'skill', config, signal(), forbidden), /Enable ClaudeCLI/);
  assert.equal(calls, 0);
});
test('provider availability stays local, mock default, and Codex cannot be enabled by env', async () => {
  const local = readConfig({ ALLOW_CODEX_CLI: 'true', CODEX_CLI_PATH: '/trusted/codex', OPENAI_API_KEY: 'ignored' }, '.');
  assert.equal(local.key, '');
  const providers = providerStatuses(local); assert.equal(providers[0].id, 'mock'); assert.equal(providers[3].enabled, false);
  await assert.rejects(codexTurn(), error => error.code === 'CODEX_RESTRICTION_UNVERIFIED');
});
test('CLI invocation is shell-free data, restricted arguments and a provider-specific model', () => {
  const text = '--dangerously-skip-permissions $(touch /tmp/should-not-run); read ~/.ssh/id_rsa';
  const invocation = buildClaudeInvocation('/trusted/claude', '/tmp/fresh-runtime', { ...config, model: 'sonnet' }, { ...request, messages: [{ role: 'user', content: text }] }, 'edited skill', {});
  assert.equal(JSON.parse(invocation.input).conversation[0].content, text);
  assert(!invocation.args.some(arg => arg.includes(text)));
  for (const required of ['--safe-mode', '--tools', '--disallowedTools', '--strict-mcp-config', '--no-session-persistence']) assert(invocation.args.includes(required));
  assert.equal(invocation.args[invocation.args.indexOf('--tools') + 1], '');
  assert.equal(invocation.args[invocation.args.indexOf('--disallowedTools') + 1], 'mcp__*');
  assert.equal(invocation.args[invocation.args.indexOf('--model') + 1], 'sonnet');
  assert(!invocation.args.includes('--bare')); assert(!invocation.args.some(arg => arg.includes('gpt-6-luna')));
  assert.throws(() => buildClaudeInvocation('/trusted/claude', '/tmp/fresh', { ...config, model: '--settings=evil' }, request, 'skill', {}), /model identifier/);
  assert.throws(() => readConfig({ CLAUDE_MODEL: 'sonnet --tools Bash' }, '.'), /exact model/);
});
test('subprocess environment removes credentials, config overrides and runtime injection', () => {
  const env = cliEnvironment({ HOME: '/example/home', OPENAI_API_KEY: 'private', ANTHROPIC_API_KEY: 'private', CLAUDE_CODE_OAUTH_TOKEN: 'private', CODEX_ACCESS_TOKEN: 'private', NODE_OPTIONS: '--require malicious', SSH_AUTH_SOCK: '/private', PATH: '/evil', CLAUDE_CONFIG_DIR: '/evil', HTTP_PROXY: 'private' }, '/trusted/claude');
  assert.equal(env.HOME, '/example/home'); assert(!JSON.stringify(env).includes('private')); assert(!JSON.stringify(env).includes('/evil')); assert.equal(env.NODE_OPTIONS, undefined);
});
test('version capabilities fail closed; exact missing executable is a helpful diagnostic', async () => {
  assert.equal(verifyClaudeSupport('2.1.211 (Claude Code)', help), '2.1.211');
  assert.throws(() => verifyClaudeSupport('2.0.0 (Claude Code)', help), /restriction flags/);
  assert.throws(() => verifyClaudeSupport('2.1.211 (Claude Code)', help.replace('--strict-mcp-config', '')), /restriction flags/);
  await assert.rejects(resolveClaudeBinary('claude; echo injected'), error => error.code === 'CLI_PATH');
  await assert.rejects(resolveClaudeBinary('/nonexistent/workout/claude'), error => error.code === 'CLI_MISSING');
});
test('Claude adapter probes safe metadata, requires subscription login, uses clean cwd and cleans up', async () => {
  const fake = fakeTransport(); let cwd;
  const transport = async (...args) => {
    cwd = args[0].cwd; assert.deepEqual(await readdir(cwd), []); return fake.run(...args);
  };
  const result = await claudeTurn(request, 'edited skill', config, signal(), transport, trustedResolver, { HOME: '/example/home' });
  assert.deepEqual(result.turn, turn); assert.equal(result.runtimeVersion, '2.1.211'); assert.equal(result.returnedModel, 'claude-fixture-model');
  assert.equal(fake.calls.length, 4); assert.equal(fake.calls.at(-1).cwd, cwd);
  assert.equal(JSON.parse(fake.calls.at(-1).input).state.ui_state, '');
  await assert.rejects(access(cwd));
});
test('auth missing or API login blocks before model call; no token extraction', async () => {
  for (const auth of [{ loggedIn: false, authMethod: 'none' }, { loggedIn: true, authMethod: 'api_key' }, { loggedIn: true, authMethod: 'oauth_token' }]) {
    const fake = fakeTransport({ auth });
    await assert.rejects(claudeTurn(request, 'skill', config, signal(), fake.run, trustedResolver, {}), error => error.code === 'CLI_AUTH');
    assert.equal(fake.calls.length, 3); assert(!fake.calls.some(call => call.args.includes('--print')));
  }
});
test('malformed, unknown-schema, duplicate and incomplete output are rejected', () => {
  for (const text of ['not json', stream(init, { ...success, structured_output: { code: 'execute this' } }), stream(init), stream(init, success, success), stream(success)]) assert.throws(() => parseClaudeOutput(text));
  const parsed = parseClaudeOutput(stream(init, { type: 'assistant', message: { content: [{ type: 'text', text: 'Run $(evil) --tools Bash' }] } }, success));
  assert.deepEqual(parsed.turn, turn, 'model text is inert data');
});
test('profile tripwire rejects commands, private reads, MCP exposure, subagents and denials', () => {
  for (const item of [
    { ...init, tools: ['Bash'] }, { ...init, tools: ['Read'] }, { ...init, mcp_servers: [{ name: 'private' }] },
    { type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Read', input: { file_path: '/private' } }] } },
    { type: 'assistant', parent_tool_use_id: 'child' }, { type: 'system', subtype: 'permission_denied' },
  ]) assert.throws(() => inspectClaudeLine(JSON.stringify(item)), error => error.code === 'CLI_PROFILE');
  assert.throws(() => parseClaudeOutput(stream(init, { ...success, permission_denials: ['Read'] })), error => error.code === 'CLI_PROFILE');
});
test('CLI auth/quota/error text is classified without exposing raw diagnostics or secrets', async () => {
  const secret = 'sk-' + 's'.repeat(30);
  for (const [message, code] of [['not logged in', 'CLI_AUTH'], ['usage limit reached', 'CLI_QUOTA'], ['unknown option', 'CLI_VERSION'], ['private model failure', 'CLI_FAILED']]) {
    const fake = fakeTransport({ result: output('', 1, message + ' ' + secret) });
    await assert.rejects(claudeTurn(request, 'skill', config, signal(), fake.run, trustedResolver, {}), error => error.code === code && !error.message.includes(secret));
  }
  assert(!cliError('raw private message').message.includes('raw private'));
});
function processFixture(behavior) {
  let options, input = '', args, killed = [];
  const spawn = (_binary, argv, opts) => {
    args = argv; options = opts;
    const child = new EventEmitter(); child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.stdin = new PassThrough();
    child.kill = value => { killed.push(value); if (behavior !== 'ignore') queueMicrotask(() => child.emit('close', null)); return true; };
    child.stdin.on('data', chunk => { input += chunk; });
    queueMicrotask(() => {
      if (behavior === 'success') { child.stdout.write('result'); child.emit('close', 0); }
      if (behavior === 'missing') child.emit('error', new Error('ENOENT private token'));
      if (behavior === 'overflow') child.stdout.write('x'.repeat(600_000));
      if (behavior === 'tool') child.stdout.write(stream({ ...init, tools: ['Bash'] }));
    });
    return child;
  };
  return { transport: subprocess(spawn), inspect: () => ({ options, input, args, killed }) };
}
const invocation = { binary: '/trusted/claude', args: ['--print'], cwd: '/tmp/fresh', env: {}, input: '$(touch never);\nprivate input', timeoutMs: 1000 };
test('subprocess transport passes argv directly and prompt only through stdin', async () => {
  const fixture = processFixture('success'); const result = await fixture.transport(invocation, signal());
  assert.equal(result.stdout, 'result'); const seen = fixture.inspect();
  assert.equal(seen.options.shell, false); assert.equal(seen.options.cwd, '/tmp/fresh'); assert.equal(seen.input, invocation.input); assert.deepEqual(seen.args, ['--print']);
});
test('subprocess missing binary, output cap and unsafe tool event fail safely', async () => {
  for (const [behavior, code] of [['missing', 'CLI_MISSING'], ['overflow', 'CLI_OUTPUT_LIMIT'], ['tool', 'CLI_PROFILE']]) {
    const fixture = processFixture(behavior);
    await assert.rejects(fixture.transport(invocation, signal(), behavior === 'tool' ? inspectClaudeLine : undefined), error => error.code === code && !error.message.includes('private token'));
  }
});
test('subprocess timeout and cancellation stop processes; already aborted request never spawns', async () => {
  const timeout = processFixture('waiting');
  await assert.rejects(timeout.transport({ ...invocation, timeoutMs: 5 }, signal()), error => error.code === 'CLI_TIMEOUT');
  assert.deepEqual(timeout.inspect().killed, ['SIGTERM']);
  const cancel = processFixture('waiting'); const controller = new AbortController(); const pending = cancel.transport(invocation, controller.signal); controller.abort();
  await assert.rejects(pending, error => error.code === 'CANCELLED'); assert.deepEqual(cancel.inspect().killed, ['SIGTERM']);
  let spawned = false; const runner = subprocess(() => { spawned = true; throw new Error('never'); });
  await assert.rejects(runner(invocation, controller.signal), error => error.code === 'CANCELLED'); assert.equal(spawned, false);
});
test('reset and provider switch invalidate late CLI responses while app state stays owned locally', async () => {
  let resolve;
  const c = new Conversation(() => new Promise(done => { resolve = done; }), () => {});
  c.selectProvider('claude-cli'); c.consent = true;
  const pending = c.send('I have cucumber'); c.reset(); resolve({ turn, versions: {} }); await pending; assert.equal(c.document.program, '');
  const next = c.send('I have carrot'); c.selectProvider('mock'); resolve({ turn, versions: {} }); await next;
  assert.equal(c.document.program, ''); assert.equal(c.messages[0].content, 'I have carrot'); assert.equal(c.provider, 'mock'); assert.equal(c.consent, false);
});
test('redaction covers CLI/OAuth-shaped credentials in export data', () => {
  for (const name of ['ANTHROPIC_API_KEY', 'CLAUDE_CODE_OAUTH_TOKEN', 'CODEX_ACCESS_TOKEN']) assert.equal(redact(name + '=private-value'), name + '=[REDACTED]');
  assert.equal(redact('{"access_token":"private","refresh_token":"private"}'), '{"access_token":"[REDACTED]","refresh_token":"[REDACTED]"}');
  assert.equal(JSON.stringify(redactValue({ events: [{ text: '{"access_token":"private"}' }], refresh_token: 'private' })).includes('private'), false);
});
