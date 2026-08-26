<p align="center">
  <img src="../public/Lummo.png" alt="Lummo Studio Logo" width="160" />
</p>

<h1 align="center">Lummo Studio v2.3.0 — Manual Consolidado (Español)</h1>

<p align="center">
  <strong>Panel de Control para Entornos de Desarrollo Locales y Gestor de Bases de Datos Relacionales</strong>
</p>

<p align="center">
  <a href="../README.md">Inicio / Landing Page</a> &nbsp;|&nbsp; 
  <a href="INDEX_ES.md"><strong>[Índice de la Documentación]</strong></a> &nbsp;|&nbsp; 
  <a href="README_EN.md">English Version</a>
</p>

---

## 1. Descripción General

**Lummo Studio** es una aplicación de escritorio avanzada para la administración centralizada de servidores web locales y bases de datos relacionales en entornos de desarrollo modernos. Diseñado como una solución modular, rápida y extensible que reemplaza a herramientas tradicionales como XAMPP, WampServer o MAMP, centraliza telemetría, gestión de dependencias, túneles de red y exploración SQL en una sola interfaz.

---

## 2. Guía Navegable de Módulos Técnicos

Para acceder a la documentación detallada por área de especialidad, consulte los siguientes submódulos:

| Módulo Técnico | Descripción del Contenido |
| :--- | :--- |
| 📄 **[Índice General](INDEX_ES.md)** | Visión general y mapa completo de la documentación. |
| 🏗️ **[01. Arquitectura y Sistema](es/01_arquitectura_y_sistema.md)** | Proceso Main de Electron, IPC Handlers, React 19 Shell y persistencia SQLite. |
| 🚀 **[02. Gestión de Proyectos](es/02_gestion_de_proyectos_y_stacks.md)** | Autodetección de stacks (Vite, Next.js, Express, Laravel, Python), terminal e integración Git. |
| 🗄️ **[03. Workbench de Bases de Datos](es/03_workbench_bases_de_datos_y_diagramas.md)** | Motores SQLite, MySQL, PostgreSQL, Diagramas ER, Diseñador de Esquemas y Mock Data. |
| 🌐 **[04. Servicios de Red y Tray](es/04_redes_tuneles_y_tray.md)** | Proxy local, túneles HTTPS públicos, certificados SSL, System Tray y Omnibox (`Ctrl+K`). |
| 🛠️ **[05. Guía para Desarrolladores](es/05_guia_desarrollador_compilacion_y_tests.md)** | Setup de desarrollo, pruebas con Vitest, compilación `.exe` con Electron Builder e i18n. |

---

## 3. Resumen de Características Principales

- **Detección Automática Multi-Stack**: Identificación inmediata de proyectos Node.js, React, Next.js, Express, PHP/Laravel y Python al seleccionar una carpeta raíz.
- **Administrador de Bases de Datos Relacionales**: Conexión nativa e interactiva a **SQLite**, **MySQL / MariaDB** y **PostgreSQL**.
- **Visualizador de Diagramas Entidad-Relación (ER)**: Mapeo visual interactivo en HTML5 Canvas con exportación a PNG/SVG.
- **Integración Git & Gestores de Paquetes**: Clonación GUI de repositorios e instalación con `npm`, `yarn`, `pnpm`, `bun`, `composer` y `pip`.
- **Túneles HTTPS Públicos y Certificados Local SSL**: Inspección de webhooks y pruebas móviles con generación de certificados localmente.
- **Ejecución en Segundo Plano (System Tray)**: Mantiene los servidores web activos al cerrar la ventana de la aplicación.

---

## 4. Requisitos del Sistema

- **Sistema Operativo**: Windows 10 / Windows 11 (64-bit).
- **Entorno de Ejecución**: Node.js v18.0.0 o superior.
- **Herramientas**: Git CLI instalado y registrado en la variable de entorno `PATH`.

---

## 5. Instalación y Entorno de Desarrollo

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/lummo-studio.git
cd lummo-studio

# 2. Instalar dependencias
npm install

# 3. Ejecutar en modo desarrollo
npm run electron:dev

# 4. Ejecutar pruebas automatizadas
npm test
```

---

## 6. Compilación de Producción

Para compilar y empaquetar el ejecutable ejecutable nativo para Windows:

```bash
# Paso 1: Compilar bundle web
npm run build

# Paso 2: Generar instaladores nativos en release/
npx electron-builder
```

Los instaladores resultantes estarán en la carpeta `release/`:
- `Lummo Studio Setup 2.1.0.exe` (Instalador NSIS)
- `Lummo Studio 2.1.0.exe` (Ejecutable portable)

---

## 7. Atajos de Teclado Globales

| Atajo | Acción |
| :--- | :--- |
| `Ctrl + K` / `Cmd + K` | Abrir / Cerrar el Buscador Omnibox |
| `Alt + N` | Abrir diálogo de Importación de Proyectos |
| `Alt + P` | Ir al Panel General de Proyectos |
| `Alt + D` | Ir al Panel de Bases de Datos |
| `Alt + S` | Abrir Configuración del Sistema |
| `Escape` | Cerrar modal activo |

---

## 8. Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo `LICENSE` para más información.
