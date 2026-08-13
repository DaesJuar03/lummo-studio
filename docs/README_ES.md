<p align="center">
  <img src="../public/Lummo.png" alt="Lummo Studio Logo" width="160" />
</p>

<h1 align="center">Lummo Studio v2.1.0 — Documentación Oficial (Español)</h1>

<p align="center">
  <strong>Panel de Control para Entornos de Desarrollo Locales y Gestor de Bases de Datos Relacionales</strong>
</p>

<p align="center">
  <a href="../README.md">Inicio / Main</a> | 
  <a href="README_EN.md">English Documentation</a>
</p>

---

## 1. Descripción General

**Lummo Studio** es una aplicación de escritorio diseñada para centralizar el control de servidores web locales y la gestión de bases de datos relacionales en entornos de desarrollo modernos. Ofrece una alternativa ligera, modular y extensible a herramientas tradicionales como XAMPP, WampServer o MAMP.

La plataforma permite la administración simultánea de múltiples proyectos (Vite, React, Next.js, Express, PHP/Laravel, Python) e incluye herramientas integradas para exploraciones SQL, visualización de diagramas Entidad-Relación (ER), monitoreo de telemetría y túneles de red.

---

## 2. Características Principales

### 2.1 Gestión de Proyectos Multi-Stack
- **Detección Automática de Entornos**: Identificación del stack tecnológico (`Vite + React`, `Next.js`, `Express`, `PHP / Laravel`, `Python`) al seleccionar el directorio raíz.
- **Asignación Dinámica de Puertos**: Resolución automática de conflictos verificando disponibilidad de puertos en el sistema.
- **Lanzador de Scripts Integrado**: Ejecución directa de comandos personalizados (`npm run build`, migraciones de base de datos, etc.) con salida de logs en tiempo real.

### 2.2 Integración Git y Gestor de Dependencias
- **Clonación de Repositorios**: Soporte nativo para clonar repositorios Git remotos mediante interfaz gráfica.
- **Gestión Multi-Package Manager**: Instalación automatizada de paquetes utilizando `npm`, `yarn`, `pnpm`, `bun`, `composer` o `pip`.

### 2.3 Administración de Bases de Datos Relacionales
- **Soporte Multi-Motor**: Conectividad y consulta nativa para **SQLite**, **MySQL / MariaDB** y **PostgreSQL**.
- **Persistencia Física de SQLite**: Almacenamiento directo y estructurado de archivos de base de datos en la carpeta del usuario.
- **Diagramas Entidad-Relación (ER)**: Generación automática de diagramas interactivos relacionales con zoom y cálculo de conectores.
- **Explorador de Datos Virtualizado**: Renderizado de alto rendimiento para tablas extensas mediante virtualización de filas.
- **Exportación e Importación**: Soporte para volcados SQL y exportación de datos en formatos JSON y CSV.

### 2.4 Servicios de Red y Sistema
- **Bandeja del Sistema (System Tray)**: Ejecución continua en segundo plano permitiendo mantener servidores activos al cerrar la ventana principal.
- **Túneles Públicos y Certificados SSL**: Generación de certificados locales e integración con túneles para pruebas de webhooks e interfaces móviles.
- **Editor `.env` Integrado**: Modificación segura de variables de entorno con sincronización en tiempo real.

---

## 3. Arquitectura del Sistema

Lummo Studio sigue la arquitectura estándar de aplicaciones Electron separando las responsabilidades del proceso principal y el proceso de renderizado:

```text
Lummo Studio
├── Proceso Principal (Electron Main)
│   ├── main.cjs               # Orquestador del ciclo de vida de la app
│   ├── managers/              # Gestores de ventanas y tray de sistema
│   │   ├── windowManager.cjs  # Configuración y eventos de BrowserWindow
│   │   └── trayManager.cjs    # Gestión del menú contextual en bandeja
│   ├── ipc/                   # Controladores modulares IPC
│   │   ├── systemHandlers.cjs # Escaneo de entorno y operaciones de SO
│   │   ├── projectHandlers.cjs# Ejecución de scripts y detección
│   │   ├── dbHandlers.cjs     # Conexiones SQL y consultas
│   │   └── tunnelProxyHandlers.cjs # Proxy local y túneles
│   ├── dbManager.cjs          # Driver y persistencia SQL
│   ├── processManager.js      # Control de procesos hijo y subprocesos
│   └── detector.js            # Análisis estático de stacks tecnológicos
└── Proceso de Renderizado (React UI)
    ├── src/main.jsx           # Punto de entrada de React
    ├── src/App.jsx            # Orquestador principal de UI
    ├── src/hooks/             # Hooks personalizados (useTabNavigation.js)
    ├── src/components/        # Componentes organizados por dominio
    │   ├── views/             # Vistas de dashboard y paneles principales
    │   ├── modals/            # Diálogos y ventanas modulares
    │   └── common/            # Componentes reutilizables de UI
    ├── src/locales/           # Motor de internacionalización (i18n)
    └── src/types/             # Definiciones de tipos (lummo.d.ts)
```

---

## 4. Requisitos del Sistema

- **Sistema Operativo**: Windows 10 / Windows 11 (64-bit).
- **Entorno de Ejecución**: Node.js v18.0.0 o superior.
- **Control de Versiones**: Git instalado y registrado en la variable de entorno `PATH`.

---

## 5. Instalación y Entorno de Desarrollo

### 5.1 Clonar el Repositorio
```bash
git clone https://github.com/tu-usuario/lummo-studio.git
cd lummo-studio
```

### 5.2 Instalación de Dependencias
```bash
npm install
```

### 5.3 Ejecución en Modo Desarrollo
```bash
npm run electron:dev
```

### 5.4 Ejecución de Pruebas Unitarias
```bash
npm test
```

---

## 6. Compilación y Distribución

Para generar la distribución ejecutable de producción para Windows:

1. **Compilar el paquete Web con Vite**:
   ```bash
   npm run build
   ```

2. **Generar el ejecutable ejecutable nativo (.exe)**:
   ```bash
   npx electron-builder
   ```

Los instaladores resultantes se generarán en la carpeta `release/`:
- `release/Lummo Studio Setup 2.1.0.exe` (Instalador ejecutable NSIS)
- `release/Lummo Studio 2.1.0.exe` (Versión ejecutable portable)

---

## 7. Guía de Internacionalización (i18n)

Para añadir soporte a un nuevo idioma en Lummo Studio sin modificar la lógica interna:

1. Crear un archivo JSON de idioma en `src/locales/{codigo_idioma}.json` respetando el esquema oficial.
2. Registrar el idioma en `src/locales/index.js` mediante la función `registerLocale()`.

---

## 8. Atajos de Teclado

| Atajo | Descripción |
| :--- | :--- |
| `Ctrl + K` / `Cmd + K` | Abrir / Cerrar el Buscador Omnibox |
| `Alt + N` | Abrir diálogo de Importación de Proyectos |
| `Alt + P` | Ir al Panel General de Proyectos |
| `Alt + D` | Ir al Panel de Bases de Datos |
| `Alt + S` | Abrir la Configuración del Sistema |
| `Escape` | Cerrar el modal o diálogo activo |

---

## 9. Licencia

Este proyecto está distribuido bajo la Licencia MIT. Consulta el archivo `LICENSE` para más información.
