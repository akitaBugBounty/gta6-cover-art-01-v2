// Neon Coast Cover Lab — tiny static dev server. Serves app/ on
// http://localhost:8080 so the cover editor can be tried and screenshotted
// locally. Node standard library only; never serves paths outside app/.

import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve, extname, normalize } from 'node:path';

const ROOT = resolve(import.meta.dirname, 'app');
const PORT = parseInt(process.env.PORT || '8080', 10);

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
};

const server = createServer((req, res) => {
  const raw = decodeURIComponent(req.url?.split('?')[0] || '/');
  const rel = raw === '/' ? 'index.html' : raw.replace(/^\/+/, '');
  const path = resolve(ROOT, normalize(rel));
  // Refuse anything that escapes app/ (no ../, no absolute paths).
  if (!path.startsWith(ROOT + '/') && path !== ROOT) {
    res.writeHead(403, { 'content-type': 'text/plain' });
    res.end('forbidden\n');
    return;
  }
  if (!existsSync(path) || !statSync(path).isFile()) {
    console.log(`404 ${raw}`);
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found\n');
    return;
  }
  const type = MIME[extname(path).toLowerCase()] || 'application/octet-stream';
  // Dev server: never cache HTML/JS, so edits show up on reload.
  const headers: Record<string, string> = { 'content-type': type };
  if (type.startsWith('text/html') || type.startsWith('text/javascript') || type.startsWith('text/css')) {
    headers['cache-control'] = 'no-store';
  }
  res.writeHead(200, headers);
  res.end(readFileSync(path));
});

server.listen(PORT, () => {
  console.log(`Neon Coast Cover Lab at http://localhost:${PORT}/`);
});
