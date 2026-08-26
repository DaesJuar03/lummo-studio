import { describe, it, expect } from 'vitest';
import net from 'net';
import { identifyPortProcess, findFreePort } from '../electron/processManager.js';

describe('Port Resolver & Management Suite', () => {
  it('findFreePort should find an available TCP port starting from 3000', async () => {
    const port = await findFreePort(3000);
    expect(port).toBeGreaterThanOrEqual(3000);
    expect(typeof port).toBe('number');
  });

  it('identifyPortProcess should report free status on an unused random high port', async () => {
    const server = net.createServer();
    const port = await new Promise((resolve) => {
      server.listen(0, () => {
        const assignedPort = server.address().port;
        server.close(() => resolve(assignedPort));
      });
    });

    const info = await identifyPortProcess(port);
    expect(info).toBeDefined();
    expect(info.port).toBe(port);
    expect(info.busy).toBe(false);
  });

  it('identifyPortProcess should detect when a port is actively listening', async () => {
    const server = net.createServer();
    const port = await new Promise((resolve) => {
      server.listen(0, () => {
        resolve(server.address().port);
      });
    });

    try {
      const info = await identifyPortProcess(port);
      expect(info).toBeDefined();
      expect(info.port).toBe(port);
      expect(info.busy).toBe(true);
    } finally {
      await new Promise(resolve => server.close(resolve));
    }
  });
});
