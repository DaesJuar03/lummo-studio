const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  scanEnvironment: () => ipcRenderer.invoke('scan-environment'),
  detectProject: (folderPath) => ipcRenderer.invoke('detect-project', folderPath),
  checkPort: (port) => ipcRenderer.invoke('check-port', port),
  findFreePort: (startPort) => ipcRenderer.invoke('find-free-port', startPort),
  startProject: (project) => ipcRenderer.invoke('start-project', project),
  stopProject: (id) => ipcRenderer.invoke('stop-project', id),
  getRecentProjects: () => ipcRenderer.invoke('get-recent-projects'),
  saveRecentProjects: (projects) => ipcRenderer.invoke('save-recent-projects', projects),
  openInBrowser: (url) => ipcRenderer.invoke('open-in-browser', url),
  openInEditor: (folderPath, editorCmd) => ipcRenderer.invoke('open-in-editor', { folderPath, editorCmd }),
  detectEditors: () => ipcRenderer.invoke('detect-editors'),
  
  // .env file editor
  readEnvFile: (folderPath) => ipcRenderer.invoke('read-env-file', folderPath),
  writeEnvFile: (folderPath, content) => ipcRenderer.invoke('write-env-file', { folderPath, content }),

  // Git Repository Clone & Cancel
  cloneRepository: (repoUrl, destinationParentFolder) => ipcRenderer.invoke('clone-repository', { repoUrl, destinationParentFolder }),
  cancelCloneRepository: () => ipcRenderer.invoke('cancel-clone-repository'),
  onCloneProgress: (callback) => {
    const subscription = (event, value) => callback(value);
    ipcRenderer.on('clone-progress', subscription);
    return () => ipcRenderer.removeListener('clone-progress', subscription);
  },

  // Database API
  db: {
    testConnection: (config) => ipcRenderer.invoke('db-test-connection', config),
    getSchema: (config) => ipcRenderer.invoke('db-get-schema', config),
    getErDiagram: (config) => ipcRenderer.invoke('db-get-er-diagram', config),
    executeQuery: (config, query) => ipcRenderer.invoke('db-execute-query', { config, query }),
    importSql: (config, filePath) => ipcRenderer.invoke('db-import-sql', { config, filePath }),
    exportSql: (config, destinationPath) => ipcRenderer.invoke('db-export-sql', { config, destinationPath }),
    exportDataFile: (payload) => ipcRenderer.invoke('db-export-data-file', payload),
    createSnapshot: (config, targetFolder) => ipcRenderer.invoke('db-create-snapshot', { config, targetFolder }),
    getDefaultDbPath: (name) => ipcRenderer.invoke('db-get-default-path', name),
    migrateDatabaseFile: (config) => ipcRenderer.invoke('db-migrate-database-file', config)
  },

  // Project Dependency Manager & HTTPS
  installDependencies: (projectId, folderPath, manager) => ipcRenderer.invoke('install-dependencies', { projectId, folderPath, manager }),
  setupHttps: (projectId, folderPath, domain, port) => ipcRenderer.invoke('setup-https', { projectId, folderPath, domain, port }),

  // Public Tunnels
  startTunnel: (projectId, port) => ipcRenderer.invoke('start-tunnel', { projectId, port }),
  stopTunnel: (projectId) => ipcRenderer.invoke('stop-tunnel', projectId),
  onTunnelUrl: (callback) => {
    const subscription = (event, value) => callback(value);
    ipcRenderer.on('tunnel-url', subscription);
    return () => ipcRenderer.removeListener('tunnel-url', subscription);
  },

  // Custom Local Domains (.test)
  setLocalDomain: (domain, port) => ipcRenderer.invoke('set-local-domain', { domain, port }),
  getLocalDomains: () => ipcRenderer.invoke('get-local-domains'),

  // Project Script Launcher
  runProjectScript: (projectId, folderPath, scriptCommand) => ipcRenderer.invoke('run-project-script', { projectId, folderPath, scriptCommand }),

  // API Client & REST/GraphQL Runner
  apiClient: {
    sendRequest: (requestData) => ipcRenderer.invoke('api-send-request', requestData),
    getCollections: (folderPath) => ipcRenderer.invoke('api-get-collections', folderPath),
    saveCollections: (folderPath, collections) => ipcRenderer.invoke('api-save-collections', { folderPath, collections })
  },

  // Webhook Inspector & Replay Hub
  webhookInspector: {
    getEvents: (projectId) => ipcRenderer.invoke('webhook-get-events', projectId),
    clearEvents: (projectId) => ipcRenderer.invoke('webhook-clear-events', projectId),
    replayEvent: (projectId, eventData, targetPort) => ipcRenderer.invoke('webhook-replay-event', { projectId, eventData, targetPort }),
    getMockTemplates: () => ipcRenderer.invoke('webhook-get-mock-templates'),
    sendMock: (payload) => ipcRenderer.invoke('webhook-send-mock', payload),
    onTrafficEvent: (callback) => {
      const subscription = (event, value) => callback(value);
      ipcRenderer.on('webhook-traffic-event', subscription);
      return () => ipcRenderer.removeListener('webhook-traffic-event', subscription);
    }
  },

  // Dedicated Log Windows & Retention
  openLogWindow: (projectId, projectName) => ipcRenderer.invoke('open-log-window', { projectId, projectName }),
  getProjectLogs: (projectId) => ipcRenderer.invoke('get-project-logs', projectId),
  clearProjectLogs: (projectId) => ipcRenderer.invoke('clear-project-logs', projectId),
  writeProjectStdin: (projectId, input) => ipcRenderer.invoke('write-project-stdin', { projectId, input }),
  clearAllLogs: () => ipcRenderer.invoke('clear-all-logs'),

  // Native System Notifications
  sendNotification: (title, body, silent) => ipcRenderer.invoke('send-notification', { title, body, silent }),

  // System Tech Downloader & Installer
  downloadAndInstallTech: (techKeys) => ipcRenderer.invoke('system-install-tech', techKeys),
  onTechInstallProgress: (callback) => {
    const subscription = (event, value) => callback(value);
    ipcRenderer.on('tech-install-progress', subscription);
    return () => ipcRenderer.removeListener('tech-install-progress', subscription);
  },

  // Custom Window Controls
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),

  onProcessLog: (callback) => {
    const subscription = (event, value) => callback(value);
    ipcRenderer.on('process-log', subscription);
    return () => ipcRenderer.removeListener('process-log', subscription);
  },
  
  onProcessStatus: (callback) => {
    const subscription = (event, value) => callback(value);
    ipcRenderer.on('process-status', subscription);
    return () => ipcRenderer.removeListener('process-status', subscription);
  },

  onLogsCleared: (callback) => {
    const subscription = (event, value) => callback(value);
    ipcRenderer.on('logs-cleared', subscription);
    return () => ipcRenderer.removeListener('logs-cleared', subscription);
  }
});

