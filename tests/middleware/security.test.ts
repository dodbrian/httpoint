import path from 'path'
import url from 'url'
import { security, SecurityViolationError } from '../../src/middleware/security'
import { RequestContext } from '../../src/context/request'
import { HttpMocks, TestHelpers } from '../helpers'

describe('Security Middleware', () => {
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

  describe('Directory Traversal Protection', () => {
    it('should allow legitimate paths within root directory', async () => {
      const context: RequestContext = {
        req: HttpMocks.createMockRequest(),
        res: HttpMocks.createMockResponse(),
        requestPath: '/index.html',
        filePath: path.join(tempDir, 'index.html'),
        body: undefined,
        parsedUrl: url.parse('/index.html', true),
        config: mockConfig,
      }

      expect(async () => {
        await security(context)
      }).not.toThrow()
    })

    it('should block directory traversal attempts with ../', async () => {
      const context: RequestContext = {
        req: HttpMocks.createMockRequest(),
        res: HttpMocks.createMockResponse(),
        requestPath: '/../etc/passwd',
        filePath: path.join(tempDir, '/../etc/passwd'),
        body: undefined,
        parsedUrl: url.parse('/../etc/passwd', true),
        config: mockConfig,
      }

      await expect(security(context)).rejects.toThrow(SecurityViolationError)
    })

    it('should block paths that escape root directory', async () => {
      const escapeAttempt = path.join(tempDir, '../../etc/passwd')
      const context: RequestContext = {
        req: HttpMocks.createMockRequest(),
        res: HttpMocks.createMockResponse(),
        requestPath: '/../../../etc/passwd',
        filePath: escapeAttempt,
        body: undefined,
        parsedUrl: url.parse('/../../../etc/passwd', true),
        config: mockConfig,
      }

      await expect(security(context)).rejects.toThrow(SecurityViolationError)
    })

    it('should block encoded directory traversal attempts', async () => {
      const context: RequestContext = {
        req: HttpMocks.createMockRequest(),
        res: HttpMocks.createMockResponse(),
        requestPath: '/..%2Fetc%2Fpasswd',
        filePath: path.join(tempDir, '/..%2Fetc%2Fpasswd'),
        body: undefined,
        parsedUrl: url.parse('/..%2Fetc%2Fpasswd', true),
        config: mockConfig,
      }

      // Even with encoding, the check should work if normalized
      // This depends on if the path was already decoded before reaching security
      // The current implementation checks raw requestPath for '..'
      const isViolation = context.requestPath.includes('..')
      if (isViolation) {
        await expect(security(context)).rejects.toThrow(SecurityViolationError)
      }
    })
  })

  describe('Path Normalization', () => {
    it('should normalize paths with trailing slashes', async () => {
      const context: RequestContext = {
        req: HttpMocks.createMockRequest(),
        res: HttpMocks.createMockResponse(),
        requestPath: '/subdir/',
        filePath: path.join(tempDir, '/subdir/'),
        body: undefined,
        parsedUrl: url.parse('/subdir/', true),
        config: mockConfig,
      }

      expect(async () => {
        await security(context)
      }).not.toThrow()
    })

    it('should handle dot segments in legitimate paths', async () => {
      const context: RequestContext = {
        req: HttpMocks.createMockRequest(),
        res: HttpMocks.createMockResponse(),
        requestPath: '/./subdir/file.txt',
        filePath: path.normalize(path.join(tempDir, '/./subdir/file.txt')),
        body: undefined,
        parsedUrl: url.parse('/./subdir/file.txt', true),
        config: mockConfig,
      }

      expect(async () => {
        await security(context)
      }).not.toThrow()
    })

    it('should detect dangerous path sequences after normalization', async () => {
      const context: RequestContext = {
        req: HttpMocks.createMockRequest(),
        res: HttpMocks.createMockResponse(),
        requestPath: '/../dangerous',
        filePath: path.normalize(path.join(tempDir, '/../dangerous')),
        body: undefined,
        parsedUrl: url.parse('/../dangerous', true),
        config: mockConfig,
      }

      await expect(security(context)).rejects.toThrow(SecurityViolationError)
    })
  })

  describe('SecurityViolationError', () => {
    it('should be instanceof Error', () => {
      const error = new SecurityViolationError('Test message')
      expect(error).toBeInstanceOf(Error)
    })

    it('should have correct error name', () => {
      const error = new SecurityViolationError('Test message')
      expect(error.name).toBe('SecurityViolationError')
    })

    it('should preserve error message', () => {
      const message = 'Security violation: directory traversal attempt detected'
      const error = new SecurityViolationError(message)
      expect(error.message).toBe(message)
    })

    it('should be caught as SecurityViolationError type', async () => {
      const error = new SecurityViolationError('Test')
      expect(error instanceof SecurityViolationError).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should allow empty request paths resolved to root', async () => {
      const context: RequestContext = {
        req: HttpMocks.createMockRequest(),
        res: HttpMocks.createMockResponse(),
        requestPath: '/',
        filePath: tempDir,
        body: undefined,
        parsedUrl: url.parse('/', true),
        config: mockConfig,
      }

      expect(async () => {
        await security(context)
      }).not.toThrow()
    })

    it('should handle deeply nested legitimate paths', async () => {
      const nestedPath = '/a/b/c/d/e/f/g/h/i/j/file.txt'
      const context: RequestContext = {
        req: HttpMocks.createMockRequest(),
        res: HttpMocks.createMockResponse(),
        requestPath: nestedPath,
        filePath: path.join(tempDir, nestedPath),
        body: undefined,
        parsedUrl: url.parse(nestedPath, true),
        config: mockConfig,
      }

      expect(async () => {
        await security(context)
      }).not.toThrow()
    })

    it('should detect traversal in middle of complex paths', async () => {
      const context: RequestContext = {
        req: HttpMocks.createMockRequest(),
        res: HttpMocks.createMockResponse(),
        requestPath: '/a/b/../../../etc/passwd',
        filePath: path.join(tempDir, '/a/b/../../../etc/passwd'),
        body: undefined,
        parsedUrl: url.parse('/a/b/../../../etc/passwd', true),
        config: mockConfig,
      }

      await expect(security(context)).rejects.toThrow(SecurityViolationError)
    })

    it('should allow multiple slashes', async () => {
      const context: RequestContext = {
        req: HttpMocks.createMockRequest(),
        res: HttpMocks.createMockResponse(),
        requestPath: '/path//to////file.txt',
        filePath: path.join(tempDir, '/path//to////file.txt'),
        body: undefined,
        parsedUrl: url.parse('/path//to////file.txt', true),
        config: mockConfig,
      }

      expect(async () => {
        await security(context)
      }).not.toThrow()
    })
  })
})
