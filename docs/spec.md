# Project Specification

## Overview
This is a **Node.js** command-line application that serves static files from the local working directory.

- The application starts by listening on a configurable port (default `3000`).
- It uses the built-in `http` module to create an HTTP server.
- Requests are resolved relative to the current working directory. For example, requesting `/index.html` serves `<cwd>/index.html` if it exists.
- If a requested file does not exist, the server responds with **404 Not Found**.

## Directory Listing Features
When accessing a directory, the server provides:
- Clickable file links that initiate downloads when clicked
- Browsable directory links to navigate subdirectories
- The application logs each request to STDOUT in the format: `METHOD PATH STATUS_CODE`.

## Configuration
## Configuration

The following environment variables can be used to customize behavior:

| Variable | Description | Default |
|----------|-------------|---------|
| `HTTPOINT_PORT`   | Port number on which the server listens. | `3000` |
| `HTTPOINT_ROOT`   | Directory from which files are served. | Current working directory |

## Command Line Parameters

The application also supports command-line parameters for quick configuration:

- `--port <number>`: Specify the port number (default: `3000`)
- `--path <path>`: Specify the directory to serve (default: current working directory)

## Usage
```bash
# Install dependencies (if any)
npm install

# Run the server with environment variables
HTTPOINT_PORT=8080 HTTPOINT_ROOT=/path/to/directory node serve.js

# Run the server with command-line parameters
node serve.js --port 8080 --path /path/to/directory

# Run the server with default settings
node serve.js
```

The server will be available at `http://localhost:<port>/`.

## License
MIT © 2025
