import { RequestContext } from '../context/request';

export async function logger(context: RequestContext, statusCode: number): Promise<void> {
  const { req, requestPath, config } = context;
  
  // Skip asset requests unless debug mode is enabled
  if (requestPath.startsWith('/_httpoint_assets/') && !config.debug) {
    return;
  }
  
  // Log the basic request format
  console.log(`${req.method} ${requestPath} ${statusCode}`);
  
  // Log POST bodies only in debug mode
  if (config.debug && req.method === 'POST' && context.body) {
    console.log(`POST body for ${requestPath}:\n${context.body.toString()}`);
  }
}