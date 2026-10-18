use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::io::{BufRead, BufReader, Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};
use std::thread;
use std::time::Duration;
use sysinfo::{Pid, ProcessesToUpdate, System};
use tauri::{AppHandle, Emitter};

const MAX_LOG_LINES: usize = 1000;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectInput {
    pub id: String,
    pub name: Option<String>,
    pub path: String,
    pub command: Option<String>,
    pub port: Option<u16>,
    pub tech_stack: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PortProcessInfo {
    pub busy: bool,
    pub pid: Option<u32>,
    pub process_name: Option<String>,
    pub port: u16,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessMetricsResult {
    pub success: bool,
    pub cpu: f32,
    pub memory_mb: f32,
    pub elapsed: u64,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScaffoldOptions {
    pub template: Option<String>,
    pub project_name: Option<String>,
    pub target_directory: Option<String>,
    pub package_manager: Option<String>,
}

pub enum RunningKind {
    Process {
        pid: u32,
        stdin: Option<std::process::ChildStdin>,
        #[cfg(target_os = "windows")]
        job_handle: isize,
    },
    StaticServer {
        stop_flag: Arc<AtomicBool>,
    },
}

pub struct RunningEntry {
    pub name: String,
    pub port: u16,
    pub path: String,
    pub kind: RunningKind,
}

#[derive(Default)]
pub struct ProcessStore {
    pub running: Mutex<HashMap<String, RunningEntry>>,
    pub logs: Mutex<HashMap<String, Vec<String>>>,
    pub active_clone_pid: Mutex<Option<u32>>,
}

impl ProcessStore {
    pub fn push_log(&self, app: &AppHandle, project_id: &str, message: String) {
        if let Ok(mut logs_map) = self.logs.lock() {
            let entry = logs_map.entry(project_id.to_string()).or_default();
            entry.push(message.clone());
            if entry.len() > MAX_LOG_LINES {
                let drain_count = entry.len() - MAX_LOG_LINES;
                entry.drain(0..drain_count);
            }
        }
        let _ = app.emit(
            "process-log",
            serde_json::json!({
                "projectId": project_id,
                "message": message
            }),
        );
    }

    pub fn emit_status(&self, app: &AppHandle, project_id: &str, status: &str) {
        let _ = app.emit(
            "process-status",
            serde_json::json!({
                "projectId": project_id,
                "status": status
            }),
        );
    }
}

pub fn check_port_free(port: u16) -> bool {
    TcpListener::bind(("127.0.0.1", port)).is_ok()
}

pub fn find_next_free_port(start_port: u16) -> u16 {
    let mut p = if start_port == 0 { 3000 } else { start_port };
    while p < 65535 {
        if check_port_free(p) {
            return p;
        }
        p += 1;
    }
    start_port
}

pub fn identify_port_process(port: u16) -> PortProcessInfo {
    #[cfg(target_os = "windows")]
    use std::os::windows::process::CommandExt;
    #[cfg(target_os = "windows")]
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let mut cmd = Command::new("netstat");
    cmd.args(["-ano", "-p", "tcp"]);
    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    if let Ok(out) = cmd.output() {
        let stdout = String::from_utf8_lossy(&out.stdout);
        let suffix = format!(":{}", port);
        for line in stdout.lines() {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 5 && parts[0] == "TCP" && parts[3] == "LISTENING" && parts[1].ends_with(&suffix) {
                if let Ok(pid) = parts[4].parse::<u32>() {
                    if pid > 0 {
                        let mut sys = System::new();
                        sys.refresh_processes(ProcessesToUpdate::Some(&[Pid::from_u32(pid)]), true);
                        let proc_name = sys
                            .process(Pid::from_u32(pid))
                            .map(|p| p.name().to_string_lossy().to_string())
                            .unwrap_or_else(|| "Proceso Activo".to_string());
                        return PortProcessInfo {
                            busy: true,
                            pid: Some(pid),
                            process_name: Some(proc_name),
                            port,
                            error: None,
                        };
                    }
                }
            }
        }
    }

    PortProcessInfo {
        busy: false,
        pid: None,
        process_name: None,
        port,
        error: None,
    }
}

pub fn kill_process_tree(pid: u32) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let status = Command::new("taskkill")
            .args(["/F", "/T", "/PID", &pid.to_string()])
            .creation_flags(CREATE_NO_WINDOW)
            .status()
            .map_err(|e| e.to_string())?;
        if status.success() {
            Ok(())
        } else {
            Err(format!("No se pudo finalizar el PID {}", pid))
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = Command::new("kill").args(["-9", &pid.to_string()]).status();
        Ok(())
    }
}

pub fn get_metrics_for_pid(pid: u32) -> ProcessMetricsResult {
    let mut sys = System::new();
    let target = Pid::from_u32(pid);
    sys.refresh_processes(ProcessesToUpdate::Some(&[target]), true);
    if let Some(proc_info) = sys.process(target) {
        let cpu = (proc_info.cpu_usage() * 10.0).round() / 10.0;
        let mem_mb = ((proc_info.memory() as f64 / (1024.0 * 1024.0)) * 10.0).round() as f32 / 10.0;
        let elapsed = proc_info.run_time();
        return ProcessMetricsResult {
            success: true,
            cpu,
            memory_mb: mem_mb,
            elapsed,
            error: None,
        };
    }
    ProcessMetricsResult {
        success: false,
        cpu: 0.0,
        memory_mb: 0.0,
        elapsed: 0,
        error: Some("PID no encontrado".to_string()),
    }
}

#[cfg(target_os = "windows")]
fn assign_child_to_kill_on_close_job(child: &Child) -> isize {
    use std::os::windows::io::AsRawHandle;
    use windows_sys::Win32::Foundation::CloseHandle;
    use windows_sys::Win32::System::JobObjects::{
        AssignProcessToJobObject, CreateJobObjectW, JobObjectExtendedLimitInformation,
        SetInformationJobObject, JOBOBJECT_EXTENDED_LIMIT_INFORMATION,
        JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
    };

    unsafe {
        let job = CreateJobObjectW(std::ptr::null(), std::ptr::null());
        if job.is_null() {
            return 0;
        }
        let mut info: JOBOBJECT_EXTENDED_LIMIT_INFORMATION = std::mem::zeroed();
        info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
        let ok = SetInformationJobObject(
            job,
            JobObjectExtendedLimitInformation,
            &info as *const _ as *const _,
            std::mem::size_of::<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>() as u32,
        );
        if ok == 0 {
            CloseHandle(job);
            return 0;
        }
        let proc_handle = child.as_raw_handle();
        if AssignProcessToJobObject(job, proc_handle as _) == 0 {
            CloseHandle(job);
            return 0;
        }
        job as isize
    }
}

pub fn resolve_project_command(base_cmd: &str, port: u16, tech_stack: &str) -> (bool, String) {
    let mut cmd = base_cmd.trim().to_string();
    if cmd == "lummo:static"
        || cmd == "static"
        || (tech_stack.contains("HTML/CSS") && !cmd.contains("http.server") && !cmd.contains("-S"))
    {
        return (true, "lummo:static".to_string());
    }
    if cmd.is_empty() {
        cmd = "npm run dev".to_string();
    }
    if cmd.contains("{port}") {
        return (false, cmd.replace("{port}", &port.to_string()));
    }
    if let Ok(re_port) = Regex::new(r"(?i)--port([=\s])\d+") {
        if re_port.is_match(&cmd) {
            let replaced = re_port.replace_all(&cmd, format!("--port${{1}}{}", port)).to_string();
            return (false, replaced);
        }
    }
    if let Ok(re_p) = Regex::new(r"(?i)(^|\s)-p([=\s])\d+") {
        if re_p.is_match(&cmd) {
            let replaced = re_p.replace_all(&cmd, format!("${{1}}-p${{2}}{}", port)).to_string();
            return (false, replaced);
        }
    }
    if cmd.contains("php artisan serve") {
        return (false, format!("{} --port={}", cmd, port));
    }
    if cmd.starts_with("next ") || cmd.starts_with("npx next ") {
        return (false, format!("{} -p {}", cmd, port));
    }
    if cmd.starts_with("npm run ")
        || cmd.starts_with("npm start")
        || cmd.starts_with("bun run ")
        || cmd.starts_with("bun dev")
        || cmd.starts_with("bun start")
    {
        return (false, format!("{} -- --port {}", cmd, port));
    }
    if cmd.starts_with("pnpm ")
        || cmd.starts_with("yarn ")
        || cmd.starts_with("vite")
        || cmd.starts_with("npx vite")
        || cmd.starts_with("astro")
        || cmd.starts_with("npx astro")
        || cmd.starts_with("uvicorn")
    {
        return (false, format!("{} --port {}", cmd, port));
    }
    (false, cmd)
}

fn guess_mime_type(path: &Path) -> &'static str {
    match path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase().as_str() {
        "html" | "htm" => "text/html; charset=utf-8",
        "css" => "text/css; charset=utf-8",
        "js" | "mjs" => "application/javascript; charset=utf-8",
        "json" => "application/json; charset=utf-8",
        "svg" => "image/svg+xml",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "ico" => "image/x-icon",
        "woff" => "font/woff",
        "woff2" => "font/woff2",
        "ttf" => "font/ttf",
        _ => "application/octet-stream",
    }
}

fn handle_static_http_client(mut stream: TcpStream, root_dir: &Path) {
    let mut buf = [0u8; 4096];
    let n = match stream.read(&mut buf) {
        Ok(n) if n > 0 => n,
        _ => return,
    };
    let req_str = String::from_utf8_lossy(&buf[..n]);
    let first_line = req_str.lines().next().unwrap_or("GET / HTTP/1.1");
    let raw_path = first_line.split_whitespace().nth(1).unwrap_or("/");
    let clean_rel = raw_path
        .split('?')
        .next()
        .unwrap_or("/")
        .trim_start_matches('/')
        .replace("..", "");

    let mut file_path: PathBuf = root_dir.join(&clean_rel);
    if file_path.is_dir() {
        file_path = file_path.join("index.html");
    }

    if file_path.exists() && file_path.is_file() {
        if let Ok(bytes) = fs::read(&file_path) {
            let mime = guess_mime_type(&file_path);
            let header = format!(
                "HTTP/1.1 200 OK\r\nContent-Type: {}\r\nContent-Length: {}\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\n",
                mime,
                bytes.len()
            );
            let _ = stream.write_all(header.as_bytes());
            let _ = stream.write_all(&bytes);
            return;
        }
    }

    let body = b"<h1>404 Not Found - Lummo Static Server</h1>";
    let header = format!(
        "HTTP/1.1 404 Not Found\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
        body.len()
    );
    let _ = stream.write_all(header.as_bytes());
    let _ = stream.write_all(body);
}

pub fn start_project_process(
    app: AppHandle,
    store: Arc<ProcessStore>,
    project: ProjectInput,
) -> Result<(), String> {
    if !Path::new(&project.path).exists() {
        let msg = format!(
            "[Lummo Studio Error] La carpeta del proyecto no existe: \"{}\"",
            project.path
        );
        store.push_log(&app, &project.id, msg.clone());
        store.emit_status(&app, &project.id, "ERROR");
        return Err(msg);
    }

    let port = project.port.unwrap_or(3000);
    let base_cmd = project.command.clone().unwrap_or_else(|| "npm run dev".to_string());
    let stack = project.tech_stack.clone().unwrap_or_default();
    let (is_static, final_cmd) = resolve_project_command(&base_cmd, port, &stack);

    if is_static {
        store.push_log(
            &app,
            &project.id,
            format!("[Lummo Static Server] Iniciando servidor estático nativo en puerto {}...", port),
        );
        let listener = TcpListener::bind(("127.0.0.1", port))
            .map_err(|e| format!("No se pudo abrir el puerto {}: {}", port, e))?;
        let _ = listener.set_nonblocking(true);

        let stop_flag = Arc::new(AtomicBool::new(false));
        let stop_clone = Arc::clone(&stop_flag);
        let root_path = PathBuf::from(&project.path);

        if let Ok(mut map) = store.running.lock() {
            map.insert(
                project.id.clone(),
                RunningEntry {
                    name: project.name.clone().unwrap_or_else(|| "Sitio Estático".to_string()),
                    port,
                    path: project.path.clone(),
                    kind: RunningKind::StaticServer { stop_flag },
                },
            );
        }

        store.push_log(
            &app,
            &project.id,
            format!("[Lummo Static Server] Servidor local disponible en http://localhost:{}", port),
        );
        store.emit_status(&app, &project.id, "RUNNING");

        thread::spawn(move || {
            while !stop_clone.load(Ordering::Relaxed) {
                match listener.accept() {
                    Ok((stream, _)) => {
                        let root = root_path.clone();
                        thread::spawn(move || handle_static_http_client(stream, &root));
                    }
                    Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                        thread::sleep(Duration::from_millis(25));
                    }
                    Err(_) => break,
                }
            }
        });

        return Ok(());
    }

    store.push_log(
        &app,
        &project.id,
        format!(
            "[Lummo Studio] Ejecutando: {} en {} (Puerto {})...",
            final_cmd, project.path, port
        ),
    );

    #[cfg(target_os = "windows")]
    use std::os::windows::process::CommandExt;
    #[cfg(target_os = "windows")]
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let mut command = Command::new("cmd");
    command
        .args(["/C", &final_cmd])
        .current_dir(&project.path)
        .env("PORT", port.to_string())
        .env("VITE_PORT", port.to_string())
        .env("NEXT_PUBLIC_PORT", port.to_string())
        .env("SERVER_PORT", port.to_string())
        .env("APP_PORT", port.to_string())
        .env("DEV_PORT", port.to_string())
        .env("BROWSER", "none")
        .env("FORCE_COLOR", "1")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .stdin(Stdio::piped());

    #[cfg(target_os = "windows")]
    command.creation_flags(CREATE_NO_WINDOW);

    let mut child = command.spawn().map_err(|e| e.to_string())?;
    let pid = child.id();

    #[cfg(target_os = "windows")]
    let job_handle = assign_child_to_kill_on_close_job(&child);

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();
    let stdin = child.stdin.take();

    if let Ok(mut map) = store.running.lock() {
        map.insert(
            project.id.clone(),
            RunningEntry {
                name: project.name.clone().unwrap_or_else(|| project.id.clone()),
                port,
                path: project.path.clone(),
                kind: RunningKind::Process {
                    pid,
                    stdin,
                    #[cfg(target_os = "windows")]
                    job_handle,
                },
            },
        );
    }

    store.emit_status(&app, &project.id, "RUNNING");

    if let Some(out) = stdout {
        let app_clone = app.clone();
        let store_clone = Arc::clone(&store);
        let proj_id = project.id.clone();
        thread::spawn(move || {
            let reader = BufReader::new(out);
            for line in reader.lines().map_while(Result::ok) {
                store_clone.push_log(&app_clone, &proj_id, line);
            }
        });
    }

    if let Some(err) = stderr {
        let app_clone = app.clone();
        let store_clone = Arc::clone(&store);
        let proj_id = project.id.clone();
        thread::spawn(move || {
            let reader = BufReader::new(err);
            for line in reader.lines().map_while(Result::ok) {
                store_clone.push_log(&app_clone, &proj_id, line);
            }
        });
    }

    let app_wait = app.clone();
    let store_wait = Arc::clone(&store);
    let proj_id_wait = project.id.clone();
    thread::spawn(move || {
        let code = child.wait().ok().and_then(|s| s.code()).unwrap_or(-1);
        store_wait.push_log(
            &app_wait,
            &proj_id_wait,
            format!("[Lummo Studio] El proceso terminó con código {}", code),
        );
        if let Ok(mut map) = store_wait.running.lock() {
            if let Some(entry) = map.remove(&proj_id_wait) {
                #[cfg(target_os = "windows")]
                if let RunningKind::Process { job_handle, .. } = entry.kind {
                    if job_handle != 0 {
                        unsafe {
                            windows_sys::Win32::Foundation::CloseHandle(job_handle as _);
                        }
                    }
                }
            }
        }
        store_wait.emit_status(&app_wait, &proj_id_wait, "STOPPED");
        crate::refresh_tray_menu(&app_wait, &store_wait);
    });

    Ok(())
}

pub fn stop_project_process(app: &AppHandle, store: &ProcessStore, project_id: &str) {
    let removed = store.running.lock().ok().and_then(|mut m| m.remove(project_id));
    if let Some(entry) = removed {
        match entry.kind {
            RunningKind::StaticServer { stop_flag } => {
                stop_flag.store(true, Ordering::Relaxed);
                store.push_log(app, project_id, "[Lummo] Servidor estático detenido.".to_string());
            }
            RunningKind::Process {
                pid,
                #[cfg(target_os = "windows")]
                job_handle,
                ..
            } => {
                store.push_log(
                    app,
                    project_id,
                    format!("[Lummo] Deteniendo proceso (PID {})...", pid),
                );
                #[cfg(target_os = "windows")]
                if job_handle != 0 {
                    unsafe {
                        windows_sys::Win32::Foundation::CloseHandle(job_handle as _);
                    }
                }
                let _ = kill_process_tree(pid);
            }
        }
        store.emit_status(app, project_id, "STOPPED");
    }
}

pub fn stop_all_processes(store: &ProcessStore) {
    if let Ok(mut map) = store.running.lock() {
        for (_, entry) in map.drain() {
            match entry.kind {
                RunningKind::StaticServer { stop_flag } => {
                    stop_flag.store(true, Ordering::Relaxed);
                }
                RunningKind::Process {
                    pid,
                    #[cfg(target_os = "windows")]
                    job_handle,
                    ..
                } => {
                    #[cfg(target_os = "windows")]
                    if job_handle != 0 {
                        unsafe {
                            windows_sys::Win32::Foundation::CloseHandle(job_handle as _);
                        }
                    }
                    let _ = kill_process_tree(pid);
                }
            }
        }
    }
}

pub fn write_stdin(store: &ProcessStore, project_id: &str, input: &str) -> bool {
    if let Ok(mut map) = store.running.lock() {
        if let Some(entry) = map.get_mut(project_id) {
            if let RunningKind::Process { ref mut stdin, .. } = entry.kind {
                if let Some(ref mut s) = stdin {
                    if writeln!(s, "{}", input).is_ok() {
                        return true;
                    }
                }
            }
        }
    }
    false
}

pub fn run_streaming_command(
    app: &AppHandle,
    store: &ProcessStore,
    project_id: &str,
    folder_path: &str,
    cmd_str: &str,
    prefix: &str,
) -> serde_json::Value {
    store.push_log(
        app,
        project_id,
        format!("\n[{}] === Ejecutando: \"{}\" ===", prefix, cmd_str),
    );

    #[cfg(target_os = "windows")]
    use std::os::windows::process::CommandExt;
    #[cfg(target_os = "windows")]
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let mut command = Command::new("cmd");
    command
        .args(["/C", cmd_str])
        .current_dir(folder_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    #[cfg(target_os = "windows")]
    command.creation_flags(CREATE_NO_WINDOW);

    let mut child = match command.spawn() {
        Ok(c) => c,
        Err(e) => {
            store.push_log(app, project_id, format!("[{} Error] {}", prefix, e));
            return serde_json::json!({ "success": false, "error": e.to_string() });
        }
    };

    if let Some(out) = child.stdout.take() {
        let reader = BufReader::new(out);
        for line in reader.lines().map_while(Result::ok) {
            store.push_log(app, project_id, line);
        }
    }
    if let Some(err) = child.stderr.take() {
        let reader = BufReader::new(err);
        for line in reader.lines().map_while(Result::ok) {
            store.push_log(app, project_id, line);
        }
    }

    let code = child.wait().ok().and_then(|s| s.code()).unwrap_or(1);
    if code == 0 {
        store.push_log(
            app,
            project_id,
            format!("[{}] Comando completado exitosamente.", prefix),
        );
        serde_json::json!({ "success": true, "code": 0, "message": "Completado correctamente." })
    } else {
        store.push_log(
            app,
            project_id,
            format!("[{}] Finalizó con código de salida {}.", prefix, code),
        );
        serde_json::json!({ "success": false, "code": code, "error": format!("Código de salida {}", code) })
    }
}

pub fn scaffold_new_project(app: &AppHandle, options: ScaffoldOptions) -> serde_json::Value {
    let template = options.template.unwrap_or_else(|| "vite-react".to_string());
    let raw_name = options.project_name.unwrap_or_else(|| "mi-proyecto".to_string());
    let clean_name: String = raw_name
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '_' || c == '-' { c.to_ascii_lowercase() } else { '-' })
        .collect();
    let target_dir = options
        .target_directory
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_default().to_string_lossy().to_string());
    let pkg_mgr = options.package_manager.unwrap_or_else(|| "npm".to_string());

    let project_path = Path::new(&target_dir).join(&clean_name);
    if project_path.exists() {
        if let Ok(mut entries) = fs::read_dir(&project_path) {
            if entries.next().is_some() {
                return serde_json::json!({
                    "success": false,
                    "error": format!("La carpeta \"{}\" ya existe y no está vacía.", clean_name)
                });
            }
        }
    } else if let Err(e) = fs::create_dir_all(&project_path) {
        return serde_json::json!({ "success": false, "error": e.to_string() });
    }

    let emit_scaffold = |msg: &str| {
        let _ = app.emit("scaffold-progress", serde_json::json!({ "message": msg }));
    };

    emit_scaffold(&format!(
        "[Lummo Scaffolder] Creando proyecto \"{}\" con plantilla: {}",
        clean_name, template
    ));

    match template.as_str() {
        "express-api" | "node-server" => {
            let pkg = serde_json::json!({
                "name": clean_name,
                "version": "1.0.0",
                "type": "module",
                "main": "server.js",
                "scripts": {
                    "dev": "node --watch server.js",
                    "start": "node server.js"
                },
                "dependencies": {
                    "express": "^4.21.2",
                    "cors": "^2.8.5",
                    "dotenv": "^16.4.7"
                }
            });
            let _ = fs::write(
                project_path.join("package.json"),
                serde_json::to_string_pretty(&pkg).unwrap_or_default(),
            );
            let server_js = "import express from 'express';\n\nconst app = express();\nconst PORT = process.env.PORT || 5000;\n\napp.use(express.json());\n\napp.get('/', (req, res) => {\n  res.json({ message: '¡Bienvenido a tu API con Express y Lummo Studio! 🚀', status: 'ONLINE', timestamp: new Date().toISOString() });\n});\n\napp.listen(PORT, () => {\n  console.log(`[Servidor Express] Escuchando en http://localhost:${PORT}`);\n});\n";
            let _ = fs::write(project_path.join("server.js"), server_js);
            let _ = fs::write(project_path.join(".env"), "PORT=5000\nNODE_ENV=development\n");
            let _ = fs::write(project_path.join(".env.example"), "PORT=5000\nNODE_ENV=development\n");
            let _ = fs::write(project_path.join(".gitignore"), "node_modules\n.env\n");
            emit_scaffold("[Lummo Scaffolder] Estructura Node.js Express creada.");
            return serde_json::json!({
                "success": true,
                "projectPath": project_path.to_string_lossy(),
                "cleanName": clean_name
            });
        }
        "python-fastapi" => {
            let main_py = format!(
                "from fastapi import FastAPI\nimport uvicorn\n\napp = FastAPI(title=\"{}\")\n\n@app.get(\"/\")\ndef read_root():\n    return {{\"message\": \"¡API FastAPI creada con Lummo Studio!\", \"status\": \"active\"}}\n\nif __name__ == \"__main__\":\n    uvicorn.run(\"main:app\", host=\"127.0.0.1\", port=8000, reload=True)\n",
                clean_name
            );
            let _ = fs::write(project_path.join("main.py"), main_py);
            let _ = fs::write(project_path.join("requirements.txt"), "fastapi\nuvicorn\n");
            let _ = fs::write(project_path.join(".env"), "PORT=8000\n");
            emit_scaffold("[Lummo Scaffolder] Estructura FastAPI creada.");
            return serde_json::json!({
                "success": true,
                "projectPath": project_path.to_string_lossy(),
                "cleanName": clean_name
            });
        }
        "html-static" => {
            let html = format!(
                "<!DOCTYPE html>\n<html lang=\"es\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>{} - Lummo Studio</title>\n  <link rel=\"stylesheet\" href=\"style.css\">\n</head>\n<body>\n  <div class=\"card\">\n    <h1>✨ {}</h1>\n    <p>Sitio web estático iniciado desde <strong>Lummo Studio</strong>.</p>\n  </div>\n  <script src=\"app.js\"></script>\n</body>\n</html>",
                clean_name, clean_name
            );
            let css = "body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }\n.card { background: #1e293b; padding: 2rem; border-radius: 1rem; border: 1px solid #334155; max-width: 480px; text-align: center; }";
            let _ = fs::write(project_path.join("index.html"), html);
            let _ = fs::write(project_path.join("style.css"), css);
            let _ = fs::write(project_path.join("app.js"), "console.log('Lummo Studio Static Site');");
            emit_scaffold("[Lummo Scaffolder] Sitio web estático HTML/CSS/JS creado.");
            return serde_json::json!({
                "success": true,
                "projectPath": project_path.to_string_lossy(),
                "cleanName": clean_name
            });
        }
        _ => {}
    }

    let scaffold_cmd = match template.as_str() {
        "vite-react-ts" => format!("{} create vite@latest . -- --template react-ts", pkg_mgr),
        "vite-vue" => format!("{} create vite@latest . -- --template vue", pkg_mgr),
        "nextjs" => format!(
            "npx create-next-app@latest . --use-{} --no-eslint --no-tailwind --no-src-dir --import-alias \"@/*\" --app --yes",
            pkg_mgr
        ),
        _ => format!("{} create vite@latest . -- --template react", pkg_mgr),
    };

    emit_scaffold(&format!("[Lummo Scaffolder] Ejecutando: \"{}\"...", scaffold_cmd));

    #[cfg(target_os = "windows")]
    use std::os::windows::process::CommandExt;
    #[cfg(target_os = "windows")]
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let mut command = Command::new("cmd");
    command
        .args(["/C", &scaffold_cmd])
        .current_dir(&project_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    #[cfg(target_os = "windows")]
    command.creation_flags(CREATE_NO_WINDOW);

    match command.spawn() {
        Ok(mut child) => {
            if let Some(out) = child.stdout.take() {
                for line in BufReader::new(out).lines().map_while(Result::ok) {
                    emit_scaffold(&line);
                }
            }
            let status = child.wait().ok().and_then(|s| s.code()).unwrap_or(1);
            if status == 0 {
                serde_json::json!({
                    "success": true,
                    "projectPath": project_path.to_string_lossy(),
                    "cleanName": clean_name
                })
            } else {
                serde_json::json!({
                    "success": false,
                    "error": format!("Error creando proyecto (Código {})", status)
                })
            }
        }
        Err(e) => serde_json::json!({ "success": false, "error": e.to_string() }),
    }
}
