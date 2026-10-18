import { describe, it, expect, beforeEach } from 'vitest';
import { createTauriBridge, isTauriRuntime, initPlatformBridge } from '../src/lib/bridge';

describe('Tauri 2 TypeScript Bridge Suite', () => {
  beforeEach(() => {
    (globalThis as any).window = (globalThis as any).window || {};
    delete window.__TAURI_INTERNALS__;
    delete window.electronAPI;
  });

  it('should detect non-Tauri runtime when __TAURI_INTERNALS__ is absent', () => {
    expect(isTauriRuntime()).toBe(false);
  });

  it('should detect Tauri runtime and expose complete LummoBridgeAPI on window.electronAPI', () => {
    window.__TAURI_INTERNALS__ = {};
    expect(isTauriRuntime()).toBe(true);

    initPlatformBridge();
    expect(window.electronAPI).toBeDefined();
    expect(typeof window.electronAPI?.selectFolder).toBe('function');
    expect(typeof window.electronAPI?.scanEnvironment).toBe('function');
    expect(typeof window.electronAPI?.startProject).toBe('function');
    expect(typeof window.electronAPI?.stopProject).toBe('function');
    expect(typeof window.electronAPI?.db.testConnection).toBe('function');
    expect(typeof window.electronAPI?.db.executeQuery).toBe('function');
    expect(typeof window.electronAPI?.docker.checkAvailable).toBe('function');
    expect(typeof window.electronAPI?.git.getStatus).toBe('function');
  });

  it('createTauriBridge should expose all required namespaces', () => {
    const api = createTauriBridge();
    expect(api.db).toBeDefined();
    expect(api.db.redis).toBeDefined();
    expect(api.ssl).toBeDefined();
    expect(api.docker).toBeDefined();
    expect(api.apiClient).toBeDefined();
    expect(api.webhookInspector).toBeDefined();
    expect(api.updater).toBeDefined();
    expect(api.git).toBeDefined();
    expect(api.ai).toBeDefined();
  });
});
