import { parseArgs, printHelp } from '../../src/config/parser'

describe('Config Parser', () => {
  const originalArgv = process.argv
  const originalEnv = process.env
  const originalLog = console.log
  const originalError = console.error

  beforeEach(() => {
    process.argv = ['node', 'serve.js']
    process.env = { ...originalEnv }
    delete process.env.HTTPOINT_PORT
    delete process.env.HTTPOINT_ROOT
    console.log = jest.fn()
    console.error = jest.fn()
    jest.spyOn(process, 'exit').mockImplementation(() => undefined as never)
  })

  afterEach(() => {
    process.argv = originalArgv
    process.env = originalEnv
    console.log = originalLog
    console.error = originalError
    jest.restoreAllMocks()
  })

  describe('CLI argument parsing', () => {
    it('should parse --port argument', () => {
      process.argv = ['node', 'serve.js', '--port', '8080']
      const config = parseArgs()
      expect(config.port).toBe(8080)
    })

    it('should parse --path argument', () => {
      process.argv = ['node', 'serve.js', '--path', '/tmp']
      const config = parseArgs()
      expect(config.root).toMatch(/tmp/)
    })

    it('should parse --debug flag', () => {
      process.argv = ['node', 'serve.js', '--debug']
      const config = parseArgs()
      expect(config.debug).toBe(true)
    })

    it('should handle multiple arguments', () => {
      process.argv = ['node', 'serve.js', '--port', '4000', '--debug', '--path', '/tmp']
      const config = parseArgs()
      expect(config.port).toBe(4000)
      expect(config.debug).toBe(true)
      expect(config.root).toMatch(/tmp/)
    })

    it('should ignore --port without value', () => {
      process.argv = ['node', 'serve.js', '--port']
      const config = parseArgs()
      expect(config.port).toBe(3000) // default
    })

    it('should ignore --path without value', () => {
      process.argv = ['node', 'serve.js', '--path']
      const config = parseArgs()
      expect(config.root).toBe(process.cwd())
    })

    it('should resolve relative paths to absolute', () => {
      process.argv = ['node', 'serve.js', '--path', '.']
      const config = parseArgs()
      expect(config.root).toBe(process.cwd())
    })

    it('should handle --help flag', () => {
      process.argv = ['node', 'serve.js', '--help']
      parseArgs()
      expect(process.exit).toHaveBeenCalledWith(0)
      expect(console.log).toHaveBeenCalled()
    })

    it('should handle unknown arguments', () => {
      process.argv = ['node', 'serve.js', '--unknown']
      parseArgs()
      expect(process.exit).toHaveBeenCalledWith(0)
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Unknown arguments'))
    })
  })

  describe('Environment variables', () => {
    it('should use HTTPOINT_PORT if set', () => {
      process.env.HTTPOINT_PORT = '9000'
      const config = parseArgs()
      expect(config.port).toBe('9000')
    })

    it('should use HTTPOINT_ROOT if set', () => {
      process.env.HTTPOINT_ROOT = '/etc'
      const config = parseArgs()
      expect(config.root).toBe('/etc')
    })

    it('should allow CLI args to override environment variables', () => {
      process.env.HTTPOINT_PORT = '9000'
      process.argv = ['node', 'serve.js', '--port', '8000']
      const config = parseArgs()
      expect(config.port).toBe(8000)
    })

    it('should allow --path to override HTTPOINT_ROOT', () => {
      process.env.HTTPOINT_ROOT = '/etc'
      process.argv = ['node', 'serve.js', '--path', '/tmp']
      const config = parseArgs()
      expect(config.root).toMatch(/tmp/)
    })
  })

  describe('Default values', () => {
    it('should use port 3000 by default', () => {
      const config = parseArgs()
      expect(config.port).toBe(3000)
    })

    it('should use current working directory by default', () => {
      const config = parseArgs()
      expect(config.root).toBe(process.cwd())
    })

    it('should set debug to false by default', () => {
      const config = parseArgs()
      expect(config.debug).toBe(false)
    })
  })

  describe('Validation integration', () => {
    it('should parse port as integer', () => {
      process.argv = ['node', 'serve.js', '--port', '3000']
      const config = parseArgs()
      expect(typeof config.port).toBe('number')
      expect(config.port).toBe(3000)
    })

    it('should handle port as string from environment', () => {
      process.env.HTTPOINT_PORT = '5000'
      const config = parseArgs()
      expect(config.port).toBe('5000')
    })

    it('should preserve root as string', () => {
      const config = parseArgs()
      expect(typeof config.root).toBe('string')
    })

    it('should parse empty process.argv', () => {
      process.argv = ['node', 'serve.js']
      expect(() => parseArgs()).not.toThrow()
    })
  })

  describe('printHelp', () => {
    it('should output help text', () => {
      printHelp()
      expect(console.log).toHaveBeenCalled()
    })

    it('should include version in help', () => {
      printHelp()
      const calls = (console.log as jest.Mock).mock.calls
      const output = calls.map((call) => call[0]).join('\n')
      expect(output).toContain('HTTPoint')
    })

    it('should document all CLI options', () => {
      printHelp()
      const calls = (console.log as jest.Mock).mock.calls
      const output = calls.map((call) => call[0]).join('\n')
      expect(output).toContain('--port')
      expect(output).toContain('--path')
      expect(output).toContain('--debug')
      expect(output).toContain('--help')
    })

    it('should document environment variables', () => {
      printHelp()
      const calls = (console.log as jest.Mock).mock.calls
      const output = calls.map((call) => call[0]).join('\n')
      expect(output).toContain('HTTPOINT_PORT')
      expect(output).toContain('HTTPOINT_ROOT')
    })
  })
})
