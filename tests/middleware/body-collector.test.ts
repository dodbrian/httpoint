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

  describe('Body Accumulation', () => {
    it('should collect single chunk of body data', async () => {
      const mockReq = new EventEmitter() as any
      mockReq.method = 'POST'
      mockReq.url = '/'
      mockReq.headers = {}

      const context: RequestContext = {
        req: mockReq,
        res: HttpMocks.createMockResponse(),
        requestPath: '/',
        filePath: tempDir,
        body: undefined,
        parsedUrl: url.parse('/', true),
        config: mockConfig,
      }

      const bodyPromise = bodyCollector(context)

      // Simulate receiving data
      setTimeout(() => {
        mockReq.emit('data', Buffer.from('test data'))
        mockReq.emit('end')
      }, 10)

      await bodyPromise
      expect(context.body).toEqual(Buffer.from('test data'))
    })

    it('should collect multiple chunks of body data', async () => {
      const mockReq = new EventEmitter() as any
      mockReq.method = 'POST'
      mockReq.url = '/'
      mockReq.headers = {}

      const context: RequestContext = {
        req: mockReq,
        res: HttpMocks.createMockResponse(),
        requestPath: '/',
        filePath: tempDir,
        body: undefined,
        parsedUrl: url.parse('/', true),
        config: mockConfig,
      }

      const bodyPromise = bodyCollector(context)

      // Simulate receiving multiple chunks
      setTimeout(() => {
        mockReq.emit('data', Buffer.from('chunk1'))
        mockReq.emit('data', Buffer.from('chunk2'))
        mockReq.emit('data', Buffer.from('chunk3'))
        mockReq.emit('end')
      }, 10)

      await bodyPromise
      expect(context.body).toEqual(Buffer.from('chunk1chunk2chunk3'))
    })

    it('should handle empty body', async () => {
      const mockReq = new EventEmitter() as any
      mockReq.method = 'POST'
      mockReq.url = '/'
      mockReq.headers = {}

      const context: RequestContext = {
        req: mockReq,
        res: HttpMocks.createMockResponse(),
        requestPath: '/',
        filePath: tempDir,
        body: undefined,
        parsedUrl: url.parse('/', true),
        config: mockConfig,
      }

      const bodyPromise = bodyCollector(context)

      // Simulate no data chunks
      setTimeout(() => {
        mockReq.emit('end')
      }, 10)

      await bodyPromise
      expect(context.body).toEqual(Buffer.from(''))
    })

    it('should preserve buffer content exactly', async () => {
      const mockReq = new EventEmitter() as any
      mockReq.method = 'POST'
      mockReq.url = '/'
      mockReq.headers = { 'content-type': 'application/octet-stream' }

      const testData = Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe, 0xfd])
      const context: RequestContext = {
        req: mockReq,
        res: HttpMocks.createMockResponse(),
        requestPath: '/',
        filePath: tempDir,
        body: undefined,
        parsedUrl: url.parse('/', true),
        config: mockConfig,
      }

      const bodyPromise = bodyCollector(context)

      setTimeout(() => {
        mockReq.emit('data', testData)
        mockReq.emit('end')
      }, 10)

      await bodyPromise
      expect(context.body).toEqual(testData)
    })
  })

  describe('Content Types', () => {
    it('should handle text/plain content', async () => {
      const mockReq = new EventEmitter() as any
      mockReq.method = 'POST'
      mockReq.url = '/api'
      mockReq.headers = { 'content-type': 'text/plain' }

      const context: RequestContext = {
        req: mockReq,
        res: HttpMocks.createMockResponse(),
        requestPath: '/api',
        filePath: `${tempDir}/api`,
        body: undefined,
        parsedUrl: url.parse('/api', true),
        config: mockConfig,
      }

      const bodyPromise = bodyCollector(context)

      setTimeout(() => {
        mockReq.emit('data', Buffer.from('Hello World'))
        mockReq.emit('end')
      }, 10)

      await bodyPromise
      expect(context.body?.toString()).toBe('Hello World')
    })

    it('should handle application/json content', async () => {
      const mockReq = new EventEmitter() as any
      mockReq.method = 'POST'
      mockReq.url = '/api'
      mockReq.headers = { 'content-type': 'application/json' }

      const jsonData = { name: 'test', value: 123 }
      const context: RequestContext = {
        req: mockReq,
        res: HttpMocks.createMockResponse(),
        requestPath: '/api',
        filePath: `${tempDir}/api`,
        body: undefined,
        parsedUrl: url.parse('/api', true),
        config: mockConfig,
      }

      const bodyPromise = bodyCollector(context)

      setTimeout(() => {
        mockReq.emit('data', Buffer.from(JSON.stringify(jsonData)))
        mockReq.emit('end')
      }, 10)

      await bodyPromise
      expect(JSON.parse(context.body!.toString())).toEqual(jsonData)
    })

    it('should handle multipart/form-data content', async () => {
      const mockReq = new EventEmitter() as any
      mockReq.method = 'POST'
      mockReq.url = '/'
      mockReq.headers = { 'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary' }

      const multipartData = HttpMocks.createMultipartData([
        { name: 'field1', data: 'value1' },
        { name: 'file', filename: 'test.txt', data: 'file content' },
      ])

      const context: RequestContext = {
        req: mockReq,
        res: HttpMocks.createMockResponse(),
        requestPath: '/',
        filePath: tempDir,
        body: undefined,
        parsedUrl: url.parse('/', true),
        config: mockConfig,
      }

      const bodyPromise = bodyCollector(context)

      setTimeout(() => {
        mockReq.emit('data', multipartData)
        mockReq.emit('end')
      }, 10)

      await bodyPromise
      expect(context.body).toEqual(multipartData)
    })

    it('should handle application/x-www-form-urlencoded', async () => {
      const mockReq = new EventEmitter() as any
      mockReq.method = 'POST'
      mockReq.url = '/form'
      mockReq.headers = { 'content-type': 'application/x-www-form-urlencoded' }

      const formData = 'name=test&value=123&flag=true'
      const context: RequestContext = {
        req: mockReq,
        res: HttpMocks.createMockResponse(),
        requestPath: '/form',
        filePath: `${tempDir}/form`,
        body: undefined,
        parsedUrl: url.parse('/form', true),
        config: mockConfig,
      }

      const bodyPromise = bodyCollector(context)

      setTimeout(() => {
        mockReq.emit('data', Buffer.from(formData))
        mockReq.emit('end')
      }, 10)

      await bodyPromise
      expect(context.body?.toString()).toBe(formData)
    })
  })

  describe('Size Limits', () => {
    it('should reject bodies exceeding MAX_BODY_SIZE', async () => {
      const mockReq = new EventEmitter() as any
      mockReq.method = 'POST'
      mockReq.url = '/'
      mockReq.headers = {}

      const context: RequestContext = {
        req: mockReq,
        res: HttpMocks.createMockResponse(),
        requestPath: '/',
        filePath: tempDir,
        body: undefined,
        parsedUrl: url.parse('/', true),
        config: mockConfig,
      }

      const bodyPromise = bodyCollector(context)

      // Send data that exceeds MAX_BODY_SIZE (100 * 1024 * 1024)
      setTimeout(() => {
        // Create a large chunk (> 100MB)
        const largeBuffer = Buffer.alloc(101 * 1024 * 1024)
        mockReq.emit('data', largeBuffer)
      }, 10)

      await expect(bodyPromise).rejects.toThrow('Request body too large')
    })

    it('should accept bodies just under MAX_BODY_SIZE', async () => {
      const mockReq = new EventEmitter() as any
      mockReq.method = 'POST'
      mockReq.url = '/'
      mockReq.headers = {}

      const context: RequestContext = {
        req: mockReq,
        res: HttpMocks.createMockResponse(),
        requestPath: '/',
        filePath: tempDir,
        body: undefined,
        parsedUrl: url.parse('/', true),
        config: mockConfig,
      }

      const bodyPromise = bodyCollector(context)

      // Send data that's just under the limit
      setTimeout(() => {
        const largeBuffer = Buffer.alloc(50 * 1024 * 1024) // 50MB
        mockReq.emit('data', largeBuffer)
        mockReq.emit('end')
      }, 10)

      await bodyPromise
      expect(context.body?.length).toBe(50 * 1024 * 1024)
    })

    it('should accumulate chunks and reject when exceeding limit', async () => {
      const mockReq = new EventEmitter() as any
      mockReq.method = 'POST'
      mockReq.url = '/'
      mockReq.headers = {}

      const context: RequestContext = {
        req: mockReq,
        res: HttpMocks.createMockResponse(),
        requestPath: '/',
        filePath: tempDir,
        body: undefined,
        parsedUrl: url.parse('/', true),
        config: mockConfig,
      }

      const bodyPromise = bodyCollector(context)

      // Send multiple large chunks that together exceed the limit
      setTimeout(() => {
        mockReq.emit('data', Buffer.alloc(60 * 1024 * 1024))
        mockReq.emit('data', Buffer.alloc(60 * 1024 * 1024)) // This exceeds limit
      }, 10)

      await expect(bodyPromise).rejects.toThrow('Request body too large')
    })

    it('should handle zero-byte body within limits', async () => {
      const mockReq = new EventEmitter() as any
      mockReq.method = 'POST'
      mockReq.url = '/'
      mockReq.headers = {}

      const context: RequestContext = {
        req: mockReq,
        res: HttpMocks.createMockResponse(),
        requestPath: '/',
        filePath: tempDir,
        body: undefined,
        parsedUrl: url.parse('/', true),
        config: mockConfig,
      }

      const bodyPromise = bodyCollector(context)

      setTimeout(() => {
        mockReq.emit('data', Buffer.alloc(0))
        mockReq.emit('end')
      }, 10)

      await bodyPromise
      expect(context.body?.length).toBe(0)
    })
  })

  describe('Streaming', () => {
    it('should handle streaming with gradual data arrival', async () => {
      const mockReq = new EventEmitter() as any
      mockReq.method = 'POST'
      mockReq.url = '/stream'
      mockReq.headers = {}

      const context: RequestContext = {
        req: mockReq,
        res: HttpMocks.createMockResponse(),
        requestPath: '/stream',
        filePath: `${tempDir}/stream`,
        body: undefined,
        parsedUrl: url.parse('/stream', true),
        config: mockConfig,
      }

      const bodyPromise = bodyCollector(context)

      // Simulate gradual data arrival
      setTimeout(() => {
        mockReq.emit('data', Buffer.from('part1'))
      }, 10)

      setTimeout(() => {
        mockReq.emit('data', Buffer.from('part2'))
      }, 20)

      setTimeout(() => {
        mockReq.emit('data', Buffer.from('part3'))
      }, 30)

      setTimeout(() => {
        mockReq.emit('end')
      }, 40)

      await bodyPromise
      expect(context.body).toEqual(Buffer.from('part1part2part3'))
    })
  })

  describe('Error Handling', () => {
    it('should propagate request errors', async () => {
      const mockReq = new EventEmitter() as any
      mockReq.method = 'POST'
      mockReq.url = '/'
      mockReq.headers = {}

      const context: RequestContext = {
        req: mockReq,
        res: HttpMocks.createMockResponse(),
        requestPath: '/',
        filePath: tempDir,
        body: undefined,
        parsedUrl: url.parse('/', true),
        config: mockConfig,
      }

      const bodyPromise = bodyCollector(context)

      setTimeout(() => {
        mockReq.emit('error', new Error('Connection reset'))
      }, 10)

      await expect(bodyPromise).rejects.toThrow('Connection reset')
    })

    it('should handle socket hang up errors', async () => {
      const mockReq = new EventEmitter() as any
      mockReq.method = 'POST'
      mockReq.url = '/'
      mockReq.headers = {}

      const context: RequestContext = {
        req: mockReq,
        res: HttpMocks.createMockResponse(),
        requestPath: '/',
        filePath: tempDir,
        body: undefined,
        parsedUrl: url.parse('/', true),
        config: mockConfig,
      }

      const bodyPromise = bodyCollector(context)

      setTimeout(() => {
        const error = new Error('Socket hang up')
        mockReq.emit('error', error)
      }, 10)

      await expect(bodyPromise).rejects.toThrow('Socket hang up')
    })

    it('should update context.body with collected data', async () => {
      const mockReq = new EventEmitter() as any
      mockReq.method = 'POST'
      mockReq.url = '/'
      mockReq.headers = {}

      const context: RequestContext = {
        req: mockReq,
        res: HttpMocks.createMockResponse(),
        requestPath: '/',
        filePath: tempDir,
        body: undefined,
        parsedUrl: url.parse('/', true),
        config: mockConfig,
      }

      expect(context.body).toBeUndefined()

      const bodyPromise = bodyCollector(context)

      setTimeout(() => {
        mockReq.emit('data', Buffer.from('test content'))
        mockReq.emit('end')
      }, 10)

      await bodyPromise
      expect(context.body).toBeDefined()
      expect(context.body?.toString()).toBe('test content')
    })
  })

  describe('Large Files', () => {
    it('should handle 10MB file upload', async () => {
      const mockReq = new EventEmitter() as any
      mockReq.method = 'POST'
      mockReq.url = '/upload'
      mockReq.headers = {}

      const context: RequestContext = {
        req: mockReq,
        res: HttpMocks.createMockResponse(),
        requestPath: '/upload',
        filePath: `${tempDir}/upload`,
        body: undefined,
        parsedUrl: url.parse('/upload', true),
        config: mockConfig,
      }

      const bodyPromise = bodyCollector(context)

      setTimeout(() => {
        const largeBuffer = Buffer.alloc(10 * 1024 * 1024, 'a')
        mockReq.emit('data', largeBuffer)
        mockReq.emit('end')
      }, 10)

      await bodyPromise
      expect(context.body?.length).toBe(10 * 1024 * 1024)
    })

    it('should handle file uploaded in multiple chunks', async () => {
      const mockReq = new EventEmitter() as any
      mockReq.method = 'POST'
      mockReq.url = '/upload'
      mockReq.headers = {}

      const context: RequestContext = {
        req: mockReq,
        res: HttpMocks.createMockResponse(),
        requestPath: '/upload',
        filePath: `${tempDir}/upload`,
        body: undefined,
        parsedUrl: url.parse('/upload', true),
        config: mockConfig,
      }

      const bodyPromise = bodyCollector(context)

      setTimeout(() => {
        // Simulate chunked upload of 5MB file
        const chunkSize = 512 * 1024 // 512KB chunks
        const totalChunks = 10

        for (let i = 0; i < totalChunks; i++) {
          mockReq.emit('data', Buffer.alloc(chunkSize, String(i)))
        }
        mockReq.emit('end')
      }, 10)

      await bodyPromise
      expect(context.body?.length).toBe(512 * 1024 * 10)
    })
  })
})
