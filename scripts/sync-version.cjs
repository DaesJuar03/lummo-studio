/**
 * Lummo Studio - Centralized Version Synchronizer
 * Permite cambiar la versión en un solo lugar o ejecutar 'npm run version:set X.X.X'
 * y actualiza automáticamente todos los archivos del proyecto.
 */
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');

// Obtener versión objetivo
const argVersion = process.argv[2];
let targetVersion = '';

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

if (argVersion && !argVersion.startsWith('--')) {
  targetVersion = argVersion.replace(/^v/, '');
  packageJson.version = targetVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
  console.log(`[Version Sync] 🎯 package.json actualizado a: v${targetVersion}`);
} else {
  targetVersion = packageJson.version;
  console.log(`[Version Sync] 🔄 Sincronizando con versión actual de package.json: v${targetVersion}`);
}

const semverRegex = /\d+\.\d+\.\d+/g;

// Archivos a sincronizar automáticamente
const targets = [
  {
    filePath: path.join(rootDir, 'package-lock.json'),
    replace: (content) => {
      try {
        const parsed = JSON.parse(content);
        parsed.version = targetVersion;
        if (parsed.packages && parsed.packages['']) {
          parsed.packages[''].version = targetVersion;
        }
        return JSON.stringify(parsed, null, 2) + '\n';
      } catch (e) {
        return content;
      }
    }
  },
  {
    filePath: path.join(rootDir, 'public/splash.html'),
    replace: (content) => content.replace(/<div class="top-badge">v\d+\.\d+\.\d+<\/div>/g, `<div class="top-badge">v${targetVersion}</div>`)
  },
  {
    filePath: path.join(rootDir, 'src/locales/es.json'),
    replace: (content) => {
      const json = JSON.parse(content);
      json.translations.appVersion = `v${targetVersion}`;
      json.translations.settingsDesc = `Configuración global de Lummo Studio v${targetVersion}`;
      return JSON.stringify(json, null, 2) + '\n';
    }
  },
  {
    filePath: path.join(rootDir, 'src/locales/en.json'),
    replace: (content) => {
      const json = JSON.parse(content);
      json.translations.appVersion = `v${targetVersion}`;
      json.translations.settingsDesc = `Global configuration for Lummo Studio v${targetVersion}`;
      return JSON.stringify(json, null, 2) + '\n';
    }
  },
  {
    filePath: path.join(rootDir, 'src/components/modals/settings/GeneralTab.jsx'),
    replace: (content) => content.replace(/Versión instalada: v\d+\.\d+\.\d+/g, `Versión instalada: v${targetVersion}`)
  },
  {
    filePath: path.join(rootDir, 'src/components/common/ChangelogSheet.jsx'),
    replace: (content) => content.replace(/version = '\d+\.\d+\.\d+'/g, `version = '${targetVersion}'`)
  },
  {
    filePath: path.join(rootDir, 'src/components/common/PostUpdateBanner.jsx'),
    replace: (content) => content.replace(/version = '\d+\.\d+\.\d+'/g, `version = '${targetVersion}'`)
  },
  {
    filePath: path.join(rootDir, 'src/hooks/useAppUpdater.js'),
    replace: (content) => content.replace(/packageInfo\.version \|\| '\d+\.\d+\.\d+'/g, `packageInfo.version || '${targetVersion}'`)
  },
  {
    filePath: path.join(rootDir, 'src/types/lummo.d.ts'),
    replace: (content) => content.replace(/Lummo Studio v\d+\.\d+\.\d+/g, `Lummo Studio v${targetVersion}`)
  },
  {
    filePath: path.join(rootDir, 'README.md'),
    replace: (content) => {
      return content
        .replace(/Lummo Studio v\d+\.\d+\.\d+/g, `Lummo Studio v${targetVersion}`)
        .replace(/Version-\d+\.\d+\.\d+-blue/g, `Version-${targetVersion}-blue`);
    }
  }
];

let updatedCount = 0;

targets.forEach(({ filePath, replace }) => {
  if (fs.existsSync(filePath)) {
    const original = fs.readFileSync(filePath, 'utf8');
    const updated = replace(original);
    if (original !== updated) {
      fs.writeFileSync(filePath, updated, 'utf8');
      console.log(` ✅ Sincronizado: ${path.relative(rootDir, filePath)}`);
      updatedCount++;
    } else {
      console.log(` ⏸️  Ya actualizado: ${path.relative(rootDir, filePath)}`);
    }
  }
});

console.log(`\n🎉 ¡Sincronización completada! Versión activa en todos los archivos: v${targetVersion} (${updatedCount} modificados)\n`);
