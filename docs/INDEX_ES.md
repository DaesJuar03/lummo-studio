<p align="center">
  <img src="../public/Lummo.png" alt="Lummo Studio Logo" width="140" />
</p>

<h1 align="center">Lummo Studio v2.3.0 — Índice General de la Documentación</h1>

<p align="center">
  <strong>Guía Navegable y Centro de Recursos Técnicos de Lummo Studio</strong>
</p>

<p align="center">
  <a href="../README.md">Inicio</a> &nbsp;|&nbsp; 
  <a href="INDEX_EN.md">English Documentation Index</a>
</p>

---

## 📖 Bienvenido a la Documentación Oficial de Lummo Studio

**Lummo Studio** es un panel de control de entorno de desarrollo web local y un workbench de bases de datos relacionales diseñado para desarrolladores modernos. Esta suite documental proporciona una guía completa sobre arquitectura, uso de herramientas, administración de bases de datos, despliegue y desarrollo.

---

## 🗂️ Estructura de la Documentación

La documentación está organizada en módulos temáticos especializados para facilitar su consulta:

```text
docs/
├── INDEX_ES.md                          # [Usted está aquí] Índice General en Español
├── INDEX_EN.md                          # General Documentation Index in English
├── README_ES.md                         # Manual Consolidado / Guía Rápida en Español
├── README_EN.md                         # Consolidated Manual / Quick Start in English
├── es/                                  # Módulos Técnicos en Español
│   ├── 01_arquitectura_y_sistema.md     # Arquitectura, Electron, IPC y React Shell
│   ├── 02_gestion_de_proyectos_y_stacks.md # Detección, Scripts, Git y Dependencias
│   ├── 03_workbench_bases_de_datos_y_diagramas.md # SQLite/MySQL/Postgres, ER y SQL
│   ├── 04_redes_tuneles_y_tray.md       # Túneles públicos, SSL, Tray y Omnibox
│   └── 05_guia_desarrollador_compilacion_y_tests.md # Dev Setup, Vitest, Build e i18n
└── en/                                  # English Technical Modules
    ├── 01_architecture_and_system.md
    ├── 02_project_management_and_stacks.md
    ├── 03_database_workbench_and_diagrams.md
    ├── 04_network_tunnels_and_tray.md
    └── 05_developer_guide_build_and_tests.md
```

---

## 📚 Módulos Principales (Español)

### 1. [Arquitectura del Sistema y Proceso IPC](es/01_arquitectura_y_sistema.md)
- **Visión General**: Modelo de procesos dual (Proceso Principal Electron y Proceso de Renderizado React 19).
- **Controladores IPC**: Definición técnica de `systemHandlers`, `projectHandlers`, `dbHandlers` y `tunnelProxyHandlers`.
- **Motor de Persistencia**: Operación de `dbManager.cjs` y almacenamiento estructurado de proyectos y bases de datos locales.
- **Interfaz de Usuario**: Orquestador en `App.jsx`, sistema de pestañas y consumo de eventos en tiempo real.

### 2. [Gestión de Proyectos y Stacks Tecnológicos](es/02_gestion_de_proyectos_y_stacks.md)
- **Motor de Autodetección**: Análisis estático en `detector.js` para Vite, React, Next.js, Express, PHP/Laravel y Python.
- **Administrador de Procesos**: Ejecución de scripts en tiempo real, captura de stdout/stderr y resolución de conflictos de puertos.
- **Integración Git & Gestores de Paquetes**: Clonación GUI de repositorios remotos y soporte automatizado para `npm`, `yarn`, `pnpm`, `bun`, `composer` y `pip`.
- **Gestión de Entorno**: Editor de variables de entorno `.env` con persistencia directa.

### 3. [Workbench de Bases de Datos y Diagramas ER](es/03_workbench_bases_de_datos_y_diagramas.md)
- **Soporte Multi-Motor**: Conectividad nativa para SQLite (persistente en disco), MySQL/MariaDB y PostgreSQL.
- **Diagramas Entidad-Relación (ER)**: Generación automática de diagramas interactivos relacionales en HTML5 Canvas con zoom y auto-layout.
- **Diseñador de Esquemas y SQL Runner**: Creación visual de tablas/columnas/llaves e interfaz de consultas SQL con tabla virtualizada.
- **Herramientas Avanzadas**: Generador de datos de prueba (Mock Data Generator) e importador/exportador en SQL, JSON y CSV.

### 4. [Servicios de Red, Túneles HTTPS y System Tray](es/04_redes_tuneles_y_tray.md)
- **Proxy Local y Túneles HTTPS**: Expansión de servidores locales a la web pública para webhooks y pruebas móviles.
- **Gestión de Certificados SSL**: Generación e instalación de certificados de desarrollo seguros.
- **Bandeja del Sistema (System Tray)**: Menú contextual persistente y ejecución en segundo plano sin interrumpir los servidores activos.
- **Omnibox Command Palette**: Buscador rápido con atajo de teclado (`Ctrl+K` / `Cmd+K`) para acciones globales.

### 5. [Guía del Desarrollador, Compilación y Pruebas](es/05_guia_desarrollador_compilacion_y_tests.md)
- **Configuración del Entorno de Desarrollo**: Requisitos del sistema, clonación e instalación de dependencias.
- **Pruebas Automatizadas**: Ejecución de suites con Vitest (`npm test`).
- **Empaquetado y Compilación de Producción**: Creación de ejecutables portables e instaladores NSIS con Electron Builder (`release/`).
- **Sistema de Internacionalización (i18n)**: Guía para agregar y actualizar diccionarios de traducción en `src/locales/`.

---

## ⚡ Enlaces Rápidos y Referencias

- 🚀 [Guía Rápida de Instalación y Uso](README_ES.md#5-instalación-y-entorno-de-desarrollo)
- ⌨️ [Tabla Completa de Atajos de Teclado](README_ES.md#8-atajos-de-teclado)
- 🌍 [English Documentation Index](INDEX_EN.md)

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo `LICENSE` para más información.
