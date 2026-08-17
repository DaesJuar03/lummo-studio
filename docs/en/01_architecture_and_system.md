# System Architecture & IPC Process

<p align="center">
  <strong>Lummo Studio v2.1.0 — Technical Module 01 (English)</strong>
</p>

<p align="center">
  <a href="../INDEX_EN.md">← Back to Main Index</a> | 
  <a href="../es/01_arquitectura_y_sistema.md">Versión en Español</a>
</p>

---

## 1. Architectural Overview

**Lummo Studio** is built on top of **Electron 34**, **React 19**, **Vite 6**, and **Tailwind CSS 4**. It adheres to Electron's decoupled process model, where the **Main Process** manages operating system APIs, file system access, and background sub-processes, while the **Renderer Process** handles the modular React user interface.

```mermaid
graph TD
    subgraph Renderer Process - UI (React 19 + Vite 6)
        A[App.jsx - Root Shell] --> B[HomeDashboard.jsx]
        A --> C[ProjectsPanel & ProjectDetailPage]
        A --> D[DatabasesPanel & DatabaseDetailPage]
        A --> E[SQLiteWorkbench.jsx]
        A --> F[Modals: ErDiagram, SchemaDesigner, Tunnel, etc.]
    end

    subgraph Preload & IPC Bridge
        G[preload.cjs - contextBridge]
    end

    subgraph Main Process - Electron Main (Node.js)
        H[main.cjs - LifeCycle Orchestrator] --> I[dbManager.cjs - SQLite Persistence]
        H --> J[processManager.js - Spawn & Log Streamer]
        H --> K[detector.js & scanner.js - Static Analysis]
        H --> L[proxyManager.cjs & tunnelManager.cjs]
        H --> M[managers/trayManager.cjs & windowManager.cjs]
    end

    A <-->|window.electronAPI IPC| G
    G <-->|ipcRenderer / ipcMain| H
```

---

## 2. Main Process Architecture

The Main process entrypoint is `electron/main.cjs`. Key responsibilities include:

1. **Application Lifecycle Management**:
   - Initializing `BrowserWindow` instances with security hardening (`contextIsolation: true`, `nodeIntegration: false`).
   - Single-instance application lock enforcement (`app.requestSingleInstanceLock()`).
   - Registering system tray notifications via `trayManager.cjs`.

2. **Modular IPC Handler Registration**:
   Inter-Process Communication (IPC) handlers are decoupled into domain-specific modules inside `electron/ipc/`:

| Handler File | Domain Responsibility | Primary IPC Events |
| :--- | :--- | :--- |
| `systemHandlers.cjs` | OS level interactions | `system:get-info`, `system:open-path`, `system:pick-directory` |
| `projectHandlers.cjs` | Project scanning and process execution | `project:scan`, `project:start`, `project:stop`, `project:get-logs`, `git:clone` |
| `dbHandlers.cjs` | Relational SQL database connectivity | `db:test-connection`, `db:execute-query`, `db:get-schema`, `db:export` |
| `tunnelProxyHandlers.cjs` | Local proxy, HTTPS tunnels, and SSL | `tunnel:start`, `tunnel:stop`, `ssl:generate-cert` |

---

## 3. Persistence Engine (`dbManager.cjs`)

Lummo Studio uses an internal local SQLite database engine to persist project registries, execution metadata, and database connection profiles.

- **Persistence Storage Location**: Saved in user application data directory as `lummo_local.db` (with `lummo_projects.json` as a fallback).
- **Internal Database Schema**:
  - `projects` table: Stores project root paths, detected tech stacks, default ports, custom `.env` overrides, and npm/artisan scripts.
  - `db_connections` table: Retains encrypted connection profiles for MySQL, PostgreSQL, and local SQLite database files.
  - `system_settings` table: Global options (UI color theme, executable paths for Node/PHP/Python, proxy ports).

---

## 4. IPC Communication Bridge (`preload.cjs`)

`electron/preload.cjs` exposes safe asynchronous IPC methods to `window.electronAPI` using Electron's `contextBridge.exposeInMainWorld()`.

### IPC API Invocation Example:

```javascript
// Invoked from Renderer (React)
const result = await window.electronAPI.executeSqlQuery({
  engine: 'sqlite',
  connectionId: 'conn-123',
  sql: 'SELECT * FROM users LIMIT 50;'
});
```

---

## 5. Renderer Process (React 19 Shell)

The UI is a Single Page Application (SPA) built with **React 19** and bundled using **Vite 6**.

- **Entrypoint**: `src/main.jsx` mounts `<App />` wrapped in global providers for internationalization (i18n), project state, and tab navigation.
- **Tab Navigation Engine**: Managed by `src/hooks/useTabNavigation.js`, allowing users to open multiple independent views in parallel (Dashboard, Project Detail, Database Workbench, Standalone Terminal).
- **Primary Views**:
  - `HomeDashboard.jsx`: Executive overview of system telemetry, active project cards, and database quick-launches.
  - `ProjectsPanel.jsx` & `ProjectDetailPage.jsx`: Live terminal log streamer, script runner, and `.env` manager.
  - `DatabasesPanel.jsx` & `DatabaseDetailPage.jsx`: SQL query console, ER diagram viewer, and table inspector.

---

## 6. IPC Security & Error Handling

1. **Context Isolation**: Renderer code has no direct access to Node.js filesystem or native child processes. All operations require validated IPC requests.
2. **Input Sanitization**: IPC controllers validate parameter payloads before executing OS commands or database queries.
