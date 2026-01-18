import http from 'http';
import path from 'path';
import url from 'url';
import { Config } from '../config';
import { SecurityViolationError } from '../middleware/security';

export interface RequestContext {
  req: http.IncomingMessage;
  res: http.ServerResponse;
  requestPath: string;
  filePath: string;
  body: Buffer | undefined;
  parsedUrl: url.UrlWithParsedQuery;
  config: Config;
}

function resolvePath(requestPath: string, config: Config): string {
  return path.join(config.root, requestPath);
}

function validatePath(filePath: string, config: Config): boolean {
  return filePath.startsWith(config.root);
}

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