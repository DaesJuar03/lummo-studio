const { spawn, exec } = require('child_process');
const webhookProxyManager = require('./webhookProxyManager.cjs');

const activeTunnels = new Map();

/**
 * Inicia un túnel público para un puerto local mediante Cloudflare Tunnels o Localtunnel
 * y lo conecta al proxy interceptor de Webhooks.
 * @param {string} projectId 
 * @param {number} port 
 * @param {function} emitLog 
 * @param {function} emitUrl 
 * @param {function} emitWebhookEvent 
 * @param {string} provider - 'cloudflare' | 'localtunnel'
 */
async function startTunnel(projectId, port, emitLog, emitUrl, emitWebhookEvent, provider = 'cloudflare') {
  const log = (id, msg) => {
    if (typeof emitLog === 'function') emitLog(id, msg);
  };
  const urlCB = (id, url) => {
    if (typeof emitUrl === 'function') emitUrl(id, url);
  };

  if (activeTunnels.has(projectId)) {
    log(projectId, '[Lummo Tunnel] Ya existe un túnel activo para este proyecto.');
    return;
  }

  log(projectId, `[Lummo Tunnel] Configurando interceptor de tráfico para puerto ${port}...`);

  let tunnelPort = port;
  try {
    const interceptor = await webhookProxyManager.ensureInterceptor(projectId, port, emitWebhookEvent);
    if (interceptor && interceptor.port) {
      tunnelPort = interceptor.port;
      log(projectId, `[Lummo Webhook Inspector] Interceptor activo en puerto local :${tunnelPort}`);
    }
  } catch (err) {
    log(projectId, `[Lummo Webhook Warning] No se pudo iniciar interceptor: ${err.message}. Conectando directo.`);
  }

  const useCloudflare = provider !== 'localtunnel';
  const providerName = useCloudflare ? 'Cloudflare Tunnel (trycloudflare.com)' : 'Localtunnel';
  log(projectId, `[Lummo Tunnel] Creando túnel público seguro con ${providerName} en el puerto ${tunnelPort}...`);

  let cmd = '';
  if (useCloudflare) {
    // Cloudflare Tunnel zero-config quick tunnel
    cmd = `npx --yes cloudflared tunnel --url http://127.0.0.1:${tunnelPort}`;
  } else {
    // Localtunnel fallback
    cmd = `npx -y localtunnel --port ${tunnelPort}`;
  }

  const child = spawn(cmd, [], { shell: true });
  activeTunnels.set(projectId, child);

  let urlFound = false;

  const checkUrlOutput = (output) => {
    log(projectId, `[Lummo Tunnel] ${output}`);

    if (useCloudflare) {
      // Look for https://...trycloudflare.com
      const cfMatch = output.match(/(https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com)/i);
      if (cfMatch && cfMatch[1] && !urlFound) {
        urlFound = true;
        const tunnelUrl = cfMatch[1].trim();
        log(projectId, `[Lummo Tunnel 🌐] ¡Túnel Cloudflare activo con Webhook Inspector! URL Pública: ${tunnelUrl}`);
        urlCB(projectId, tunnelUrl);
      }
    } else {
      // Localtunnel format
      const match = output.match(/your url is:\s*(https:\/\/[^\s]+)/i) || output.match(/(https:\/\/[a-zA-Z0-9-]+\.loca\.lt)/i);
      if (match && match[1] && !urlFound) {
        urlFound = true;
        const tunnelUrl = match[1].trim();
        log(projectId, `[Lummo Tunnel 🌐] ¡Túnel Localtunnel listo con Webhook Inspector! URL Pública: ${tunnelUrl}`);
        urlCB(projectId, tunnelUrl);
      }
    }
  };

  child.stdout.on('data', (data) => {
    checkUrlOutput(data.toString());
  });

  child.stderr.on('data', (data) => {
    checkUrlOutput(data.toString());
  });

  child.on('error', (err) => {
    log(projectId, `[Lummo Tunnel Error] ${err.message}`);
    activeTunnels.delete(projectId);
    webhookProxyManager.stopInterceptor(projectId);
    urlCB(projectId, null);
  });

  child.on('close', (code) => {
    log(projectId, `[Lummo Tunnel] Túnel cerrado (Código: ${code})`);
    activeTunnels.delete(projectId);
    webhookProxyManager.stopInterceptor(projectId);
    urlCB(projectId, null);
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
        webhookProxyManager.stopInterceptor(projectId);
        if (emitLog) emitLog(projectId, '[Lummo Tunnel] Túnel público detenido.');
        if (emitUrl) emitUrl(projectId, null);
      });
    } else {
      child.kill('SIGTERM');
      activeTunnels.delete(projectId);
      webhookProxyManager.stopInterceptor(projectId);
      if (emitLog) emitLog(projectId, '[Lummo Tunnel] Túnel público detenido.');
      if (emitUrl) emitUrl(projectId, null);
    }
  } else {
    webhookProxyManager.stopInterceptor(projectId);
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
