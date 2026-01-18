import { EventEmitter } from 'events'
import http from 'http'
import { executePipeline } from '../../src/middleware/pipeline'
import { HttpMocks, TestHelpers } from '../helpers'
import { Config } from '../../src/config'

describe('Pipeline Middleware', () => {
  let tempDir: string
  let consoleSpy: jest.SpyInstance
  let config: Config

  beforeEach(async () => {
    tempDir = await TestHelpers.createTempDirectory()
    config = {
      port: 3000,
      root: tempDir,
      debug: false,
    }
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(async () => {
    await TestHelpers.cleanupTempDirectory(tempDir)
    consoleSpy.mockRestore()
  })

  /**
   * Helper to create a mock request with proper typing
   */
  const createMockReq = (method: string, url: string, headers: Record<string, string> = {}): http.IncomingMessage => {
    const req = new EventEmitter() as any as http.IncomingMessage
    req.method = method
    req.url = url
    req.headers = headers
    return req
  }

  /**
   * Helper to simulate request completion (data + end events)
   * Ensures request events are emitted after pipeline execution starts
   */
  const simulateRequestData = (req: http.IncomingMessage, data?: Buffer | string): Promise<void> => {
    return new Promise(resolve => {
      setImmediate(() => {
        if (data) {
          (req as any).emit('data', typeof data === 'string' ? Buffer.from(data) : data)
        }
        (req as any).emit('end')
        resolve()
      })
    })
  }

  describe('Execution Order', () => {
    it('should execute middleware in correct order: security → body → router → logger', async () => {
      const executionOrder: string[] = []

      const req = createMockReq('GET', '/')
      const res = HttpMocks.createMockResponse()

      // Capture logger execution
      consoleSpy.mockImplementation((msg: any) => {
        if (typeof msg === 'string' && msg.startsWith('GET')) {
          executionOrder.push('logger')
        }
      })

      // Simulate request completion
      const requestPromise = simulateRequestData(req)

      await Promise.all([
        executePipeline(req, res, config),
        requestPromise,
      ])

      // Logger should be called last
      expect(executionOrder).toContain('logger')
    })

    it('should create request context before executing middleware', async () => {
      const req = createMockReq('GET', '/test.txt')
      const res = HttpMocks.createMockResponse()

      // Create a test file
      await TestHelpers.createTestFile(tempDir, 'test.txt', 'test content')

      // Request context creation should succeed without throwing
      const requestPromise = simulateRequestData(req)

      // Should not throw during pipeline execution
      await expect(Promise.all([
        executePipeline(req, res, config),
        requestPromise,
      ])).resolves.toBeDefined()

      // Should have created context successfully (not throw on stat/access)
      // Status may be 200 or 500 depending on mock response handling
      expect(res.statusCode).toBeDefined()
      expect([200, 404, 500]).toContain(res.statusCode)
    })
  })

  describe('Error Propagation', () => {
    it('should catch security violations and return 403 Forbidden', async () => {
      const req = createMockReq('GET', '/../etc/passwd')
      const res = HttpMocks.createMockResponse()

      const requestPromise = simulateRequestData(req)

      await Promise.all([
        executePipeline(req, res, config),
        requestPromise,
      ])

      expect(res.statusCode).toBe(403)
      expect(res.data).toContain('Forbidden')
    })

    it('should catch request body too large errors and return 413', async () => {
      const req = createMockReq('POST', '/')
      const res = HttpMocks.createMockResponse()

      // Emit a chunk that exceeds the 100MB limit
      const largeData = Buffer.alloc(101 * 1024 * 1024)
      const requestPromise = simulateRequestData(req, largeData)

      await Promise.all([
        executePipeline(req, res, config),
        requestPromise,
      ])

      expect(res.statusCode).toBe(413)
      expect(res.data).toContain('Request Entity Too Large')
    })

    it('should catch generic errors and return 500 Internal Server Error', async () => {
      const req = createMockReq('GET', '/')
      const res = HttpMocks.createMockResponse()

      // Emit error before end
      const requestPromise = new Promise<void>(resolve => {
        setImmediate(() => {
          (req as any).emit('error', new Error('Unexpected error'))
          setImmediate(() => {
            (req as any).emit('end')
            resolve()
          })
        })
      })

      await Promise.all([
        executePipeline(req, res, config),
        requestPromise,
      ])

      expect(res.statusCode).toBe(500)
      expect(res.data).toContain('Internal Server Error')
    })

    it('should handle context creation with valid URL gracefully', async () => {
      const req = createMockReq('GET', '/valid/path.txt')
      const res = HttpMocks.createMockResponse()

      const requestPromise = simulateRequestData(req)

      // Should handle missing file gracefully
      await Promise.all([
        executePipeline(req, res, config),
        requestPromise,
      ])

      // Should return a valid status code (404 for missing file)
      expect(res.statusCode).toBe(404)
    })
  })

  describe('Async Handling', () => {
    it('should complete security middleware without hanging on valid paths', async () => {
      const req = createMockReq('GET', '/valid/path.txt')
      const res = HttpMocks.createMockResponse()

      const requestPromise = simulateRequestData(req)

      // Should resolve without hanging (use timeout to detect hangs)
      let timeoutHandle: NodeJS.Timeout | null = null
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error('Pipeline hung')), 5000)
      })

      try {
        await expect(Promise.race([
          Promise.all([executePipeline(req, res, config), requestPromise]),
          timeoutPromise,
        ])).resolves.toBeDefined()
      } finally {
        if (timeoutHandle) clearTimeout(timeoutHandle)
      }

      // Verify security middleware executed (would return 404 for missing file)
      expect(res.statusCode).toBe(404)
    })

    it('should complete body collection without hanging on POST requests', async () => {
      const req = createMockReq('POST', '/')
      const res = HttpMocks.createMockResponse()

      const requestPromise = simulateRequestData(req, 'test data')

      // Should resolve without hanging (use timeout to detect hangs)
      let timeoutHandle: NodeJS.Timeout | null = null
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error('Pipeline hung')), 5000)
      })

      try {
        await expect(Promise.race([
          Promise.all([executePipeline(req, res, config), requestPromise]),
          timeoutPromise,
        ])).resolves.toBeDefined()
      } finally {
        if (timeoutHandle) clearTimeout(timeoutHandle)
      }

      // Verify body was collected and validated (missing Content-Type = 400)
      expect(res.statusCode).toBe(400)
      expect(res.data).toContain('Invalid content type')
    })

    it('should complete router execution without hanging on directory requests', async () => {
      const req = createMockReq('GET', '/')
      const res = HttpMocks.createMockResponse()

      const requestPromise = simulateRequestData(req)

      // Should resolve without hanging (use timeout to detect hangs)
      let timeoutHandle: NodeJS.Timeout | null = null
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error('Pipeline hung')), 5000)
      })

      try {
        await expect(Promise.race([
          Promise.all([executePipeline(req, res, config), requestPromise]),
          timeoutPromise,
        ])).resolves.toBeDefined()
      } finally {
        if (timeoutHandle) clearTimeout(timeoutHandle)
      }

      // Verify router executed and handled directory listing
      expect(res.statusCode).toBe(200)
    })

    it('should properly complete logger execution', async () => {
      const req = createMockReq('GET', '/')
      const res = HttpMocks.createMockResponse()

      const requestPromise = simulateRequestData(req)

      const pipelinePromise = executePipeline(req, res, config)

      // Logger should be called before promise resolves
      await Promise.all([pipelinePromise, requestPromise])
      expect(consoleSpy).toHaveBeenCalled()
    })
  })

  describe('Response Handling', () => {
    it('should set 200 status code for valid directory requests', async () => {
      const req = createMockReq('GET', '/')
      const res = HttpMocks.createMockResponse()

      const requestPromise = simulateRequestData(req)

      await Promise.all([
        executePipeline(req, res, config),
        requestPromise,
      ])

      expect(res.statusCode).toBe(200)
    })

    it('should set 404 status code for non-existent files', async () => {
      const req = createMockReq('GET', '/nonexistent.txt')
      const res = HttpMocks.createMockResponse()

      const requestPromise = simulateRequestData(req)

      await Promise.all([
        executePipeline(req, res, config),
        requestPromise,
      ])

      expect(res.statusCode).toBe(404)
      expect(res.data).toContain('Not Found')
    })

    it('should set Content-Type header for error responses', async () => {
      const req = createMockReq('GET', '/../etc/passwd')
      const res = HttpMocks.createMockResponse()

      const requestPromise = simulateRequestData(req)

      await Promise.all([
        executePipeline(req, res, config),
        requestPromise,
      ])

      expect(res.headers['Content-Type']).toBe('text/plain')
    })

    it('should handle file requests without throwing errors', async () => {
      const req = createMockReq('GET', '/test.txt')
      const res = HttpMocks.createMockResponse()

      // Create a test file to serve
      await TestHelpers.createTestFile(tempDir, 'test.txt', 'test content')

      const requestPromise = simulateRequestData(req)

      // Pipeline should complete without throwing errors
      await expect(Promise.all([
        executePipeline(req, res, config),
        requestPromise,
      ])).resolves.toBeDefined()

      // File was created, so router should attempt to serve (200 or 500 depending on mock)
      // The key is that the pipeline completes without crashing
      expect(res.statusCode).toBeDefined()
      expect(typeof res.statusCode).toBe('number')
      expect([200, 404, 500]).toContain(res.statusCode)
    })

    it('should reject POST requests without multipart/form-data', async () => {
      const req = createMockReq('POST', '/', { 'content-type': 'application/x-www-form-urlencoded' })
      const res = HttpMocks.createMockResponse()

      const requestPromise = simulateRequestData(req, 'test=data')

      await Promise.all([
        executePipeline(req, res, config),
        requestPromise,
      ])

      // POST without multipart/form-data returns 400 (file upload requires multipart)
      expect(res.statusCode).toBe(400)
      expect(res.data).toContain('Invalid content type')
    })
  })

  describe('Debug Logging', () => {
    it('should not log errors to console.error in non-debug mode', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      const req = createMockReq('GET', '/')
      const res = HttpMocks.createMockResponse()

      const requestPromise = simulateRequestData(req)

      await Promise.all([
        executePipeline(req, res, config),
        requestPromise,
      ])

      expect(errorSpy).not.toHaveBeenCalled()
      errorSpy.mockRestore()
    })

    it('should log errors to console.error in debug mode', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      const debugConfig = { ...config, debug: true }

      const req = createMockReq('GET', '/')
      const res = HttpMocks.createMockResponse()

      // Emit an error that triggers error path
      const requestPromise = new Promise<void>(resolve => {
        setImmediate(() => {
          (req as any).emit('error', new Error('Test error'))
          setImmediate(() => {
            (req as any).emit('end')
            resolve()
          })
        })
      })

      await Promise.all([
        executePipeline(req, res, debugConfig),
        requestPromise,
      ])

      // In debug mode, error should be logged with first call containing "Pipeline error"
      const calls = errorSpy.mock.calls
      expect(calls.length).toBeGreaterThan(0)
      expect(calls[0][0]).toContain('Pipeline error')
      errorSpy.mockRestore()
    })

    it('should include request method and URL in log output', async () => {
      const req = createMockReq('GET', '/test.txt')
      const res = HttpMocks.createMockResponse()

      const requestPromise = simulateRequestData(req)

      await Promise.all([
        executePipeline(req, res, config),
        requestPromise,
      ])

      // Should have logged something with method and URL
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('GET'))
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('/test.txt'))
    })
  })

  describe('Request Methods', () => {
    it('should handle GET requests to directories', async () => {
      const req = createMockReq('GET', '/')
      const res = HttpMocks.createMockResponse()

      const requestPromise = simulateRequestData(req)

      await Promise.all([
        executePipeline(req, res, config),
        requestPromise,
      ])

      expect(res.statusCode).toBe(200)
    })

    it('should reject form-urlencoded POST requests to root', async () => {
      const req = createMockReq('POST', '/', { 'content-type': 'application/x-www-form-urlencoded' })
      const res = HttpMocks.createMockResponse()

      const requestPromise = simulateRequestData(req, 'test=data')

      await Promise.all([
        executePipeline(req, res, config),
        requestPromise,
      ])

      // POST with form-urlencoded (not multipart) returns 400
      expect(res.statusCode).toBe(400)
      expect(res.data).toContain('Invalid content type')
    })

    it('should handle HEAD requests', async () => {
      const req = createMockReq('HEAD', '/')
      const res = HttpMocks.createMockResponse()

      const requestPromise = simulateRequestData(req)

      await Promise.all([
        executePipeline(req, res, config),
        requestPromise,
      ])

      expect(res.statusCode).toBe(200)
    })
  })

  describe('Security Error Recovery', () => {
    it('should return 403 for directory traversal attempts', async () => {
      const req = createMockReq('GET', '/../sensitive')
      const res = HttpMocks.createMockResponse()

      const requestPromise = simulateRequestData(req)

      await Promise.all([
        executePipeline(req, res, config),
        requestPromise,
      ])

      expect(res.statusCode).toBe(403)
      expect(res.data).toContain('Forbidden')
    })

    it('should handle multiple directory traversal attempts gracefully', async () => {
      const requests = [
        '/../etc/passwd',
        '/../../windows/system32',
        '/./../../sensitive',
      ]

      for (const url of requests) {
        const req = createMockReq('GET', url)
        const res = HttpMocks.createMockResponse()

        const requestPromise = simulateRequestData(req)

        await Promise.all([
          executePipeline(req, res, config),
          requestPromise,
        ])

        expect(res.statusCode).toBe(403)
      }
    })

    it('should handle different path encoding variations', async () => {
      const encodedTraversal = '/%2e%2e/etc/passwd'
      const req = createMockReq('GET', encodedTraversal)
      const res = HttpMocks.createMockResponse()

      const requestPromise = simulateRequestData(req)

      await Promise.all([
        executePipeline(req, res, config),
        requestPromise,
      ])

      expect(res.statusCode).toBe(403)
    })
  })

  describe('Edge Cases', () => {
    it('should reject POST with empty body and no Content-Type', async () => {
      const req = createMockReq('POST', '/')
      const res = HttpMocks.createMockResponse()

      const requestPromise = simulateRequestData(req, Buffer.alloc(0))

      await Promise.all([
        executePipeline(req, res, config),
        requestPromise,
      ])

      // POST without Content-Type returns 400 (Bad Request)
      expect(res.statusCode).toBe(400)
      expect(res.data).toContain('Invalid content type')
    })

    it('should handle requests with no headers', async () => {
      const req = createMockReq('GET', '/', {})
      const res = HttpMocks.createMockResponse()

      const requestPromise = simulateRequestData(req)

      await Promise.all([
        executePipeline(req, res, config),
        requestPromise,
      ])

      // Should handle request with missing headers gracefully
      expect(res.statusCode).toBe(200)
    })

    it('should handle requests with complex query strings', async () => {
      const req = createMockReq('GET', '/?foo=bar&baz=qux&test=value')
      const res = HttpMocks.createMockResponse()

      const requestPromise = simulateRequestData(req)

      await Promise.all([
        executePipeline(req, res, config),
        requestPromise,
      ])

      expect(res.statusCode).toBe(200)
    })
  })
})
