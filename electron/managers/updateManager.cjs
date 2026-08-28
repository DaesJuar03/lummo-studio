/**
 * Lummo Studio - Auto-Updater Manager
 * Administra el ciclo de vida de las actualizaciones con electron-updater y GitHub Releases.
 */
const { app } = require('electron');
const https = require('https');
const { safeHandle } = require('../ipc/ipcUtils.cjs');

let autoUpdater = null;
try {
  const updaterPkg = require('electron-updater');
  autoUpdater = updaterPkg.autoUpdater;
} catch (err) {
  console.warn('[Lummo Updater] electron-updater no disponible en este entorno:', err.message);
}

let updateInProgress = false;
let latestUpdateInfo = null;

function initUpdateManager(getMainWindow) {
  // 1. Configuración de electron-updater (si está disponible y empaquetado)
  if (autoUpdater && app.isPackaged) {
    try {
      autoUpdater.autoDownload = true;
      autoUpdater.autoInstallOnAppQuit = false;
      autoUpdater.allowPrerelease = false;

      autoUpdater.on('checking-for-update', () => {
        const win = getMainWindow();
        if (win && !win.isDestroyed()) {
          win.webContents.send('update-status', { state: 'checking' });
        }
      });

      autoUpdater.on('update-available', (info) => {
        latestUpdateInfo = info;
        updateInProgress = true;
        const win = getMainWindow();
        if (win && !win.isDestroyed()) {
          win.webContents.send('update-available', {
            version: info.version,
            releaseNotes: info.releaseNotes || 'Mejoras de rendimiento y estabilidad.',
            releaseDate: info.releaseDate
          });
        }
      });

      autoUpdater.on('update-not-available', () => {
        const win = getMainWindow();
        if (win && !win.isDestroyed()) {
          win.webContents.send('update-not-available');
        }
      });

      autoUpdater.on('download-progress', (progressObj) => {
        const win = getMainWindow();
        if (win && !win.isDestroyed()) {
          win.webContents.send('update-download-progress', {
            percent: Math.min(Math.max(progressObj.percent || 0, 0), 100),
            bytesPerSecond: progressObj.bytesPerSecond,
            transferred: progressObj.transferred,
            total: progressObj.total
          });
        }
      });

      autoUpdater.on('update-downloaded', (info) => {
        updateInProgress = false;
        latestUpdateInfo = info;
        const win = getMainWindow();
        if (win && !win.isDestroyed()) {
          win.webContents.send('update-downloaded', {
            version: info.version,
            releaseNotes: info.releaseNotes || 'Mejoras de rendimiento y estabilidad.'
          });
        }
      });

      autoUpdater.on('error', (err) => {
        updateInProgress = false;
        console.warn('[Lummo Updater Error]:', err?.message || err);
        const win = getMainWindow();
        if (win && !win.isDestroyed()) {
          win.webContents.send('update-error', {
            message: err?.message || 'Error al comprobar actualizaciones'
          });
        }
      });
    } catch (e) {
      console.warn('[Lummo Updater Setup Warning]:', e.message);
    }
  }

  // --- IPC HANDLERS SEGUROS (safeHandle) ---

  // Obtener versión actual de la aplicación
  safeHandle('updater-get-version', () => {
    return app.getVersion();
  });

  // Comprobar manualmente si hay actualizaciones
  safeHandle('updater-check-for-updates', async () => {
    if (!app.isPackaged || !autoUpdater) {
      return checkGitHubReleasesFallback(getMainWindow);
    }

    try {
      return await autoUpdater.checkForUpdates();
    } catch (err) {
      console.warn('[Lummo Updater] Fallback a GitHub API:', err.message);
      return checkGitHubReleasesFallback(getMainWindow);
    }
  });

  // Iniciar descarga explícita
  safeHandle('updater-start-download', async () => {
    if (autoUpdater && app.isPackaged) {
      try {
        return await autoUpdater.downloadUpdate();
      } catch (err) {
        return { error: err.message };
      }
    }
    return { success: false, error: 'Solo disponible en versión empaquetada' };
  });

  // Reiniciar la aplicación e instalar la actualización descargada
  safeHandle('updater-restart-and-apply', () => {
    try {
      if (app.isPackaged && autoUpdater) {
        autoUpdater.quitAndInstall(false, true);
      } else {
        app.relaunch();
        app.exit(0);
      }
      return { success: true };
    } catch (err) {
      console.error('[Lummo Updater] Error al reiniciar e instalar:', err);
      return { success: false, error: err.message };
    }
  });

  // Simulador para pruebas de UI y animaciones (Dev & Debug)
  safeHandle('updater-simulate-flow', async (event, { targetVersion = '2.4.0', notes } = {}) => {
    const win = getMainWindow();
    if (!win || win.isDestroyed()) return { success: false };

    const sampleNotes = notes || [
      '⚡ Mayor velocidad al iniciar servidores locales con Vite y Next.js.',
      '🛡️ Nuevo sistema de túneles públicos con detección automática de puertos.',
      '📊 Monitoreo de memoria RAM y CPU en tiempo real para procesos activos.',
      '🎨 Interfaz pulida con animaciones fluidas y soporte mejorado para temas.'
    ].join('\n');

    // 1. Update available
    win.webContents.send('update-available', {
      version: targetVersion,
      releaseNotes: sampleNotes,
      releaseDate: new Date().toISOString()
    });

    // 2. Simular progreso de descarga de 0 a 100
    let currentPercent = 0;
    const interval = setInterval(() => {
      currentPercent += 8;
      if (currentPercent >= 100) {
        clearInterval(interval);
        if (!win.isDestroyed()) {
          win.webContents.send('update-download-progress', { percent: 100 });
          setTimeout(() => {
            if (!win.isDestroyed()) {
              win.webContents.send('update-downloaded', {
                version: targetVersion,
                releaseNotes: sampleNotes
              });
            }
          }, 400);
        }
      } else {
        if (!win.isDestroyed()) {
          win.webContents.send('update-download-progress', { percent: currentPercent });
        }
      }
    }, 250);

    return { success: true };
  });

  // Comprobar automáticamente 5 segundos después del inicio en producción
  setTimeout(() => {
    if (app.isPackaged && autoUpdater) {
      try {
        autoUpdater.checkForUpdates().catch(e => {
          console.warn('[Lummo Updater Initial Check Warning]:', e.message);
        });
      } catch (e) {}
    }
  }, 5000);
}

/**
 * Fallback a la API de GitHub Releases
 */
function checkGitHubReleasesFallback(getMainWindow) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path: '/repos/DaesJuar03/lummo-studio/releases/latest',
      method: 'GET',
      headers: {
        'User-Agent': 'Lummo-Studio-App'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            return resolve({ hasUpdate: false, statusCode: res.statusCode });
          }
          const release = JSON.parse(data);
          const remoteVersion = (release.tag_name || '').replace(/^v/, '');
          const currentVersion = app.getVersion();

          if (isVersionGreater(remoteVersion, currentVersion)) {
            const win = getMainWindow();
            if (win && !win.isDestroyed()) {
              win.webContents.send('update-available', {
                version: remoteVersion,
                releaseNotes: release.body || 'Nueva versión disponible en GitHub.',
                releaseDate: release.published_at
              });
            }
            return resolve({ hasUpdate: true, version: remoteVersion });
          }
          resolve({ hasUpdate: false });
        } catch (err) {
          resolve({ hasUpdate: false, error: err.message });
        }
      });
    });

    req.on('error', (err) => {
      resolve({ hasUpdate: false, error: err.message });
    });

    req.end();
  });
}

function isVersionGreater(v1, v2) {
  if (!v1 || !v2) return false;
  const p1 = v1.split('.').map(n => parseInt(n, 10) || 0);
  const p2 = v2.split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const a = p1[i] || 0;
    const b = p2[i] || 0;
    if (a > b) return true;
    if (a < b) return false;
  }
  return false;
}

module.exports = {
  initUpdateManager
};
