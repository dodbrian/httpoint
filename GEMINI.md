# Project Overview

This project, "HTTPoint," is a lightweight, zero-dependency Node.js command-line application designed to serve static files from a local directory over HTTP. It provides a simple and efficient way to share files, browse directories, and perform file uploads within a local network.

## Key Features:

*   **Static File Serving:** Serves files from any specified local directory.
*   **Directory Browsing:** Generates and displays a browsable directory listing in the browser.
*   **File Uploads:** Allows users to upload files to the server via a web interface.
*   **Configurability:** Server port and root directory can be configured via command-line arguments or environment variables.
*   **Security:** Includes basic protection against directory traversal attacks.
*   **Networking:** Accessible from the local machine (`localhost`) and the local area network (LAN).

## Architecture:

The application is a single-file Node.js script (`serve.js`) that uses only the built-in `http`, `fs`, `path`, `url`, and `crypto` modules. It does not have any external dependencies, making it highly portable and easy to run.

The server handles both GET and POST requests. GET requests are used for serving files and directory listings, while POST requests are used for handling file uploads.

# Building and Running

## Installation:

As there are no external dependencies, the only prerequisite is to have Node.js (version 14.0.0 or higher) installed.

## Running the Application:

The server can be started using the following `npm` script:

```bash
npm start
```

Alternatively, you can run the `serve.js` file directly with `node`:

```bash
node serve.js
```

## Configuration:

The server can be configured with the following options:

*   **Port:**
    *   Command-line argument: `--port <number>`
    *   Environment variable: `HTTPOINT_PORT`
    *   Default: `3000`
*   **Root Directory:**
    *   Command-line argument: `--path <directory>`
    *   Environment variable: `HTTPOINT_ROOT`
    *   Default: The current working directory.

Example:

```bash
node serve.js --port 8080 --path /path/to/serve
```

## Testing:

The `package.json` file does not define a formal test script. To test the server, you can start it and use a tool like `curl` to make requests to it, as suggested in the `README.md` file.

```bash
# In one terminal, start the server
node serve.js --port 3000

# In another terminal, test the server
curl http://localhost:3000/
```

# Development Conventions

*   **Code Style:** The code is written in a clean, functional style with clear and concise functions. It uses modern JavaScript features like `async/await` and `const/let`.
*   **Dependencies:** The project intentionally has no external dependencies, relying solely on the Node.js standard library.
*   **Error Handling:** The server includes basic error handling for common issues like file not found (`ENOENT`) and internal server errors.
*   **Security:** A security check is in place to prevent directory traversal attacks by ensuring that the resolved file path is within the specified root directory.
