import fs from 'fs';
import { Config } from './types';

export function validateConfig(config: Config): void {
  if (!fs.existsSync(config.root)) {
    console.error(`Error: Directory '${config.root}' does not exist`);
    process.exit(1);
  }
}