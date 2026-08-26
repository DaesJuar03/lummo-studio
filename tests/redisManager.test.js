import { describe, it, expect } from 'vitest';
import dbManager from '../electron/dbManager.cjs';

describe('Database Manager Suite (Pagination & Redis)', () => {
  it('getTableRows should handle empty or invalid config gracefully', async () => {
    const res = await dbManager.getTableRows(null, 'users', 1, 25);
    expect(res).toBeDefined();
    expect(res.success).toBe(false);
  });

  it('updateTableRow should validate arguments safely', async () => {
    const res = await dbManager.updateTableRow(null, 'users', 'id', 1, 'name', 'Nuevo');
    expect(res).toBeDefined();
    expect(res.success).toBe(false);
  });

  it('getRedisKeys should handle offline redis server gracefully without unhandled exceptions', async () => {
    const fakeRedisConfig = {
      engine: 'redis',
      host: '127.0.0.1',
      port: 59999 // Unused port
    };
    const res = await dbManager.getRedisKeys(fakeRedisConfig, '*');
    expect(res).toBeDefined();
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });
});
