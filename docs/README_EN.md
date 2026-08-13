<p align="center">
  <img src="../public/Lummo.png" alt="Lummo Studio Logo" width="160" />
</p>

<h1 align="center">Lummo Studio v2.1.0 — Official Documentation (English)</h1>

<p align="center">
  <strong>Modern Control Panel for Local Development Environments & Relational Database Management</strong>
</p>

<p align="center">
  <a href="../README.md">Main Overview</a> | 
  <a href="README_ES.md">Documentación en Español</a>
</p>

---

## 1. Overview

**Lummo Studio** is a cross-platform desktop application engineered to streamline the management of local web servers and relational databases. Designed for modern web developers, it serves as a lightweight, modular alternative to legacy stacks such as XAMPP, WampServer, or MAMP.

The platform provides unified controls for multi-stack web projects (Vite, React, Next.js, Express, PHP/Laravel, Python), alongside an embedded SQL workbench, Entity-Relationship (ER) diagram generation, network telemetry, and public tunneling capabilities.

---

## 2. Key Capabilities

### 2.1 Multi-Stack Project Management
- **Automatic Stack Detection**: Detects framework configurations (`Vite + React`, `Next.js`, `Express`, `PHP / Laravel`, `Python`) upon selecting a workspace folder.
- **Dynamic Port Resolution**: Scans system networking interfaces and assigns unoccupied ports automatically.
- **Integrated Script Execution**: Runs custom scripts (`npm run build`, database migrations) with real-time log streaming.

### 2.2 Git Integration & Dependency Management
- **Repository Cloning**: GUI wrapper to clone public Git repositories directly into target workspace paths.
- **Multi-Package Manager**: Installs project dependencies using `npm`, `yarn`, `pnpm`, `bun`, `composer`, or `pip`.

### 2.3 Relational Database Workbench
- **Multi-Engine Connectivity**: Native driver support for **SQLite**, **MySQL / MariaDB**, and **PostgreSQL**.
- **Structured SQLite Persistence**: Manages physical database files inside structured user document directories.
- **Entity-Relationship (ER) Diagrams**: Automated generation of interactive schema diagrams with zoom controls and dynamic Bezier connectors.
- **Virtualized Data Explorer**: High-performance dataset viewer optimized for rendering large tables via row virtualization.
- **Data Export & Import**: Exports and imports SQL dumps, CSV, and JSON data formats.

### 2.4 Networking & System Integration
- **System Tray Operations**: Runs silently in the notification area to keep background web servers active when closing the primary window.
- **Public Tunnels & Local SSL**: Generates local self-signed SSL certificates and creates public HTTP/HTTPS tunnels for external testing.
- **Real-Time `.env` Editor**: In-app environment variable editor with automatic service synchronization.

---

## 3. System Architecture

Lummo Studio adheres to Electron's multi-process security standards, establishing a clean boundary between the main node process and the renderer layer:

```text
Lummo Studio
├── Main Process (Electron Main)
│   ├── main.cjs               # Application lifecycle orchestrator
│   ├── managers/              # Window and tray managers
│   │   ├── windowManager.cjs  # BrowserWindow lifecycle & event bindings
│   │   └── trayManager.cjs    # System tray contextual menu management
│   ├── ipc/                   # Modular IPC controllers
│   │   ├── systemHandlers.cjs # Environment scanner & OS bridge
│   │   ├── projectHandlers.cjs# Script runner & detection handlers
│   │   ├── dbHandlers.cjs     # SQL connection drivers & queries
│   │   └── tunnelProxyHandlers.cjs # Reverse proxy & tunnel handlers
│   ├── dbManager.cjs          # Database storage engine manager
│   ├── processManager.js      # Child process & terminal execution
│   └── detector.js            # Technology stack detection engine
└── Renderer Process (React UI)
    ├── src/main.jsx           # React DOM root entrypoint
    ├── src/App.jsx            # Application shell orchestrator
    ├── src/hooks/             # Custom state hooks (useTabNavigation.js)
    ├── src/components/        # Domain-driven UI components
    │   ├── views/             # Core dashboards & page views
    │   ├── modals/            # Dialog windows & overlay panels
    │   └── common/            # Shared UI components
    ├── src/locales/           # Internationalization (i18n) engine
    └── src/types/             # TypeScript contract definitions (lummo.d.ts)
```

---

## 4. System Requirements

- **Operating System**: Windows 10 / Windows 11 (64-bit).
- **Runtime**: Node.js v18.0.0 or higher.
- **VCS**: Git installed and registered in system `PATH`.

---

## 5. Development Setup

### 5.1 Clone Repository
```bash
git clone https://github.com/your-username/lummo-studio.git
cd lummo-studio
```

### 5.2 Install Dependencies
```bash
npm install
```

### 5.3 Launch Development Environment
```bash
npm run electron:dev
```

### 5.4 Execute Test Suite
```bash
npm test
```

---

## 6. Build & Packaging

To generate a standalone production release for Windows:

1. **Build Production Assets with Vite**:
   ```bash
   npm run build
   ```

2. **Package Application Executable**:
   ```bash
   npx electron-builder
   ```

Outputs will be created inside the `release/` directory:
- `release/Lummo Studio Setup 2.1.0.exe` (NSIS Installer)
- `release/Lummo Studio 2.1.0.exe` (Portable Version)

---

## 7. Internationalization (i18n) Guide

To contribute a new locale to Lummo Studio:

1. Create a JSON translation file in `src/locales/{language_code}.json` adhering to the standard schema.
2. Register the locale in `src/locales/index.js` using `registerLocale()`.

---

## 8. Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + K` / `Cmd + K` | Toggle Omnibox Search Palette |
| `Alt + N` | Open Project Importer Dialog |
| `Alt + P` | Navigate to Projects Panel |
| `Alt + D` | Navigate to Database Panel |
| `Alt + S` | Open System Settings |
| `Escape` | Dismiss active overlay or modal |

---

## 9. License

This project is licensed under the MIT License. See `LICENSE` for details.
