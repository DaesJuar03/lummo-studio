const { app, BrowserWindow, ipcMain, dialog, shell, Tray, Menu, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');
const net = require('net');
const dbManager = require('./dbManager.cjs');
const tunnelManager = require('./tunnelManager.cjs');
const proxyManager = require('./proxyManager.cjs');

// Modular IPC Controllers
const { registerSystemHandlers } = require('./ipc/systemHandlers.cjs');
const { registerDbHandlers } = require('./ipc/dbHandlers.cjs');
const { registerTunnelProxyHandlers } = require('./ipc/tunnelProxyHandlers.cjs');
const { registerProjectHandlers } = require('./ipc/projectHandlers.cjs');

function sanitizeShellCommand(cmd) {
  if (typeof cmd !== 'string') return '';
  // Remover caracteres de control nulos o no imprimibles
  let clean = cmd.replace(/[\x00-\x08\x0E-\x1F\x7F]/g, '').trim();
  return clean;
}

function runProjectScript(projectId, folderPath, scriptCommand, emitLog) {
  const cleanCmd = sanitizeShellCommand(scriptCommand);
  if (!folderPath || !cleanCmd || !fs.existsSync(folderPath)) {
    if (emitLog) emitLog(projectId, '[Lummo Script Error] Ruta de carpeta inexistente o comando inválido.');
    return Promise.resolve({ success: false, error: 'Comando o carpeta vacíos o inexistentes' });
  }

  return new Promise((resolve) => {
    emitLog(projectId, `\n[Lummo Script] === Ejecutando: "${cleanCmd}" ===`);
    emitLog(projectId, `[Lummo Script] Carpeta: ${folderPath}`);

    const child = spawn(cleanCmd, [], {
      cwd: folderPath,
      shell: true,
      env: { ...process.env }
    });

    child.stdout.on('data', (data) => {
      if (emitLog) emitLog(projectId, data.toString());
    });

    child.stderr.on('data', (data) => {
      if (emitLog) emitLog(projectId, data.toString());
    });

    child.on('error', (err) => {
      if (emitLog) emitLog(projectId, `[Lummo Script Error] ${err.message}`);
      resolve({ success: false, error: err.message });
    });

    child.on('close', (code) => {
      const msg = code === 0 
        ? `[Lummo Script] Comando "${cleanCmd}" completado exitosamente.`
        : `[Lummo Script] Comando "${cleanCmd}" finalizó con código de salida ${code}.`;
      if (emitLog) emitLog(projectId, msg);
      resolve({ success: code === 0, code });
    });
  });
}



let mainWindow = null;
let tray = null;
let isQuitting = false;

const runningProcesses = new Map();
const projectLogsStore = new Map();
const logWindows = new Map();
let activeCloneProcess = null;

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
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Lummo Studio',
    icon: fs.existsSync(appIconPath) ? appIconPath : path.join(__dirname, '../public/Lummo.png'),
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Minimize to System Tray when closing the main window
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });
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

  const iconPath = fs.existsSync(appIconPath) ? appIconPath : path.join(__dirname, '../public/Lummo.png');
  tray = new Tray(iconPath);
  tray.setToolTip('Lummo Studio - Entornos de Desarrollo Locales');

  updateTrayContextMenu = () => {
    if (!tray) return;

    const activeCount = runningProcesses.size;
    const activeItems = [];

    runningProcesses.forEach((item, projectId) => {
      const name = item.name || projectId;
      const port = item.port || 3000;
      activeItems.push({
        label: `  ⚡ ${name} (http://localhost:${port})`,
        submenu: [
          {
            label: `Abrir en navegador (http://localhost:${port})`,
            click: () => shell.openExternal(`http://localhost:${port}`)
          },
          {
            label: 'Detener Servidor',
            click: () => stopProjectById(projectId)
          }
        ]
      });
    });

    const menuTemplate = [
      { 
        label: 'Lummo Studio v1.0', 
        enabled: false 
      },
      {
        label: activeCount > 0 ? `🟢 ${activeCount} Servidor(es) en ejecución` : '⚪ Sin servidores activos',
        enabled: false
      },
      ...activeItems,
      { type: 'separator' },
      { 
        label: 'Abrir Lummo Studio', 
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        } 
      },
      ...(activeCount > 0 ? [
        {
          label: 'Detener Todos los Servidores',
          click: () => stopAllProjects()
        }
      ] : []),
      { type: 'separator' },
      { 
        label: 'Salir de Lummo (Cerrar todos los procesos)', 
        click: () => {
          isQuitting = true;
          stopAllProjects();
          app.quit();
        } 
      }
    ];

    tray.setContextMenu(Menu.buildFromTemplate(menuTemplate));
  };

  updateTrayContextMenu();

  // Click on System Tray Icon restores/shows main window
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
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
      nodeIntegration: false
    }
  });

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
  registerTunnelProxyHandlers((projectId, msg) => {
    let existing = projectLogsStore.get(projectId) || [];
    existing.push(msg);
    projectLogsStore.set(projectId, existing);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('process-log', { projectId, message: msg });
    }
  });
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
    activeCloneProcessRef: { current: activeCloneProcess }
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

// IPC Handlers
ipcMain.handle('open-log-window', (event, { projectId, projectName }) => {
  openLogWindow(projectId, projectName);
  return { success: true };
});

ipcMain.handle('get-project-logs', (event, projectId) => {
  return projectLogsStore.get(projectId) || [];
});

ipcMain.handle('send-notification', (event, { title, body, silent }) => {
  showNativeNotification({ title, body, silent });
  return { success: true };
});

ipcMain.handle('clear-project-logs', (event, projectId) => {
  projectLogsStore.set(projectId, []);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('logs-cleared', { projectId });
  }
  if (logWindows.has(projectId)) {
    const logWin = logWindows.get(projectId);
    if (logWin && !logWin.isDestroyed()) {
      logWin.webContents.send('logs-cleared', { projectId });
    }
  }
  return { success: true };
});

ipcMain.handle('clear-all-logs', () => {
  projectLogsStore.clear();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('logs-cleared', { all: true });
  }
  logWindows.forEach((logWin) => {
    if (logWin && !logWin.isDestroyed()) {
      logWin.webContents.send('logs-cleared', { all: true });
    }
  });
  return { success: true };
});



// --------------------------------------------------------------------------
// Public Tunnels (Cloudflare / Localtunnel)
// --------------------------------------------------------------------------
ipcMain.handle('start-tunnel', async (event, { projectId, port }) => {
  const emitLog = (id, message) => {
    let existing = projectLogsStore.get(id) || [];
    existing.push(message);
    if (existing.length > MAX_LOG_LINES) existing = existing.slice(-MAX_LOG_LINES);
    projectLogsStore.set(id, existing);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('process-log', { projectId: id, message });
    }
  };

  const emitUrl = (id, url) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('tunnel-url', { projectId: id, tunnelUrl: url });
    }
    if (url) {
      showNativeNotification({
        title: 'Túnel Público Activo 🌐',
        body: `URL Pública lista: ${url}`
      });
    }
  };

  tunnelManager.startTunnel(projectId, port, emitLog, emitUrl);
  return { success: true };
});

ipcMain.handle('stop-tunnel', async (event, projectId) => {
  const emitLog = (id, message) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('process-log', { projectId: id, message });
    }
  };
  const emitUrl = (id, url) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('tunnel-url', { projectId: id, tunnelUrl: url });
    }
  };

  tunnelManager.stopTunnel(projectId, emitLog, emitUrl);
  return { success: true };
});

// --------------------------------------------------------------------------
// Local Custom Domains (.test Proxy)
// --------------------------------------------------------------------------
ipcMain.handle('set-local-domain', async (event, { domain, port }) => {
  if (!domain) {
    return { success: false, error: 'Dominio no proporcionado' };
  }
  proxyManager.registerDomain(domain, port);
  const proxyUrl = `http://localhost:${proxyManager.proxyPort}/proxy/${port}`;
  return { success: true, domain, port, proxyUrl };
});

ipcMain.handle('get-local-domains', async () => {
  return proxyManager.getRegisteredDomains();
});

// --------------------------------------------------------------------------
// Project Script Launcher
// --------------------------------------------------------------------------
ipcMain.handle('run-project-script', async (event, { projectId, folderPath, scriptCommand }) => {
  const emitLog = (id, message) => {
    let existing = projectLogsStore.get(id) || [];
    existing.push(message);
    if (existing.length > MAX_LOG_LINES) existing = existing.slice(-MAX_LOG_LINES);
    projectLogsStore.set(id, existing);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('process-log', { projectId: id, message });
    }
  };

  return await runProjectScript(projectId, folderPath, scriptCommand, emitLog);
});



async function detectInstalledEditors() {
  const candidateEditors = [
    { id: 'code', name: 'Visual Studio Code', cmd: 'code', description: 'Editor estándar de Microsoft' },
    { id: 'code-insiders', name: 'VS Code Insiders', cmd: 'code-insiders', description: 'Edición preliminar de VS Code' },
    { id: 'cursor', name: 'Cursor AI Editor', cmd: 'cursor', description: 'Editor de código potenciado por IA' },
    { id: 'windsurf', name: 'Windsurf IDE', cmd: 'windsurf', description: 'IDE inteligente de Codeium' },
    { id: 'subl', name: 'Sublime Text', cmd: 'subl', description: 'Editor ultra-rápido y ligero' },
    { id: 'webstorm', name: 'JetBrains WebStorm', cmd: 'webstorm', description: 'IDE profesional para JavaScript/TypeScript' },
    { id: 'phpstorm', name: 'JetBrains PhpStorm', cmd: 'phpstorm', description: 'IDE profesional para PHP / Laravel' },
    { id: 'pycharm', name: 'JetBrains PyCharm', cmd: 'pycharm', description: 'IDE profesional para Python' },
    { id: 'notepad++', name: 'Notepad++', cmd: 'notepad++', description: 'Editor clásico de texto y código' },
    { id: 'explorer', name: 'Explorador de Archivos', cmd: 'explorer', description: 'Explorador nativo de Windows' }
  ];

  const results = await Promise.all(
    candidateEditors.map((editor) => {
      if (editor.cmd === 'explorer') {
        return Promise.resolve({ ...editor, installed: true });
      }
      return new Promise((resolve) => {
        const checkCmd = process.platform === 'win32' ? `where ${editor.cmd}` : `which ${editor.cmd}`;
        exec(checkCmd, (err, stdout) => {
          if (err || !stdout || !stdout.trim()) {
            resolve({ ...editor, installed: false });
          } else {
            resolve({ ...editor, installed: true, execPath: stdout.trim().split('\n')[0] });
          }
        });
      });
    })
  );

  return results;
}

// IPC Handler for Cancelling Git Repository Clone
ipcMain.handle('cancel-clone-repository', async () => {
  if (activeCloneProcess) {
    try {
      if (process.platform === 'win32') {
        exec(`taskkill /pid ${activeCloneProcess.pid} /T /F`);
      } else {
        activeCloneProcess.kill('SIGTERM');
      }
    } catch (e) {}
    activeCloneProcess = null;
  }
  return { success: true };
});

// IPC Handler for Git Repository Cloning with Real-time Progress Bar
ipcMain.handle('clone-repository', async (event, { repoUrl, destinationParentFolder }) => {
  return new Promise((resolve) => {
    try {
      let cleanUrl = (repoUrl || '').trim();
      let repoName = path.basename(cleanUrl, '.git') || 'cloned-repo';
      if (repoName.endsWith('/')) repoName = repoName.slice(0, -1);
      repoName = path.basename(repoName, '.git');

      const targetFolder = path.join(destinationParentFolder, repoName);

      const emitProgress = (percentage, statusText) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('clone-progress', { percentage, statusText, targetFolder, repoName });
        }
      };

      emitProgress(10, 'Iniciando conexión con el servidor Git remoto...');

      const child = spawn('git', ['clone', '--progress', cleanUrl, `"${targetFolder}"`], {
        shell: true,
        cwd: destinationParentFolder
      });

      activeCloneProcess = child;
      let stdErrLogs = '';

      child.stderr.on('data', (data) => {
        const msg = data.toString();
        stdErrLogs += msg;
        console.log('git clone output:', msg);

        if (msg.includes('Receiving objects')) {
          const match = msg.match(/Receiving objects:\s*(\d+)%/);
          if (match) {
            const percent = Math.min(90, 10 + Math.floor(parseInt(match[1], 10) * 0.7));
            emitProgress(percent, 'Descargando objetos del repositorio...');
          }
        } else if (msg.includes('Resolving deltas')) {
          emitProgress(95, 'Resolviendo deltas y estructurando archivos...');
        } else if (msg.includes('Cloning into')) {
          emitProgress(20, 'Clonando repositorio remoto...');
        } else {
          emitProgress(40, msg.trim().slice(0, 80).replace(/:\s*\d+%/g, ''));
        }
      });

      child.on('close', (code) => {
        activeCloneProcess = null;
        if (code === 0) {
          emitProgress(100, '¡Repositorio descargado e importado con éxito!');
          showNativeNotification({
            title: 'Clonación Completada 🚀',
            body: `El repositorio "${repoName}" se importó correctamente a Lummo Studio.`
          });
          resolve({ success: true, targetFolder, repoName });
        } else {
          let errorDetail = 'Error al clonar el repositorio.';
          if (stdErrLogs.includes('Repository not found') || stdErrLogs.includes('not found')) {
            errorDetail = 'El repositorio no existe o es privado (requiere credenciales SSH/token).';
          } else if (stdErrLogs.includes('already exists')) {
            errorDetail = `La carpeta "${repoName}" ya existe en el destino seleccionado.`;
          } else if (stdErrLogs.includes('Could not resolve host')) {
            errorDetail = 'No se pudo conectar al servidor Git. Verifica tu conexión a internet o la URL.';
          } else if (stdErrLogs.trim()) {
            errorDetail = stdErrLogs.trim().split('\n').pop() || errorDetail;
          }
          showNativeNotification({
            title: 'Error de Clonación ⚠️',
            body: errorDetail
          });
          resolve({ success: false, error: errorDetail });
        }
      });

      child.on('error', (err) => {
        activeCloneProcess = null;
        showNativeNotification({
          title: 'Error de Clonación ⚠️',
          body: err.message
        });
        resolve({ success: false, error: err.message });
      });
    } catch (err) {
      activeCloneProcess = null;
      resolve({ success: false, error: err.message });
    }
  });
});

ipcMain.handle('start-project', async (event, project) => {
  const emitLog = (projectId, message) => {
    let existing = projectLogsStore.get(projectId) || [];
    existing.push(message);
    if (existing.length > MAX_LOG_LINES) {
      existing = existing.slice(-MAX_LOG_LINES);
    }
    projectLogsStore.set(projectId, existing);

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('process-log', { projectId, message });
    }

    if (logWindows.has(projectId)) {
      const logWin = logWindows.get(projectId);
      if (logWin && !logWin.isDestroyed()) {
        logWin.webContents.send('process-log', { projectId, message });
      }
    }
  };

  const emitStatus = (projectId, status) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('process-status', { projectId, status });
    }
    if (logWindows.has(projectId)) {
      const logWin = logWindows.get(projectId);
      if (logWin && !logWin.isDestroyed()) {
        logWin.webContents.send('process-status', { projectId, status });
      }
    }
  };

  const baseCommand = project.command || 'npm run dev';
  const port = project.port || 3000;

  // Clean CLI Port Enforcement (--port only, no -p)
  let finalCommand = baseCommand;
  if (baseCommand.includes('npm run dev') || baseCommand.includes('npm start')) {
    if (!baseCommand.includes('--port')) {
      finalCommand = `${baseCommand} -- --port ${port}`;
    }
  } else if (baseCommand.includes('vite')) {
    if (!baseCommand.includes('--port')) {
      finalCommand = `${baseCommand} --port ${port}`;
    }
  } else if (baseCommand.includes('php artisan serve')) {
    if (!baseCommand.includes('--port')) {
      finalCommand = `${baseCommand} --port=${port}`;
    }
  }

  emitLog(project.id, `[Lummo Studio] Ejecutando: ${finalCommand} en ${project.path} (Puerto ${port})...`);

  const child = spawn(finalCommand, {
    cwd: project.path,
    shell: true,
    env: { 
      ...process.env, 
      PORT: String(port), 
      VITE_PORT: String(port),
      NEXT_PUBLIC_PORT: String(port)
    }
  });

  runningProcesses.set(project.id, { child, name: project.name || 'Proyecto', port, path: project.path });
  emitStatus(project.id, 'RUNNING');
  updateTrayContextMenu();

  showNativeNotification({
    title: 'Servidor Iniciado 🟢',
    body: `${project.name || 'Proyecto'} escuchando en http://localhost:${port}`
  });

  child.stdout.on('data', (data) => {
    emitLog(project.id, data.toString());
  });

  child.stderr.on('data', (data) => {
    emitLog(project.id, data.toString());
  });

  child.on('close', (code) => {
    emitLog(project.id, `[Lummo Studio] El proceso terminó con código ${code}`);
    runningProcesses.delete(project.id);
    updateTrayContextMenu();
    emitStatus(project.id, 'STOPPED');

    if (code !== 0 && code !== null) {
      showNativeNotification({
        title: 'Servidor Finalizado ⚠️',
        body: `${project.name || 'El proceso'} terminó con código de salida ${code}`
      });
    }
  });

  return { success: true };
});

ipcMain.handle('stop-project', async (event, projectId) => {
  stopProjectById(projectId);
  return { success: true };
});



function checkCommandAvailable(cmd) {
  return new Promise((resolve) => {
    const checkCmd = process.platform === 'win32' ? `where ${cmd}` : `which ${cmd}`;
    exec(checkCmd, (err, stdout) => {
      if (err || !stdout) {
        resolve({ installed: false });
      } else {
        const fullPath = stdout.trim().split('\n')[0];
        exec(`${cmd} --version`, (vErr, vStdout) => {
          const versionStr = vStdout ? vStdout.trim().split('\n')[0] : 'Instalado';
          resolve({ installed: true, version: versionStr, path: fullPath });
        });
      }
    });
  });
}

async function scanSystemEnvironment() {
  const node = await checkCommandAvailable('node');
  const php = await checkCommandAvailable('php');
  const mysql = await checkCommandAvailable('mysql');
  const postgres = await checkCommandAvailable('psql');
  const python = await checkCommandAvailable('python');
  const docker = await checkCommandAvailable('docker');

  return {
    node,
    php,
    mysql,
    postgres,
    python,
    docker,
    sqlite: { installed: true, version: 'Engine Embebido Lummo' }
  };
}

function analyzeSingleFolder(folderPath) {
  const folderName = path.basename(folderPath);
  let result = {
    name: folderName,
    path: folderPath,
    techStack: 'Proyectos Varios',
    icon: 'code',
    command: 'lummo:static',
    defaultPort: 8080,
    hasPackageJson: false,
    availableCommands: [],
    isBackend: false,
    isFrontend: false
  };

  if (!fs.existsSync(folderPath)) {
    return result;
  }

  const files = fs.readdirSync(folderPath);
  const pkgPath = path.join(folderPath, 'package.json');

  if (fs.existsSync(pkgPath)) {
    result.hasPackageJson = true;
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.name) result.name = pkg.name;
      const scripts = pkg.scripts || {};
      result.availableCommands = Object.keys(scripts).map(s => `npm run ${s}`);
      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

      if (deps['next']) {
        result.techStack = 'Next.js App';
        result.icon = 'next';
        result.command = scripts.dev ? 'npm run dev' : 'npm start';
        result.defaultPort = 3000;
        result.isFrontend = true;
      } else if (deps['vite']) {
        result.techStack = deps['react'] ? 'Vite + React' : deps['vue'] ? 'Vite + Vue' : 'Vite Web App';
        result.icon = 'react';
        result.command = scripts.dev ? 'npm run dev' : 'npm start';
        result.defaultPort = 5173;
        result.isFrontend = true;
      } else if (deps['react']) {
        result.techStack = 'React App';
        result.icon = 'react';
        result.command = scripts.start ? 'npm start' : 'npm run dev';
        result.defaultPort = 3000;
        result.isFrontend = true;
      } else if (deps['express'] || deps['nest'] || deps['@nestjs/core'] || deps['fastify'] || deps['koa'] || deps['hono']) {
        result.techStack = deps['nest'] || deps['@nestjs/core'] ? 'NestJS Backend' : deps['fastify'] ? 'Fastify Server' : 'Express Node Server';
        result.icon = 'node';
        result.command = scripts.dev ? 'npm run dev' : scripts.start ? 'npm start' : 'node index.js';
        result.defaultPort = 5000;
        result.isBackend = true;
      } else {
        result.techStack = 'Node.js Application';
        result.icon = 'node';
        result.command = scripts.dev ? 'npm run dev' : scripts.start ? 'npm start' : 'node index.js';
        result.defaultPort = 3000;
      }
      return result;
    } catch (e) {}
  }

  const hasComposer = files.includes('composer.json');
  const hasPhpFiles = files.some(f => f.endsWith('.php') || f === 'index.php');
  if (hasComposer || hasPhpFiles) {
    result.techStack = hasComposer ? 'PHP / Laravel Application' : 'PHP Web Application';
    result.icon = 'php';
    result.command = hasComposer ? 'php artisan serve' : 'php -S localhost:{port}';
    result.defaultPort = 8000;
    result.isBackend = true;
    return result;
  }

  const hasPython = files.some(f => f === 'app.py' || f === 'main.py' || f === 'requirements.txt' || f === 'Pipfile' || f.endsWith('.py'));
  if (hasPython) {
    result.techStack = 'Python Server / Application';
    result.icon = 'python';
    result.isBackend = true;
    if (files.includes('app.py')) {
      result.command = 'python app.py';
    } else if (files.includes('main.py')) {
      result.command = 'python main.py';
    } else {
      result.command = 'python -m http.server {port}';
    }
    result.defaultPort = 8000;
    return result;
  }

  const hasHtml = files.some(f => f === 'index.html' || f.endsWith('.html'));
  if (hasHtml) {
    result.techStack = 'Sitio Web HTML/CSS/JS';
    result.icon = 'html';
    result.command = 'lummo:static';
    result.defaultPort = 8080;
    result.isFrontend = true;
    return result;
  }

  if (files.includes('docker-compose.yml') || files.includes('Dockerfile')) {
    result.techStack = 'Docker Container Environment';
    result.icon = 'docker';
    result.command = 'docker compose up';
    result.defaultPort = 8080;
    result.isBackend = true;
    return result;
  }

  return result;
}

function parseEnvApiUrl(folderPath) {
  const envFiles = ['.env', '.env.local', '.env.development'];
  for (const envFile of envFiles) {
    const fullPath = path.join(folderPath, envFile);
    if (fs.existsSync(fullPath)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const [key, ...valParts] = trimmed.split('=');
            const k = key.trim();
            const val = valParts.join('=').trim().replace(/['"]/g, '');
            if (['VITE_API_URL', 'REACT_APP_API_URL', 'NEXT_PUBLIC_API_URL', 'BACKEND_URL', 'API_URL'].includes(k) && val) {
              return val;
            }
          }
        }
      } catch (e) {}
    }
  }
  return null;
}

function detectProjectType(folderPath) {
  if (!fs.existsSync(folderPath)) {
    return {
      name: path.basename(folderPath),
      path: folderPath,
      techStack: 'Proyectos Varios',
      icon: 'code',
      command: 'lummo:static',
      defaultPort: 8080,
      hasPackageJson: false,
      availableCommands: []
    };
  }

  const rootAnalysis = analyzeSingleFolder(folderPath);
  let subdirs = [];
  try {
    subdirs = fs.readdirSync(folderPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.') && dirent.name !== 'node_modules' && dirent.name !== 'dist' && dirent.name !== 'build')
      .map(dirent => dirent.name);
  } catch (e) {}

  const backendFolderNames = ['backend', 'server', 'api', 'backend-api', 'services', 'srv', 'laravel'];
  const frontendFolderNames = ['frontend', 'client', 'web', 'ui', 'app'];

  let foundBackendFolder = subdirs.find(d => backendFolderNames.includes(d.toLowerCase()));
  let foundFrontendFolder = subdirs.find(d => frontendFolderNames.includes(d.toLowerCase()));

  let hasBackend = false;
  let backendData = null;

  if (!rootAnalysis.hasPackageJson && foundFrontendFolder && foundBackendFolder) {
    const frontendPath = path.join(folderPath, foundFrontendFolder);
    const backendPath = path.join(folderPath, foundBackendFolder);

    const frontendAnalysis = analyzeSingleFolder(frontendPath);
    const backendAnalysis = analyzeSingleFolder(backendPath);

    hasBackend = true;
    backendData = {
      name: backendAnalysis.name || foundBackendFolder,
      path: backendPath,
      subfolder: foundBackendFolder,
      techStack: backendAnalysis.techStack,
      icon: backendAnalysis.icon,
      command: backendAnalysis.command,
      defaultPort: backendAnalysis.defaultPort || 5000,
      availableCommands: backendAnalysis.availableCommands || []
    };

    return {
      name: path.basename(folderPath),
      path: folderPath,
      techStack: `Entorno Dual: ${frontendAnalysis.techStack} + ${backendAnalysis.techStack}`,
      dualLabel: `Entorno Dual: Frontend (${foundFrontendFolder}) + Backend (${foundBackendFolder})`,
      icon: frontendAnalysis.icon || 'code',
      command: frontendAnalysis.command,
      defaultPort: frontendAnalysis.defaultPort || 5173,
      hasPackageJson: frontendAnalysis.hasPackageJson,
      availableCommands: frontendAnalysis.availableCommands,
      hasBackend: true,
      backend: backendData,
      envApiUrl: parseEnvApiUrl(frontendPath) || parseEnvApiUrl(folderPath)
    };
  }

  if (foundBackendFolder) {
    const backendPath = path.join(folderPath, foundBackendFolder);
    const backendAnalysis = analyzeSingleFolder(backendPath);

    hasBackend = true;
    backendData = {
      name: backendAnalysis.name || foundBackendFolder,
      path: backendPath,
      subfolder: foundBackendFolder,
      techStack: backendAnalysis.techStack,
      icon: backendAnalysis.icon,
      command: backendAnalysis.command,
      defaultPort: backendAnalysis.defaultPort || (rootAnalysis.defaultPort === 5000 ? 8000 : 5000),
      availableCommands: backendAnalysis.availableCommands || []
    };
  }

  const envApiUrl = parseEnvApiUrl(folderPath);
  if (!hasBackend && envApiUrl) {
    let portMatch = envApiUrl.match(/:(\d+)/);
    let envPort = portMatch ? parseInt(portMatch[1], 10) : 5000;

    hasBackend = true;
    backendData = {
      name: 'Servidor Backend API',
      path: folderPath,
      subfolder: '',
      techStack: 'Backend Configurado en .env',
      icon: 'node',
      command: 'npm run dev:api',
      defaultPort: envPort,
      availableCommands: []
    };
  }

  return {
    ...rootAnalysis,
    dualLabel: hasBackend ? `Entorno Dual: ${rootAnalysis.techStack} + Backend` : null,
    hasBackend,
    backend: backendData,
    envApiUrl
  };
}

function checkPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => {
      resolve(true); // Port busy
    });
    server.once('listening', () => {
      server.close();
      resolve(false); // Port free
    });
    server.listen(port);
  });
}

function findNextAvailablePort(startPort) {
  return new Promise((resolve) => {
    const checkNext = (p) => {
      checkPortFree(p).then((isBusy) => {
        if (!isBusy) resolve(p);
        else checkNext(p + 1);
      });
    };
    checkNext(startPort);
  });
}
