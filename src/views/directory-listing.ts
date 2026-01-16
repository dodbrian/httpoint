import fs from 'fs';
import path from 'path';
import { formatFileSize } from '../utils/format';

/**
 * Generate HTML directory listing for a given directory path.
 * @param dirPath - Absolute path to the directory on disk
 * @param requestPath - HTTP request path (URL path)
 * @returns HTML string for directory listing page
 */
export function generateDirectoryListing(dirPath: string, requestPath: string): string {
  const files = fs.readdirSync(dirPath);
  const items: string[] = [];

  if (requestPath !== '/') {
    const parentPath = path.dirname(requestPath);
    const parentHref = parentPath === '/' ? '/' : parentPath;
    items.push(`<li><a href="${parentHref}">📁 ../</a></li>`);
  }

  const directories: string[] = [];
  const regularFiles: string[] = [];

  files.forEach((file: string) => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    const encodedFile = encodeURIComponent(file);
    const href = path.posix.join(requestPath, encodedFile);

    if (stat.isDirectory()) {
      directories.push(`<li><a href="${href}/">📁 ${file}/</a></li>`);
    } else {
      const size = formatFileSize(stat.size);
      regularFiles.push(`<li><a href="${href}">📄 ${file}</a> <span style="color: #666;">(${size})</span></li>`);
    }
  });

  const allItems = [...items, ...directories, ...regularFiles];

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Directory listing for ${requestPath}</title>
    <link rel="stylesheet" href="/_httpoint_assets/styles.css">
</head>
<body>
    <div class="header">
        <h1>Directory listing for ${requestPath}</h1>
    </div>
    <ul>
        ${allItems.join('\n        ')}
    </ul>
    <button class="upload-btn" id="uploadBtn">+</button>
    <div class="upload-overlay" id="uploadOverlay">
        <div class="upload-modal">
            <button class="close-btn" id="closeBtn">&times;</button>
            <h2>Upload Files</h2>
            <div class="drop-area" id="dropArea">Drag & drop files here or click to browse</div>
            <input type="file" class="file-input" id="fileInput" multiple style="display: none;">
            <div class="progress" id="progress">
                <div class="progress-bar" id="progressBar"></div>
            </div>
        </div>
    </div>
    <script src="/_httpoint_assets/script.js"></script>
</body>
</html>`;
}