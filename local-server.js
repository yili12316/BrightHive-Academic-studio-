const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
// Keep the previously used port for OAuth allow-lists, then fall back safely
// if another process already owns it.
const port = Number(process.env.GSA_PORT || 7892);
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8'
};

const reportReady = function () {
  const address = this.address();
  console.log(`BrightHive Academic Studio is running at http://127.0.0.1:${address.port}/`);
};

const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
  // Recover from users pasting the Supabase wildcard allow-list into the address bar.
  if (pathname === '/**') {
    response.writeHead(302, { Location: '/index.html', 'Cache-Control': 'no-store' });
    response.end();
    return;
  }
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const file = path.resolve(root, relative);
  if (file !== root && !file.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }
  fs.readFile(file, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }
    response.writeHead(200, {
      'Content-Type': contentTypes[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    response.end(data);
  });
});

server.on('listening', reportReady);
server.on('error', error => {
  if (error.code === 'EADDRINUSE' && server.address() === null) {
    console.warn(`Port ${port} is already in use; selecting an available local port.`);
    server.listen(0, '127.0.0.1');
    return;
  }
  console.error(`BrightHive Academic Studio could not start: ${error.message}`);
  process.exitCode = 1;
});

server.listen(port, '127.0.0.1');



