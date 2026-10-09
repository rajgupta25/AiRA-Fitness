import { createRequestHandler, readConfig } from '../dist/server/app.js';

let cachedHandler;

function getHandler() {
  if (!cachedHandler) {
    const root = process.cwd();
    const config = readConfig(process.env, root);
    cachedHandler = createRequestHandler(config);
  }
  return cachedHandler;
}

export default async function handler(req, res) {
  const handle = getHandler();
  await handle(req, res);
}
