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

  // Helper to create RequestContext objects with defaults
  const createContext = (
    method: string = 'GET',
    requestPath: string = '/',
    urlPath: string = '/',
    config = mockConfig,
    body: Buffer | undefined = undefined
  ): RequestContext => ({
    req: HttpMocks.createMockRequest({ method, url: urlPath }),
    res: HttpMocks.createMockResponse(),
    requestPath,
    filePath: `${tempDir}${requestPath}`,
    body,
    parsedUrl: url.parse(urlPath, true),
    config,
  })

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
      const context = createContext('GET', '/index.html', '/index.html')
      await logger(context, 200)
      expect(consoleSpy).toHaveBeenCalledWith('GET /index.html 200')
    })

    it('should log POST requests with status code', async () => {
      const context = createContext('POST', '/', '/')
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
        const context = createContext(testCase.method, '/test', '/test')
        await logger(context, testCase.status)
        expect(consoleSpy).toHaveBeenCalledWith(`${testCase.method} /test ${testCase.status}`)
      }
    })

    it('should log different HTTP methods', async () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']

      for (const method of methods) {
        consoleSpy.mockClear()
        const context = createContext(method, '/api/data', '/api/data')
        await logger(context, 200)
        expect(consoleSpy).toHaveBeenCalledWith(`${method} /api/data 200`)
      }
    })
  })

  describe('Asset Request Filtering', () => {
    it('should skip logging asset requests when debug mode is off', async () => {
      const context = createContext('GET', '/_httpoint_assets/style.css', '/_httpoint_assets/style.css')
      await logger(context, 200)
      expect(consoleSpy).not.toHaveBeenCalled()
    })

    it('should log asset requests when debug mode is on', async () => {
      const debugConfig = { ...mockConfig, debug: true }
      const context = createContext('GET', '/_httpoint_assets/style.css', '/_httpoint_assets/style.css', debugConfig)
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
        const context = createContext('GET', assetPath, assetPath)
        await logger(context, 200)
        expect(consoleSpy).not.toHaveBeenCalled()
      }
    })
  })

  describe('Debug Body Logging', () => {
    it('should not log POST body in normal mode', async () => {
      const body = Buffer.from('file content here')
      const context = createContext('POST', '/upload', '/upload', mockConfig, body)
      await logger(context, 200)
      expect(consoleSpy).toHaveBeenCalledWith('POST /upload 200')
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('POST body'))
    })

    it('should log POST body in debug mode', async () => {
      const debugConfig = { ...mockConfig, debug: true }
      const body = Buffer.from('test file content')
      const context = createContext('POST', '/upload', '/upload', debugConfig, body)
      await logger(context, 200)
      expect(consoleSpy).toHaveBeenCalledWith('POST /upload 200')
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/POST body for \/upload:/)
      )
    })

    it('should log multipart form data in debug mode', async () => {
      const debugConfig = { ...mockConfig, debug: true }
      const multipartData = HttpMocks.createMultipartData([
        { name: 'file', filename: 'test.txt', data: 'file content' },
      ])
      const context = createContext('POST', '/', '/', debugConfig, multipartData)
      await logger(context, 200)
      expect(consoleSpy).toHaveBeenCalledWith('POST / 200')
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/POST body for \/:/),
      )
    })

    it('should not log body for GET requests in debug mode', async () => {
      const debugConfig = { ...mockConfig, debug: true }
      const context = createContext('GET', '/file.txt', '/file.txt', debugConfig, Buffer.from('some content'))
      await logger(context, 200)
      expect(consoleSpy).toHaveBeenCalledWith('GET /file.txt 200')
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('POST body'))
    })

    it('should handle empty POST body in debug mode', async () => {
      const debugConfig = { ...mockConfig, debug: true }
      const context = createContext('POST', '/', '/', debugConfig, Buffer.from(''))
      await logger(context, 200)
      expect(consoleSpy).toHaveBeenCalledWith('POST / 200')
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/POST body for \/:/),
      )
    })
  })

  describe('Various Request Paths', () => {
    it('should log nested file paths correctly', async () => {
      const context = createContext('GET', '/docs/api/reference.html', '/docs/api/reference.html')
      await logger(context, 200)
      expect(consoleSpy).toHaveBeenCalledWith('GET /docs/api/reference.html 200')
    })

    it('should log root path requests', async () => {
      const context = createContext('GET', '/', '/')
      await logger(context, 200)
      expect(consoleSpy).toHaveBeenCalledWith('GET / 200')
    })

    it('should log paths with query parameters', async () => {
      const context = createContext('GET', '/search', '/search?q=test&limit=10')
      await logger(context, 200)
      expect(consoleSpy).toHaveBeenCalledWith('GET /search 200')
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined body gracefully', async () => {
      const debugConfig = { ...mockConfig, debug: true }
      const context = createContext('POST', '/upload', '/upload', debugConfig, undefined)
      await logger(context, 200)
      expect(consoleSpy).toHaveBeenCalledWith('POST /upload 200')
      expect(consoleSpy).toHaveBeenCalledTimes(1)
    })

    it('should log paths with special characters', async () => {
      const context = createContext('GET', '/files/document (1).pdf', '/files/document (1).pdf')
      await logger(context, 200)
      expect(consoleSpy).toHaveBeenCalledWith('GET /files/document (1).pdf 200')
    })

    it('should log paths with encoded characters', async () => {
      const context = createContext('GET', '/search/hello%20world', '/search/hello%20world')
      await logger(context, 200)
      expect(consoleSpy).toHaveBeenCalledWith('GET /search/hello%20world 200')
    })

    it('should correctly log status code as number', async () => {
      const context = createContext('GET', '/test', '/test')
      await logger(context, 418)
      expect(consoleSpy).toHaveBeenCalledWith('GET /test 418')
      expect(consoleSpy).toHaveBeenCalledTimes(1)
    })

    it('should not call console.log more than once for GET in normal mode', async () => {
      const context = createContext('GET', '/test', '/test')
      await logger(context, 200)
      expect(consoleSpy).toHaveBeenCalledTimes(1)
    })

    it('should call console.log twice for POST with body in debug mode', async () => {
      const debugConfig = { ...mockConfig, debug: true }
      const context = createContext('POST', '/upload', '/upload', debugConfig, Buffer.from('data'))
      await logger(context, 200)
      expect(consoleSpy).toHaveBeenCalledTimes(2)
    })
  })
})
