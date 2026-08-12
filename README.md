<p align="center">
  <img src="public/Lummo.png" alt="Lummo Studio Logo" width="180" />
</p>

<h1 align="center">Lummo Studio v2.0.0</h1>

<p align="center">
  <strong>Panel de Control Moderno de Entornos de Desarrollo Locales & Gestor de Bases de Datos</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Version-2.0.0-blue?style=for-the-badge" alt="Version 2.0.0" />
  <img src="https://img.shields.io/badge/Electron-34.2-47848F?style=for-the-badge&logo=electron&logoColor=white" alt="Electron" />
  <img src="https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Vite-6.1-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4.0-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Platform-Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white" alt="Windows" />
</p>

---

## 🖼️ Vista Previa & Capturas de Pantalla

<p align="center">
  <img src="public/screenshots/banner.jpg" alt="Lummo Studio Cover Banner" width="100%" style="border-radius: 12px;" />
</p>

<h3 align="center">Dashboard Principal v2.0</h3>
<p align="center">
  <img src="public/screenshots/dashboard.png" alt="Dashboard Principal Lummo Studio" width="90%" style="border-radius: 8px;" />
</p>

<h3 align="center">Detalle de Proyecto, Telemetría & Live Preview</h3>
<p align="center">
  <img src="public/screenshots/projects.png" alt="Detalle de Proyecto" width="90%" style="border-radius: 8px;" />
</p>

<h3 align="center">Panel de Bases de Datos & Diagrama Entidad-Relación (ER)</h3>
<p align="center">
  <img src="public/screenshots/databases.png" alt="Panel de Bases de Datos" width="90%" style="border-radius: 8px;" />
</p>

<h3 align="center">Buscador Omnibox (`Ctrl + K`) & Atajos Rápidos</h3>
<p align="center">
  <img src="public/screenshots/modal.png" alt="Omnibox Modal Ctrl K" width="90%" style="border-radius: 8px;" />
</p>

---

## 📖 Descripción General

**Lummo Studio** es una alternativa moderna, rápida e intuitiva a paneles tradicionales de servidores locales (como XAMPP, WampServer o MAMP). Diseñado específicamente para desarrolladores web contemporáneos, combina la administración de servidores web de múltiples stacks (React, Vite, Next.js, Node.js, Express, PHP/Laravel, Python) con un explorador relacional de bases de datos embebido, generador de Diagramas Entidad-Relación (ER), túneles HTTPS públicos y herramientas integradas de productividad.

---

## ✨ Características Principales (v2.0.0)

### 🚀 1. Gestión Inteligente de Proyectos Multi-Stack & Live Preview
- **Detección Automática**: Reconoce automáticamente el stack tecnológico del proyecto (`Vite + React`, `Next.js`, `Express`, `PHP / Laravel`, `Python`) al seleccionar una carpeta.
- **Asignación Dinámica de Puertos**: Busca y asigna puertos libres en el sistema de manera automática.
- **Live Preview & Telemetría**: Previsualización interactiva del sitio web directo en pantalla con panel de estado en vivo.
- **Lanzador de Scripts & Comandos Custom**: Ejecuta `npm run build`, migraciones o comandos personalizados directamente con salida en vivo hacia la consola de registros.

### 📥 2. Clonación Directa de Repositorios Git & Instalación de Dependencias
- **Modal Integrado**: Pega el enlace de cualquier repositorio público de Git (`https://github.com/usuario/repo.git`) y selecciona la carpeta de destino.
- **Progreso en Tiempo Real**: Transmisión del estado de descarga y clonación objetos de Git.
- **Instalador de Dependencias Multi-Manager**: Detecta e instala dependencias usando `npm`, `yarn`, `pnpm`, `bun`, `composer` o `pip`.

### 🟢 3. Integración con la Bandeja del Sistema (System Tray) & SSL/HTTPS
- **Segundo Plano Continuo**: Al cerrar la ventana principal (`✕`), Lummo Studio se minimiza a la bandeja de notificación de Windows sin interrumpir tus servidores en ejecución.
- **Certificados SSL Locales**: Genera certificados SSL auto-firmados en 1 clic para desarrollo seguro bajo HTTPS.
- **Túneles Públicos HTTPS**: Expón servidores locales a internet para probar webhooks y clientes móviles.

### 📝 4. Editor de Variables de Entorno (`.env`)
- **Edición en Tiempo Real**: Edita variables de entorno sin salir de la app.
- **Auto-Reinicie en Cambio de Puerto**: Sincronización inmediata al modificar variables o puertos asignados.

### 🗄️ 5. Workbench SQL & Diagrama Entidad-Relación (ER) Nativo
- **Soporte Multi-Motor**: Administra motores **SQLite** (embebido nativo en Lummo), **MySQL / MariaDB** y **PostgreSQL**.
- **Diagrama Entidad-Relación (ER)**: Generación automática de diagramas relacionales interactivos con soporte de Zoom y conectores Bezier.
- **Snapshots & Dump SQL**: Exportación e importación de datos en formato `.sql`, `.csv`, `.json` y `.xlsx`.

### 🌐 6. Motor Multilingüe (Español / Inglés) & Sistema para Contribuidores

Lummo Studio cuenta con un motor de internacionalización ligero e hiper-extensible.

---

## 🌍 Contribución de Idiomas (i18n / Internationalization)

¡Animamos a la comunidad a agregar soporte para más idiomas! Agregar un nuevo idioma es sumamente sencillo sin necesidad de modificar el código interno de la aplicación.

### Pasos para agregar un nuevo idioma (ejemplo: Francés `fr.json`):

1. **Crear el archivo de traducción**:
   Crea un nuevo archivo JSON en `src/locales/fr.json` utilizando la siguiente estructura:

   ```json
   {
     "meta": {
       "code": "fr",
       "name": "Français",
       "description": "Français (Standard)",
       "badge": "FR"
     },
     "translations": {
       "appVersion": "v2.0.0",
       "home": "Accueil",
       "projects": "Projets",
       "databases": "Bases de données",
       "settings": "Paramètres",
       "quickCommand": "Commande Rapide",
       "active": "Actif",
       "running": "En cours d'exécution",
       "welcome": "Bienvenue sur Lummo Studio"
     }
   }
   ```

2. **Registrar el Idioma en [`src/locales/index.js`](file:///c:/Users/desau/OneDrive/Escritorio/xamp_2.0/src/locales/index.js)**:
   Importa tu archivo e invoca la función `registerLocale`:

   ```javascript
   import frLocale from './fr.json';
   import { registerLocale } from './locales';

   // Registrar el nuevo idioma en tiempo de ejecución
   registerLocale(frLocale);
   ```

   Alternativamente, puedes exportar tu archivo directamente en el array `availableLocales` de [`src/locales/index.js`](file:///c:/Users/desau/OneDrive/Escritorio/xamp_2.0/src/locales/index.js).

---

## 🛠️ Requisitos del Sistema

- **Sistema Operativo**: Windows 10 / 11 (64-bit)
- **Node.js**: v18.0.0 o superior
- **Git**: Instalado y disponible en el `PATH` del sistema (para la función de clonación de repositorios)

---

## ⚙️ Instalación y Configuración para Desarrollo

1. **Clonar el Repositorio**:
   ```bash
   git clone https://github.com/tu-usuario/lummo-studio.git
   cd lummo-studio
   ```

2. **Instalar Dependencias**:
   ```bash
   npm install
   ```

3. **Ejecutar en Modo Desarrollo (Vite + Electron)**:
   ```bash
   npm run electron:dev
   ```

---

## 📦 Compilación y Generación del Ejecutable (`.exe`)

Para empaquetar **Lummo Studio** como una aplicación nativa de Windows (`.exe` instalador portable y ejecutable NSIS):

1. **Generar Bundle de Producción de Vite**:
   ```bash
   npm run build
   ```

2. **Empaquetar con Electron Builder**:
   ```bash
   npx electron-builder
   ```

> Los archivos ejecutables se crearán automáticamente en el directorio `release/`:
> - `release/Lummo Studio Setup 2.0.0.exe` (Instalador NSIS)
> - `release/Lummo Studio 2.0.0.exe` (Versión Portable)

---

## 🚀 Guía: Cómo Subir o Actualizar en GitHub

Para enviar tus cambios a GitHub:

```bash
git add .
git commit -m "feat: Lanzamiento oficial de Lummo Studio v2.0.0"
git push origin main
```

---

## 📁 Estructura del Proyecto

```text
xamp_2.0/
├── electron/
│   ├── ipc/             # Modulares IPC Handlers (project, db, system, tunnel)
│   ├── main.cjs         # Proceso principal de Electron (IPC, Tray, Window)
│   ├── processManager.js# Gestor de procesos Node/Express/Vite/PHP/Python
│   ├── scanner.js       # Escáner de ejecutables y entorno local
│   └── detector.js      # Detector automático de stack de proyectos
├── public/
│   ├── screenshots/     # Capturas de pantalla oficiales
│   ├── Lummo.ico        # Icono ejecutable de Windows (256x256)
│   └── Lummo.png        # Logotipo principal de la aplicación
├── src/
│   ├── assets/          # Recursos estáticos importados por Vite
│   ├── components/      # Componentes de React
│   │   ├── DatabaseDetailPage.jsx
│   │   ├── DatabasesPanel.jsx
│   │   ├── ErDiagramModal.jsx (Nativo ER View)
│   │   ├── ExecutionConfigModal.jsx
│   │   ├── Header.jsx
│   │   ├── HomeDashboard.jsx
│   │   ├── ProjectDetailPage.jsx
│   │   ├── ScriptLauncherModal.jsx
│   │   └── SettingsModal.jsx
│   ├── locales/         # i18n Engine & Diccionarios (es.json, en.json, index.js)
│   ├── App.jsx          # Componente raíz y enrutador de pestañas
│   ├── index.css        # Sistema de diseño Tailwind CSS y scrollbars
│   └── main.jsx         # Punto de entrada de React
├── package.json         # Configuración v2.0.0 y Electron Builder
└── README.md            # Documentación oficial
```

---

## 🎹 Atajos de Teclado Útiles

| Atajo | Acción |
| :--- | :--- |
| `Ctrl + K` / `Cmd + K` | Abrir / Cerrar Buscador Omnibox |
| `Alt + N` / `N` | Abrir Importador / Clonador de Proyectos |
| `Alt + P` / `P` | Ir al Panel de Proyectos |
| `Alt + D` / `D` | Ir al Panel de Bases de Datos |
| `Alt + S` / `S` | Abrir Ajustes y Configuración |
| `Escape` | Cerrar modales activos |

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo `LICENSE` para más detalles.
