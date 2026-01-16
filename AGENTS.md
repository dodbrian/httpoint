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
No test framework currently configured. When implementing tests:
- Choose appropriate framework (Jest/Mocha recommended)
- Update package.json scripts accordingly
- Single test patterns: `npm test -- path/to/test.test.js` (Jest) or `npm test -- --grep "test name"` (Mocha)

### Running
```bash
node dist/serve.js [options]
# Options: --port <number>, --path <directory>, --debug, --help
# Environment: HTTPOINT_PORT, HTTPOINT_ROOT
```

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

### Naming Conventions
- Functions/Variables: camelCase (`parseArgs`, `getMimeType`, `config`)
- Constants: UPPER_SNAKE_CASE (rarely used)
- HTML/CSS classes: kebab-case (`drop-area`, `upload-overlay`)

### Import Organization
```typescript
import http from 'http';
import fs from 'fs';
import path from 'path';
import url from 'url';
import { version } from '../package.json';  // Local imports last
```

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

## Ticket-Based Development

### Ticket Structure
- Location: `docs/tickets/`
- Naming: `phase{number}-{order}-{description}.md`
- Example: `phase1-001-mime-utility.md`

### Implementation Phases
1. **Phase 1**: Utils and Views (no app dependencies)
2. **Phase 2**: Config and Context (foundational types)
3. **Phase 3**: Middleware (independent, testable)
4. **Phase 4**: Handlers (use utils, no middleware dependencies)
5. **Phase 5**: Router and Server (orchestration)
6. **Phase 6**: Entry Point (CLI refactoring)

### Validation Workflow
After each ticket:
```bash
npm run build    # TypeScript compilation
npm run lint     # Code style verification
npm start        # Manual functionality test
```

## Key Implementation Details

- **Multipart Parser**: Custom Buffer-based implementation
- **File Upload**: POST `multipart/form-data`, original filenames preserved
- **Directory Listings**: HTML with file sizes (B, KB, MB, GB, TB)
- **Network Detection**: Auto-find non-internal IPv4 for LAN access
- **Graceful Shutdown**: SIGINT handler for proper server closure

## Development Workflow

1. Check `docs/tickets/` for related work
2. Read relevant code sections to understand implementation
3. Update `docs/spec.md` with behavior changes
4. Follow existing code style and conventions
5. Test manually with different file types and directory structures
6. Validate directory traversal protection remains intact
