use redis::AsyncCommands;
use rusqlite::{types::ValueRef, Connection};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::{
    mysql::MySqlPoolOptions,
    postgres::PgPoolOptions,
    Column, Row, TypeInfo, ValueRef as SqlxValueRef,
};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::Instant;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseConfig {
    pub id: Option<String>,
    pub name: Option<String>,
    pub r#type: Option<String>,
    pub engine: Option<String>,
    pub driver: Option<String>,
    pub db_type: Option<String>,
    pub host: Option<String>,
    pub port: Option<u16>,
    pub user: Option<String>,
    pub password: Option<String>,
    pub database: Option<String>,
    pub file_path: Option<String>,
}

pub fn resolve_db_type(config: &DatabaseConfig) -> &'static str {
    let raw = config
        .r#type
        .as_deref()
        .or(config.engine.as_deref())
        .or(config.driver.as_deref())
        .or(config.db_type.as_deref())
        .unwrap_or("sqlite")
        .to_lowercase();

    if raw.contains("redis") {
        "redis"
    } else if raw.contains("mysql") || raw.contains("mariadb") {
        "mysql"
    } else if raw.contains("postg") || raw.contains("pg") {
        "postgres"
    } else {
        "sqlite"
    }
}

pub fn get_default_db_dir() -> PathBuf {
    let base = dirs::document_dir().unwrap_or_else(|| std::env::current_dir().unwrap_or_default());
    let dir = base.join("LummoStudio").join("Databases");
    let _ = fs::create_dir_all(&dir);
    dir
}

pub fn resolve_sqlite_path(config: &DatabaseConfig) -> PathBuf {
    if let Some(ref fp) = config.file_path {
        if !fp.is_empty() {
            let p = PathBuf::from(fp);
            if let Some(parent) = p.parent() {
                if parent.exists() {
                    return p;
                }
            }
        }
    }
    let dir = get_default_db_dir();
    let raw_name = config.name.as_deref().unwrap_or("lummo_database");
    let clean: String = raw_name
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '_' || c == '-' {
                c
            } else {
                '_'
            }
        })
        .collect();
    dir.join(format!("{}.sqlite", clean))
}

fn open_sqlite_wal(path: &Path) -> Result<Connection, String> {
    let conn = Connection::open(path).map_err(|e| e.to_string())?;
    let _ = conn.pragma_update(None, "journal_mode", "WAL");
    let _ = conn.pragma_update(None, "foreign_keys", "ON");
    Ok(conn)
}

fn build_mysql_url(config: &DatabaseConfig) -> String {
    let host = config.host.as_deref().unwrap_or("127.0.0.1");
    let port = config.port.unwrap_or(3306);
    let user = config.user.as_deref().unwrap_or("root");
    let pass = config.password.as_deref().unwrap_or("");
    let db = config.database.as_deref().unwrap_or("");
    if pass.is_empty() {
        format!("mysql://{}@{}:{}/{}", user, host, port, db)
    } else {
        format!("mysql://{}:{}@{}:{}/{}", user, pass, host, port, db)
    }
}

fn build_pg_url(config: &DatabaseConfig) -> String {
    let host = config.host.as_deref().unwrap_or("127.0.0.1");
    let port = config.port.unwrap_or(5432);
    let user = config.user.as_deref().unwrap_or("postgres");
    let pass = config.password.as_deref().unwrap_or("");
    let db = config.database.as_deref().unwrap_or("postgres");
    if pass.is_empty() {
        format!("postgres://{}@{}:{}/{}", user, host, port, db)
    } else {
        format!("postgres://{}:{}@{}:{}/{}", user, pass, host, port, db)
    }
}

fn build_redis_url(config: &DatabaseConfig) -> String {
    let host = config.host.as_deref().unwrap_or("127.0.0.1");
    let port = config.port.unwrap_or(6379);
    let pass = config.password.as_deref().unwrap_or("");
    if pass.is_empty() {
        format!("redis://{}:{}/", host, port)
    } else {
        format!("redis://:{}@{}:{}/", pass, host, port)
    }
}

pub async fn test_connection(config: &DatabaseConfig) -> Value {
    match resolve_db_type(config) {
        "redis" => {
            let url = build_redis_url(config);
            let client = match redis::Client::open(url) {
                Ok(c) => c,
                Err(e) => return json!({ "success": false, "error": e.to_string() }),
            };
            match client.get_multiplexed_async_connection().await {
                Ok(mut conn) => {
                    let pong: Result<String, _> = redis::cmd("PING").query_async(&mut conn).await;
                    match pong {
                        Ok(_) => json!({
                            "success": true,
                            "message": format!("Conexión a Redis exitosa ({}:{})", config.host.as_deref().unwrap_or("127.0.0.1"), config.port.unwrap_or(6379))
                        }),
                        Err(e) => json!({ "success": false, "error": e.to_string() }),
                    }
                }
                Err(e) => json!({ "success": false, "error": e.to_string() }),
            }
        }
        "mysql" => {
            let url = build_mysql_url(config);
            match MySqlPoolOptions::new().max_connections(1).connect(&url).await {
                Ok(pool) => {
                    pool.close().await;
                    json!({
                        "success": true,
                        "message": format!("Conexión a MySQL/MariaDB ({}:{}) exitosa.", config.host.as_deref().unwrap_or("127.0.0.1"), config.port.unwrap_or(3306))
                    })
                }
                Err(e) => json!({ "success": false, "error": e.to_string() }),
            }
        }
        "postgres" => {
            let url = build_pg_url(config);
            match PgPoolOptions::new().max_connections(1).connect(&url).await {
                Ok(pool) => {
                    pool.close().await;
                    json!({
                        "success": true,
                        "message": format!("Conexión a PostgreSQL ({}:{}) exitosa.", config.host.as_deref().unwrap_or("127.0.0.1"), config.port.unwrap_or(5432))
                    })
                }
                Err(e) => json!({ "success": false, "error": e.to_string() }),
            }
        }
        _ => {
            let db_path = resolve_sqlite_path(config);
            match open_sqlite_wal(&db_path) {
                Ok(_) => json!({
                    "success": true,
                    "message": format!("Conectado a SQLite ({})", db_path.file_name().unwrap_or_default().to_string_lossy())
                }),
                Err(e) => json!({ "success": false, "error": e }),
            }
        }
    }
}

fn value_ref_to_json(val: ValueRef<'_>) -> Value {
    match val {
        ValueRef::Null => Value::Null,
        ValueRef::Integer(i) => json!(i),
        ValueRef::Real(f) => json!(f),
        ValueRef::Text(t) => json!(String::from_utf8_lossy(t).to_string()),
        ValueRef::Blob(b) => json!(format!("<BLOB {} bytes>", b.len())),
    }
}

fn execute_sqlite_query_sync(config: &DatabaseConfig, query: &str) -> Value {
    let start = Instant::now();
    let db_path = resolve_sqlite_path(config);
    let conn = match open_sqlite_wal(&db_path) {
        Ok(c) => c,
        Err(e) => return json!({ "success": false, "error": e }),
    };

    let trimmed = query.trim();
    let upper = trimmed.to_uppercase();
    let is_select =
        upper.starts_with("SELECT") || upper.starts_with("PRAGMA") || upper.starts_with("EXPLAIN");

    if is_select {
        let mut stmt = match conn.prepare(trimmed) {
            Ok(s) => s,
            Err(e) => return json!({ "success": false, "error": e.to_string() }),
        };

        let col_names: Vec<String> = stmt.column_names().into_iter().map(|s| s.to_string()).collect();
        let mut rows_out: Vec<Value> = Vec::new();

        let mut rows = match stmt.query([]) {
            Ok(r) => r,
            Err(e) => return json!({ "success": false, "error": e.to_string() }),
        };

        while let Ok(Some(row)) = rows.next() {
            let mut obj = serde_json::Map::new();
            for (idx, col_name) in col_names.iter().enumerate() {
                let v = row.get_ref(idx).map(value_ref_to_json).unwrap_or(Value::Null);
                obj.insert(col_name.clone(), v);
            }
            rows_out.push(Value::Object(obj));
        }

        let count = rows_out.len();
        json!({
            "success": true,
            "columns": col_names,
            "rows": rows_out,
            "count": count,
            "executionTimeMs": start.elapsed().as_millis()
        })
    } else {
        match conn.execute_batch(trimmed) {
            Ok(_) => json!({
                "success": true,
                "rows": [],
                "columns": [],
                "count": 0,
                "executionTimeMs": start.elapsed().as_millis(),
                "message": "Consulta ejecutada correctamente."
            }),
            Err(e) => json!({ "success": false, "error": e.to_string() }),
        }
    }
}

pub async fn execute_query(config: &DatabaseConfig, query: &str) -> Value {
    let start = Instant::now();
    match resolve_db_type(config) {
        "mysql" => {
            let url = build_mysql_url(config);
            let pool = match MySqlPoolOptions::new().max_connections(2).connect(&url).await {
                Ok(p) => p,
                Err(e) => return json!({ "success": false, "error": e.to_string() }),
            };
            let rows_res = sqlx::query(query).fetch_all(&pool).await;
            pool.close().await;
            match rows_res {
                Ok(rows) => {
                    let cols: Vec<String> = rows
                        .first()
                        .map(|r| r.columns().iter().map(|c| c.name().to_string()).collect())
                        .unwrap_or_default();
                    let mut json_rows = Vec::with_capacity(rows.len());
                    for r in rows {
                        let mut map = serde_json::Map::new();
                        for (i, c) in r.columns().iter().enumerate() {
                            let val = if r.try_get_raw(i).map(|v| v.is_null()).unwrap_or(true) {
                                Value::Null
                            } else if let Ok(v) = r.try_get::<i64, _>(i) {
                                json!(v)
                            } else if let Ok(v) = r.try_get::<f64, _>(i) {
                                json!(v)
                            } else if let Ok(v) = r.try_get::<bool, _>(i) {
                                json!(v)
                            } else if let Ok(v) = r.try_get::<String, _>(i) {
                                json!(v)
                            } else {
                                json!(format!("<{}>", c.type_info().name()))
                            };
                            map.insert(c.name().to_string(), val);
                        }
                        json_rows.push(Value::Object(map));
                    }
                    let count = json_rows.len();
                    json!({
                        "success": true,
                        "columns": cols,
                        "rows": json_rows,
                        "count": count,
                        "executionTimeMs": start.elapsed().as_millis()
                    })
                }
                Err(e) => json!({ "success": false, "error": e.to_string() }),
            }
        }
        "postgres" => {
            let url = build_pg_url(config);
            let pool = match PgPoolOptions::new().max_connections(2).connect(&url).await {
                Ok(p) => p,
                Err(e) => return json!({ "success": false, "error": e.to_string() }),
            };
            let rows_res = sqlx::query(query).fetch_all(&pool).await;
            pool.close().await;
            match rows_res {
                Ok(rows) => {
                    let cols: Vec<String> = rows
                        .first()
                        .map(|r| r.columns().iter().map(|c| c.name().to_string()).collect())
                        .unwrap_or_default();
                    let mut json_rows = Vec::with_capacity(rows.len());
                    for r in rows {
                        let mut map = serde_json::Map::new();
                        for (i, c) in r.columns().iter().enumerate() {
                            let val = if r.try_get_raw(i).map(|v| v.is_null()).unwrap_or(true) {
                                Value::Null
                            } else if let Ok(v) = r.try_get::<i64, _>(i) {
                                json!(v)
                            } else if let Ok(v) = r.try_get::<i32, _>(i) {
                                json!(v)
                            } else if let Ok(v) = r.try_get::<f64, _>(i) {
                                json!(v)
                            } else if let Ok(v) = r.try_get::<bool, _>(i) {
                                json!(v)
                            } else if let Ok(v) = r.try_get::<String, _>(i) {
                                json!(v)
                            } else {
                                json!(format!("<{}>", c.type_info().name()))
                            };
                            map.insert(c.name().to_string(), val);
                        }
                        json_rows.push(Value::Object(map));
                    }
                    let count = json_rows.len();
                    json!({
                        "success": true,
                        "columns": cols,
                        "rows": json_rows,
                        "count": count,
                        "executionTimeMs": start.elapsed().as_millis()
                    })
                }
                Err(e) => json!({ "success": false, "error": e.to_string() }),
            }
        }
        _ => execute_sqlite_query_sync(config, query),
    }
}

pub async fn get_schema(config: &DatabaseConfig) -> Value {
    match resolve_db_type(config) {
        "mysql" => {
            let res = execute_query(config, "SHOW TABLES;").await;
            if !res.get("success").and_then(|v| v.as_bool()).unwrap_or(false) {
                return res;
            }
            let mut tables_map: HashMap<String, Vec<Value>> = HashMap::new();
            if let Some(rows) = res.get("rows").and_then(|v| v.as_array()) {
                for r in rows {
                    if let Some(obj) = r.as_object() {
                        if let Some(tname) = obj.values().next().and_then(|v| v.as_str()) {
                            let data_res = execute_query(
                                config,
                                &format!("SELECT * FROM `{}` LIMIT 50;", tname.replace('`', "")),
                            )
                            .await;
                            let trows = data_res
                                .get("rows")
                                .and_then(|v| v.as_array())
                                .cloned()
                                .unwrap_or_default();
                            tables_map.insert(tname.to_string(), trows);
                        }
                    }
                }
            }
            json!({ "success": true, "tables": tables_map })
        }
        "postgres" => {
            let res = execute_query(
                config,
                "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';",
            )
            .await;
            if !res.get("success").and_then(|v| v.as_bool()).unwrap_or(false) {
                return res;
            }
            let mut tables_map: HashMap<String, Vec<Value>> = HashMap::new();
            if let Some(rows) = res.get("rows").and_then(|v| v.as_array()) {
                for r in rows {
                    if let Some(tname) = r.get("table_name").and_then(|v| v.as_str()) {
                        let data_res = execute_query(
                            config,
                            &format!("SELECT * FROM \"{}\" LIMIT 50;", tname.replace('"', "\"\"")),
                        )
                        .await;
                        let trows = data_res
                            .get("rows")
                            .and_then(|v| v.as_array())
                            .cloned()
                            .unwrap_or_default();
                        tables_map.insert(tname.to_string(), trows);
                    }
                }
            }
            json!({ "success": true, "tables": tables_map })
        }
        _ => {
            let db_path = resolve_sqlite_path(config);
            let conn = match open_sqlite_wal(&db_path) {
                Ok(c) => c,
                Err(e) => return json!({ "success": false, "error": e }),
            };
            let mut stmt = match conn.prepare(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;",
            ) {
                Ok(s) => s,
                Err(e) => return json!({ "success": false, "error": e.to_string() }),
            };
            let table_names: Vec<String> = stmt
                .query_map([], |row| row.get::<_, String>(0))
                .ok()
                .into_iter()
                .flatten()
                .flatten()
                .collect();
            drop(stmt);
            drop(conn);

            let mut tables_map: HashMap<String, Vec<Value>> = HashMap::new();
            for tname in table_names {
                let q = format!("SELECT * FROM \"{}\" LIMIT 100;", tname.replace('"', "\"\""));
                let data_res = execute_sqlite_query_sync(config, &q);
                let rows = data_res
                    .get("rows")
                    .and_then(|v| v.as_array())
                    .cloned()
                    .unwrap_or_default();
                tables_map.insert(tname, rows);
            }
            json!({ "success": true, "tables": tables_map })
        }
    }
}

pub async fn get_table_rows(payload: &Value) -> Value {
    let cfg_val = payload.get("config").cloned().unwrap_or(Value::Null);
    let config: DatabaseConfig = serde_json::from_value(cfg_val).unwrap_or_default();

    let table_name = payload
        .get("tableName")
        .or_else(|| payload.get("table"))
        .and_then(|v| v.as_str())
        .unwrap_or("");
    if table_name.is_empty() {
        return json!({ "success": false, "error": "Configuración o tabla no especificada." });
    }

    let page = payload.get("page").and_then(|v| v.as_u64()).unwrap_or(1).max(1);
    let limit = payload.get("limit").and_then(|v| v.as_u64()).unwrap_or(25).max(1);
    let offset = (page - 1) * limit;
    let sort_col = payload.get("sortColumn").and_then(|v| v.as_str()).unwrap_or("");
    let sort_dir = payload
        .get("sortDir")
        .and_then(|v| v.as_str())
        .map(|s| if s.eq_ignore_ascii_case("DESC") { "DESC" } else { "ASC" })
        .unwrap_or("ASC");

    let db_type = resolve_db_type(&config);
    let quote = if db_type == "mysql" { "`" } else { "\"" };
    let safe_table = table_name.replace(quote, "");

    let count_sql = format!("SELECT COUNT(*) as total FROM {0}{1}{0};", quote, safe_table);
    let count_res = execute_query(&config, &count_sql).await;
    let total_rows = count_res
        .get("rows")
        .and_then(|v| v.as_array())
        .and_then(|a| a.first())
        .and_then(|r| r.as_object())
        .and_then(|o| o.values().next())
        .and_then(|v| v.as_u64().or_else(|| v.as_str().and_then(|s| s.parse().ok())))
        .unwrap_or(0);

    let order_clause = if !sort_col.is_empty() {
        format!(" ORDER BY {0}{1}{0} {2}", quote, sort_col.replace(quote, ""), sort_dir)
    } else {
        String::new()
    };

    let data_sql = format!(
        "SELECT * FROM {0}{1}{0}{2} LIMIT {3} OFFSET {4};",
        quote, safe_table, order_clause, limit, offset
    );
    let data_res = execute_query(&config, &data_sql).await;
    let rows = data_res.get("rows").cloned().unwrap_or_else(|| json!([]));
    let columns = data_res.get("columns").cloned().unwrap_or_else(|| json!([]));
    let total_pages = ((total_rows as f64) / (limit as f64)).ceil() as u64;

    json!({
        "success": true,
        "rows": rows,
        "columns": columns,
        "totalRows": total_rows,
        "page": page,
        "limit": limit,
        "totalPages": total_pages.max(1)
    })
}

pub async fn update_table_row(payload: &Value) -> Value {
    let cfg_val = payload.get("config").cloned().unwrap_or(Value::Null);
    let config: DatabaseConfig = serde_json::from_value(cfg_val).unwrap_or_default();
    let table_name = payload.get("tableName").and_then(|v| v.as_str()).unwrap_or("");
    let pk = payload.get("primaryKey").and_then(|v| v.as_str()).unwrap_or("id");
    let col = payload.get("column").and_then(|v| v.as_str()).unwrap_or("");
    let new_val = payload.get("newValue").cloned().unwrap_or(Value::Null);
    let pk_val = payload.get("primaryKeyValue").cloned().unwrap_or(Value::Null);

    if table_name.is_empty() || col.is_empty() {
        return json!({ "success": false, "error": "Tabla o columna no especificada." });
    }

    let fmt_val = |v: &Value| -> String {
        match v {
            Value::Null => "NULL".to_string(),
            Value::Number(n) => n.to_string(),
            Value::Bool(b) => if *b { "1" } else { "0" }.to_string(),
            Value::String(s) => format!("'{}'", s.replace('\'', "''")),
            other => format!("'{}'", other.to_string().replace('\'', "''")),
        }
    };

    let db_type = resolve_db_type(&config);
    let quote = if db_type == "mysql" { "`" } else { "\"" };
    let sql = format!(
        "UPDATE {0}{1}{0} SET {0}{2}{0} = {3} WHERE {0}{4}{0} = {5};",
        quote,
        table_name.replace(quote, ""),
        col.replace(quote, ""),
        fmt_val(&new_val),
        pk.replace(quote, ""),
        fmt_val(&pk_val)
    );

    let res = execute_query(&config, &sql).await;
    if res.get("success").and_then(|v| v.as_bool()).unwrap_or(false) {
        json!({ "success": true, "message": "Fila actualizada correctamente." })
    } else {
        res
    }
}

pub async fn get_er_diagram(config: &DatabaseConfig) -> Value {
    let schema_res = get_schema(config).await;
    if !schema_res.get("success").and_then(|v| v.as_bool()).unwrap_or(false) {
        return schema_res;
    }

    let mut entities = Vec::new();
    let mut relationships = Vec::new();

    if let Some(tables) = schema_res.get("tables").and_then(|v| v.as_object()) {
        for (table_name, rows_val) in tables {
            let rows = rows_val.as_array().cloned().unwrap_or_default();
            let mut cols_list = Vec::new();

            if let Some(first_row) = rows.first().and_then(|v| v.as_object()) {
                for (col_name, val) in first_row {
                    let col_type = if val.is_i64() {
                        "INTEGER"
                    } else if val.is_f64() {
                        "FLOAT"
                    } else if val.is_boolean() {
                        "BOOLEAN"
                    } else {
                        "VARCHAR"
                    };
                    let is_pk = col_name.eq_ignore_ascii_case("id")
                        || col_name == &format!("{}_id", table_name);
                    let is_fk = col_name.ends_with("_id") && !col_name.eq_ignore_ascii_case("id");

                    if is_fk {
                        let target_table = format!("{}s", col_name.trim_end_matches("_id"));
                        relationships.push(json!({
                            "fromTable": table_name,
                            "fromColumn": col_name,
                            "toTable": target_table,
                            "toColumn": "id"
                        }));
                    }

                    cols_list.push(json!({
                        "name": col_name,
                        "type": col_type,
                        "isPk": is_pk,
                        "isFk": is_fk
                    }));
                }
            } else {
                cols_list.push(json!({
                    "name": "id",
                    "type": "INTEGER",
                    "isPk": true,
                    "isFk": false
                }));
            }

            entities.push(json!({
                "name": table_name,
                "columns": cols_list,
                "rowCount": rows.len()
            }));
        }
    }

    json!({
        "success": true,
        "entities": entities,
        "relationships": relationships
    })
}

pub async fn import_sql_dump(config: &DatabaseConfig, file_path: &str) -> Value {
    let p = Path::new(file_path);
    if !p.exists() {
        return json!({ "success": false, "error": "El archivo SQL no existe." });
    }
    let content = match fs::read_to_string(p) {
        Ok(c) => c,
        Err(e) => return json!({ "success": false, "error": e.to_string() }),
    };
    let mut executed = 0usize;
    for stmt in content.split(';') {
        let trimmed = stmt.trim();
        if !trimmed.is_empty() && !trimmed.starts_with("--") && !trimmed.starts_with("/*") {
            let _ = execute_query(config, trimmed).await;
            executed += 1;
        }
    }
    json!({
        "success": true,
        "message": format!("Se ejecutaron {} sentencias SQL correctamente.", executed)
    })
}

pub async fn export_sql_dump(config: &DatabaseConfig, destination_path: &str) -> Value {
    let schema_res = get_schema(config).await;
    if !schema_res.get("success").and_then(|v| v.as_bool()).unwrap_or(false) {
        return schema_res;
    }

    let db_name = config
        .name
        .as_deref()
        .or(config.database.as_deref())
        .unwrap_or("Database");
    let mut dump = format!(
        "-- Lummo Studio Database Export ({})\n-- Timestamp: {}\n\n",
        db_name,
        chrono::Utc::now().to_rfc3339()
    );

    if let Some(tables) = schema_res.get("tables").and_then(|v| v.as_object()) {
        for (table_name, rows_val) in tables {
            let rows = rows_val.as_array().cloned().unwrap_or_default();
            if let Some(first) = rows.first().and_then(|v| v.as_object()) {
                let cols: Vec<String> = first.keys().cloned().collect();
                let defs: Vec<String> = cols.iter().map(|c| format!("  \"{}\" TEXT", c)).collect();
                dump.push_str(&format!(
                    "CREATE TABLE IF NOT EXISTS \"{}\" (\n{}\n);\n\n",
                    table_name,
                    defs.join(",\n")
                ));
                for r in &rows {
                    if let Some(obj) = r.as_object() {
                        let vals: Vec<String> = cols
                            .iter()
                            .map(|c| match obj.get(c) {
                                None | Some(Value::Null) => "NULL".to_string(),
                                Some(Value::Number(n)) => n.to_string(),
                                Some(Value::String(s)) => format!("'{}'", s.replace('\'', "''")),
                                Some(other) => format!("'{}'", other.to_string().replace('\'', "''")),
                            })
                            .collect();
                        let quoted_cols: Vec<String> = cols.iter().map(|c| format!("\"{}\"", c)).collect();
                        dump.push_str(&format!(
                            "INSERT INTO \"{}\" ({}) VALUES ({});\n",
                            table_name,
                            quoted_cols.join(", "),
                            vals.join(", ")
                        ));
                    }
                }
            } else {
                dump.push_str(&format!(
                    "CREATE TABLE IF NOT EXISTS \"{}\" (\n  \"id\" INTEGER PRIMARY KEY\n);\n\n",
                    table_name
                ));
            }
        }
    }

    let dest = Path::new(destination_path);
    if let Some(parent) = dest.parent() {
        let _ = fs::create_dir_all(parent);
    }
    match fs::write(dest, dump) {
        Ok(_) => json!({
            "success": true,
            "filePath": destination_path,
            "message": format!("Dump exportado exitosamente a \"{}\".", destination_path)
        }),
        Err(e) => json!({ "success": false, "error": e.to_string() }),
    }
}

pub async fn create_snapshot(config: &DatabaseConfig, target_folder: Option<String>) -> Value {
    let ts = chrono::Utc::now().format("%Y-%m-%dT%H-%M-%S").to_string();
    let raw_name = config
        .name
        .as_deref()
        .or(config.database.as_deref())
        .unwrap_or("snapshot");
    let clean_name: String = raw_name
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '_' || c == '-' { c } else { '_' })
        .collect();

    let base_dir = target_folder
        .map(PathBuf::from)
        .filter(|p| p.exists())
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_default())
        .join(".lummo_backups");

    let file_name = format!("snapshot_{}_{}.sql", clean_name, ts);
    let dest = base_dir.join(&file_name);
    let res = export_sql_dump(config, &dest.to_string_lossy()).await;
    if res.get("success").and_then(|v| v.as_bool()).unwrap_or(false) {
        json!({
            "success": true,
            "fileName": file_name,
            "filePath": dest.to_string_lossy(),
            "timestamp": chrono::Utc::now().to_rfc3339(),
            "message": format!("Snapshot \"{}\" guardado exitosamente.", file_name)
        })
    } else {
        res
    }
}

// Redis Native Operations
pub async fn redis_get_keys(config: &DatabaseConfig, pattern: Option<String>) -> Value {
    let pat = pattern.unwrap_or_else(|| "*".to_string());
    let client = match redis::Client::open(build_redis_url(config)) {
        Ok(c) => c,
        Err(e) => return json!({ "success": false, "error": e.to_string() }),
    };
    let mut conn = match client.get_multiplexed_async_connection().await {
        Ok(c) => c,
        Err(e) => return json!({ "success": false, "error": e.to_string() }),
    };

    let keys: Vec<String> = match conn.keys(&pat).await {
        Ok(k) => k,
        Err(e) => return json!({ "success": false, "error": e.to_string() }),
    };

    let total = keys.len();
    let mut details = Vec::new();
    for key in keys.into_iter().take(100) {
        let ktype: String = redis::cmd("TYPE")
            .arg(&key)
            .query_async(&mut conn)
            .await
            .unwrap_or_else(|_| "string".to_string());
        let ttl: i64 = redis::cmd("TTL").arg(&key).query_async(&mut conn).await.unwrap_or(-1);
        details.push(json!({ "key": key, "type": ktype, "ttl": ttl }));
    }

    json!({ "success": true, "keys": details, "count": total })
}

pub async fn redis_get_value(config: &DatabaseConfig, key: &str) -> Value {
    let client = match redis::Client::open(build_redis_url(config)) {
        Ok(c) => c,
        Err(e) => return json!({ "success": false, "error": e.to_string() }),
    };
    let mut conn = match client.get_multiplexed_async_connection().await {
        Ok(c) => c,
        Err(e) => return json!({ "success": false, "error": e.to_string() }),
    };

    let ktype: String = redis::cmd("TYPE")
        .arg(key)
        .query_async(&mut conn)
        .await
        .unwrap_or_else(|_| "string".to_string());
    let ttl: i64 = redis::cmd("TTL").arg(key).query_async(&mut conn).await.unwrap_or(-1);

    let val: Value = match ktype.as_str() {
        "string" => {
            let s: Option<String> = conn.get(key).await.ok();
            json!(s)
        }
        "hash" => {
            let m: HashMap<String, String> = conn.hgetall(key).await.unwrap_or_default();
            json!(m)
        }
        "list" => {
            let l: Vec<String> = conn.lrange(key, 0, 100).await.unwrap_or_default();
            json!(l)
        }
        "set" => {
            let s: Vec<String> = conn.smembers(key).await.unwrap_or_default();
            json!(s)
        }
        _ => Value::Null,
    };

    json!({
        "success": true,
        "key": key,
        "type": ktype,
        "ttl": ttl,
        "value": val
    })
}

pub async fn redis_set_value(config: &DatabaseConfig, payload: &Value) -> Value {
    let key = payload.get("key").and_then(|v| v.as_str()).unwrap_or("");
    if key.is_empty() {
        return json!({ "success": false, "error": "Clave vacía" });
    }
    let val_str = match payload.get("value") {
        Some(Value::String(s)) => s.clone(),
        Some(other) => other.to_string(),
        None => String::new(),
    };
    let ttl = payload.get("ttl").and_then(|v| v.as_i64()).unwrap_or(-1);

    let client = match redis::Client::open(build_redis_url(config)) {
        Ok(c) => c,
        Err(e) => return json!({ "success": false, "error": e.to_string() }),
    };
    let mut conn = match client.get_multiplexed_async_connection().await {
        Ok(c) => c,
        Err(e) => return json!({ "success": false, "error": e.to_string() }),
    };

    let _: Result<(), _> = conn.set(key, val_str).await;
    if ttl > 0 {
        let _: Result<(), _> = conn.expire(key, ttl).await;
    }

    json!({ "success": true, "message": format!("Clave \"{}\" guardada en Redis.", key) })
}

pub async fn redis_delete_key(config: &DatabaseConfig, key: &str) -> Value {
    let client = match redis::Client::open(build_redis_url(config)) {
        Ok(c) => c,
        Err(e) => return json!({ "success": false, "error": e.to_string() }),
    };
    let mut conn = match client.get_multiplexed_async_connection().await {
        Ok(c) => c,
        Err(e) => return json!({ "success": false, "error": e.to_string() }),
    };
    let _: Result<(), _> = conn.del(key).await;
    json!({ "success": true, "message": format!("Clave \"{}\" eliminada.", key) })
}

pub async fn redis_flush(config: &DatabaseConfig) -> Value {
    let client = match redis::Client::open(build_redis_url(config)) {
        Ok(c) => c,
        Err(e) => return json!({ "success": false, "error": e.to_string() }),
    };
    let mut conn = match client.get_multiplexed_async_connection().await {
        Ok(c) => c,
        Err(e) => return json!({ "success": false, "error": e.to_string() }),
    };
    let _: Result<(), _> = redis::cmd("FLUSHDB").query_async(&mut conn).await;
    json!({ "success": true, "message": "Base de datos Redis vaciada (FLUSHDB completado)." })
}
