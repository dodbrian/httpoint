import http from 'http';
import path from 'path';
import url from 'url';
import { Config } from '../config';
import { SecurityViolationError } from '../middleware/security';

/**
 * Context object containing all request-related data and metadata
 */
export interface RequestContext {
  /** The incoming HTTP request object */
  req: http.IncomingMessage;
  /** The server response object */
  res: http.ServerResponse;
  /** The decoded URL path from the request */
  requestPath: string;
  /** The resolved file path on the server filesystem */
  filePath: string;
  /** The request body buffer (undefined for GET requests) */
  body: Buffer | undefined;
  /** The parsed URL object with query parameters */
  parsedUrl: url.UrlWithParsedQuery;
  /** The server configuration object */
  config: Config;
}

/**
 * Resolves a request path to an absolute file path
 * @param requestPath - The URL path from the request
 * @param config - The server configuration
 * @returns The absolute file path on the filesystem
 */
function resolvePath(requestPath: string, config: Config): string {
  return path.join(config.root, requestPath);
}

/**
 * Validates that a file path is within the server root directory
 * @param filePath - The absolute file path to validate
 * @param config - The server configuration
 * @returns True if the path is safe, false otherwise
 */
function validatePath(filePath: string, config: Config): boolean {
  return filePath.startsWith(config.root);
}

/**
 * Creates a request context object from an HTTP request
 * @param req - The incoming HTTP request
 * @param res - The server response object
 * @param config - The server configuration
 * @returns A promise resolving to the request context
 * @throws Error if the request URL or pathname is missing
 * @throws SecurityViolationError if path validation fails (directory traversal attempt)
 */
export async function createRequestContext(req: http.IncomingMessage, res: http.ServerResponse, config: Config): Promise<RequestContext> {
  if (!req.url) {
    throw new Error('Request URL is required');
  }

  const parsedUrl = url.parse(req.url, true);
  if (!parsedUrl.pathname) {
    throw new Error('Request pathname is required');
  }

  const requestPath = decodeURIComponent(parsedUrl.pathname);
  const filePath = resolvePath(requestPath, config);

  if (!validatePath(filePath, config)) {
    throw new SecurityViolationError('Path validation failed - potential directory traversal');
  }

  return {
    req,
    res,
    requestPath,
    filePath,
    body: undefined,
    parsedUrl,
    config
  };
}