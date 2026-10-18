use serde_json::{json, Value};
use std::fs;
use std::path::Path;
use std::process::Command;
use tauri::{AppHandle, Emitter};

fn run_hidden_cmd(program: &str, args: &[&str], cwd: Option<&str>) -> (i32, String, String) {
    #[cfg(target_os = "windows")]
    use std::os::windows::process::CommandExt;
    #[cfg(target_os = "windows")]
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let mut cmd = Command::new(program);
    cmd.args(args);
    if let Some(dir) = cwd {
        if Path::new(dir).exists() {
            cmd.current_dir(dir);
        }
    }
    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    match cmd.output() {
        Ok(out) => (
            out.status.code().unwrap_or(1),
            String::from_utf8_lossy(&out.stdout).to_string(),
            String::from_utf8_lossy(&out.stderr).to_string(),
        ),
        Err(e) => (1, String::new(), e.to_string()),
    }
}

// --------------------------------------------------------------------------
// 1. Docker & Docker Compose Manager
// --------------------------------------------------------------------------
pub fn docker_check_available() -> Value {
    let (c1, out1, _) = run_hidden_cmd("docker", &["--version"], None);
    let (c2, out2, _) = run_hidden_cmd("docker", &["compose", "version"], None);
    json!({
        "installed": c1 == 0,
        "dockerVersion": if c1 == 0 { Some(out1.trim()) } else { None },
        "composeVersion": if c2 == 0 { Some(out2.trim()) } else { None },
        "hasCompose": c2 == 0
    })
}

pub fn docker_detect_files(folder_path: &str) -> Value {
    let base = Path::new(folder_path);
    if !base.exists() {
        return json!({ "hasDocker": false, "composeFile": Value::Null, "hasDockerfile": false });
    }
    let candidates = [
        "docker-compose.yml",
        "docker-compose.yaml",
        "compose.yml",
        "compose.yaml",
    ];
    let found = candidates
        .iter()
        .find(|c| base.join(c).exists())
        .map(|s| s.to_string());
    let has_dockerfile = base.join("Dockerfile").exists();
    json!({
        "hasDocker": found.is_some() || has_dockerfile,
        "composeFile": found,
        "hasDockerfile": has_dockerfile
    })
}

pub fn docker_get_status(folder_path: &str) -> Value {
    let det = docker_detect_files(folder_path);
    let Some(compose_file) = det.get("composeFile").and_then(|v| v.as_str()) else {
        return json!({
            "success": false,
            "error": "No se encontró archivo docker-compose en este proyecto.",
            "services": []
        });
    };

    let (code, stdout, stderr) = run_hidden_cmd(
        "docker",
        &["compose", "ps", "--format", "json"],
        Some(folder_path),
    );
    if code != 0 {
        return json!({
            "success": false,
            "error": if stderr.is_empty() { "No se pudo conectar al daemon de Docker." } else { stderr.trim() },
            "composeFile": compose_file,
            "services": []
        });
    }

    let mut raw_services: Vec<Value> = Vec::new();
    let trimmed = stdout.trim();
    if trimmed.starts_with('[') {
        raw_services = serde_json::from_str(trimmed).unwrap_or_default();
    } else if !trimmed.is_empty() {
        for line in trimmed.lines() {
            if let Ok(v) = serde_json::from_str::<Value>(line) {
                raw_services.push(v);
            }
        }
    }

    let services: Vec<Value> = raw_services
        .into_iter()
        .map(|s| {
            let name = s
                .get("Name")
                .or_else(|| s.get("name"))
                .or_else(|| s.get("Service"))
                .and_then(|v| v.as_str())
                .unwrap_or("servicio");
            let service = s
                .get("Service")
                .or_else(|| s.get("service"))
                .and_then(|v| v.as_str())
                .unwrap_or(name);
            let state = s
                .get("State")
                .or_else(|| s.get("state"))
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_lowercase();
            let status = s
                .get("Status")
                .or_else(|| s.get("status"))
                .and_then(|v| v.as_str())
                .unwrap_or(&state);
            let image = s
                .get("Image")
                .or_else(|| s.get("image"))
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let ports = s
                .get("Ports")
                .or_else(|| s.get("ports"))
                .and_then(|v| v.as_str())
                .unwrap_or("");
            json!({
                "name": name,
                "service": service,
                "state": state,
                "status": status,
                "ports": ports,
                "image": image
            })
        })
        .collect();

    let count = services.len();
    json!({
        "success": true,
        "composeFile": compose_file,
        "services": services,
        "rawCount": count
    })
}

pub fn docker_run_action(folder_path: &str, action: &str, service_name: Option<String>) -> Value {
    let svc = service_name.unwrap_or_default();
    let mut args = vec!["compose"];
    match action {
        "stop" => args.push("stop"),
        "restart" => args.push("restart"),
        "down" => args.push("down"),
        _ => {
            args.push("up");
            args.push("-d");
        }
    }
    if !svc.is_empty() && action != "down" {
        args.push(&svc);
    }

    let (code, stdout, stderr) = run_hidden_cmd("docker", &args, Some(folder_path));
    if code == 0 {
        json!({
            "success": true,
            "action": action,
            "serviceName": svc,
            "message": "Acción de Docker Compose ejecutada exitosamente.",
            "output": if stdout.is_empty() { stderr } else { stdout }
        })
    } else {
        json!({
            "success": false,
            "action": action,
            "serviceName": svc,
            "error": stderr
        })
    }
}

pub fn docker_get_logs(folder_path: &str, service_name: Option<String>, tail: Option<u32>) -> Value {
    let tail_str = format!("--tail={}", tail.unwrap_or(100));
    let svc = service_name.unwrap_or_default();
    let mut args = vec!["compose", "logs", &tail_str];
    if !svc.is_empty() {
        args.push(&svc);
    }
    let (code, stdout, stderr) = run_hidden_cmd("docker", &args, Some(folder_path));
    let combined = if stdout.is_empty() { stderr } else { stdout };
    let lines: Vec<String> = combined.lines().map(|s| s.to_string()).collect();
    json!({
        "success": code == 0,
        "logs": lines
    })
}

pub fn docker_generate_compose(
    folder_path: &str,
    selected_services: Vec<String>,
    _custom_config: Option<Value>,
) -> Value {
    let project_name: String = Path::new(folder_path)
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("app")
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() { c.to_ascii_lowercase() } else { '_' })
        .collect();

    let mut yaml = format!(
        "# Generado por Lummo Studio\nversion: '3.8'\n\nservices:\n"
    );
    let mut volumes = Vec::new();

    for svc in &selected_services {
        match svc.as_str() {
            "postgres" => {
                yaml.push_str(&format!(
                    "  postgres:\n    image: postgres:16-alpine\n    container_name: {}_postgres\n    restart: unless-stopped\n    environment:\n      POSTGRES_USER: \"postgres\"\n      POSTGRES_PASSWORD: \"postgres\"\n      POSTGRES_DB: \"{}_db\"\n    ports:\n      - \"5432:5432\"\n    volumes:\n      - postgres_data:/var/lib/postgresql/data\n\n",
                    project_name, project_name
                ));
                volumes.push("postgres_data");
            }
            "mysql" => {
                yaml.push_str(&format!(
                    "  mysql:\n    image: mysql:8.0\n    container_name: {}_mysql\n    restart: unless-stopped\n    environment:\n      MYSQL_ROOT_PASSWORD: \"root\"\n      MYSQL_DATABASE: \"{}_db\"\n    ports:\n      - \"3306:3306\"\n    volumes:\n      - mysql_data:/var/lib/mysql\n\n",
                    project_name, project_name
                ));
                volumes.push("mysql_data");
            }
            "redis" => {
                yaml.push_str(&format!(
                    "  redis:\n    image: redis:7-alpine\n    container_name: {}_redis\n    restart: unless-stopped\n    ports:\n      - \"6379:6379\"\n    volumes:\n      - redis_data:/data\n\n",
                    project_name
                ));
                volumes.push("redis_data");
            }
            "mailpit" => {
                yaml.push_str(&format!(
                    "  mailpit:\n    image: axllent/mailpit:latest\n    container_name: {}_mailpit\n    restart: unless-stopped\n    ports:\n      - \"1025:1025\"\n      - \"8025:8025\"\n\n",
                    project_name
                ));
            }
            "rabbitmq" => {
                yaml.push_str(&format!(
                    "  rabbitmq:\n    image: rabbitmq:3-management-alpine\n    container_name: {}_rabbitmq\n    restart: unless-stopped\n    ports:\n      - \"5672:5672\"\n      - \"15672:15672\"\n\n",
                    project_name
                ));
            }
            _ => {}
        }
    }

    if !volumes.is_empty() {
        yaml.push_str("volumes:\n");
        for v in volumes {
            yaml.push_str(&format!("  {}:\n    driver: local\n", v));
        }
    }

    let target = Path::new(folder_path).join("docker-compose.yml");
    match fs::write(&target, &yaml) {
        Ok(_) => json!({
            "success": true,
            "filePath": target.to_string_lossy(),
            "servicesCount": selected_services.len(),
            "yamlContent": yaml
        }),
        Err(e) => json!({ "success": false, "error": e.to_string() }),
    }
}

// --------------------------------------------------------------------------
// 2. Git Inspector & Visual Graph Controller
// --------------------------------------------------------------------------
pub fn git_get_status(folder_path: &str) -> Value {
    let git_dir = Path::new(folder_path).join(".git");
    if !git_dir.exists() {
        return json!({ "hasGit": false });
    }
    let (c, out, _) = run_hidden_cmd(
        "git",
        &["rev-parse", "--is-inside-work-tree"],
        Some(folder_path),
    );
    if c != 0 || !out.trim().contains("true") {
        return json!({ "hasGit": false });
    }

    let (_, b_out, _) = run_hidden_cmd("git", &["branch", "--show-current"], Some(folder_path));
    let current_branch = if b_out.trim().is_empty() {
        "main".to_string()
    } else {
        b_out.trim().to_string()
    };

    let (_, st_out, _) = run_hidden_cmd("git", &["status", "--porcelain=v1"], Some(folder_path));
    let mut files = Vec::new();
    for line in st_out.lines().filter(|l| l.len() >= 3) {
        let idx_st = &line[0..1];
        let wt_st = &line[1..2];
        let fp = line[3..].trim();
        let status_type = if idx_st == "?" || wt_st == "?" {
            "UNTRACKED"
        } else if idx_st == "A" || wt_st == "A" {
            "ADDED"
        } else if idx_st == "D" || wt_st == "D" {
            "DELETED"
        } else if idx_st == "R" || wt_st == "R" {
            "RENAMED"
        } else {
            "MODIFIED"
        };
        files.push(json!({
            "path": fp,
            "status": status_type,
            "isStaged": idx_st != " " && idx_st != "?"
        }));
    }

    let (rc, r_out, _) = run_hidden_cmd("git", &["remote", "get-url", "origin"], Some(folder_path));
    let remote_url = if rc == 0 {
        Some(r_out.trim().to_string())
    } else {
        None
    };

    let count = files.len();
    json!({
        "hasGit": true,
        "currentBranch": current_branch,
        "files": files,
        "ahead": 0,
        "behind": 0,
        "remoteUrl": remote_url,
        "uncommittedCount": count
    })
}

pub fn git_get_history(folder_path: &str, limit: Option<u32>) -> Value {
    let lim = limit.unwrap_or(50).to_string();
    let (code, stdout, _) = run_hidden_cmd(
        "git",
        &[
            "log",
            "-n",
            &lim,
            "--pretty=format:%H||%h||%an||%ae||%cr||%s||%d",
        ],
        Some(folder_path),
    );
    if code != 0 {
        return json!({ "commits": [] });
    }
    let commits: Vec<Value> = stdout
        .lines()
        .filter(|l| !l.trim().is_empty())
        .map(|line| {
            let parts: Vec<&str> = line.split("||").collect();
            let refs_raw = parts.get(6).copied().unwrap_or("");
            let refs: Vec<String> = refs_raw
                .trim_matches(|c| c == '(' || c == ')')
                .split(',')
                .map(|r| r.trim().to_string())
                .filter(|r| !r.is_empty())
                .collect();
            json!({
                "hash": parts.first().copied().unwrap_or(""),
                "shortHash": parts.get(1).copied().unwrap_or(""),
                "author": parts.get(2).copied().unwrap_or("Developer"),
                "email": parts.get(3).copied().unwrap_or(""),
                "date": parts.get(4).copied().unwrap_or("recent"),
                "message": parts.get(5).copied().unwrap_or("Commit"),
                "refs": refs
            })
        })
        .collect();
    json!({ "commits": commits })
}

pub fn git_get_branches(folder_path: &str) -> Value {
    let (code, stdout, _) = run_hidden_cmd("git", &["branch", "-a"], Some(folder_path));
    if code != 0 {
        return json!({ "branches": [] });
    }
    let branches: Vec<Value> = stdout
        .lines()
        .filter(|l| !l.trim().is_empty())
        .map(|l| {
            let is_current = l.starts_with('*');
            let clean = l.trim_start_matches('*').trim();
            json!({
                "name": clean,
                "isCurrent": is_current,
                "isRemote": clean.starts_with("remotes/")
            })
        })
        .collect();
    json!({ "branches": branches })
}

pub fn git_checkout_branch(folder_path: &str, branch_name: &str) -> Value {
    let (code, _, stderr) = run_hidden_cmd("git", &["checkout", branch_name], Some(folder_path));
    if code == 0 {
        json!({ "success": true })
    } else {
        json!({ "success": false, "error": stderr })
    }
}

pub fn git_stage_all(folder_path: &str) -> Value {
    let (code, _, stderr) = run_hidden_cmd("git", &["add", "-A"], Some(folder_path));
    json!({ "success": code == 0, "error": stderr })
}

pub fn git_commit(folder_path: &str, message: &str) -> Value {
    let _ = run_hidden_cmd("git", &["add", "-A"], Some(folder_path));
    let (code, _, stderr) = run_hidden_cmd("git", &["commit", "-m", message], Some(folder_path));
    if code == 0 {
        json!({ "success": true })
    } else {
        json!({ "success": false, "error": stderr })
    }
}

pub fn git_push(folder_path: &str) -> Value {
    let (code, _, stderr) = run_hidden_cmd("git", &["push"], Some(folder_path));
    if code == 0 {
        json!({ "success": true })
    } else {
        json!({ "success": false, "error": stderr })
    }
}

pub fn git_pull(folder_path: &str) -> Value {
    let (code, _, stderr) = run_hidden_cmd("git", &["pull"], Some(folder_path));
    if code == 0 {
        json!({ "success": true })
    } else {
        json!({ "success": false, "error": stderr })
    }
}

// --------------------------------------------------------------------------
// 3. Multi-Provider AI Assistant (OpenAI, Gemini, Anthropic, DeepSeek, Groq, OpenRouter, Ollama)
// --------------------------------------------------------------------------
fn provider_endpoint(provider: &str) -> &'static str {
    match provider {
        "gemini" => "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        "deepseek" => "https://api.deepseek.com/chat/completions",
        "groq" => "https://api.groq.com/openai/v1/chat/completions",
        "openrouter" => "https://openrouter.ai/api/v1/chat/completions",
        "anthropic" => "https://api.anthropic.com/v1/messages",
        _ => "https://api.openai.com/v1/chat/completions",
    }
}

fn default_model_for(provider: &str) -> &'static str {
    match provider {
        "gemini" => "gemini-1.5-flash",
        "anthropic" => "claude-3-5-sonnet-20241022",
        "deepseek" => "deepseek-chat",
        "groq" => "llama-3.3-70b-versatile",
        "openrouter" => "openai/gpt-4o-mini",
        "ollama" => "llama3:latest",
        _ => "gpt-4o-mini",
    }
}

pub async fn ai_test_connection(options: Value) -> Value {
    let provider = options
        .get("provider")
        .and_then(|v| v.as_str())
        .unwrap_or("ollama");
    let api_key = options
        .get("apiKey")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim();
    let endpoint = options
        .get("endpoint")
        .and_then(|v| v.as_str())
        .unwrap_or("http://127.0.0.1:11434");

    let client = reqwest::Client::new();
    if provider == "ollama" {
        let url = format!("{}/api/tags", endpoint.trim_end_matches('/'));
        match client.get(&url).send().await {
            Ok(resp) if resp.status().is_success() => {
                let data: Value = resp.json().await.unwrap_or_default();
                let models: Vec<String> = data
                    .get("models")
                    .and_then(|v| v.as_array())
                    .map(|arr| {
                        arr.iter()
                            .filter_map(|m| m.get("name").and_then(|n| n.as_str()).map(|s| s.to_string()))
                            .collect()
                    })
                    .unwrap_or_default();
                return json!({
                    "success": true,
                    "models": models,
                    "message": format!("Conectado a Ollama ({} modelos detectados)", models.len())
                });
            }
            Ok(r) => return json!({ "success": false, "error": format!("HTTP {}", r.status()) }),
            Err(e) => return json!({ "success": false, "error": e.to_string() }),
        }
    }

    if api_key.is_empty() {
        return json!({ "success": false, "error": format!("API Key requerida para {}", provider.to_uppercase()) });
    }

    let chat_res = ai_chat_completion(json!({
        "provider": provider,
        "apiKey": api_key,
        "model": options.get("model"),
        "messages": [{ "role": "user", "content": "Ping" }]
    }))
    .await;

    if chat_res.get("success").and_then(|v| v.as_bool()).unwrap_or(false) {
        json!({ "success": true, "message": format!("Conexión exitosa con {}", provider.to_uppercase()) })
    } else {
        chat_res
    }
}

pub async fn ai_chat_completion(payload: Value) -> Value {
    let provider = payload
        .get("provider")
        .and_then(|v| v.as_str())
        .unwrap_or("openai");
    let api_key = payload
        .get("apiKey")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim();
    let model = payload
        .get("model")
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| default_model_for(provider));
    let endpoint = payload
        .get("endpoint")
        .and_then(|v| v.as_str())
        .unwrap_or("http://127.0.0.1:11434");
    let user_msgs = payload
        .get("messages")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    let sys_prompt = "Eres Lummo AI, el copiloto inteligente de desarrollo local, servidores y bases de datos para Lummo Studio.";
    let mut full_messages = vec![json!({ "role": "system", "content": sys_prompt })];
    full_messages.extend(user_msgs.clone());

    let client = reqwest::Client::new();

    if provider == "ollama" {
        let url = format!("{}/api/chat", endpoint.trim_end_matches('/'));
        match client
            .post(&url)
            .json(&json!({ "model": model, "messages": full_messages, "stream": false }))
            .send()
            .await
        {
            Ok(resp) if resp.status().is_success() => {
                let data: Value = resp.json().await.unwrap_or_default();
                let content = data
                    .get("message")
                    .and_then(|m| m.get("content"))
                    .and_then(|c| c.as_str())
                    .unwrap_or("");
                return json!({
                    "success": true,
                    "message": { "role": "assistant", "content": content }
                });
            }
            Ok(r) => return json!({ "success": false, "error": format!("Ollama HTTP {}", r.status()) }),
            Err(e) => return json!({ "success": false, "error": e.to_string() }),
        }
    }

    if api_key.is_empty() {
        return json!({
            "success": false,
            "error": format!("API Key no configurada para {}", provider.to_uppercase())
        });
    }

    if provider == "anthropic" {
        let resp = client
            .post(provider_endpoint("anthropic"))
            .header("x-api-key", api_key)
            .header("anthropic-version", "2023-06-01")
            .json(&json!({
                "model": model,
                "max_tokens": 4096,
                "system": sys_prompt,
                "messages": user_msgs
            }))
            .send()
            .await;

        match resp {
            Ok(r) if r.status().is_success() => {
                let data: Value = r.json().await.unwrap_or_default();
                let text = data
                    .get("content")
                    .and_then(|c| c.as_array())
                    .and_then(|a| a.first())
                    .and_then(|x| x.get("text"))
                    .and_then(|t| t.as_str())
                    .unwrap_or("");
                json!({ "success": true, "message": { "role": "assistant", "content": text } })
            }
            Ok(r) => json!({ "success": false, "error": r.text().await.unwrap_or_default() }),
            Err(e) => json!({ "success": false, "error": e.to_string() }),
        }
    } else {
        let resp = client
            .post(provider_endpoint(provider))
            .bearer_auth(api_key)
            .json(&json!({
                "model": model,
                "messages": full_messages,
                "temperature": 0.7
            }))
            .send()
            .await;

        match resp {
            Ok(r) if r.status().is_success() => {
                let data: Value = r.json().await.unwrap_or_default();
                let text = data
                    .get("choices")
                    .and_then(|c| c.as_array())
                    .and_then(|a| a.first())
                    .and_then(|x| x.get("message"))
                    .and_then(|m| m.get("content"))
                    .and_then(|t| t.as_str())
                    .unwrap_or("");
                json!({ "success": true, "message": { "role": "assistant", "content": text } })
            }
            Ok(r) => json!({ "success": false, "error": r.text().await.unwrap_or_default() }),
            Err(e) => json!({ "success": false, "error": e.to_string() }),
        }
    }
}

// --------------------------------------------------------------------------
// 4. Unattended System Tech Installer (Winget)
// --------------------------------------------------------------------------
pub fn system_install_tech(app: &AppHandle, tech_keys: Vec<String>) -> Value {
    let mut results = serde_json::Map::new();
    for key in tech_keys {
        let winget_id = match key.as_str() {
            "node" => "OpenJS.NodeJS.LTS",
            "git" => "Git.Git",
            "python" => "Python.Python.3.12",
            "php" => "PHP.PHP.8.3",
            "mysql" => "MariaDB.Server",
            "postgres" => "PostgreSQL.PostgreSQL.16",
            other => other,
        };

        let _ = app.emit(
            "tech-install-progress",
            json!({
                "techKey": key,
                "status": "downloading",
                "progress": 40,
                "message": format!("Instalando {} mediante Winget...", winget_id)
            }),
        );

        let (code, _, stderr) = run_hidden_cmd(
            "winget",
            &[
                "install",
                "--id",
                winget_id,
                "-e",
                "--silent",
                "--accept-package-agreements",
                "--accept-source-agreements",
            ],
            None,
        );

        let ok = code == 0;
        let _ = app.emit(
            "tech-install-progress",
            json!({
                "techKey": key,
                "status": if ok { "completed" } else { "error" },
                "progress": 100,
                "message": if ok { "Instalado correctamente".to_string() } else { stderr.clone() }
            }),
        );

        results.insert(
            key,
            json!({
                "success": ok,
                "error": if ok { Value::Null } else { json!(stderr) }
            }),
        );
    }

    json!({ "success": true, "results": results })
}
