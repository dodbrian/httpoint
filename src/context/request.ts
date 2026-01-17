import http from 'http';
import path from 'path';
import url from 'url';
import { Config } from '../config';

export interface RequestContext {
  req: http.IncomingMessage;
  requestPath: string;
  filePath: string;
  body: Buffer | undefined;
  parsedUrl: url.UrlWithParsedQuery;
}

function resolvePath(requestPath: string, config: Config): string {
  return path.join(config.root, requestPath);
}

function validatePath(filePath: string, config: Config): boolean {
  return filePath.startsWith(config.root);
}

export async function createRequestContext(req: http.IncomingMessage, config: Config): Promise<RequestContext> {
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
    throw new Error('Path validation failed - potential directory traversal');
  }

  return {
    req,
    requestPath,
    filePath,
    body: undefined,
    parsedUrl
  };
}