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

  describe('resolveProjectCommand Unit Tests', () => {
    it('should inject --port correctly for npm run dev commands', async () => {
      const { resolveProjectCommand } = await import('../electron/ipc/projectHandlers.cjs');
      const res = resolveProjectCommand('npm run dev', 4000);
      expect(res.finalCommand).toBe('npm run dev -- --port 4000');
      expect(res.port).toBe(4000);
    });

    it('should replace existing --port in npm run dev command', async () => {
      const { resolveProjectCommand } = await import('../electron/ipc/projectHandlers.cjs');
      const res = resolveProjectCommand('npm run dev -- --port 3000', 5500);
      expect(res.finalCommand).toBe('npm run dev -- --port 5500');
      expect(res.port).toBe(5500);
    });

    it('should replace existing --port in vite commands', async () => {
      const { resolveProjectCommand } = await import('../electron/ipc/projectHandlers.cjs');
      const res = resolveProjectCommand('vite --port 5173', 8080);
      expect(res.finalCommand).toBe('vite --port 8080');
    });

    it('should handle Next.js -p port flag', async () => {
      const { resolveProjectCommand } = await import('../electron/ipc/projectHandlers.cjs');
      const res1 = resolveProjectCommand('next dev', 3005);
      expect(res1.finalCommand).toBe('next dev -p 3005');

      const res2 = resolveProjectCommand('next dev -p 3000', 4000);
      expect(res2.finalCommand).toBe('next dev -p 4000');
    });

    it('should substitute {port} placeholder in PHP and Python commands', async () => {
      const { resolveProjectCommand } = await import('../electron/ipc/projectHandlers.cjs');
      const resPhp = resolveProjectCommand('php -S localhost:{port}', 9000);
      expect(resPhp.finalCommand).toBe('php -S localhost:9000');

      const resPy = resolveProjectCommand('python -m http.server {port}', 8000);
      expect(resPy.finalCommand).toBe('python -m http.server 8000');
    });

    it('should replace existing port in PHP built-in server', async () => {
      const { resolveProjectCommand } = await import('../electron/ipc/projectHandlers.cjs');
      const res = resolveProjectCommand('php -S localhost:8000', 9090);
      expect(res.finalCommand).toBe('php -S localhost:9090');
    });

    it('should replace existing port in php artisan serve', async () => {
      const { resolveProjectCommand } = await import('../electron/ipc/projectHandlers.cjs');
      const res = resolveProjectCommand('php artisan serve --port=8000', 8085);
      expect(res.finalCommand).toBe('php artisan serve --port=8085');
    });

    it('should detect static projects properly', async () => {
      const { resolveProjectCommand } = await import('../electron/ipc/projectHandlers.cjs');
      const res = resolveProjectCommand('lummo:static', 3000, 'Sitio Web HTML/CSS');
      expect(res.isStatic).toBe(true);
    });

    it('should handle bun, pnpm, and yarn correctly', async () => {
      const { resolveProjectCommand } = await import('../electron/ipc/projectHandlers.cjs');
      expect(resolveProjectCommand('bun dev', 3000).finalCommand).toBe('bun dev -- --port 3000');
      expect(resolveProjectCommand('pnpm dev', 3000).finalCommand).toBe('pnpm dev --port 3000');
      expect(resolveProjectCommand('yarn dev', 3000).finalCommand).toBe('yarn dev --port 3000');
    });
  });

  describe('syncProjectEnvPort Unit Tests', () => {
    it('should safely update PORT and VITE_PORT in .env preserving other variables and comments', async () => {
      const { syncProjectEnvPort } = await import('../electron/ipc/projectHandlers.cjs');
      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');

      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lummo-env-test-'));
      const envPath = path.join(tempDir, '.env');

      const initialEnv = `# Configuration File\nDATABASE_URL=mysql://user:pass@localhost:3306/db\nPORT=3000\nVITE_PORT=3000\nAPI_KEY=secret_123\n`;
      fs.writeFileSync(envPath, initialEnv, 'utf-8');

      const result = syncProjectEnvPort(tempDir, 4500);
      expect(result.success).toBe(true);

      const updatedEnv = fs.readFileSync(envPath, 'utf-8');
      expect(updatedEnv).toContain('# Configuration File');
      expect(updatedEnv).toContain('DATABASE_URL=mysql://user:pass@localhost:3306/db');
      expect(updatedEnv).toContain('PORT=4500');
      expect(updatedEnv).toContain('VITE_PORT=4500');
      expect(updatedEnv).toContain('API_KEY=secret_123');

      fs.rmSync(tempDir, { recursive: true, force: true });
    });
  });
});
