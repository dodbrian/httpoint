import { formatFileSize } from '../../src/utils/format'

describe('formatFileSize', () => {
  describe('byte conversions', () => {
    test('formats bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0.0 B')
      expect(formatFileSize(1)).toBe('1.0 B')
      expect(formatFileSize(512)).toBe('512.0 B')
      expect(formatFileSize(1023)).toBe('1023.0 B')
    })

    test('formats kilobytes correctly', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB')
      expect(formatFileSize(1536)).toBe('1.5 KB')
      expect(formatFileSize(1024 * 512)).toBe('512.0 KB')
      expect(formatFileSize(1048575)).toBe('1024.0 KB')
    })

    test('formats megabytes correctly', () => {
      expect(formatFileSize(1048576)).toBe('1.0 MB')
      expect(formatFileSize(1048576 * 1.5)).toBe('1.5 MB')
      expect(formatFileSize(1048576 * 1024)).toBe('1.0 GB')
    })

    test('formats gigabytes correctly', () => {
      expect(formatFileSize(1073741824)).toBe('1.0 GB')
      expect(formatFileSize(1073741824 * 2.5)).toBe('2.5 GB')
      expect(formatFileSize(1073741824 * 1024)).toBe('1.0 TB')
    })

    test('formats terabytes correctly', () => {
      expect(formatFileSize(1099511627776)).toBe('1.0 TB')
      expect(formatFileSize(1099511627776 * 3.7)).toBe('3.7 TB')
    })
  })

  describe('boundary conditions', () => {
    test('handles exact unit boundaries', () => {
      expect(formatFileSize(1023)).toBe('1023.0 B')
      expect(formatFileSize(1024)).toBe('1.0 KB')
      expect(formatFileSize(1048575)).toBe('1024.0 KB')
      expect(formatFileSize(1048576)).toBe('1.0 MB')
      expect(formatFileSize(1073741823)).toBe('1024.0 MB')
      expect(formatFileSize(1073741824)).toBe('1.0 GB')
    })

    test('handles fractional values at boundaries', () => {
      expect(formatFileSize(1023.4)).toBe('1023.4 B')
      expect(formatFileSize(1023.9)).toBe('1023.9 B')
      expect(formatFileSize(1024.1)).toBe('1.0 KB')
    })
  })

  describe('large numbers', () => {
    test('handles very large numbers', () => {
      expect(formatFileSize(1099511627776 * 100)).toBe('100.0 TB')
      expect(formatFileSize(1099511627776 * 1024)).toBe('1024.0 TB')
      expect(formatFileSize(1099511627776 * 1024 * 1024)).toBe('1048576.0 TB')
    })

    test('handles maximum safe integer', () => {
      expect(formatFileSize(Number.MAX_SAFE_INTEGER)).toBe('8192.0 TB')
    })
  })

  describe('zero and negative values', () => {
    test('handles zero', () => {
      expect(formatFileSize(0)).toBe('0.0 B')
    })

    test('handles negative values', () => {
      expect(formatFileSize(-1)).toBe('-1.0 B')
      expect(formatFileSize(-1024)).toBe('-1024.0 B')
      expect(formatFileSize(-1048576)).toBe('-1048576.0 B')
    })
  })
})