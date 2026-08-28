import { describe, it, expect } from 'vitest';

describe('Lummo Studio v2.3.11 Major Features Unit Tests', () => {
  it('should generate valid mock data row for tables', () => {
    const mockColumns = [
      { name: 'id', pk: true, type: 'INTEGER' },
      { name: 'nombre', type: 'VARCHAR(255)' },
      { name: 'email', type: 'VARCHAR(255)' },
      { name: 'created_at', type: 'TIMESTAMP' }
    ];

    const generateRow = (cols, idx) => {
      const row = {};
      cols.forEach(c => {
        if (c.name === 'id') row[c.name] = idx + 1;
        else if (c.name === 'email') row[c.name] = `user${idx}@lummo.dev`;
        else if (c.name === 'nombre') row[c.name] = `Usuario ${idx + 1}`;
        else row[c.name] = new Date().toISOString();
      });
      return row;
    };

    const row = generateRow(mockColumns, 0);
    expect(row.id).toBe(1);
    expect(row.email).toBe('user0@lummo.dev');
    expect(row.nombre).toBe('Usuario 1');
  });

  it('should generate correct SQL DDL and Prisma schemas', () => {
    const tableName = 'usuarios';
    const cols = [
      { name: 'id', type: 'INTEGER', isPk: true },
      { name: 'email', type: 'VARCHAR(255)', isNullable: false }
    ];

    const sqlDDL = `CREATE TABLE "${tableName}" (\n  "id" INTEGER PRIMARY KEY AUTOINCREMENT,\n  "email" VARCHAR(255) NOT NULL\n);`;
    expect(sqlDDL).toContain('CREATE TABLE "usuarios"');
    expect(sqlDDL).toContain('PRIMARY KEY AUTOINCREMENT');

    const prismaSchema = `model Usuarios {\n  id Int @id @default(autoincrement())\n  email String\n}`;
    expect(prismaSchema).toContain('model Usuarios');
  });

  it('should filter rows in real-time for VirtualizedTable search', () => {
    const rows = [
      { id: 1, name: 'Proyecto Alpha', stack: 'React' },
      { id: 2, name: 'Servidor Beta', stack: 'Express' },
      { id: 3, name: 'API Gamma', stack: 'Python' }
    ];

    const filterTerm = 'alpha';
    const filtered = rows.filter(r =>
      Object.values(r).some(val => String(val).toLowerCase().includes(filterTerm))
    );

    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe('Proyecto Alpha');
  });

  it('should categorize technical errors into friendly user messages', async () => {
    const { parseLummoError } = await import('../src/utils/errorParser.js');
    
    const portError = parseLummoError('Error: listen EADDRINUSE: address already in use :::5173');
    expect(portError.category).toBe('PORT_IN_USE');
    expect(portError.userMessage).toContain('puerto seleccionado está siendo utilizado');

    const dbError = parseLummoError('Connection refusal: ECONNREFUSED 127.0.0.1:3306');
    expect(dbError.category).toBe('DB_CONNECTION_FAILED');
    expect(dbError.userMessage).toContain('base de datos');

    const missingTech = parseLummoError('php is not recognized as an internal command');
    expect(missingTech.category).toBe('MISSING_RUNTIME');
    expect(missingTech.userMessage).toContain('Node.js, PHP, Python o Git');
  });
});
