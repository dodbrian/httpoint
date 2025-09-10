#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Print help information
function printHelp() {
  console.log('HTTPoint - Simple HTTP file server');
  console.log('');
  console.log('Usage:');
  console.log('  npx httpoint [options]');
  console.log('');
  console.log('Options:');
  console.log('  --port <number>    Port to listen on (default: 3000)');
  console.log('  --path <directory> Root directory to serve (default: current directory)');
  console.log('  --debug            Enable debug logging');
  console.log('  --help             Show this help');
  console.log('');
  console.log('Environment variables:');
  console.log('  HTTPOINT_PORT      Port number');
  console.log('  HTTPOINT_ROOT      Root directory');
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    port: process.env.HTTPOINT_PORT || 3000,
    root: process.env.HTTPOINT_ROOT || process.cwd(),
    debug: false
  };

  let showHelp = false;
  const unknownArgs = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--help') {
      showHelp = true;
    } else if (args[i] === '--debug') {
      config.debug = true;
    } else if (args[i] === '--port' && args[i + 1]) {
      config.port = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--path' && args[i + 1]) {
      config.root = path.resolve(args[i + 1]);
      i++;
    } else if (args[i].startsWith('--')) {
      unknownArgs.push(args[i]);
    }
  }

  if (showHelp || unknownArgs.length > 0) {
    if (unknownArgs.length > 0) {
      console.error(`Unknown arguments: ${unknownArgs.join(', ')}`);
      console.error('');
    }
    printHelp();
    process.exit(0);
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

// Format file size in human readable format
function formatFileSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// Simple multipart parser
function parseMultipart(body, boundary) {
  const parts = [];
  const boundaryBuffer = Buffer.from('--' + boundary);
  const endBoundaryBuffer = Buffer.from('--' + boundary + '--');
  let start = 0;
  let end = body.indexOf(boundaryBuffer, start);

  while (end !== -1) {
    const partStart = end + boundaryBuffer.length;
    let partEnd = body.indexOf(boundaryBuffer, partStart);

    // Check if this is the last part (end boundary)
    if (partEnd === -1) {
      const endBoundaryIndex = body.indexOf(endBoundaryBuffer, partStart);
      if (endBoundaryIndex !== -1) {
        partEnd = endBoundaryIndex;
      } else {
        break;
      }
    }

    const part = body.slice(partStart, partEnd);
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd !== -1) {
      const headers = part.slice(0, headerEnd).toString();
      const data = part.slice(headerEnd + 4);
      const headerLines = headers.split('\r\n');
      const contentDisposition = headerLines.find(line => line.startsWith('Content-Disposition'));
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
        const nameMatch = contentDisposition.match(/name="([^"]+)"/);
        if (filenameMatch && nameMatch) {
          parts.push({
            name: nameMatch[1],
            filename: filenameMatch[1],
            data: data
          });
        }
      }
    }

    // If we found the end boundary, we're done
    if (partEnd === body.indexOf(endBoundaryBuffer, partStart)) {
      break;
    }

    start = partEnd;
    end = body.indexOf(boundaryBuffer, start);
  }
  return parts;
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
      const size = formatFileSize(stat.size);
      regularFiles.push(`<li><a href="${href}">📄 ${file}</a> <span style="color: #666;">(${size})</span></li>`);
    }
  });

  const allItems = [...items, ...directories, ...regularFiles];

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Directory listing for ${requestPath}</title>
    <link rel="stylesheet" href="/public/styles.css">
</head>
<body>
    <div class="header">
        <h1>Directory listing for ${requestPath}</h1>
    </div>
    <ul>
        ${allItems.join('\n        ')}
    </ul>
    <button class="upload-btn" id="uploadBtn">+</button>
    <div class="upload-overlay" id="uploadOverlay">
        <div class="upload-modal">
            <button class="close-btn" id="closeBtn">&times;</button>
            <h2>Upload Files</h2>
            <div class="drop-area" id="dropArea">Drag & drop files here or click to browse</div>
            <input type="file" class="file-input" id="fileInput" multiple style="display: none;">
            <div class="progress" id="progress">
                <div class="progress-bar" id="progressBar"></div>
            </div>
        </div>
    </div>
    <script src="/public/script.js"></script>
</body>
</html>`;
}

// Create HTTP server
function createServer(config) {
  const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const requestPath = decodeURIComponent(parsedUrl.pathname);
    const filePath = path.join(config.root, requestPath);

    // Collect body
    const body = await new Promise((resolve, reject) => {
      const chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => resolve(Buffer.concat(chunks)));
      req.on('error', reject);
    });

    if (req.method === 'POST' && config.debug) {
      console.log(`POST body for ${requestPath}:\n`, body.toString());
    }

    // Security check - prevent directory traversal
    if (!filePath.startsWith(config.root)) {
      res.statusCode = 403;
      res.end('Forbidden');
      console.log(`${req.method} ${requestPath} 403`);
      return;
    }

    try {
      // Handle static files from /public/ path
      if (requestPath.startsWith('/public/')) {
        const publicFilePath = path.join(__dirname, 'public', requestPath.substring(8));
        const mimeType = getMimeType(publicFilePath);
        res.setHeader('Content-Type', mimeType);
        res.statusCode = 200;
        console.log(`${req.method} ${requestPath} 200`);
        const readStream = fs.createReadStream(publicFilePath);
        readStream.pipe(res);
        return;
      }

      const stats = await fs.promises.stat(filePath);
      if (stats.isDirectory()) {
        if (req.method === 'POST') {
          // Handle file upload
          const contentType = req.headers['content-type'];
          if (contentType && contentType.startsWith('multipart/form-data')) {
            const boundaryMatch = contentType.match(/boundary=(.+)/);
            if (boundaryMatch) {
              const boundary = boundaryMatch[1];
              const parts = parseMultipart(body, boundary);
              for (const part of parts) {
                const uploadPath = path.join(filePath, part.filename);
                await fs.promises.writeFile(uploadPath, part.data);
              }
              res.statusCode = 200;
              res.setHeader('Content-Type', 'text/plain');
              res.end('Files uploaded successfully');
              console.log(`${req.method} ${requestPath} 200`);
            } else {
              res.statusCode = 400;
              res.end('Invalid boundary');
              console.log(`${req.method} ${requestPath} 400`);
            }
          } else {
            res.statusCode = 400;
            res.end('Invalid content type');
            console.log(`${req.method} ${requestPath} 400`);
          }
        } else {
          // Serve directory listing
          const html = generateDirectoryListing(filePath, requestPath, config.root);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/html');
          res.end(html);
          console.log(`${req.method} ${requestPath} 200`);
        }
      } else {
        // Serve file
        const mimeType = getMimeType(filePath);
        res.setHeader('Content-Type', mimeType);
        res.statusCode = 200;
        console.log(`${req.method} ${requestPath} 200`);
        const readStream = fs.createReadStream(filePath);
        readStream.pipe(res);
      }
    } catch (err) {
      if (err.code === 'ENOENT') {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain');
        res.end('404 Not Found');
        console.log(`${req.method} ${requestPath} 404`);
      } else {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Internal Server Error');
        console.log(`${req.method} ${requestPath} 500`);
      }
    }
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
