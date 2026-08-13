const { BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

function createMainWindow(appIconPath, getIsQuitting) {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Lummo Studio',
    icon: fs.existsSync(appIconPath) ? appIconPath : path.join(__dirname, '../../public/Lummo.png'),
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  // Minimize to System Tray when closing the main window
  mainWindow.on('close', (event) => {
    if (!getIsQuitting()) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });

  return mainWindow;
}

module.exports = {
  createMainWindow
};
