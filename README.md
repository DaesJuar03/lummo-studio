<p align="center">
  <img src="public/Lummo.png" alt="Lummo Studio Logo" width="160" />
</p>

<h1 align="center">Lummo Studio v2.3.0</h1>

<p align="center">
  <strong>Modern Control Panel for Local Development Environments & Relational Database Management</strong>
</p>

<p align="center">
  <a href="https://img.shields.io/badge/Version-2.3.0-blue"><img src="https://img.shields.io/badge/Version-2.3.0-blue?style=flat-square" alt="Version" /></a>
  <a href="https://electronjs.org"><img src="https://img.shields.io/badge/Electron-34.2-47848F?style=flat-square&logo=electron&logoColor=white" alt="Electron" /></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" /></a>
  <a href="https://vitejs.dev"><img src="https://img.shields.io/badge/Vite-6.1-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" /></a>
  <a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/Tailwind_CSS-4.0-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" /></a>
</p>

---

## 📄 Offical Documentation Suite / Suite Oficial de Documentación

Choose your preferred language for the complete professional documentation suite:
Seleccione su idioma de preferencia para la suite documental completa:

<table align="center">
  <tr>
    <th width="50%" align="center">🇪🇸 Documentación en Español</th>
    <th width="50%" align="center">🇬🇧 Documentation in English</th>
  </tr>
  <tr>
    <td>
      <ul>
        <li>📖 <strong><a href="docs/INDEX_ES.md">Índice General de Documentación</a></strong></li>
        <li>📘 <a href="docs/README_ES.md">Manual Consolidado y Guía Rápida</a></li>
        <li>🏗️ <a href="docs/es/01_arquitectura_y_sistema.md">01. Arquitectura y Sistema IPC</a></li>
        <li>🚀 <a href="docs/es/02_gestion_de_proyectos_y_stacks.md">02. Gestión de Proyectos y Stacks</a></li>
        <li>🗄️ <a href="docs/es/03_workbench_bases_de_datos_y_diagramas.md">03. Workbench de Bases de Datos y ER</a></li>
        <li>🌐 <a href="docs/es/04_redes_tuneles_y_tray.md">04. Redes, Túneles HTTPS y System Tray</a></li>
        <li>🛠️ <a href="docs/es/05_guia_desarrollador_compilacion_y_tests.md">05. Guía de Desarrollador y Pruebas</a></li>
      </ul>
    </td>
    <td>
      <ul>
        <li>📖 <strong><a href="docs/INDEX_EN.md">Documentation Master Index</a></strong></li>
        <li>📘 <a href="docs/README_EN.md">Consolidated Manual & Quick Start</a></li>
        <li>🏗️ <a href="docs/en/01_architecture_and_system.md">01. Architecture & IPC Process</a></li>
        <li>🚀 <a href="docs/en/02_project_management_and_stacks.md">02. Project Management & Stacks</a></li>
        <li>🗄️ <a href="docs/en/03_database_workbench_and_diagrams.md">03. Database Workbench & ER Diagrams</a></li>
        <li>🌐 <a href="docs/en/04_network_tunnels_and_tray.md">04. Network, HTTPS Tunnels & System Tray</a></li>
        <li>🛠️ <a href="docs/en/05_developer_guide_build_and_tests.md">05. Developer Guide, Build & Testing</a></li>
      </ul>
    </td>
  </tr>
</table>

---

## Technical Overview / Descripción Técnica

**Lummo Studio** is a modern desktop application designed to streamline the administration of local web server environments and relational databases. Built as a modular alternative to legacy stacks like XAMPP, WampServer, or MAMP, Lummo Studio unifies project telemetry, script execution, database browsing, and network utilities into a single high-performance interface.

**Lummo Studio** es una aplicación de escritorio avanzada para la administración de entornos de desarrollo web locales y bases de datos relacionales. Desarrollada como una solución modular que reemplaza a XAMPP, WampServer o MAMP, centraliza la telemetría de proyectos, ejecución de scripts, consultas SQL y utilidades de red en una interfaz unificada.

---

## Core Features / Características Principales

- **Multi-Stack Auto-Detection**: Instant configuration for Vite, React, Next.js, Express, PHP/Laravel, and Python projects.
- **Relational Database Workbench**: Native connectivity for SQLite, MySQL / MariaDB, and PostgreSQL, including virtualized data browsing.
- **Entity-Relationship (ER) Diagrams**: Automated interactive visual diagram generator for database schemas.
- **Git Integration & Package Managers**: GUI cloning of remote Git repositories with support for `npm`, `yarn`, `pnpm`, `bun`, `composer`, and `pip`.
- **System Tray Operations**: Persistent background execution for active local web servers.
- **Public Tunnels & Local SSL**: Local SSL certificate generation and HTTPS tunnel management for webhook debugging.

---

## Quick Start / Inicio Rápido

### Prerequisites / Requisitos
- Windows 10 / 11 (64-bit)
- Node.js v18.0.0+
- Git CLI

### Development Setup / Entorno de Desarrollo

```bash
# Clone repository
git clone https://github.com/your-username/lummo-studio.git
cd lummo-studio

# Install dependencies
npm install

# Run in development mode
npm run electron:dev

# Run automated tests
npm test
```

### Production Build / Compilación

```bash
# Build frontend bundle
npm run build

# Build Windows executable installer (.exe)
npx electron-builder
```

Executable binaries will be generated inside the `release/` directory.

---

## Codebase Architecture / Arquitectura del Proyecto

```text
xamp_2.0/
├── docs/
│   ├── INDEX_ES.md           # Índice General de Documentación (Español)
│   ├── INDEX_EN.md           # Master Documentation Index (English)
│   ├── README_ES.md          # Manual Consolidado en Español
│   ├── README_EN.md          # Consolidated Manual in English
│   ├── es/                   # Módulos Técnicos en Español (01-05)
│   └── en/                   # Technical Modules in English (01-05)
├── electron/
│   ├── ipc/                  # Modular IPC controllers (system, db, project, tunnel)
│   ├── managers/             # Window and system tray managers
│   ├── dbManager.cjs         # SQL persistence engine
│   ├── main.cjs              # Electron main process entrypoint
│   └── processManager.js     # Process execution manager
├── src/
│   ├── components/           # UI Components (views, modals, common)
│   ├── hooks/                # Custom React hooks (useTabNavigation.js)
│   ├── locales/              # i18n Translation dictionaries (es, en)
│   ├── App.jsx               # Application root shell
│   └── main.jsx              # React entrypoint
└── tests/                    # Vitest test suite
```

---

## License / Licencia

Distributed under the **MIT License**. See `LICENSE` for more information.
