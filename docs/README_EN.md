<p align="center">
  <img src="../public/Lummo.png" alt="Lummo Studio Logo" width="160" />
</p>

<h1 align="center">Lummo Studio v2.1.0 — Consolidated Manual (English)</h1>

<p align="center">
  <strong>Modern Control Panel for Local Development Environments & Relational Database Management</strong>
</p>

<p align="center">
  <a href="../README.md">Main Landing Page</a> &nbsp;|&nbsp; 
  <a href="INDEX_EN.md"><strong>[Documentation Index]</strong></a> &nbsp;|&nbsp; 
  <a href="README_ES.md">Versión en Español</a>
</p>

---

## 1. Executive Summary

**Lummo Studio** is a high-performance desktop control panel designed for local web servers and relational database management. Built as a modern modular replacement for legacy stacks like XAMPP, WampServer, or MAMP, it consolidates project telemetry, terminal script execution, public network tunnels, and SQL database browsing into a single desktop application.

---

## 2. Navigable Technical Modules

For specialized documentation, refer to the individual module guides:

| Technical Module | Module Description |
| :--- | :--- |
| 📄 **[Documentation Index](INDEX_EN.md)** | Complete documentation sitemap and index. |
| 🏗️ **[01. System Architecture](en/01_architecture_and_system.md)** | Electron Main process, IPC handlers, React 19 shell, and SQLite persistence. |
| 🚀 **[02. Project Management](en/02_project_management_and_stacks.md)** | Auto-detection engine (Vite, Next.js, Express, Laravel, Python), terminal logs, and Git integration. |
| 🗄️ **[03. Database Workbench](en/03_database_workbench_and_diagrams.md)** | SQLite, MySQL, PostgreSQL support, ER Diagrams, Schema Designer, and Mock Data generator. |
| 🌐 **[04. Network & System Services](en/04_network_tunnels_and_tray.md)** | Local proxy, HTTPS tunnels, local SSL certs, System Tray, and Omnibox search (`Ctrl+K`). |
| 🛠️ **[05. Developer Guide](en/05_developer_guide_build_and_tests.md)** | Setup steps, Vitest test suite, building executable installers with Electron Builder, and i18n guide. |

---

## 3. Core Feature Highlights

- **Multi-Stack Auto-Detection**: Instant framework detection for Node.js, React, Next.js, Express, PHP/Laravel, and Python projects.
- **Relational Database Workbench**: Native support for **SQLite**, **MySQL / MariaDB**, and **PostgreSQL**.
- **Entity-Relationship (ER) Diagram Engine**: Interactive schema visualizer built on HTML5 Canvas with PNG/SVG export.
- **Git & Package Managers**: GUI cloning of remote Git repositories with support for `npm`, `yarn`, `pnpm`, `bun`, `composer`, and `pip`.
- **Public HTTPS Tunnels & Local SSL**: Share local dev servers publicly for webhooks and mobile testing with self-signed SSL certs.
- **System Tray Operations**: Persistent tray background execution to keep local servers running when the app window is closed.

---

## 4. System Requirements

- **Operating System**: Windows 10 / Windows 11 (64-bit).
- **Runtime**: Node.js v18.0.0 or higher.
- **Tooling**: Git CLI installed and available in system `PATH`.

---

## 5. Development Setup

```bash
# 1. Clone repository
git clone https://github.com/your-username/lummo-studio.git
cd lummo-studio

# 2. Install dependencies
npm install

# 3. Launch in development mode
npm run electron:dev

# 4. Run automated tests
npm test
```

---

## 6. Building & Distribution

To compile production bundles and package Windows binary executables:

```bash
# Step 1: Build web bundle
npm run build

# Step 2: Build executable native binaries in release/
npx electron-builder
```

Output binaries will be saved in `release/`:
- `Lummo Studio Setup 2.1.0.exe` (NSIS Installer)
- `Lummo Studio 2.1.0.exe` (Portable Executable)

---

## 7. Global Keyboard Shortcuts

| Shortcut | Action Description |
| :--- | :--- |
| `Ctrl + K` / `Cmd + K` | Toggle Omnibox Search Palette |
| `Alt + N` | Open Project Import Modal |
| `Alt + P` | Navigate to Projects Dashboard |
| `Alt + D` | Navigate to Database Workbench |
| `Alt + S` | Open System Settings |
| `Escape` | Close Active Modal |

---

## 8. License

Distributed under the MIT License. See `LICENSE` for details.
