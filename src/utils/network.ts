import os from 'os';

export interface NetworkAddress {
  family: string;
  internal: boolean;
  address: string;
}

export function getLocalIP(): string {
  const networkInterfaces = os.networkInterfaces() as Record<string, NetworkAddress[]>;
  let localIP = 'localhost';

  for (const interfaceName in networkInterfaces) {
    const addresses = networkInterfaces[interfaceName];
    for (const address of addresses) {
      if (address.family === 'IPv4' && !address.internal) {
        localIP = address.address;
        break;
      }
    }
    if (localIP !== 'localhost') break;
  }

  return localIP;
}