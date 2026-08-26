# Developer Guide, Build Pipeline & Testing

<p align="center">
  <strong>Lummo Studio v2.3.0 — Technical Module 05 (English)</strong>
</p>

<p align="center">
  <a href="../INDEX_EN.md">← Back to Main Index</a> | 
  <a href="../es/05_guia_desarrollador_compilacion_y_tests.md">Versión en Español</a>
</p>

---

## 1. Development Environment Setup

### Prerequisites:
- **Operating System**: Windows 10 or 11 (64-bit).
- **Node.js**: Version 18.0.0 or higher (Node 20 / 22 LTS recommended).
- **Package Manager**: `npm` v9.0.0+ (bundled with Node.js).
- **Git**: Git CLI installed and available in the system `PATH`.

### Clone & Install:
```bash
# 1. Clone the repository
git clone https://github.com/your-org/lummo-studio.git
cd lummo-studio

# 2. Install all dependencies
npm install
```

---

## 2. Available Scripts (`package.json`)

The development and packaging scripts include:

| Command | Execution Description |
| :--- | :--- |
| `npm run dev` | Starts the Vite dev server for the React UI. |
| `npm run electron:dev` | Runs Vite and Electron concurrently with live UI HMR. |
| `npm run electron:start` | Launches Electron against development sources or dist. |
| `npm run build` | Builds and obfuscates the production React bundle (`inlineDynamicImports`). |
| `npm run build:electron` | Bundles and compiles main process modules into **V8 Bytecode (`.jsc`)** via Bytenode. |
| `npm run dist` | Runs the full build, bytecode compilation, and packages the Windows binaries. |
| `npm test` | Runs the complete automated test suite using **Vitest**. |

---

## 3. Automated Test Suite (**Vitest**)

Unit and integration tests are organized under the `tests/` directory:

- `tests/sanitizer.test.js`: Shell argument escaping and command injection defense verification.
- `tests/detector.test.js`: Static framework detector accuracy benchmarks.
- `tests/dbManager.test.js`: SQLite local persistence integration tests.
- `tests/features.test.js`: Core studio features and utilities validation.
- `tests/locales.test.js`: Full i18n translation key coverage verification.
- `tests/dockerManager.test.js`: Docker Compose generator and status inspection tests.
- `tests/sslManager.test.js`: Local CA and SSL certificate generation tests.
- `tests/portResolver.test.js`: Active port conflict resolution tests.
- `tests/telemetry.test.js`: Real PID-based CPU and RAM metric validation.

### Run test suite:
```bash
npm test
```

---

## 4. Production Packaging (`electron-builder`)

Packaging configuration for Windows targets is defined in `package.json` under `"build"`.

### Hardened Production Packaging:
```bash
# Automatically triggers: vite build -> build:electron (.jsc bytecode) -> electron-builder
npm run dist
```

### Generated Executables in `release/`:
- **NSIS Installer**: `release/Lummo Studio Setup 2.3.0.exe` (Allows directory selection and desktop/start menu shortcuts).
- **Portable Binary**: `release/Lummo Studio 2.3.0.exe` (Zero-installation standalone executable).

---

## 5. Internationalization (i18n) Framework

Lummo Studio supports multi-language UI translation using dictionaries in `src/locales/`.

### Locale Files:
- `src/locales/es.json`: Spanish translations.
- `src/locales/en.json`: English translations.

### Adding New Translation Keys:
1. Add key to `src/locales/es.json`:
   ```json
   "new_feature_title": "Título de la Nueva Función"
   ```
2. Add key to `src/locales/en.json`:
   ```json
   "new_feature_title": "New Feature Title"
   ```
3. Use `t()` hook in React components:
   ```jsx
   const { t } = useTranslation();
   <h1>{t('new_feature_title')}</h1>
   ```
4. Verify key parity by running `npm test`.
