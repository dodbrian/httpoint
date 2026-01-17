import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { RequestContext } from '../context/request';
import { getMimeType } from '../utils/mime';
import { parseMultipart } from '../utils/multipart';
import { generateDirectoryListing } from '../views/directory-listing';

export interface HandlerResult {
  handler?: (context: RequestContext) => Promise<void>;
  statusCode?: number;
  message?: string;
}

export async function router(context: RequestContext): Promise<HandlerResult> {
  const { requestPath, req, filePath } = context;

  // Route asset requests
  if (requestPath.startsWith('/_httpoint_assets/')) {
    return {
      handler: assetHandler
    };
  }

  try {
    const stats = await fs.stat(filePath);
    
    if (stats.isDirectory()) {
      if (req.method === 'POST') {
        return {
          handler: directoryUploadHandler
        };
      } else {
        return {
          handler: directoryListingHandler
        };
      }
    } else {
      return {
        handler: fileHandler
      };
    }
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      return {
        statusCode: 404,
        message: 'Not Found'
      };
    }
    return {
      statusCode: 500,
      message: 'Internal Server Error'
    };
  }
}

async function assetHandler(context: RequestContext): Promise<void> {
  // Assets are in the dist/_httpoint_assets directory, not dist/middleware/_httpoint_assets
  const publicFilePath = path.join(__dirname, '..', '_httpoint_assets', context.requestPath.substring(17));
  const mimeType = getMimeType(publicFilePath);
  
  context.res.setHeader('Content-Type', mimeType);
  context.res.statusCode = 200;
  
  const readStream = fsSync.createReadStream(publicFilePath);
  readStream.pipe(context.res);
}

async function directoryListingHandler(context: RequestContext): Promise<void> {
  const html = generateDirectoryListing(context.filePath, context.requestPath);
  context.res.statusCode = 200;
  context.res.setHeader('Content-Type', 'text/html');
  context.res.end(html);
}

async function directoryUploadHandler(context: RequestContext): Promise<void> {
  const contentType = context.req.headers['content-type'];
  if (!contentType || !contentType.startsWith('multipart/form-data')) {
    context.res.statusCode = 400;
    context.res.end('Invalid content type');
    return;
  }
  
  const boundaryMatch = contentType.match(/boundary=(.+)/);
  if (!boundaryMatch || !context.body) {
    context.res.statusCode = 400;
    context.res.end('Invalid boundary or request body');
    return;
  }
  
  const boundary = boundaryMatch[1];
  const parts = parseMultipart(context.body, boundary);
  
  for (const part of parts) {
    const uploadPath = path.join(context.filePath, part.filename);
    await fs.writeFile(uploadPath, part.data);
  }
  
  context.res.statusCode = 200;
  context.res.setHeader('Content-Type', 'text/plain');
  context.res.end('Files uploaded successfully');
}

async function fileHandler(context: RequestContext): Promise<void> {
  const mimeType = getMimeType(context.filePath);
  context.res.setHeader('Content-Type', mimeType);
  context.res.statusCode = 200;
  
  const readStream = fsSync.createReadStream(context.filePath);
  readStream.pipe(context.res);
}