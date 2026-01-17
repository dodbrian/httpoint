import path from 'path';
import { RequestContext } from '../context/request';

export class SecurityViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityViolationError';
  }
}

export async function security(context: RequestContext): Promise<void> {
  const resolvedPath = path.resolve(context.filePath);
  const normalizedPath = path.normalize(resolvedPath);
  const rootResolved = path.resolve(context.config.root);

  if (!normalizedPath.startsWith(rootResolved)) {
    throw new SecurityViolationError(
      `Security violation: directory traversal attempt detected. Path "${context.requestPath}" is not within root directory.`
    );
  }

  const normalizedRequestPath = path.normalize(context.requestPath);
  if (normalizedRequestPath.includes('..')) {
    throw new SecurityViolationError(
      `Security violation: invalid path sequence detected in "${context.requestPath}"`
    );
  }
}
