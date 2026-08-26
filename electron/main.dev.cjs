const { app, BrowserWindow, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const proxyManager = require('./proxyManager.cjs');

// Modular IPC Controllers
const { registerSystemHandlers } = require('./ipc/systemHandlers.cjs');
const { registerDbHandlers } = require('./ipc/dbHandlers.cjs');
const { registerTunnelProxyHandlers } = require('./ipc/tunnelProxyHandlers.cjs');
const { registerProjectHandlers } = require('./ipc/projectHandlers.cjs');
const { registerApiWebhookHandlers } = require('./ipc/apiWebhookHandlers.cjs');
const { registerDockerHandlers } = require('./ipc/dockerHandlers.cjs');
const { registerSslHandlers } = require('./ipc/sslHandlers.cjs');

// Modular Window and Tray Managers
const { createMainWindow, applySecurityPolicies } = require('./managers/windowManager.cjs');
const { createSystemTray: initSystemTray } = require('./managers/trayManager.cjs');

let mainWindow = null;
let tray = null;
let isQuitting = false;

const runningProcesses = new Map();
const projectLogsStore = new Map();
const logWindows = new Map();

const appIconPath = path.join(__dirname, '../public/Lummo.ico');
const MAX_LOG_LINES = 1000;

function showNativeNotification({ title, body, icon, silent = false }) {
  try {
    if (Notification.isSupported()) {
      const notif = new Notification({
        title: title || 'Lummo Studio',
        body: body || '',
        icon: icon || (fs.existsSync(appIconPath) ? appIconPath : path.join(__dirname, '../public/Lummo.png')),
        silent
      });
      notif.show();
    }
  } catch (err) {
    console.error('Error al mostrar notificación nativa:', err);
  }
}

// Suppress Chromium disk cache lock warnings on Windows dev reload
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-http-cache');

function createWindow() {
  mainWindow = createMainWindow(appIconPath, () => isQuitting);
}

let updateTrayContextMenu = () => {};

function killProcessTree(child) {
  if (!child) return;
  const pid = typeof child === 'number' ? child : child.pid;
  if (!pid) return;

  try {
    if (process.platform === 'win32') {
      exec(`taskkill /pid ${pid} /T /F`, () => {});
    } else {
      if (child.kill) {
        try { child.kill('SIGTERM'); } catch (e) {}
      }
      try { process.kill(-pid, 'SIGKILL'); } catch (e) {}
    }
  } catch (e) {
    console.error(`[Lummo Cleanup Error] No se pudo finalizar proceso ${pid}:`, e);
  }
}

function stopProjectById(projectId) {
  const item = runningProcesses.get(projectId);
  if (item) {
    const child = item.child || item;
    killProcessTree(child);
    runningProcesses.delete(projectId);
    updateTrayContextMenu();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('process-status', { projectId, status: 'STOPPED' });
    }
  }
}

function stopAllProjects() {
  runningProcesses.forEach((item, projectId) => {
    const child = item.child || item;
    killProcessTree(child);
  });
  runningProcesses.clear();
  updateTrayContextMenu();
}

function createSystemTray() {
  if (tray) return;

  const res = initSystemTray({
    appIconPath,
    getMainWindow: () => mainWindow,
    runningProcesses,
    stopProjectById,
    stopAllProjects,
    setQuittingAndQuit: () => {
      isQuitting = true;
      stopAllProjects();
      app.quit();
    }
  });

  tray = res.tray;
  updateTrayContextMenu = res.updateTrayContextMenu;
}

function openLogWindow(projectId, projectName) {
  if (logWindows.has(projectId)) {
    const existing = logWindows.get(projectId);
    if (!existing.isDestroyed()) {
      existing.focus();
      return;
    }
  }

  const logWindow = new BrowserWindow({
    width: 800,
    height: 500,
    minWidth: 500,
    minHeight: 300,
    title: `Logs: ${projectName}`,
    icon: fs.existsSync(appIconPath) ? appIconPath : path.join(__dirname, '../public/Lummo.png'),
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: !app.isPackaged
    }
  });

  applySecurityPolicies(logWindow);

  const queryName = encodeURIComponent(projectName || 'Terminal');
  const targetUrl = process.env.VITE_DEV_SERVER_URL
    ? `${process.env.VITE_DEV_SERVER_URL}#/logs/${projectId}?name=${queryName}`
    : `file://${path.join(__dirname, '../dist/index.html')}#/logs/${projectId}?name=${queryName}`;

  logWindow.loadURL(targetUrl);

  logWindow.on('closed', () => {
    logWindows.delete(projectId);
  });

  logWindows.set(projectId, logWindow);
}

app.whenReady().then(() => {
  createWindow();
  createSystemTray();

  // Register Modular IPC Handlers
  registerSystemHandlers(() => mainWindow, appIconPath);
  registerDbHandlers(() => mainWindow);
  registerDockerHandlers();
  registerSslHandlers();
  proxyManager.initProxyServers();

  registerApiWebhookHandlers(
    () => mainWindow,
    (projectId, msg) => {
      let existing = projectLogsStore.get(projectId) || [];
      existing.push(msg);
      if (existing.length > MAX_LOG_LINES) existing = existing.slice(-MAX_LOG_LINES);
      projectLogsStore.set(projectId, existing);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('process-log', { projectId, message: msg });
      }
    }
  );

  registerTunnelProxyHandlers(
    (projectId, msg) => {
      let existing = projectLogsStore.get(projectId) || [];
      existing.push(msg);
      if (existing.length > MAX_LOG_LINES) existing = existing.slice(-MAX_LOG_LINES);
      projectLogsStore.set(projectId, existing);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('process-log', { projectId, message: msg });
      }
    },
    (projectId, url) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('tunnel-url', { projectId, tunnelUrl: url });
      }
      if (url) {
        showNativeNotification({
          title: 'Túnel Público Activo 🌐',
          body: `URL Pública lista: ${url}`
        });
      }
    },
    (projectId, eventObj) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('webhook-traffic-event', { projectId, event: eventObj });
      }
    }
  );

  registerProjectHandlers({
    getMainWindow: () => mainWindow,
    runningProcesses,
    projectLogsStore,
    logWindows,
    emitLog: (projectId, msg) => {
      let existing = projectLogsStore.get(projectId) || [];
      existing.push(msg);
      if (existing.length > MAX_LOG_LINES) existing = existing.slice(-MAX_LOG_LINES);
      projectLogsStore.set(projectId, existing);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('process-log', { projectId, message: msg });
      }
    },
    MAX_LOG_LINES,
    stopProjectById,
    updateTrayContextMenu: () => updateTrayContextMenu(),
    showNativeNotification,
    openLogWindow
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  stopAllProjects();
});

app.on('will-quit', () => {
  stopAllProjects();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (isQuitting) {
      app.quit();
    }
  }
});
