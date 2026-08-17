# Developer Guide, Building & Testing

<p align="center">
  <strong>Lummo Studio v2.1.0 — Technical Module 05 (English)</strong>
</p>

<p align="center">
  <a href="../INDEX_EN.md">← Back to Main Index</a> | 
  <a href="../es/05_guia_desarrollador_compilacion_y_tests.md">Versión en Español</a>
</p>

---

## 1. Development Environment Setup

### Prerequisites:
- **Operating System**: Windows 10 or 11 (64-bit).
- **Node.js**: Version 18.0.0 or higher (Node 20 LTS recommended).
- **Package Manager**: `npm` v9.0.0+ (bundled with Node.js).
- **Git**: Git CLI installed and available in the system `PATH`.

### Clone & Installation Steps:
```bash
# 1. Clone the repository
git clone https://github.com/your-username/lummo-studio.git
cd lummo-studio

# 2. Install dependencies
npm install
```

---

## 2. npm Scripts Reference (`package.json`)

Available development and build commands:

| Command | Execution Description |
| :--- | :--- |
| `npm run dev` | Launches Vite dev server for the Renderer process. |
| `npm run electron:dev` | Runs Vite and Electron concurrently with hot-reloading. |
| `npm run electron:start` | Launches Electron against compiled dist files. |
| `npm run build` | Builds production React bundle using Vite into `dist/`. |
| `npm run dist` | Runs Vite build and packages executable using Electron Builder. |
| `npm test` | Runs automated test suite using **Vitest**. |

---

## 3. Automated Test Suite (**Vitest**)

Automated unit and integration tests are located in `tests/`:

- `tests/sanitizer.test.js`: Input sanitization and shell injection prevention tests.
- `tests/detector.test.js`: Verification of the framework auto-detection engine.
- `tests/dbManager.test.js`: Integration tests for local SQLite state storage.
- `tests/features.test.js`: Functional tests for UI helper routines.
- `tests/locales.test.js`: Validation of i18n translation key parity.

### Run Tests:
```bash
npm test
```

---

## 4. Production Build & Distribution (`electron-builder`)

Packaging settings are configured in `package.json` under the `"build"` key.

### Build Executables:
```bash
# Step 1: Build production web bundle
npm run build

# Step 2: Package Windows executable binaries
npx electron-builder
```

### Generated Binaries in `release/`:
- **NSIS Installer**: `release/Lummo Studio Setup 2.1.0.exe` (Supports custom install path and desktop/start menu shortcuts).
- **Portable Executable**: `release/Lummo Studio 2.1.0.exe` (Standalone execution without installation).

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
