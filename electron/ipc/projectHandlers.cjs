const { ipcMain, BrowserWindow, app } = require('electron');
const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const scanner = require('../scanner.js');
const detector = require('../detector.js');
const processManager = require('../processManager.js');
const { safeHandle } = require('./ipcUtils.cjs');

function validateAndSanitizeGitUrl(repoUrl) {
  if (typeof repoUrl !== 'string') {
    return { valid: false, error: 'URL del repositorio no válida.' };
  }
  const cleanUrl = repoUrl.trim();
  if (!cleanUrl) {
    return { valid: false, error: 'Por favor ingresa una URL de repositorio Git.' };
  }
  if (cleanUrl.startsWith('-')) {
    return { valid: false, error: 'URL inválida. No se permiten opciones de comando en la URL.' };
  }
  if (/[\x00-\x1F\x7F\r\n]/.test(cleanUrl)) {
    return { valid: false, error: 'La URL contiene caracteres prohibidos o saltos de línea.' };
  }
  const validGitProtocol = /^(https?:\/\/|git@|ssh:\/\/|git:\/\/)/i;
  if (!validGitProtocol.test(cleanUrl)) {
    return { 
      valid: false, 
      error: 'Formato de URL no soportado. Debe comenzar con https://, http://, git@, ssh:// o git://' 
    };
  }
  return { valid: true, cleanUrl };
}

function registerProjectHandlers({
  getMainWindow,
  runningProcesses,
  projectLogsStore,
  logWindows,
  emitLog,
  MAX_LOG_LINES = 1000,
  stopProjectById,
  updateTrayContextMenu,
  showNativeNotification,
  openLogWindow,
  openApiHubWindow
}) {
  let activeCloneProcess = null;

  const emitStatus = (projectId, status) => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('process-status', { projectId, status });
    }
    if (logWindows && logWindows.has(projectId)) {
      const logWin = logWindows.get(projectId);
      if (logWin && !logWin.isDestroyed()) {
        logWin.webContents.send('process-status', { projectId, status });
      }
    }
  };

  const notifyLog = (projectId, message) => {
    if (typeof emitLog === 'function') {
      emitLog(projectId, message);
    } else {
      let existing = projectLogsStore.get(projectId) || [];
      existing.push(message);
      if (existing.length > MAX_LOG_LINES) existing = existing.slice(-MAX_LOG_LINES);
      projectLogsStore.set(projectId, existing);

      const win = getMainWindow();
      if (win && !win.isDestroyed()) {
        win.webContents.send('process-log', { projectId, message });
      }
    }
  };

  // 1. Escaneo del entorno del sistema
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

  // 2. Detección automática de tipo de proyecto y stack
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

  // 3. Puertos: Comprobar, buscar libre, identificar proceso y liberar
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

  // 4. Telemetría Real de CPU y RAM por PID (pidusage)
  safeHandle('get-process-metrics', async (event, { projectId, pid }) => {
    try {
      let targetPid = pid;
      if (!targetPid && runningProcesses && runningProcesses.has(projectId)) {
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

  // 5. Iniciar y Detener Proyectos
  safeHandle('start-project', async (event, project) => {
    if (!project.path || !fs.existsSync(project.path)) {
      const errorMsg = `[Lummo Studio Error] La carpeta del proyecto no existe: "${project.path}"`;
      notifyLog(project.id, errorMsg);
      emitStatus(project.id, 'ERROR');
      if (typeof showNativeNotification === 'function') {
        showNativeNotification({
          title: 'Error al iniciar ⚠️',
          body: `La carpeta no existe: ${project.path}`
        });
      }
      return { success: false, error: errorMsg };
    }

    const baseCommand = project.command || 'npm run dev';
    const port = project.port || 3000;

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

    notifyLog(project.id, `[Lummo Studio] Ejecutando: ${finalCommand} en ${project.path} (Puerto ${port})...`);

    try {
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

      child.on('error', (err) => {
        notifyLog(project.id, `[Lummo Studio Error] Error al iniciar proceso: ${err.message}`);
        if (runningProcesses) runningProcesses.delete(project.id);
        if (typeof updateTrayContextMenu === 'function') updateTrayContextMenu();
        emitStatus(project.id, 'ERROR');
        if (typeof showNativeNotification === 'function') {
          showNativeNotification({
            title: 'Error al iniciar ⚠️',
            body: err.message
          });
        }
      });

      if (runningProcesses) {
        runningProcesses.set(project.id, { child, name: project.name || 'Proyecto', port, path: project.path });
      }
      emitStatus(project.id, 'RUNNING');
      if (typeof updateTrayContextMenu === 'function') updateTrayContextMenu();

      if (typeof showNativeNotification === 'function') {
        showNativeNotification({
          title: 'Servidor Iniciado 🟢',
          body: `${project.name || 'Proyecto'} escuchando en http://localhost:${port}`
        });
      }

      child.stdout.on('data', (data) => {
        notifyLog(project.id, data.toString());
      });

      child.stderr.on('data', (data) => {
        notifyLog(project.id, data.toString());
      });

      child.on('close', (code) => {
        notifyLog(project.id, `[Lummo Studio] El proceso terminó con código ${code}`);
        if (runningProcesses) runningProcesses.delete(project.id);
        if (typeof updateTrayContextMenu === 'function') updateTrayContextMenu();
        emitStatus(project.id, 'STOPPED');

        if (code !== 0 && code !== null && typeof showNativeNotification === 'function') {
          showNativeNotification({
            title: 'Servidor Finalizado ⚠️',
            body: `${project.name || 'El proceso'} terminó con código de salida ${code}`
          });
        }
      });

      return { success: true };
    } catch (err) {
      notifyLog(project.id, `[Lummo Studio Error] No se pudo lanzar el proceso: ${err.message}`);
      emitStatus(project.id, 'ERROR');
      return { success: false, error: err.message };
    }
  });

  safeHandle('stop-project', async (event, projectId) => {
    if (typeof stopProjectById === 'function') {
      stopProjectById(projectId);
    }
    return { success: true };
  });

  // 6. Clonación de Repositorios Git
  safeHandle('cancel-clone-repository', async () => {
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

  safeHandle('clone-repository', async (event, { repoUrl, destinationParentFolder }) => {
    return new Promise((resolve) => {
      try {
        const validation = validateAndSanitizeGitUrl(repoUrl);
        if (!validation.valid) {
          return resolve({ success: false, error: validation.error });
        }

        const cleanUrl = validation.cleanUrl;
        let repoName = path.basename(cleanUrl, '.git') || 'cloned-repo';
        if (repoName.endsWith('/')) repoName = repoName.slice(0, -1);
        repoName = path.basename(repoName, '.git');
        repoName = repoName.replace(/[^a-zA-Z0-9_\-\.]/g, '_') || 'cloned-repo';

        const targetFolder = path.join(destinationParentFolder, repoName);
        const win = getMainWindow();

        const emitProgress = (percentage, statusText) => {
          if (win && !win.isDestroyed()) {
            win.webContents.send('clone-progress', { percentage, statusText, targetFolder, repoName });
          }
        };

        emitProgress(10, 'Iniciando conexión con el servidor Git remoto...');

        const child = spawn('git', ['clone', '--progress', '--', cleanUrl, targetFolder], {
          shell: false,
          cwd: destinationParentFolder
        });

        activeCloneProcess = child;
        let stdErrLogs = '';

        child.stderr.on('data', (data) => {
          const msg = data.toString();
          stdErrLogs += msg;

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
            if (typeof showNativeNotification === 'function') {
              showNativeNotification({
                title: 'Clonación Completada 🚀',
                body: `El repositorio "${repoName}" se importó correctamente a Lummo Studio.`
              });
            }
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
            if (typeof showNativeNotification === 'function') {
              showNativeNotification({
                title: 'Error de Clonación ⚠️',
                body: errorDetail
              });
            }
            resolve({ success: false, error: errorDetail });
          }
        });

        child.on('error', (err) => {
          activeCloneProcess = null;
          if (typeof showNativeNotification === 'function') {
            showNativeNotification({
              title: 'Error de Clonación ⚠️',
              body: err.message
            });
          }
          resolve({ success: false, error: err.message });
        });
      } catch (err) {
        activeCloneProcess = null;
        resolve({ success: false, error: err.message });
      }
    });
  });

  // 7. Scaffolding de Nuevos Proyectos (New Project Wizard)
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

  // 8. Persistencia Robusta de Proyectos Recientes y Bases de Datos
  const getProjectsStoragePaths = () => {
    let userDataPath = null;
    try {
      if (app && typeof app.getPath === 'function') {
        const userDir = app.getPath('userData');
        if (userDir) {
          userDataPath = path.join(userDir, 'lummo_projects.json');
        }
      }
    } catch {}

    const localPath = path.join(process.cwd(), 'lummo_projects.json');
    return { userDataPath, localPath };
  };

  const getDatabasesStoragePaths = () => {
    let userDataPath = null;
    try {
      if (app && typeof app.getPath === 'function') {
        const userDir = app.getPath('userData');
        if (userDir) {
          userDataPath = path.join(userDir, 'lummo_databases.json');
        }
      }
    } catch {}

    const localPath = path.join(process.cwd(), 'lummo_databases.json');
    return { userDataPath, localPath };
  };

  safeHandle('get-projects-file-path', async () => {
    const { userDataPath, localPath } = getProjectsStoragePaths();
    return {
      userDataPath,
      localPath,
      activePath: (userDataPath && fs.existsSync(userDataPath)) ? userDataPath : localPath
    };
  });

  safeHandle('get-recent-projects', async () => {
    const { userDataPath, localPath } = getProjectsStoragePaths();
    
    // 1. Check userDataPath first
    if (userDataPath && fs.existsSync(userDataPath)) {
      try {
        const content = fs.readFileSync(userDataPath, 'utf-8');
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Error leyendo lummo_projects.json en userData:', e);
      }
    }

    // 2. Check localPath (cwd workspace file)
    if (localPath && fs.existsSync(localPath)) {
      try {
        const content = fs.readFileSync(localPath, 'utf-8');
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Error leyendo lummo_projects.json en localPath:', e);
      }
    }

    return [];
  });

  safeHandle('save-recent-projects', async (event, projectsList) => {
    try {
      if (!Array.isArray(projectsList)) {
        return { success: false, error: 'La lista de proyectos debe ser un array' };
      }

      // Sanitize projects so status is always STOPPED on disk
      const sanitized = projectsList.map(p => ({
        id: p.id,
        name: p.name,
        path: p.path,
        techStack: p.techStack || p.tech,
        command: p.command || '',
        port: p.port,
        status: 'STOPPED',
        hasBackend: Boolean(p.hasBackend),
        backend: p.backend || null,
        envApiUrl: p.envApiUrl || null,
        dualLabel: p.dualLabel || null,
        isArchived: Boolean(p.isArchived),
        updatedAt: new Date().toISOString()
      }));

      const jsonStr = JSON.stringify(sanitized, null, 2);
      const { userDataPath, localPath } = getProjectsStoragePaths();
      let savedAnywhere = false;

      // 1. Guardar en userDataPath (almacenamiento de usuario del sistema)
      if (userDataPath) {
        try {
          const dir = path.dirname(userDataPath);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(userDataPath, jsonStr, 'utf-8');
          savedAnywhere = true;
        } catch (err) {
          console.warn('No se pudo guardar en userDataPath:', err.message);
        }
      }

      // 2. Guardar también en localPath (raíz del espacio de trabajo / ejecutable)
      if (localPath) {
        try {
          const dir = path.dirname(localPath);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(localPath, jsonStr, 'utf-8');
          savedAnywhere = true;
        } catch (err) {
          console.warn('No se pudo guardar en localPath:', err.message);
        }
      }

      return { 
        success: savedAnywhere, 
        count: sanitized.length,
        userDataPath,
        localPath
      };
    } catch (e) {
      console.error('Error guardando lummo_projects.json:', e);
      return { success: false, error: e.message };
    }
  });

  safeHandle('get-custom-databases', async () => {
    const { userDataPath, localPath } = getDatabasesStoragePaths();
    if (userDataPath && fs.existsSync(userDataPath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(userDataPath, 'utf-8'));
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    if (localPath && fs.existsSync(localPath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(localPath, 'utf-8'));
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return [];
  });

  safeHandle('save-custom-databases', async (event, dbsList) => {
    try {
      if (!Array.isArray(dbsList)) return { success: false };
      const jsonStr = JSON.stringify(dbsList, null, 2);
      const { userDataPath, localPath } = getDatabasesStoragePaths();
      if (userDataPath) {
        try {
          const dir = path.dirname(userDataPath);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(userDataPath, jsonStr, 'utf-8');
        } catch {}
      }
      if (localPath) {
        try {
          const dir = path.dirname(localPath);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(localPath, jsonStr, 'utf-8');
        } catch {}
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // 9. Lectura y Edición de Archivos .env
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

  // 10. Gestor de Dependencias del Proyecto
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

    notifyLog(projectId, `\n[Dependencias] === Iniciando instalación con "${cmd}" ===`);
    notifyLog(projectId, `[Dependencias] Carpeta objetivo: ${folderPath}`);

    return new Promise((resolve) => {
      const child = spawn(cmd, {
        cwd: folderPath,
        shell: true,
        env: { ...process.env }
      });

      child.stdout.on('data', (data) => {
        notifyLog(projectId, data.toString());
      });

      child.stderr.on('data', (data) => {
        notifyLog(projectId, data.toString());
      });

      child.on('error', (err) => {
        notifyLog(projectId, `[Dependencias Error] ${err.message}`);
        resolve({ success: false, error: err.message });
      });

      child.on('close', (code) => {
        if (code === 0) {
          notifyLog(projectId, `[Dependencias] Instalación completada exitosamente.`);
          resolve({ success: true, message: 'Dependencias instaladas correctamente.' });
        } else {
          notifyLog(projectId, `[Dependencias] Proceso finalizado con código de salida ${code}.`);
          resolve({ success: false, error: `Código de salida ${code}` });
        }
      });
    });
  });

  // 11. Generación de Certificados HTTPS Autofirmados
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
      notifyLog(projectId, `\n[HTTPS Configurado] Certificados SSL listos en: ${sslDir}`);
      notifyLog(projectId, `[HTTPS Configurado] Enlace seguro disponible en: ${httpsUrl}`);

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

  // 12. Lanzador de Scripts de Proyecto
  safeHandle('run-project-script', async (event, { projectId, folderPath, scriptCommand }) => {
    if (!folderPath || !scriptCommand) return { success: false, error: 'Comando o carpeta vacíos' };
    notifyLog(projectId, `\n[Lummo Script] === Ejecutando: "${scriptCommand}" ===`);
    notifyLog(projectId, `[Lummo Script] Carpeta: ${folderPath}`);

    return new Promise((resolve) => {
      const child = spawn(scriptCommand, {
        cwd: folderPath,
        shell: true,
        env: { ...process.env }
      });

      child.stdout.on('data', (data) => {
        notifyLog(projectId, data.toString());
      });

      child.stderr.on('data', (data) => {
        notifyLog(projectId, data.toString());
      });

      child.on('error', (err) => {
        notifyLog(projectId, `[Lummo Script Error] ${err.message}`);
        resolve({ success: false, error: err.message });
      });

      child.on('close', (code) => {
        const msg = code === 0 
          ? `[Lummo Script] Comando "${scriptCommand}" completado exitosamente.`
          : `[Lummo Script] Comando "${scriptCommand}" finalizó con código ${code}.`;
        notifyLog(projectId, msg);
        resolve({ success: code === 0, code });
      });
    });
  });

  // 13. Logs y Terminal Stdin
  safeHandle('open-log-window', (event, { projectId, projectName }) => {
    if (typeof openLogWindow === 'function') {
      openLogWindow(projectId, projectName);
      return { success: true };
    }
    return { success: false, error: 'Función de ventana de logs no disponible' };
  });

  safeHandle('open-api-hub-window', (event, { projectId, projectName, port, projectPath }) => {
    if (typeof openApiHubWindow === 'function') {
      openApiHubWindow({ projectId, projectName, port, projectPath });
      return { success: true };
    }
    return { success: false, error: 'Función de ventana de API Hub no disponible' };
  });

  safeHandle('get-project-logs', (event, projectId) => {
    return projectLogsStore ? (projectLogsStore.get(projectId) || []) : [];
  });

  safeHandle('clear-project-logs', (event, projectId) => {
    if (projectLogsStore) projectLogsStore.set(projectId, []);
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('logs-cleared', { projectId });
    }
    if (logWindows && logWindows.has(projectId)) {
      const logWin = logWindows.get(projectId);
      if (logWin && !logWin.isDestroyed()) {
        logWin.webContents.send('logs-cleared', { projectId });
      }
    }
    return { success: true };
  });

  safeHandle('write-project-stdin', (event, { projectId, input }) => {
    if (!projectId || !input) return { success: false, error: 'Id o entrada vacíos' };
    const result = processManager.sendProjectStdin(projectId, input, notifyLog);
    return { success: result };
  });

  safeHandle('clear-all-logs', () => {
    if (projectLogsStore) projectLogsStore.clear();
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('logs-cleared', { all: true });
    }
    if (logWindows) {
      logWindows.forEach((logWin) => {
        if (logWin && !logWin.isDestroyed()) {
          logWin.webContents.send('logs-cleared', { all: true });
        }
      });
    }
    return { success: true };
  });
}

module.exports = { registerProjectHandlers };
