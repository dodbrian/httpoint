#!/usr/bin/env node

import http from 'http';
import fs from 'fs';
import path from 'path';
import url from 'url';
import { version } from '../package.json';
import { getMimeType } from './utils/mime';
import { parseMultipart } from './utils/multipart';
import { getLocalIP } from './utils/network';
import { generateDirectoryListing } from './views/directory-listing';

interface Config {
  port: number | string;
  root: string;
  debug: boolean;
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
    const localIP = getLocalIP();

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
