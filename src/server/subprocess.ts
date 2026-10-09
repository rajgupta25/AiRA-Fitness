import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { PublicError } from './provider.js';

export type Invocation = { binary: string; args: string[]; cwd: string; env: NodeJS.ProcessEnv; input: string; timeoutMs: number };
export type ProcessResult = { stdout: string; stderr: string; exitCode: number | null };
type SpawnOptions = { cwd: string; env: NodeJS.ProcessEnv; shell: false; detached: boolean; stdio: ['pipe', 'pipe', 'pipe'] };
export type SpawnProcess = (binary: string, args: string[], options: SpawnOptions) => ChildProcessWithoutNullStreams;
export type ProcessTransport = (invocation: Invocation, signal: AbortSignal, inspectLine?: (line: string) => void) => Promise<ProcessResult>;

const nativeSpawn: SpawnProcess = (binary, args, options) => spawn(binary, args, options);
// No shell expansion, no prompt in argv, bounded output, and a fresh process group.
export function subprocess(spawnProcess: SpawnProcess = nativeSpawn): ProcessTransport {
  return (invocation, signal, inspectLine) => new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new PublicError('CANCELLED', 'Reply cancelled.', 408)); return; }
    let child: ChildProcessWithoutNullStreams;
    try { child = spawnProcess(invocation.binary, invocation.args, { cwd: invocation.cwd, env: invocation.env, shell: false, detached: process.platform !== 'win32', stdio: ['pipe', 'pipe', 'pipe'] }); }
    catch { reject(new PublicError('CLI_MISSING', 'The configured CLI could not start. Check its absolute path and installation.', 503)); return; }
    let stdout = '', stderr = '', partial = '', size = 0, failure: PublicError | undefined;
    let forceTimer: ReturnType<typeof setTimeout> | undefined;
    let settled = false;
    const kill = (hard = false) => {
      const value = hard ? 'SIGKILL' : 'SIGTERM';
      try {
        if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, value);
        else child.kill(value);
      } catch { try { child.kill(value); } catch { /* Already exited. */ } }
    };
    const fail = (error: PublicError) => {
      if (failure || settled) return;
      failure = error; kill();
      forceTimer = setTimeout(() => { kill(true); finish(); }, 500);
    };
    const abort = () => fail(new PublicError('CANCELLED', 'Reply cancelled. The CLI process was stopped.', 408));
    const timer = setTimeout(() => fail(new PublicError('CLI_TIMEOUT', 'The CLI timed out and was stopped. Retry when you are ready.', 408)), invocation.timeoutMs);
    const finish = (exitCode: number | null = null) => {
      if (settled) return; settled = true;
      clearTimeout(timer); clearTimeout(forceTimer); signal.removeEventListener('abort', abort);
      if (failure) reject(failure); else resolve({ stdout, stderr, exitCode });
    };
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      if (failure) return;
      size += Buffer.byteLength(chunk);
      if (size > 512_000) { fail(new PublicError('CLI_OUTPUT_LIMIT', 'The CLI returned too much output. Retry a shorter request.')); return; }
      stdout += chunk;
      if (inspectLine) {
        partial += chunk; const lines = partial.split('\n'); partial = lines.pop() ?? '';
        try { for (const line of lines) if (line.trim()) inspectLine(line); }
        catch (error) { fail(error instanceof PublicError ? error : new PublicError('CLI_SCHEMA', 'The CLI stream was invalid.')); }
      }
    });
    child.stderr.on('data', (chunk: string) => {
      size += Buffer.byteLength(chunk);
      if (size > 512_000) fail(new PublicError('CLI_OUTPUT_LIMIT', 'The CLI returned too much output.'));
      else stderr += chunk;
    });
    child.on('error', () => { failure = new PublicError('CLI_MISSING', 'The configured CLI could not start. Check its absolute path and installation.', 503); finish(); });
    child.on('close', (code: number | null) => {
      if (!failure && inspectLine && partial.trim()) {
        try { inspectLine(partial); } catch (error) { failure = error instanceof PublicError ? error : new PublicError('CLI_SCHEMA', 'The CLI stream was invalid.'); }
      }
      finish(code);
    });
    child.stdin.on('error', () => { /* Exit/error events handle early process shutdown; never log the prompt. */ });
    child.stdin.end(invocation.input);
  });
}
export const runProcess = subprocess();
