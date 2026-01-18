import { EventEmitter } from 'events'
import url from 'url'
import { bodyCollector } from '../../src/middleware/body-collector'
import { RequestContext } from '../../src/context/request'
import { HttpMocks, TestHelpers } from '../helpers'

describe('Body Collector Middleware', () => {
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

  // Helper to create mock request with sensible defaults
  const createMockRequest = (overrides?: Record<string, any>): EventEmitter & any => {
    const mockReq = new EventEmitter() as any
    mockReq.method = 'POST'
    mockReq.url = '/'
    mockReq.headers = {}
    Object.assign(mockReq, overrides)
    return mockReq
  }

  // Helper to create request context with sensible defaults
  const createContext = (overrides?: Partial<RequestContext>): RequestContext => {
    return {
      req: createMockRequest(),
      res: HttpMocks.createMockResponse(),
      requestPath: '/',
      filePath: tempDir,
      body: undefined,
      parsedUrl: url.parse('/', true),
      config: mockConfig,
      ...overrides,
    }
  }

  // Helper to emit data and end events asynchronously
  const emitDataAndEnd = (req: EventEmitter, chunks: Buffer[]): void => {
    setImmediate(() => {
      chunks.forEach(chunk => req.emit('data', chunk))
      req.emit('end')
    })
  }

  // Helper to emit error asynchronously
  const emitError = (req: EventEmitter, error: Error): void => {
    setImmediate(() => req.emit('error', error))
  }

  describe('Body Accumulation', () => {
    it('should collect single chunk of body data', async () => {
      const context = createContext()
      const bodyPromise = bodyCollector(context)

      emitDataAndEnd(context.req, [Buffer.from('test data')])

      await bodyPromise
      expect(context.body).toEqual(Buffer.from('test data'))
      expect(context.body?.length).toBe(9)
    })

    it('should collect multiple chunks of body data', async () => {
      const context = createContext()
      const bodyPromise = bodyCollector(context)

      const chunks = [
        Buffer.from('chunk1'),
        Buffer.from('chunk2'),
        Buffer.from('chunk3'),
      ]
      emitDataAndEnd(context.req, chunks)

      await bodyPromise
      expect(context.body).toEqual(Buffer.from('chunk1chunk2chunk3'))
      expect(context.body?.length).toBe(18)
    })

    it('should handle empty body', async () => {
      const context = createContext()
      const bodyPromise = bodyCollector(context)

      emitDataAndEnd(context.req, [])

      await bodyPromise
      expect(context.body).toEqual(Buffer.from(''))
      expect(context.body?.length).toBe(0)
    })

    it('should preserve binary buffer content exactly', async () => {
      const testData = Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe, 0xfd])
      const context = createContext({
        req: createMockRequest({ headers: { 'content-type': 'application/octet-stream' } }),
      })
      const bodyPromise = bodyCollector(context)

      emitDataAndEnd(context.req, [testData])

      await bodyPromise
      expect(context.body).toEqual(testData)
      expect(context.body?.[0]).toBe(0x00)
      expect(context.body?.[5]).toBe(0xfd)
    })

    it('should concatenate chunks in correct order', async () => {
      const context = createContext()
      const bodyPromise = bodyCollector(context)

      const chunks = Array.from({ length: 5 }, (_, i) => Buffer.from(`chunk${i}|`))
      emitDataAndEnd(context.req, chunks)

      await bodyPromise
      const result = context.body?.toString() || ''
      expect(result).toBe('chunk0|chunk1|chunk2|chunk3|chunk4|')
    })
  })

  describe('Content Types', () => {
    it('should handle text/plain content', async () => {
      const context = createContext({
        req: createMockRequest({ headers: { 'content-type': 'text/plain' } }),
        requestPath: '/api',
        filePath: `${tempDir}/api`,
        parsedUrl: url.parse('/api', true),
      })
      const bodyPromise = bodyCollector(context)

      emitDataAndEnd(context.req, [Buffer.from('Hello World')])

      await bodyPromise
      expect(context.body?.toString()).toBe('Hello World')
    })

    it('should handle application/json content', async () => {
      const jsonData = { name: 'test', value: 123 }
      const context = createContext({
        req: createMockRequest({ headers: { 'content-type': 'application/json' } }),
        requestPath: '/api',
        filePath: `${tempDir}/api`,
        parsedUrl: url.parse('/api', true),
      })
      const bodyPromise = bodyCollector(context)

      emitDataAndEnd(context.req, [Buffer.from(JSON.stringify(jsonData))])

      await bodyPromise
      const parsed = JSON.parse(context.body!.toString())
      expect(parsed).toEqual(jsonData)
      expect(parsed.name).toBe('test')
      expect(parsed.value).toBe(123)
    })

    it('should handle multipart/form-data content', async () => {
      const multipartData = HttpMocks.createMultipartData([
        { name: 'field1', data: 'value1' },
        { name: 'file', filename: 'test.txt', data: 'file content' },
      ])
      const context = createContext({
        req: createMockRequest({ headers: { 'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary' } }),
      })
      const bodyPromise = bodyCollector(context)

      emitDataAndEnd(context.req, [multipartData])

      await bodyPromise
      expect(context.body).toEqual(multipartData)
      expect(context.body?.length).toBe(multipartData.length)
    })

    it('should handle application/x-www-form-urlencoded', async () => {
      const formData = 'name=test&value=123&flag=true'
      const context = createContext({
        req: createMockRequest({ headers: { 'content-type': 'application/x-www-form-urlencoded' } }),
        requestPath: '/form',
        filePath: `${tempDir}/form`,
        parsedUrl: url.parse('/form', true),
      })
      const bodyPromise = bodyCollector(context)

      emitDataAndEnd(context.req, [Buffer.from(formData)])

      await bodyPromise
      expect(context.body?.toString()).toBe(formData)
      expect(context.body?.toString()).toContain('value=123')
    })
  })

  describe('Size Limits', () => {
    it('should reject bodies exceeding MAX_BODY_SIZE', async () => {
      const context = createContext()
      const bodyPromise = bodyCollector(context)

      const largeBuffer = Buffer.alloc(101 * 1024 * 1024)
      emitDataAndEnd(context.req, [largeBuffer])

      await expect(bodyPromise).rejects.toThrow('Request body too large')
    })

    it('should accept bodies just under MAX_BODY_SIZE', async () => {
      const context = createContext()
      const bodyPromise = bodyCollector(context)

      const largeBuffer = Buffer.alloc(50 * 1024 * 1024)
      emitDataAndEnd(context.req, [largeBuffer])

      await bodyPromise
      expect(context.body?.length).toBe(50 * 1024 * 1024)
    })

    it('should accumulate chunks and reject when exceeding limit', async () => {
      const context = createContext()
      const bodyPromise = bodyCollector(context)

      setImmediate(() => {
        context.req.emit('data', Buffer.alloc(60 * 1024 * 1024))
        context.req.emit('data', Buffer.alloc(60 * 1024 * 1024))
      })

      await expect(bodyPromise).rejects.toThrow('Request body too large')
    })

    it('should handle zero-byte body within limits', async () => {
      const context = createContext()
      const bodyPromise = bodyCollector(context)

      emitDataAndEnd(context.req, [Buffer.alloc(0)])

      await bodyPromise
      expect(context.body?.length).toBe(0)
    })

    it('should accept multiple small chunks totaling under limit', async () => {
      const context = createContext()
      const bodyPromise = bodyCollector(context)

      const chunks = Array.from({ length: 100 }, () => Buffer.alloc(100 * 1024)) // 100 chunks of 100KB = 10MB
      emitDataAndEnd(context.req, chunks)

      await bodyPromise
      expect(context.body?.length).toBe(100 * 100 * 1024)
    })
  })

  describe('Streaming', () => {
    it('should handle streaming with gradual data arrival', async () => {
      const context = createContext({
        requestPath: '/stream',
        filePath: `${tempDir}/stream`,
        parsedUrl: url.parse('/stream', true),
      })
      const bodyPromise = bodyCollector(context)

      let emitCount = 0
      const emitWithDelay = () => {
        const parts = [Buffer.from('part1'), Buffer.from('part2'), Buffer.from('part3')]
        let index = 0

        const timer = setInterval(() => {
          context.req.emit('data', parts[index])
          index++
          emitCount++

          if (index >= parts.length) {
            clearInterval(timer)
            context.req.emit('end')
          }
        }, 5)
      }

      setImmediate(emitWithDelay)

      await bodyPromise
      expect(context.body).toEqual(Buffer.from('part1part2part3'))
      expect(emitCount).toBe(3)
    })

    it('should handle rapid streaming data', async () => {
      const context = createContext()
      const bodyPromise = bodyCollector(context)

      emitDataAndEnd(context.req, Array.from({ length: 10 }, (_, i) => Buffer.from(`data${i}|`)))

      await bodyPromise
      const result = context.body?.toString() || ''
      expect(result).toMatch(/data0\|data1\|.*data9\|/)
      expect(result.split('|').length).toBe(11)
    })
  })

  describe('Error Handling', () => {
    it('should propagate request errors', async () => {
      const context = createContext()
      const bodyPromise = bodyCollector(context)

      emitError(context.req, new Error('Connection reset'))

      await expect(bodyPromise).rejects.toThrow('Connection reset')
    })

    it('should handle socket hang up errors', async () => {
      const context = createContext()
      const bodyPromise = bodyCollector(context)

      emitError(context.req, new Error('Socket hang up'))

      await expect(bodyPromise).rejects.toThrow('Socket hang up')
    })

    it('should handle ECONNRESET errors', async () => {
      const context = createContext()
      const bodyPromise = bodyCollector(context)

      const error = new Error('ECONNRESET: Connection reset by peer')
      emitError(context.req, error)

      await expect(bodyPromise).rejects.toThrow('ECONNRESET')
    })

    it('should update context.body with collected data', async () => {
      const context = createContext()
      expect(context.body).toBeUndefined()

      const bodyPromise = bodyCollector(context)

      emitDataAndEnd(context.req, [Buffer.from('test content')])

      await bodyPromise
      expect(context.body).toBeDefined()
      expect(context.body?.toString()).toBe('test content')
    })

    it('should not modify context.body if error occurs before data', async () => {
      const context = createContext()
      const bodyPromise = bodyCollector(context)

      emitError(context.req, new Error('Network error'))

      await expect(bodyPromise).rejects.toThrow('Network error')
      expect(context.body).toBeUndefined()
    })

    it('should reject if error occurs after partial data received', async () => {
      const context = createContext()
      const bodyPromise = bodyCollector(context)

      setImmediate(() => {
        context.req.emit('data', Buffer.from('partial data'))
        context.req.emit('error', new Error('Transmission interrupted'))
      })

      await expect(bodyPromise).rejects.toThrow('Transmission interrupted')
    })
  })

  describe('Large Files', () => {
    it('should handle 10MB file upload', async () => {
      const context = createContext({
        requestPath: '/upload',
        filePath: `${tempDir}/upload`,
        parsedUrl: url.parse('/upload', true),
      })
      const bodyPromise = bodyCollector(context)

      const largeBuffer = Buffer.alloc(10 * 1024 * 1024, 'a')
      emitDataAndEnd(context.req, [largeBuffer])

      await bodyPromise
      expect(context.body?.length).toBe(10 * 1024 * 1024)
      expect(context.body?.[0]).toBe(97) // 'a' in ASCII
    })

    it('should handle file uploaded in multiple chunks', async () => {
      const context = createContext({
        requestPath: '/upload',
        filePath: `${tempDir}/upload`,
        parsedUrl: url.parse('/upload', true),
      })
      const bodyPromise = bodyCollector(context)

      const chunkSize = 512 * 1024 // 512KB chunks
      const totalChunks = 10
      const chunks = Array.from({ length: totalChunks }, (_, i) =>
        Buffer.alloc(chunkSize, String(i))
      )

      emitDataAndEnd(context.req, chunks)

      await bodyPromise
      expect(context.body?.length).toBe(512 * 1024 * 10)
    })

    it('should handle file uploaded with varying chunk sizes', async () => {
      const context = createContext({
        requestPath: '/upload',
        filePath: `${tempDir}/upload`,
        parsedUrl: url.parse('/upload', true),
      })
      const bodyPromise = bodyCollector(context)

      const chunks = [
        Buffer.alloc(1024 * 1024),      // 1MB
        Buffer.alloc(2 * 1024 * 1024),  // 2MB
        Buffer.alloc(1024 * 1024),      // 1MB
        Buffer.alloc(512 * 1024),       // 512KB
      ]

      emitDataAndEnd(context.req, chunks)

      await bodyPromise
      // 1MB + 2MB + 1MB + 512KB = 4.5MB
      const expectedSize = 1024 * 1024 + 2 * 1024 * 1024 + 1024 * 1024 + 512 * 1024
      expect(context.body?.length).toBe(expectedSize)
    })

    it('should handle maximum allowed body size exactly', async () => {
      const context = createContext()
      const bodyPromise = bodyCollector(context)

      const maxSize = 100 * 1024 * 1024
      const buffer = Buffer.alloc(maxSize)
      emitDataAndEnd(context.req, [buffer])

      await bodyPromise
      expect(context.body?.length).toBe(maxSize)
    })
  })
})
