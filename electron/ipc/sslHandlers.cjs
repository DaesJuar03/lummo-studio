const { ipcMain } = require('electron');
const sslManager = require('../managers/sslManager.cjs');
const proxyManager = require('../proxyManager.cjs');

function safeHandle(channel, listener) {
  ipcMain.removeHandler(channel);
  ipcMain.handle(channel, listener);
}

function registerSslHandlers() {
  // 1. Get SSL Subsystem Status (CA state, ports, domain counts)
  safeHandle('ssl-get-status', async () => {
    try {
      const status = sslManager.getSslStatus();
      const domains = proxyManager.getRegisteredDomains();
      return {
        success: true,
        ...status,
        domains,
        httpsProxyPort: proxyManager.httpsProxyPort,
        httpProxyPort: proxyManager.httpProxyPort
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // 2. Install Lummo Root CA into Windows Certificate Store
  safeHandle('ssl-install-ca', async () => {
    try {
      const res = await sslManager.installCa();
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // 3. Uninstall Lummo Root CA from Windows Certificate Store
  safeHandle('ssl-uninstall-ca', async () => {
    try {
      const res = await sslManager.uninstallCa();
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // 4. Generate/Ensure Domain Certificate
  safeHandle('ssl-generate-cert', async (event, domain) => {
    try {
      await sslManager.getOrCreateDomainCertificate(domain);
      return { success: true, domain };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

module.exports = { registerSslHandlers };
