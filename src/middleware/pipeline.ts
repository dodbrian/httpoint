import http from 'http';
import { bodyCollector } from './body-collector';
import { security } from './security';
import { logger } from './logger';
import { router, HandlerResult } from './router';
import { Config } from '../config';
import { SecurityViolationError } from './security';
import { createRequestContext } from '../context/request';

export async function executePipeline(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  config: Config
): Promise<void> {
  let statusCode = 200;

  try {
    // Create request context first (basic validation happens here)
    const context = await createRequestContext(req, res, config);

    // Execute middleware in sequence: security → body collector → router → logger
    await security(context);
    await bodyCollector(context);

    // Route the request to appropriate handler
    const result: HandlerResult = await router(context);

    if (result.handler) {
      // Execute the handler
      await result.handler(context);
      statusCode = context.res.statusCode || 200;
    } else if (result.statusCode) {
      // Direct response from router
      statusCode = result.statusCode;
      context.res.writeHead(statusCode, { 'Content-Type': 'text/plain' });
      if (result.message) {
        context.res.end(result.message);
      } else {
        context.res.end();
      }
    }

    // Log the request/response after processing
    await logger(context, statusCode);

  } catch (error) {
    // Handle errors from any middleware stage
    if (error instanceof SecurityViolationError) {
      statusCode = 403;
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
    } else if (error instanceof Error && error.message === 'Request body too large') {
      statusCode = 413;
      res.writeHead(413, { 'Content-Type': 'text/plain' });
      res.end('Request Entity Too Large');
    } else {
      statusCode = 500;
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }

    // Log the error if in debug mode
    if (config?.debug && error instanceof Error) {
      console.error('Pipeline error:', error.message);
    }

    // Create minimal context for logging if we can (but not for security errors)
    if (!(error instanceof SecurityViolationError)) {
      try {
        const fallbackContext = await createRequestContext(req, res, config);
        await logger(fallbackContext, statusCode);
      } catch {
        // If we can't even create a context for logging, just log the status
        console.log(`${req.method} ${req.url || 'unknown'} ${statusCode}`);
      }
    } else {
      // For security errors, just log the status without creating context
      console.log(`${req.method} ${req.url || 'unknown'} ${statusCode}`);
    }
  }
}