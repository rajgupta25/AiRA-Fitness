import { fileURLToPath } from 'node:url';
import { createApp, readConfig } from './app.js';
const root = fileURLToPath(new URL('../../', import.meta.url));
try {
  const config = readConfig(process.env, root);
  const port = Number(process.env.PORT || 4319);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('PORT must be an integer from 1024 to 65535.');
  const server = createApp(config);
  server.on('error', () => { console.error('Could not start the local server. Try another PORT.'); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`Workout canvas: http://127.0.0.1:${port} · starts in mock mode`));
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Invalid local configuration.'); process.exitCode = 1;
}
