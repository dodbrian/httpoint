// Global test setup for HTTPoint test suite
export {}

// Set test environment variables
process.env.NODE_ENV = 'test'

// Mock console methods to reduce noise in tests
const originalConsoleLog = console.log
const originalConsoleError = console.error

beforeEach(() => {
  // Restore console methods before each test
  console.log = originalConsoleLog
  console.error = originalConsoleError
})

// Type declarations for global utilities
declare global {
  var createMockRequest: (overrides?: Record<string, any>) => any
  var createMockResponse: () => any
}

// Global test utilities
global.createMockRequest = (overrides: Record<string, any> = {}) => ({
  method: 'GET',
  url: '/',
  headers: {},
  ...overrides,
})

global.createMockResponse = () => {
  const res: any = {
    statusCode: 200,
    headers: {},
    data: '',
    
    setHeader(name: string, value: string) {
      this.headers[name] = value
    },
    
    write(chunk: string) {
      this.data += chunk
    },
    
    end(chunk?: string) {
      if (chunk) this.data += chunk
      return this.data
    },
  }
  return res
}