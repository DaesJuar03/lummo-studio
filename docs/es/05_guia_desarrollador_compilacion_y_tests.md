# Guía para Desarrolladores, Compilación y Pruebas

<p align="center">
  <strong>Lummo Studio v2.1.0 — Módulo Técnico 05 (Español)</strong>
</p>

<p align="center">
  <a href="../INDEX_ES.md">← Volver al Índice General</a> | 
  <a href="../en/05_developer_guide_build_and_tests.md">English Version</a>
</p>

---

## 1. Configuración del Entorno de Desarrollo

### Requisitos Previos:
- **Sistema Operativo**: Windows 10 u 11 (64-bit).
- **Node.js**: Versión 18.0.0 o superior (se recomienda Node 20 LTS).
- **Gestor de Paquetes**: `npm` v9.0.0+ (incluido con Node.js).
- **Git**: Git CLI instalado y registrado en la variable de entorno `PATH`.

### Clonación e Instalación:
```bash
# 1. Clonar el repositorio oficial
git clone https://github.com/tu-usuario/lummo-studio.git
cd lummo-studio

# 2. Instalar todas las dependencias del proyecto
npm install
```

---

## 2. Scripts del Proyecto (`package.json`)

Los comandos de desarrollo y empaquetado disponibles son:

| Comando | Descripción de Ejecución |
| :--- | :--- |
| `npm run dev` | Inicia el servidor de desarrollo de Vite para el proceso Renderer. |
| `npm run electron:dev` | Ejecuta Vite y Electron concurrentemente con hot-reloading de UI. |
| `npm run electron:start` | Inicia Electron apuntando a los archivos compilados o en ejecución. |
| `npm run build` | Compila el bundle de producción de React con Vite en la carpeta `dist/`. |
| `npm run dist` | Executa la compilación de Vite y empaqueta el ejecutable final con Electron Builder. |
| `npm test` | Ejecuta la suite de pruebas unitarias y de integración con **Vitest**. |

---

## 3. Suite de Pruebas Automatizadas (**Vitest**)

Las pruebas automatizadas residen en el directorio `tests/`:

- `tests/sanitizer.test.js`: Validación de desinfección de insumos y prevención de inyección de comandos en shell.
- `tests/detector.test.js`: Verificación de la precisión del motor de autodetección de proyectos.
- `tests/dbManager.test.js`: Pruebas de integración para la persistencia SQLite local.
- `tests/features.test.js`: Pruebas funcionales de los componentes lógicos de la aplicación.
- `tests/locales.test.js`: Validación de la paridad y completitud de las claves de i18n.

### Para ejecutar las pruebas:
```bash
npm test
```

---

## 4. Compilación de Producción y Distribuibles (`electron-builder`)

La configuración de distribución de Windows está definida en `package.json` en la clave `"build"`.

### Proceso de Empaquetado:
```bash
# Paso 1: Generar bundle estático web
npm run build

# Paso 2: Generar distribuibles nativos de Windows
npx electron-builder
```

### Binarios Generados en `release/`:
- **Instalador NSIS**: `release/Lummo Studio Setup 2.1.0.exe` (Permite seleccionar directorio de instalación y crea accesos directos en Escritorio y Menú Inicio).
- **Ejecutable Portable**: `release/Lummo Studio 2.1.0.exe` (Ejecución directa sin instalación previa).

---

## 5. Sistema de Internacionalización (i18n)

Lummo Studio soporta múltiples idiomas a través de diccionarios de traducción almacenados en `src/locales/`.

### Estructura de Diccionarios:
- `src/locales/es.json`: Diccionario en Español.
- `src/locales/en.json`: Diccionario en Inglés.

### Cómo agregar una nueva clave de traducción:
1. Añada la propiedad en `src/locales/es.json`:
   ```json
   "new_feature_title": "Título de la Nueva Función"
   ```
2. Añada la traducción equivalente en `src/locales/en.json`:
   ```json
   "new_feature_title": "New Feature Title"
   ```
3. Utilice la función `t()` en componentes de React:
   ```jsx
   const { t } = useTranslation();
   <h1>{t('new_feature_title')}</h1>
   ```
4. Verifique la paridad ejecutando `npm test`.
