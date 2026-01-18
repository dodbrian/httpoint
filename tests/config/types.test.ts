import { Config } from '../../src/config/types'

describe('Config Types', () => {
  describe('Type definitions', () => {
    it('should define Config interface with port property', () => {
      const config: Config = {
        port: 3000,
        root: '/tmp',
        debug: false
      }
      expect(config.port).toBeDefined()
      expect(typeof config.port === 'number' || typeof config.port === 'string').toBe(true)
    })

    it('should define Config interface with root property', () => {
      const config: Config = {
        port: 3000,
        root: '/tmp',
        debug: false
      }
      expect(config.root).toBeDefined()
      expect(typeof config.root).toBe('string')
    })

    it('should define Config interface with debug property', () => {
      const config: Config = {
        port: 3000,
        root: '/tmp',
        debug: false
      }
      expect(config.debug).toBeDefined()
      expect(typeof config.debug).toBe('boolean')
    })

    it('should allow port as number', () => {
      const config: Config = {
        port: 8080,
        root: '/tmp',
        debug: false
      }
      expect(config.port).toBe(8080)
      expect(typeof config.port).toBe('number')
    })

    it('should allow port as string', () => {
      const config: Config = {
        port: '8080',
        root: '/tmp',
        debug: false
      }
      expect(config.port).toBe('8080')
      expect(typeof config.port).toBe('string')
    })

    it('should require all properties', () => {
      const config: Config = {
        port: 3000,
        root: '/tmp',
        debug: false
      }
      expect('port' in config).toBe(true)
      expect('root' in config).toBe(true)
      expect('debug' in config).toBe(true)
    })
  })

  describe('Type guards', () => {
    it('should validate port is number or string', () => {
      const config: Config = {
        port: 3000,
        root: '/tmp',
        debug: false
      }
      const isValidPort = typeof config.port === 'number' || typeof config.port === 'string'
      expect(isValidPort).toBe(true)
    })

    it('should validate root is string', () => {
      const config: Config = {
        port: 3000,
        root: '/tmp',
        debug: false
      }
      expect(typeof config.root === 'string').toBe(true)
    })

    it('should validate debug is boolean', () => {
      const config: Config = {
        port: 3000,
        root: '/tmp',
        debug: false
      }
      expect(typeof config.debug === 'boolean').toBe(true)
    })

    it('should identify invalid port type', () => {
      const obj = {
        port: {},
        root: '/tmp',
        debug: false
      }
      const isValidPort = typeof obj.port === 'number' || typeof obj.port === 'string'
      expect(isValidPort).toBe(false)
    })

    it('should identify invalid root type', () => {
      const obj = {
        port: 3000,
        root: 123,
        debug: false
      }
      expect(typeof obj.root === 'string').toBe(false)
    })

    it('should identify invalid debug type', () => {
      const obj = {
        port: 3000,
        root: '/tmp',
        debug: 'true'
      }
      expect(typeof obj.debug === 'boolean').toBe(false)
    })
  })

  describe('Type utilities', () => {
    it('should allow creating config with minimal required properties', () => {
      const config: Config = {
        port: 3000,
        root: '/tmp',
        debug: false
      }
      expect(config).toEqual({
        port: 3000,
        root: '/tmp',
        debug: false
      })
    })

    it('should support partial property updates', () => {
      const config: Config = {
        port: 3000,
        root: '/tmp',
        debug: false
      }
      const updated: Config = {
        ...config,
        port: 8080
      }
      expect(updated.port).toBe(8080)
      expect(updated.root).toBe('/tmp')
      expect(updated.debug).toBe(false)
    })

    it('should support object spreading', () => {
      const config: Config = {
        port: 3000,
        root: '/tmp',
        debug: false
      }
      const copy: Config = { ...config }
      expect(copy).toEqual(config)
      expect(copy).not.toBe(config)
    })

    it('should preserve property types after assignment', () => {
      let config: Config = {
        port: 3000,
        root: '/tmp',
        debug: false
      }
      config = {
        port: '8080',
        root: '/var',
        debug: true
      }
      expect(typeof config.port).toBe('string')
      expect(typeof config.root).toBe('string')
      expect(typeof config.debug).toBe('boolean')
    })

    it('should work with type narrowing', () => {
      const config: Config = {
        port: 3000,
        root: '/tmp',
        debug: false
      }
      if (typeof config.port === 'number') {
        expect(config.port).toBe(3000)
      }
    })
  })

  describe('Type compatibility', () => {
    it('should be assignable from object with correct properties', () => {
      const obj = {
        port: 3000,
        root: '/tmp',
        debug: false
      }
      const config: Config = obj
      expect(config).toEqual(obj)
    })

    it('should support const assertions', () => {
      const config = {
        port: 3000,
        root: '/tmp',
        debug: false
      } as const
      expect(config.port).toBe(3000)
      expect(config.root).toBe('/tmp')
      expect(config.debug).toBe(false)
    })

    it('should maintain type information with destructuring', () => {
      const config: Config = {
        port: 3000,
        root: '/tmp',
        debug: false
      }
      const { port, root, debug } = config
      expect(typeof port === 'number' || typeof port === 'string').toBe(true)
      expect(typeof root).toBe('string')
      expect(typeof debug).toBe('boolean')
    })

    it('should support extending with additional properties', () => {
      const config: Config = {
        port: 3000,
        root: '/tmp',
        debug: false
      }
      const extended = {
        ...config,
        version: '1.0.0'
      }
      expect(extended.port).toBe(3000)
      expect(extended.root).toBe('/tmp')
      expect(extended.debug).toBe(false)
      expect(extended.version).toBe('1.0.0')
    })
  })

  describe('Runtime type checking', () => {
    it('should verify all required properties exist', () => {
      const config: Config = {
        port: 3000,
        root: '/tmp',
        debug: false
      }
      const hasAllProps = 'port' in config && 'root' in config && 'debug' in config
      expect(hasAllProps).toBe(true)
    })

    it('should verify property count', () => {
      const config: Config = {
        port: 3000,
        root: '/tmp',
        debug: false
      }
      expect(Object.keys(config).length).toBe(3)
    })

    it('should enumerate all property keys', () => {
      const config: Config = {
        port: 3000,
        root: '/tmp',
        debug: false
      }
      const keys = Object.keys(config)
      expect(keys).toContain('port')
      expect(keys).toContain('root')
      expect(keys).toContain('debug')
    })

    it('should support JSON serialization', () => {
      const config: Config = {
        port: 3000,
        root: '/tmp',
        debug: false
      }
      const json = JSON.stringify(config)
      const parsed = JSON.parse(json) as Config
      expect(parsed.port).toBe(3000)
      expect(parsed.root).toBe('/tmp')
      expect(parsed.debug).toBe(false)
    })
  })
})
