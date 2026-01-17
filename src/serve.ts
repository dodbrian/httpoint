#!/usr/bin/env node

import http from 'http';
import fs from 'fs';
import path from 'path';
import url from 'url';
import { getMimeType } from './utils/mime';
import { parseMultipart } from './utils/multipart';
import { getLocalIP } from './utils/network';
import { generateDirectoryListing } from './views/directory-listing';
import { Config } from './config/types';
import { parseArgs } from './config/parser';
import { validateConfig } from './config/validator';










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

  validateConfig(config);

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

export { createServer };
