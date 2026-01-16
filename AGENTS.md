# HTTPoint - Agent Instructions

## Project Overview

HTTPoint is a lightweight Node.js CLI application that serves static files via HTTP with directory browsing and file upload support. It uses no external dependencies - only Node.js built-in modules.

## Commands

### Build
```bash
npm run build
```
Builds TypeScript to JavaScript, runs lint, and copies static assets to dist/.

### Running
```bash
# Run the application
npm start
# or
node dist/serve.js [options]

# Options
--port <number>       Port to listen on (default: 3000)
--path <directory>    Root directory to serve (default: current directory)
--debug               Enable debug logging
--help                Show help information
```

### Lint
```bash
npm run lint
```
ESLint with TypeScript support. Lint runs automatically during build.

### Lint Fix
```bash
npm run lint:fix
```
Auto-fixes linting issues where possible.

### Test
No test framework is currently set up. When implementing tests, choose an appropriate framework and update package.json scripts accordingly.

### Running Single Test
Once a test framework is implemented, refer to its documentation for running single tests. Common patterns:
- Jest: `npm test -- path/to/test.test.js`
- Mocha: `npm test -- --grep "test name"`

## Code Style Guidelines

### File Structure
- Main entry point: `src/serve.ts`
- Static assets: `src/_httpoint_assets/` (CSS, JS)
- Documentation: `docs/spec.md`

### Language and Modules
- Use CommonJS (`require`, `module.exports`)
- Use Node.js built-in modules only: `http`, `fs`, `path`, `url`, `os`
- No external dependencies

### Formatting
- 2-space indentation
- No semicolons
- Shebang at top of main file: `#!/usr/bin/env node`
- Function comments before function definitions, not inline
- Clear, descriptive function names

### Naming Conventions
- Functions: camelCase (`parseArgs`, `getMimeType`, `createServer`)
- Variables: camelCase (`config`, `filePath`, `localIP`)
- Constants: UPPER_SNAKE_CASE (not commonly used in this codebase)
- HTML/CSS classes: kebab-case (`drop-area`, `upload-overlay`)

### Imports
- Use `require()` for built-in modules
- Group built-in modules at top of file
- Import local files relative to `__dirname` or current file

### Error Handling
- Use try-catch blocks for async operations
- Check error codes (`err.code === 'ENOENT'`)
- Return appropriate HTTP status codes:
  - 200: Success
  - 403: Forbidden (directory traversal)
  - 404: Not found
  - 400: Bad request
  - 500: Internal server error
- Log errors with context: `${req.method} ${requestPath} ${statusCode}`

### Security
- **Directory Traversal Protection**: Always validate file paths start with `config.root`
- No file name sanitization (files preserve original names)
- No file type restrictions
- No upload size limits

### Logging
- Standard format: `METHOD PATH STATUS_CODE`
- Example: `GET /index.html 200`
- Asset requests (`/_httpoint_assets/`) only logged with `--debug` flag
- POST body logged to STDOUT in debug mode: `POST body for /path:\n [body content]`

### HTTP Implementation
- Use `fs.createReadStream().pipe()` for file serving
- Collect request body in chunks: `Buffer.concat(chunks)`
- Async/await for file operations: `fs.promises.stat()`, `fs.promises.writeFile()`
- Multipart parsing using Buffer operations

### HTML/CSS/JS
- CSS: Minimal, functional styling
- JS: Event listeners, DOM manipulation, XMLHttpRequest for uploads
- No frameworks - vanilla JavaScript only

## Repository Rules (from .clinerules)

1. **Do not attempt to open md files from a cli after finishing a task**
2. **Before making changes to the code always document them in the docs/spec.md file**

## Configuration Precedence

Command-line arguments take precedence over environment variables:

1. CLI args: `--port`, `--path`, `--debug`, `--help`
2. Environment variables: `HTTPOINT_PORT`, `HTTPOINT_ROOT`
3. Defaults: port 3000, current directory

## Testing the Application

Manual testing approach (no automated tests yet):
```bash
# Start server
node src/serve.js --port 3000

# Test in another terminal
curl http://localhost:3000/
```

## Key Implementation Details

- **Multipart Parser**: Custom implementation using Buffer operations
- **File Upload**: POST with `multipart/form-data`, writes files with original names
- **Progress Tracking**: Client-side XMLHttpRequest with progress events
- **Directory Listings**: Generated HTML with file size formatting (B, KB, MB, GB, TB)
- **Network Detection**: Automatically finds non-internal IPv4 address for LAN access
- **Graceful Shutdown**: SIGINT handler closes server properly

## Working with Tickets

### Ticket Structure
Tickets are stored in `docs/tickets/` with the following naming convention:
- `phase{number}-{order}-{description}.md`
- Example: `phase1-001-mime-utility.md`

### Ticket Workflow
1. **Read the ticket**: Understand the scope, tasks, and acceptance criteria
2. **Implement changes**: Follow the tasks listed in the ticket
3. **Validate**: Run build and lint commands after each ticket
4. **Test manually**: Ensure functionality is preserved
5. **Mark complete**: Update ticket status if tracking progress

### Implementation Phases
- **Phase 1**: Utils and Views (no app dependencies)
- **Phase 2**: Config and Context (foundational types)
- **Phase 3**: Middleware (independent, testable)
- **Phase 4**: Handlers (use utils, no middleware dependencies)
- **Phase 5**: Router and Server (orchestration)
- **Phase 6**: Entry Point (CLI refactoring)

### Phase 1 Specific Notes
- Execute tickets in numerical order
- Tickets 1-4 have no dependencies
- Ticket 5 depends on ticket 2 (format utility)
- Each ticket should preserve all existing functionality

### Validation Requirements
After completing any ticket:
```bash
npm run build    # TypeScript compilation
npm run lint     # Code style verification
npm start        # Manual functionality test
```

## When Making Changes

1. **Check for tickets**: Look in `docs/tickets/` for related work
2. **Read the relevant code sections**: Understand current implementation
3. **Update `docs/spec.md`**: Document any behavior changes
4. **Maintain code style**: Follow existing conventions
5. **Test manually**: Verify with different file types and directory structures
6. **Validate security**: Ensure directory traversal protection remains intact
