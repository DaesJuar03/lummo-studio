# Arquitectura del Sistema y Proceso IPC

<p align="center">
  <strong>Lummo Studio v2.1.0 — Módulo Técnico 01 (Español)</strong>
</p>

<p align="center">
  <a href="../INDEX_ES.md">← Volver al Índice General</a> | 
  <a href="../en/01_architecture_and_system.md">English Version</a>
</p>

---

## 1. Visión General de la Arquitectura

**Lummo Studio** está construido sobre **Electron 34**, **React 19**, **Vite 6** y **Tailwind CSS 4**. Sigue el patrón arquitectónico desacoplado recomendado por Electron, donde el **Proceso Principal (Main)** administra los recursos del sistema operativo, el almacenamiento en disco y la ejecución de subprocesos, mientras que el **Proceso de Renderizado (Renderer)** ejecuta la interfaz gráfica modular de usuario.

```mermaid
graph TD
    subgraph Proceso de Renderizado - UI (React 19 + Vite 6)
        A[App.jsx - Root Shell] --> B[HomeDashboard.jsx]
        A --> C[ProjectsPanel & ProjectDetailPage]
        A --> D[DatabasesPanel & DatabaseDetailPage]
        A --> E[SQLiteWorkbench.jsx]
        A --> F[Modales: ErDiagram, SchemaDesigner, Tunnel, etc.]
    end

    subgraph Preload & IPC Bridge
        G[preload.cjs - contextBridge]
    end

    subgraph Proceso Principal - Electron Main (Node.js)
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

## 2. Proceso Principal (Main Process)

El punto de entrada del Proceso Principal reside en `electron/main.cjs`. Sus responsabilidades principales incluyen:

1. **Orquestación del Ciclo de Vida de la Aplicación**:
   - Inicialización de la ventana principal `BrowserWindow` con preferencias de seguridad (`contextIsolation: true`, `nodeIntegration: false`).
   - Manejo de instancia única de la aplicación (`app.requestSingleInstanceLock()`).
   - Registro del icono en el área de notificación (System Tray) mediante `trayManager.cjs`.

2. **Carga y Registro de Controladores IPC Modulares**:
   Los eventos de comunicación inter-proceso (IPC) están organizados en subsistemas especializados ubicados en `electron/ipc/`:

| Archivo de Handler | Dominio de Responsabilidad | Eventos Principales |
| :--- | :--- | :--- |
| `systemHandlers.cjs` | Operaciones del sistema operativo | `system:get-info`, `system:open-path`, `system:pick-directory` |
| `projectHandlers.cjs` | Control de proyectos y procesos | `project:scan`, `project:start`, `project:stop`, `project:get-logs`, `git:clone` |
| `dbHandlers.cjs` | Gestión de bases de datos SQL | `db:test-connection`, `db:execute-query`, `db:get-schema`, `db:export` |
| `tunnelProxyHandlers.cjs` | Redes, túneles y proxy local | `tunnel:start`, `tunnel:stop`, `ssl:generate-cert` |

---

## 3. Capa de Persistencia Técnica (`dbManager.cjs`)

Lummo Studio utiliza una base de datos local SQLite para almacenar la configuración de proyectos, datos de telemetría y perfiles de conexión a bases de datos relacionales externas.

- **Ubicación del Archivo de Persistencia**: Se almacena automáticamente en el directorio de datos del usuario bajo el nombre `lummo_local.db` o `lummo_projects.json` como mecanismo de fallback.
- **Esquema Interno**:
  - Tabla `projects`: Guarda rutas de proyectos, tipo de stack detectado, puerto predeterminado, variables `.env` personalizadas y scripts.
  - Tabla `db_connections`: Mantiene credenciales (host, puerto, usuario, contraseña cifrada, nombre de BD) para MySQL, PostgreSQL y rutas de archivos SQLite.
  - Tabla `system_settings`: Configuración general (tema visual, rutas de ejecutables Node/PHP/Python, puerto base del proxy).

---

## 4. Puente de Comunicación IPC (`preload.cjs`)

El archivo `electron/preload.cjs` expone de forma segura los métodos IPC al objeto global `window.electronAPI` utilizando `contextBridge.exposeInMainWorld()`.

### Ejemplo de Firma de Contrato IPC:

```javascript
// Llamada desde el proceso Renderer (React)
const result = await window.electronAPI.executeSqlQuery({
  engine: 'sqlite',
  connectionId: 'conn-123',
  sql: 'SELECT * FROM users LIMIT 50;'
});
```

---

## 5. Proceso de Renderizado (React 19 Shell)

La interfaz gráfica es una SPA (Single Page Application) reactiva construida con **React 19** y empaquetada con **Vite 6**.

- **Entrypoint**: `src/main.jsx` monta `<App />` envuelto en proveedores de contexto global (i18n, estado de proyectos y estado de navegación).
- **Control de Navegación por Pestañas**: Implementado en `src/hooks/useTabNavigation.js`, permitiendo abrir múltiples vistas en pestañas concurrentes (Dashboard, Proyecto Individual, Base de Datos, Terminal Standalone).
- **Vistas Principales**:
  - `HomeDashboard.jsx`: Resumen ejecutivo de recursos del sistema, tarjetas de proyectos activos y conexiones rápidas a bases de datos.
  - `ProjectsPanel.jsx` & `ProjectDetailPage.jsx`: Vista detallada de terminales de logs, control de scripts y editor de variables `.env`.
  - `DatabasesPanel.jsx` & `DatabaseDetailPage.jsx`: Workbench de consulta SQL, generador de diagramas ER e inspector de tablas.

---

## 6. Manejo de Errores y Seguridad IPC

1. **Aislamiento de Contexto**: La interfaz de usuario no tiene acceso directo al sistema de archivos ni a `child_process` de Node.js. Toda acción requiere una solicitud validada a través de IPC.
2. **Sanitización de Consultas e Insumos**: Los controladores IPC validan la estructura de los parámetros recibidos antes de ejecutar comandos en el SO o consultas SQL en los motores de base de datos.
