#!/usr/bin/env node

import http from 'http';
import fs from 'fs';
import path from 'path';
import { getMimeType } from './utils/mime';
import { parseMultipart } from './utils/multipart';
import { getLocalIP } from './utils/network';
import { generateDirectoryListing } from './views/directory-listing';
import { Config, parseArgs, validateConfig } from './config';
import { createRequestContext, RequestContext } from './context/request';










function createServer(config: Config): http.Server {
  const server = http.createServer(async (req: http.IncomingMessage, res: http.ServerResponse) => {
    let context: RequestContext | undefined;
    try {
      context = await createRequestContext(req, config);

      if (req.method === 'POST' && config.debug) {
        console.log(`POST body for ${context.requestPath}:\n`, context.body.toString());
      }
      if (context.requestPath.startsWith('/_httpoint_assets/')) {
        const publicFilePath = path.join(__dirname, '_httpoint_assets', context.requestPath.substring(17));
        const mimeType = getMimeType(publicFilePath);
        res.setHeader('Content-Type', mimeType);
        res.statusCode = 200;

        if (config.debug) {
          console.log(`${req.method} ${context.requestPath} 200`);
        }

        const readStream = fs.createReadStream(publicFilePath);
        readStream.pipe(res);
        return;
      }

      const stats = await fs.promises.stat(context.filePath);
      if (stats.isDirectory()) {
        if (req.method === 'POST') {
          const contentType = req.headers['content-type'];
          if (contentType && contentType.startsWith('multipart/form-data')) {
            const boundaryMatch = contentType.match(/boundary=(.+)/);
            if (boundaryMatch) {
              const boundary = boundaryMatch[1];
              const parts = parseMultipart(context.body, boundary);
              for (const part of parts) {
                const uploadPath = path.join(context.filePath, part.filename);
                await fs.promises.writeFile(uploadPath, part.data);
              }
              res.statusCode = 200;
              res.setHeader('Content-Type', 'text/plain');
              res.end('Files uploaded successfully');
              console.log(`${req.method} ${context.requestPath} 200`);
            } else {
              res.statusCode = 400;
              res.end('Invalid boundary');
              console.log(`${req.method} ${context.requestPath} 400`);
            }
          } else {
            res.statusCode = 400;
            res.end('Invalid content type');
            console.log(`${req.method} ${context.requestPath} 400`);
          }
        } else {
          const html = generateDirectoryListing(context.filePath, context.requestPath);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/html');
          res.end(html);
          console.log(`${req.method} ${context.requestPath} 200`);
        }
      } else {
        const mimeType = getMimeType(context.filePath);
        res.setHeader('Content-Type', mimeType);
        res.statusCode = 200;
        console.log(`${req.method} ${context.requestPath} 200`);
        const readStream = fs.createReadStream(context.filePath);
        readStream.pipe(res);
      }
    } catch (err: unknown) {
      if (err instanceof Error && (err as NodeJS.ErrnoException).code === 'ENOENT') {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain');
        res.end('404 Not Found');
        console.log(`${req.method} ${context?.requestPath || 'unknown'} 404`);
      } else if (err instanceof Error && err.message === 'Path validation failed - potential directory traversal') {
        res.statusCode = 403;
        res.end('Forbidden');
        console.log(`${req.method} ${context?.requestPath || 'unknown'} 403`);
      } else {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Internal Server Error');
        console.log(`${req.method} ${context?.requestPath || 'unknown'} 500`);
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
