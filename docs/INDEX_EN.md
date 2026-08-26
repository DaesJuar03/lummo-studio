<p align="center">
  <img src="../public/Lummo.png" alt="Lummo Studio Logo" width="140" />
</p>

<h1 align="center">Lummo Studio v2.3.0 — Documentation Index</h1>

<p align="center">
  <strong>Navigable Guide & Technical Resource Hub for Lummo Studio</strong>
</p>

<p align="center">
  <a href="../README.md">Main Landing Page</a> &nbsp;|&nbsp; 
  <a href="INDEX_ES.md">Documentación en Español</a>
</p>

---

## 📖 Welcome to the Official Lummo Studio Documentation

**Lummo Studio** is a modern local web development control panel and relational database workbench built for developers. This documentation suite provides a comprehensive guide on application architecture, project management, database administration, network tunneling, and development workflows.

---

## 🗂️ Documentation Structure

The documentation is organized into topic-specific technical modules:

```text
docs/
├── INDEX_EN.md                          # [You are here] English Documentation Index
├── INDEX_ES.md                          # Índice General de Documentación en Español
├── README_EN.md                         # Consolidated Manual / Quick Start in English
├── README_ES.md                         # Manual Consolidado / Guía Rápida en Español
├── en/                                  # English Technical Modules
│   ├── 01_architecture_and_system.md    # Architecture, Electron, IPC & React Shell
│   ├── 02_project_management_and_stacks.md # Auto-detection, Scripts, Git & Dependencies
│   ├── 03_database_workbench_and_diagrams.md # SQLite/MySQL/Postgres, ER & SQL
│   ├── 04_network_tunnels_and_tray.md   # HTTPS Tunnels, Local SSL, System Tray & Omnibox
│   └── 05_developer_guide_build_and_tests.md # Dev Setup, Vitest, Build & i18n
└── es/                                  # Módulos Técnicos en Español
    ├── 01_arquitectura_y_sistema.md
    ├── 02_gestion_de_proyectos_y_stacks.md
    ├── 03_workbench_bases_de_datos_y_diagramas.md
    ├── 04_redes_tuneles_y_tray.md
    └── 05_guia_desarrollador_compilacion_y_tests.md
```

---

## 📚 Technical Modules (English)

### 1. [System Architecture and IPC Process](en/01_architecture_and_system.md)
- **Overview**: Dual-process architecture model (Electron Main Process and React 19 Renderer Process).
- **IPC Handlers**: Technical specification of `systemHandlers`, `projectHandlers`, `dbHandlers`, and `tunnelProxyHandlers`.
- **Persistence Engine**: Operation of `dbManager.cjs` and disk-backed database storage for application state.
- **User Interface Shell**: Root orchestrator in `App.jsx`, tab management system, and real-time event streaming.

### 2. [Project Management & Tech Stacks](en/02_project_management_and_stacks.md)
- **Auto-Detection Engine**: Static analysis engine in `detector.js` for Vite, React, Next.js, Express, PHP/Laravel, and Python.
- **Process Manager**: Real-time script execution, log streaming, and dynamic port conflict resolution.
- **Git Integration & Package Managers**: GUI cloning for remote Git repositories and automated support for `npm`, `yarn`, `pnpm`, `bun`, `composer`, and `pip`.
- **Environment Management**: `.env` file editor with live disk synchronization.

### 3. [Database Workbench & ER Diagrams](en/03_database_workbench_and_diagrams.md)
- **Multi-Engine Support**: Native connectivity for SQLite (disk persistence), MySQL/MariaDB, and PostgreSQL.
- **Entity-Relationship (ER) Diagrams**: Automated interactive schema diagram generator using HTML5 Canvas with zoom and auto-layout.
- **Schema Designer & SQL Runner**: Visual table/column builder and query execution runner with virtualized data grid.
- **Advanced Tools**: Mock Data Generator for synthetic test records and SQL, JSON, and CSV export/import engines.

### 4. [Network Services, HTTPS Tunnels & System Tray](en/04_network_tunnels_and_tray.md)
- **Local Proxy & HTTPS Tunnels**: Expose local web servers to the public internet for webhooks and mobile testing.
- **SSL Certificate Engine**: Generate and manage local development SSL certificates.
- **System Tray Operations**: Persistent tray menu allowing servers to run in the background without UI overhead.
- **Omnibox Command Palette**: Global search shortcut (`Ctrl+K` / `Cmd+K`) for rapid navigation and system actions.

### 5. [Developer Guide, Building & Testing](en/05_developer_guide_build_and_tests.md)
- **Development Environment Setup**: System requirements, cloning, and dependency installation steps.
- **Automated Testing**: Running test suites with Vitest (`npm test`).
- **Production Build & Distribution**: Packaging portable executables and NSIS installers with Electron Builder (`release/`).
- **Internationalization (i18n)**: Adding and updating language dictionaries in `src/locales/`.

---

## ⚡ Quick Links & References

- 🚀 [Quick Start Guide](README_EN.md#5-installation--development-setup)
- ⌨️ [Keyboard Shortcuts Table](README_EN.md#8-keyboard-shortcuts)
- 🌍 [Índice de Documentación en Español](INDEX_ES.md)

---

## 📄 License

This project is licensed under the MIT License. See `LICENSE` for details.
