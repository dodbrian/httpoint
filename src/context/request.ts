import http from 'http';
import path from 'path';
import url from 'url';
import { Config } from '../config';

export interface RequestContext {
  req: http.IncomingMessage;
  requestPath: string;
  filePath: string;
  body: Buffer;
  parsedUrl: url.UrlWithParsedQuery;
}

async function collectBody(req: http.IncomingMessage): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalSize = 0;
    const MAX_BODY_SIZE = 100 * 1024 * 1024; // 100MB limit

    req.on('data', (chunk: Buffer) => {
      totalSize += chunk.length;
      if (totalSize > MAX_BODY_SIZE) {
        reject(new Error('Request body too large'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
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
  const body = await collectBody(req);

  if (!validatePath(filePath, config)) {
    throw new Error('Path validation failed - potential directory traversal');
  }

  return {
    req,
    requestPath,
    filePath,
    body,
    parsedUrl
  };
}