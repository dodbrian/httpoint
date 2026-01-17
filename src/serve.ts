#!/usr/bin/env node

import http from 'http';
import { getLocalIP } from './utils/network';
import { Config, parseArgs, validateConfig } from './config';
import { executePipeline } from './middleware/pipeline';


function createServer(config: Config): http.Server {
  const server = http.createServer(async (req: http.IncomingMessage, res: http.ServerResponse) => {
    await executePipeline(req, res, config);
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
