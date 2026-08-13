<p align="center">
  <img src="public/Lummo.png" alt="Lummo Studio Logo" width="160" />
</p>

<h1 align="center">Lummo Studio v2.1.0</h1>

<p align="center">
  <strong>Modern Control Panel for Local Development Environments & Relational Database Management</strong>
</p>

<p align="center">
  <a href="https://img.shields.io/badge/Version-2.1.0-blue"><img src="https://img.shields.io/badge/Version-2.1.0-blue?style=flat-square" alt="Version" /></a>
  <a href="https://electronjs.org"><img src="https://img.shields.io/badge/Electron-34.2-47848F?style=flat-square&logo=electron&logoColor=white" alt="Electron" /></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" /></a>
  <a href="https://vitejs.dev"><img src="https://img.shields.io/badge/Vite-6.1-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" /></a>
  <a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/Tailwind_CSS-4.0-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" /></a>
</p>

---

<p align="center">
  <strong>Documentation / Documentación</strong><br />
  <a href="docs/README_ES.md"><strong>[ES] Documentación Completa en Español</strong></a> &nbsp;|&nbsp; 
  <a href="docs/README_EN.md"><strong>[EN] Full Documentation in English</strong></a>
</p>

---

## Technical Overview / Descripción Técnica

**Lummo Studio** is a modern desktop application designed to streamline the administration of local web server environments and relational databases. Built as a modular alternative to legacy stacks like XAMPP, WampServer, or MAMP, Lummo Studio unifies project telemetry, script execution, database browsing, and network utilities into a single high-performance interface.

**Lummo Studio** es una aplicación de escritorio diseñada para administrar entornos de desarrollo web locales y bases de datos relacionales. Desarrollado como una alternativa modular a herramientas como XAMPP, WampServer o MAMP, centraliza telemetría de proyectos, ejecución de scripts, consultas SQL y utilidades de red en una interfaz unificada.

---

## Main Features / Características Principales

- **Multi-Stack Auto-Detection**: Instant configuration for Vite, React, Next.js, Express, PHP/Laravel, and Python projects.
- **Relational Database Workbench**: Native connectivity for SQLite, MySQL / MariaDB, and PostgreSQL, including virtualized table exploration.
- **Entity-Relationship (ER) Diagrams**: Automated visual diagram generator for database schemas.
- **Git Integration & Package Managers**: GUI cloning of remote Git repositories with support for `npm`, `yarn`, `pnpm`, `bun`, `composer`, and `pip`.
- **System Tray Operations**: Persistent background execution for active local web servers.
- **Public Tunnels & SSL**: Local SSL certificate generation and HTTP/HTTPS tunnel management.

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

# Build Windows executable (.exe)
npx electron-builder
```

Executable binaries will be generated inside the `release/` directory.

---

## Codebase Architecture / Arquitectura del Proyecto

```text
xamp_2.0/
├── docs/
│   ├── README_ES.md          # Documentación Oficial en Español
│   └── README_EN.md          # Official Documentation in English
├── electron/
│   ├── ipc/                  # Modular IPC controllers (system, db, project, tunnel)
│   ├── managers/             # Window and system tray managers
│   ├── dbManager.cjs         # SQL persistence engine
│   ├── main.cjs              # Electron main process entrypoint
│   └── processManager.js     # Process execution manager
├── src/
│   ├── components/           # UI Components
│   │   ├── views/            # Dashboard and detail views
│   │   ├── modals/           # Modal dialogs
│   │   └── common/           # Shared UI controls
│   ├── hooks/                # Custom React hooks (useTabNavigation.js)
│   ├── locales/              # i18n Translation dictionaries
│   ├── App.jsx               # Application root shell
│   └── main.jsx              # React entrypoint
└── tests/                    # Vitest test suite
```

---

## Documentation Links / Enlaces a la Documentación

- **Español**: Consulta la [Guía Completa en Español](docs/README_ES.md) para detalles sobre arquitectura, i18n y configuración avanzada.
- **English**: Read the [Full English Documentation](docs/README_EN.md) for architectural details, internationalization guide, and build steps.

---

## License / Licencia

Distributed under the **MIT License**. See `LICENSE` for more information.
