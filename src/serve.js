#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

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

// Simple multipart parser
function parseMultipart(body, boundary) {
  const parts = [];
  const boundaryBuffer = Buffer.from('--' + boundary);
  const endBoundaryBuffer = Buffer.from('--' + boundary + '--');
  let start = 0;
  let end = body.indexOf(boundaryBuffer, start);

  while (end !== -1) {
    const partStart = end + boundaryBuffer.length;
    const partEnd = body.indexOf(boundaryBuffer, partStart);
    if (partEnd === -1) break;

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
        body { font-family: Arial, sans-serif; margin: 40px; position: relative; }
        h1 { color: #333; }
        ul { list-style: none; padding: 0; }
        li { margin: 8px 0; }
        a { text-decoration: none; color: #0066cc; }
        a:hover { text-decoration: underline; }
        .header { border-bottom: 1px solid #ccc; padding-bottom: 10px; margin-bottom: 20px; }
        .upload-btn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: #007bff;
            color: white;
            border: none;
            font-size: 24px;
            cursor: pointer;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .upload-btn:hover { background: #0056b3; }
        .upload-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }
        .upload-modal {
            background: white;
            padding: 20px;
            border-radius: 8px;
            width: 400px;
            text-align: center;
        }
        .drop-area {
            border: 2px dashed #ccc;
            padding: 20px;
            margin: 10px 0;
            border-radius: 4px;
            cursor: pointer;
        }
        .drop-area.dragover { border-color: #007bff; background: #f8f9fa; }
        .file-input { margin: 10px 0; }
        .progress { width: 100%; height: 20px; background: #f0f0f0; border-radius: 10px; overflow: hidden; margin: 10px 0; display: none; }
        .progress-bar { height: 100%; background: #007bff; width: 0%; }
        .close-btn { position: absolute; top: 10px; right: 10px; background: none; border: none; font-size: 20px; cursor: pointer; }
        .upload-modal { position: relative; }
    </style>
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
    <script>
        const uploadBtn = document.getElementById('uploadBtn');
        const uploadOverlay = document.getElementById('uploadOverlay');
        const closeBtn = document.getElementById('closeBtn');
        const dropArea = document.getElementById('dropArea');
        const fileInput = document.getElementById('fileInput');
        const progress = document.getElementById('progress');
        const progressBar = document.getElementById('progressBar');

        uploadBtn.addEventListener('click', () => {
            uploadOverlay.style.display = 'flex';
        });

        closeBtn.addEventListener('click', () => {
            uploadOverlay.style.display = 'none';
            progress.style.display = 'none';
            progressBar.style.width = '0%';
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && uploadOverlay.style.display === 'flex') {
                uploadOverlay.style.display = 'none';
                progress.style.display = 'none';
                progressBar.style.width = '0%';
            }
        });

        dropArea.addEventListener('click', () => {
            fileInput.click();
        });

        dropArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropArea.classList.add('dragover');
        });

        dropArea.addEventListener('dragleave', () => {
            dropArea.classList.remove('dragover');
        });

        dropArea.addEventListener('drop', (e) => {
            e.preventDefault();
            dropArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            uploadFiles(files);
        });

        fileInput.addEventListener('change', () => {
            const files = fileInput.files;
            uploadFiles(files);
        });

        function uploadFiles(files) {
            if (files.length === 0) return;
            const formData = new FormData();
            for (let file of files) {
                formData.append('files', file);
            }
            const xhr = new XMLHttpRequest();
            xhr.open('POST', window.location.pathname);
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percent = (e.loaded / e.total) * 100;
                    progress.style.display = 'block';
                    progressBar.style.width = percent + '%';
                }
            });
            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    location.reload();
                } else {
                    alert('Upload failed');
                }
            });
            xhr.send(formData);
        }
    </script>
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

    // Log request
    console.log(`${req.method} ${requestPath} ${res.statusCode || '...'}`);

    // Security check - prevent directory traversal
    if (!filePath.startsWith(config.root)) {
      res.statusCode = 403;
      res.end('Forbidden');
      console.log(`${req.method} ${requestPath} 403`);
      return;
    }

    try {
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
