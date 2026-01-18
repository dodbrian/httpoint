import fs from 'fs'
import path from 'path'
import { validateConfig } from '../../src/config/validator'
import { Config } from '../../src/config/types'

describe('Config Validator', () => {
  const originalExit = process.exit
  const originalError = console.error
  const originalLog = console.log

  beforeEach(() => {
    console.error = jest.fn()
    console.log = jest.fn()
    process.exit = jest.fn() as never
  })

  afterEach(() => {
    jest.restoreAllMocks()
    process.exit = originalExit
    console.error = originalError
    console.log = originalLog
  })

  describe('Port validation', () => {
    it('should accept valid numeric port', () => {
      const config: Config = {
        port: 3000,
        root: process.cwd(),
        debug: false
      }
      expect(() => validateConfig(config)).not.toThrow()
      expect(process.exit).not.toHaveBeenCalled()
    })

    it('should accept port as string', () => {
      const config: Config = {
        port: '8080',
        root: process.cwd(),
        debug: false
      }
      expect(() => validateConfig(config)).not.toThrow()
      expect(process.exit).not.toHaveBeenCalled()
    })

    it('should accept port in valid range', () => {
      const config: Config = {
        port: 1024,
        root: process.cwd(),
        debug: false
      }
      expect(() => validateConfig(config)).not.toThrow()
      expect(process.exit).not.toHaveBeenCalled()
    })
  })

  describe('Path validation', () => {
    it('should accept existing directory', () => {
      const config: Config = {
        port: 3000,
        root: process.cwd(),
        debug: false
      }
      expect(() => validateConfig(config)).not.toThrow()
      expect(process.exit).not.toHaveBeenCalled()
    })

    it('should reject non-existent directory', () => {
      const config: Config = {
        port: 3000,
        root: '/nonexistent/directory/that/does/not/exist',
        debug: false
      }
      expect(() => validateConfig(config)).not.toThrow()
      expect(process.exit).toHaveBeenCalledWith(1)
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('does not exist')
      )
    })

    it('should validate absolute paths', () => {
      const tmpDir = fs.mkdtempSync(path.join('/tmp', 'httpoint-test-'))
      try {
        const config: Config = {
          port: 3000,
          root: tmpDir,
          debug: false
        }
        expect(() => validateConfig(config)).not.toThrow()
        expect(process.exit).not.toHaveBeenCalled()
      } finally {
        fs.rmdirSync(tmpDir)
      }
    })

    it('should validate relative paths by checking existence', () => {
      const config: Config = {
        port: 3000,
        root: '.',
        debug: false
      }
      // '.' should exist (current directory)
      expect(() => validateConfig(config)).not.toThrow()
      expect(process.exit).not.toHaveBeenCalled()
    })
  })

  describe('Schema validation', () => {
    it('should validate complete config object', () => {
      const config: Config = {
        port: 3000,
        root: process.cwd(),
        debug: true
      }
      expect(() => validateConfig(config)).not.toThrow()
      expect(process.exit).not.toHaveBeenCalled()
    })

    it('should handle debug flag', () => {
      const config: Config = {
        port: 3000,
        root: process.cwd(),
        debug: false
      }
      expect(() => validateConfig(config)).not.toThrow()
      expect(process.exit).not.toHaveBeenCalled()
    })

    it('should require all config properties', () => {
      const config: Config = {
        port: 3000,
        root: process.cwd(),
        debug: false
      }
      expect(config.port).toBeDefined()
      expect(config.root).toBeDefined()
      expect(config.debug).toBeDefined()
    })
  })

  describe('Error messages', () => {
    it('should provide helpful error for missing directory', () => {
      const testPath = '/this/path/does/not/exist'
      const config: Config = {
        port: 3000,
        root: testPath,
        debug: false
      }
      validateConfig(config)
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining(testPath)
      )
    })

    it('should exit with status 1 on validation failure', () => {
      const config: Config = {
        port: 3000,
        root: '/nonexistent/path',
        debug: false
      }
      validateConfig(config)
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('should not exit on successful validation', () => {
      const config: Config = {
        port: 3000,
        root: process.cwd(),
        debug: false
      }
      validateConfig(config)
      expect(process.exit).not.toHaveBeenCalled()
    })

    it('should quote directory path in error message', () => {
      const testPath = '/fake/path'
      const config: Config = {
        port: 3000,
        root: testPath,
        debug: false
      }
      validateConfig(config)
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining(`'${testPath}'`)
      )
    })
  })

  describe('Edge cases', () => {
    it('should handle root as current directory', () => {
      const config: Config = {
        port: 3000,
        root: process.cwd(),
        debug: false
      }
      expect(() => validateConfig(config)).not.toThrow()
      expect(process.exit).not.toHaveBeenCalled()
    })

    it('should handle deep nested existing paths', () => {
      const config: Config = {
        port: 3000,
        root: path.dirname(process.cwd()),
        debug: false
      }
      expect(() => validateConfig(config)).not.toThrow()
      expect(process.exit).not.toHaveBeenCalled()
    })

    it('should validate after multiple property assignments', () => {
      const config: Config = {
        port: 3000,
        root: process.cwd(),
        debug: false
      }
      config.port = 8000
      config.debug = true
      expect(() => validateConfig(config)).not.toThrow()
      expect(process.exit).not.toHaveBeenCalled()
    })
  })
})
