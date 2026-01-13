# HTTPoint - Agent Instructions

## Project Overview

HTTPoint is a lightweight Node.js CLI application that serves static files via HTTP with directory browsing and file upload support. It uses no external dependencies - only Node.js built-in modules.

## Commands

### Build
No build step required. The application runs directly with Node.js.

### Running
```bash
# Run the application
npm start
# or
node src/serve.js [options]

# Options
--port <number>       Port to listen on (default: 3000)
--path <directory>    Root directory to serve (default: current directory)
--debug               Enable debug logging
--help                Show help information
```

### Lint
No linting framework is configured. Maintain consistency with existing code style.

### Test
No test framework is currently set up. When implementing tests, choose an appropriate framework and update package.json scripts accordingly.

### Running Single Test
Once a test framework is implemented, refer to its documentation for running single tests. Common patterns:
- Jest: `npm test -- path/to/test.test.js`
- Mocha: `npm test -- --grep "test name"`

## Code Style Guidelines

### File Structure
- Main entry point: `src/serve.js`
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

## When Making Changes

1. Read the relevant code sections in `src/serve.js`
2. Update `docs/spec.md` with any behavior changes
3. Maintain consistency with existing code style
4. Test manually with different file types and directory structures
5. Verify security checks (directory traversal protection) remain intact
