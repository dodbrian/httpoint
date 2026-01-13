# HTTPoint - Project Specification

## Overview
HTTPoint is a cross-platform Node.js command-line application that serves static files from a local directory via HTTP.

### Core Features
- Serves static files from a configurable root directory
- Provides directory browsing with file listings
- Configurable via environment variables or command-line arguments
- Lightweight implementation using Node.js built-in modules

## Functionality

### File Serving
- Serves files relative to the configured root directory
- Returns appropriate HTTP status codes (200 for success, 404 for not found)
- Supports all file types (binary and text)

### Directory Listing
When accessing a directory path, the server provides an HTML page with:
- **File links**: Clickable links that serve/download the file, with file sizes displayed in human-readable format (B, KB, MB, GB, TB)
- **Directory links**: Clickable links to navigate into subdirectories
- **Navigation**: Parent directory navigation (when not at root)
- **File Upload**: A circular button in the bottom-right corner for uploading files to the current directory

### File Upload
The directory listing page includes a file upload feature:
- **Upload Button**: Circular button with a plus icon in the bottom-right corner
- **Upload Overlay**: Clicking the button opens an overlay with:
  - Drag-and-drop area for files
  - Browse file input field
  - Ability to select multiple files
  - Close button in the top right corner
  - Can be closed by pressing the ESC key
- **Upload Process**:
  - Upload starts immediately upon file selection
  - Progress bar displays upload status for each file
  - Users can add more files during upload
  - No additional confirmation required
- **Completion**: Users can close the overlay to return to the updated directory listing showing newly uploaded files

#### Implementation Details
The file upload process is implemented using the following technical approach:

**HTTP Protocol**:
- Uses HTTP POST method with `multipart/form-data` content type
- Files are uploaded to the same path as the current directory being viewed
- Request body is collected as raw binary data (Buffer) before processing begins
- Multipart data contains mixed content: text headers (Content-Disposition, boundaries) and binary file data

**Multipart Form Data Format (RFC 2388)**:
- **Structure**: Data is divided into parts separated by boundary strings
- **Boundaries**: Each part begins with `--boundary\r\n` and ends with `\r\n--boundary--\r\n`
- **Part Format**: Each part contains headers followed by `\r\n\r\n` then the body content
- **Content-Disposition**: Header specifies `form-data; name="fieldName"; filename="originalName"`
- **Text Content**: Headers and metadata are sent as UTF-8 text with CRLF line endings
- **Binary Content**: File data is included as raw binary bytes without encoding
- **Content-Type**: May include `Content-Type` header for files (e.g., `image/jpeg`, `text/plain`)
- **Mixed Representation**: The same multipart stream contains both human-readable text (headers) and raw binary (file contents)

**Server-Side Processing**:
- Custom multipart parser extracts file data from the request body
- Files are written synchronously to disk using Node.js fs promises
- File names are preserved exactly as provided by the client
- Existing files with the same name are overwritten without confirmation
- All files in a single upload are processed sequentially

**Custom Multipart Parser**:
- **Boundary Detection**: Identifies multipart boundaries using `Buffer.from('--' + boundary)` and `Buffer.from('--' + boundary + '--')` for start and end markers
- **Part Extraction**: Iteratively finds each part between boundaries using `body.indexOf()` to locate boundary positions
- **Header Parsing**: Splits each part into headers and data using `part.indexOf('\r\n\r\n')` as the delimiter
- **Content-Disposition Processing**: Extracts `filename` and `name` values from the `Content-Disposition` header using regex patterns `/filename="([^"]+)"/` and `/name="([^"]+)"/`
- **Data Extraction**: Captures file content by slicing the buffer after the header section (`part.slice(headerEnd + 4)`)
- **Part Collection**: Builds an array of objects containing `name`, `filename`, and `data` for each successfully parsed file part
- **Termination Logic**: Stops parsing when the end boundary is encountered or no more boundaries are found

**Progress Tracking**:
- Real-time upload progress is tracked on the client side using XMLHttpRequest
- Progress bar displays upload completion percentage as files are transmitted
- Progress feedback is provided during the upload process
- Progress tracking is handled entirely by the browser's XMLHttpRequest API

**Error Handling**:
- Directory traversal attempts return 403 Forbidden
- Missing or invalid multipart boundary returns 400 Bad Request
- Invalid content-type header returns 400 Bad Request
- File system errors during writing return 500 Internal Server Error
- Successful uploads return 200 OK with plain text confirmation message

**Security Considerations**:
- **Directory Traversal Protection**: File access is restricted to the configured root directory using path validation. When a request is made, the server constructs the full file path by joining the root directory with the requested path. If the resulting path doesn't start with the root directory (indicating an attempt to access files outside the allowed area using relative path sequences like `../`), the request is blocked with HTTP 403 Forbidden
- No file name sanitization is performed
- No file type restrictions are enforced (all file types allowed)
- No upload size limits are implemented (limited by system memory and disk space)

**Client-Server Communication**:
- **File Upload**: Request body is received in chunks and buffered entirely before processing, followed by a simple text response
- **File Serving**: Uses streaming responses with `fs.createReadStream().pipe()` for efficient file transfer in chunks
- Upload response is plain text: "Files uploaded successfully"
- No detailed metadata about uploaded files is returned
- Error responses contain simple text messages

**Directory Synchronization**:
- Automatic page refresh occurs after successful upload using `location.reload()`
- Users see newly uploaded files immediately without manual navigation
- File metadata is updated by the operating system automatically

### Logging
All HTTP requests are logged to STDOUT in the format:
```
METHOD PATH STATUS_CODE
```
Example: `GET /index.html 200`

Requests to the `/_httpoint_assets/` path (static assets like CSS, JS files) are only logged when debug mode is enabled (using `--debug` flag) to reduce noise in normal operation.

For POST requests, the request body is also logged to STDOUT when debug mode is enabled (using `--debug` flag).
Example: `POST body for /: [body content]`

## Configuration

### Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `HTTPOINT_PORT` | Port number to listen on | `3000` |
| `HTTPOINT_ROOT` | Root directory to serve files from | Current working directory |

### Command Line Arguments
- `--port <number>`: Override the port number
- `--path <directory>`: Override the root directory path
- `--debug`: Enable debug mode for verbose logging (e.g., POST body logging)
- `--help`: Display help information and exit

**Note**: Command-line arguments take precedence over environment variables.

## Usage

### Help Screen
The help screen displays the current version of HTTPoint, retrieved from package.json, in the format "HTTPoint vX.Y.Z - Simple HTTP file server".

### Installation
To enable running HTTPoint with `npx` on any computer, the package must be published to the npm registry. Follow these steps:

1. Ensure the package is properly configured in `package.json` with a unique name and the `bin` field pointing to `src/serve.js`.
2. Publish the package to npm using:
   ```bash
   npm publish
   ```
   (Note: You must be logged in to npm and the package name must be available.)

Once published, users can install globally or run directly with `npx`:
```bash
npm install -g httpoint
```

### Running the Server

**Default configuration:**
```bash
npx httpoint
```

**With environment variables:**
```bash
HTTPOINT_PORT=8080 HTTPOINT_ROOT=/var/www npx httpoint
```

**With command-line arguments:**
```bash
npx httpoint --port 8080 --path /var/www
```

**Mixed configuration:**
```bash
HTTPOINT_ROOT=/var/www npx httpoint --port 8080
```

### Development Usage
For local development, you can also run directly:
```bash
node serve.js [options]
```

### Accessing the Server
Once running, the server will be available at:
- **Locally**: `http://localhost:<port>/`
- **On LAN**: `http://<actual-ip-address>:<port>/`

The server automatically detects and displays the local IP address, and binds to all network interfaces (0.0.0.0), making it accessible from other devices on the local network.

## Technical Requirements
- **Runtime**: Node.js (version 14+ recommended)
- **Dependencies**: None (uses only Node.js built-in modules)
- **Modules**: `http`, `fs`, `path`, `url`
- **Cross-platform**: Compatible with Windows, macOS, and Linux
- **Language**: TypeScript (compiled to JavaScript for distribution)

## Architecture

The codebase is organized into modular components with clear separation of concerns:

- **Config Module** (`config/config.ts`): Handles configuration parsing and validation from CLI arguments and environment variables
- **Context Module** (`context/context.ts`): Defines the Context type used throughout the middleware pipeline and provides a factory function
- **Middleware Pipeline** (`middleware/`): Chain of functions that process requests sequentially:
  - `body-collector.ts`: Buffers request body into memory
  - `security.ts`: Validates file paths to prevent directory traversal attacks
  - `logger.ts`: Logs requests and responses with configurable debug output
  - `router.ts`: Dispatches requests to appropriate handlers based on path
- **Handlers** (`handlers/`): Route-specific request processors:
  - `asset-handler.ts`: Serves static CSS/JS assets
  - `directory-handler.ts`: Generates directory listings and handles file uploads
  - `file-handler.ts`: Serves static files
- **Utils** (`utils/`): Pure utility functions:
  - `mime.ts`: MIME type detection
  - `format.ts`: File size formatting
  - `multipart.ts`: Multipart form-data parser
  - `network.ts`: Local IP detection
- **Views** (`views/`): HTML template generation for UI elements
- **Server** (`server.ts`): HTTP server orchestrator that assembles the middleware pipeline

The middleware pipeline processes each request in order: body collection → security validation → logging → routing → handler execution. This architecture allows easy addition or removal of middleware components and keeps handlers focused on their specific responsibilities.

For detailed implementation specifications, see `docs/modularization-plan.md`.

## Author
Denis Zimin

## License
MIT © 2025-2026
