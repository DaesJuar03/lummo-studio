import { describe, it, expect } from 'vitest';
import path from 'path';
import dbManager from '../electron/dbManager.cjs';

const { resolveDbType, resolveSqlitePath, testConnection } = dbManager;

describe('Database Manager Module (dbManager)', () => {
  it('debería resolver correctamente los tipos de motores de base de datos', () => {
    expect(resolveDbType({ engine: 'sqlite' })).toBe('sqlite');
    expect(resolveDbType({ type: 'MySQL / MariaDB' })).toBe('mysql');
    expect(resolveDbType({ driver: 'postgresql' })).toBe('postgres');
    expect(resolveDbType({ dbType: 'pg' })).toBe('postgres');
    expect(resolveDbType(null)).toBe('sqlite');
  });

  it('debería generar rutas de archivo SQLite válidas en la carpeta de Documentos', () => {
    const customConfig = { name: 'mi_tienda_test', engine: 'sqlite' };
    const sqlitePath = resolveSqlitePath(customConfig);

    expect(sqlitePath).toBeDefined();
    expect(sqlitePath).toContain('LummoStudio');
    expect(sqlitePath).toContain('Databases');
    expect(sqlitePath.endsWith('mi_tienda_test.sqlite')).toBe(true);
  });

  it('debería probar la conexión exitosa a una instancia SQLite local', async () => {
    const res = await testConnection({ engine: 'sqlite', name: 'unit_test_db' });
    expect(res).toBeDefined();
    expect(res.success).toBe(true);
    expect(res.message).toContain('Conectado a SQLite');
  });
});
