# HTTPoint

A lightweight Node.js command-line application that serves static files from a local directory via HTTP.

## Features

- 🚀 Serves static files from any directory
- 📁 Directory browsing with file listings
- 🌐 Accessible on local network (LAN)
- ⚙️ Configurable via environment variables or CLI arguments
- 📝 Request logging
- 🔒 Security protection against directory traversal
- 💾 No external dependencies

## Installation

### Global Installation
```bash
npm install -g httpoint
```

### Local Development
```bash
git clone <repository-url>
cd httpoint
npm install
```

## Usage

### Quick Start
```bash
npx httpoint
```

### With Custom Port and Directory
```bash
npx httpoint --port 8080 --path /path/to/directory
```

### Using Environment Variables
```bash
HTTPOINT_PORT=8080 HTTPOINT_ROOT=/var/www npx httpoint
```

### All Options
```bash
# Command line arguments (take precedence)
npx httpoint --port 3000 --path ./public

# Environment variables
HTTPOINT_PORT=3000
HTTPOINT_ROOT=./public
```

## Configuration

| Option | CLI Argument | Environment Variable | Default |
|--------|--------------|---------------------|---------|
| Port | `--port <number>` | `HTTPOINT_PORT` | `3000` |
| Root Directory | `--path <directory>` | `HTTPOINT_ROOT` | Current directory |

## Accessing the Server

Once running, the server will be available at:
- **Locally**: `http://localhost:<port>/`
- **On LAN**: `http://<actual-ip-address>:<port>/`

The server automatically detects and displays your local IP address.

## Directory Listing

When accessing a directory, HTTPoint provides:
- 📁 Browsable directory links
- 📄 Clickable file links for download
- 📊 File sizes
- 🔙 Parent directory navigation

## Development

### Running Locally
```bash
node src/serve.js [options]
```

### Testing
```bash
# Start server in one terminal
node src/serve.js --port 3000

# Test in another terminal
curl http://localhost:3000/
```

## Requirements

- Node.js 14.0.0 or higher
- No external dependencies

## Author

Denis Zimin

## License

MIT © 2025
