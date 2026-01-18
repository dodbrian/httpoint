import url from 'url'
import { logger } from '../../src/middleware/logger'
import { RequestContext } from '../../src/context/request'
import { HttpMocks, TestHelpers } from '../helpers'

describe('Logger Middleware', () => {
  let tempDir: string
  let consoleSpy: jest.SpyInstance
  const mockConfig = {
    port: 3000,
    root: '',
    debug: false,
  }

  beforeEach(async () => {
    tempDir = await TestHelpers.createTempDirectory()
    mockConfig.root = tempDir
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(async () => {
    await TestHelpers.cleanupTempDirectory(tempDir)
    consoleSpy.mockRestore()
  })

  describe('Request Logging', () => {
    it('should log GET requests with status code', async () => {
      const context: RequestContext = {
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/index.html' }),
        res: HttpMocks.createMockResponse(),
        requestPath: '/index.html',
        filePath: `${tempDir}/index.html`,
        body: undefined,
        parsedUrl: url.parse('/index.html', true),
        config: mockConfig,
      }

      await logger(context, 200)
      expect(consoleSpy).toHaveBeenCalledWith('GET /index.html 200')
    })

    it('should log POST requests with status code', async () => {
      const context: RequestContext = {
        req: HttpMocks.createMockRequest({ method: 'POST', url: '/' }),
        res: HttpMocks.createMockResponse(),
        requestPath: '/',
        filePath: tempDir,
        body: undefined,
        parsedUrl: url.parse('/', true),
        config: mockConfig,
      }

      await logger(context, 201)
      expect(consoleSpy).toHaveBeenCalledWith('POST / 201')
    })

    it('should log various HTTP status codes', async () => {
      const testCases = [
        { status: 200, method: 'GET' },
        { status: 201, method: 'POST' },
        { status: 301, method: 'GET' },
        { status: 400, method: 'GET' },
        { status: 403, method: 'GET' },
        { status: 404, method: 'GET' },
        { status: 500, method: 'GET' },
      ]

      for (const testCase of testCases) {
        consoleSpy.mockClear()
        const context: RequestContext = {
          req: HttpMocks.createMockRequest({ method: testCase.method, url: '/test' }),
          res: HttpMocks.createMockResponse(),
          requestPath: '/test',
          filePath: `${tempDir}/test`,
          body: undefined,
          parsedUrl: url.parse('/test', true),
          config: mockConfig,
        }

        await logger(context, testCase.status)
        expect(consoleSpy).toHaveBeenCalledWith(`${testCase.method} /test ${testCase.status}`)
      }
    })

    it('should log different HTTP methods', async () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']

      for (const method of methods) {
        consoleSpy.mockClear()
        const context: RequestContext = {
          req: HttpMocks.createMockRequest({ method, url: '/api/data' }),
          res: HttpMocks.createMockResponse(),
          requestPath: '/api/data',
          filePath: `${tempDir}/api/data`,
          body: undefined,
          parsedUrl: url.parse('/api/data', true),
          config: mockConfig,
        }

        await logger(context, 200)
        expect(consoleSpy).toHaveBeenCalledWith(`${method} /api/data 200`)
      }
    })
  })

  describe('Asset Request Filtering', () => {
    it('should skip logging asset requests when debug mode is off', async () => {
      const context: RequestContext = {
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/_httpoint_assets/style.css' }),
        res: HttpMocks.createMockResponse(),
        requestPath: '/_httpoint_assets/style.css',
        filePath: `${tempDir}/_httpoint_assets/style.css`,
        body: undefined,
        parsedUrl: url.parse('/_httpoint_assets/style.css', true),
        config: mockConfig,
      }

      await logger(context, 200)
      expect(consoleSpy).not.toHaveBeenCalled()
    })

    it('should log asset requests when debug mode is on', async () => {
      const debugConfig = { ...mockConfig, debug: true }
      const context: RequestContext = {
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/_httpoint_assets/style.css' }),
        res: HttpMocks.createMockResponse(),
        requestPath: '/_httpoint_assets/style.css',
        filePath: `${tempDir}/_httpoint_assets/style.css`,
        body: undefined,
        parsedUrl: url.parse('/_httpoint_assets/style.css', true),
        config: debugConfig,
      }

      await logger(context, 200)
      expect(consoleSpy).toHaveBeenCalledWith('GET /_httpoint_assets/style.css 200')
    })

    it('should skip various asset types when debug is off', async () => {
      const assetPaths = [
        '/_httpoint_assets/style.css',
        '/_httpoint_assets/app.js',
        '/_httpoint_assets/icons/favicon.ico',
        '/_httpoint_assets/fonts/sans-serif.woff2',
      ]

      for (const assetPath of assetPaths) {
        consoleSpy.mockClear()
        const context: RequestContext = {
          req: HttpMocks.createMockRequest({ method: 'GET', url: assetPath }),
          res: HttpMocks.createMockResponse(),
          requestPath: assetPath,
          filePath: `${tempDir}${assetPath}`,
          body: undefined,
          parsedUrl: url.parse(assetPath, true),
          config: mockConfig,
        }

        await logger(context, 200)
        expect(consoleSpy).not.toHaveBeenCalled()
      }
    })
  })

  describe('Debug Body Logging', () => {
    it('should not log POST body in normal mode', async () => {
      const body = Buffer.from('file content here')
      const context: RequestContext = {
        req: HttpMocks.createMockRequest({ method: 'POST', url: '/upload' }),
        res: HttpMocks.createMockResponse(),
        requestPath: '/upload',
        filePath: `${tempDir}/upload`,
        body,
        parsedUrl: url.parse('/upload', true),
        config: mockConfig,
      }

      await logger(context, 200)
      expect(consoleSpy).toHaveBeenCalledWith('POST /upload 200')
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('POST body'))
    })

    it('should log POST body in debug mode', async () => {
      const debugConfig = { ...mockConfig, debug: true }
      const body = Buffer.from('test file content')
      const context: RequestContext = {
        req: HttpMocks.createMockRequest({ method: 'POST', url: '/upload' }),
        res: HttpMocks.createMockResponse(),
        requestPath: '/upload',
        filePath: `${tempDir}/upload`,
        body,
        parsedUrl: url.parse('/upload', true),
        config: debugConfig,
      }

      await logger(context, 200)
      expect(consoleSpy).toHaveBeenCalledWith(`POST /upload 200`)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/POST body for \/upload:/)
      )
    })

    it('should log multipart form data in debug mode', async () => {
      const debugConfig = { ...mockConfig, debug: true }
      const multipartData = HttpMocks.createMultipartData([
        { name: 'file', filename: 'test.txt', data: 'file content' },
      ])

      const context: RequestContext = {
        req: HttpMocks.createMockRequest({ method: 'POST', url: '/' }),
        res: HttpMocks.createMockResponse(),
        requestPath: '/',
        filePath: tempDir,
        body: multipartData,
        parsedUrl: url.parse('/', true),
        config: debugConfig,
      }

      await logger(context, 200)
      expect(consoleSpy).toHaveBeenCalledWith('POST / 200')
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/POST body for \/:/),
      )
    })

    it('should not log body for GET requests in debug mode', async () => {
      const debugConfig = { ...mockConfig, debug: true }
      const context: RequestContext = {
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/file.txt' }),
        res: HttpMocks.createMockResponse(),
        requestPath: '/file.txt',
        filePath: `${tempDir}/file.txt`,
        body: Buffer.from('some content'),
        parsedUrl: url.parse('/file.txt', true),
        config: debugConfig,
      }

      await logger(context, 200)
      expect(consoleSpy).toHaveBeenCalledWith('GET /file.txt 200')
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('POST body'))
    })

    it('should handle empty POST body in debug mode', async () => {
      const debugConfig = { ...mockConfig, debug: true }
      const context: RequestContext = {
        req: HttpMocks.createMockRequest({ method: 'POST', url: '/' }),
        res: HttpMocks.createMockResponse(),
        requestPath: '/',
        filePath: tempDir,
        body: Buffer.from(''),
        parsedUrl: url.parse('/', true),
        config: debugConfig,
      }

      await logger(context, 200)
      expect(consoleSpy).toHaveBeenCalledWith('POST / 200')
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/POST body for \/:/),
      )
    })
  })

  describe('Various Request Paths', () => {
    it('should log nested file paths correctly', async () => {
      const context: RequestContext = {
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/docs/api/reference.html' }),
        res: HttpMocks.createMockResponse(),
        requestPath: '/docs/api/reference.html',
        filePath: `${tempDir}/docs/api/reference.html`,
        body: undefined,
        parsedUrl: url.parse('/docs/api/reference.html', true),
        config: mockConfig,
      }

      await logger(context, 200)
      expect(consoleSpy).toHaveBeenCalledWith('GET /docs/api/reference.html 200')
    })

    it('should log root path requests', async () => {
      const context: RequestContext = {
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/' }),
        res: HttpMocks.createMockResponse(),
        requestPath: '/',
        filePath: tempDir,
        body: undefined,
        parsedUrl: url.parse('/', true),
        config: mockConfig,
      }

      await logger(context, 200)
      expect(consoleSpy).toHaveBeenCalledWith('GET / 200')
    })

    it('should log paths with query parameters', async () => {
      const context: RequestContext = {
        req: HttpMocks.createMockRequest({ method: 'GET', url: '/search?q=test&limit=10' }),
        res: HttpMocks.createMockResponse(),
        requestPath: '/search',
        filePath: `${tempDir}/search`,
        body: undefined,
        parsedUrl: url.parse('/search?q=test&limit=10', true),
        config: mockConfig,
      }

      await logger(context, 200)
      expect(consoleSpy).toHaveBeenCalledWith('GET /search 200')
    })
  })
})
