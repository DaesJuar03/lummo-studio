const { ipcMain } = require('electron');
const tunnelManager = require('../tunnelManager.cjs');
const proxyManager = require('../proxyManager.cjs');

function safeHandle(channel, listener) {
  ipcMain.removeHandler(channel);
  ipcMain.handle(channel, listener);
}

function registerTunnelProxyHandlers(emitLogToProject, emitUrlToProject, emitWebhookEvent) {
  safeHandle('start-tunnel', async (event, { projectId, port }) => {
    try {
      const emitLog = (id, msg) => {
        if (typeof emitLogToProject === 'function') emitLogToProject(id, msg);
      };
      const emitUrl = (id, url) => {
        if (typeof emitUrlToProject === 'function') emitUrlToProject(id, url);
      };
      const emitWebhook = (id, eventObj) => {
        if (typeof emitWebhookEvent === 'function') emitWebhookEvent(id, eventObj);
      };
      await tunnelManager.startTunnel(projectId, port, emitLog, emitUrl, emitWebhook);
      return { success: true };
    } catch (err) {
      if (typeof emitLogToProject === 'function') {
        emitLogToProject(projectId, `[Túnel Error] No se pudo establecer el túnel: ${err.message}`);
      }
      return { success: false, error: err.message };
    }
  });

  safeHandle('stop-tunnel', async (event, projectId) => {
    try {
      const emitLog = (id, msg) => {
        if (typeof emitLogToProject === 'function') emitLogToProject(id, msg);
      };
      const emitUrl = (id, url) => {
        if (typeof emitUrlToProject === 'function') emitUrlToProject(id, url);
      };
      tunnelManager.stopTunnel(projectId, emitLog, emitUrl);
      return { success: true };
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
