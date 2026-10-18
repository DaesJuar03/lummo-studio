/**
 * Contrato tipado completo para Lummo Studio (Tauri 2 + Electron compatible)
 */

export interface LummoProject {
  id: string;
  name: string;
  path: string;
  techStack: string;
  icon?: string;
  command: string;
  defaultPort?: number;
  port?: number;
  hasPackageJson?: boolean;
  availableCommands?: string[];
  hasBackend?: boolean;
  backend?: Partial<LummoProject> | null;
  envApiUrl?: string | null;
  dualLabel?: string | null;
  isArchived?: boolean;
  status?: 'RUNNING' | 'STOPPED' | 'ERROR';
  updatedAt?: string;
}

export interface DatabaseConfig {
  id?: string;
  name: string;
  type: 'sqlite' | 'mysql' | 'postgres' | 'redis' | string;
  engine?: string;
  driver?: string;
  dbType?: string;
  host?: string;
  port?: number | null;
  user?: string;
  password?: string;
  database?: string;
  filePath?: string;
  status?: string;
  [key: string]: any;
}

export interface TechInfo {
  installed: boolean;
  version?: string | null;
  path?: string | null;
}

export interface SystemEnvironment {
  node: TechInfo;
  npm?: TechInfo;
  git?: TechInfo;
  php?: TechInfo;
  mysql?: TechInfo;
  postgres?: TechInfo;
  python?: TechInfo;
  docker?: TechInfo;
  sqlite: TechInfo;
}

export type SystemEnvironmentResult = SystemEnvironment;

export interface EditorInfo {
  id: string;
  name: string;
  cmd: string;
  command: string;
  installed: boolean;
}

export interface PortProcessInfo {
  busy: boolean;
  pid?: number;
  processName?: string;
  port: number;
  error?: string;
}

export interface ProcessMetrics {
  success: boolean;
  cpu: number;
  memoryMb: number;
  elapsed?: number;
  elapsedMs?: number;
  error?: string;
}

export interface ScaffoldOptions {
  template: string;
  projectName: string;
  targetDirectory: string;
  packageManager?: string;
}

export type UnsubscribeFn = () => void;

export interface LummoBridgeAPI {
  selectFolder: () => Promise<string | null>;
  scanEnvironment: () => Promise<SystemEnvironment>;
  detectProject: (folderPath: string) => Promise<LummoProject>;
  checkPort: (port: number) => Promise<boolean>;
  findFreePort: (startPort?: number) => Promise<number>;
  startProject: (project: LummoProject) => Promise<{ success: boolean; error?: string }>;
  stopProject: (id: string) => Promise<{ success: boolean }>;
  getRecentProjects: () => Promise<LummoProject[]>;
  saveRecentProjects: (projects: LummoProject[]) => Promise<{ success: boolean; count?: number; error?: string }>;
  getProjectsFilePath: () => Promise<{ userDataPath?: string | null; localPath: string; activePath: string }>;
  getCustomDatabases: () => Promise<DatabaseConfig[]>;
  saveCustomDatabases: (dbs: DatabaseConfig[]) => Promise<{ success: boolean; error?: string }>;
  openInBrowser: (url: string) => Promise<void>;
  openInEditor: (folderPath: string, editorCmd?: string) => Promise<void>;
  detectEditors: () => Promise<EditorInfo[]>;
  getDetectedEditors: () => Promise<EditorInfo[]>;

  getProcessMetrics: (payload: { projectId?: string; pid?: number }) => Promise<ProcessMetrics>;
  identifyPortProcess: (port: number) => Promise<PortProcessInfo>;
  killPortProcess: (port: number) => Promise<{ success: boolean; pid?: number; port?: number; error?: string }>;

  scaffoldProject: (options: ScaffoldOptions) => Promise<{ success: boolean; projectPath?: string; cleanName?: string; error?: string }>;
  onScaffoldProgress: (callback: (value: { message: string }) => void) => UnsubscribeFn;

  readEnvFile: (folderPath: string) => Promise<{
    success: boolean;
    content?: string;
    exists?: boolean;
    exampleContent?: string;
    exampleExists?: boolean;
    error?: string;
  }>;
  writeEnvFile: (folderPath: string, content: string, fileName?: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  syncEnvPort: (folderPath: string, port: number) => Promise<{ success: boolean; updated?: boolean; error?: string }>;

  cloneRepository: (repoUrl: string, destinationParentFolder: string) => Promise<{ success: boolean; targetFolder?: string; repoName?: string; error?: string }>;
  cancelCloneRepository: () => Promise<{ success: boolean }>;
  onCloneProgress: (callback: (value: { percentage: number; statusText: string; targetFolder?: string; repoName?: string }) => void) => UnsubscribeFn;

  db: {
    testConnection: (config: DatabaseConfig) => Promise<{ success: boolean; message?: string; error?: string }>;
    getSchema: (config: DatabaseConfig) => Promise<{ success: boolean; tables?: Record<string, any[]>; error?: string }>;
    getTableRows: (payload: any) => Promise<any>;
    updateTableRow: (payload: any) => Promise<any>;
    getErDiagram: (config: DatabaseConfig) => Promise<any>;
    executeQuery: (config: DatabaseConfig, query: string) => Promise<{ success: boolean; rows?: any[]; columns?: string[]; error?: string }>;
    importSql: (config: DatabaseConfig, filePath: string) => Promise<any>;
    exportSql: (config: DatabaseConfig, destinationPath: string) => Promise<any>;
    exportDataFile: (payload: any) => Promise<any>;
    createSnapshot: (config: DatabaseConfig, targetFolder?: string) => Promise<any>;
    getDefaultDbPath: (name: string) => Promise<string>;
    migrateDatabaseFile: (config: DatabaseConfig) => Promise<any>;
    redis: {
      test: (config: DatabaseConfig) => Promise<any>;
      getKeys: (config: DatabaseConfig, pattern?: string) => Promise<any>;
      getValue: (config: DatabaseConfig, key: string) => Promise<any>;
      setValue: (config: DatabaseConfig, payload: any) => Promise<any>;
      deleteKey: (config: DatabaseConfig, key: string) => Promise<any>;
      flush: (config: DatabaseConfig) => Promise<any>;
    };
  };

  installDependencies: (projectId: string, folderPath: string, manager?: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  setupHttps: (projectId: string, folderPath: string, domain?: string, port?: number) => Promise<any>;

  startTunnel: (projectId: string, port: number, provider?: string) => Promise<any>;
  stopTunnel: (projectId: string) => Promise<any>;
  onTunnelUrl: (callback: (value: { projectId: string; tunnelUrl: string | null }) => void) => UnsubscribeFn;

  ssl: {
    getStatus: () => Promise<any>;
    installCa: () => Promise<any>;
    uninstallCa: () => Promise<any>;
    generateCert: (domain: string) => Promise<any>;
  };

  setLocalDomain: (domain: string, port: number, enableSsl?: boolean) => Promise<any>;
  getLocalDomains: () => Promise<any>;

  runProjectScript: (projectId: string, folderPath: string, scriptCommand: string) => Promise<{ success: boolean; code?: number; error?: string }>;

  docker: {
    checkAvailable: () => Promise<any>;
    detectFiles: (folderPath: string) => Promise<any>;
    getStatus: (folderPath: string) => Promise<any>;
    runAction: (folderPath: string, action: string, serviceName?: string) => Promise<any>;
    getLogs: (folderPath: string, serviceName?: string, tail?: number) => Promise<any>;
    generateCompose: (folderPath: string, selectedServices: string[], customConfig?: any) => Promise<any>;
  };

  apiClient: {
    sendRequest: (requestData: any) => Promise<any>;
    getCollections: (folderPath: string) => Promise<any>;
    saveCollections: (folderPath: string, collections: any) => Promise<any>;
  };

  webhookInspector: {
    getEvents: (projectId: string) => Promise<any>;
    clearEvents: (projectId: string) => Promise<any>;
    replayEvent: (projectId: string, eventData: any, targetPort: number) => Promise<any>;
    getMockTemplates: () => Promise<any>;
    sendMock: (payload: any) => Promise<any>;
    onTrafficEvent: (callback: (value: any) => void) => UnsubscribeFn;
  };

  openLogWindow: (projectId: string, projectName?: string) => Promise<any>;
  openApiHubWindow: (data: { projectId: string; projectName?: string; port?: number; projectPath?: string }) => Promise<any>;
  openGitWindow: (data: { projectId: string; projectName?: string; projectPath?: string }) => Promise<any>;
  getProjectLogs: (projectId: string) => Promise<string[]>;
  clearProjectLogs: (projectId: string) => Promise<{ success: boolean }>;
  writeProjectStdin: (projectId: string, input: string) => Promise<{ success: boolean }>;
  clearAllLogs: () => Promise<{ success: boolean }>;

  sendNotification: (title: string, body: string, silent?: boolean) => Promise<void>;

  downloadAndInstallTech: (techKeys: string[]) => Promise<any>;
  onTechInstallProgress: (callback: (value: any) => void) => UnsubscribeFn;

  windowMinimize: () => Promise<void>;
  windowMaximize: () => Promise<void>;
  windowClose: () => Promise<void>;

  onProcessLog: (callback: (value: { projectId: string; message: string }) => void) => UnsubscribeFn;
  onProcessStatus: (callback: (value: { projectId: string; status: string }) => void) => UnsubscribeFn;
  onLogsCleared: (callback: (value: { projectId?: string; all?: boolean }) => void) => UnsubscribeFn;
  onFileDrop?: (callback: (paths: string[]) => void) => UnsubscribeFn;

  updater: {
    getVersion: () => Promise<string>;
    checkForUpdates: () => Promise<any>;
    startDownload: () => Promise<any>;
    restartAndApply: () => Promise<any>;
    simulateFlow: (payload: any) => Promise<any>;
    onUpdateStatus: (callback: (value: any) => void) => UnsubscribeFn;
    onUpdateAvailable: (callback: (value: any) => void) => UnsubscribeFn;
    onUpdateNotAvailable: (callback: () => void) => UnsubscribeFn;
    onDownloadProgress: (callback: (value: any) => void) => UnsubscribeFn;
    onUpdateDownloaded: (callback: (value: any) => void) => UnsubscribeFn;
    onUpdateError: (callback: (value: any) => void) => UnsubscribeFn;
  };

  relaunchApp: () => Promise<{ success: boolean; error?: string }>;

  git: {
    getStatus: (folderPath: string) => Promise<any>;
    getHistory: (folderPath: string, limit?: number) => Promise<any>;
    getBranches: (folderPath: string) => Promise<any>;
    checkoutBranch: (folderPath: string, branchName: string) => Promise<any>;
    stageAll: (folderPath: string) => Promise<any>;
    commit: (folderPath: string, message: string) => Promise<any>;
    push: (folderPath: string) => Promise<any>;
    pull: (folderPath: string) => Promise<any>;
  };

  ai: {
    testConnection: (options: any) => Promise<any>;
    chatCompletion: (payload: any) => Promise<any>;
  };
}

export type ElectronAPI = LummoBridgeAPI;

declare global {
  interface Window {
    electronAPI?: LummoBridgeAPI;
    __TAURI_INTERNALS__?: Record<string, unknown>;
  }
}
