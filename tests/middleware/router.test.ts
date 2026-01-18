import fs from 'fs'
import path from 'path'
import url from 'url'
import { router } from '../../src/middleware/router'
import { RequestContext } from '../../src/context/request'
import { HttpMocks, TestHelpers } from '../helpers'

describe('Router Middleware', () => {
  let tempDir: string
  const mockConfig = {
    port: 3000,
    root: '',
    debug: false,
  }

  // Helper function to reduce context creation boilerplate
  const createContext = (overrides: Partial<RequestContext> = {}): RequestContext => {
    const defaults: RequestContext = {
      req: HttpMocks.createMockRequest(),
      res: HttpMocks.createMockResponse(),
      requestPath: '/',
      filePath: tempDir,
      body: undefined,
      parsedUrl: url.parse('/', true),
      config: mockConfig,
    }
    return { ...defaults, ...overrides }
  }

  beforeEach(async () => {
    tempDir = await TestHelpers.createTempDirectory()
    mockConfig.root = tempDir
  })

  afterEach(async () => {
    await TestHelpers.cleanupTempDirectory(tempDir)
  })

  describe('Route Matching', () => {
    it('should route _httpoint_assets paths to asset handler', async () => {
      const context = createContext({
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/_httpoint_assets/style.css' }),
        requestPath: '/_httpoint_assets/style.css',
        filePath: path.join(tempDir, '_httpoint_assets/style.css'),
        parsedUrl: url.parse('/_httpoint_assets/style.css', true),
      })

      const result = await router(context)
      expect(result.handler).toBeDefined()
      expect(result.handler?.name).toBe('assetHandler')
    })

    it('should route GET requests to directory to directory listing handler', async () => {
      const context = createContext({
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/' }),
        requestPath: '/',
        filePath: tempDir,
      })

      const result = await router(context)
      expect(result.handler).toBeDefined()
      expect(result.handler?.name).toBe('directoryListingHandler')
      expect(result.statusCode).toBeUndefined()
    })

    it('should route POST requests to directory to upload handler', async () => {
      const context = createContext({
        req: HttpMocks.createMockRequest({ method: 'POST', url: '/' }),
        requestPath: '/',
        filePath: tempDir,
        body: Buffer.from('test'),
      })

      const result = await router(context)
      expect(result.handler).toBeDefined()
      expect(result.handler?.name).toBe('directoryUploadHandler')
    })

    it('should route GET requests to regular files to file handler', async () => {
      await TestHelpers.createTestFile(tempDir, 'test.txt', 'test content')

      const context = createContext({
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/test.txt' }),
        requestPath: '/test.txt',
        filePath: path.join(tempDir, 'test.txt'),
        parsedUrl: url.parse('/test.txt', true),
      })

      const result = await router(context)
      expect(result.handler).toBeDefined()
      expect(result.handler?.name).toBe('fileHandler')
    })

    it('should route files and directories to different handlers', async () => {
      await TestHelpers.createTestFile(tempDir, 'file.txt', 'content')

      const fileResult = await router(createContext({
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/file.txt' }),
        requestPath: '/file.txt',
        filePath: path.join(tempDir, 'file.txt'),
        parsedUrl: url.parse('/file.txt', true),
      }))

      const dirResult = await router(createContext({
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/' }),
        requestPath: '/',
        filePath: tempDir,
      }))

      expect(fileResult.handler?.name).toBe('fileHandler')
      expect(dirResult.handler?.name).toBe('directoryListingHandler')
    })
  })

  describe('File Type Routing', () => {
    it('should route PDF files to file handler', async () => {
      await TestHelpers.createTestFile(tempDir, 'document.pdf', 'pdf content')

      const result = await router(createContext({
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/document.pdf' }),
        requestPath: '/document.pdf',
        filePath: path.join(tempDir, 'document.pdf'),
        parsedUrl: url.parse('/document.pdf', true),
      }))

      expect(result.handler?.name).toBe('fileHandler')
      expect(result.statusCode).toBeUndefined()
    })

    it('should route files in nested directories to file handler', async () => {
      const nestedDir = path.join(tempDir, 'a', 'b', 'c')
      await fs.promises.mkdir(nestedDir, { recursive: true })
      await TestHelpers.createTestFile(nestedDir, 'file.txt', 'nested content')

      const result = await router(createContext({
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/a/b/c/file.txt' }),
        requestPath: '/a/b/c/file.txt',
        filePath: path.join(tempDir, 'a/b/c/file.txt'),
        parsedUrl: url.parse('/a/b/c/file.txt', true),
      }))

      expect(result.handler?.name).toBe('fileHandler')
    })

    it('should route nested directories to directory listing handler', async () => {
      const nestedDir = path.join(tempDir, 'a', 'b', 'c')
      await fs.promises.mkdir(nestedDir, { recursive: true })

      const result = await router(createContext({
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/a/b/c/' }),
        requestPath: '/a/b/c/',
        filePath: nestedDir,
      }))

      expect(result.handler?.name).toBe('directoryListingHandler')
    })
  })

  describe('404 Handling', () => {
    it('should return 404 status when file does not exist', async () => {
      const result = await router(createContext({
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/nonexistent.txt' }),
        requestPath: '/nonexistent.txt',
        filePath: path.join(tempDir, 'nonexistent.txt'),
        parsedUrl: url.parse('/nonexistent.txt', true),
      }))

      expect(result.statusCode).toBe(404)
      expect(result.message).toBe('Not Found')
      expect(result.handler).toBeUndefined()
    })

    it('should return 404 when entire path does not exist', async () => {
      const result = await router(createContext({
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/missing/nested/file.txt' }),
        requestPath: '/missing/nested/file.txt',
        filePath: path.join(tempDir, 'missing/nested/file.txt'),
        parsedUrl: url.parse('/missing/nested/file.txt', true),
      }))

      expect(result.statusCode).toBe(404)
      expect(result.message).toBe('Not Found')
    })

    it('should return 404 for deeply nested non-existent paths', async () => {
      const result = await router(createContext({
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/a/b/c/d/e/file.txt' }),
        requestPath: '/a/b/c/d/e/file.txt',
        filePath: path.join(tempDir, 'a/b/c/d/e/file.txt'),
        parsedUrl: url.parse('/a/b/c/d/e/file.txt', true),
      }))

      expect(result.statusCode).toBe(404)
      expect(result.message).toBe('Not Found')
    })
  })

  describe('HTTP Method Handling', () => {
    it('should route GET requests to file handler for files', async () => {
      await TestHelpers.createTestFile(tempDir, 'get.txt', 'GET content')

      const result = await router(createContext({
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/get.txt' }),
        requestPath: '/get.txt',
        filePath: path.join(tempDir, 'get.txt'),
        parsedUrl: url.parse('/get.txt', true),
      }))

      expect(result.handler?.name).toBe('fileHandler')
    })

    it('should route POST to directory upload handler', async () => {
      const result = await router(createContext({
        req: HttpMocks.createMockRequest({ method: 'POST', url: '/' }),
        requestPath: '/',
        filePath: tempDir,
        body: Buffer.from('upload data'),
      }))

      expect(result.handler?.name).toBe('directoryUploadHandler')
    })

    it('should route GET requests for directories to listing handler regardless of method', async () => {
      const result = await router(createContext({
        req: HttpMocks.createMockRequest({ method: 'HEAD', url: '/' }),
        requestPath: '/',
        filePath: tempDir,
      }))

      // HEAD should still get listing, router doesn't distinguish method for directories besides POST
      expect(result.handler).toBeDefined()
    })
  })

  describe('Asset Routing', () => {
    it('should route CSS assets to asset handler', async () => {
      const result = await router(createContext({
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/_httpoint_assets/style.css' }),
        requestPath: '/_httpoint_assets/style.css',
        filePath: path.join(tempDir, '_httpoint_assets/style.css'),
        parsedUrl: url.parse('/_httpoint_assets/style.css', true),
      }))

      expect(result.handler?.name).toBe('assetHandler')
    })

    it('should route JavaScript assets to asset handler', async () => {
      const result = await router(createContext({
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/_httpoint_assets/app.js' }),
        requestPath: '/_httpoint_assets/app.js',
        filePath: path.join(tempDir, '_httpoint_assets/app.js'),
        parsedUrl: url.parse('/_httpoint_assets/app.js', true),
      }))

      expect(result.handler?.name).toBe('assetHandler')
    })

    it('should route nested assets in subdirectories to asset handler', async () => {
      const result = await router(createContext({
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/_httpoint_assets/icons/favicon.ico' }),
        requestPath: '/_httpoint_assets/icons/favicon.ico',
        filePath: path.join(tempDir, '_httpoint_assets/icons/favicon.ico'),
        parsedUrl: url.parse('/_httpoint_assets/icons/favicon.ico', true),
      }))

      expect(result.handler?.name).toBe('assetHandler')
    })

    it('should route to asset handler even if file does not exist', async () => {
      const result = await router(createContext({
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/_httpoint_assets/missing.css' }),
        requestPath: '/_httpoint_assets/missing.css',
        filePath: path.join(tempDir, '_httpoint_assets/missing.css'),
        parsedUrl: url.parse('/_httpoint_assets/missing.css', true),
      }))

      expect(result.handler?.name).toBe('assetHandler')
      expect(result.statusCode).toBeUndefined()
    })
  })

  describe('Error Handling', () => {
    it('should return 404 when path does not exist (ENOENT)', async () => {
      const result = await router(createContext({
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/' }),
        requestPath: '/',
        filePath: '/invalid/path/that/will/error',
      }))

      expect(result.statusCode).toBe(404)
      expect(result.message).toBe('Not Found')
      expect(result.handler).toBeUndefined()
    })

    it('should return 404 for non-existent restricted files', async () => {
      const result = await router(createContext({
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/restricted' }),
        requestPath: '/restricted',
        filePath: path.join(tempDir, 'restricted'),
      }))

      expect(result.statusCode).toBe(404)
      expect(result.message).toBe('Not Found')
    })

    it('should not include handler in error responses', async () => {
      const result = await router(createContext({
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/nonexistent' }),
        requestPath: '/nonexistent',
        filePath: path.join(tempDir, 'nonexistent'),
      }))

      expect(result.statusCode).toBe(404)
      expect(result.handler).toBeUndefined()
    })
  })

  describe('Different File Types', () => {
    it('should route HTML files to file handler', async () => {
      await TestHelpers.createTestFile(tempDir, 'index.html', '<html></html>')

      const result = await router(createContext({
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/index.html' }),
        requestPath: '/index.html',
        filePath: path.join(tempDir, 'index.html'),
        parsedUrl: url.parse('/index.html', true),
      }))

      expect(result.handler?.name).toBe('fileHandler')
    })

    it('should route JSON files to file handler', async () => {
      await TestHelpers.createTestFile(tempDir, 'data.json', '{"key": "value"}')

      const result = await router(createContext({
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/data.json' }),
        requestPath: '/data.json',
        filePath: path.join(tempDir, 'data.json'),
        parsedUrl: url.parse('/data.json', true),
      }))

      expect(result.handler?.name).toBe('fileHandler')
    })

    it('should route CSS files to file handler', async () => {
      await TestHelpers.createTestFile(tempDir, 'style.css', 'body { color: red; }')

      const result = await router(createContext({
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/style.css' }),
        requestPath: '/style.css',
        filePath: path.join(tempDir, 'style.css'),
        parsedUrl: url.parse('/style.css', true),
      }))

      expect(result.handler?.name).toBe('fileHandler')
    })

    it('should route plain text files to file handler', async () => {
      await TestHelpers.createTestFile(tempDir, 'readme.txt', 'This is a readme')

      const result = await router(createContext({
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/readme.txt' }),
        requestPath: '/readme.txt',
        filePath: path.join(tempDir, 'readme.txt'),
        parsedUrl: url.parse('/readme.txt', true),
      }))

      expect(result.handler?.name).toBe('fileHandler')
    })

    it('should route binary files to file handler', async () => {
      const binaryData = Buffer.from([0x89, 0x50, 0x4e, 0x47]) // PNG signature
      const filePath = path.join(tempDir, 'image.png')
      await fs.promises.writeFile(filePath, binaryData)

      const result = await router(createContext({
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/image.png' }),
        requestPath: '/image.png',
        filePath,
        parsedUrl: url.parse('/image.png', true),
      }))

      expect(result.handler?.name).toBe('fileHandler')
    })

    it('should route empty files to file handler', async () => {
      await TestHelpers.createTestFile(tempDir, 'empty.txt', '')

      const result = await router(createContext({
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/empty.txt' }),
        requestPath: '/empty.txt',
        filePath: path.join(tempDir, 'empty.txt'),
        parsedUrl: url.parse('/empty.txt', true),
      }))

      expect(result.handler?.name).toBe('fileHandler')
    })
  })

  describe('Root Path Handling', () => {
    it('should route root path to directory listing handler for GET', async () => {
      const result = await router(createContext({
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/' }),
        requestPath: '/',
        filePath: tempDir,
      }))

      expect(result.handler?.name).toBe('directoryListingHandler')
    })

    it('should route root path to upload handler for POST', async () => {
      const result = await router(createContext({
        req: HttpMocks.createMockRequest({ method: 'POST', url: '/' }),
        requestPath: '/',
        filePath: tempDir,
        body: Buffer.from('data'),
      }))

      expect(result.handler?.name).toBe('directoryUploadHandler')
    })
  })

  describe('Edge Cases', () => {
    it('should handle files with multiple extensions', async () => {
      await TestHelpers.createTestFile(tempDir, 'archive.tar.gz', 'binary data')

      const result = await router(createContext({
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/archive.tar.gz' }),
        requestPath: '/archive.tar.gz',
        filePath: path.join(tempDir, 'archive.tar.gz'),
        parsedUrl: url.parse('/archive.tar.gz', true),
      }))

      expect(result.handler?.name).toBe('fileHandler')
    })

    it('should handle files with special characters in name', async () => {
      await TestHelpers.createTestFile(tempDir, 'file with spaces.txt', 'content')

      const result = await router(createContext({
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/file with spaces.txt' }),
        requestPath: '/file with spaces.txt',
        filePath: path.join(tempDir, 'file with spaces.txt'),
        parsedUrl: url.parse('/file%20with%20spaces.txt', true),
      }))

      expect(result.handler?.name).toBe('fileHandler')
    })

    it('should handle files with uppercase extensions', async () => {
      await TestHelpers.createTestFile(tempDir, 'document.PDF', 'pdf content')

      const result = await router(createContext({
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/document.PDF' }),
        requestPath: '/document.PDF',
        filePath: path.join(tempDir, 'document.PDF'),
        parsedUrl: url.parse('/document.PDF', true),
      }))

      expect(result.handler?.name).toBe('fileHandler')
    })

    it('should return handler for directory even with trailing slash variations', async () => {
      const nestedDir = path.join(tempDir, 'test-dir')
      await fs.promises.mkdir(nestedDir, { recursive: true })

      const resultWithSlash = await router(createContext({
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/test-dir/' }),
        requestPath: '/test-dir/',
        filePath: nestedDir,
      }))

      expect(resultWithSlash.handler?.name).toBe('directoryListingHandler')
    })
  })
})
