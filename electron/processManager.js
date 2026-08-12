import { spawn, exec } from 'child_process';
import net from 'net';
import express from 'express';

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

export function startProjectProcess(project, emitLog, emitStatus) {
  const { id, path: folderPath, command, port } = project;

  if (activeProcesses.has(id) || activeStaticServers.has(id)) {
    emitLog(id, '[Lummo] El proyecto ya está en ejecución.');
    return;
  }

  // Lummo Static HTTP Server fallback
  if (command === 'lummo:static' || !command) {
    try {
      const app = express();
      app.use(express.static(folderPath));
      const server = app.listen(port, () => {
        emitLog(id, `[Lummo HTTP] Servidor estático iniciado en http://localhost:${port}`);
        emitStatus(id, 'RUNNING');
      });

      server.on('error', (err) => {
        emitLog(id, `[Lummo HTTP Error] ${err.message}`);
        emitStatus(id, 'ERROR');
        activeStaticServers.delete(id);
      });

      activeStaticServers.set(id, server);
      return;
    } catch (err) {
      emitLog(id, `[Lummo Error] No se pudo iniciar el servidor estático: ${err.message}`);
      emitStatus(id, 'ERROR');
      return;
    }
  }

  // Prepare final command with explicit port binding
  let finalCmd = command;

  // Replace {port} placeholder if present
  if (finalCmd.includes('{port}')) {
    finalCmd = finalCmd.replace(/{port}/g, port);
  } else if (finalCmd.startsWith('npm run') || finalCmd.startsWith('npm start')) {
    // Append -- --port {port} for npm run dev / vite / react scripts to enforce exact port binding
    finalCmd = `${finalCmd} -- --port ${port}`;
  }

  // Set environment variables (PORT for Node/Express/Vite/Next)
  const env = { 
    ...process.env, 
    PORT: String(port),
    VITE_PORT: String(port)
  };

  emitLog(id, `[Lummo] Ejecutando comando: "${finalCmd}" en puerto ${port}`);
  emitLog(id, `[Lummo] Directorio de trabajo: ${folderPath}`);
  emitStatus(id, 'STARTING');

  try {
    const child = spawn(finalCmd, [], {
      cwd: folderPath,
      shell: true,
      env
    });

    activeProcesses.set(id, child);
    emitStatus(id, 'RUNNING');

    child.stdout.on('data', (data) => {
      emitLog(id, data.toString());
    });

    child.stderr.on('data', (data) => {
      emitLog(id, data.toString());
    });

    child.on('error', (error) => {
      emitLog(id, `[Lummo Error] ${error.message}`);
      emitStatus(id, 'ERROR');
      activeProcesses.delete(id);
    });

    child.on('close', (code) => {
      emitLog(id, `[Lummo] Proceso finalizado con código: ${code}`);
      emitStatus(id, 'STOPPED');
      activeProcesses.delete(id);
    });
  } catch (err) {
    emitLog(id, `[Lummo Error] Falló al lanzar proceso: ${err.message}`);
    emitStatus(id, 'ERROR');
  }
}

export function stopProjectProcess(id, emitLog, emitStatus) {
  if (activeStaticServers.has(id)) {
    const server = activeStaticServers.get(id);
    server.close(() => {
      emitLog(id, '[Lummo HTTP] Servidor estático detenido.');
      emitStatus(id, 'STOPPED');
    });
    activeStaticServers.delete(id);
    return;
  }

  if (activeProcesses.has(id)) {
    const child = activeProcesses.get(id);
    emitLog(id, '[Lummo] Deteniendo servidor...');

    if (process.platform === 'win32') {
      exec(`taskkill /pid ${child.pid} /T /F`, () => {
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

