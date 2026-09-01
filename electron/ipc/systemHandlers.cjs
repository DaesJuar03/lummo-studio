const { ipcMain, dialog, shell, Notification, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const { safeHandle } = require('./ipcUtils.cjs');

const ALLOWED_EDITORS = new Set(['code', 'cursor', 'windsurf', 'vscodium', 'subl', 'atom', 'idea', 'webstorm', 'phpstorm', 'notepad', 'notepad++', 'explorer']);

const EDITORS_CATALOG = [
  { id: 'vscode', name: 'Visual Studio Code', cmd: 'code' },
  { id: 'cursor', name: 'Cursor AI Editor', cmd: 'cursor' },
  { id: 'windsurf', name: 'Windsurf IDE', cmd: 'windsurf' },
  { id: 'vscodium', name: 'VSCodium', cmd: 'vscodium' },
  { id: 'subl', name: 'Sublime Text', cmd: 'subl' },
  { id: 'webstorm', name: 'JetBrains WebStorm', cmd: 'webstorm' },
  { id: 'phpstorm', name: 'JetBrains PhpStorm', cmd: 'phpstorm' },
  { id: 'idea', name: 'JetBrains IntelliJ IDEA', cmd: 'idea' },
  { id: 'notepad', name: 'Bloc de Notas (Notepad)', cmd: 'notepad' },
  { id: 'explorer', name: 'Explorador de Archivos', cmd: 'explorer' }
];

function checkCommandAvailable(cmd) {
  return new Promise((resolve) => {
    if (cmd === 'explorer' || cmd === 'notepad') {
      return resolve(true);
    }
    const checkCmd = process.platform === 'win32' ? `where ${cmd}` : `which ${cmd}`;
    exec(checkCmd, { timeout: 1500 }, (err) => {
      resolve(!err);
    });
  });
}

function registerSystemHandlers(getMainWindow, appIconPath) {
  safeHandle('window-minimize', (event) => {
    const win = (event && event.sender) ? (BrowserWindow.fromWebContents(event.sender) || getMainWindow()) : getMainWindow();
    if (win && !win.isDestroyed()) win.minimize();
  });

  safeHandle('window-maximize', (event) => {
    const win = (event && event.sender) ? (BrowserWindow.fromWebContents(event.sender) || getMainWindow()) : getMainWindow();
    if (win && !win.isDestroyed()) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
    }
  });

  safeHandle('window-close', (event) => {
    const win = (event && event.sender) ? (BrowserWindow.fromWebContents(event.sender) || getMainWindow()) : getMainWindow();
    if (win && !win.isDestroyed()) win.close();
  });

  safeHandle('select-folder', async () => {
    const win = getMainWindow();
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory']
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  safeHandle('open-in-browser', (event, url) => {
    if (url) shell.openExternal(url);
  });

  safeHandle('send-notification', (event, { title, body, silent = false }) => {
    try {
      if (Notification.isSupported()) {
        const notif = new Notification({
          title: title || 'Lummo Studio',
          body: body || '',
          icon: fs.existsSync(appIconPath) ? appIconPath : path.join(__dirname, '../../public/Lummo.png'),
          silent
        });
        notif.show();
      }
    } catch (err) {
      console.error('Error al mostrar notificación nativa:', err);
    }
  });

  safeHandle('detect-editors', async () => {
    const results = await Promise.all(
      EDITORS_CATALOG.map(async (item) => {
        const isInstalled = await checkCommandAvailable(item.cmd);
        return {
          id: item.id,
          name: item.name,
          cmd: item.cmd,
          command: item.cmd,
          installed: isInstalled
        };
      })
    );
    return results;
  });

  safeHandle('open-in-editor', (event, { folderPath, editorCmd }) => {
    if (!folderPath || typeof folderPath !== 'string') return;
    const rawCmd = String(editorCmd || 'code').trim().toLowerCase();
    const cmd = ALLOWED_EDITORS.has(rawCmd) ? rawCmd : 'code';

    if (cmd === 'explorer') {
      shell.openPath(folderPath);
    } else {
      const isWin = process.platform === 'win32';
      const child = isWin 
        ? spawn(`"${cmd}" "${folderPath}"`, { detached: true, stdio: 'ignore', shell: true })
        : spawn(cmd, [folderPath], { detached: true, stdio: 'ignore' });
      child.on('error', () => {
        shell.openPath(folderPath);
      });
      child.unref();
    }
  });

  safeHandle('system-install-tech', async (event, techKeys) => {
    if (!Array.isArray(techKeys) || techKeys.length === 0) {
      return { success: false, error: 'No se especificaron tecnologías para instalar.' };
    }

    const { processTechInstallations } = require('./techInstaller.cjs');
    const win = getMainWindow();

    const results = await processTechInstallations(techKeys, (progressData) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('tech-install-progress', progressData);
      }
    });

    return { success: true, results };
  });

  // Reinicio instantáneo para aplicar configuraciones y módulos experimentales
  safeHandle('relaunch-app', () => {
    try {
      const { app } = require('electron');
      app.relaunch();
      app.exit(0);
      return { success: true };
    } catch (err) {
      console.error('[Lummo Relaunch Error]:', err);
      return { success: false, error: err.message };
    }
  });
}

module.exports = { registerSystemHandlers };
