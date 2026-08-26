# Gestión de Proyectos y Stacks Tecnológicos

<p align="center">
  <strong>Lummo Studio v2.3.0 — Módulo Técnico 02 (Español)</strong>
</p>

<p align="center">
  <a href="../INDEX_ES.md">← Volver al Índice General</a> | 
  <a href="../en/02_project_management_and_stacks.md">English Version</a>
</p>

---

## 1. Motor de Autodetección de Stacks (`detector.js`)

Lummo Studio incluye un analizador estático automatizado en `electron/detector.js` que inspecciona la estructura de archivos de cualquier directorio seleccionado para identificar el framework y stack de desarrollo correspondiente.

### Criterios de Clasificación:

| Stack Detectado | Archivos e Indicadores de Inspección | Comando de Inicio Predeterminado |
| :--- | :--- | :--- |
| **Vite + React / Vue / TS** | `package.json` conteniendo `vite` en dependencias | `npm run dev` |
| **Next.js** | `next.config.js`, `next.config.mjs` o dependencia `next` | `npm run dev` |
| **Express / Node.js API** | `package.json` con `express` y archivo `index.js` o `server.js` | `node server.js` / `npm start` |
| **PHP / Laravel** | `composer.json` y/o estructura `artisan` | `php artisan serve` |
| **Python Web** | `requirements.txt`, `pyproject.toml`, `manage.py` o `main.py` | `python manage.py runserver` / `uvicorn main:app` |
| **Estático / HTML5** | `index.html` sin empaquetadores de módulos | Servidor HTTP Estático integrado |

---

## 2. Administrador de Procesos (`processManager.js`)

El archivo `electron/processManager.js` gestiona el ciclo de vida de los subprocesos ejecutados por Lummo Studio.

- **Generación de Subprocesos (Child Process Spawn)**: Utiliza `child_process.spawn()` configurado con shells del sistema (`cmd.exe` / `powershell.exe` en Windows).
- **Streaming de Terminal en Tiempo Real**: Los eventos `stdout` y `stderr` se capturan y transmiten inmediatamente a la interfaz React mediante canales IPC (`project:log-data`), permitiendo ver la terminal del servidor sin retardo.
- **Resolución de Conflictos de Puertos**: Antes de lanzar un proceso en un puerto objetivo (ej. `3000`), el manejador verifica la ocupación del puerto mediante sockets locales TCP. Si el puerto está ocupado, ofrece reasignar dinámicamente un puerto libre disponible.

---

## 3. Integración con Git y Gestores de Paquetes

Lummo Studio facilita el flujo de trabajo sin necesidad de salir de la aplicación:

### 3.1 Operaciones Git GUI
- **Clonación de Repositorios Remotos**: Mediante la ventana modular `CloneRepoModal.jsx`, el usuario puede ingresar una URL remota (`https://github.com/user/repo.git`), seleccionar el directorio de destino y ejecutar la clonación interactiva.
- **Estado de Rama y Git Fetch**: Muestra la rama activa actual y permite verificar cambios sin subir commits incompletos.

### 3.2 Gestor de Dependencias Multi-Herramienta
Desde el modal `DependencyManagerModal.jsx`, Lummo Studio puede ejecutar instalaciones de dependencias detectando el administrador apropiado:

```text
Soporte de Gestores:
├── Node.js: npm | yarn | pnpm | bun
├── PHP: composer
└── Python: pip / pipenv
```

---

## 4. Gestor de Variables de Entorno (`.env`)

Cada proyecto registrado cuenta con un editor integrado de variables de entorno:

- **Lectura y Parsing**: Parsea archivos `.env`, `.env.local` y `.env.example`.
- **Edición Segura**: Oculta claves sensibles (passwords, tokens JWT, API Keys) bajo campos protegidos de entrada de texto.
- **Sincronización Inmediata**: Al guardar cambios, escribe directamente en el archivo físico `.env` y reinicia opcionalmente el servidor de desarrollo activo para aplicar la nueva configuración.
