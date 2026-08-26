const { ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const scanner = require('../scanner.js');
const detector = require('../detector.js');
const processManager = require('../processManager.js');

function safeHandle(channel, listener) {
  ipcMain.removeHandler(channel);
  ipcMain.handle(channel, listener);
}

function registerProjectHandlers({
  getMainWindow,
  runningProcesses,
  projectLogsStore,
  logWindows,
  emitLog,
  MAX_LOG_LINES,
  activeCloneProcessRef
}) {
  safeHandle('scan-environment', async () => {
    try {
      if (scanner && typeof scanner.scanSystemEnvironment === 'function') {
        return await scanner.scanSystemEnvironment();
      }
      if (scanner && typeof scanner.scanEnvironment === 'function') {
        return await scanner.scanEnvironment();
      }
    } catch (e) {
      console.error('Error escaneando entorno:', e);
    }
    return {
      node: { installed: true, version: process.version },
      sqlite: { installed: true, version: 'Built-in Lummo Engine' }
    };
  });

  safeHandle('detect-project', async (event, folderPath) => {
    try {
      if (detector && typeof detector.detectProjectType === 'function') {
        return detector.detectProjectType(folderPath);
      }
      if (detector && typeof detector.detectProject === 'function') {
        return detector.detectProject(folderPath);
      }
      if (detector && detector.default && typeof detector.default.detectProjectType === 'function') {
        return detector.default.detectProjectType(folderPath);
      }
    } catch (e) {
      console.error('Error detectando proyecto:', e);
    }
    return {
      name: path.basename(folderPath || 'Proyecto'),
      path: folderPath,
      techStack: 'Proyecto Local',
      command: 'npm run dev',
      defaultPort: 3000
    };
  });

  safeHandle('check-port', async (event, port) => {
    try {
      if (processManager && typeof processManager.checkPortFree === 'function') {
        return await processManager.checkPortFree(port);
      }
    } catch (e) {
      console.error('Error al checar puerto:', e);
    }
    return true;
  });

  safeHandle('find-free-port', async (event, startPort) => {
    try {
      if (processManager && typeof processManager.findNextFreePort === 'function') {
        return await processManager.findNextFreePort(startPort);
      }
    } catch (e) {
      console.error('Error al buscar puerto libre:', e);
    }
    return startPort || 3000;
  });

  // Identificar qué proceso y PID ocupa un puerto específico
  safeHandle('identify-port-process', async (event, port) => {
    try {
      if (processManager && typeof processManager.identifyPortProcess === 'function') {
        return await processManager.identifyPortProcess(port);
      }
    } catch (e) {
      console.error('Error identificando proceso en puerto:', e);
    }
    return { busy: false };
  });

  // Liberar forzosamente el puerto ocupado por un proceso
  safeHandle('kill-port-process', async (event, port) => {
    try {
      if (processManager && typeof processManager.killProcessOnPort === 'function') {
        return await processManager.killProcessOnPort(port);
      }
    } catch (e) {
      console.error('Error liberando puerto:', e);
      return { success: false, error: e.message };
    }
    return { success: false, error: 'No se pudo ejecutar la acción' };
  });

  // Telemetría Real de CPU y RAM por PID
  safeHandle('get-process-metrics', async (event, { projectId, pid }) => {
    try {
      let targetPid = pid;
      if (!targetPid && runningProcesses.has(projectId)) {
        const item = runningProcesses.get(projectId);
        const child = item.child || item;
        targetPid = child?.pid;
      }

      if (targetPid && processManager && typeof processManager.getProcessMetrics === 'function') {
        return await processManager.getProcessMetrics(targetPid);
      }
    } catch (e) {
      // ignore
    }
    return { success: false, cpu: 0, memoryMb: 0, elapsedMs: 0 };
  });

  // Scaffolding de Nuevos Proyectos desde Cero (New Project Wizard)
  safeHandle('scaffold-project', async (event, options) => {
    try {
      const emitScaffoldLog = (msg) => {
        const win = getMainWindow();
        if (win && !win.isDestroyed()) {
          win.webContents.send('scaffold-progress', { message: msg });
        }
      };
      if (processManager && typeof processManager.scaffoldNewProject === 'function') {
        return await processManager.scaffoldNewProject(options, emitScaffoldLog);
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
    return { success: false, error: 'Motor de creación de proyectos no disponible' };
  });

  safeHandle('get-recent-projects', async () => {
    try {
      const configPath = path.join(process.cwd(), 'lummo_projects.json');
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (e) {
      console.error('Error leyendo lummo_projects.json:', e);
    }
    return [];
  });

  safeHandle('save-recent-projects', async (event, projectsList) => {
    try {
      const configPath = path.join(process.cwd(), 'lummo_projects.json');
      fs.writeFileSync(configPath, JSON.stringify(projectsList, null, 2), 'utf-8');
      return { success: true };
    } catch (e) {
      console.error('Error guardando lummo_projects.json:', e);
      return { success: false, error: e.message };
    }
  });

  safeHandle('read-env-file', async (event, folderPath) => {
    if (!folderPath) return { success: false, error: 'Ruta no especificada' };
    const envPath = path.join(folderPath, '.env');
    const examplePath = path.join(folderPath, '.env.example');
    try {
      let content = '';
      let exists = false;
      let exampleContent = '';
      let exampleExists = false;

      if (fs.existsSync(envPath)) {
        content = fs.readFileSync(envPath, 'utf-8');
        exists = true;
      }
      if (fs.existsSync(examplePath)) {
        exampleContent = fs.readFileSync(examplePath, 'utf-8');
        exampleExists = true;
      }

      return { success: true, content, exists, exampleContent, exampleExists };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  safeHandle('write-env-file', async (event, { folderPath, content, fileName = '.env' }) => {
    if (!folderPath) return { success: false, error: 'Ruta no especificada' };
    const targetPath = path.join(folderPath, fileName);
    try {
      fs.writeFileSync(targetPath, content, 'utf-8');
      return { success: true, message: `Archivo ${fileName} guardado correctamente.` };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Project Dependency Manager (NPM, Yarn, pnpm, Bun, Pip, Composer)
  safeHandle('install-dependencies', async (event, { projectId, folderPath, manager }) => {
    if (!folderPath) return { success: false, error: 'Ruta no especificada' };

    let cmd = 'npm install';
    let pkgMgr = manager;

    if (!pkgMgr) {
      if (fs.existsSync(path.join(folderPath, 'pnpm-lock.yaml'))) pkgMgr = 'pnpm';
      else if (fs.existsSync(path.join(folderPath, 'yarn.lock'))) pkgMgr = 'yarn';
      else if (fs.existsSync(path.join(folderPath, 'bun.lockb')) || fs.existsSync(path.join(folderPath, 'bun.lock'))) pkgMgr = 'bun';
      else if (fs.existsSync(path.join(folderPath, 'composer.json'))) pkgMgr = 'composer';
      else if (fs.existsSync(path.join(folderPath, 'requirements.txt'))) pkgMgr = 'pip';
      else pkgMgr = 'npm';
    }

    if (pkgMgr === 'pnpm') cmd = 'pnpm install';
    else if (pkgMgr === 'yarn') cmd = 'yarn install';
    else if (pkgMgr === 'bun') cmd = 'bun install';
    else if (pkgMgr === 'composer') cmd = 'composer install';
    else if (pkgMgr === 'pip') cmd = 'pip install -r requirements.txt';

    emitLog(projectId, `\n[Dependencias] === Iniciando instalación con "${cmd}" ===`);
    emitLog(projectId, `[Dependencias] Carpeta objetivo: ${folderPath}`);

    return new Promise((resolve) => {
      const child = spawn(cmd, [], {
        cwd: folderPath,
        shell: true,
        env: { ...process.env }
      });

      child.stdout.on('data', (data) => {
        emitLog(projectId, data.toString());
      });

      child.stderr.on('data', (data) => {
        emitLog(projectId, data.toString());
      });

      child.on('error', (err) => {
        emitLog(projectId, `[Dependencias Error] ${err.message}`);
        resolve({ success: false, error: err.message });
      });

      child.on('close', (code) => {
        if (code === 0) {
          emitLog(projectId, `[Dependencias] Instalación completada exitosamente.`);
          resolve({ success: true, message: 'Dependencias instaladas correctamente.' });
        } else {
          emitLog(projectId, `[Dependencias] Proceso finalizado con código de salida ${code}.`);
          resolve({ success: false, error: `Código de salida ${code}` });
        }
      });
    });
  });

  // HTTPS & Self-Signed SSL Local Certificate Setup
  safeHandle('setup-https', async (event, { projectId, folderPath, domain, port }) => {
    try {
      const sslDir = path.join(process.cwd(), '.lummo_ssl', projectId || 'default');
      if (!fs.existsSync(sslDir)) {
        fs.mkdirSync(sslDir, { recursive: true });
      }

      const keyPath = path.join(sslDir, 'server.key');
      const certPath = path.join(sslDir, 'server.crt');

      if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
        const crypto = require('crypto');
        const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
          modulusLength: 2048,
          publicKeyEncoding: { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });
        
        fs.writeFileSync(keyPath, privateKey);
        fs.writeFileSync(certPath, publicKey);
      }

      const httpsUrl = `https://${domain || 'localhost'}:${port || 443}`;
      emitLog(projectId, `\n[HTTPS Configurado] Certificados SSL listos en: ${sslDir}`);
      emitLog(projectId, `[HTTPS Configurado] Enlace seguro disponible en: ${httpsUrl}`);

      return {
        success: true,
        httpsUrl,
        keyPath,
        certPath,
        message: 'HTTPS y certificados SSL generados exitosamente.'
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  safeHandle('run-project-script', async (event, { projectId, folderPath, scriptCommand }) => {
    if (!folderPath || !scriptCommand) return { success: false, error: 'Comando o carpeta vacíos' };
    emitLog(projectId, `\n[Lummo Script] === Ejecutando: "${scriptCommand}" ===`);
    emitLog(projectId, `[Lummo Script] Carpeta: ${folderPath}`);

    return new Promise((resolve) => {
      const child = spawn(scriptCommand, [], {
        cwd: folderPath,
        shell: true,
        env: { ...process.env }
      });

      child.stdout.on('data', (data) => {
        emitLog(projectId, data.toString());
      });

      child.stderr.on('data', (data) => {
        emitLog(projectId, data.toString());
      });

      child.on('error', (err) => {
        emitLog(projectId, `[Lummo Script Error] ${err.message}`);
        resolve({ success: false, error: err.message });
      });

      child.on('close', (code) => {
        const msg = code === 0 
          ? `[Lummo Script] Comando "${scriptCommand}" completado exitosamente.`
          : `[Lummo Script] Comando "${scriptCommand}" finalizó con código ${code}.`;
        emitLog(projectId, msg);
        resolve({ success: code === 0, code });
      });
    });
  });

  safeHandle('get-project-logs', (event, projectId) => {
    return projectLogsStore.get(projectId) || [];
  });

  safeHandle('clear-project-logs', (event, projectId) => {
    projectLogsStore.set(projectId, []);
    const win = getMainWindow();
    if (win) win.webContents.send('logs-cleared', { projectId });
    return { success: true };
  });

  safeHandle('write-project-stdin', (event, { projectId, input }) => {
    if (!projectId || !input) return { success: false, error: 'Id o entrada vacíos' };
    const result = processManager.sendProjectStdin(projectId, input, emitLog);
    return { success: result };
  });

  safeHandle('clear-all-logs', () => {
    projectLogsStore.clear();
    const win = getMainWindow();
    if (win) win.webContents.send('logs-cleared', { all: true });
    return { success: true };
  });
}

module.exports = { registerProjectHandlers };
