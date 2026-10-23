pub mod db_manager;
pub mod integrations;
pub mod network_manager;
pub mod process_manager;
pub mod scanner;

use db_manager::DatabaseConfig;
use network_manager::NetworkStore;
use process_manager::{ProcessStore, ProjectInput, ScaffoldOptions};
use serde_json::{json, Value};
use std::fs;
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::Arc;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, State, WebviewUrl, WebviewWindowBuilder,
};

fn get_app_data_file(app: &AppHandle, file_name: &str) -> (Option<PathBuf>, PathBuf) {
    let user_data = app.path().app_data_dir().ok().map(|d| d.join(file_name));
    let cwd = std::env::current_dir().unwrap_or_default();
    let base_local = if cwd.file_name().and_then(|s| s.to_str()) == Some("src-tauri") {
        cwd.parent().map(|p| p.to_path_buf()).unwrap_or(cwd)
    } else {
        cwd
    };
    let local_path = base_local.join(file_name);
    (user_data, local_path)
}

#[tauri::command]
async fn select_folder(app: AppHandle) -> Option<String> {
    use tauri_plugin_dialog::DialogExt;
    let folder = app.dialog().file().blocking_pick_folder();
    folder.map(|f| f.to_string())
}

#[tauri::command]
async fn scan_environment() -> scanner::SystemEnvironmentResult {
    tauri::async_runtime::spawn_blocking(scanner::scan_system_environment)
        .await
        .unwrap_or_else(|_| scanner::scan_system_environment())
}

#[tauri::command]
async fn detect_project(folder_path: String) -> scanner::DetectedProject {
    scanner::detect_project_type(&folder_path)
}

#[tauri::command]
async fn detect_editors() -> Vec<scanner::EditorCatalogEntry> {
    tauri::async_runtime::spawn_blocking(scanner::detect_installed_editors)
        .await
        .unwrap_or_default()
}

#[tauri::command]
async fn open_in_browser(url: String) {
    if !url.is_empty() {
        let _ = Command::new("cmd").args(["/C", "start", "", &url]).spawn();
    }
}

#[tauri::command]
async fn open_in_editor(folder_path: String, editor_cmd: Option<String>) {
    let cmd = editor_cmd.unwrap_or_else(|| "code".to_string());
    if cmd == "explorer" {
        let _ = Command::new("explorer").arg(&folder_path).spawn();
    } else {
        let _ = Command::new("cmd")
            .args(["/C", &cmd, &folder_path])
            .spawn();
    }
}

#[tauri::command]
async fn check_port(port: u16) -> bool {
    process_manager::check_port_free(port)
}

#[tauri::command]
async fn find_free_port(start_port: Option<u16>) -> u16 {
    process_manager::find_next_free_port(start_port.unwrap_or(3000))
}

#[tauri::command]
async fn identify_port_process(port: u16) -> process_manager::PortProcessInfo {
    process_manager::identify_port_process(port)
}

#[tauri::command]
async fn kill_port_process(port: u16) -> Value {
    let info = process_manager::identify_port_process(port);
    if !info.busy {
        return json!({ "success": true, "port": port });
    }
    if let Some(pid) = info.pid {
        match process_manager::kill_process_tree(pid) {
            Ok(_) => json!({ "success": true, "pid": pid, "port": port }),
            Err(e) => json!({ "success": false, "error": e }),
        }
    } else {
        json!({ "success": false, "error": "PID no encontrado" })
    }
}

#[tauri::command]
async fn get_process_metrics(
    store: State<'_, Arc<ProcessStore>>,
    payload: Value,
) -> Result<process_manager::ProcessMetricsResult, String> {
    let mut target_pid = payload.get("pid").and_then(|v| v.as_u64()).map(|n| n as u32);
    if target_pid.is_none() {
        if let Some(proj_id) = payload.get("projectId").and_then(|v| v.as_str()) {
            if let Ok(map) = store.running.lock() {
                if let Some(entry) = map.get(proj_id) {
                    if let process_manager::RunningKind::Process { pid, .. } = entry.kind {
                        target_pid = Some(pid);
                    }
                }
            }
        }
    }
    if let Some(pid) = target_pid {
        Ok(process_manager::get_metrics_for_pid(pid))
    } else {
        Ok(process_manager::ProcessMetricsResult {
            success: false,
            cpu: 0.0,
            memory_mb: 0.0,
            elapsed: 0,
            error: Some("Sin PID activo".to_string()),
        })
    }
}

#[tauri::command]
async fn start_project(
    app: AppHandle,
    store: State<'_, Arc<ProcessStore>>,
    project: ProjectInput,
) -> Result<Value, String> {
    match process_manager::start_project_process(app.clone(), Arc::clone(&store), project) {
        Ok(_) => {
            refresh_tray_menu(&app, &store);
            Ok(json!({ "success": true }))
        }
        Err(e) => Ok(json!({ "success": false, "error": e })),
    }
}

#[tauri::command]
async fn stop_project(
    app: AppHandle,
    store: State<'_, Arc<ProcessStore>>,
    id: String,
) -> Result<Value, String> {
    process_manager::stop_project_process(&app, &store, &id);
    refresh_tray_menu(&app, &store);
    Ok(json!({ "success": true }))
}

#[tauri::command]
async fn scaffold_project(app: AppHandle, options: ScaffoldOptions) -> Value {
    tauri::async_runtime::spawn_blocking(move || process_manager::scaffold_new_project(&app, options))
        .await
        .unwrap_or_else(|e| json!({ "success": false, "error": e.to_string() }))
}

#[tauri::command]
async fn install_dependencies(
    app: AppHandle,
    store: State<'_, Arc<ProcessStore>>,
    project_id: String,
    folder_path: String,
    manager: Option<String>,
) -> Result<Value, String> {
    let p = Path::new(&folder_path);
    let mgr = manager.unwrap_or_else(|| {
        if p.join("pnpm-lock.yaml").exists() {
            "pnpm".to_string()
        } else if p.join("yarn.lock").exists() {
            "yarn".to_string()
        } else if p.join("bun.lockb").exists() || p.join("bun.lock").exists() {
            "bun".to_string()
        } else if p.join("composer.json").exists() {
            "composer".to_string()
        } else if p.join("requirements.txt").exists() {
            "pip".to_string()
        } else {
            "npm".to_string()
        }
    });

    let cmd_str = match mgr.as_str() {
        "pnpm" => "pnpm install",
        "yarn" => "yarn install",
        "bun" => "bun install",
        "composer" => "composer install",
        "pip" => "pip install -r requirements.txt",
        _ => "npm install",
    }
    .to_string();

    let st = Arc::clone(&store);
    let res = tauri::async_runtime::spawn_blocking(move || {
        process_manager::run_streaming_command(&app, &st, &project_id, &folder_path, &cmd_str, "Dependencias")
    })
    .await
    .unwrap_or_else(|e| json!({ "success": false, "error": e.to_string() }));
    Ok(res)
}

#[tauri::command]
async fn run_project_script(
    app: AppHandle,
    store: State<'_, Arc<ProcessStore>>,
    project_id: String,
    folder_path: String,
    script_command: String,
) -> Result<Value, String> {
    let st = Arc::clone(&store);
    let res = tauri::async_runtime::spawn_blocking(move || {
        process_manager::run_streaming_command(
            &app,
            &st,
            &project_id,
            &folder_path,
            &script_command,
            "Lummo Script",
        )
    })
    .await
    .unwrap_or_else(|e| json!({ "success": false, "error": e.to_string() }));
    Ok(res)
}

#[tauri::command]
async fn clone_repository(
    app: AppHandle,
    store: State<'_, Arc<ProcessStore>>,
    repo_url: String,
    destination_parent_folder: String,
) -> Result<Value, String> {
    let clean_url = repo_url.trim().to_string();
    if clean_url.is_empty() || clean_url.starts_with('-') {
        return Ok(json!({ "success": false, "error": "URL de repositorio no válida." }));
    }
    let mut repo_name = Path::new(&clean_url)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("cloned-repo")
        .to_string();
    repo_name = repo_name
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '_' || c == '-' || c == '.' { c } else { '_' })
        .collect();

    let target_folder = Path::new(&destination_parent_folder).join(&repo_name);
    let target_str = target_folder.to_string_lossy().to_string();
    let st = Arc::clone(&store);

    let res = tauri::async_runtime::spawn_blocking(move || {
        let _ = app.emit(
            "clone-progress",
            json!({
                "percentage": 15,
                "statusText": "Clonando repositorio remoto...",
                "targetFolder": target_str,
                "repoName": repo_name
            }),
        );

        #[cfg(target_os = "windows")]
        use std::os::windows::process::CommandExt;
        #[cfg(target_os = "windows")]
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let mut cmd = Command::new("git");
        cmd.args(["clone", "--progress", "--", &clean_url, &target_str])
            .current_dir(&destination_parent_folder)
            .stderr(Stdio::piped());
        #[cfg(target_os = "windows")]
        cmd.creation_flags(CREATE_NO_WINDOW);

        match cmd.spawn() {
            Ok(mut child) => {
                if let Ok(mut pid_guard) = st.active_clone_pid.lock() {
                    *pid_guard = Some(child.id());
                }
                if let Some(err) = child.stderr.take() {
                    for line in BufReader::new(err).lines().map_while(Result::ok) {
                        let _ = app.emit(
                            "clone-progress",
                            json!({
                                "percentage": 60,
                                "statusText": line,
                                "targetFolder": target_str,
                                "repoName": repo_name
                            }),
                        );
                    }
                }
                let code = child.wait().ok().and_then(|s| s.code()).unwrap_or(1);
                if let Ok(mut pid_guard) = st.active_clone_pid.lock() {
                    *pid_guard = None;
                }
                if code == 0 {
                    let _ = app.emit(
                        "clone-progress",
                        json!({
                            "percentage": 100,
                            "statusText": "¡Repositorio descargado con éxito!",
                            "targetFolder": target_str,
                            "repoName": repo_name
                        }),
                    );
                    json!({ "success": true, "targetFolder": target_str, "repoName": repo_name })
                } else {
                    json!({ "success": false, "error": "Error al clonar el repositorio." })
                }
            }
            Err(e) => json!({ "success": false, "error": e.to_string() }),
        }
    })
    .await
    .unwrap_or_else(|e| json!({ "success": false, "error": e.to_string() }));
    Ok(res)
}

#[tauri::command]
async fn cancel_clone_repository(store: State<'_, Arc<ProcessStore>>) -> Result<Value, String> {
    let pid_opt = store.active_clone_pid.lock().ok().and_then(|mut g| g.take());
    if let Some(pid) = pid_opt {
        let _ = process_manager::kill_process_tree(pid);
    }
    Ok(json!({ "success": true }))
}

#[tauri::command]
async fn get_project_logs(
    store: State<'_, Arc<ProcessStore>>,
    project_id: String,
) -> Result<Vec<String>, String> {
    let list = store
        .logs
        .lock()
        .ok()
        .and_then(|m| m.get(&project_id).cloned())
        .unwrap_or_default();
    Ok(list)
}

#[tauri::command]
async fn clear_project_logs(
    app: AppHandle,
    store: State<'_, Arc<ProcessStore>>,
    project_id: String,
) -> Result<Value, String> {
    if let Ok(mut m) = store.logs.lock() {
        m.insert(project_id.clone(), Vec::new());
    }
    let _ = app.emit("logs-cleared", json!({ "projectId": project_id }));
    Ok(json!({ "success": true }))
}

#[tauri::command]
async fn clear_all_logs(app: AppHandle, store: State<'_, Arc<ProcessStore>>) -> Result<Value, String> {
    if let Ok(mut m) = store.logs.lock() {
        m.clear();
    }
    let _ = app.emit("logs-cleared", json!({ "all": true }));
    Ok(json!({ "success": true }))
}

#[tauri::command]
async fn write_project_stdin(
    store: State<'_, Arc<ProcessStore>>,
    project_id: String,
    input: String,
) -> Result<Value, String> {
    let ok = process_manager::write_stdin(&store, &project_id, &input);
    Ok(json!({ "success": ok }))
}

#[tauri::command]
async fn get_projects_file_path(app: AppHandle) -> Value {
    let (user_data, local_path) = get_app_data_file(&app, "lummo_projects.json");
    let active = user_data
        .as_ref()
        .filter(|p| p.exists())
        .cloned()
        .unwrap_or_else(|| local_path.clone());
    json!({
        "userDataPath": user_data,
        "localPath": local_path,
        "activePath": active
    })
}

#[tauri::command]
async fn get_recent_projects(app: AppHandle) -> Value {
    let (user_data, local_path) = get_app_data_file(&app, "lummo_projects.json");
    for candidate in [user_data, Some(local_path)].into_iter().flatten() {
        if candidate.exists() {
            if let Ok(raw) = fs::read_to_string(&candidate) {
                if let Ok(parsed) = serde_json::from_str::<Value>(&raw) {
                    if parsed.as_array().map(|a| !a.is_empty()).unwrap_or(false) {
                        return parsed;
                    }
                }
            }
        }
    }
    json!([])
}

#[tauri::command]
async fn save_recent_projects(app: AppHandle, projects: Value) -> Value {
    let (user_data, local_path) = get_app_data_file(&app, "lummo_projects.json");
    let serialized = serde_json::to_string_pretty(&projects).unwrap_or_else(|_| "[]".to_string());
    let mut saved = false;
    if let Some(ref u) = user_data {
        if let Some(parent) = u.parent() {
            let _ = fs::create_dir_all(parent);
        }
        if fs::write(u, &serialized).is_ok() {
            saved = true;
        }
    }
    if fs::write(&local_path, &serialized).is_ok() {
        saved = true;
    }
    json!({ "success": saved })
}

#[tauri::command]
async fn get_custom_databases(app: AppHandle) -> Value {
    let (user_data, local_path) = get_app_data_file(&app, "lummo_databases.json");
    for candidate in [user_data, Some(local_path)].into_iter().flatten() {
        if candidate.exists() {
            if let Ok(raw) = fs::read_to_string(&candidate) {
                if let Ok(parsed) = serde_json::from_str::<Value>(&raw) {
                    if parsed.as_array().map(|a| !a.is_empty()).unwrap_or(false) {
                        return parsed;
                    }
                }
            }
        }
    }
    json!([])
}

#[tauri::command]
async fn save_custom_databases(app: AppHandle, dbs: Value) -> Value {
    let (user_data, local_path) = get_app_data_file(&app, "lummo_databases.json");
    let serialized = serde_json::to_string_pretty(&dbs).unwrap_or_else(|_| "[]".to_string());
    if let Some(ref u) = user_data {
        if let Some(parent) = u.parent() {
            let _ = fs::create_dir_all(parent);
        }
        let _ = fs::write(u, &serialized);
    }
    let _ = fs::write(&local_path, &serialized);
    json!({ "success": true })
}

#[tauri::command]
async fn read_env_file(folder_path: String) -> Value {
    let base = Path::new(&folder_path);
    let env_p = base.join(".env");
    let ex_p = base.join(".env.example");
    let (exists, content) = if env_p.exists() {
        (true, fs::read_to_string(&env_p).unwrap_or_default())
    } else {
        (false, String::new())
    };
    let (example_exists, example_content) = if ex_p.exists() {
        (true, fs::read_to_string(&ex_p).unwrap_or_default())
    } else {
        (false, String::new())
    };
    json!({
        "success": true,
        "exists": exists,
        "content": content,
        "exampleExists": example_exists,
        "exampleContent": example_content
    })
}

#[tauri::command]
async fn write_env_file(folder_path: String, content: String, file_name: Option<String>) -> Value {
    let fname = file_name.unwrap_or_else(|| ".env".to_string());
    let target = Path::new(&folder_path).join(&fname);
    match fs::write(&target, content) {
        Ok(_) => json!({ "success": true, "message": format!("Archivo {} guardado correctamente.", fname) }),
        Err(e) => json!({ "success": false, "error": e.to_string() }),
    }
}

#[tauri::command]
async fn sync_env_port(folder_path: String, port: u16) -> Value {
    let env_p = Path::new(&folder_path).join(".env");
    if env_p.exists() {
        if let Ok(raw) = fs::read_to_string(&env_p) {
            let mut updated = Vec::new();
            let mut found = false;
            for line in raw.lines() {
                if line.trim_start().starts_with("PORT=") {
                    updated.push(format!("PORT={}", port));
                    found = true;
                } else {
                    updated.push(line.to_string());
                }
            }
            if !found {
                updated.push(format!("PORT={}", port));
            }
            let _ = fs::write(&env_p, updated.join("\n") + "\n");
        }
    }
    json!({ "success": true, "updated": true })
}

// Phase 3: Complete Multi-Engine Database & Redis Commands
#[tauri::command]
async fn db_test_connection(config: DatabaseConfig) -> Value {
    db_manager::test_connection(&config).await
}

#[tauri::command]
async fn db_get_schema(config: DatabaseConfig) -> Value {
    db_manager::get_schema(&config).await
}

#[tauri::command]
async fn db_execute_query(config: DatabaseConfig, query: String) -> Value {
    db_manager::execute_query(&config, &query).await
}

#[tauri::command]
async fn db_get_table_rows(payload: Value) -> Value {
    db_manager::get_table_rows(&payload).await
}

#[tauri::command]
async fn db_update_table_row(payload: Value) -> Value {
    db_manager::update_table_row(&payload).await
}

#[tauri::command]
async fn db_get_er_diagram(config: DatabaseConfig) -> Value {
    db_manager::get_er_diagram(&config).await
}

#[tauri::command]
async fn db_import_sql(config: DatabaseConfig, file_path: String) -> Value {
    db_manager::import_sql_dump(&config, &file_path).await
}

#[tauri::command]
async fn db_export_sql(config: DatabaseConfig, destination_path: String) -> Value {
    db_manager::export_sql_dump(&config, &destination_path).await
}

#[tauri::command]
async fn db_create_snapshot(config: DatabaseConfig, target_folder: Option<String>) -> Value {
    db_manager::create_snapshot(&config, target_folder).await
}

#[tauri::command]
async fn db_export_data_file(app: AppHandle, payload: Value) -> Value {
    use tauri_plugin_dialog::DialogExt;
    let format = payload.get("format").and_then(|v| v.as_str()).unwrap_or("json");
    let table_name = payload
        .get("tableName")
        .and_then(|v| v.as_str())
        .unwrap_or("export");
    let rows = payload
        .get("rows")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    let ext = if format == "excel" { "tsv" } else { format };

    let save_path = app
        .dialog()
        .file()
        .set_file_name(format!("{}.{}", table_name, ext))
        .blocking_save_file();

    let Some(fp) = save_path else {
        return json!({ "success": false, "canceled": true });
    };
    let fp_str = fp.to_string();

    let content = if format == "json" {
        serde_json::to_string_pretty(&rows).unwrap_or_else(|_| "[]".to_string())
    } else {
        let delim = if format == "excel" { "\t" } else { "," };
        let cols: Vec<String> = rows
            .first()
            .and_then(|r| r.as_object())
            .map(|o| o.keys().cloned().collect())
            .unwrap_or_default();
        let header = cols.join(delim);
        let mut lines = vec![header];
        for r in &rows {
            if let Some(obj) = r.as_object() {
                let line: Vec<String> = cols
                    .iter()
                    .map(|c| {
                        let v = obj.get(c).unwrap_or(&Value::Null);
                        format!("\"{}\"", v.to_string().trim_matches('"').replace('"', "\"\""))
                    })
                    .collect();
                lines.push(line.join(delim));
            }
        }
        lines.join("\n")
    };

    match fs::write(&fp_str, content) {
        Ok(_) => json!({ "success": true, "filePath": fp_str }),
        Err(e) => json!({ "success": false, "error": e.to_string() }),
    }
}

#[tauri::command]
async fn db_get_default_path(name: String) -> Value {
    let cfg = DatabaseConfig {
        name: Some(name),
        r#type: Some("sqlite".to_string()),
        ..Default::default()
    };
    let p = db_manager::resolve_sqlite_path(&cfg).to_string_lossy().to_string();
    json!({ "success": true, "filePath": p })
}

#[tauri::command]
async fn db_migrate_database_file(app: AppHandle, config: DatabaseConfig) -> Value {
    use tauri_plugin_dialog::DialogExt;
    let src = db_manager::resolve_sqlite_path(&config);
    let default_name = src
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("database.sqlite");
    let Some(dest) = app.dialog().file().set_file_name(default_name).blocking_save_file() else {
        return json!({ "success": false, "canceled": true });
    };
    let dest_str = dest.to_string();
    if src.exists() {
        let _ = fs::copy(&src, &dest_str);
    } else {
        let _ = fs::write(&dest_str, b"");
    }
    json!({ "success": true, "filePath": dest_str })
}

#[tauri::command]
async fn db_redis_test(config: DatabaseConfig) -> Value {
    let mut cfg = config;
    cfg.r#type = Some("redis".to_string());
    db_manager::test_connection(&cfg).await
}

#[tauri::command]
async fn db_redis_get_keys(config: DatabaseConfig, pattern: Option<String>) -> Value {
    db_manager::redis_get_keys(&config, pattern).await
}

#[tauri::command]
async fn db_redis_get_value(config: DatabaseConfig, key: String) -> Value {
    db_manager::redis_get_value(&config, &key).await
}

#[tauri::command]
async fn db_redis_set_value(config: DatabaseConfig, payload: Value) -> Value {
    db_manager::redis_set_value(&config, &payload).await
}

#[tauri::command]
async fn db_redis_delete_key(config: DatabaseConfig, key: String) -> Value {
    db_manager::redis_delete_key(&config, &key).await
}

#[tauri::command]
async fn db_redis_flush(config: DatabaseConfig) -> Value {
    db_manager::redis_flush(&config).await
}

// Multi-window spawn commands
#[tauri::command]
async fn open_log_window(app: AppHandle, project_id: String, project_name: Option<String>) -> Value {
    let label = format!("logs-{}", project_id.replace(|c: char| !c.is_ascii_alphanumeric(), "_"));
    if let Some(win) = app.get_webview_window(&label) {
        let _ = win.set_focus();
        return json!({ "success": true });
    }
    let name = project_name.unwrap_or_else(|| "Terminal".to_string());
    let url = format!("index.html#/logs/{}?name={}", project_id, name);
    let _ = WebviewWindowBuilder::new(&app, label, WebviewUrl::App(url.into()))
        .title(format!("Logs: {}", name))
        .inner_size(800.0, 500.0)
        .decorations(false)
        .build();
    json!({ "success": true })
}

#[tauri::command]
async fn open_api_hub_window(app: AppHandle, data: Value) -> Value {
    let project_id = data.get("projectId").and_then(|v| v.as_str()).unwrap_or("default");
    let project_name = data.get("projectName").and_then(|v| v.as_str()).unwrap_or("API Hub");
    let port = data.get("port").and_then(|v| v.as_u64()).unwrap_or(3000);
    let project_path = data.get("projectPath").and_then(|v| v.as_str()).unwrap_or("");
    let label = format!("api-hub-{}", project_id.replace(|c: char| !c.is_ascii_alphanumeric(), "_"));
    if let Some(win) = app.get_webview_window(&label) {
        let _ = win.set_focus();
        return json!({ "success": true });
    }
    let url = format!(
        "index.html#/api-hub/{}?name={}&port={}&path={}",
        project_id, project_name, port, project_path
    );
    let _ = WebviewWindowBuilder::new(&app, label, WebviewUrl::App(url.into()))
        .title(format!("API & Webhook Hub: {}", project_name))
        .inner_size(1240.0, 820.0)
        .decorations(false)
        .build();
    json!({ "success": true })
}

#[tauri::command]
async fn open_git_window(app: AppHandle, data: Value) -> Value {
    let project_id = data.get("projectId").and_then(|v| v.as_str()).unwrap_or("default");
    let project_name = data.get("projectName").and_then(|v| v.as_str()).unwrap_or("Git Inspector");
    let project_path = data.get("projectPath").and_then(|v| v.as_str()).unwrap_or("");
    let label = format!("git-{}", project_id.replace(|c: char| !c.is_ascii_alphanumeric(), "_"));
    if let Some(win) = app.get_webview_window(&label) {
        let _ = win.set_focus();
        return json!({ "success": true });
    }
    let url = format!(
        "index.html#/git-inspector/{}?name={}&path={}",
        project_id, project_name, project_path
    );
    let _ = WebviewWindowBuilder::new(&app, label, WebviewUrl::App(url.into()))
        .title(format!("Git Inspector: {}", project_name))
        .inner_size(1100.0, 740.0)
        .decorations(false)
        .build();
    json!({ "success": true })
}

#[tauri::command]
async fn updater_get_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
async fn updater_check_for_updates() -> Value {
    json!({ "updateAvailable": false, "version": env!("CARGO_PKG_VERSION") })
}

#[tauri::command]
async fn updater_start_download(app: AppHandle) -> Value {
    let _ = app.emit("update-downloaded", json!({ "version": env!("CARGO_PKG_VERSION") }));
    json!({ "success": true })
}

#[tauri::command]
async fn updater_restart_and_apply(app: AppHandle) -> Value {
    app.restart();
}

#[tauri::command]
async fn updater_simulate_flow(app: AppHandle, payload: Option<Value>) -> Value {
    let ver = payload
        .as_ref()
        .and_then(|v| v.get("version"))
        .and_then(|v| v.as_str())
        .unwrap_or("3.6.0-rust");
    let _ = app.emit("update-available", json!({ "version": ver }));
    json!({ "success": true })
}

// Phase 4: Local Domains, SSL/PKI, Tunnels, Webhooks & API Client
#[tauri::command]
async fn ssl_get_status(net_store: State<'_, Arc<NetworkStore>>) -> Result<Value, String> {
    Ok(network_manager::get_ssl_status(&net_store))
}

#[tauri::command]
async fn ssl_install_ca() -> Value {
    tauri::async_runtime::spawn_blocking(network_manager::install_ca)
        .await
        .unwrap_or_else(|e| json!({ "success": false, "error": e.to_string() }))
}

#[tauri::command]
async fn ssl_uninstall_ca() -> Value {
    tauri::async_runtime::spawn_blocking(network_manager::uninstall_ca)
        .await
        .unwrap_or_else(|e| json!({ "success": false, "error": e.to_string() }))
}

#[tauri::command]
async fn ssl_generate_cert(domain: String) -> Value {
    network_manager::generate_domain_cert(&domain)
}

#[tauri::command]
async fn set_local_domain(
    net_store: State<'_, Arc<NetworkStore>>,
    domain: String,
    port: u16,
    enable_ssl: Option<bool>,
) -> Result<Value, String> {
    Ok(network_manager::set_local_domain(
        Arc::clone(&net_store),
        &domain,
        port,
        enable_ssl.unwrap_or(false),
    ))
}

#[tauri::command]
async fn get_local_domains(net_store: State<'_, Arc<NetworkStore>>) -> Result<Value, String> {
    Ok(network_manager::get_registered_domains(&net_store))
}

#[tauri::command]
async fn setup_https(
    net_store: State<'_, Arc<NetworkStore>>,
    _project_id: String,
    _folder_path: String,
    domain: Option<String>,
    port: Option<u16>,
) -> Result<Value, String> {
    let dom = domain.unwrap_or_else(|| "lummo.test".to_string());
    let p = port.unwrap_or(3000);
    let _ = network_manager::install_ca();
    let _ = network_manager::generate_domain_cert(&dom);
    Ok(network_manager::set_local_domain(
        Arc::clone(&net_store),
        &dom,
        p,
        true,
    ))
}

#[tauri::command]
async fn start_tunnel(
    app: AppHandle,
    proc_store: State<'_, Arc<ProcessStore>>,
    net_store: State<'_, Arc<NetworkStore>>,
    project_id: String,
    port: u16,
    provider: Option<String>,
) -> Result<Value, String> {
    Ok(network_manager::start_tunnel(
        app,
        Arc::clone(&proc_store),
        Arc::clone(&net_store),
        project_id,
        port,
        provider,
    ))
}

#[tauri::command]
async fn stop_tunnel(
    app: AppHandle,
    proc_store: State<'_, Arc<ProcessStore>>,
    net_store: State<'_, Arc<NetworkStore>>,
    project_id: String,
) -> Result<Value, String> {
    Ok(network_manager::stop_tunnel(
        &app,
        &proc_store,
        &net_store,
        &project_id,
    ))
}

#[tauri::command]
async fn api_send_request(request_data: Value) -> Value {
    network_manager::api_send_request(request_data).await
}

#[tauri::command]
async fn api_get_collections(app: AppHandle, folder_path: Option<String>) -> Value {
    network_manager::api_get_collections(&app, folder_path)
}

#[tauri::command]
async fn api_save_collections(
    app: AppHandle,
    folder_path: Option<String>,
    collections: Value,
) -> Value {
    network_manager::api_save_collections(&app, folder_path, collections)
}

#[tauri::command]
async fn webhook_get_events(
    net_store: State<'_, Arc<NetworkStore>>,
    project_id: String,
) -> Result<Value, String> {
    let events = net_store
        .webhook_events
        .lock()
        .ok()
        .and_then(|m| m.get(&project_id).cloned())
        .unwrap_or_default();
    Ok(json!({ "success": true, "events": events }))
}

#[tauri::command]
async fn webhook_clear_events(
    net_store: State<'_, Arc<NetworkStore>>,
    project_id: String,
) -> Result<Value, String> {
    if let Ok(mut m) = net_store.webhook_events.lock() {
        m.insert(project_id, Vec::new());
    }
    Ok(json!({ "success": true }))
}

#[tauri::command]
async fn webhook_replay_event(
    app: AppHandle,
    net_store: State<'_, Arc<NetworkStore>>,
    project_id: String,
    event_data: Value,
    target_port: u16,
) -> Result<Value, String> {
    Ok(
        network_manager::replay_webhook_event(&app, &net_store, &project_id, event_data, target_port)
            .await,
    )
}

#[tauri::command]
async fn webhook_get_mock_templates() -> Value {
    network_manager::get_webhook_mock_templates()
}

#[tauri::command]
async fn webhook_send_mock(
    app: AppHandle,
    net_store: State<'_, Arc<NetworkStore>>,
    payload: Value,
) -> Result<Value, String> {
    let project_id = payload
        .get("projectId")
        .and_then(|v| v.as_str())
        .unwrap_or("default")
        .to_string();
    let target_port = payload
        .get("targetPort")
        .and_then(|v| v.as_u64())
        .unwrap_or(3000) as u16;
    let endpoint = payload
        .get("endpoint")
        .and_then(|v| v.as_str())
        .unwrap_or("/api/webhooks");
    let body = payload.get("body").cloned().unwrap_or_else(|| json!({}));
    let event_data = json!({
        "method": "POST",
        "url": endpoint,
        "body": body
    });
    Ok(
        network_manager::replay_webhook_event(&app, &net_store, &project_id, event_data, target_port)
            .await,
    )
}

// Phase 5: Docker, Git Inspector, Multi-Provider AI & Unattended Tech Installer
#[tauri::command]
async fn docker_check_available() -> Value {
    tauri::async_runtime::spawn_blocking(integrations::docker_check_available)
        .await
        .unwrap_or_else(|_| json!({ "installed": false }))
}

#[tauri::command]
async fn docker_detect_files(folder_path: String) -> Value {
    integrations::docker_detect_files(&folder_path)
}

#[tauri::command]
async fn docker_get_status(folder_path: String) -> Value {
    tauri::async_runtime::spawn_blocking(move || integrations::docker_get_status(&folder_path))
        .await
        .unwrap_or_else(|e| json!({ "success": false, "error": e.to_string(), "services": [] }))
}

#[tauri::command]
async fn docker_run_action(
    folder_path: String,
    action: String,
    service_name: Option<String>,
) -> Value {
    tauri::async_runtime::spawn_blocking(move || {
        integrations::docker_run_action(&folder_path, &action, service_name)
    })
    .await
    .unwrap_or_else(|e| json!({ "success": false, "error": e.to_string() }))
}

#[tauri::command]
async fn docker_get_logs(
    folder_path: String,
    service_name: Option<String>,
    tail: Option<u32>,
) -> Value {
    tauri::async_runtime::spawn_blocking(move || {
        integrations::docker_get_logs(&folder_path, service_name, tail)
    })
    .await
    .unwrap_or_else(|e| json!({ "success": false, "error": e.to_string(), "logs": [] }))
}

#[tauri::command]
async fn docker_generate_compose(
    folder_path: String,
    selected_services: Vec<String>,
    custom_config: Option<Value>,
) -> Value {
    integrations::docker_generate_compose(&folder_path, selected_services, custom_config)
}

#[tauri::command]
async fn git_get_status(folder_path: String) -> Value {
    tauri::async_runtime::spawn_blocking(move || integrations::git_get_status(&folder_path))
        .await
        .unwrap_or_else(|_| json!({ "hasGit": false }))
}

#[tauri::command]
async fn git_get_history(folder_path: String, limit: Option<u32>, skip: Option<u32>, branch_filter: Option<String>) -> Value {
    tauri::async_runtime::spawn_blocking(move || {
        integrations::git_get_history(&folder_path, limit, skip, branch_filter.as_deref())
    })
    .await
    .unwrap_or_else(|_| json!({ "commits": [], "totalCount": 0 }))
}

#[tauri::command]
async fn git_get_branches(folder_path: String) -> Value {
    tauri::async_runtime::spawn_blocking(move || integrations::git_get_branches(&folder_path))
        .await
        .unwrap_or_else(|_| json!({ "branches": [] }))
}

#[tauri::command]
async fn git_checkout_branch(folder_path: String, branch_name: String) -> Value {
    tauri::async_runtime::spawn_blocking(move || {
        integrations::git_checkout_branch(&folder_path, &branch_name)
    })
    .await
    .unwrap_or_else(|e| json!({ "success": false, "error": e.to_string() }))
}

#[tauri::command]
async fn git_checkout(folder_path: String, ref_name: String) -> Value {
    tauri::async_runtime::spawn_blocking(move || {
        integrations::git_checkout(&folder_path, &ref_name)
    })
    .await
    .unwrap_or_else(|e| json!({ "success": false, "error": e.to_string() }))
}

#[tauri::command]
async fn git_stage_file(folder_path: String, file_path: String) -> Value {
    tauri::async_runtime::spawn_blocking(move || integrations::git_stage_file(&folder_path, &file_path))
        .await
        .unwrap_or_else(|e| json!({ "success": false, "error": e.to_string() }))
}

#[tauri::command]
async fn git_unstage_file(folder_path: String, file_path: String) -> Value {
    tauri::async_runtime::spawn_blocking(move || integrations::git_unstage_file(&folder_path, &file_path))
        .await
        .unwrap_or_else(|e| json!({ "success": false, "error": e.to_string() }))
}

#[tauri::command]
async fn git_stage_all(folder_path: String) -> Value {
    tauri::async_runtime::spawn_blocking(move || integrations::git_stage_all(&folder_path))
        .await
        .unwrap_or_else(|e| json!({ "success": false, "error": e.to_string() }))
}

#[tauri::command]
async fn git_unstage_all(folder_path: String) -> Value {
    tauri::async_runtime::spawn_blocking(move || integrations::git_unstage_all(&folder_path))
        .await
        .unwrap_or_else(|e| json!({ "success": false, "error": e.to_string() }))
}

#[tauri::command]
async fn git_discard_file(folder_path: String, file_path: String, is_untracked: Option<bool>) -> Value {
    tauri::async_runtime::spawn_blocking(move || {
        integrations::git_discard_file(&folder_path, &file_path, is_untracked.unwrap_or(false))
    })
    .await
    .unwrap_or_else(|e| json!({ "success": false, "error": e.to_string() }))
}

#[tauri::command]
async fn git_discard_all(folder_path: String) -> Value {
    tauri::async_runtime::spawn_blocking(move || integrations::git_discard_all(&folder_path))
        .await
        .unwrap_or_else(|e| json!({ "success": false, "error": e.to_string() }))
}

#[tauri::command]
async fn git_get_diff(folder_path: String, file_path: String, staged: Option<bool>) -> Value {
    tauri::async_runtime::spawn_blocking(move || {
        integrations::git_get_diff(&folder_path, &file_path, staged.unwrap_or(false))
    })
    .await
    .unwrap_or_else(|e| json!({ "diff": "", "error": e.to_string() }))
}

#[tauri::command]
async fn git_commit(folder_path: String, message: String, body: Option<String>) -> Value {
    tauri::async_runtime::spawn_blocking(move || {
        integrations::git_commit(&folder_path, &message, body.as_deref())
    })
    .await
    .unwrap_or_else(|e| json!({ "success": false, "error": e.to_string() }))
}

#[tauri::command]
async fn git_create_branch(folder_path: String, branch_name: String, start_point: Option<String>) -> Value {
    tauri::async_runtime::spawn_blocking(move || {
        integrations::git_create_branch(&folder_path, &branch_name, start_point.as_deref())
    })
    .await
    .unwrap_or_else(|e| json!({ "success": false, "error": e.to_string() }))
}

#[tauri::command]
async fn git_revert_commit(folder_path: String, hash: String) -> Value {
    tauri::async_runtime::spawn_blocking(move || integrations::git_revert_commit(&folder_path, &hash))
        .await
        .unwrap_or_else(|e| json!({ "success": false, "error": e.to_string() }))
}

#[tauri::command]
async fn git_push(folder_path: String) -> Value {
    tauri::async_runtime::spawn_blocking(move || integrations::git_push(&folder_path))
        .await
        .unwrap_or_else(|e| json!({ "success": false, "error": e.to_string() }))
}

#[tauri::command]
async fn git_pull(folder_path: String) -> Value {
    tauri::async_runtime::spawn_blocking(move || integrations::git_pull(&folder_path))
        .await
        .unwrap_or_else(|e| json!({ "success": false, "error": e.to_string() }))
}

#[tauri::command]
async fn ai_test_connection(options: Value) -> Value {
    integrations::ai_test_connection(options).await
}

#[tauri::command]
async fn ai_chat_completion(payload: Value) -> Value {
    integrations::ai_chat_completion(payload).await
}

#[tauri::command]
async fn system_install_tech(app: AppHandle, tech_keys: Vec<String>) -> Value {
    tauri::async_runtime::spawn_blocking(move || integrations::system_install_tech(&app, tech_keys))
        .await
        .unwrap_or_else(|e| json!({ "success": false, "error": e.to_string() }))
}

#[tauri::command]
async fn window_minimize(window: tauri::Window) {
    let _ = window.minimize();
}

#[tauri::command]
async fn window_maximize(window: tauri::Window) {
    if window.is_maximized().unwrap_or(false) {
        let _ = window.unmaximize();
    } else {
        let _ = window.maximize();
    }
}

#[tauri::command]
async fn window_close(window: tauri::Window) {
    let _ = window.hide();
}

#[tauri::command]
async fn relaunch_app(app: AppHandle) -> Value {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.eval("window.location.reload()");
    }
    json!({ "success": true })
}

#[tauri::command]
async fn send_notification(app: AppHandle, title: String, body: String) {
    use tauri_plugin_notification::NotificationExt;
    let _ = app.notification().builder().title(title).body(body).show();
}

fn build_dynamic_tray_menu(
    app: &AppHandle,
    store: &ProcessStore,
) -> tauri::Result<(Menu<tauri::Wry>, String)> {
    let mut active_items: Vec<(String, String, u16)> = Vec::new();
    if let Ok(running_map) = store.running.lock() {
        for (id, entry) in running_map.iter() {
            active_items.push((id.clone(), entry.name.clone(), entry.port));
        }
    }
    let count = active_items.len();
    let status_text = if count > 0 {
        format!("🟢 {} servidor(es) en ejecución", count)
    } else {
        "⚪ 0 servidores activos".to_string()
    };
    let tooltip = if count > 0 {
        format!("Lummo Studio — {} servidor(es) activos", count)
    } else {
        "Lummo Studio (Rust Engine)".to_string()
    };

    let menu = Menu::new(app)?;
    let status_item = MenuItem::with_id(app, "status_label", &status_text, false, None::<&str>)?;
    let _ = menu.append(&status_item);

    for (proj_id, name, port) in &active_items {
        let item_id = format!("stop_proj_{}", proj_id);
        let label = format!("⏹ Detener {} (:{})", name, port);
        if let Ok(item) = MenuItem::with_id(app, &item_id, &label, true, None::<&str>) {
            let _ = menu.append(&item);
        }
    }

    let show_i = MenuItem::with_id(app, "show", "Abrir Lummo Studio", true, None::<&str>)?;
    let stop_all_i = MenuItem::with_id(
        app,
        "stop_all",
        "Detener Todos los Servidores",
        count > 0,
        None::<&str>,
    )?;
    let quit_i = MenuItem::with_id(app, "quit", "Salir completamente", true, None::<&str>)?;
    let _ = menu.append(&show_i);
    let _ = menu.append(&stop_all_i);
    let _ = menu.append(&quit_i);

    Ok((menu, tooltip))
}

pub fn refresh_tray_menu(app: &AppHandle, store: &ProcessStore) {
    if let Some(tray) = app.tray_by_id("lummo-tray") {
        if let Ok((menu, tooltip)) = build_dynamic_tray_menu(app, store) {
            let _ = tray.set_menu(Some(menu));
            let _ = tray.set_tooltip(Some(&tooltip));
        }
    }
}

pub fn run() {
    // Single-Instance Guard (previene colisiones 0x800700AA de WebView2 si se abre 2 veces)
    const SINGLE_INSTANCE_PORT: u16 = 45839;
    let instance_listener = match std::net::TcpListener::bind(("127.0.0.1", SINGLE_INSTANCE_PORT)) {
        Ok(l) => Some(l),
        Err(_) => {
            if let Ok(mut stream) =
                std::net::TcpStream::connect(("127.0.0.1", SINGLE_INSTANCE_PORT))
            {
                use std::io::Write;
                let _ = stream.write_all(b"FOCUS\n");
            }
            return;
        }
    };

    let store = Arc::new(ProcessStore::default());
    let store_cleanup = Arc::clone(&store);
    let net_store = Arc::new(NetworkStore::default());
    network_manager::ensure_http_reverse_proxy(Arc::clone(&net_store));

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .manage(store)
        .manage(net_store)
        .on_window_event(|window, event| {
            if window.label() == "main" {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .setup(move |app| {
            if let Some(listener) = instance_listener {
                let app_handle = app.handle().clone();
                std::thread::spawn(move || {
                    for stream in listener.incoming().flatten() {
                        let _ = stream;
                        if let Some(w) = app_handle.get_webview_window("main") {
                            let _ = w.unminimize();
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                });
            }

            let st_ref = app.state::<Arc<ProcessStore>>();
            let (menu, tooltip) = build_dynamic_tray_menu(app.handle(), &st_ref)?;

            if let Some(icon) = app.default_window_icon() {
                let _tray = TrayIconBuilder::with_id("lummo-tray")
                    .icon(icon.clone())
                    .menu(&menu)
                    .tooltip(&tooltip)
                    .on_menu_event(|app, event| {
                        let id_str = event.id.as_ref();
                        match id_str {
                            "show" => {
                                if let Some(w) = app.get_webview_window("main") {
                                    let _ = w.unminimize();
                                    let _ = w.show();
                                    let _ = w.set_focus();
                                }
                            }
                            "stop_all" => {
                                if let Some(st) = app.try_state::<Arc<ProcessStore>>() {
                                    process_manager::stop_all_processes(&st);
                                    refresh_tray_menu(app, &st);
                                }
                            }
                            "quit" => {
                                if let Some(st) = app.try_state::<Arc<ProcessStore>>() {
                                    process_manager::stop_all_processes(&st);
                                }
                                app.exit(0);
                            }
                            other if other.starts_with("stop_proj_") => {
                                let proj_id = &other["stop_proj_".len()..];
                                if let Some(st) = app.try_state::<Arc<ProcessStore>>() {
                                    process_manager::stop_project_process(app, &st, proj_id);
                                    refresh_tray_menu(app, &st);
                                }
                            }
                            _ => {}
                        }
                    })
                    .on_tray_icon_event(|tray, event| {
                        if let TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        } = event
                        {
                            let app = tray.app_handle();
                            if let Some(w) = app.get_webview_window("main") {
                                let _ = w.unminimize();
                                let _ = w.show();
                                let _ = w.set_focus();
                            }
                        }
                    })
                    .build(app)?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            select_folder,
            scan_environment,
            detect_project,
            detect_editors,
            open_in_browser,
            open_in_editor,
            check_port,
            find_free_port,
            identify_port_process,
            kill_port_process,
            get_process_metrics,
            start_project,
            stop_project,
            scaffold_project,
            install_dependencies,
            run_project_script,
            clone_repository,
            cancel_clone_repository,
            get_project_logs,
            clear_project_logs,
            clear_all_logs,
            write_project_stdin,
            get_projects_file_path,
            get_recent_projects,
            save_recent_projects,
            get_custom_databases,
            save_custom_databases,
            read_env_file,
            write_env_file,
            sync_env_port,
            db_test_connection,
            db_get_schema,
            db_execute_query,
            db_get_table_rows,
            db_update_table_row,
            db_get_er_diagram,
            db_import_sql,
            db_export_sql,
            db_create_snapshot,
            db_export_data_file,
            db_get_default_path,
            db_migrate_database_file,
            db_redis_test,
            db_redis_get_keys,
            db_redis_get_value,
            db_redis_set_value,
            db_redis_delete_key,
            db_redis_flush,
            open_log_window,
            open_api_hub_window,
            open_git_window,
            updater_get_version,
            updater_check_for_updates,
            updater_start_download,
            updater_restart_and_apply,
            updater_simulate_flow,
            ssl_get_status,
            ssl_install_ca,
            ssl_uninstall_ca,
            ssl_generate_cert,
            set_local_domain,
            get_local_domains,
            setup_https,
            start_tunnel,
            stop_tunnel,
            api_send_request,
            api_get_collections,
            api_save_collections,
            webhook_get_events,
            webhook_clear_events,
            webhook_replay_event,
            webhook_get_mock_templates,
            webhook_send_mock,
            docker_check_available,
            docker_detect_files,
            docker_get_status,
            docker_run_action,
            docker_get_logs,
            docker_generate_compose,
            git_get_status,
            git_get_history,
            git_get_branches,
            git_checkout_branch,
            git_checkout,
            git_stage_file,
            git_unstage_file,
            git_stage_all,
            git_unstage_all,
            git_discard_file,
            git_discard_all,
            git_get_diff,
            git_commit,
            git_create_branch,
            git_revert_commit,
            git_push,
            git_pull,
            ai_test_connection,
            ai_chat_completion,
            system_install_tech,
            window_minimize,
            window_maximize,
            window_close,
            relaunch_app,
            send_notification,
        ])
        .build(tauri::generate_context!())
        .expect("Error al construir aplicación Tauri de Lummo Studio")
        .run(move |_app_handle, event| {
            if let tauri::RunEvent::Exit = event {
                process_manager::stop_all_processes(&store_cleanup);
            }
        });
}
