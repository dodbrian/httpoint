# Modularization Implementation Plan

## Overview
This plan outlines the modularization of HTTPoint into reusable components with clear interfaces, following a middleware-based architecture.

## Folder Structure

```
src/
├── config/
│   └── config.ts              # Config interface, parseArgs(), printHelp()
├── context/
│   └── context.ts             # Context type definition + factory
├── handlers/
│   ├── asset-handler.ts       # Serves static assets (CSS, JS)
│   ├── directory-handler.ts  # Directory listings + file uploads
│   └── file-handler.ts        # Static file serving
├── middleware/
│   ├── body-collector.ts      # Collects request body into Buffer
│   ├── logger.ts              # Request logging (with debug mode support)
│   ├── router.ts              # Routes to appropriate handler
│   └── security.ts            # Directory traversal protection
├── utils/
│   ├── format.ts              # File size formatting
│   ├── mime.ts                # MIME type detection
│   ├── multipart.ts           # Multipart form-data parser
│   └── network.ts             # Local IP detection for LAN access
├── views/
│   └── directory-listing.ts  # HTML generation for directory pages
├── server.ts                  # HTTP server with middleware pipeline
└── serve.ts                   # CLI entry point (main(), exports)
```

## Module Specifications

### config/config.ts

**Interfaces:**
```typescript
interface Config {
  port: number;
  root: string;
  debug: boolean;
}
```

**Exports:**
- `parseArgs(): Config` - Parses CLI args and environment variables
- `printHelp(): void` - Displays help screen
- `validateConfig(config: Config): void` - Validates root directory exists

**Dependencies:** None

### context/context.ts

**Interface:**
```typescript
interface Context {
  config: Config;
  req: http.IncomingMessage;
  res: http.ServerResponse;
  body: Buffer | null;
  requestPath: string;
  filePath: string;
  parsedUrl: url.UrlWithParsedQuery;
  utils: {
    getMimeType: (filePath: string) => string;
    formatFileSize: (bytes: number) => string;
  };
  log: (message: string) => void;
}
```

**Exports:**
- `createContext(req: IncomingMessage, res: ServerResponse, config: Config): Context`

**Dependencies:** `config.ts`

### middleware/body-collector.ts

**Middleware Signature:**
```typescript
function bodyCollector(ctx: Context, next: () => Promise<void>): Promise<void>
```

**Behavior:**
- Collects request data chunks into Buffer
- Attaches to `ctx.body`
- Passes control to `next()`

**Dependencies:** `context.ts`

### middleware/logger.ts

**Middleware Signature:**
```typescript
function logger(ctx: Context, next: () => Promise<void>): Promise<void>
```

**Behavior:**
- Logs requests in format: `METHOD PATH STATUS_CODE`
- Skips logging for `/_httpoint_assets/` unless `ctx.config.debug` is true
- Logs POST body when debug mode enabled
- Logs response status after handler completes

**Dependencies:** `context.ts`

### middleware/security.ts

**Middleware Signature:**
```typescript
function security(ctx: Context, next: () => Promise<void>): Promise<void>
```

**Behavior:**
- Validates `ctx.filePath` starts with `ctx.config.root`
- Returns 403 Forbidden if validation fails
- Otherwise passes to `next()`

**Dependencies:** `context.ts`

### middleware/router.ts

**Middleware Signature:**
```typescript
function router(ctx: Context, next: () => Promise<void>): Promise<void>
```

**Behavior:**
- Routes based on request path:
  - `/_httpoint_assets/*` → assetHandler
  - Directory → directoryHandler
  - File → fileHandler
- Does NOT call `next()` (terminates pipeline)

**Dependencies:**
- `context.ts`
- `../handlers/asset-handler.ts`
- `../handlers/directory-handler.ts`
- `../handlers/file-handler.ts`

### handlers/asset-handler.ts

**Handler Signature:**
```typescript
function assetHandler(ctx: Context): Promise<void>
```

**Behavior:**
- Extracts asset path from `requestPath` (strip `/_httpoint_assets/`)
- Resolves to `__dirname/_httpoint_assets/`
- Sets appropriate Content-Type header
- Streams file to response using `fs.createReadStream().pipe(res)`
- Returns 404 if asset not found

**Dependencies:** `context.ts`, `../utils/mime.ts`

### handlers/directory-handler.ts

**Handler Signature:**
```typescript
function directoryHandler(ctx: Context): Promise<void>
```

**Behavior:**
- **GET request:** Generates and serves HTML directory listing
- **POST request:** Handles multipart file uploads
  - Validates Content-Type is `multipart/form-data`
  - Parses boundary from Content-Type header
  - Uses multipart parser to extract files
  - Writes files to directory
  - Returns 200 on success, 400/500 on errors

**Dependencies:**
- `context.ts`
- `../utils/multipart.ts`
- `../views/directory-listing.ts`

### handlers/file-handler.ts

**Handler Signature:**
```typescript
function fileHandler(ctx: Context): Promise<void>
```

**Behavior:**
- Gets MIME type for file
- Sets Content-Type header
- Streams file to response using `fs.createReadStream().pipe(res)`
- Returns 404 if file not found

**Dependencies:** `context.ts`, `../utils/mime.ts`

### utils/mime.ts

**Exports:**
- `getMimeType(filePath: string): string` - Returns MIME type based on file extension

**Dependencies:** None

### utils/format.ts

**Exports:**
- `formatFileSize(bytes: number): string` - Converts bytes to B/KB/MB/GB/TB

**Dependencies:** None

### utils/multipart.ts

**Interfaces:**
```typescript
interface MultipartPart {
  name: string;
  filename: string;
  data: Buffer;
}
```

**Exports:**
- `parseMultipart(body: Buffer, boundary: string): MultipartPart[]` - Parses multipart form-data

**Dependencies:** None

### utils/network.ts

**Interfaces:**
```typescript
interface NetworkAddress {
  family: string;
  internal: boolean;
  address: string;
}
```

**Exports:**
- `getLocalIP(): string` - Returns non-internal IPv4 address for LAN access

**Dependencies:** None

### views/directory-listing.ts

**Exports:**
- `generateDirectoryListing(dirPath: string, requestPath: string): string` - Generates HTML for directory page

**Dependencies:** `../utils/format.ts`

### server.ts

**Exports:**
- `createServer(config: Config): http.Server`

**Behavior:**
- Creates http.Server
- Builds middleware pipeline:
  1. bodyCollector
  2. security
  3. logger
  4. router (routes to handlers)
- Handles errors from pipeline (returns 500)

**Dependencies:**
- `config/config.ts`
- `context/context.ts`
- `./middleware/body-collector.ts`
- `./middleware/security.ts`
- `./middleware/logger.ts`
- `./middleware/router.ts`

### serve.ts (Modified)

**Exports:**
- `createServer: typeof import('./server').createServer`
- `parseArgs: typeof import('./config/config').parseArgs`

**Behavior:**
- Calls `parseArgs()` to get config
- Validates config
- Creates server via `createServer(config)`
- Gets local IP via `getLocalIP()`
- Starts server on `0.0.0.0:port`
- Logs server URLs (localhost + network)
- Sets up SIGINT handler for graceful shutdown

**Dependencies:**
- `./config/config.ts`
- `./server.ts`
- `./utils/network.ts`

## Middleware Pipeline Flow

```
Request
  ↓
[1] bodyCollector - buffers request body into ctx.body
  ↓
[2] security - validates path (returns 403 if invalid)
  ↓
[3] logger - logs request (logs response after handler)
  ↓
[4] router - dispatches to appropriate handler
  ├─→ assetHandler (serves CSS/JS)
  ├─→ directoryHandler (listings + uploads)
  └─→ fileHandler (static files)
  ↓
Response sent
```

## Implementation Order

### Phase 1: Utils and Views (No dependencies on app code)
1. `utils/mime.ts` - Move `getMimeType` from serve.ts
2. `utils/format.ts` - Move `formatFileSize` from serve.ts
3. `utils/multipart.ts` - Move `parseMultipart` from serve.ts
4. `utils/network.ts` - Move IP detection logic from serve.ts:336-349
5. `views/directory-listing.ts` - Extract `generateDirectoryListing` from serve.ts

### Phase 2: Config and Context (Foundational types)
6. `config/config.ts` - Extract config interface and parsing
7. `context/context.ts` - Create Context type and factory

### Phase 3: Middleware (Independent, testable)
8. `middleware/body-collector.ts` - Extract body collection logic (serve.ts:231-236)
9. `middleware/security.ts` - Extract path validation (serve.ts:242-247)
10. `middleware/logger.ts` - Extract logging logic (scattered through serve.ts)

### Phase 4: Handlers (Use utils, no middleware dependencies)
11. `handlers/asset-handler.ts` - Extract asset serving (serve.ts:250-263)
12. `handlers/file-handler.ts` - Extract file serving (serve.ts:299-306)
13. `handlers/directory-handler.ts` - Extract directory handling (serve.ts:265-298)

### Phase 5: Router and Server (Orchestration)
14. `middleware/router.ts` - Create routing logic based on request path
15. `server.ts` - Create server with middleware pipeline (serve.ts:225-323)

### Phase 6: Entry Point
16. `serve.ts` - Refactor to use new modules, keep CLI logic

## Testing Strategy

Since no test framework exists yet, each module should be designed to be:

1. **Pure functions** (utils, views): Easy to test with simple input/output
2. **Middleware**: Test context mutations and next() calls
3. **Handlers**: Test response states given various Context inputs
4. **Config**: Test argument parsing with different CLI args

## Migration Notes

### Breaking Changes
- `parseArgs()` and `createServer()` exports remain same - backwards compatible
- Internal structure completely changed

### Code to Delete from serve.ts
- Lines 15-25: Interface definitions (moved to context/config)
- Lines 27-81: parseArgs() and printHelp() (moved to config)
- Lines 83-101: getMimeType() (moved to utils/mime)
- Lines 103-112: formatFileSize() (moved to utils/format)
- Lines 114-162: parseMultipart() (moved to utils/multipart)
- Lines 164-223: generateDirectoryListing() (moved to views)
- Lines 225-323: createServer() logic (moved to server)
- Lines 336-349: IP detection (moved to utils/network)

### Code to Keep in serve.ts
- main() function (lines 325-366) - refactored to use imports
- exports for CLI compatibility
- Shebang line

## File Size Estimates

- `config/config.ts`: ~80 lines
- `context/context.ts`: ~30 lines
- `middleware/*.ts`: ~40-60 lines each
- `handlers/*.ts`: ~60-100 lines each
- `utils/*.ts`: ~20-40 lines each
- `views/directory-listing.ts`: ~60 lines
- `server.ts`: ~60 lines
- `serve.ts`: ~40 lines (from 373)

Total: ~700 lines (vs 373 current - due to better organization and imports)

## Post-Implementation Considerations

1. **Add ESLint ignore patterns** for new folders if needed
2. **Update build script** to ensure TypeScript compiles all files
3. **Consider adding tests** using Jest or similar (future work)
4. **Update AGENTS.md** with new file locations for reference
