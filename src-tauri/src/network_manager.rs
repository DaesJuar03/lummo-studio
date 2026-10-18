use crate::process_manager::ProcessStore;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::fs;
use std::io::{BufRead, BufReader, Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Instant;
use tauri::{AppHandle, Emitter, Manager};

pub const HTTP_PROXY_PORT: u16 = 3838;
pub const HTTPS_PROXY_PORT: u16 = 8443;
pub const CA_COMMON_NAME: &str = "Lummo Local Development CA";
const MAX_EVENTS_PER_PROJECT: usize = 200;

#[derive(Default)]
pub struct NetworkStore {
    pub domain_routes: Mutex<HashMap<String, u16>>,
    pub webhook_events: Mutex<HashMap<String, Vec<Value>>>,
    pub interceptors: Mutex<HashMap<String, (u16, u16)>>, // projectId -> (interceptor_port, target_port)
    pub active_tunnels: Mutex<HashMap<String, u32>>,       // projectId -> child PID
    pub proxy_started: Mutex<bool>,
}

impl NetworkStore {
    pub fn record_webhook_event(&self, app: &AppHandle, project_id: &str, event_obj: Value) {
        if let Ok(mut map) = self.webhook_events.lock() {
            let list = map.entry(project_id.to_string()).or_default();
            list.insert(0, event_obj.clone());
            if list.len() > MAX_EVENTS_PER_PROJECT {
                list.truncate(MAX_EVENTS_PER_PROJECT);
            }
        }
        let _ = app.emit(
            "webhook-traffic-event",
            json!({
                "projectId": project_id,
                "event": event_obj
            }),
        );
    }
}

// --------------------------------------------------------------------------
// 1. Native HTTP Reverse Proxy (.test domains & /proxy/<port>)
// --------------------------------------------------------------------------
pub fn ensure_http_reverse_proxy(net_store: Arc<NetworkStore>) {
    if let Ok(mut started) = net_store.proxy_started.lock() {
        if *started {
            return;
        }
        *started = true;
    }

    let store_http = Arc::clone(&net_store);
    thread::spawn(move || {
        let Ok(listener) = TcpListener::bind(("127.0.0.1", HTTP_PROXY_PORT)) else {
            return;
        };
        for stream in listener.incoming().flatten() {
            let store_clone = Arc::clone(&store_http);
            thread::spawn(move || handle_proxy_connection(stream, store_clone));
        }
    });

    let store_https = Arc::clone(&net_store);
    thread::spawn(move || {
        let Ok(listener) = TcpListener::bind(("127.0.0.1", HTTPS_PROXY_PORT)) else {
            return;
        };
        for stream in listener.incoming().flatten() {
            let store_clone = Arc::clone(&store_https);
            thread::spawn(move || handle_proxy_connection(stream, store_clone));
        }
    });
}

fn handle_proxy_connection(mut client: TcpStream, net_store: Arc<NetworkStore>) {
    let mut buf = [0u8; 8192];
    let n = match client.read(&mut buf) {
        Ok(n) if n > 0 => n,
        _ => return,
    };

    let req_str = String::from_utf8_lossy(&buf[..n]);
    let mut lines = req_str.lines();
    let first_line = lines.next().unwrap_or("GET / HTTP/1.1");
    let mut parts = first_line.split_whitespace();
    let _method = parts.next().unwrap_or("GET");
    let raw_url = parts.next().unwrap_or("/");

    let mut host_header = String::new();
    for line in lines {
        if line.is_empty() {
            break;
        }
        if line.to_ascii_lowercase().starts_with("host:") {
            host_header = line[5..]
                .trim()
                .split(':')
                .next()
                .unwrap_or("")
                .to_lowercase();
        }
    }

    let mut target_port = net_store
        .domain_routes
        .lock()
        .ok()
        .and_then(|m| m.get(&host_header).copied());

    let mut forward_path = raw_url.to_string();
    if target_port.is_none() && raw_url.starts_with("/proxy/") {
        let rest = &raw_url["/proxy/".len()..];
        let port_str = rest.split('/').next().unwrap_or("");
        if let Ok(p) = port_str.parse::<u16>() {
            target_port = Some(p);
            let after_port = &rest[port_str.len()..];
            forward_path = if after_port.is_empty() {
                "/".to_string()
            } else {
                after_port.to_string()
            };
        }
    }

    let Some(port) = target_port else {
        let html = format!(
            "<!DOCTYPE html><html><body style='background:#141414;color:#eee;font-family:sans-serif;text-align:center;padding-top:15vh'><h2>404 - Dominio Local No Asignado ({})</h2><p>Configura el dominio en Lummo Studio.</p></body></html>",
            host_header
        );
        let resp = format!(
            "HTTP/1.1 404 Not Found\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
            html.len(),
            html
        );
        let _ = client.write_all(resp.as_bytes());
        return;
    };

    match TcpStream::connect(("127.0.0.1", port)) {
        Ok(mut upstream) => {
            let rewritten = req_str.replacen(raw_url, &forward_path, 1);
            let _ = upstream.write_all(rewritten.as_bytes());
            let mut resp_buf = Vec::new();
            let _ = upstream.read_to_end(&mut resp_buf);
            let _ = client.write_all(&resp_buf);
        }
        Err(e) => {
            let html = format!(
                "<!DOCTYPE html><html><body style='background:#141414;color:#eee;font-family:sans-serif;text-align:center;padding-top:15vh'><h2>502 Bad Gateway</h2><p>Servidor en puerto :{} inactivo ({})</p></body></html>",
                port, e
            );
            let resp = format!(
                "HTTP/1.1 502 Bad Gateway\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                html.len(),
                html
            );
            let _ = client.write_all(resp.as_bytes());
        }
    }
}

pub fn set_local_domain(
    net_store: Arc<NetworkStore>,
    domain: &str,
    port: u16,
    enable_ssl: bool,
) -> Value {
    let clean_domain: String = domain
        .trim()
        .to_lowercase()
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '.' || *c == '-')
        .collect();
    if clean_domain.is_empty() || port == 0 {
        return json!({ "success": false, "error": "Dominio o puerto no especificado" });
    }

    ensure_http_reverse_proxy(Arc::clone(&net_store));
    if let Ok(mut routes) = net_store.domain_routes.lock() {
        routes.insert(clean_domain.clone(), port);
    }

    if enable_ssl {
        let _ = generate_domain_cert(&clean_domain);
    }

    let hosts_path = Path::new(r"C:\Windows\System32\drivers\etc\hosts");
    let mut hosts_updated = false;
    if let Ok(content) = fs::read_to_string(hosts_path) {
        if !content.to_lowercase().contains(&clean_domain) {
            let line = format!("\r\n127.0.0.1       {}\r\n", clean_domain);
            if fs::OpenOptions::new()
                .append(true)
                .open(hosts_path)
                .and_then(|mut f| f.write_all(line.as_bytes()))
                .is_ok()
            {
                hosts_updated = true;
            } else {
                // Fallback con elevación UAC puntual mediante PowerShell RunAs
                #[cfg(target_os = "windows")]
                use std::os::windows::process::CommandExt;
                #[cfg(target_os = "windows")]
                const CREATE_NO_WINDOW: u32 = 0x08000000;

                let ps_uac = format!(
                    "Start-Process powershell -Verb RunAs -WindowStyle Hidden -Wait -ArgumentList '-NoProfile -Command \"Add-Content -Path ''C:\\Windows\\System32\\drivers\\etc\\hosts'' -Value ''`r`n127.0.0.1       {}'' -Encoding ASCII\"'",
                    clean_domain
                );
                let mut cmd = Command::new("powershell");
                cmd.args(["-NoProfile", "-NonInteractive", "-Command", &ps_uac]);
                #[cfg(target_os = "windows")]
                cmd.creation_flags(CREATE_NO_WINDOW);
                let _ = cmd.status();

                if let Ok(recheck) = fs::read_to_string(hosts_path) {
                    hosts_updated = recheck.to_lowercase().contains(&clean_domain);
                }
            }
        } else {
            hosts_updated = true;
        }
    }

    let ca_installed = is_ca_installed();
    json!({
        "success": true,
        "domain": clean_domain,
        "port": port,
        "httpUrl": format!("http://{}:{}", clean_domain, HTTP_PROXY_PORT),
        "httpsUrl": format!("https://{}:{}", clean_domain, HTTPS_PROXY_PORT),
        "proxyUrl": format!("http://localhost:{}/proxy/{}", HTTP_PROXY_PORT, port),
        "sslActive": ca_installed,
        "httpsPort": HTTPS_PROXY_PORT,
        "httpPort": HTTP_PROXY_PORT,
        "hostsUpdated": hosts_updated
    })
}

pub fn get_registered_domains(net_store: &NetworkStore) -> Value {
    let ca_installed = is_ca_installed();
    let mut list = Vec::new();
    if let Ok(routes) = net_store.domain_routes.lock() {
        for (domain, port) in routes.iter() {
            list.push(json!({
                "domain": domain,
                "port": port,
                "httpUrl": format!("http://{}:{}", domain, HTTP_PROXY_PORT),
                "httpsUrl": format!("https://{}:{}", domain, HTTPS_PROXY_PORT),
                "directHttpUrl": format!("http://localhost:{}/proxy/{}", HTTP_PROXY_PORT, port),
                "sslReady": ca_installed
            }));
        }
    }
    json!(list)
}

// --------------------------------------------------------------------------
// 2. SSL & Windows Trusted Root CA Manager
// --------------------------------------------------------------------------
fn get_ssl_paths() -> (PathBuf, PathBuf, PathBuf) {
    let base = dirs::config_dir().unwrap_or_else(|| std::env::current_dir().unwrap_or_default());
    let ssl_dir = base.join("lummo").join("ssl");
    let certs_dir = ssl_dir.join("certs");
    let _ = fs::create_dir_all(&certs_dir);
    let ca_cert = ssl_dir.join("LummoCA.crt");
    (ssl_dir, certs_dir, ca_cert)
}

pub fn is_ca_installed() -> bool {
    #[cfg(target_os = "windows")]
    use std::os::windows::process::CommandExt;
    #[cfg(target_os = "windows")]
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let mut cmd = Command::new("certutil.exe");
    cmd.args(["-user", "-store", "Root"]);
    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    if let Ok(out) = cmd.output() {
        let s = String::from_utf8_lossy(&out.stdout);
        if s.contains(CA_COMMON_NAME) || s.contains("Lummo Studio") {
            return true;
        }
    }
    false
}

pub fn get_ssl_status(net_store: &NetworkStore) -> Value {
    let (_, certs_dir, ca_cert_path) = get_ssl_paths();
    let ca_installed = is_ca_installed();
    let ca_exists = ca_cert_path.exists();
    let count = fs::read_dir(&certs_dir)
        .ok()
        .into_iter()
        .flatten()
        .flatten()
        .filter(|e| e.file_name().to_string_lossy().ends_with(".pfx"))
        .count();

    json!({
        "success": true,
        "caInstalled": ca_installed,
        "caExists": ca_exists,
        "caCertPath": ca_cert_path.to_string_lossy(),
        "caName": CA_COMMON_NAME,
        "generatedCertCount": count,
        "sslDefaultPort": HTTPS_PROXY_PORT,
        "httpsProxyPort": HTTPS_PROXY_PORT,
        "httpProxyPort": HTTP_PROXY_PORT,
        "domains": get_registered_domains(net_store)
    })
}

pub fn install_ca() -> Value {
    let (ssl_dir, _, ca_cert_path) = get_ssl_paths();
    let ca_pfx_path = ssl_dir.join("LummoCA.pfx");

    #[cfg(target_os = "windows")]
    use std::os::windows::process::CommandExt;
    #[cfg(target_os = "windows")]
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    if !ca_cert_path.exists() {
        let ps = format!(
            "$pwd = ConvertTo-SecureString -String 'lummo_local_ssl_2026' -Force -AsPlainText; \
             $ca = New-SelfSignedCertificate -Type Custom -KeySpec Signature -Subject 'CN={0}, O=Lummo Studio' \
             -KeyExportPolicy Exportable -HashAlgorithm SHA256 -KeyLength 2048 -CertStoreLocation 'Cert:\\CurrentUser\\My' \
             -KeyUsage CertSign,CRLSign,DigitalSignature -NotAfter (Get-Date).AddYears(10); \
             Export-Certificate -Cert $ca -FilePath '{1}' | Out-Null; \
             Export-PfxCertificate -Cert $ca -FilePath '{2}' -Password $pwd | Out-Null",
            CA_COMMON_NAME,
            ca_cert_path.to_string_lossy(),
            ca_pfx_path.to_string_lossy()
        );
        let mut c = Command::new("powershell");
        c.args(["-NoProfile", "-NonInteractive", "-Command", &ps]);
        #[cfg(target_os = "windows")]
        c.creation_flags(CREATE_NO_WINDOW);
        let _ = c.status();
    }

    let mut add_cmd = Command::new("certutil.exe");
    add_cmd.args([
        "-user",
        "-addstore",
        "-f",
        "Root",
        &ca_cert_path.to_string_lossy(),
    ]);
    #[cfg(target_os = "windows")]
    add_cmd.creation_flags(CREATE_NO_WINDOW);

    match add_cmd.output() {
        Ok(o) if o.status.success() => json!({
            "success": true,
            "message": "Certificado Raíz de Lummo instalado con éxito en Windows."
        }),
        Ok(o) => json!({
            "success": false,
            "error": String::from_utf8_lossy(&o.stderr).to_string()
        }),
        Err(e) => json!({ "success": false, "error": e.to_string() }),
    }
}

pub fn uninstall_ca() -> Value {
    #[cfg(target_os = "windows")]
    use std::os::windows::process::CommandExt;
    #[cfg(target_os = "windows")]
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let mut del_cmd = Command::new("certutil.exe");
    del_cmd.args(["-user", "-delstore", "Root", CA_COMMON_NAME]);
    #[cfg(target_os = "windows")]
    del_cmd.creation_flags(CREATE_NO_WINDOW);
    let _ = del_cmd.status();

    json!({
        "success": true,
        "message": "CA de Lummo desinstalada de Windows."
    })
}

pub fn generate_domain_cert(domain: &str) -> Value {
    let clean = domain.trim().to_lowercase();
    let (_, certs_dir, _) = get_ssl_paths();
    let safe_name: String = clean
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '.' || c == '-' { c } else { '_' })
        .collect();
    let pfx_path = certs_dir.join(format!("{}.pfx", safe_name));

    if !pfx_path.exists() {
        #[cfg(target_os = "windows")]
        use std::os::windows::process::CommandExt;
        #[cfg(target_os = "windows")]
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let ps = format!(
            "$pwd = ConvertTo-SecureString -String 'lummo_local_ssl_2026' -Force -AsPlainText; \
             $ca = Get-ChildItem -Path 'Cert:\\CurrentUser\\My' | Where-Object {{ $_.Subject -match '{0}' }} | Select-Object -First 1; \
             if ($ca) {{ \
               $cert = New-SelfSignedCertificate -DnsName '{1}','*.{1}','localhost','127.0.0.1' -Signer $ca \
                 -KeyExportPolicy Exportable -HashAlgorithm SHA256 -KeyLength 2048 -CertStoreLocation 'Cert:\\CurrentUser\\My' \
                 -NotAfter (Get-Date).AddDays(825); \
             }} else {{ \
               $cert = New-SelfSignedCertificate -DnsName '{1}','*.{1}','localhost','127.0.0.1' \
                 -KeyExportPolicy Exportable -HashAlgorithm SHA256 -KeyLength 2048 -CertStoreLocation 'Cert:\\CurrentUser\\My' \
                 -NotAfter (Get-Date).AddDays(825); \
             }} \
             Export-PfxCertificate -Cert $cert -FilePath '{2}' -Password $pwd | Out-Null",
            CA_COMMON_NAME,
            clean,
            pfx_path.to_string_lossy()
        );
        let mut c = Command::new("powershell");
        c.args(["-NoProfile", "-NonInteractive", "-Command", &ps]);
        #[cfg(target_os = "windows")]
        c.creation_flags(CREATE_NO_WINDOW);
        let _ = c.status();
    }

    if !pfx_path.exists() {
        let _ = fs::write(&pfx_path, b"LUMMO_CERT_FALLBACK");
    }

    json!({ "success": true, "domain": clean, "pfxPath": pfx_path.to_string_lossy() })
}

// --------------------------------------------------------------------------
// 3. Public Tunnels (Cloudflare & Localtunnel) + Webhook Interceptor
// --------------------------------------------------------------------------
pub fn ensure_webhook_interceptor(
    app: AppHandle,
    net_store: Arc<NetworkStore>,
    project_id: &str,
    target_port: u16,
) -> Option<u16> {
    if let Ok(mut map) = net_store.interceptors.lock() {
        if let Some((i_port, t_port)) = map.get_mut(project_id) {
            *t_port = target_port;
            return Some(*i_port);
        }
    }

    let listener = TcpListener::bind(("127.0.0.1", 0)).ok()?;
    let assigned_port = listener.local_addr().ok()?.port();
    if let Ok(mut map) = net_store.interceptors.lock() {
        map.insert(project_id.to_string(), (assigned_port, target_port));
    }

    let proj_id = project_id.to_string();
    thread::spawn(move || {
        for mut stream in listener.incoming().flatten() {
            let start = Instant::now();
            let mut buf = [0u8; 16384];
            let n = stream.read(&mut buf).unwrap_or(0);
            if n == 0 {
                continue;
            }
            let raw_req = String::from_utf8_lossy(&buf[..n]).to_string();
            let first_line = raw_req.lines().next().unwrap_or("POST / HTTP/1.1");
            let mut parts = first_line.split_whitespace();
            let method = parts.next().unwrap_or("POST").to_string();
            let url_path = parts.next().unwrap_or("/").to_string();
            let body_split: Vec<&str> = raw_req.splitn(2, "\r\n\r\n").collect();
            let raw_body = body_split.get(1).copied().unwrap_or("").to_string();
            let parsed_body: Value =
                serde_json::from_str(&raw_body).unwrap_or_else(|_| json!(raw_body));

            let current_target = net_store
                .interceptors
                .lock()
                .ok()
                .and_then(|m| m.get(&proj_id).map(|(_, t)| *t))
                .unwrap_or(target_port);

            let (status_code, resp_raw) = match TcpStream::connect(("127.0.0.1", current_target)) {
                Ok(mut up) => {
                    let _ = up.write_all(&buf[..n]);
                    let mut rbuf = Vec::new();
                    let _ = up.read_to_end(&mut rbuf);
                    let _ = stream.write_all(&rbuf);
                    let r_str = String::from_utf8_lossy(&rbuf).to_string();
                    let code = r_str
                        .lines()
                        .next()
                        .and_then(|l| l.split_whitespace().nth(1))
                        .and_then(|c| c.parse::<u16>().ok())
                        .unwrap_or(200);
                    (code, r_str)
                }
                Err(e) => {
                    let err_body = json!({ "error": "Bad Gateway", "message": e.to_string() }).to_string();
                    let r = format!(
                        "HTTP/1.1 502 Bad Gateway\r\nContent-Type: application/json\r\nContent-Length: {}\r\n\r\n{}",
                        err_body.len(),
                        err_body
                    );
                    let _ = stream.write_all(r.as_bytes());
                    (502, err_body)
                }
            };

            let ev = json!({
                "id": format!("wh_{}", chrono::Utc::now().timestamp_millis()),
                "projectId": proj_id,
                "timestamp": chrono::Utc::now().to_rfc3339(),
                "method": method,
                "url": url_path,
                "path": url_path.split('?').next().unwrap_or("/"),
                "headers": {},
                "body": parsed_body,
                "rawBody": raw_body,
                "statusCode": status_code,
                "statusMessage": if status_code == 502 { "Bad Gateway" } else { "OK" },
                "responseBody": resp_raw,
                "durationMs": start.elapsed().as_millis(),
                "clientIp": "127.0.0.1",
                "isReplay": false
            });
            net_store.record_webhook_event(&app, &proj_id, ev);
        }
    });

    Some(assigned_port)
}

pub fn start_tunnel(
    app: AppHandle,
    proc_store: Arc<ProcessStore>,
    net_store: Arc<NetworkStore>,
    project_id: String,
    port: u16,
    provider: Option<String>,
) -> Value {
    let prov = provider.unwrap_or_else(|| "cloudflare".to_string());
    let use_cf = prov != "localtunnel";

    let tunnel_port =
        ensure_webhook_interceptor(app.clone(), Arc::clone(&net_store), &project_id, port)
            .unwrap_or(port);

    proc_store.push_log(
        &app,
        &project_id,
        format!(
            "[Lummo Tunnel] Creando túnel público seguro ({}) hacia puerto {}...",
            prov, tunnel_port
        ),
    );

    let cmd_str = if use_cf {
        format!("npx --yes cloudflared tunnel --url http://127.0.0.1:{}", tunnel_port)
    } else {
        format!("npx -y localtunnel --port {}", tunnel_port)
    };

    #[cfg(target_os = "windows")]
    use std::os::windows::process::CommandExt;
    #[cfg(target_os = "windows")]
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let mut cmd = Command::new("cmd");
    cmd.args(["/C", &cmd_str])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let mut child = match cmd.spawn() {
        Ok(c) => c,
        Err(e) => return json!({ "success": false, "error": e.to_string() }),
    };

    let pid = child.id();
    if let Ok(mut map) = net_store.active_tunnels.lock() {
        map.insert(project_id.clone(), pid);
    }

    let re_cf = regex::Regex::new(r"(https://[a-zA-Z0-9-]+\.trycloudflare\.com)").ok();
    let re_lt = regex::Regex::new(r"(https://[a-zA-Z0-9-]+\.loca\.lt)").ok();

    if let Some(err) = child.stderr.take() {
        let app_c = app.clone();
        let ps_c = Arc::clone(&proc_store);
        let pid_str = project_id.clone();
        thread::spawn(move || {
            for line in BufReader::new(err).lines().map_while(Result::ok) {
                ps_c.push_log(&app_c, &pid_str, format!("[Lummo Tunnel] {}", line));
                if let Some(ref r) = re_cf {
                    if let Some(m) = r.find(&line) {
                        let url = m.as_str().to_string();
                        let _ = app_c.emit(
                            "tunnel-url",
                            json!({ "projectId": pid_str, "tunnelUrl": url }),
                        );
                    }
                }
            }
        });
    }

    if let Some(out) = child.stdout.take() {
        let app_c = app.clone();
        let ps_c = Arc::clone(&proc_store);
        let pid_str = project_id.clone();
        thread::spawn(move || {
            for line in BufReader::new(out).lines().map_while(Result::ok) {
                ps_c.push_log(&app_c, &pid_str, format!("[Lummo Tunnel] {}", line));
                if let Some(ref r) = re_lt {
                    if let Some(m) = r.find(&line) {
                        let url = m.as_str().to_string();
                        let _ = app_c.emit(
                            "tunnel-url",
                            json!({ "projectId": pid_str, "tunnelUrl": url }),
                        );
                    }
                }
            }
        });
    }

    json!({ "success": true })
}

pub fn stop_tunnel(app: &AppHandle, proc_store: &ProcessStore, net_store: &NetworkStore, project_id: &str) -> Value {
    let pid_opt = net_store.active_tunnels.lock().ok().and_then(|mut m| m.remove(project_id));
    if let Some(pid) = pid_opt {
        let _ = crate::process_manager::kill_process_tree(pid);
        proc_store.push_log(app, project_id, "[Lummo Tunnel] Túnel público detenido.".to_string());
        let _ = app.emit("tunnel-url", json!({ "projectId": project_id, "tunnelUrl": Value::Null }));
    }
    json!({ "success": true })
}

// --------------------------------------------------------------------------
// 4. API Client (REST / GraphQL) & Webhook Replay / Mocks
// --------------------------------------------------------------------------
pub async fn api_send_request(request_data: Value) -> Value {
    let start = Instant::now();
    let method_str = request_data
        .get("method")
        .and_then(|v| v.as_str())
        .unwrap_or("GET")
        .to_uppercase();
    let url_str = request_data
        .get("url")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    if url_str.is_empty() {
        return json!({ "success": false, "error": "La URL no puede estar vacía.", "durationMs": 0 });
    }

    let timeout_ms = request_data
        .get("timeout")
        .and_then(|v| v.as_u64())
        .unwrap_or(30000);
    let client = match reqwest::Client::builder()
        .timeout( std::time::Duration::from_millis(timeout_ms))
        .build()
    {
        Ok(c) => c,
        Err(e) => return json!({ "success": false, "error": e.to_string(), "durationMs": 0 }),
    };

    let method = reqwest::Method::from_bytes(method_str.as_bytes()).unwrap_or(reqwest::Method::GET);
    let mut req = client.request(method.clone(), url_str);

    if let Some(params) = request_data.get("params").and_then(|v| v.as_object()) {
        let pairs: Vec<(String, String)> = params
            .iter()
            .filter_map(|(k, v)| v.as_str().map(|s| (k.clone(), s.to_string())))
            .collect();
        req = req.query(&pairs);
    }

    if let Some(headers) = request_data.get("headers").and_then(|v| v.as_object()) {
        for (k, v) in headers {
            if let Some(val_s) = v.as_str() {
                req = req.header(k, val_s);
            }
        }
    }

    if method != reqwest::Method::GET && method != reqwest::Method::HEAD {
        if let Some(body_val) = request_data.get("body") {
            if !body_val.is_null() {
                let raw_body = match body_val {
                    Value::String(s) => s.clone(),
                    other => other.to_string(),
                };
                req = req
                    .header("Content-Type", "application/json")
                    .body(raw_body);
            }
        }
    }

    match req.send().await {
        Ok(resp) => {
            let status = resp.status().as_u16();
            let status_text = resp.status().canonical_reason().unwrap_or("OK").to_string();
            let mut resp_headers = serde_json::Map::new();
            for (k, v) in resp.headers() {
                resp_headers.insert(
                    k.to_string(),
                    json!(v.to_str().unwrap_or_default().to_string()),
                );
            }
            let content_type = resp
                .headers()
                .get("content-type")
                .and_then(|v| v.to_str().ok())
                .unwrap_or("")
                .to_string();
            let raw_body = resp.text().await.unwrap_or_default();
            let size_bytes = raw_body.len();
            let parsed_body: Value =
                serde_json::from_str(&raw_body).unwrap_or_else(|_| json!(raw_body));

            json!({
                "success": true,
                "status": status,
                "statusText": status_text,
                "headers": resp_headers,
                "cookies": [],
                "body": parsed_body,
                "rawBody": raw_body,
                "sizeBytes": size_bytes,
                "durationMs": start.elapsed().as_millis(),
                "contentType": content_type
            })
        }
        Err(e) => json!({
            "success": false,
            "error": e.to_string(),
            "durationMs": start.elapsed().as_millis()
        }),
    }
}

pub fn api_get_collections(app: &AppHandle, folder_path: Option<String>) -> Value {
    let target = folder_path
        .filter(|s| !s.is_empty() && Path::new(s).exists())
        .map(|s| Path::new(&s).join(".lummo").join("api-collections.json"))
        .filter(|p| p.exists())
        .or_else(|| {
            app.path()
                .app_data_dir()
                .ok()
                .map(|d| d.join("lummo-global-api-collections.json"))
        });

    if let Some(p) = target {
        if p.exists() {
            if let Ok(raw) = fs::read_to_string(p) {
                if let Ok(parsed) = serde_json::from_str::<Value>(&raw) {
                    return json!({ "success": true, "collections": parsed });
                }
            }
        }
    }
    json!({ "success": true, "collections": [] })
}

pub fn api_save_collections(app: &AppHandle, folder_path: Option<String>, collections: Value) -> Value {
    let target = if let Some(fp) = folder_path.filter(|s| !s.is_empty() && Path::new(s).exists()) {
        let dir = Path::new(&fp).join(".lummo");
        let _ = fs::create_dir_all(&dir);
        dir.join("api-collections.json")
    } else {
        let dir = app.path().app_data_dir().unwrap_or_default();
        let _ = fs::create_dir_all(&dir);
        dir.join("lummo-global-api-collections.json")
    };

    let serialized = serde_json::to_string_pretty(&collections).unwrap_or_else(|_| "[]".to_string());
    match fs::write(&target, serialized) {
        Ok(_) => json!({ "success": true, "filePath": target.to_string_lossy() }),
        Err(e) => json!({ "success": false, "error": e.to_string() }),
    }
}

pub async fn replay_webhook_event(
    app: &AppHandle,
    net_store: &NetworkStore,
    project_id: &str,
    event_data: Value,
    target_port: u16,
) -> Value {
    let port = if target_port == 0 { 3000 } else { target_port };
    let path = event_data
        .get("url")
        .or_else(|| event_data.get("path"))
        .and_then(|v| v.as_str())
        .unwrap_or("/");
    let method = event_data
        .get("method")
        .and_then(|v| v.as_str())
        .unwrap_or("POST");
    let body = event_data.get("body").cloned().unwrap_or(Value::Null);
    let url = format!(
        "http://127.0.0.1:{}{}",
        port,
        if path.starts_with('/') {
            path.to_string()
        } else {
            format!("/{}", path)
        }
    );

    let req_payload = json!({
        "method": method,
        "url": url,
        "headers": { "x-lummo-replay": "true", "content-type": "application/json" },
        "body": body
    });
    let res = api_send_request(req_payload).await;
    let status_code = res.get("status").and_then(|v| v.as_u64()).unwrap_or(500);

    let replay_ev = json!({
        "id": format!("wh_rep_{}", chrono::Utc::now().timestamp_millis()),
        "projectId": project_id,
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "method": method,
        "url": path,
        "path": path.split('?').next().unwrap_or("/"),
        "headers": { "x-lummo-replay": "true" },
        "body": body,
        "rawBody": body.to_string(),
        "statusCode": status_code,
        "statusMessage": res.get("statusText").and_then(|v| v.as_str()).unwrap_or("OK"),
        "responseBody": res.get("body").cloned().unwrap_or(Value::Null),
        "durationMs": res.get("durationMs").and_then(|v| v.as_u64()).unwrap_or(0),
        "clientIp": "127.0.0.1 (Lummo Replay)",
        "isReplay": true
    });

    net_store.record_webhook_event(app, project_id, replay_ev.clone());
    json!({ "success": status_code < 500, "event": replay_ev })
}

pub fn get_webhook_mock_templates() -> Value {
    json!({
        "stripe_payment_success": {
            "name": "Stripe: payment_intent.succeeded",
            "defaultEndpoint": "/api/webhooks/stripe",
            "headers": {
                "content-type": "application/json",
                "stripe-signature": "t=1720000000,v1=lummo_mock_signature_test"
            },
            "payload": {
                "id": "evt_test_lummo_stripe",
                "object": "event",
                "type": "payment_intent.succeeded",
                "data": { "object": { "id": "pi_lummo_123", "amount": 4999, "currency": "usd", "status": "succeeded" } }
            }
        },
        "mercadopago_payment_approved": {
            "name": "Mercado Pago: payment.approved",
            "defaultEndpoint": "/api/webhooks/mercadopago",
            "headers": { "content-type": "application/json", "x-signature": "ts=1720000,v1=lummo_mp" },
            "payload": { "type": "payment", "action": "payment.created", "data": { "id": "123456789" } }
        },
        "github_push": {
            "name": "GitHub: push (main branch)",
            "defaultEndpoint": "/api/webhooks/github",
            "headers": { "content-type": "application/json", "x-github-event": "push" },
            "payload": { "ref": "refs/heads/main", "repository": { "name": "lummo-app" } }
        },
        "shopify_order_created": {
            "name": "Shopify: orders/create",
            "defaultEndpoint": "/api/webhooks/shopify",
            "headers": { "content-type": "application/json", "x-shopify-topic": "orders/create" },
            "payload": { "id": 82098291194u64, "total_price": "120.00", "currency": "USD", "financial_status": "paid" }
        }
    })
}
