/**
 * Lummo Studio - Auto-Updater Manager
 * Administra el ciclo de vida de las actualizaciones con electron-updater y GitHub Releases.
 */
const { app, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const https = require('https');

let updateInProgress = false;
let latestUpdateInfo = null;

function initUpdateManager(getMainWindow) {
  // Configuración de electron-updater
  autoUpdater.autoDownload = true; // Descarga en segundo plano al detectar
  autoUpdater.autoInstallOnAppQuit = false; // Permitir que el usuario controle el reinicio
  autoUpdater.allowPrerelease = false;

  // 1. Buscando actualizaciones
  autoUpdater.on('checking-for-update', () => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('update-status', { state: 'checking' });
    }
  });

  // 2. Nueva versión disponible -> Comienza la descarga
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

  // 3. No hay actualizaciones
  autoUpdater.on('update-not-available', () => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('update-not-available');
    }
  });

  // 4. Progreso de descarga (0% a 100%)
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

  // 5. Descarga completada -> Listo para reiniciar y aplicar
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

  // 6. Error en el proceso de actualización
  autoUpdater.on('error', (err) => {
    updateInProgress = false;
    console.error('[Lummo Updater Error]:', err?.message || err);
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('update-error', {
        message: err?.message || 'Error al comprobar actualizaciones'
      });
    }
  });

  // --- IPC HANDLERS ---

  // Obtener versión actual de la aplicación
  ipcMain.handle('updater-get-version', () => {
    return app.getVersion();
  });

  // Comprobar manualmente si hay actualizaciones
  ipcMain.handle('updater-check-for-updates', async () => {
    if (!app.isPackaged) {
      // En modo desarrollo, consultar API de GitHub para verificar versión remota
      return checkGitHubReleasesFallback(getMainWindow);
    }

    try {
      return await autoUpdater.checkForUpdates();
    } catch (err) {
      console.warn('[Lummo Updater] Fallback a GitHub API:', err.message);
      return checkGitHubReleasesFallback(getMainWindow);
    }
  });

  // Iniciar descarga explícita (si autoDownload estuviese apagado)
  ipcMain.handle('updater-start-download', async () => {
    try {
      return await autoUpdater.downloadUpdate();
    } catch (err) {
      return { error: err.message };
    }
  });

  // Reiniciar la aplicación e instalar la actualización descargada
  ipcMain.handle('updater-restart-and-apply', () => {
    try {
      if (app.isPackaged) {
        autoUpdater.quitAndInstall(false, true);
      } else {
        // En dev, simula el reinicio
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
  ipcMain.handle('updater-simulate-flow', async (event, { targetVersion = '2.4.0', notes } = {}) => {
    const win = getMainWindow();
    if (!win || win.isDestroyed()) return;

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
        win.webContents.send('update-download-progress', { percent: 100 });
        setTimeout(() => {
          win.webContents.send('update-downloaded', {
            version: targetVersion,
            releaseNotes: sampleNotes
          });
        }, 500);
      } else {
        win.webContents.send('update-download-progress', { percent: currentPercent });
      }
    }, 250);

    return { success: true };
  });

  // Comprobar automáticamente 5 segundos después del inicio
  setTimeout(() => {
    if (app.isPackaged) {
      try {
        autoUpdater.checkForUpdates().catch(e => {
          console.warn('[Lummo Updater Initial Check Warning]:', e.message);
        });
      } catch (e) {}
    }
  }, 5000);
}

/**
 * Fallback a la API de GitHub Releases cuando no está empaquetado o falla el provider
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
