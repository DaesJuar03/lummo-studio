const { ipcMain } = require('electron');
const dockerManager = require('../managers/dockerManager.cjs');

function registerDockerHandlers() {
  ipcMain.handle('docker-check-available', async () => {
    return await dockerManager.checkDockerAvailable();
  });

  ipcMain.handle('docker-detect-files', async (event, folderPath) => {
    return dockerManager.detectDockerFiles(folderPath);
  });

  ipcMain.handle('docker-get-status', async (event, folderPath) => {
    return await dockerManager.getComposeStatus(folderPath);
  });

  ipcMain.handle('docker-run-action', async (event, { folderPath, action, serviceName }) => {
    return await dockerManager.runComposeAction(folderPath, action, serviceName);
  });

  ipcMain.handle('docker-get-logs', async (event, { folderPath, serviceName, tail }) => {
    return await dockerManager.getComposeLogs(folderPath, serviceName, tail);
  });

  ipcMain.handle('docker-generate-compose', async (event, { folderPath, selectedServices, customConfig }) => {
    return dockerManager.generateComposeYaml(folderPath, selectedServices, customConfig);
  });
}

module.exports = { registerDockerHandlers };
