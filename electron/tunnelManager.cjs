const { spawn, exec } = require('child_process');

const activeTunnels = new Map();

/**
 * Inicia un túnel público para un puerto local mediante `npx localtunnel`
 * @param {string} projectId 
 * @param {number} port 
 * @param {function} emitLog 
 * @param {function} emitUrl 
 */
function startTunnel(projectId, port, emitLog, emitUrl) {
  if (activeTunnels.has(projectId)) {
    emitLog(projectId, '[Lummo Tunnel] Ya existe un túnel activo para este proyecto.');
    return;
  }

  emitLog(projectId, `[Lummo Tunnel] Creando túnel público en el puerto ${port}...`);

  const cmd = `npx -y localtunnel --port ${port}`;
  const child = spawn(cmd, [], { shell: true });

  activeTunnels.set(projectId, child);

  child.stdout.on('data', (data) => {
    const output = data.toString();
    emitLog(projectId, `[Lummo Tunnel] ${output}`);

    // Extraer URL del túnel (ej. "your url is: https://abc-123.loca.lt")
    const match = output.match(/your url is:\s*(https:\/\/[^\s]+)/i) || output.match(/(https:\/\/[a-zA-Z0-9-]+\.loca\.lt)/i);
    if (match && match[1]) {
      const tunnelUrl = match[1].trim();
      emitLog(projectId, `[Lummo Tunnel] ¡Túnel listo! URL Pública: ${tunnelUrl}`);
      emitUrl(projectId, tunnelUrl);
    }
  });

  child.stderr.on('data', (data) => {
    const errStr = data.toString();
    emitLog(projectId, `[Lummo Tunnel] ${errStr}`);
    const match = errStr.match(/your url is:\s*(https:\/\/[^\s]+)/i) || errStr.match(/(https:\/\/[a-zA-Z0-9-]+\.loca\.lt)/i);
    if (match && match[1]) {
      const tunnelUrl = match[1].trim();
      emitUrl(projectId, tunnelUrl);
    }
  });

  child.on('error', (err) => {
    emitLog(projectId, `[Lummo Tunnel Error] ${err.message}`);
    activeTunnels.delete(projectId);
    emitUrl(projectId, null);
  });

  child.on('close', (code) => {
    emitLog(projectId, `[Lummo Tunnel] Túnel cerrado (Código: ${code})`);
    activeTunnels.delete(projectId);
    emitUrl(projectId, null);
  });
}

/**
 * Detiene el túnel público activo de un proyecto
 * @param {string} projectId 
 * @param {function} emitLog 
 * @param {function} emitUrl 
 */
function stopTunnel(projectId, emitLog, emitUrl) {
  if (activeTunnels.has(projectId)) {
    const child = activeTunnels.get(projectId);
    if (process.platform === 'win32') {
      exec(`taskkill /pid ${child.pid} /T /F`, () => {
        activeTunnels.delete(projectId);
        if (emitLog) emitLog(projectId, '[Lummo Tunnel] Túnel público detenido.');
        if (emitUrl) emitUrl(projectId, null);
      });
    } else {
      child.kill('SIGTERM');
      activeTunnels.delete(projectId);
      if (emitLog) emitLog(projectId, '[Lummo Tunnel] Túnel público detenido.');
      if (emitUrl) emitUrl(projectId, null);
    }
  }
}

/**
 * Retorna si un proyecto tiene túnel activo
 * @param {string} projectId 
 */
function isTunnelActive(projectId) {
  return activeTunnels.has(projectId);
}

module.exports = {
  startTunnel,
  stopTunnel,
  isTunnelActive
};
