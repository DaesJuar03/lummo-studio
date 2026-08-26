import { describe, it, expect } from 'vitest';
import { getProcessMetrics } from '../electron/processManager.js';

describe('Process Telemetry Suite', () => {
  it('should retrieve metrics for current running Node.js process PID', async () => {
    const currentPid = process.pid;
    const metrics = await getProcessMetrics(currentPid);

    expect(metrics).toBeDefined();
    expect(metrics.success).toBe(true);
    expect(metrics.memoryMb).toBeGreaterThan(0);
    expect(typeof metrics.cpu).toBe('number');
    expect(typeof metrics.memoryMb).toBe('number');
  });

  it('should handle non-existent PID gracefully without crashing', async () => {
    const fakePid = 9999999;
    const metrics = await getProcessMetrics(fakePid);

    expect(metrics).toBeDefined();
    expect(metrics.success).toBe(false);
    expect(metrics.error).toBeDefined();
  });
});
