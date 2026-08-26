const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { Client: PgClient } = require('pg');
const initSqlJs = require('sql.js');
let Redis = null;
try {
  Redis = require('ioredis');
} catch (e) {
  // lazy require fallback
}

let sqlJsInstance = null;

async function getSqlJs() {
  if (!sqlJsInstance) {
    sqlJsInstance = await initSqlJs();
  }
  return sqlJsInstance;
}

function resolveDbType(config) {
  if (!config) return 'sqlite';
  const str = String(config.type || config.engine || config.driver || config.dbType || '').toLowerCase();
  if (str.includes('redis')) return 'redis';
  if (str.includes('mysql') || str.includes('mariadb')) return 'mysql';
  if (str.includes('postg') || str.includes('pg')) return 'postgres';
  if (str.includes('sqlite')) return 'sqlite';
  return 'sqlite';
}

function getLummoDatabasesDir() {
  const os = require('os');
  let docsPath;
  try {
    const { app } = require('electron');
    if (app && app.getPath) {
      docsPath = app.getPath('documents');
    }
  } catch (e) {}
  if (!docsPath) {
    docsPath = path.join(os.homedir(), 'Documents');
  }
  const dbDir = path.join(docsPath, 'LummoStudio', 'Databases');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  return dbDir;
}

function resolveSqlitePath(config) {
  if (config && config.filePath && fs.existsSync(path.dirname(config.filePath))) {
    return config.filePath;
  }
  const dbDir = getLummoDatabasesDir();
  const dbName = (config && config.name) ? config.name.replace(/[^a-zA-Z0-9_-]/g, '_') : 'lummo_database';
  return path.join(dbDir, `${dbName}.sqlite`);
}

// --------------------------------------------------------------------------
// Helper: Connection Testers (SQLite, MySQL, Postgres, Redis)
// --------------------------------------------------------------------------
async function testConnection(config) {
  const type = resolveDbType(config);

  try {
    if (type.includes('redis')) {
      if (!Redis) Redis = require('ioredis');
      const client = new Redis({
        host: config.host || '127.0.0.1',
        port: Number(config.port) || 6379,
        password: config.password || undefined,
        connectTimeout: 3000,
        lazyConnect: true,
        maxRetriesPerRequest: 1
      });
      await client.connect();
      const pingRes = await client.ping();
      const infoStr = await client.info('server');
      const versionMatch = infoStr.match(/redis_version:([^\r\n]+)/);
      const version = versionMatch ? versionMatch[1] : 'Active';
      await client.quit();
      return { success: true, message: `Conexión a Redis exitosa (${config.host || '127.0.0.1'}:${config.port || 6379} - v${version})` };
    }

    if (type.includes('sqlite')) {
      const dbPath = resolveSqlitePath(config);
      return { success: true, message: `Conectado a SQLite (${path.basename(dbPath)})` };
    }

    if (type.includes('mysql') || type.includes('mariadb')) {
      const conn = await mysql.createConnection({
        host: config.host || '127.0.0.1',
        port: Number(config.port) || 3306,
        user: config.user || 'root',
        password: config.password || '',
        database: config.database || undefined,
        connectTimeout: 4000
      });
      await conn.ping();
      await conn.end();
      return { success: true, message: `Conexión a MySQL/MariaDB (${config.host}:${config.port || 3306}) exitosa.` };
    }

    if (type.includes('postgres') || type.includes('pg')) {
      const client = new PgClient({
        host: config.host || '127.0.0.1',
        port: Number(config.port) || 5432,
        user: config.user || 'postgres',
        password: config.password || '',
        database: config.database || 'postgres',
        connectionTimeoutMillis: 4000
      });
      await client.connect();
      await client.end();
      return { success: true, message: `Conexión a PostgreSQL (${config.host}:${config.port || 5432}) exitosa.` };
    }

    return { success: false, error: `Motor de base de datos desconocido: ${type}` };
  } catch (err) {
    return { success: false, error: err.message || 'Error de conexión' };
  }
}

// --------------------------------------------------------------------------
// Helper: Get Schema (List Tables and Columns)
// --------------------------------------------------------------------------
async function getSchema(config) {
  const type = resolveDbType(config);

  try {
    if (type.includes('sqlite')) {
      const SQL = await getSqlJs();
      const dbPath = resolveSqlitePath(config);
      let fileData = null;
      if (fs.existsSync(dbPath)) {
        fileData = fs.readFileSync(dbPath);
      }
      const db = new SQL.Database(fileData);

      const tablesRes = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';");
      const tablesMap = {};

      if (tablesRes.length > 0) {
        const tableNames = tablesRes[0].values.map(v => v[0]);
        for (const tableName of tableNames) {
          const rowsRes = db.exec(`SELECT * FROM "${tableName}" LIMIT 100;`);
          if (rowsRes.length > 0) {
            const columns = rowsRes[0].columns;
            const rows = rowsRes[0].values.map(rowVals => {
              const obj = {};
              columns.forEach((col, idx) => {
                obj[col] = rowVals[idx];
              });
              return obj;
            });
            tablesMap[tableName] = rows;
          } else {
            tablesMap[tableName] = [];
          }
        }
      }

      db.close();
      return { success: true, tables: tablesMap };
    }

    if (type.includes('mysql') || type.includes('mariadb')) {
      const conn = await mysql.createConnection({
        host: config.host || '127.0.0.1',
        port: Number(config.port) || 3306,
        user: config.user || 'root',
        password: config.password || '',
        database: config.database || undefined
      });

      const [tablesRows] = await conn.query("SHOW TABLES;");
      const tablesMap = {};

      for (const row of tablesRows) {
        const tableName = Object.values(row)[0];
        const [dataRows] = await conn.query(`SELECT * FROM \`${tableName}\` LIMIT 50;`);
        tablesMap[tableName] = dataRows;
      }

      await conn.end();
      return { success: true, tables: tablesMap };
    }

    if (type.includes('postgres') || type.includes('pg')) {
      const client = new PgClient({
        host: config.host || '127.0.0.1',
        port: Number(config.port) || 5432,
        user: config.user || 'postgres',
        password: config.password || '',
        database: config.database || 'postgres'
      });
      await client.connect();

      const tablesRes = await client.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
      );
      const tablesMap = {};

      for (const row of tablesRes.rows) {
        const tableName = row.table_name;
        const dataRes = await client.query(`SELECT * FROM "${tableName}" LIMIT 50;`);
        tablesMap[tableName] = dataRes.rows;
      }

      await client.end();
      return { success: true, tables: tablesMap };
    }

    return { success: false, error: `Motor no soportado: ${type}` };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// --------------------------------------------------------------------------
// Helper: Server-side Paginated Table Rows Query
// --------------------------------------------------------------------------
async function getTableRows(optionsOrConfig, tableNameParam, pageParam = 1, limitParam = 25, sortColumnParam = null, sortDirParam = 'ASC') {
  let config, tableName, page = 1, limit = 25, sortColumn = null, sortDir = 'ASC';

  if (optionsOrConfig && typeof optionsOrConfig === 'object' && optionsOrConfig.tableName) {
    ({ config, tableName, page = 1, limit = 25, sortColumn = null, sortDir = 'ASC' } = optionsOrConfig);
  } else {
    config = optionsOrConfig;
    tableName = tableNameParam;
    page = pageParam || 1;
    limit = limitParam || 25;
    sortColumn = sortColumnParam;
    sortDir = sortDirParam || 'ASC';
  }

  if (!config || !tableName) {
    return { success: false, error: 'Configuración o tabla no especificada.' };
  }

  const type = resolveDbType(config);
  const offset = Math.max(0, (page - 1) * limit);
  const direction = sortDir && sortDir.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  try {
    if (type.includes('sqlite')) {
      const SQL = await getSqlJs();
      const dbPath = resolveSqlitePath(config);
      let fileData = null;
      if (fs.existsSync(dbPath)) {
        fileData = fs.readFileSync(dbPath);
      }
      const db = new SQL.Database(fileData);

      // Count query
      let countSql = `SELECT COUNT(*) FROM "${tableName}"`;
      const countRes = db.exec(countSql);
      const totalRows = countRes.length > 0 ? countRes[0].values[0][0] : 0;

      // Data query with LIMIT & OFFSET
      let orderClause = sortColumn ? ` ORDER BY "${sortColumn}" ${direction}` : '';
      let dataSql = `SELECT * FROM "${tableName}"${orderClause} LIMIT ${limit} OFFSET ${offset};`;
      const dataRes = db.exec(dataSql);

      let rows = [];
      let columns = [];

      if (dataRes.length > 0) {
        columns = dataRes[0].columns;
        rows = dataRes[0].values.map(rowVals => {
          const obj = {};
          columns.forEach((col, idx) => {
            obj[col] = rowVals[idx];
          });
          return obj;
        });
      }

      db.close();
      return {
        success: true,
        rows,
        columns,
        totalRows,
        page,
        limit,
        totalPages: Math.ceil(totalRows / limit) || 1
      };
    }

    if (type.includes('mysql') || type.includes('mariadb')) {
      const conn = await mysql.createConnection({
        host: config.host || '127.0.0.1',
        port: Number(config.port) || 3306,
        user: config.user || 'root',
        password: config.password || '',
        database: config.database || undefined
      });

      const [countRows] = await conn.query(`SELECT COUNT(*) as total FROM \`${tableName}\`;`);
      const totalRows = countRows[0]?.total || 0;

      let orderClause = sortColumn ? ` ORDER BY \`${sortColumn}\` ${direction}` : '';
      const [rows] = await conn.query(`SELECT * FROM \`${tableName}\`${orderClause} LIMIT ? OFFSET ?;`, [limit, offset]);
      await conn.end();

      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
      return {
        success: true,
        rows,
        columns,
        totalRows,
        page,
        limit,
        totalPages: Math.ceil(totalRows / limit) || 1
      };
    }

    if (type.includes('postgres') || type.includes('pg')) {
      const client = new PgClient({
        host: config.host || '127.0.0.1',
        port: Number(config.port) || 5432,
        user: config.user || 'postgres',
        password: config.password || '',
        database: config.database || 'postgres'
      });
      await client.connect();

      const countRes = await client.query(`SELECT COUNT(*) as total FROM "${tableName}";`);
      const totalRows = parseInt(countRes.rows[0]?.total || '0', 10);

      let orderClause = sortColumn ? ` ORDER BY "${sortColumn}" ${direction}` : '';
      const dataRes = await client.query(`SELECT * FROM "${tableName}"${orderClause} LIMIT $1 OFFSET $2;`, [limit, offset]);
      await client.end();

      const columns = dataRes.fields ? dataRes.fields.map(f => f.name) : (dataRes.rows.length > 0 ? Object.keys(dataRes.rows[0]) : []);
      return {
        success: true,
        rows: dataRes.rows,
        columns,
        totalRows,
        page,
        limit,
        totalPages: Math.ceil(totalRows / limit) || 1
      };
    }

    return { success: false, error: `Motor no compatible para paginación: ${type}` };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// --------------------------------------------------------------------------
// Helper: In-line Table Row Cell Update (UPDATE table SET col = ? WHERE pk = ?)
// --------------------------------------------------------------------------
async function updateTableRow(optionsOrConfig, tableNameParam, primaryKeyParam = 'id', pkValParam, colParam, newValParam) {
  let config, tableName, primaryKey = 'id', primaryKeyValue, column, newValue;

  if (optionsOrConfig && typeof optionsOrConfig === 'object' && optionsOrConfig.tableName) {
    ({ config, tableName, primaryKey = 'id', primaryKeyValue, column, newValue } = optionsOrConfig);
  } else {
    config = optionsOrConfig;
    tableName = tableNameParam;
    primaryKey = primaryKeyParam || 'id';
    primaryKeyValue = pkValParam;
    column = colParam;
    newValue = newValParam;
  }

  if (!config || !tableName) {
    return { success: false, error: 'Configuración o tabla no especificada.' };
  }

  const type = resolveDbType(config);

  try {
    if (type.includes('sqlite')) {
      const SQL = await getSqlJs();
      const dbPath = resolveSqlitePath(config);
      let fileData = null;
      if (fs.existsSync(dbPath)) {
        fileData = fs.readFileSync(dbPath);
      }
      const db = new SQL.Database(fileData);

      const valEscaped = newValue === null ? 'NULL' : typeof newValue === 'number' ? newValue : `'${String(newValue).replace(/'/g, "''")}'`;
      const pkEscaped = typeof primaryKeyValue === 'number' ? primaryKeyValue : `'${String(primaryKeyValue).replace(/'/g, "''")}'`;
      
      const sql = `UPDATE "${tableName}" SET "${column}" = ${valEscaped} WHERE "${primaryKey}" = ${pkEscaped};`;
      db.run(sql);

      const exported = db.export();
      fs.writeFileSync(dbPath, Buffer.from(exported));
      db.close();

      return { success: true, message: `Fila actualizada correctamente.` };
    }

    if (type.includes('mysql') || type.includes('mariadb')) {
      const conn = await mysql.createConnection({
        host: config.host || '127.0.0.1',
        port: Number(config.port) || 3306,
        user: config.user || 'root',
        password: config.password || '',
        database: config.database || undefined
      });

      const sql = `UPDATE \`${tableName}\` SET \`${column}\` = ? WHERE \`${primaryKey}\` = ?;`;
      await conn.query(sql, [newValue, primaryKeyValue]);
      await conn.end();

      return { success: true, message: `Fila actualizada correctamente.` };
    }

    if (type.includes('postgres') || type.includes('pg')) {
      const client = new PgClient({
        host: config.host || '127.0.0.1',
        port: Number(config.port) || 5432,
        user: config.user || 'postgres',
        password: config.password || '',
        database: config.database || 'postgres'
      });
      await client.connect();

      const sql = `UPDATE "${tableName}" SET "${column}" = $1 WHERE "${primaryKey}" = $2;`;
      await client.query(sql, [newValue, primaryKeyValue]);
      await client.end();

      return { success: true, message: `Fila actualizada correctamente.` };
    }

    return { success: false, error: 'Motor no soportado para actualización en línea' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// --------------------------------------------------------------------------
// Helper: Execute Raw SQL Query
// --------------------------------------------------------------------------
async function executeQuery(config, sqlQuery) {
  const type = resolveDbType(config);
  const startTime = Date.now();

  try {
    if (type.includes('sqlite')) {
      const SQL = await getSqlJs();
      const dbPath = resolveSqlitePath(config);
      let fileData = null;
      if (fs.existsSync(dbPath)) {
        fileData = fs.readFileSync(dbPath);
      }
      const db = new SQL.Database(fileData);

      const res = db.exec(sqlQuery);
      let rows = [];
      let columns = [];

      if (res.length > 0) {
        columns = res[0].columns;
        rows = res[0].values.map(rowVals => {
          const obj = {};
          columns.forEach((col, idx) => {
            obj[col] = rowVals[idx];
          });
          return obj;
        });
      }

      // Save changes if query modifies data
      const isMutation = /CREATE|INSERT|UPDATE|DELETE|DROP|ALTER/i.test(sqlQuery);
      if (isMutation) {
        const exported = db.export();
        fs.writeFileSync(dbPath, Buffer.from(exported));
      }

      db.close();
      const executionTime = Date.now() - startTime;
      return { success: true, columns, rows, count: rows.length, executionTimeMs: executionTime };
    }

    if (type.includes('mysql') || type.includes('mariadb')) {
      const conn = await mysql.createConnection({
        host: config.host || '127.0.0.1',
        port: Number(config.port) || 3306,
        user: config.user || 'root',
        password: config.password || '',
        database: config.database || undefined
      });

      const [results] = await conn.query(sqlQuery);
      await conn.end();

      const executionTime = Date.now() - startTime;
      const rows = Array.isArray(results) ? results : [];
      const affectedRows = results.affectedRows || rows.length;

      return {
        success: true,
        columns: rows.length > 0 ? Object.keys(rows[0]) : [],
        rows,
        count: affectedRows,
        executionTimeMs: executionTime
      };
    }

    if (type.includes('postgres') || type.includes('pg')) {
      const client = new PgClient({
        host: config.host || '127.0.0.1',
        port: Number(config.port) || 5432,
        user: config.user || 'postgres',
        password: config.password || '',
        database: config.database || 'postgres'
      });
      await client.connect();

      const res = await client.query(sqlQuery);
      await client.end();

      const executionTime = Date.now() - startTime;
      const rows = res.rows || [];

      return {
        success: true,
        columns: res.fields ? res.fields.map(f => f.name) : (rows.length > 0 ? Object.keys(rows[0]) : []),
        rows,
        count: res.rowCount || rows.length,
        executionTimeMs: executionTime
      };
    }

    return { success: false, error: 'Motor de base de datos no compatible' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// --------------------------------------------------------------------------
// Helper: REDIS Key-Value Operations
// --------------------------------------------------------------------------
function createRedisClient(config) {
  if (!Redis) Redis = require('ioredis');
  const client = new Redis({
    host: config?.host || '127.0.0.1',
    port: Number(config?.port) || 6379,
    password: config?.password || undefined,
    connectTimeout: 3000,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null
  });
  client.on('error', () => {});
  return client;
}

async function getRedisKeys(config, pattern = '*') {
  try {
    const client = createRedisClient(config);
    await client.connect();
    const keys = await client.keys(pattern);
    const keyDetails = [];

    for (const key of keys.slice(0, 100)) {
      const type = await client.type(key);
      const ttl = await client.ttl(key);
      keyDetails.push({ key, type, ttl });
    }

    await client.quit();
    return { success: true, keys: keyDetails, count: keys.length };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function getRedisKeyValue(config, key) {
  try {
    const client = createRedisClient(config);
    await client.connect();
    const type = await client.type(key);
    const ttl = await client.ttl(key);
    let value = null;

    if (type === 'string') {
      value = await client.get(key);
    } else if (type === 'hash') {
      value = await client.hgetall(key);
    } else if (type === 'list') {
      value = await client.lrange(key, 0, 100);
    } else if (type === 'set') {
      value = await client.smembers(key);
    } else if (type === 'zset') {
      value = await client.zrange(key, 0, 100, 'WITHSCORES');
    }

    await client.quit();
    return { success: true, key, type, ttl, value };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function setRedisKeyValue(config, { key, value, type = 'string', ttl = -1 }) {
  try {
    const client = createRedisClient(config);
    await client.connect();

    if (type === 'string') {
      await client.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
    } else if (type === 'hash') {
      await client.hmset(key, value);
    }

    if (ttl > 0) {
      await client.expire(key, ttl);
    }

    await client.quit();
    return { success: true, message: `Clave "${key}" guardada en Redis.` };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function deleteRedisKey(config, key) {
  try {
    const client = createRedisClient(config);
    await client.connect();
    await client.del(key);
    await client.quit();
    return { success: true, message: `Clave "${key}" eliminada.` };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function flushRedisDb(config) {
  try {
    const client = createRedisClient(config);
    await client.connect();
    await client.flushdb();
    await client.quit();
    return { success: true, message: 'Base de datos Redis vaciada (FLUSHDB completado).' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// --------------------------------------------------------------------------
// Helper: Import & Export SQL Dump File
// --------------------------------------------------------------------------
async function importSqlDump(config, filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'El archivo SQL no existe.' };
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const statements = content
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

    let executedCount = 0;
    for (const stmt of statements) {
      await executeQuery(config, stmt);
      executedCount++;
    }

    return { success: true, message: `Se ejecutaron ${executedCount} sentencias SQL correctamente.` };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function exportSqlDump(config, destinationPath) {
  try {
    const schemaRes = await getSchema(config);
    if (!schemaRes.success) {
      return schemaRes;
    }

    const dbName = config.name || config.database || 'Database';
    let sqlDump = `-- Lummo Studio Database Export (${dbName})\n-- Timestamp: ${new Date().toISOString()}\n-- Generated by Lummo Studio\n\n`;

    for (const [tableName, rows] of Object.entries(schemaRes.tables)) {
      sqlDump += `-- --------------------------------------------------------\n`;
      sqlDump += `-- Estrutura de tabla para "${tableName}"\n`;
      sqlDump += `-- --------------------------------------------------------\n`;
      
      if (rows.length > 0) {
        const columns = Object.keys(rows[0]);
        const colDefs = columns.map(c => `  "${c}" TEXT`).join(',\n');
        sqlDump += `CREATE TABLE IF NOT EXISTS "${tableName}" (\n${colDefs}\n);\n\n`;

        sqlDump += `-- Volcado de datos para "${tableName}" (${rows.length} registros)\n`;
        for (const row of rows) {
          const vals = columns.map(c => {
            const val = row[c];
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'number') return val;
            return `'${String(val).replace(/'/g, "''")}'`;
          });
          sqlDump += `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${vals.join(', ')});\n`;
        }
      } else {
        sqlDump += `CREATE TABLE IF NOT EXISTS "${tableName}" (\n  "id" INTEGER PRIMARY KEY\n);\n`;
      }
      sqlDump += '\n\n';
    }

    const dir = path.dirname(destinationPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(destinationPath, sqlDump, 'utf-8');
    return { success: true, message: `Dump exportado exitosamente a "${destinationPath}".`, filePath: destinationPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function createDatabaseSnapshot(config, targetFolder) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dbName = (config.name || config.database || 'snapshot').replace(/[^a-zA-Z0-9_-]/g, '_');
    
    let baseDir = targetFolder;
    if (!baseDir || !fs.existsSync(baseDir)) {
      baseDir = path.join(process.cwd(), '.lummo_backups');
    } else {
      baseDir = path.join(baseDir, '.lummo_backups');
    }

    const fileName = `snapshot_${dbName}_${timestamp}.sql`;
    const destinationPath = path.join(baseDir, fileName);

    const result = await exportSqlDump(config, destinationPath);
    if (result.success) {
      return {
        success: true,
        fileName,
        filePath: destinationPath,
        timestamp: new Date().toISOString(),
        message: `Snapshot "${fileName}" guardado exitosamente.`
      };
    }
    return result;
  } catch (err) {
    return { success: false, error: `Error creando snapshot: ${err.message}` };
  }
}

module.exports = {
  getSqlJs,
  resolveDbType,
  testConnection,
  getSchema,
  getTableRows,
  updateTableRow,
  executeQuery,
  importSqlDump,
  exportSqlDump,
  createDatabaseSnapshot,
  getLummoDatabasesDir,
  resolveSqlitePath,
  getRedisKeys,
  getRedisKeyValue,
  setRedisKeyValue,
  deleteRedisKey,
  flushRedisDb
};
