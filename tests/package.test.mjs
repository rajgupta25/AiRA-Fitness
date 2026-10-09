import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { collect, zip } from '../scripts/package.mjs';
test('submission export allowlist excludes environment, dependencies and history', async t => {
  const root = await mkdtemp(join(tmpdir(), 'workout-package-')); t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'src')); await mkdir(join(root, 'node_modules')); await mkdir(join(root, '.git'));
  await writeFile(join(root, '.env'), 'PRIVATE_VALUE=do-not-export');
  await writeFile(join(root, 'src/app.ts'), 'export const hello = 1;');
  await writeFile(join(root, '.env.example'), 'OPENAI_API_KEY=\n');
  const files = await collect(root);
  assert.deepEqual(files.map(f => f.path), ['.env.example', 'src/app.ts']);
  const archive = zip(files); assert(!archive.includes(Buffer.from('do-not-export'))); assert.equal(archive.readUInt32LE(0), 0x04034b50);
});
test('submission export rejects symlinks and known credential patterns', async t => {
  const root = await mkdtemp(join(tmpdir(), 'workout-package-')); t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'src')); await writeFile(join(root, 'src/app.ts'), 'const key="sk-' + 'x'.repeat(30) + '";');
  await assert.rejects(collect(root), /Possible credential/);
  await rm(join(root, 'src/app.ts')); await symlink('/etc/passwd', join(root, 'src/app.ts'));
  await assert.rejects(collect(root), /symbolic link/);
});
test('submission export rejects a CLI credential assignment in candidate source', async t => {
  const root = await mkdtemp(join(tmpdir(), 'workout-package-')); t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'src')); await writeFile(join(root, 'src/app.ts'), 'CLAUDE_CODE_OAUTH_TOKEN' + '=do-not-export');
  await assert.rejects(collect(root), /Possible secret assignment/);
});
