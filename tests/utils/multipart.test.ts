import { parseMultipart } from '../../src/utils/multipart'
import { HttpMocks } from '../../tests/helpers'

describe('parseMultipart', () => {
  describe('boundary detection', () => {
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'

    test('parses single file correctly', () => {
      const multipartData = HttpMocks.createMultipartData([
        { name: 'file', filename: 'test.txt', data: 'Hello World' }
      ])
      const parts = parseMultipart(multipartData, boundary)

      expect(parts).toHaveLength(1)
      expect(parts[0]).toEqual({
        name: 'file',
        filename: 'test.txt',
        data: Buffer.from('Hello World\r\n')
      })
    })

    test('parses multiple files correctly', () => {
      const multipartData = HttpMocks.createMultipartData([
        { name: 'file1', filename: 'test1.txt', data: 'Content 1' },
        { name: 'file2', filename: 'test2.jpg', data: Buffer.from([0xFF, 0xD8, 0xFF]) }
      ])
      const parts = parseMultipart(multipartData, boundary)

      expect(parts).toHaveLength(2)
      expect(parts[0]).toEqual({
        name: 'file1',
        filename: 'test1.txt',
        data: Buffer.from('Content 1\r\n')
      })
      expect(parts[1]).toEqual({
        name: 'file2',
        filename: 'test2.jpg',
        data: Buffer.from([0xFF, 0xD8, 0xFF, 0x0D, 0x0A])
      })
    })

    test('ignores parts without filename', () => {
      const multipartData = HttpMocks.createMultipartData([
        { name: 'textField', data: 'some text' }, // No filename
        { name: 'file', filename: 'test.txt', data: 'file content' }
      ])
      const parts = parseMultipart(multipartData, boundary)

      expect(parts).toHaveLength(1)
      expect(parts[0].filename).toBe('test.txt')
    })
  })

  describe('header parsing', () => {
    test('extracts name and filename from Content-Disposition', () => {
      const boundary = '----BoundaryTest'
      const body = Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="upload"; filename="myfile.txt"\r\n` +
        `Content-Type: text/plain\r\n` +
        `\r\n` +
        `File content here\r\n` +
        `--${boundary}--\r\n`
      )
      const parts = parseMultipart(body, boundary)

      expect(parts).toHaveLength(1)
      expect(parts[0].name).toBe('upload')
      expect(parts[0].filename).toBe('myfile.txt')
      expect(parts[0].data.toString()).toBe('File content here\r\n')
    })

    test('handles missing Content-Type header', () => {
      const boundary = '----BoundaryTest'
      const body = Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="test.txt"\r\n` +
        `\r\n` +
        `Content without type\r\n` +
        `--${boundary}--\r\n`
      )
      const parts = parseMultipart(body, boundary)

      expect(parts).toHaveLength(1)
      expect(parts[0].data.toString()).toBe('Content without type\r\n')
    })
  })

  describe('data extraction', () => {
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'

    test('extracts binary data correctly', () => {
      const binaryData = Buffer.from([0x00, 0x01, 0x02, 0xFF, 0xFE, 0xFD])
      const multipartData = HttpMocks.createMultipartData([
        { name: 'binary', filename: 'data.bin', data: binaryData }
      ])
      const parts = parseMultipart(multipartData, boundary)

      expect(parts).toHaveLength(1)
      expect(parts[0].data).toEqual(Buffer.concat([binaryData, Buffer.from('\r\n')]))
    })

    test('handles empty file data', () => {
      const multipartData = HttpMocks.createMultipartData([
        { name: 'empty', filename: 'empty.txt', data: '' }
      ])
      const parts = parseMultipart(multipartData, boundary)

      expect(parts).toHaveLength(1)
      expect(parts[0].data).toEqual(Buffer.from('\r\n'))
    })

    test('preserves CRLF in data', () => {
      const dataWithCRLF = 'Line 1\r\nLine 2\r\nLine 3'
      const multipartData = HttpMocks.createMultipartData([
        { name: 'text', filename: 'multiline.txt', data: dataWithCRLF }
      ])
      const parts = parseMultipart(multipartData, boundary)

      expect(parts).toHaveLength(1)
      expect(parts[0].data.toString()).toBe(dataWithCRLF + '\r\n')
    })
  })

  describe('malformed data', () => {
    test('returns empty array for wrong boundary', () => {
      const wrongBoundary = '----WrongBoundary'
      const multipartData = HttpMocks.createMultipartData([
        { name: 'file', filename: 'test.txt', data: 'content' }
      ])
      const parts = parseMultipart(multipartData, wrongBoundary)

      expect(parts).toEqual([])
    })

    test('handles missing end boundary', () => {
      const boundary = '----BoundaryTest'
      const body = Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="test.txt"\r\n` +
        `\r\n` +
        `Content here`
        // Missing closing boundary
      )
      const parts = parseMultipart(body, boundary)

      expect(parts).toEqual([])
    })

    test('handles malformed Content-Disposition header', () => {
      const boundary = '----BoundaryTest'
      const body = Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: malformed header\r\n` +
        `\r\n` +
        `Some content\r\n` +
        `--${boundary}--\r\n`
      )
      const parts = parseMultipart(body, boundary)

      expect(parts).toEqual([])
    })

    test('handles missing filename in Content-Disposition', () => {
      const boundary = '----BoundaryTest'
      const body = Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"\r\n` +
        `\r\n` +
        `Content without filename\r\n` +
        `--${boundary}--\r\n`
      )
      const parts = parseMultipart(body, boundary)

      expect(parts).toEqual([])
    })

    test('handles empty body', () => {
      const parts = parseMultipart(Buffer.alloc(0), 'boundary')
      expect(parts).toEqual([])
    })

    test('handles body with only boundaries', () => {
      const boundary = '----BoundaryTest'
      const body = Buffer.from(`--${boundary}\r\n--${boundary}--\r\n`)
      const parts = parseMultipart(body, boundary)

      expect(parts).toEqual([])
    })
  })
})