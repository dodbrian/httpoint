# HTTPoint - Project Specification

## Overview
HTTPoint is a Node.js command-line application that serves static files from a local directory via HTTP.

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
- **File links**: Clickable links that serve/download the file
- **Directory links**: Clickable links to navigate into subdirectories
- **Navigation**: Parent directory navigation (when not at root)

### Logging
All HTTP requests are logged to STDOUT in the format:
```
METHOD PATH STATUS_CODE
```
Example: `GET /index.html 200`

## Configuration

### Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `HTTPOINT_PORT` | Port number to listen on | `3000` |
| `HTTPOINT_ROOT` | Root directory to serve files from | Current working directory |

### Command Line Arguments
- `--port <number>`: Override the port number
- `--path <directory>`: Override the root directory path

**Note**: Command-line arguments take precedence over environment variables.

## Usage

### Installation
To enable running HTTPoint with `npx` on any computer, the package must be published to the npm registry. Follow these steps:

1. Ensure the package is properly configured in `package.json` with a unique name and the `bin` field pointing to `serve.js`.
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

## Author
Denis Zimin

## License
MIT © 2025
