import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { existsSync } from 'node:fs';
import { createRequestHandler, readConfig } from '../dist/server/app.js';

let cachedHandler;

function findRoot() {
  const candidates = [
    process.cwd(),
    resolve(dirname(fileURLToPath(import.meta.url)), '..'),
    resolve(process.cwd(), '..'),
  ];
  for (const dir of candidates) {
    if (existsSync(join(dir, 'skills/workout.md'))) return dir;
  }
  return process.cwd();
}

function getHandler() {
  if (!cachedHandler) {
    const root = findRoot();
    const config = readConfig(process.env, root);
    cachedHandler = createRequestHandler(config);
  }
  return cachedHandler;
}

export default async function handler(req, res) {
  const handle = getHandler();
  await handle(req, res);
}
