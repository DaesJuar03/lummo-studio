use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TechItem {
    pub installed: bool,
    pub version: Option<String>,
    pub path: Option<String>,
}

impl TechItem {
    pub fn not_installed() -> Self {
        Self {
            installed: false,
            version: None,
            path: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemEnvironmentResult {
    pub node: TechItem,
    pub php: TechItem,
    pub mysql: TechItem,
    pub postgres: TechItem,
    pub python: TechItem,
    pub docker: TechItem,
    pub git: TechItem,
    pub sqlite: TechItem,
}

fn run_version_cmd(program: &str, args: &[&str]) -> Option<String> {
    #[cfg(target_os = "windows")]
    use std::os::windows::process::CommandExt;
    #[cfg(target_os = "windows")]
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let mut cmd = Command::new("cmd");
    cmd.arg("/C").arg(program);
    for a in args {
        cmd.arg(a);
    }
    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let output = cmd.output().ok()?;
    if output.status.success() {
        let s = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !s.is_empty() {
            return Some(s);
        }
        let e = String::from_utf8_lossy(&output.stderr).trim().to_string();
        if !e.is_empty() {
            return Some(e);
        }
    }
    None
}

fn check_candidates(candidates: &[&str]) -> Option<String> {
    for c in candidates {
        if Path::new(c).exists() {
            return Some(c.to_string());
        }
    }
    None
}

pub fn scan_system_environment() -> SystemEnvironmentResult {
    let mut res = SystemEnvironmentResult {
        node: TechItem::not_installed(),
        php: TechItem::not_installed(),
        mysql: TechItem::not_installed(),
        postgres: TechItem::not_installed(),
        python: TechItem::not_installed(),
        docker: TechItem::not_installed(),
        git: TechItem::not_installed(),
        sqlite: TechItem {
            installed: true,
            version: Some("Built-in Lummo Native Engine (Rusqlite)".to_string()),
            path: Some("Internal".to_string()),
        },
    };

    if let Some(ver) = run_version_cmd("node", &["-v"]) {
        res.node.installed = true;
        res.node.version = Some(ver);
    }

    if let Some(ver) = run_version_cmd("php", &["-v"]) {
        res.php.installed = true;
        res.php.version = ver.lines().next().map(|s| s.to_string());
    } else if let Some(p) = check_candidates(&[
        r"C:\xampp\php\php.exe",
        r"C:\php\php.exe",
        r"C:\Program Files\PHP\php.exe",
        r"C:\tools\php\php.exe",
    ]) {
        res.php.installed = true;
        res.php.version = Some("PHP (Local)".to_string());
        res.php.path = Some(p);
    }

    if let Some(ver) = run_version_cmd("mysql", &["--version"]) {
        res.mysql.installed = true;
        res.mysql.version = Some(ver);
    } else if let Some(p) = check_candidates(&[
        r"C:\xampp\mysql\bin\mysql.exe",
        r"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
        r"C:\Program Files\MariaDB 10.11\bin\mysql.exe",
    ]) {
        res.mysql.installed = true;
        res.mysql.version = Some("MySQL/MariaDB (Installed)".to_string());
        res.mysql.path = Some(p);
    }

    if let Some(ver) = run_version_cmd("psql", &["--version"]) {
        res.postgres.installed = true;
        res.postgres.version = Some(ver);
    } else if let Some(p) = check_candidates(&[
        r"C:\Program Files\PostgreSQL\16\bin\psql.exe",
        r"C:\Program Files\PostgreSQL\15\bin\psql.exe",
        r"C:\Program Files\PostgreSQL\14\bin\psql.exe",
    ]) {
        res.postgres.installed = true;
        res.postgres.version = Some("PostgreSQL (Installed)".to_string());
        res.postgres.path = Some(p);
    }

    if let Some(ver) = run_version_cmd("python", &["--version"])
        .or_else(|| run_version_cmd("py", &["-3", "--version"]))
    {
        res.python.installed = true;
        res.python.version = Some(ver);
    }

    if let Some(ver) = run_version_cmd("docker", &["--version"]) {
        res.docker.installed = true;
        res.docker.version = Some(ver);
    }

    if let Some(ver) = run_version_cmd("git", &["--version"]) {
        res.git.installed = true;
        res.git.version = Some(ver);
    } else if let Some(p) = check_candidates(&[
        r"C:\Program Files\Git\cmd\git.exe",
        r"C:\Program Files\Git\bin\git.exe",
    ]) {
        res.git.installed = true;
        res.git.version = Some("Git for Windows".to_string());
        res.git.path = Some(p);
    }

    res
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EditorCatalogEntry {
    pub id: String,
    pub name: String,
    pub cmd: String,
    pub command: String,
    pub installed: bool,
}

pub fn detect_installed_editors() -> Vec<EditorCatalogEntry> {
    let catalog = vec![
        ("vscode", "Visual Studio Code", "code"),
        ("cursor", "Cursor AI Editor", "cursor"),
        ("windsurf", "Windsurf IDE", "windsurf"),
        ("vscodium", "VSCodium", "vscodium"),
        ("subl", "Sublime Text", "subl"),
        ("webstorm", "JetBrains WebStorm", "webstorm"),
        ("phpstorm", "JetBrains PhpStorm", "phpstorm"),
        ("idea", "JetBrains IntelliJ IDEA", "idea"),
        ("notepad", "Bloc de Notas (Notepad)", "notepad"),
        ("explorer", "Explorador de Archivos", "explorer"),
    ];

    catalog
        .into_iter()
        .map(|(id, name, cmd)| {
            let installed = if cmd == "explorer" || cmd == "notepad" {
                true
            } else {
                run_version_cmd("where", &[cmd]).is_some()
            };
            EditorCatalogEntry {
                id: id.to_string(),
                name: name.to_string(),
                cmd: cmd.to_string(),
                command: cmd.to_string(),
                installed,
            }
        })
        .collect()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackendProjectInfo {
    pub name: String,
    pub path: String,
    pub subfolder: String,
    pub tech_stack: String,
    pub icon: String,
    pub command: String,
    pub default_port: u16,
    pub available_commands: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DetectedProject {
    pub name: String,
    pub path: String,
    pub tech_stack: String,
    pub icon: String,
    pub command: String,
    pub default_port: u16,
    pub has_package_json: bool,
    pub available_commands: Vec<String>,
    pub has_backend: bool,
    pub backend: Option<BackendProjectInfo>,
    pub dual_label: Option<String>,
    pub env_api_url: Option<String>,
}

fn analyze_single_folder(folder_path: &Path) -> DetectedProject {
    let folder_name = folder_path
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("Proyecto")
        .to_string();

    let mut result = DetectedProject {
        name: folder_name,
        path: folder_path.to_string_lossy().to_string(),
        tech_stack: "Proyectos Varios".to_string(),
        icon: "code".to_string(),
        command: "lummo:static".to_string(),
        default_port: 8080,
        has_package_json: false,
        available_commands: vec![],
        has_backend: false,
        backend: None,
        dual_label: None,
        env_api_url: None,
    };

    if !folder_path.exists() {
        return result;
    }

    let pkg_path = folder_path.join("package.json");
    if pkg_path.exists() {
        result.has_package_json = true;
        if let Ok(raw) = fs::read_to_string(&pkg_path) {
            if let Ok(pkg) = serde_json::from_str::<serde_json::Value>(&raw) {
                let scripts = pkg.get("scripts").and_then(|v| v.as_object());
                if let Some(sc) = scripts {
                    result.available_commands = sc.keys().map(|k| format!("npm run {}", k)).collect();
                }

                let has_dep = |key: &str| -> bool {
                    pkg.get("dependencies")
                        .and_then(|d| d.get(key))
                        .is_some()
                        || pkg
                            .get("devDependencies")
                            .and_then(|d| d.get(key))
                            .is_some()
                };

                let has_dev_script = scripts.map(|s| s.contains_key("dev")).unwrap_or(false);
                let has_start_script = scripts.map(|s| s.contains_key("start")).unwrap_or(false);

                if has_dep("next") {
                    result.tech_stack = "Next.js App".to_string();
                    result.icon = "next".to_string();
                    result.command = if has_dev_script { "npm run dev" } else { "npm start" }.to_string();
                    result.default_port = 3000;
                } else if has_dep("vite") {
                    result.tech_stack = if has_dep("react") {
                        "Vite + React"
                    } else if has_dep("vue") {
                        "Vite + Vue"
                    } else {
                        "Vite Web App"
                    }
                    .to_string();
                    result.icon = "react".to_string();
                    result.command = if has_dev_script { "npm run dev" } else { "npm start" }.to_string();
                    result.default_port = 5173;
                } else if has_dep("react") {
                    result.tech_stack = "React App".to_string();
                    result.icon = "react".to_string();
                    result.command = if has_start_script { "npm start" } else { "npm run dev" }.to_string();
                    result.default_port = 3000;
                } else if has_dep("express")
                    || has_dep("nest")
                    || has_dep("@nestjs/core")
                    || has_dep("fastify")
                    || has_dep("koa")
                    || has_dep("hono")
                {
                    result.tech_stack = if has_dep("nest") || has_dep("@nestjs/core") {
                        "NestJS Backend"
                    } else if has_dep("fastify") {
                        "Fastify Server"
                    } else {
                        "Express Node Server"
                    }
                    .to_string();
                    result.icon = "node".to_string();
                    result.command = if has_dev_script {
                        "npm run dev"
                    } else if has_start_script {
                        "npm start"
                    } else {
                        "node index.js"
                    }
                    .to_string();
                    result.default_port = 5000;
                } else {
                    result.tech_stack = "Node.js Application".to_string();
                    result.icon = "node".to_string();
                    result.command = if has_dev_script {
                        "npm run dev"
                    } else if has_start_script {
                        "npm start"
                    } else {
                        "node index.js"
                    }
                    .to_string();
                    result.default_port = 3000;
                }
                return result;
            }
        }
    }

    let files: Vec<String> = fs::read_dir(folder_path)
        .ok()
        .into_iter()
        .flatten()
        .flatten()
        .filter_map(|e| e.file_name().into_string().ok())
        .collect();

    let has_composer = files.iter().any(|f| f == "composer.json");
    let has_php = files.iter().any(|f| f.ends_with(".php") || f == "index.php");
    if has_composer || has_php {
        result.tech_stack = if has_composer {
            "PHP / Laravel Application"
        } else {
            "PHP Web Application"
        }
        .to_string();
        result.icon = "php".to_string();
        result.command = if has_composer {
            "php artisan serve"
        } else {
            "php -S localhost:{port}"
        }
        .to_string();
        result.default_port = 8000;
        return result;
    }

    let has_py = files.iter().any(|f| {
        f == "app.py" || f == "main.py" || f == "requirements.txt" || f == "Pipfile" || f.ends_with(".py")
    });
    if has_py {
        result.tech_stack = "Python Server / Application".to_string();
        result.icon = "python".to_string();
        result.command = if files.iter().any(|f| f == "app.py") {
            "python app.py"
        } else if files.iter().any(|f| f == "main.py") {
            "python main.py"
        } else {
            "python -m http.server {port}"
        }
        .to_string();
        result.default_port = 8000;
        return result;
    }

    if files.iter().any(|f| f == "index.html" || f.ends_with(".html")) {
        result.tech_stack = "Sitio Web HTML/CSS/JS".to_string();
        result.icon = "html".to_string();
        result.command = "lummo:static".to_string();
        result.default_port = 8080;
        return result;
    }

    if files.iter().any(|f| f == "docker-compose.yml" || f == "docker-compose.yaml") {
        result.tech_stack = "Docker Container Environment".to_string();
        result.icon = "docker".to_string();
        result.command = "docker compose up".to_string();
        result.default_port = 8080;
    }

    result
}

pub fn detect_project_type(folder_path_str: &str) -> DetectedProject {
    let path = Path::new(folder_path_str);
    let mut root = analyze_single_folder(path);
    if !path.exists() {
        return root;
    }

    let backend_names = ["backend", "server", "api", "backend-api", "services", "srv", "laravel"];
    let subdirs: Vec<String> = fs::read_dir(path)
        .ok()
        .into_iter()
        .flatten()
        .flatten()
        .filter(|e| e.file_type().map(|t| t.is_dir()).unwrap_or(false))
        .filter_map(|e| e.file_name().into_string().ok())
        .filter(|n| !n.starts_with('.') && n != "node_modules" && n != "dist" && n != "build")
        .collect();

    if let Some(bf) = subdirs
        .iter()
        .find(|d| backend_names.contains(&d.to_lowercase().as_str()))
    {
        let b_path = path.join(bf);
        let b_analysis = analyze_single_folder(&b_path);
        root.has_backend = true;
        root.dual_label = Some(format!("Entorno Dual: {} + Backend", root.tech_stack));
        root.backend = Some(BackendProjectInfo {
            name: b_analysis.name,
            path: b_path.to_string_lossy().to_string(),
            subfolder: bf.clone(),
            tech_stack: b_analysis.tech_stack,
            icon: b_analysis.icon,
            command: b_analysis.command,
            default_port: if b_analysis.default_port == 8080 { 5000 } else { b_analysis.default_port },
            available_commands: b_analysis.available_commands,
        });
    }

    root
}
