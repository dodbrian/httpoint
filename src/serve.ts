#!/usr/bin/env node

import http from 'http';
import { getLocalIP } from './utils/network';
import { Config, parseArgs, validateConfig } from './config';
import { createRequestContext, RequestContext } from './context/request';
import { bodyCollector } from './middleware/body-collector';
import { SecurityViolationError } from './middleware/security';
import { router } from './middleware/router';
import { logger } from './middleware/logger';


function createServer(config: Config): http.Server {
  const server = http.createServer(async (req: http.IncomingMessage, res: http.ServerResponse) => {
    let context: RequestContext | undefined;
    try {
      context = await createRequestContext(req, res, config);
      await bodyCollector(context);

      // Route the request using the router middleware
      const result = await router(context);
      
      if (result.handler) {
        await result.handler(context);
        // Log the request after handler execution
        await logger(context, context.res.statusCode);
      } else if (result.statusCode) {
        context.res.statusCode = result.statusCode;
        if (result.message) {
          context.res.setHeader('Content-Type', 'text/plain');
          context.res.end(result.message);
        } else {
          context.res.end();
        }
        // Log the request
        await logger(context, result.statusCode);
      }
    } catch (err: unknown) {
      let statusCode = 500;
      let message = 'Internal Server Error';

      if (err instanceof Error && (err as NodeJS.ErrnoException).code === 'ENOENT') {
        statusCode = 404;
        message = 'Not Found';
      } else if (err instanceof SecurityViolationError) {
        statusCode = 403;
        message = 'Forbidden';
      }

      res.statusCode = statusCode;
      res.setHeader('Content-Type', 'text/plain');
      res.end(message);
      
      // Log the error
      if (context) {
        await logger(context, statusCode);
      } else {
        console.log(`${req.method} unknown ${statusCode}`);
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
