import { getMimeType } from '../../src/utils/mime'

describe('getMimeType', () => {
  describe('supported file extensions', () => {
    test('returns text/html for .html files', () => {
      expect(getMimeType('index.html')).toBe('text/html')
    })

    test('returns text/css for .css files', () => {
      expect(getMimeType('styles.css')).toBe('text/css')
    })

    test('returns application/javascript for .js files', () => {
      expect(getMimeType('script.js')).toBe('application/javascript')
    })

    test('returns application/json for .json files', () => {
      expect(getMimeType('data.json')).toBe('application/json')
    })

    test('returns image/png for .png files', () => {
      expect(getMimeType('image.png')).toBe('image/png')
    })

    test('returns image/jpeg for .jpg files', () => {
      expect(getMimeType('photo.jpg')).toBe('image/jpeg')
    })

    test('returns image/jpeg for .jpeg files', () => {
      expect(getMimeType('photo.jpeg')).toBe('image/jpeg')
    })

    test('returns image/gif for .gif files', () => {
      expect(getMimeType('animation.gif')).toBe('image/gif')
    })

    test('returns image/svg+xml for .svg files', () => {
      expect(getMimeType('icon.svg')).toBe('image/svg+xml')
    })

    test('returns text/plain for .txt files', () => {
      expect(getMimeType('readme.txt')).toBe('text/plain')
    })

    test('returns application/pdf for .pdf files', () => {
      expect(getMimeType('document.pdf')).toBe('application/pdf')
    })

    test('returns application/zip for .zip files', () => {
      expect(getMimeType('archive.zip')).toBe('application/zip')
    })
  })

  describe('unknown file types', () => {
    test('returns application/octet-stream for .exe files', () => {
      expect(getMimeType('program.exe')).toBe('application/octet-stream')
    })

    test('returns application/octet-stream for .docx files', () => {
      expect(getMimeType('document.docx')).toBe('application/octet-stream')
    })

    test('returns application/octet-stream for files without extensions', () => {
      expect(getMimeType('README')).toBe('application/octet-stream')
    })
  })

  describe('case sensitivity', () => {
    test('handles uppercase extensions', () => {
      expect(getMimeType('INDEX.HTML')).toBe('text/html')
      expect(getMimeType('script.JS')).toBe('application/javascript')
      expect(getMimeType('image.PNG')).toBe('image/png')
    })

    test('handles mixed case extensions', () => {
      expect(getMimeType('styles.CsS')).toBe('text/css')
      expect(getMimeType('data.JsOn')).toBe('application/json')
    })
  })

  describe('edge cases', () => {
    test('handles empty string', () => {
      expect(getMimeType('')).toBe('application/octet-stream')
    })

    test('handles files starting with dot', () => {
      expect(getMimeType('.hidden')).toBe('application/octet-stream')
    })

    test('handles multiple dots in filename', () => {
      expect(getMimeType('file.name.txt')).toBe('text/plain')
    })

    test('handles extension only', () => {
      expect(getMimeType('.txt')).toBe('application/octet-stream')
      expect(getMimeType('.html')).toBe('application/octet-stream')
    })

    test('handles paths with directories', () => {
      expect(getMimeType('/path/to/file.html')).toBe('text/html')
      expect(getMimeType('subdir\\nested\\file.js')).toBe('application/javascript')
    })

    test('handles files with no extension but dots', () => {
      expect(getMimeType('file.with.dots')).toBe('application/octet-stream')
    })
  })
})