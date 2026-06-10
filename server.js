const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.mp3': 'audio/mpeg',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // Decode URL in case of spaces and symbols (like in audio filenames)
  let safeUrl = decodeURIComponent(req.url);
  
  // Strip query strings
  const qIndex = safeUrl.indexOf('?');
  if (qIndex !== -1) {
    safeUrl = safeUrl.substring(0, qIndex);
  }

  // Map '/' to '/index.html'
  let filePath = path.join(PUBLIC_DIR, safeUrl === '/' ? '/index.html' : safeUrl);

  // Security check: ensure path is within PUBLIC_DIR
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Access Denied');
    return;
  }

  // Check if file exists
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain');
      res.end('File Not Found');
      return;
    }

    // Determine content type
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Set headers
    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes'); // Crucial for audio seeking in Safari/Chrome!

    // Handle range requests for audio seeking
    const range = req.headers.range;
    if (range && ext === '.mp3') {
      const totalSize = stats.size;
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

      if (start >= totalSize || end >= totalSize) {
        res.statusCode = 416;
        res.setHeader('Content-Range', `bytes */${totalSize}`);
        res.end();
        return;
      }

      res.statusCode = 206; // Partial content
      res.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
      res.setHeader('Content-Length', (end - start) + 1);

      const stream = fs.createReadStream(filePath, { start, end });
      stream.on('error', (streamErr) => {
        console.error('Stream error:', streamErr);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.end();
        }
      });
      stream.pipe(res);
    } else {
      // Regular file serving
      res.setHeader('Content-Length', stats.size);
      const stream = fs.createReadStream(filePath);
      stream.on('error', (streamErr) => {
        console.error('Stream error:', streamErr);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.end();
        }
      });
      stream.pipe(res);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server is running at: http://localhost:${PORT}/`);
  console.log(`Local static Quran files and cloud links are now ready to preview!`);
});
