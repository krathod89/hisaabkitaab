/**
 * Minimal static server for the exported web build (dist/).
 *
 * Sends the cross-origin-isolation headers (COOP/COEP) that expo-sqlite's
 * synchronous web build needs for SharedArrayBuffer, sets correct MIME types
 * (notably application/wasm), and falls back to index.html for client-side
 * expo-router routes. Bind 0.0.0.0 so a tunnel/LAN can reach it.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, 'dist');
const PORT = process.env.PORT || 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

function send(res, status, body, type) {
  // Cross-origin isolation → enables SharedArrayBuffer (expo-sqlite sync web).
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  if (type) res.setHeader('Content-Type', type);
  res.writeHead(status);
  res.end(body);
}

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  let filePath = path.join(ROOT, urlPath);

  // Prevent path traversal.
  if (!filePath.startsWith(ROOT)) return send(res, 403, 'Forbidden', 'text/plain');

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      // SPA fallback for expo-router client routes.
      filePath = path.join(ROOT, 'index.html');
    }
    fs.readFile(filePath, (rErr, data) => {
      if (rErr) return send(res, 404, 'Not found', 'text/plain');
      send(res, 200, data, MIME[path.extname(filePath)] || 'application/octet-stream');
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`HisaabKitaab web build serving on http://localhost:${PORT} (cross-origin isolated)`);
});
