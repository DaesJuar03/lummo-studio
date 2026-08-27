const { ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const dbManager = require('../dbManager.cjs');
const { safeHandle } = require('./ipcUtils.cjs');

function registerDbHandlers(getMainWindow) {
  safeHandle('db-test-connection', async (event, config) => {
    return await dbManager.testConnection(config);
  });

  safeHandle('db-get-schema', async (event, config) => {
    return await dbManager.getSchema(config);
  });

  // Consultas Paginadas Server-Side
  safeHandle('db-get-table-rows', async (event, payload) => {
    return await dbManager.getTableRows(payload);
  });

  // Actualización de Celda en Línea (In-line Cell Edit)
  safeHandle('db-update-table-row', async (event, payload) => {
    return await dbManager.updateTableRow(payload);
  });

  // --------------------------------------------------------------------------
  // REDIS Specific IPC Handlers
  // --------------------------------------------------------------------------
  safeHandle('db-redis-test', async (event, config) => {
    return await dbManager.testConnection(config);
  });

  safeHandle('db-redis-get-keys', async (event, { config, pattern }) => {
    return await dbManager.getRedisKeys(config, pattern);
  });

  safeHandle('db-redis-get-value', async (event, { config, key }) => {
    return await dbManager.getRedisKeyValue(config, key);
  });

  safeHandle('db-redis-set-value', async (event, { config, payload }) => {
    return await dbManager.setRedisKeyValue(config, payload);
  });

  safeHandle('db-redis-delete-key', async (event, { config, key }) => {
    return await dbManager.deleteRedisKey(config, key);
  });

  safeHandle('db-redis-flush', async (event, config) => {
    return await dbManager.flushRedisDb(config);
  });

  safeHandle('db-get-er-diagram', async (event, config) => {
    try {
      const schemaRes = await dbManager.getSchema(config);
      if (!schemaRes.success) return schemaRes;

      const tables = schemaRes.tables || {};
      const entities = [];
      const relationships = [];

      for (const [tableName, rows] of Object.entries(tables)) {
        const columnsMap = {};
        const sampleRow = rows.length > 0 ? rows[0] : {};
        
        // Infer columns from sample rows or keys
        for (const colName of Object.keys(sampleRow)) {
          const val = sampleRow[colName];
          let type = 'VARCHAR';
          if (typeof val === 'number') {
            type = Number.isInteger(val) ? 'INTEGER' : 'FLOAT';
          } else if (typeof val === 'boolean') {
            type = 'BOOLEAN';
          } else if (val instanceof Date || (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val))) {
            type = 'DATETIME';
          }

          const isPk = /^id$/i.test(colName) || (colName.endsWith('_id') && colName === `${tableName}_id`);
          const isFk = colName.endsWith('_id') && colName !== 'id';

          columnsMap[colName] = {
            name: colName,
            type,
            isPk,
            isFk
          };

          if (isFk) {
            const targetTable = colName.replace(/_id$/, '') + 's';
            relationships.push({
              fromTable: tableName,
              fromColumn: colName,
              toTable: targetTable,
              toColumn: 'id'
            });
          }
        }

        if (Object.keys(columnsMap).length === 0) {
          columnsMap['id'] = { name: 'id', type: 'INTEGER', isPk: true, isFk: false };
        }

        entities.push({
          name: tableName,
          columns: Object.values(columnsMap),
          rowCount: rows.length
        });
      }

      return {
        success: true,
        entities,
        relationships
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  safeHandle('db-execute-query', async (event, { config, query }) => {
    return await dbManager.executeQuery(config, query);
  });

  safeHandle('db-import-sql', async (event, { config, filePath }) => {
    return await dbManager.importSqlDump(config, filePath);
  });

  safeHandle('db-export-sql', async (event, { config, destinationPath }) => {
    return await dbManager.exportSqlDump(config, destinationPath);
  });

  safeHandle('db-create-snapshot', async (event, { config, targetFolder }) => {
    return await dbManager.createDatabaseSnapshot(config, targetFolder);
  });

  // Advanced Multi-format Data Exporter (CSV, JSON, TSV/Excel, SQL)
  safeHandle('db-export-data-file', async (event, { format, tableName, rows, columns }) => {
    try {
      const win = getMainWindow();
      const ext = format === 'excel' ? 'tsv' : format;
      const result = await dialog.showSaveDialog(win, {
        title: `Exportar ${tableName || 'Datos'} (${format.toUpperCase()})`,
        defaultPath: `${tableName || 'export'}_${Date.now()}.${ext}`,
        filters: [
          { name: format.toUpperCase(), extensions: [ext] },
          { name: 'Todos los archivos', extensions: ['*'] }
        ]
      });

      if (result.canceled || !result.filePath) {
        return { success: false, canceled: true };
      }

      let content = '';
      const cols = columns && columns.length > 0 ? columns : (rows.length > 0 ? Object.keys(rows[0]) : []);

      if (format === 'csv' || format === 'excel') {
        const delimiter = format === 'excel' ? '\t' : ',';
        const headerRow = cols.map(c => `"${String(c).replace(/"/g, '""')}"`).join(delimiter);
        const dataRows = rows.map(r => 
          cols.map(c => {
            const val = r[c];
            if (val === null || val === undefined) return '""';
            return `"${String(val).replace(/"/g, '""')}"`;
          }).join(delimiter)
        );
        content = [headerRow, ...dataRows].join('\n');
      } else if (format === 'json') {
        content = JSON.stringify(rows, null, 2);
      } else if (format === 'sql') {
        const tName = tableName || 'table_export';
        content = `-- Exportación de tabla "${tName}"\n-- Fecha: ${new Date().toISOString()}\n\n`;
        for (const r of rows) {
          const vals = cols.map(c => {
            const val = r[c];
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'number') return val;
            return `'${String(val).replace(/'/g, "''")}'`;
          });
          content += `INSERT INTO "${tName}" (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${vals.join(', ')});\n`;
        }
      }

      fs.writeFileSync(result.filePath, content, 'utf-8');
      return { success: true, filePath: result.filePath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  safeHandle('db-get-default-path', (event, name) => {
    try {
      const filePath = dbManager.resolveSqlitePath({ name });
      return { success: true, filePath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  safeHandle('db-migrate-database-file', async (event, config) => {
    try {
      const win = getMainWindow();
      const sourcePath = dbManager.resolveSqlitePath(config);
      const defaultName = path.basename(sourcePath);

      const result = await dialog.showSaveDialog(win, {
        title: 'Migrar / Exportar Archivo de Base de Datos SQLite (.sqlite)',
        defaultPath: defaultName,
        filters: [
          { name: 'Base de Datos SQLite (*.sqlite)', extensions: ['sqlite', 'db'] },
          { name: 'Todos los archivos', extensions: ['*'] }
        ]
      });

      if (result.canceled || !result.filePath) {
        return { success: false, canceled: true };
      }

      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, result.filePath);
      } else {
        const SQL = await dbManager.getSqlJs();
        const db = new SQL.Database();
        const exported = db.export();
        fs.writeFileSync(result.filePath, Buffer.from(exported));
        db.close();
      }

      return { success: true, filePath: result.filePath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

module.exports = { registerDbHandlers };
