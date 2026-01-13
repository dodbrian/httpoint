#!/usr/bin/env node

import http from 'http';
import fs from 'fs';
import path from 'path';
import url from 'url';
import { version } from '../package.json';

interface Config {
  port: number | string;
  root: string;
  debug: boolean;
}

interface MultipartPart {
  name: string;
  filename: string;
  data: Buffer;
}

interface NetworkAddress {
  family: string;
  internal: boolean;
  address: string;
}

function printHelp(): void {
  console.log(`HTTPoint v${version} - Simple HTTP file server`);
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

function parseArgs(): Config {
  const args = process.argv.slice(2);
  const config: Config = {
    port: process.env.HTTPOINT_PORT || 3000,
    root: process.env.HTTPOINT_ROOT || process.cwd(),
    debug: false
  };

  let showHelp = false;
  const unknownArgs: string[] = [];

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

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
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

function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

function parseMultipart(body: Buffer, boundary: string): MultipartPart[] {
  const parts: MultipartPart[] = [];
  const boundaryBuffer = Buffer.from('--' + boundary);
  const endBoundaryBuffer = Buffer.from('--' + boundary + '--');
  let start = 0;
  let end = body.indexOf(boundaryBuffer, start);

  while (end !== -1) {
    const partStart = end + boundaryBuffer.length;
    let partEnd = body.indexOf(boundaryBuffer, partStart);

    if (partEnd === -1) {
      const endBoundaryIndex = body.indexOf(endBoundaryBuffer, partStart);
      if (endBoundaryIndex !== -1) {
        partEnd = endBoundaryIndex;
      } else {
        break;
      }
    }

    const part = body.subarray(partStart, partEnd);
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd !== -1) {
      const headers = part.subarray(0, headerEnd).toString();
      const data = part.subarray(headerEnd + 4);
      const headerLines = headers.split('\r\n');
      const contentDisposition = headerLines.find((line: string) => line.startsWith('Content-Disposition'));
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

    if (partEnd === body.indexOf(endBoundaryBuffer, partStart)) {
      break;
    }

    start = partEnd;
    end = body.indexOf(boundaryBuffer, start);
  }
  return parts;
}

function generateDirectoryListing(dirPath: string, requestPath: string): string {
  const files = fs.readdirSync(dirPath);
  const items: string[] = [];

  if (requestPath !== '/') {
    const parentPath = path.dirname(requestPath);
    const parentHref = parentPath === '/' ? '/' : parentPath;
    items.push(`<li><a href="${parentHref}">📁 ../</a></li>`);
  }

  const directories: string[] = [];
  const regularFiles: string[] = [];

  files.forEach((file: string) => {
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
    <link rel="stylesheet" href="/_httpoint_assets/styles.css">
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
    <script src="/_httpoint_assets/script.js"></script>
</body>
</html>`;
}

function createServer(config: Config): http.Server {
  const server = http.createServer(async (req: http.IncomingMessage, res: http.ServerResponse) => {
    const parsedUrl = url.parse(req.url!, true);
    const requestPath = decodeURIComponent(parsedUrl.pathname!);
    const filePath = path.join(config.root, requestPath);

    const body = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => resolve(Buffer.concat(chunks)));
      req.on('error', reject);
    });

    if (req.method === 'POST' && config.debug) {
      console.log(`POST body for ${requestPath}:\n`, body.toString());
    }

    if (!filePath.startsWith(config.root)) {
      res.statusCode = 403;
      res.end('Forbidden');
      console.log(`${req.method} ${requestPath} 403`);
      return;
    }

    try {
      if (requestPath.startsWith('/_httpoint_assets/')) {
        const publicFilePath = path.join(__dirname, '_httpoint_assets', requestPath.substring(17));
        const mimeType = getMimeType(publicFilePath);
        res.setHeader('Content-Type', mimeType);
        res.statusCode = 200;

        if (config.debug) {
          console.log(`${req.method} ${requestPath} 200`);
        }

        const readStream = fs.createReadStream(publicFilePath);
        readStream.pipe(res);
        return;
      }

      const stats = await fs.promises.stat(filePath);
      if (stats.isDirectory()) {
        if (req.method === 'POST') {
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
          const html = generateDirectoryListing(filePath, requestPath);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/html');
          res.end(html);
          console.log(`${req.method} ${requestPath} 200`);
        }
      } else {
        const mimeType = getMimeType(filePath);
        res.setHeader('Content-Type', mimeType);
        res.statusCode = 200;
        console.log(`${req.method} ${requestPath} 200`);
        const readStream = fs.createReadStream(filePath);
        readStream.pipe(res);
      }
    } catch (err: unknown) {
      if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
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

function main(): void {
  const config = parseArgs();

  if (!fs.existsSync(config.root)) {
    console.error(`Error: Directory '${config.root}' does not exist`);
    process.exit(1);
  }

  const server = createServer(config);

  server.listen(Number(config.port), '0.0.0.0', () => {
    const os = require('os');
    const networkInterfaces = os.networkInterfaces() as Record<string, NetworkAddress[]>;
    let localIP = 'localhost';

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

  process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    server.close(() => {
      console.log('Server stopped');
      process.exit(0);
    });
  });
}

if (require.main === module) {
  main();
}

export { createServer, parseArgs };
