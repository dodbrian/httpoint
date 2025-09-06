#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    port: process.env.HTTPOINT_PORT || 3000,
    root: process.env.HTTPOINT_ROOT || process.cwd()
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' && args[i + 1]) {
      config.port = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--path' && args[i + 1]) {
      config.root = path.resolve(args[i + 1]);
      i++;
    }
  }

  return config;
}

// Get MIME type based on file extension
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain',
    '.pdf': 'application/pdf',
    '.zip': 'application/zip'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

// Generate directory listing HTML
function generateDirectoryListing(dirPath, requestPath, rootPath) {
  const files = fs.readdirSync(dirPath);
  const items = [];

  // Add parent directory link if not at root
  if (requestPath !== '/') {
    const parentPath = path.dirname(requestPath);
    const parentHref = parentPath === '/' ? '/' : parentPath;
    items.push(`<li><a href="${parentHref}">📁 ../</a></li>`);
  }

  // Sort files and directories
  const directories = [];
  const regularFiles = [];

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    const encodedFile = encodeURIComponent(file);
    const href = path.posix.join(requestPath, encodedFile);

    if (stat.isDirectory()) {
      directories.push(`<li><a href="${href}/">📁 ${file}/</a></li>`);
    } else {
      const size = (stat.size / 1024).toFixed(1);
      regularFiles.push(`<li><a href="${href}">📄 ${file}</a> <span style="color: #666;">(${size} KB)</span></li>`);
    }
  });

  const allItems = [...items, ...directories, ...regularFiles];

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Directory listing for ${requestPath}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #333; }
        ul { list-style: none; padding: 0; }
        li { margin: 8px 0; }
        a { text-decoration: none; color: #0066cc; }
        a:hover { text-decoration: underline; }
        .header { border-bottom: 1px solid #ccc; padding-bottom: 10px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Directory listing for ${requestPath}</h1>
    </div>
    <ul>
        ${allItems.join('\n        ')}
    </ul>
</body>
</html>`;
}

// Create HTTP server
function createServer(config) {
  const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const requestPath = decodeURIComponent(parsedUrl.pathname);
    const filePath = path.join(config.root, requestPath);

    // Log request
    console.log(`${req.method} ${requestPath} ${res.statusCode || '...'}`);

    // Security check - prevent directory traversal
    if (!filePath.startsWith(config.root)) {
      res.statusCode = 403;
      res.end('Forbidden');
      console.log(`${req.method} ${requestPath} 403`);
      return;
    }

    fs.stat(filePath, (err, stats) => {
      if (err) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain');
        res.end('404 Not Found');
        console.log(`${req.method} ${requestPath} 404`);
        return;
      }

      if (stats.isDirectory()) {
        try {
          const html = generateDirectoryListing(filePath, requestPath, config.root);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/html');
          res.end(html);
          console.log(`${req.method} ${requestPath} 200`);
        } catch (dirErr) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'text/plain');
          res.end('Internal Server Error');
          console.log(`${req.method} ${requestPath} 500`);
        }
      } else {
        // Serve file
        const mimeType = getMimeType(filePath);
        res.setHeader('Content-Type', mimeType);

        const readStream = fs.createReadStream(filePath);
        readStream.on('error', () => {
          res.statusCode = 500;
          res.end('Internal Server Error');
          console.log(`${req.method} ${requestPath} 500`);
        });

        readStream.on('open', () => {
          res.statusCode = 200;
          console.log(`${req.method} ${requestPath} 200`);
        });

        readStream.pipe(res);
      }
    });
  });

  return server;
}

// Main function
function main() {
  const config = parseArgs();

  // Validate root directory
  if (!fs.existsSync(config.root)) {
    console.error(`Error: Directory '${config.root}' does not exist`);
    process.exit(1);
  }

  const server = createServer(config);

  server.listen(config.port, '0.0.0.0', () => {
    // Get local IP address
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    let localIP = 'localhost';

    // Find the first non-internal IPv4 address
    for (const interfaceName in networkInterfaces) {
      const addresses = networkInterfaces[interfaceName];
      for (const address of addresses) {
        if (address.family === 'IPv4' && !address.internal) {
          localIP = address.address;
          break;
        }
      }
      if (localIP !== 'localhost') break;
    }

    console.log(`HTTPoint server running on:`);
    console.log(`  Local:   http://localhost:${config.port}/`);
    console.log(`  Network: http://${localIP}:${config.port}/`);
    console.log(`  Root:    ${config.root}`);
    console.log('');
    console.log('Press Ctrl+C to stop the server');
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    server.close(() => {
      console.log('Server stopped');
      process.exit(0);
    });
  });
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { createServer, parseArgs };
