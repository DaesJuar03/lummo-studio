const { ipcMain } = require('electron');
const dockerManager = require('../managers/dockerManager.cjs');
const { safeHandle } = require('./ipcUtils.cjs');

function registerDockerHandlers() {
  safeHandle('docker-check-available', async () => {
    return await dockerManager.checkDockerAvailable();
  });

  safeHandle('docker-detect-files', async (event, folderPath) => {
    return dockerManager.detectDockerFiles(folderPath);
  });

  safeHandle('docker-get-status', async (event, folderPath) => {
    return await dockerManager.getComposeStatus(folderPath);
  });

  safeHandle('docker-run-action', async (event, { folderPath, action, serviceName }) => {
    return await dockerManager.runComposeAction(folderPath, action, serviceName);
  });

  safeHandle('docker-get-logs', async (event, { folderPath, serviceName, tail }) => {
    return await dockerManager.getComposeLogs(folderPath, serviceName, tail);
  });

  safeHandle('docker-generate-compose', async (event, { folderPath, selectedServices, customConfig }) => {
    return dockerManager.generateComposeYaml(folderPath, selectedServices, customConfig);
  });
}

module.exports = { registerDockerHandlers };
