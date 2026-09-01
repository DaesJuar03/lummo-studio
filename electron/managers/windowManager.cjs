const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

/**
 * Aplica políticas de seguridad y endurecimiento de runtime a una ventana
 */
function applySecurityPolicies(window) {
  if (!window || !window.webContents) return;

  if (app.isPackaged) {
    // 1. Cerrar DevTools automáticamente si alguien intenta forzar la apertura
    window.webContents.on('devtools-opened', () => {
      window.webContents.closeDevTools();
    });

    // 2. Bloquear atajos de teclado de depuración e inspección (F12, Ctrl+Shift+I/J/C, Ctrl+U)
    window.webContents.on('before-input-event', (event, input) => {
      const key = (input.key || '').toLowerCase();
      // Atajo F12
      if (input.key === 'F12') {
        event.preventDefault();
      }
      // Atajos de DevTools: Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
      if (input.control && input.shift && ['i', 'j', 'c'].includes(key)) {
        event.preventDefault();
      }
      // Ver código fuente: Ctrl+U
      if (input.control && key === 'u') {
        event.preventDefault();
      }
    });
  }

  // 3. Prevenir navegación insegura y abrir enlaces externos en el navegador del sistema
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  window.webContents.on('will-navigate', (event, url) => {
    const isLocal = url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1') || url.startsWith('file://');
    if (!isLocal) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
}

function getPreloadPath() {
  const candidates = [
    path.join(__dirname, '../preload.cjs'),
    path.join(__dirname, 'preload.cjs'),
    path.join(app.getAppPath(), 'electron/preload.cjs')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return path.join(__dirname, '../preload.cjs');
}

function getAppHtmlPath() {
  const candidates = [
    path.join(__dirname, '../../dist/index.html'),
    path.join(__dirname, '../dist/index.html'),
    path.join(app.getAppPath(), 'dist/index.html')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return path.join(app.getAppPath(), 'dist/index.html');
}

function getSplashHtmlPath() {
  const candidates = [
    path.join(__dirname, '../../public/splash.html'),
    path.join(__dirname, '../public/splash.html'),
    path.join(__dirname, '../../dist/splash.html'),
    path.join(__dirname, '../dist/splash.html'),
    path.join(app.getAppPath(), 'public/splash.html'),
    path.join(app.getAppPath(), 'dist/splash.html')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return path.join(__dirname, '../public/splash.html');
}

function createSplashScreen(appIconPath) {
  const resolvedIcon = (appIconPath && fs.existsSync(appIconPath))
    ? appIconPath
    : (fs.existsSync(path.join(__dirname, '../public/Lummo.png'))
        ? path.join(__dirname, '../public/Lummo.png')
        : path.join(__dirname, '../../public/Lummo.png'));

  const splashWindow = new BrowserWindow({
    width: 440,
    height: 280,
    frame: false,
    transparent: false,
    resizable: false,
    alwaysOnTop: true,
    center: true,
    show: true,
    skipTaskbar: false,
    icon: resolvedIcon,
    backgroundColor: '#151515',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: false
    }
  });

  const splashHtml = getSplashHtmlPath();
  if (fs.existsSync(splashHtml)) {
    splashWindow.loadFile(splashHtml);
  }

  return splashWindow;
}

function createMainWindow(appIconPath, getIsQuitting, splashWindow = null) {
  const resolvedIcon = (appIconPath && fs.existsSync(appIconPath))
    ? appIconPath
    : (fs.existsSync(path.join(__dirname, '../public/Lummo.png'))
        ? path.join(__dirname, '../public/Lummo.png')
        : path.join(__dirname, '../../public/Lummo.png'));

  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Lummo Studio',
    icon: resolvedIcon,
    frame: false,
    show: false, // Iniciar oculta mientras el Splash Screen está activo
    backgroundColor: '#141414',
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: !app.isPackaged // Desactivar DevTools completamente en producción
    }
  });

  // Aplicar hardening de seguridad a la ventana principal
  applySecurityPolicies(mainWindow);

  // Eliminar la barra de menú predeterminada de Electron en producción
  if (app.isPackaged) {
    Menu.setApplicationMenu(null);
  }

  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
  const htmlPath = getAppHtmlPath();

  if (!app.isPackaged) {
    // En desarrollo: Conectar a Vite Dev Server con reintento automático
    mainWindow.loadURL(devUrl).catch(() => {
      setTimeout(() => {
        if (!mainWindow.isDestroyed()) {
          mainWindow.loadURL(devUrl).catch(() => {
            if (fs.existsSync(htmlPath)) {
              mainWindow.loadFile(htmlPath);
            }
          });
        }
      }, 800);
    });
  } else {
    // En producción empaquetada: Cargar HTML compilado
    if (fs.existsSync(htmlPath)) {
      mainWindow.loadFile(htmlPath);
    } else if (process.env.VITE_DEV_SERVER_URL) {
      mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    }
  }

  // Manejo de Splash Screen y revelado fluido de la ventana principal
  const startTime = Date.now();
  const MIN_SPLASH_TIME = 1300; // 1.3s para experiencia visual limpia sin congelar la app

  let hasRevealed = false;
  const revealMainWindow = () => {
    if (hasRevealed) return;
    hasRevealed = true;

    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, MIN_SPLASH_TIME - elapsed);

    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
      }
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
      }
    }, remaining);
  };

  mainWindow.once('ready-to-show', revealMainWindow);

  // Fallback de seguridad por si ready-to-show tarda
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      revealMainWindow();
    }
  }, 4000);

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
  createMainWindow,
  createSplashScreen,
  applySecurityPolicies
};

