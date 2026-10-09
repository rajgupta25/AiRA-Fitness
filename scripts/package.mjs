import { readdir, readFile, writeFile, mkdir, lstat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const roots = ['src', 'skills', 'tests', 'scripts', 'docs', 'runs', 'evidence', 'prompts', 'examples'];
const topFiles = ['README.md', 'AGENTS.md', 'package.json', 'package-lock.json', 'tsconfig.json', 'playwright.config.mjs', '.env.example', '.gitignore', '.starter-baseline.json'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export async function collect(root) {
  const files = [];
  async function visit(relative) {
    const path = join(root, relative); let stat;
    try { stat = await lstat(path); } catch (error) { if (error.code === 'ENOENT') return; throw error; }
    if (stat.isSymbolicLink()) throw new Error(`Refusing symbolic link: ${relative}`);
    if (stat.isDirectory()) {
      for (const name of (await readdir(path)).sort()) {
        if (name.startsWith('.') || /^(node_modules|dist|output|test-results|playwright-report)$/.test(name)) continue;
        await visit(`${relative}/${name}`);
      }
      return;
    }
    if (stat.size > 2_000_000) throw new Error(`File too large for a small submission: ${relative}`);
    if (!topFiles.includes(relative) && !/\.(ts|mjs|js|html|css|md|json|png|openui)$/.test(relative)) return;
    if (/(?:^|\/)(?:credentials?|secrets?)(?:\.|\/|$)/i.test(relative)) throw new Error(`Do not submit credentials: ${relative}`);
    const bytes = await readFile(path);
    if (!relative.endsWith('.png')) {
      const text = bytes.toString('utf8');
      if (/sk-[a-zA-Z0-9_-]{16,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bBearer [a-zA-Z0-9._-]{24,}/.test(text)) throw new Error(`Possible credential in ${relative}. Remove it before packaging.`);
      if (/^[ \t]*(?:OPENAI_API_KEY|ANTHROPIC_API_KEY|CLAUDE_CODE_OAUTH_TOKEN|CODEX_ACCESS_TOKEN|API_KEY|TOKEN|PASSWORD)[ \t]*=[ \t]*[^\s#]/m.test(text)) throw new Error(`Possible secret assignment in ${relative}. Remove it before packaging.`);
    }
    files.push({ path: relative, bytes, sha256: hash(bytes) });
  }
  for (const file of topFiles) await visit(file);
  for (const directory of roots) await visit(directory);
  return files.sort((a, b) => a.path.localeCompare(b.path));
}
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let n = 0; n < 8; n++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}
// ZIP store entries: portable, deterministic, no external archiver or lifecycle scripts.
export function zip(files) {
  const locals = [], entries = []; let offset = 0;
  for (const file of files) {
    const name = Buffer.from(`workout-starter/${file.path}`); const checksum = crc32(file.bytes);
    const header = Buffer.alloc(30); header.writeUInt32LE(0x04034b50); header.writeUInt16LE(20, 4); header.writeUInt16LE(0x800, 6);
    header.writeUInt16LE(33, 12); header.writeUInt32LE(checksum, 14); header.writeUInt32LE(file.bytes.length, 18); header.writeUInt32LE(file.bytes.length, 22); header.writeUInt16LE(name.length, 26);
    const entry = Buffer.alloc(46); entry.writeUInt32LE(0x02014b50); entry.writeUInt16LE(20, 4); entry.writeUInt16LE(20, 6); entry.writeUInt16LE(0x800, 8); entry.writeUInt16LE(33, 14);
    entry.writeUInt32LE(checksum, 16); entry.writeUInt32LE(file.bytes.length, 20); entry.writeUInt32LE(file.bytes.length, 24); entry.writeUInt16LE(name.length, 28); entry.writeUInt32LE(offset, 42);
    locals.push(header, name, file.bytes); entries.push(entry, name); offset += header.length + name.length + file.bytes.length;
  }
  const directory = Buffer.concat(entries), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}
export async function packageSource(root) {
  const files = await collect(root);
  const pkg = JSON.parse((files.find(f => f.path === 'package.json')?.bytes ?? '{}').toString());
  let baseline = {};
  try { baseline = JSON.parse(await readFile(join(root, '.starter-baseline.json'), 'utf8')); } catch { /* A missing baseline is explicit in the manifest. */ }
  const hashes = Object.fromEntries(files.filter(f => f.path !== '.starter-baseline.json').map(f => [f.path, f.sha256]));
  const changes = [...new Set([...Object.keys(baseline), ...Object.keys(hashes)])].filter(path => baseline[path] !== hashes[path]).map(path => ({ path, status: !hashes[path] ? 'deleted' : !baseline[path] ? 'added' : 'modified' }));
  const manifest = { format: 'workout-source-v1', appVersion: pkg.version, baselinePresent: Object.keys(baseline).length > 0,
    changedFiles: changes, skillHash: hashes['skills/workout.md'], files: hashes,
    runFiles: files.filter(f => f.path.startsWith('runs/') && f.path.endsWith('.json')).map(f => f.path),
    note: 'Credentials, .env, dependencies, build caches and repository history are excluded. Inspect this archive before sharing. Run model/config versions are in runs/*.json.' };
  files.push({ path: 'submission-manifest.json', bytes: Buffer.from(JSON.stringify(manifest, null, 2)) });
  const out = join(root, 'output'); await mkdir(out, { recursive: true });
  const bytes = zip(files); const archive = join(out, 'workout-source.zip'); await writeFile(archive, bytes);
  await writeFile(join(out, 'submission-manifest.json'), JSON.stringify(manifest, null, 2));
  await writeFile(join(out, 'SHA256.txt'), `${hash(bytes)}  workout-source.zip\n`);
  return { archive, size: bytes.length, changedFiles: changes.length, runFiles: manifest.runFiles.length };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(await packageSource(process.cwd())); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
