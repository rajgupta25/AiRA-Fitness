import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
let failures = 0;
async function walk(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const file = join(path, entry.name);
    if (entry.isDirectory()) { await walk(file); continue; }
    if (!/\.(ts|css|html)$/.test(file)) continue;
    const source = await readFile(file, 'utf8');
    const banned = [/\beval\s*\(/, /new Function\s*\(/, /\.innerHTML\s*=/, /\.outerHTML\s*=/, /document\.write\s*\(/, /getUserMedia/, /speechSynthesis/, /new Audio\s*\(/];
    for (const pattern of banned) if (pattern.test(source)) { console.error(`${file}: unsafe or out-of-scope API: ${pattern}`); failures++; }
    if (file.includes('/web/') && /OPENAI_API_KEY|process\.env/.test(source)) { console.error(`${file}: server environment referenced in browser code`); failures++; }
    if (/\s+$/.test(source.trimEnd().split('\n').find(line => /[\t ]+$/.test(line)) ?? '')) { console.error(`${file}: trailing whitespace`); failures++; }
  }
}
await walk('src');
if (failures) process.exitCode = 1;
else console.log('Static safety lint passed (no dynamic code/HTML, audio APIs, browser env access, or trailing whitespace).');
