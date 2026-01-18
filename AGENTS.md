# HTTPoint - Agent Instructions

## Project Overview

HTTPoint is a lightweight Node.js CLI application that serves static files via HTTP with directory browsing and file upload support. Uses only Node.js built-in modules.

## Commands

### Build & Development
```bash
npm run build          # Compile TypeScript, run lint, copy assets
npm run lint           # ESLint with TypeScript support  
npm run lint:fix       # Auto-fix linting issues
npm start              # Run compiled application
npm run dev            # Build and run in one command
```

### Testing
Jest with TypeScript support, using `ts-jest` preset.
- All tests: `npm test`
- Single test file: `npm test -- tests/utils/mime.test.ts`
- Single test case: `npm test -- -t "test name pattern"`
- Watch mode: `npm test -- --watch`
- Coverage report: `npm test -- --coverage`

### Running
```bash
node dist/serve.js [options]
# Options: --port <number>, --path <directory>, --debug, --help
# Environment: HTTPOINT_PORT, HTTPOINT_ROOT
```

## Core Programming Principles

1. **Always Program to Interfaces**: Design and implement code using interfaces/contracts. Depend on abstractions, not concrete implementations.
2. **Never Modify Existing Interfaces Without Approval**: Interface changes are breaking changes. Always request user approval before modifying any existing interface.
3. **Treat All Warnings as Errors**: Fix all warnings from TypeScript, ESLint, and tests immediately. No warnings should persist in builds, tests, or runtime.

## Code Style Guidelines

### TypeScript Configuration
- Target: ES2020, Module: CommonJS, Strict mode enabled
- No implicit any, unused locals/parameters checked
- Output: `dist/` directory with declarations and source maps

### ESLint Rules
- TypeScript ESLint recommended rules
- No unused variables (args with `_` prefix ignored)
- No explicit any (warned), no require imports (allowed)
- No constant condition (allowed for loops)

### Formatting & Structure
- **Indentation**: 2 spaces, no semicolons
- **Modules**: CommonJS (`require`, `module.exports`)
- **Dependencies**: Node.js built-in modules only (`http`, `fs`, `path`, `url`, `os`)
- **Entry point**: `src/serve.ts` with shebang `#!/usr/bin/env node`
- **Assets**: `src/_httpoint_assets/` (CSS, JS)
- **Line spacing**: maximal 2 empty lines

### Naming Conventions
- Functions/Variables: camelCase (`parseArgs`, `getMimeType`, `config`)
- Constants: UPPER_SNAKE_CASE (rarely used)
- HTML/CSS classes: kebab-case (`drop-area`, `upload-overlay`)

### Import Organization
- Node.js built-in imports first (in order: http, fs, path, url, os)
- Local imports last
- Example order: `import http from 'http'`, then `import { Config } from './config'`
- Use named imports for local modules, default imports for packages

### Error Handling Patterns
```typescript
try {
  await fs.promises.stat(filePath)
} catch (err) {
  if (err.code === 'ENOENT') {
    // File not found - return 404
  }
  // Handle other errors - return 500
}
```
- HTTP status codes: 200 (success), 403 (forbidden), 404 (not found), 400 (bad request), 500 (server error)
- Log format: `${req.method} ${requestPath} ${statusCode}`
- Use typed error checking (err.code) for fs operations
- Always add error context in logs for debugging

### Security Requirements
- **Directory Traversal Protection**: Always validate file paths start with `config.root`
- No file name sanitization (preserve original names)
- No file type restrictions or upload size limits

### HTTP Implementation
- File serving: `fs.createReadStream().pipe(res)`
- Request body: `Buffer.concat(chunks)` for multipart data
- File operations: `fs.promises.stat()`, `fs.promises.writeFile()`
- Multipart parsing: Custom Buffer-based implementation

### Frontend (HTML/CSS/JS)
- CSS: Minimal, functional styling only
- JavaScript: Vanilla JS with event listeners, DOM manipulation, XMLHttpRequest for uploads
- No frameworks allowed

## Repository Rules

From `.clinerules/`:
1. Do not attempt to open md files from CLI after finishing a task
2. Before making changes to the code, always document them in `docs/spec.md`

## Git & Validation Workflow

Before committing to git, always run all tests:
```bash
npm test         # Must pass before git commit
npm run build    # Verify TypeScript compilation and linting
```

## Development Workflow

1. Check `docs/tickets/` for related work
2. Update `docs/spec.md` with behavior changes before coding
3. Follow existing code style and conventions
4. Test manually with different file types and directory structures
5. Validate directory traversal protection remains intact
