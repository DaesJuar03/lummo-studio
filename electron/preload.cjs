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
  openInEditor: (folderPath) => ipcRenderer.invoke('open-in-editor', folderPath),
  
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

  // Dedicated Log Windows
  openLogWindow: (projectId, projectName) => ipcRenderer.invoke('open-log-window', { projectId, projectName }),
  getProjectLogs: (projectId) => ipcRenderer.invoke('get-project-logs', projectId),

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
  }
});
