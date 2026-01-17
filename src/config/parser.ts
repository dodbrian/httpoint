import path from 'path';
import { version } from '../../package.json';
import { Config } from './types';

export function printHelp(): void {
  console.log(`HTTPoint v${version} - Simple HTTP file server`);
  console.log('');
  console.log('Usage:');
  console.log('  npx httpoint [options]');
  console.log('');
  console.log('Options:');
  console.log('  --port <number>    Port to listen on (default: 3000)');
  console.log('  --path <directory> Root directory to serve (default: current directory)');
  console.log('  --debug            Enable debug logging');
  console.log('  --help             Show this help');
  console.log('');
  console.log('Environment variables:');
  console.log('  HTTPOINT_PORT      Port number');
  console.log('  HTTPOINT_ROOT      Root directory');
}

export function parseArgs(): Config {
  const args = process.argv.slice(2);
  const config: Config = {
    port: process.env.HTTPOINT_PORT || 3000,
    root: process.env.HTTPOINT_ROOT || process.cwd(),
    debug: false
  };

  let showHelp = false;
  const unknownArgs: string[] = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--help') {
      showHelp = true;
    } else if (args[i] === '--debug') {
      config.debug = true;
    } else if (args[i] === '--port' && args[i + 1]) {
      config.port = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--path' && args[i + 1]) {
      config.root = path.resolve(args[i + 1]);
      i++;
    } else if (args[i].startsWith('--')) {
      unknownArgs.push(args[i]);
    }
  }

  if (showHelp || unknownArgs.length > 0) {
    if (unknownArgs.length > 0) {
      console.error(`Unknown arguments: ${unknownArgs.join(', ')}`);
      console.error('');
    }
    printHelp();
    process.exit(0);
  }

  return config;
}