const { ipcMain, dialog, shell, Notification, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const { safeHandle } = require('./ipcUtils.cjs');

const ALLOWED_EDITORS = new Set(['code', 'cursor', 'vscodium', 'subl', 'atom', 'idea', 'webstorm', 'phpstorm', 'notepad', 'explorer']);

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
    const editors = [];
    return new Promise((resolve) => {
      exec('code --version', (err) => {
        if (!err) editors.push({ id: 'vscode', name: 'Visual Studio Code', command: 'code' });
        exec('cursor --version', (errCursor) => {
          if (!errCursor) editors.push({ id: 'cursor', name: 'Cursor', command: 'cursor' });
          exec('vscodium --version', (errCodium) => {
            if (!errCodium) editors.push({ id: 'vscodium', name: 'VSCodium', command: 'vscodium' });
            if (editors.length === 0) {
              editors.push({ id: 'explorer', name: 'Explorador de Archivos', command: 'explorer' });
            }
            resolve(editors);
          });
        });
      });
    });
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
}

module.exports = { registerSystemHandlers };
