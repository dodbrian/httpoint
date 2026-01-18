import { getLocalIP } from '../../src/utils/network'
import os from 'os'
import { NetworkInterfaceInfo } from 'os'

// Mock the os module
jest.mock('os', () => ({
  networkInterfaces: jest.fn()
}))

const mockNetworkInterfaces = os.networkInterfaces as jest.MockedFunction<typeof os.networkInterfaces>

describe('getLocalIP', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('IP detection', () => {
    test('returns localhost when no interfaces available', () => {
      mockNetworkInterfaces.mockReturnValue({})
      expect(getLocalIP()).toBe('localhost')
    })

    test('returns localhost when networkInterfaces returns undefined', () => {
      mockNetworkInterfaces.mockReturnValue(undefined as any)
      expect(getLocalIP()).toBe('localhost')
    })

    test('returns first IPv4 non-internal address', () => {
      const mockInterfaces: Record<string, NetworkInterfaceInfo[]> = {
        'eth0': [
          { family: 'IPv4', internal: false, address: '192.168.1.100' } as NetworkInterfaceInfo,
          { family: 'IPv6', internal: false, address: 'fe80::1' } as NetworkInterfaceInfo
        ]
      }
      mockNetworkInterfaces.mockReturnValue(mockInterfaces)
      expect(getLocalIP()).toBe('192.168.1.100')
    })
  })

  describe('interface filtering', () => {
    test('skips internal IPv4 addresses', () => {
      const mockInterfaces: Record<string, NetworkInterfaceInfo[]> = {
        'lo': [
          { family: 'IPv4', internal: true, address: '127.0.0.1' } as NetworkInterfaceInfo
        ],
        'eth0': [
          { family: 'IPv4', internal: false, address: '192.168.1.100' } as NetworkInterfaceInfo
        ]
      }
      mockNetworkInterfaces.mockReturnValue(mockInterfaces)
      expect(getLocalIP()).toBe('192.168.1.100')
    })

    test('returns localhost when only internal addresses exist', () => {
      const mockInterfaces: Record<string, NetworkInterfaceInfo[]> = {
        'lo': [
          { family: 'IPv4', internal: true, address: '127.0.0.1' } as NetworkInterfaceInfo
        ]
      }
      mockNetworkInterfaces.mockReturnValue(mockInterfaces)
      expect(getLocalIP()).toBe('localhost')
    })
  })

  describe('IPv4/IPv6 handling', () => {
    test('prefers IPv4 over IPv6 addresses', () => {
      const mockInterfaces: Record<string, NetworkInterfaceInfo[]> = {
        'eth0': [
          { family: 'IPv6', internal: false, address: 'fe80::1' } as NetworkInterfaceInfo,
          { family: 'IPv4', internal: false, address: '192.168.1.100' } as NetworkInterfaceInfo
        ]
      }
      mockNetworkInterfaces.mockReturnValue(mockInterfaces)
      expect(getLocalIP()).toBe('192.168.1.100')
    })

    test('ignores IPv6 addresses when IPv4 exists', () => {
      const mockInterfaces: Record<string, NetworkInterfaceInfo[]> = {
        'eth0': [
          { family: 'IPv6', internal: false, address: '2001:db8::1' } as NetworkInterfaceInfo
        ]
      }
      mockNetworkInterfaces.mockReturnValue(mockInterfaces)
      expect(getLocalIP()).toBe('localhost')
    })

    test('handles mixed interface types', () => {
      const mockInterfaces: Record<string, NetworkInterfaceInfo[]> = {
        'eth0': [
          { family: 'IPv6', internal: false, address: 'fe80::1' } as NetworkInterfaceInfo
        ],
        'wlan0': [
          { family: 'IPv4', internal: false, address: '10.0.0.50' } as NetworkInterfaceInfo
        ]
      }
      mockNetworkInterfaces.mockReturnValue(mockInterfaces)
      expect(getLocalIP()).toBe('10.0.0.50')
    })
  })

  describe('error scenarios', () => {
    test('handles empty interface arrays', () => {
      const mockInterfaces: Record<string, NetworkInterfaceInfo[]> = {
        'eth0': [],
        'wlan0': []
      }
      mockNetworkInterfaces.mockReturnValue(mockInterfaces)
      expect(getLocalIP()).toBe('localhost')
    })

    test('handles interfaces with no valid addresses', () => {
      const mockInterfaces: Record<string, NetworkInterfaceInfo[]> = {
        'eth0': [
          { family: 'IPv6', internal: true, address: '::1' } as NetworkInterfaceInfo
        ]
      }
      mockNetworkInterfaces.mockReturnValue(mockInterfaces)
      expect(getLocalIP()).toBe('localhost')
    })

    test('stops searching after finding first valid IP', () => {
      const mockInterfaces: Record<string, NetworkInterfaceInfo[]> = {
        'eth0': [
          { family: 'IPv4', internal: false, address: '192.168.1.100' } as NetworkInterfaceInfo
        ],
        'wlan0': [
          { family: 'IPv4', internal: false, address: '10.0.0.50' } as NetworkInterfaceInfo // Should not be reached
        ]
      }
      mockNetworkInterfaces.mockReturnValue(mockInterfaces)
      expect(getLocalIP()).toBe('192.168.1.100')
    })
  })
})