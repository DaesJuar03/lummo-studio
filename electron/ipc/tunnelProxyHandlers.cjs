const { ipcMain } = require('electron');
const tunnelManager = require('../tunnelManager.cjs');
const proxyManager = require('../proxyManager.cjs');

function safeHandle(channel, listener) {
  ipcMain.removeHandler(channel);
  ipcMain.handle(channel, listener);
}

function registerTunnelProxyHandlers(emitLogToProject) {
  safeHandle('start-tunnel', async (event, { projectId, port }) => {
    try {
      if (emitLogToProject) {
        emitLogToProject(projectId, `\n[Túnel Público] Solicitando enlace público para puerto local ${port}...`);
      }
      const tunnelUrl = await tunnelManager.startTunnel(projectId, port);
      if (emitLogToProject) {
        emitLogToProject(projectId, `[Túnel Público Activo] Enlace asignado: ${tunnelUrl}`);
      }
      return { success: true, url: tunnelUrl };
    } catch (err) {
      if (emitLogToProject) {
        emitLogToProject(projectId, `[Túnel Error] No se pudo establecer el túnel: ${err.message}`);
      }
      return { success: false, error: err.message };
    }
  });

  safeHandle('stop-tunnel', async (event, projectId) => {
    try {
      const result = tunnelManager.stopTunnel(projectId);
      if (emitLogToProject) {
        emitLogToProject(projectId, `[Túnel] Túnel cerrado correctamente.`);
      }
      return { success: true, result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  safeHandle('set-local-domain', async (event, { domain, port }) => {
    try {
      const res = await proxyManager.setLocalDomain(domain, port);
      return { success: true, ...res };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  safeHandle('get-local-domains', async () => {
    try {
      return proxyManager.getLocalDomains();
    } catch (err) {
      return [];
    }
  });
}

module.exports = { registerTunnelProxyHandlers };
