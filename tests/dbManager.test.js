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

  it('debería soportar paginación server-side (getTableRows) con límites y páginas', async () => {
    const config = { engine: 'sqlite', name: 'unit_test_pagination_db' };
    
    // Crear tabla de prueba e insertar registros
    await dbManager.executeQuery(config, `
      CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, price REAL);
      DELETE FROM items;
      INSERT INTO items (name, price) VALUES ('Producto A', 10.5), ('Producto B', 20.0), ('Producto C', 35.0), ('Producto D', 50.0);
    `);

    // Consultar página 1 con límite 2
    const page1 = await dbManager.getTableRows({
      config,
      tableName: 'items',
      page: 1,
      limit: 2,
      sortColumn: 'id',
      sortDir: 'ASC'
    });

    expect(page1.success).toBe(true);
    expect(page1.rows.length).toBe(2);
    expect(page1.totalRows).toBe(4);
    expect(page1.totalPages).toBe(2);
    expect(page1.page).toBe(1);
    expect(page1.rows[0].name).toBe('Producto A');

    // Consultar página 2 con límite 2
    const page2 = await dbManager.getTableRows({
      config,
      tableName: 'items',
      page: 2,
      limit: 2,
      sortColumn: 'id',
      sortDir: 'ASC'
    });

    expect(page2.success).toBe(true);
    expect(page2.rows.length).toBe(2);
    expect(page2.page).toBe(2);
    expect(page2.rows[0].name).toBe('Producto C');
  });

  it('debería manejar errores de getTableRows con configuración inválida', async () => {
    const res = await dbManager.getTableRows(null, 'non_existent_table');
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });

  it('debería actualizar el valor de una celda con updateTableRow', async () => {
    const config = { engine: 'sqlite', name: 'unit_test_pagination_db' };
    
    // Obtener el ID de la primera fila existente
    const initialRows = await dbManager.getTableRows({
      config,
      tableName: 'items',
      page: 1,
      limit: 1
    });
    expect(initialRows.success).toBe(true);
    expect(initialRows.rows.length).toBeGreaterThan(0);
    const targetId = initialRows.rows[0].id;

    const updateRes = await dbManager.updateTableRow({
      config,
      tableName: 'items',
      primaryKey: 'id',
      primaryKeyValue: targetId,
      column: 'name',
      newValue: 'Producto A Modificado'
    });

    expect(updateRes.success).toBe(true);

    const rows = await dbManager.getTableRows({
      config,
      tableName: 'items',
      page: 1,
      limit: 10
    });

    const updatedItem = rows.rows.find(r => r.id === targetId);
    expect(updatedItem).toBeDefined();
    expect(updatedItem.name).toBe('Producto A Modificado');
  });
});
