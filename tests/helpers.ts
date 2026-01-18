import fs from 'fs'
import path from 'path'

// Test helper utilities
export class TestHelpers {
  static async createTempDirectory(): Promise<string> {
    const tmpDir = path.join(__dirname, '../temp', `test-${Date.now()}`)
    await fs.promises.mkdir(tmpDir, { recursive: true })
    return tmpDir
  }

  static async cleanupTempDirectory(dir: string): Promise<void> {
    try {
      await fs.promises.rm(dir, { recursive: true, force: true })
    } catch (err) {
      // Ignore cleanup errors
    }
  }

  static async createTestFile(dir: string, filename: string, content: string = 'test content'): Promise<string> {
    const filePath = path.join(dir, filename)
    await fs.promises.writeFile(filePath, content)
    return filePath
  }

  static createMockFileSystem(): Record<string, string> {
    return {
      'index.html': '<html><body>Test Index</body></html>',
      'style.css': 'body { margin: 0; }',
      'script.js': 'console.log("test");',
      'test.txt': 'This is a test file.',
      'subdir/nested.html': '<html><body>Nested</body></html>',
    }
  }

  static async populateTempDirectory(dir: string, files: Record<string, string>): Promise<void> {
    for (const [relativePath, content] of Object.entries(files)) {
      const fullPath = path.join(dir, relativePath)
      const parentDir = path.dirname(fullPath)
      
      await fs.promises.mkdir(parentDir, { recursive: true })
      await fs.promises.writeFile(fullPath, content)
    }
  }
}

// HTTP mock utilities
export class HttpMocks {
  static createMockRequest(overrides: Partial<any> = {}): any {
    return {
      method: 'GET',
      url: '/',
      headers: {
        'user-agent': 'test-agent',
        'content-type': 'application/octet-stream',
      },
      ...overrides,
    }
  }

  static createMockResponse(): any {
    const res: any = {
      statusCode: 200,
      headers: {},
      data: '',
      
      setHeader(name: string, value: string | string[]) {
        this.headers[name] = value
      },
      
      write(chunk: string | Buffer) {
        this.data += chunk
      },
      
      end(chunk?: string | Buffer) {
        if (chunk) this.data += chunk
        return this
      },
      
      writeHead(statusCode: number, headers?: Record<string, string | string[]>) {
        this.statusCode = statusCode
        if (headers) {
          Object.assign(this.headers, headers)
        }
      },
    }
    return res
  }

  static createMultipartData(fields: Array<{ name: string, filename?: string, data: string | Buffer }>): Buffer {
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
    const chunks: Buffer[] = []

    for (const field of fields) {
      chunks.push(Buffer.from(`--${boundary}\r\n`))
      
      if (field.filename) {
        chunks.push(Buffer.from(`Content-Disposition: form-data; name="${field.name}"; filename="${field.filename}"\r\n`))
        chunks.push(Buffer.from('Content-Type: application/octet-stream\r\n\r\n'))
      } else {
        chunks.push(Buffer.from(`Content-Disposition: form-data; name="${field.name}"\r\n\r\n`))
      }
      
      chunks.push(Buffer.isBuffer(field.data) ? field.data : Buffer.from(field.data))
      chunks.push(Buffer.from('\r\n'))
    }

    chunks.push(Buffer.from(`--${boundary}--\r\n`))
    return Buffer.concat(chunks)
  }
}

// Jest matchers
export const customMatchers = {
  toBeValidHtml(received: string) {
    const pass = received.includes('<html') && received.includes('</html>')
    return {
      message: () => `expected ${received} to ${pass ? 'not ' : ''}be valid HTML`,
      pass,
    }
  },

  toContainFileListing(received: string, filename: string) {
    const pass = received.includes(filename)
    return {
      message: () => `expected HTML ${pass ? 'not ' : ''}to contain file listing for ${filename}`,
      pass,
    }
  },
}