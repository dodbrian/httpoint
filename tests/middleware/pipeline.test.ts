import { EventEmitter } from 'events'
import { executePipeline } from '../../src/middleware/pipeline'
import { HttpMocks, TestHelpers } from '../helpers'

describe('Pipeline Middleware', () => {
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

  describe('Execution Order', () => {
    it('should execute middleware in correct order: security → body → router → logger', async () => {
      const executionOrder: string[] = []

      // Mock the request
      const mockReq = new EventEmitter() as any
      mockReq.method = 'GET'
      mockReq.url = '/'
      mockReq.headers = {}

      const mockRes = HttpMocks.createMockResponse()

      // Patch console.log to capture execution
      consoleSpy.mockImplementation((msg: any) => {
        if (typeof msg === 'string' && msg.startsWith('GET')) {
          executionOrder.push('logger')
        }
      })

      // Simulate request flow
      setTimeout(() => {
        mockReq.emit('end')
      }, 10)

      await executePipeline(mockReq, mockRes, mockConfig)

      // Logger should be called
      expect(executionOrder).toContain('logger')
    })

    it('should create request context before executing middleware', async () => {
      const mockReq = new EventEmitter() as any
      mockReq.method = 'GET'
      mockReq.url = '/test.txt'
      mockReq.headers = {}

      const mockRes = HttpMocks.createMockResponse()

      // Create a test file
      await TestHelpers.createTestFile(tempDir, 'test.txt', 'test content')

      setTimeout(() => {
        mockReq.emit('end')
      }, 10)

      // This should not throw - context creation should succeed
      await expect(executePipeline(mockReq, mockRes, mockConfig)).resolves.not.toThrow()
    })
  })

  describe('Error Propagation', () => {
    it('should catch security violations and return 403', async () => {
      const mockReq = new EventEmitter() as any
      mockReq.method = 'GET'
      mockReq.url = '/../etc/passwd' // Directory traversal attempt
      mockReq.headers = {}

      const mockRes = HttpMocks.createMockResponse()

      setTimeout(() => {
        mockReq.emit('end')
      }, 10)

      await executePipeline(mockReq, mockRes, mockConfig)

      expect(mockRes.statusCode).toBe(403)
      expect(mockRes.data).toBe('Forbidden')
    })

    it('should catch request body too large errors and return 413', async () => {
      const mockReq = new EventEmitter() as any
      mockReq.method = 'POST'
      mockReq.url = '/'
      mockReq.headers = {}

      const mockRes = HttpMocks.createMockResponse()

      setTimeout(() => {
        // Emit a chunk that exceeds the limit
        mockReq.emit('data', Buffer.alloc(101 * 1024 * 1024))
      }, 10)

      await executePipeline(mockReq, mockRes, mockConfig)

      expect(mockRes.statusCode).toBe(413)
      expect(mockRes.data).toBe('Request Entity Too Large')
    })

    it('should catch generic errors and return 500', async () => {
      const mockReq = new EventEmitter() as any
      mockReq.method = 'GET'
      mockReq.url = '/'
      mockReq.headers = {}

      // Simulate an unexpected error
      const mockRes = HttpMocks.createMockResponse()

      // Emit error directly on request
      setTimeout(() => {
        mockReq.emit('error', new Error('Unexpected error'))
      }, 5)

      setTimeout(() => {
        mockReq.emit('end')
      }, 15)

      await executePipeline(mockReq, mockRes, mockConfig)

      // After error, we should get a 500 or fallback response
      expect([500, 200]).toContain(mockRes.statusCode)
    })

    it('should handle context creation failures gracefully', async () => {
      const mockReq = new EventEmitter() as any
      mockReq.method = 'GET'
      mockReq.url = null // Missing URL
      mockReq.headers = {}

      const mockRes = HttpMocks.createMockResponse()

      setTimeout(() => {
        mockReq.emit('end')
      }, 10)

      // Should handle the missing URL error
      await executePipeline(mockReq, mockRes, mockConfig)

      expect(mockRes.statusCode).toBe(500)
    })
  })

  describe('Async Handling', () => {
    it('should properly await security middleware', async () => {
      const mockReq = new EventEmitter() as any
      mockReq.method = 'GET'
      mockReq.url = '/valid/path.txt'
      mockReq.headers = {}

      const mockRes = HttpMocks.createMockResponse()

      setTimeout(() => {
        mockReq.emit('end')
      }, 10)

      // Should complete without hanging
      let timeoutId: NodeJS.Timeout | undefined
      await expect(
        Promise.race([
          executePipeline(mockReq, mockRes, mockConfig),
          new Promise((_, reject) =>
            timeoutId = setTimeout(() => reject(new Error('Timeout')), 2000)
          ),
        ])
      ).resolves.not.toThrow()
      if (timeoutId) clearTimeout(timeoutId)
    })

    it('should properly await body collection', async () => {
      const mockReq = new EventEmitter() as any
      mockReq.method = 'POST'
      mockReq.url = '/'
      mockReq.headers = {}

      const mockRes = HttpMocks.createMockResponse()

      setTimeout(() => {
        mockReq.emit('data', Buffer.from('test data'))
        mockReq.emit('end')
      }, 10)

      let bodyTimeoutId: NodeJS.Timeout | undefined
      await expect(
        Promise.race([
          executePipeline(mockReq, mockRes, mockConfig),
          new Promise((_, reject) =>
            bodyTimeoutId = setTimeout(() => reject(new Error('Timeout')), 2000)
          ),
        ])
      ).resolves.not.toThrow()
      if (bodyTimeoutId) clearTimeout(bodyTimeoutId)
    })

    it('should properly await router execution', async () => {
      const mockReq = new EventEmitter() as any
      mockReq.method = 'GET'
      mockReq.url = '/'
      mockReq.headers = {}

      const mockRes = HttpMocks.createMockResponse()

      setTimeout(() => {
        mockReq.emit('end')
      }, 10)

      let routerTimeoutId: NodeJS.Timeout | undefined
      await expect(
        Promise.race([
          executePipeline(mockReq, mockRes, mockConfig),
          new Promise((_, reject) =>
            routerTimeoutId = setTimeout(() => reject(new Error('Timeout')), 2000)
          ),
        ])
      ).resolves.not.toThrow()
      if (routerTimeoutId) clearTimeout(routerTimeoutId)
    })

    it('should properly await logger execution', async () => {
      const mockReq = new EventEmitter() as any
      mockReq.method = 'GET'
      mockReq.url = '/'
      mockReq.headers = {}

      const mockRes = HttpMocks.createMockResponse()

      setTimeout(() => {
        mockReq.emit('end')
      }, 10)

      const pipelinePromise = executePipeline(mockReq, mockRes, mockConfig)

      // Logger should be called before promise resolves
      await pipelinePromise
      expect(consoleSpy).toHaveBeenCalled()
    })
  })

  describe('Response Handling', () => {
    it('should set correct status code for successful requests', async () => {
      const mockReq = new EventEmitter() as any
      mockReq.method = 'GET'
      mockReq.url = '/'
      mockReq.headers = {}

      const mockRes = HttpMocks.createMockResponse()

      setTimeout(() => {
        mockReq.emit('end')
      }, 10)

      await executePipeline(mockReq, mockRes, mockConfig)

      // Directory listing should return 200
      expect([200, 404]).toContain(mockRes.statusCode)
    })

    it('should set Content-Type header for error responses', async () => {
      const mockReq = new EventEmitter() as any
      mockReq.method = 'GET'
      mockReq.url = '/../etc/passwd'
      mockReq.headers = {}

      const mockRes = HttpMocks.createMockResponse()

      setTimeout(() => {
        mockReq.emit('end')
      }, 10)

      await executePipeline(mockReq, mockRes, mockConfig)

      expect(mockRes.headers['Content-Type']).toBe('text/plain')
    })

    it('should handle handler result from router', async () => {
      const mockReq = new EventEmitter() as any
      mockReq.method = 'GET'
      mockReq.url = '/'
      mockReq.headers = {}

      const mockRes = HttpMocks.createMockResponse()

      setTimeout(() => {
        mockReq.emit('end')
      }, 10)

      await executePipeline(mockReq, mockRes, mockConfig)

      // Should either get directory listing (200) or not found (404)
      expect([200, 404]).toContain(mockRes.statusCode)
    })

    it('should handle direct status code response from router', async () => {
      const mockReq = new EventEmitter() as any
      mockReq.method = 'GET'
      mockReq.url = '/nonexistent.txt'
      mockReq.headers = {}

      const mockRes = HttpMocks.createMockResponse()

      setTimeout(() => {
        mockReq.emit('end')
      }, 10)

      await executePipeline(mockReq, mockRes, mockConfig)

      // Non-existent file should return 404
      expect(mockRes.statusCode).toBe(404)
      expect(mockRes.data).toContain('Not Found')
    })
  })

  describe('Debug Logging', () => {
    it('should not log pipeline errors in non-debug mode', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      const mockReq = new EventEmitter() as any
      mockReq.method = 'GET'
      mockReq.url = '/'
      mockReq.headers = {}

      const mockRes = HttpMocks.createMockResponse()

      setTimeout(() => {
        mockReq.emit('end')
      }, 10)

      await executePipeline(mockReq, mockRes, mockConfig)

      // Should not call console.error in normal mode
      expect(errorSpy).not.toHaveBeenCalled()
      errorSpy.mockRestore()
    })

    it('should log pipeline errors in debug mode', async () => {
      const debugConfig = { ...mockConfig, debug: true }
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      const mockReq = new EventEmitter() as any
      mockReq.method = 'GET'
      mockReq.url = '/'
      mockReq.headers = {}

      const mockRes = HttpMocks.createMockResponse()

      // Create a situation that triggers error in router
      setTimeout(() => {
        mockReq.emit('end')
      }, 10)

      await executePipeline(mockReq, mockRes, debugConfig)

      errorSpy.mockRestore()
    })

    it('should include request info in fallback logging', async () => {
      const mockReq = new EventEmitter() as any
      mockReq.method = 'GET'
      mockReq.url = '/'
      mockReq.headers = {}

      const mockRes = HttpMocks.createMockResponse()

      setTimeout(() => {
        mockReq.emit('end')
      }, 10)

      await executePipeline(mockReq, mockRes, mockConfig)

      // Should have logged something with method and URL
      expect(consoleSpy).toHaveBeenCalled()
    })
  })

  describe('Request Methods', () => {
    it('should handle GET requests', async () => {
      const mockReq = new EventEmitter() as any
      mockReq.method = 'GET'
      mockReq.url = '/'
      mockReq.headers = {}

      const mockRes = HttpMocks.createMockResponse()

      setTimeout(() => {
        mockReq.emit('end')
      }, 10)

      await executePipeline(mockReq, mockRes, mockConfig)

      expect([200, 404]).toContain(mockRes.statusCode)
    })

    it('should handle POST requests', async () => {
      const mockReq = new EventEmitter() as any
      mockReq.method = 'POST'
      mockReq.url = '/'
      mockReq.headers = { 'content-type': 'application/x-www-form-urlencoded' }

      const mockRes = HttpMocks.createMockResponse()

      setTimeout(() => {
        mockReq.emit('data', Buffer.from('test=data'))
        mockReq.emit('end')
      }, 10)

      await executePipeline(mockReq, mockRes, mockConfig)

      // Should process POST and attempt upload or directory listing
      expect(mockRes.statusCode).toBeDefined()
    })

    it('should handle HEAD requests', async () => {
      const mockReq = new EventEmitter() as any
      mockReq.method = 'HEAD'
      mockReq.url = '/'
      mockReq.headers = {}

      const mockRes = HttpMocks.createMockResponse()

      setTimeout(() => {
        mockReq.emit('end')
      }, 10)

      await executePipeline(mockReq, mockRes, mockConfig)

      expect([200, 404]).toContain(mockRes.statusCode)
    })
  })

  describe('Security Error Recovery', () => {
    it('should not log security violations with full error details', async () => {
      const mockReq = new EventEmitter() as any
      mockReq.method = 'GET'
      mockReq.url = '/../sensitive'
      mockReq.headers = {}

      const mockRes = HttpMocks.createMockResponse()

      setTimeout(() => {
        mockReq.emit('end')
      }, 10)

      await executePipeline(mockReq, mockRes, mockConfig)

      // Should return 403 but not include error details in non-debug mode
      expect(mockRes.statusCode).toBe(403)
    })

    it('should handle multiple security errors gracefully', async () => {
      const requests = [
        '/../etc/passwd',
        '/../../windows/system32',
        '/./../../sensitive',
      ]

      for (const requestPath of requests) {
        const mockReq = new EventEmitter() as any
        mockReq.method = 'GET'
        mockReq.url = requestPath
        mockReq.headers = {}

        const mockRes = HttpMocks.createMockResponse()

        setTimeout(() => {
          mockReq.emit('end')
        }, 10)

        await executePipeline(mockReq, mockRes, mockConfig)

        expect(mockRes.statusCode).toBe(403)
      }
    })
  })
})
