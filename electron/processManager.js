import { spawn, exec } from 'child_process';
import net from 'net';
import express from 'express';
import fs from 'fs';
import path from 'path';
import pidusage from 'pidusage';

const activeProcesses = new Map();
const activeStaticServers = new Map();

export function checkPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      resolve(false);
    });
    server.once('listening', () => {
      server.close(() => {
        resolve(true);
      });
    });
    server.listen(port, '127.0.0.1');
  });
}

export async function findNextFreePort(startPort = 3000) {
  let port = parseInt(startPort, 10);
  if (isNaN(port) || port < 1) port = 3000;
  
  while (port < 65535) {
    const free = await checkPortFree(port);
    if (free) return port;
    port++;
  }
  return startPort;
}

export const findFreePort = findNextFreePort;

/**
 * Identifica el proceso que está ocupando un puerto específico en el sistema operativo
 * @param {number} port
 * @returns {Promise<{ busy: boolean, pid?: number, processName?: string, port: number, error?: string }>}
 */
export function identifyPortProcess(port) {
  return new Promise((resolve) => {
    const targetPort = parseInt(port, 10);
    if (isNaN(targetPort)) return resolve({ busy: false, port: 0 });

    if (process.platform === 'win32') {
      exec(`netstat -ano -p tcp`, (err, stdout) => {
        if (err || !stdout) return resolve({ busy: false, port: targetPort });

        const lines = stdout.split('\n');
        let matchedPid = null;

        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          // Format: TCP 0.0.0.0:3000 0.0.0.0:0 LISTENING 1234
          if (parts.length >= 4 && parts[0] === 'TCP' && parts[3] === 'LISTENING') {
            const localAddress = parts[1];
            if (localAddress.endsWith(`:${targetPort}`)) {
              matchedPid = parseInt(parts[4], 10);
              break;
            }
          }
        }

        if (!matchedPid || matchedPid === 0) {
          return resolve({ busy: false, port: targetPort });
        }

        // Obtener el nombre del ejecutable
        exec(`tasklist /FI "PID eq ${matchedPid}" /FO CSV /NH`, (tErr, tStdout) => {
          let processName = 'Proceso Desconocido';
          if (!tErr && tStdout && tStdout.includes(',')) {
            const cols = tStdout.trim().replace(/"/g, '').split(',');
            if (cols[0]) processName = cols[0];
          }
          resolve({ busy: true, pid: matchedPid, processName, port: targetPort });
        });
      });
    } else {
      // macOS / Linux via lsof
      exec(`lsof -i :${targetPort} -sTCP:LISTEN -Fpc`, (err, stdout) => {
        if (err || !stdout) return resolve({ busy: false, port: targetPort });

        let pid = null;
        let processName = 'Proceso Desconocido';
        const lines = stdout.split('\n');
        for (const line of lines) {
          if (line.startsWith('p')) pid = parseInt(line.substring(1), 10);
          if (line.startsWith('c')) processName = line.substring(1);
        }

        if (pid) {
          resolve({ busy: true, pid, processName, port: targetPort });
        } else {
          resolve({ busy: false, port: targetPort });
        }
      });
    }
  });
}

/**
 * Finaliza de forma forzada el proceso que ocupa un puerto específico
 * @param {number} port
 * @returns {Promise<{ success: boolean, pid?: number, error?: string }>}
 */
export async function killProcessOnPort(port) {
  const targetPort = parseInt(port, 10);
  const info = await identifyPortProcess(targetPort);
  if (!info.busy || !info.pid) {
    return { success: true, message: `El puerto ${targetPort} no estaba ocupado.` };
  }

  return new Promise((resolve) => {
    const killCmd = process.platform === 'win32'
      ? `taskkill /F /PID ${info.pid} /T`
      : `kill -9 ${info.pid}`;

    exec(killCmd, (err) => {
      if (err) {
        resolve({ success: false, error: `No se pudo finalizar PID ${info.pid}: ${err.message}` });
      } else {
        resolve({ success: true, pid: info.pid, port: targetPort });
      }
    });
  });
}

/**
 * Obtiene métricas reales de CPU (%) y Memoria RAM (MB) para un PID o proyecto
 * @param {number} pid
 * @returns {Promise<{ success: boolean, cpu: number, memoryMb: number, elapsed: number }>}
 */
export async function getProcessMetrics(pid) {
  if (!pid || typeof pid !== 'number') {
    return { success: false, error: 'PID inválido' };
  }

  try {
    const stats = await pidusage(pid);
    return {
      success: true,
      cpu: +stats.cpu.toFixed(1),
      memoryMb: +(stats.memory / (1024 * 1024)).toFixed(1),
      elapsed: Math.round(stats.elapsed / 1000)
    };
  } catch (err) {
    return { success: false, error: err.message, cpu: 0, memoryMb: 0 };
  }
}

export function getRunningPid(id) {
  const child = activeProcesses.get(id);
  return child && child.pid ? child.pid : null;
}

export function startProcess(project, emitLog, emitStatus) {
  const { id, path: folderPath, command, port } = project;

  if (activeProcesses.has(id) || activeStaticServers.has(id)) {
    emitLog(id, `[Lummo Error] El proyecto ya se encuentra en ejecución.`);
    return;
  }

  emitStatus(id, 'RUNNING');
  emitLog(id, `[Lummo] Iniciando "${project.name}" en el puerto ${port}...`);
  emitLog(id, `[Lummo] Directorio de trabajo: ${folderPath}`);

  if (command === 'static' || project.techStack?.includes('HTML/CSS')) {
    try {
      const app = express();
      app.use(express.static(folderPath));
      
      const server = app.listen(port, () => {
        emitLog(id, `[Lummo Static Server] Servidor local disponible en http://localhost:${port}`);
      });

      server.on('error', (err) => {
        emitLog(id, `[Lummo Error] Error en servidor estático: ${err.message}`);
        emitStatus(id, 'STOPPED');
        activeStaticServers.delete(id);
      });

      activeStaticServers.set(id, server);
    } catch (err) {
      emitLog(id, `[Lummo Error] No se pudo iniciar el servidor estático: ${err.message}`);
      emitStatus(id, 'STOPPED');
    }
    return;
  }

  try {
    const [cmd, ...args] = command.split(' ');
    
    // Windows execution compatibility
    const isWin = process.platform === 'win32';
    
    const child = spawn(command, [], {
      cwd: folderPath,
      shell: true,
      env: {
        ...process.env,
        PORT: String(port),
        VITE_PORT: String(port),
        FORCE_COLOR: '1'
      }
    });

    activeProcesses.set(id, child);

    child.stdout.on('data', (data) => {
      emitLog(id, data.toString());
    });

    child.stderr.on('data', (data) => {
      emitLog(id, data.toString());
    });

    child.on('error', (err) => {
      emitLog(id, `[Lummo Error] Fallo al spawnear el proceso: ${err.message}`);
      emitStatus(id, 'STOPPED');
      activeProcesses.delete(id);
    });

    child.on('close', (code) => {
      emitLog(id, `[Lummo] El proceso terminó con código de salida ${code}`);
      emitStatus(id, 'STOPPED');
      activeProcesses.delete(id);
    });

  } catch (err) {
    emitLog(id, `[Lummo Error] Excepción al arrancar el proceso: ${err.message}`);
    emitStatus(id, 'STOPPED');
  }
}

export function stopProcess(id, emitLog, emitStatus) {
  if (activeStaticServers.has(id)) {
    const server = activeStaticServers.get(id);
    server.close(() => {
      emitLog(id, `[Lummo] Servidor estático detenido.`);
      emitStatus(id, 'STOPPED');
      activeStaticServers.delete(id);
    });
    return;
  }

  if (activeProcesses.has(id)) {
    const child = activeProcesses.get(id);
    emitLog(id, `[Lummo] Deteniendo proceso (PID ${child.pid})...`);
    
    if (process.platform === 'win32') {
      exec(`taskkill /pid ${child.pid} /T /F`, (err) => {
        if (err) {
          emitLog(id, `[Lummo Warning] Error con taskkill: ${err.message}`);
          child.kill('SIGTERM');
        }
        activeProcesses.delete(id);
        emitStatus(id, 'STOPPED');
      });
    } else {
      child.kill('SIGTERM');
      activeProcesses.delete(id);
      emitStatus(id, 'STOPPED');
    }
  }
}

export function runProjectScript(projectId, folderPath, scriptCommand, emitLog) {
  if (!folderPath || !scriptCommand) {
    if (emitLog) emitLog(projectId, '[Lummo Script Error] Ruta de carpeta o comando inválidos.');
    return Promise.resolve({ success: false, error: 'Comando o carpeta vacíos' });
  }

  return new Promise((resolve) => {
    emitLog(projectId, `\n[Lummo Script] === Ejecutando: "${scriptCommand}" ===`);
    emitLog(projectId, `[Lummo Script] Carpeta: ${folderPath}`);

    const child = spawn(scriptCommand, [], {
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
        ? `[Lummo Script] Comando "${scriptCommand}" completado exitosamente.`
        : `[Lummo Script] Comando "${scriptCommand}" finalizó con código de salida ${code}.`;
      if (emitLog) emitLog(projectId, msg);
      resolve({ success: code === 0, code });
    });
  });
}

export function sendProjectStdin(id, input, emitLog) {
  if (activeProcesses.has(id)) {
    const child = activeProcesses.get(id);
    if (child.stdin && child.stdin.writable) {
      if (emitLog) emitLog(id, `> ${input}`);
      child.stdin.write(`${input}\n`);
      return true;
    }
  }
  if (emitLog) emitLog(id, '[Lummo Stdin Warning] El proceso no está activo o no admite entrada por teclado.');
  return false;
}

/**
 * Generador de Proyectos desde Cero (Scaffolding Wizard)
 * @param {object} options - { template, projectName, targetDirectory, packageManager }
 * @param {function} emitLog - Callback para registrar avance
 */
export async function scaffoldNewProject(options, emitLog) {
  const { template, projectName, targetDirectory, packageManager = 'npm' } = options || {};
  const cleanName = (projectName || 'mi-proyecto').replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
  const projectPath = path.join(targetDirectory || process.cwd(), cleanName);

  if (fs.existsSync(projectPath) && fs.readdirSync(projectPath).length > 0) {
    return { success: false, error: `La carpeta "${cleanName}" ya existe en el directorio seleccionado y no está vacía.` };
  }

  if (!fs.existsSync(projectPath)) {
    fs.mkdirSync(projectPath, { recursive: true });
  }

  const log = (msg) => {
    if (typeof emitLog === 'function') emitLog(msg);
  };

  log(`[Lummo Scaffolder] Creando proyecto "${cleanName}" con plantilla: ${template}`);
  log(`[Lummo Scaffolder] Directorio destino: ${projectPath}`);

  let scaffoldCommand = '';
  switch (template) {
    case 'vite-react':
      scaffoldCommand = `${packageManager} create vite@latest . -- --template react`;
      break;
    case 'vite-react-ts':
      scaffoldCommand = `${packageManager} create vite@latest . -- --template react-ts`;
      break;
    case 'vite-vue':
      scaffoldCommand = `${packageManager} create vite@latest . -- --template vue`;
      break;
    case 'nextjs':
      scaffoldCommand = `npx create-next-app@latest . --use-${packageManager} --no-eslint --no-tailwind --no-src-dir --import-alias "@/*" --app --yes`;
      break;
    case 'express-api':
    case 'node-server': {
      const pkg = {
        name: cleanName,
        version: '1.0.0',
        type: 'module',
        main: 'server.js',
        scripts: {
          dev: 'node --watch server.js',
          start: 'node server.js'
        },
        dependencies: {
          express: '^4.21.2',
          cors: '^2.8.5',
          dotenv: '^16.4.7'
        }
      };
      fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify(pkg, null, 2), 'utf-8');
      const serverJs = `import express from 'express';\n\nconst app = express();\nconst PORT = process.env.PORT || 5000;\n\napp.use(express.json());\n\napp.get('/', (req, res) => {\n  res.json({ message: '¡Bienvenido a tu API con Express y Lummo Studio! 🚀', status: 'ONLINE', timestamp: new Date().toISOString() });\n});\n\napp.get('/api/saludo', (req, res) => {\n  res.json({ saludo: 'Hola Mundo desde Lummo Studio', autor: 'Lummo Dev' });\n});\n\napp.listen(PORT, () => {\n  console.log(\`[Servidor Express] Escuchando en http://localhost:\${PORT}\`);\n});\n`;
      fs.writeFileSync(path.join(projectPath, 'server.js'), serverJs, 'utf-8');
      fs.writeFileSync(path.join(projectPath, '.env'), `PORT=5000\nNODE_ENV=development\n`, 'utf-8');
      fs.writeFileSync(path.join(projectPath, '.env.example'), `PORT=5000\nNODE_ENV=development\n`, 'utf-8');
      fs.writeFileSync(path.join(projectPath, '.gitignore'), `node_modules\n.env\n`, 'utf-8');
      log(`[Lummo Scaffolder] Estructura Node.js Express creada.`);
      return { success: true, projectPath, cleanName };
    }
    case 'python-fastapi': {
      const mainPy = `from fastapi import FastAPI\nimport uvicorn\n\napp = FastAPI(title="${cleanName}")\n\n@app.get("/")\ndef read_root():\n    return {"message": "¡API FastAPI creada con Lummo Studio!", "status": "active"}\n\nif __name__ == "__main__":\n    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)\n`;
      fs.writeFileSync(path.join(projectPath, 'main.py'), mainPy, 'utf-8');
      fs.writeFileSync(path.join(projectPath, 'requirements.txt'), `fastapi\nuvicorn\n`, 'utf-8');
      fs.writeFileSync(path.join(projectPath, '.env'), `PORT=8000\n`, 'utf-8');
      log(`[Lummo Scaffolder] Estructura FastAPI creada.`);
      return { success: true, projectPath, cleanName };
    }
    case 'html-static': {
      const htmlContent = `<!DOCTYPE html>\n<html lang="es">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${cleanName} - Lummo Studio</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <div class="card">\n    <h1>✨ ${cleanName}</h1>\n    <p>Sitio web estático iniciado con éxito desde <strong>Lummo Studio</strong>.</p>\n  </div>\n  <script src="app.js"></script>\n</body>\n</html>`;
      const cssContent = `body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }\n.card { background: #1e293b; padding: 2rem; border-radius: 1rem; box-shadow: 0 10px 25px rgba(0,0,0,0.5); text-align: center; border: 1px solid #334155; max-width: 480px; }\nh1 { color: #38bdf8; margin-top: 0; }\np { color: #94a3b8; }`;
      const jsContent = `console.log('Sitio web cargado correctamente con Lummo Studio');`;
      fs.writeFileSync(path.join(projectPath, 'index.html'), htmlContent, 'utf-8');
      fs.writeFileSync(path.join(projectPath, 'style.css'), cssContent, 'utf-8');
      fs.writeFileSync(path.join(projectPath, 'app.js'), jsContent, 'utf-8');
      log(`[Lummo Scaffolder] Sitio web estático HTML/CSS/JS creado.`);
      return { success: true, projectPath, cleanName };
    }
    default:
      scaffoldCommand = `${packageManager} create vite@latest . -- --template react`;
      break;
  }

  if (!scaffoldCommand) {
    return { success: true, projectPath, cleanName };
  }

  log(`[Lummo Scaffolder] Ejecutando: "${scaffoldCommand}"...`);

  return new Promise((resolve) => {
    const child = spawn(scaffoldCommand, [], {
      cwd: projectPath,
      shell: true,
      env: { ...process.env }
    });

    child.stdout.on('data', (d) => log(d.toString()));
    child.stderr.on('data', (d) => log(d.toString()));

    child.on('close', (code) => {
      if (code === 0) {
        log(`[Lummo Scaffolder] ¡Proyecto "${cleanName}" creado exitosamente!`);
        resolve({ success: true, projectPath, cleanName });
      } else {
        log(`[Lummo Scaffolder Error] Falló con código de salida ${code}`);
        resolve({ success: false, error: `Error creando proyecto (Código ${code})` });
      }
    });

    child.on('error', (err) => {
      log(`[Lummo Scaffolder Error] ${err.message}`);
      resolve({ success: false, error: err.message });
    });
  });
}
