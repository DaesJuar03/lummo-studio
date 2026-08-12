const { ipcMain, dialog, shell, Notification } = require('electron');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

function safeHandle(channel, listener) {
  ipcMain.removeHandler(channel);
  ipcMain.handle(channel, listener);
}

function registerSystemHandlers(getMainWindow, appIconPath) {
  safeHandle('window-minimize', () => {
    const win = getMainWindow();
    if (win) win.minimize();
  });

  safeHandle('window-maximize', () => {
    const win = getMainWindow();
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
    }
  });

  safeHandle('window-close', () => {
    const win = getMainWindow();
    if (win) win.close();
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
    if (!folderPath) return;
    const cmd = editorCmd || 'code';
    if (cmd === 'explorer') {
      shell.openPath(folderPath);
    } else {
      exec(`"${cmd}" "${folderPath}"`, (err) => {
        if (err) {
          shell.openPath(folderPath);
        }
      });
    }
  });
}

module.exports = { registerSystemHandlers };
