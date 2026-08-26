# Project Management & Tech Stacks

<p align="center">
  <strong>Lummo Studio v2.3.0 — Technical Module 02 (English)</strong>
</p>

<p align="center">
  <a href="../INDEX_EN.md">← Back to Main Index</a> | 
  <a href="../es/02_gestion_de_proyectos_y_stacks.md">Versión en Español</a>
</p>

---

## 1. Auto-Detection Engine (`detector.js`)

Lummo Studio features an automated static analysis engine in `electron/detector.js` that scans selected root directories to identify tech stacks and framework dependencies.

### Classification Rules:

| Detected Stack | Matching Manifest & Signatures | Default Startup Command |
| :--- | :--- | :--- |
| **Vite + React / Vue / TS** | `package.json` with `vite` dependency | `npm run dev` |
| **Next.js** | `next.config.js`, `next.config.mjs`, or `next` dependency | `npm run dev` |
| **Express / Node.js API** | `package.json` with `express` and `index.js` or `server.js` | `node server.js` / `npm start` |
| **PHP / Laravel** | `composer.json` and/or `artisan` executable | `php artisan serve` |
| **Python Web** | `requirements.txt`, `pyproject.toml`, `manage.py`, or `main.py` | `python manage.py runserver` / `uvicorn main:app` |
| **Static HTML5** | `index.html` without module bundler manifests | Built-in Static HTTP Server |

---

## 2. Process Manager (`processManager.js`)

`electron/processManager.js` handles sub-process spawning, streaming execution logs, and socket monitoring.

- **Child Process Spawning**: Spawns OS shell instances (`cmd.exe` / `powershell.exe` on Windows) via `child_process.spawn()`.
- **Real-Time Log Streaming**: Streams `stdout` and `stderr` output to the React UI via IPC channels (`project:log-data`), delivering zero-latency terminal log rendering.
- **Port Conflict Resolution**: Before launching a server process on a target port (e.g., `3000`), the process manager performs a TCP socket check. If the port is in use, Lummo Studio suggests dynamically allocating an open available port.

---

## 3. Git Integration & Dependency Managers

Lummo Studio streamlines repository management directly from the UI:

### 3.1 Git GUI Workflows
- **Remote Repository Cloning**: Using `CloneRepoModal.jsx`, developers can paste remote URLs (`https://github.com/user/repo.git`), select target directories, and execute git clones visually.
- **Branch Telemetry**: Displays the active Git branch and fetch status without terminal commands.

### 3.2 Multi-Manager Dependency Installation
From `DependencyManagerModal.jsx`, Lummo Studio triggers dependency resolution using detected tools:

```text
Supported Package Managers:
├── Node.js: npm | yarn | pnpm | bun
├── PHP: composer
└── Python: pip / pipenv
```

---

## 4. Environment Variables Editor (`.env`)

Each registered project includes an integrated environment variable manager:

- **Parsing**: Automatically parses `.env`, `.env.local`, and `.env.example` files.
- **Masked Input**: Masks secret tokens, database passwords, and API keys.
- **Disk Sync**: Writes changes directly to the target `.env` file and optionally restarts active dev servers.
