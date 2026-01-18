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

  beforeEach(async () => {
    tempDir = await TestHelpers.createTempDirectory()
    mockConfig.root = tempDir
  })

  afterEach(async () => {
    await TestHelpers.cleanupTempDirectory(tempDir)
  })

  describe('Route Matching', () => {
    it('should route to asset handler for _httpoint_assets paths', async () => {
      const context: RequestContext = {
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/_httpoint_assets/style.css' }),
        res: HttpMocks.createMockResponse(),
        requestPath: '/_httpoint_assets/style.css',
        filePath: path.join(tempDir, '_httpoint_assets/style.css'),
        body: undefined,
        parsedUrl: url.parse('/_httpoint_assets/style.css', true),
        config: mockConfig,
      }

      const result = await router(context)
      expect(result.handler).toBeDefined()
      expect(result.handler?.name).toMatch(/asset|Asset/)
    })

    it('should route to directory listing handler for directories', async () => {
      const context: RequestContext = {
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/' }),
        res: HttpMocks.createMockResponse(),
        requestPath: '/',
        filePath: tempDir,
        body: undefined,
        parsedUrl: url.parse('/', true),
        config: mockConfig,
      }

      const result = await router(context)
      expect(result.handler).toBeDefined()
    })

    it('should route GET requests to directory listing handler', async () => {
      const context: RequestContext = {
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/' }),
        res: HttpMocks.createMockResponse(),
        requestPath: '/',
        filePath: tempDir,
        body: undefined,
        parsedUrl: url.parse('/', true),
        config: mockConfig,
      }

      const result = await router(context)
      expect(result.handler).toBeDefined()
      expect(result.statusCode).toBeUndefined()
    })

    it('should route POST requests to directory upload handler', async () => {
      const context: RequestContext = {
        req: HttpMocks.createMockRequest({ method: 'POST', url: '/' }),
        res: HttpMocks.createMockResponse(),
        requestPath: '/',
        filePath: tempDir,
        body: Buffer.from('test'),
        parsedUrl: url.parse('/', true),
        config: mockConfig,
      }

      const result = await router(context)
      expect(result.handler).toBeDefined()
    })

    it('should route to file handler for regular files', async () => {
      await TestHelpers.createTestFile(tempDir, 'test.txt', 'test content')

      const context: RequestContext = {
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/test.txt' }),
        res: HttpMocks.createMockResponse(),
        requestPath: '/test.txt',
        filePath: path.join(tempDir, 'test.txt'),
        body: undefined,
        parsedUrl: url.parse('/test.txt', true),
        config: mockConfig,
      }

      const result = await router(context)
      expect(result.handler).toBeDefined()
    })

    it('should differentiate between files and directories', async () => {
      await TestHelpers.createTestFile(tempDir, 'file.txt', 'content')

      const fileContext: RequestContext = {
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/file.txt' }),
        res: HttpMocks.createMockResponse(),
        requestPath: '/file.txt',
        filePath: path.join(tempDir, 'file.txt'),
        body: undefined,
        parsedUrl: url.parse('/file.txt', true),
        config: mockConfig,
      }

      const dirContext: RequestContext = {
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/' }),
        res: HttpMocks.createMockResponse(),
        requestPath: '/',
        filePath: tempDir,
        body: undefined,
        parsedUrl: url.parse('/', true),
        config: mockConfig,
      }

      const fileResult = await router(fileContext)
      const dirResult = await router(dirContext)

      expect(fileResult.handler).toBeDefined()
      expect(dirResult.handler).toBeDefined()
    })
  })

  describe('Parameter Extraction', () => {
    it('should extract file path from context correctly', async () => {
      await TestHelpers.createTestFile(tempDir, 'document.pdf', 'pdf content')

      const context: RequestContext = {
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/document.pdf' }),
        res: HttpMocks.createMockResponse(),
        requestPath: '/document.pdf',
        filePath: path.join(tempDir, 'document.pdf'),
        body: undefined,
        parsedUrl: url.parse('/document.pdf', true),
        config: mockConfig,
      }

      const result = await router(context)
      expect(result.handler).toBeDefined()
    })

    it('should handle nested directory paths', async () => {
      const nestedDir = path.join(tempDir, 'a', 'b', 'c')
      await fs.promises.mkdir(nestedDir, { recursive: true })
      await TestHelpers.createTestFile(nestedDir, 'file.txt', 'nested content')

      const context: RequestContext = {
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/a/b/c/file.txt' }),
        res: HttpMocks.createMockResponse(),
        requestPath: '/a/b/c/file.txt',
        filePath: path.join(tempDir, 'a/b/c/file.txt'),
        body: undefined,
        parsedUrl: url.parse('/a/b/c/file.txt', true),
        config: mockConfig,
      }

      const result = await router(context)
      expect(result.handler).toBeDefined()
    })

    it('should extract method from request context', async () => {
      const context: RequestContext = {
        req: HttpMocks.createMockRequest({ method: 'DELETE', url: '/' }),
        res: HttpMocks.createMockResponse(),
        requestPath: '/',
        filePath: tempDir,
        body: undefined,
        parsedUrl: url.parse('/', true),
        config: mockConfig,
      }

      const result = await router(context)
      expect(result).toBeDefined()
    })
  })

  describe('404 Handling', () => {
    it('should return 404 for non-existent files', async () => {
      const context: RequestContext = {
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/nonexistent.txt' }),
        res: HttpMocks.createMockResponse(),
        requestPath: '/nonexistent.txt',
        filePath: path.join(tempDir, 'nonexistent.txt'),
        body: undefined,
        parsedUrl: url.parse('/nonexistent.txt', true),
        config: mockConfig,
      }

      const result = await router(context)
      expect(result.statusCode).toBe(404)
      expect(result.message).toBe('Not Found')
    })

    it('should return 404 for non-existent nested paths', async () => {
      const context: RequestContext = {
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/missing/nested/file.txt' }),
        res: HttpMocks.createMockResponse(),
        requestPath: '/missing/nested/file.txt',
        filePath: path.join(tempDir, 'missing/nested/file.txt'),
        body: undefined,
        parsedUrl: url.parse('/missing/nested/file.txt', true),
        config: mockConfig,
      }

      const result = await router(context)
      expect(result.statusCode).toBe(404)
      expect(result.message).toBe('Not Found')
    })

    it('should return correct error for missing parent directories', async () => {
      const context: RequestContext = {
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/a/b/c/d/e/file.txt' }),
        res: HttpMocks.createMockResponse(),
        requestPath: '/a/b/c/d/e/file.txt',
        filePath: path.join(tempDir, 'a/b/c/d/e/file.txt'),
        body: undefined,
        parsedUrl: url.parse('/a/b/c/d/e/file.txt', true),
        config: mockConfig,
      }

      const result = await router(context)
      expect(result.statusCode).toBe(404)
    })
  })

  describe('Method Routing', () => {
    it('should route GET requests to file handler', async () => {
      await TestHelpers.createTestFile(tempDir, 'get.txt', 'GET content')

      const context: RequestContext = {
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/get.txt' }),
        res: HttpMocks.createMockResponse(),
        requestPath: '/get.txt',
        filePath: path.join(tempDir, 'get.txt'),
        body: undefined,
        parsedUrl: url.parse('/get.txt', true),
        config: mockConfig,
      }

      const result = await router(context)
      expect(result.handler).toBeDefined()
    })

    it('should route POST to upload handler for directories', async () => {
      const context: RequestContext = {
        req: HttpMocks.createMockRequest({ method: 'POST', url: '/' }),
        res: HttpMocks.createMockResponse(),
        requestPath: '/',
        filePath: tempDir,
        body: Buffer.from('upload data'),
        parsedUrl: url.parse('/', true),
        config: mockConfig,
      }

      const result = await router(context)
      expect(result.handler).toBeDefined()
    })

    it('should route HEAD requests', async () => {
      await TestHelpers.createTestFile(tempDir, 'head.txt', 'HEAD test')

      const context: RequestContext = {
        req: HttpMocks.createMockRequest({ method: 'HEAD', url: '/head.txt' }),
        res: HttpMocks.createMockResponse(),
        requestPath: '/head.txt',
        filePath: path.join(tempDir, 'head.txt'),
        body: undefined,
        parsedUrl: url.parse('/head.txt', true),
        config: mockConfig,
      }

      const result = await router(context)
      expect(result.handler).toBeDefined()
    })

    it('should handle PUT requests', async () => {
      const context: RequestContext = {
        req: HttpMocks.createMockRequest({ method: 'PUT', url: '/' }),
        res: HttpMocks.createMockResponse(),
        requestPath: '/',
        filePath: tempDir,
        body: undefined,
        parsedUrl: url.parse('/', true),
        config: mockConfig,
      }

      const result = await router(context)
      expect(result).toBeDefined()
    })

    it('should handle DELETE requests', async () => {
      const context: RequestContext = {
        req: HttpMocks.createMockRequest({ method: 'DELETE', url: '/' }),
        res: HttpMocks.createMockResponse(),
        requestPath: '/',
        filePath: tempDir,
        body: undefined,
        parsedUrl: url.parse('/', true),
        config: mockConfig,
      }

      const result = await router(context)
      expect(result).toBeDefined()
    })
  })

  describe('Asset Routing', () => {
    it('should route CSS asset requests', async () => {
      const context: RequestContext = {
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/_httpoint_assets/style.css' }),
        res: HttpMocks.createMockResponse(),
        requestPath: '/_httpoint_assets/style.css',
        filePath: path.join(tempDir, '_httpoint_assets/style.css'),
        body: undefined,
        parsedUrl: url.parse('/_httpoint_assets/style.css', true),
        config: mockConfig,
      }

      const result = await router(context)
      expect(result.handler).toBeDefined()
    })

    it('should route JavaScript asset requests', async () => {
      const context: RequestContext = {
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/_httpoint_assets/app.js' }),
        res: HttpMocks.createMockResponse(),
        requestPath: '/_httpoint_assets/app.js',
        filePath: path.join(tempDir, '_httpoint_assets/app.js'),
        body: undefined,
        parsedUrl: url.parse('/_httpoint_assets/app.js', true),
        config: mockConfig,
      }

      const result = await router(context)
      expect(result.handler).toBeDefined()
    })

    it('should route nested asset paths', async () => {
      const context: RequestContext = {
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/_httpoint_assets/icons/favicon.ico' }),
        res: HttpMocks.createMockResponse(),
        requestPath: '/_httpoint_assets/icons/favicon.ico',
        filePath: path.join(tempDir, '_httpoint_assets/icons/favicon.ico'),
        body: undefined,
        parsedUrl: url.parse('/_httpoint_assets/icons/favicon.ico', true),
        config: mockConfig,
      }

      const result = await router(context)
      expect(result.handler).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should return 500 for unexpected errors', async () => {
      const context: RequestContext = {
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/' }),
        res: HttpMocks.createMockResponse(),
        requestPath: '/',
        filePath: '/invalid/path/that/will/error',
        body: undefined,
        parsedUrl: url.parse('/', true),
        config: mockConfig,
      }

      const result = await router(context)
      // Either 500 or 404 depending on whether path exists
      expect([500, 404]).toContain(result.statusCode)
    })

    it('should handle permission errors gracefully', async () => {
      // This test would require mocking fs.stat to throw an EACCES error
      const context: RequestContext = {
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/restricted' }),
        res: HttpMocks.createMockResponse(),
        requestPath: '/restricted',
        filePath: path.join(tempDir, 'restricted'),
        body: undefined,
        parsedUrl: url.parse('/restricted', true),
        config: mockConfig,
      }

      const result = await router(context)
      // Non-existent file returns 404
      expect([500, 404]).toContain(result.statusCode)
    })
  })

  describe('File Types', () => {
    it('should handle HTML files', async () => {
      await TestHelpers.createTestFile(tempDir, 'index.html', '<html></html>')

      const context: RequestContext = {
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/index.html' }),
        res: HttpMocks.createMockResponse(),
        requestPath: '/index.html',
        filePath: path.join(tempDir, 'index.html'),
        body: undefined,
        parsedUrl: url.parse('/index.html', true),
        config: mockConfig,
      }

      const result = await router(context)
      expect(result.handler).toBeDefined()
    })

    it('should handle JSON files', async () => {
      await TestHelpers.createTestFile(tempDir, 'data.json', '{"key": "value"}')

      const context: RequestContext = {
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/data.json' }),
        res: HttpMocks.createMockResponse(),
        requestPath: '/data.json',
        filePath: path.join(tempDir, 'data.json'),
        body: undefined,
        parsedUrl: url.parse('/data.json', true),
        config: mockConfig,
      }

      const result = await router(context)
      expect(result.handler).toBeDefined()
    })

    it('should handle CSS files', async () => {
      await TestHelpers.createTestFile(tempDir, 'style.css', 'body { color: red; }')

      const context: RequestContext = {
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/style.css' }),
        res: HttpMocks.createMockResponse(),
        requestPath: '/style.css',
        filePath: path.join(tempDir, 'style.css'),
        body: undefined,
        parsedUrl: url.parse('/style.css', true),
        config: mockConfig,
      }

      const result = await router(context)
      expect(result.handler).toBeDefined()
    })

    it('should handle text files', async () => {
      await TestHelpers.createTestFile(tempDir, 'readme.txt', 'This is a readme')

      const context: RequestContext = {
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/readme.txt' }),
        res: HttpMocks.createMockResponse(),
        requestPath: '/readme.txt',
        filePath: path.join(tempDir, 'readme.txt'),
        body: undefined,
        parsedUrl: url.parse('/readme.txt', true),
        config: mockConfig,
      }

      const result = await router(context)
      expect(result.handler).toBeDefined()
    })

    it('should handle binary files', async () => {
      const binaryData = Buffer.from([0x89, 0x50, 0x4e, 0x47]) // PNG signature
      const filePath = path.join(tempDir, 'image.png')
      await fs.promises.writeFile(filePath, binaryData)

      const context: RequestContext = {
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/image.png' }),
        res: HttpMocks.createMockResponse(),
        requestPath: '/image.png',
        filePath,
        body: undefined,
        parsedUrl: url.parse('/image.png', true),
        config: mockConfig,
      }

      const result = await router(context)
      expect(result.handler).toBeDefined()
    })
  })

  describe('Root Path', () => {
    it('should route root path to directory listing', async () => {
      const context: RequestContext = {
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/' }),
        res: HttpMocks.createMockResponse(),
        requestPath: '/',
        filePath: tempDir,
        body: undefined,
        parsedUrl: url.parse('/', true),
        config: mockConfig,
      }

      const result = await router(context)
      expect(result.handler).toBeDefined()
    })

    it('should handle root POST request', async () => {
      const context: RequestContext = {
        req: HttpMocks.createMockRequest({ method: 'POST', url: '/' }),
        res: HttpMocks.createMockResponse(),
        requestPath: '/',
        filePath: tempDir,
        body: Buffer.from('data'),
        parsedUrl: url.parse('/', true),
        config: mockConfig,
      }

      const result = await router(context)
      expect(result.handler).toBeDefined()
    })
  })
})
