import http from 'http';
import { RequestContext } from '../context/request';

const MAX_BODY_SIZE = 100 * 1024 * 1024;

async function collectBody(req: http.IncomingMessage): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalSize = 0;

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

export async function bodyCollector(context: RequestContext): Promise<void> {
  context.body = await collectBody(context.req);
}
