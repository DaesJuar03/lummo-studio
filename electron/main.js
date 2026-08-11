const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');
const net = require('net');

let mainWindow = null;
const runningProcesses = new Map();
const projectLogsStore = new Map();
const logWindows = new Map();
let activeCloneProcess = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Lummo Studio',
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
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
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
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

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
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

ipcMain.handle('window-minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.minimize();
});

ipcMain.handle('window-maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  }
});

ipcMain.handle('window-close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Seleccionar carpeta de tu proyecto para Lummo'
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

ipcMain.handle('scan-environment', async () => {
  return await scanSystemEnvironment();
});

ipcMain.handle('detect-project', async (event, folderPath) => {
  return detectProjectType(folderPath);
});

ipcMain.handle('check-port', async (event, port) => {
  return await checkPortFree(port);
});

ipcMain.handle('find-free-port', async (event, startPort) => {
  return await findNextAvailablePort(startPort);
});

ipcMain.handle('open-in-browser', (event, url) => {
  shell.openExternal(url);
});

ipcMain.handle('open-in-editor', (event, folderPath) => {
  exec(`code "${folderPath}"`, (err) => {
    if (err) {
      exec(`explorer "${folderPath}"`);
    }
  });
});

ipcMain.handle('read-env-file', async (event, folderPath) => {
  try {
    const envPath = path.join(folderPath, '.env');
    if (!fs.existsSync(envPath)) {
      return { exists: false, content: '' };
    }
    const content = fs.readFileSync(envPath, 'utf-8');
    return { exists: true, content };
  } catch (err) {
    console.error('Error reading env file:', err);
    return { exists: false, content: '', error: err.message };
  }
});

ipcMain.handle('write-env-file', async (event, { folderPath, content }) => {
  try {
    const envPath = path.join(folderPath, '.env');
    fs.writeFileSync(envPath, content, 'utf-8');
    return { success: true };
  } catch (err) {
    console.error('Error writing env file:', err);
    return { success: false, error: err.message };
  }
});

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
            emitProgress(percent, `Descargando objetos del repositorio: ${match[1]}%`);
          }
        } else if (msg.includes('Resolving deltas')) {
          emitProgress(95, 'Resolviendo deltas y estructurando archivos...');
        } else if (msg.includes('Cloning into')) {
          emitProgress(20, 'Clonando repositorio remoto...');
        } else {
          emitProgress(40, msg.trim().slice(0, 80));
        }
      });

      child.on('close', (code) => {
        activeCloneProcess = null;
        if (code === 0) {
          emitProgress(100, '¡Repositorio descargado e importado con éxito!');
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
          resolve({ success: false, error: errorDetail });
        }
      });

      child.on('error', (err) => {
        activeCloneProcess = null;
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
    const existing = projectLogsStore.get(projectId) || [];
    existing.push(message);
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

  const command = project.command || 'npm run dev';
  emitLog(project.id, `[Lummo Studio] Ejecutando: ${command} en ${project.path}...`);

  const child = spawn(command, {
    cwd: project.path,
    shell: true,
    env: { ...process.env, PORT: project.port }
  });

  runningProcesses.set(project.id, child);
  emitStatus(project.id, 'RUNNING');

  child.stdout.on('data', (data) => {
    emitLog(project.id, data.toString());
  });

  child.stderr.on('data', (data) => {
    emitLog(project.id, data.toString());
  });

  child.on('close', (code) => {
    emitLog(project.id, `[Lummo Studio] El proceso terminó con código ${code}`);
    runningProcesses.delete(project.id);
    emitStatus(project.id, 'STOPPED');
  });

  return { success: true };
});

ipcMain.handle('stop-project', async (event, projectId) => {
  const child = runningProcesses.get(projectId);
  if (child) {
    if (process.platform === 'win32') {
      exec(`taskkill /pid ${child.pid} /T /F`);
    } else {
      child.kill('SIGTERM');
    }
    runningProcesses.delete(projectId);
  }
  return { success: true };
});

ipcMain.handle('get-recent-projects', async () => {
  try {
    const userDataPath = app.getPath('userData');
    const storePath = path.join(userDataPath, 'recent-projects.json');
    if (fs.existsSync(storePath)) {
      const data = fs.readFileSync(storePath, 'utf-8');
      return JSON.parse(data);
    }
    return [];
  } catch (err) {
    console.error('Error reading recents:', err);
    return [];
  }
});

ipcMain.handle('save-recent-projects', async (event, projectsList) => {
  try {
    const userDataPath = app.getPath('userData');
    const storePath = path.join(userDataPath, 'recent-projects.json');
    fs.writeFileSync(storePath, JSON.stringify(projectsList, null, 2), 'utf-8');
    return { success: true };
  } catch (err) {
    console.error('Error saving recents:', err);
    return { success: false, error: err.message };
  }
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

function detectProjectType(folderPath) {
  const pkgPath = path.join(folderPath, 'package.json');
  const composerPath = path.join(folderPath, 'composer.json');
  const pyPath = path.join(folderPath, 'requirements.txt');

  let name = path.basename(folderPath);
  let techStack = 'Otros';
  let command = 'npm run dev';
  let defaultPort = 3000;

  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.name) name = pkg.name;

      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      if (deps['vite']) {
        techStack = 'Vite + React';
        command = 'npm run dev';
        defaultPort = 5173;
      } else if (deps['next']) {
        techStack = 'Next.js App';
        command = 'npm run dev';
        defaultPort = 3000;
      } else if (deps['express']) {
        techStack = 'Node + Express';
        command = 'node index.js';
        defaultPort = 8080;
      } else {
        techStack = 'Node.js App';
        command = pkg.scripts?.dev ? 'npm run dev' : 'npm start';
        defaultPort = 3000;
      }
    } catch (e) {}
  } else if (fs.existsSync(composerPath)) {
    techStack = 'PHP / Laravel';
    command = 'php artisan serve';
    defaultPort = 8000;
  } else if (fs.existsSync(pyPath)) {
    techStack = 'Python App';
    command = 'python main.py';
    defaultPort = 5000;
  }

  return { name, techStack, command, defaultPort };
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
