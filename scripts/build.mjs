import { copyFile, cp, mkdir } from 'node:fs/promises';

await mkdir('dist/web', { recursive: true });
await mkdir('public/web', { recursive: true });
await mkdir('public/shared', { recursive: true });

await Promise.all(['index.html', 'styles.css', 'styles-cool.css', 'styles-calm.css', 'logo.png', 'favicon.png'].map(file => copyFile(`src/web/${file}`, `dist/web/${file}`)));
await copyFile('src/web/index.html', 'dist/index.html');

await cp('dist/web', 'public/web', { recursive: true });
await copyFile('src/web/index.html', 'public/index.html');
await cp('dist/shared', 'public/shared', { recursive: true });

console.log('Built local server and browser assets.');
