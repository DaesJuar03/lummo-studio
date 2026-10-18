import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type {
  LummoBridgeAPI,
  LummoProject,
  DatabaseConfig,
  ScaffoldOptions,
  UnsubscribeFn
} from '../types/lummo';

export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__);
}

function subscribeEvent<T>(eventName: string, callback: (payload: T) => void): UnsubscribeFn {
  let unlisten: UnlistenFn | null = null;
  let cancelled = false;

  listen<T>(eventName, (event) => {
    if (!cancelled) {
      callback(event.payload);
    }
  })
    .then((fn) => {
      if (cancelled) {
        fn();
      } else {
        unlisten = fn;
      }
    })
    .catch((err) => {
      console.warn(`[Tauri Event Subscribe Error: ${eventName}]`, err);
    });

  return () => {
    cancelled = true;
    if (unlisten) {
      unlisten();
      unlisten = null;
    }
  };
}

export function createTauriBridge(): LummoBridgeAPI {
  return {
    selectFolder: () => invoke<string | null>('select_folder'),
    scanEnvironment: () => invoke('scan_environment'),
    detectProject: (folderPath: string) => invoke<LummoProject>('detect_project', { folderPath }),
    checkPort: (port: number) => invoke<boolean>('check_port', { port: Number(port) }),
    findFreePort: (startPort = 3000) => invoke<number>('find_free_port', { startPort: Number(startPort) }),
    startProject: (project: LummoProject) => invoke('start_project', { project }),
    stopProject: (id: string) => invoke('stop_project', { id }),
    getRecentProjects: () => invoke<LummoProject[]>('get_recent_projects'),
    saveRecentProjects: (projects: LummoProject[]) => invoke('save_recent_projects', { projects }),
    getProjectsFilePath: () => invoke('get_projects_file_path'),
    getCustomDatabases: () => invoke<DatabaseConfig[]>('get_custom_databases'),
    saveCustomDatabases: (dbs: DatabaseConfig[]) => invoke('save_custom_databases', { dbs }),
    openInBrowser: (url: string) => invoke('open_in_browser', { url }),
    openInEditor: (folderPath: string, editorCmd?: string) =>
      invoke('open_in_editor', { folderPath, editorCmd: editorCmd || 'code' }),
    detectEditors: () => invoke('detect_editors'),
    getDetectedEditors: () => invoke('detect_editors'),

    getProcessMetrics: (payload) => invoke('get_process_metrics', { payload }),
    identifyPortProcess: (port: number) => invoke('identify_port_process', { port: Number(port) }),
    killPortProcess: (port: number) => invoke('kill_port_process', { port: Number(port) }),

    scaffoldProject: (options: ScaffoldOptions) => invoke('scaffold_project', { options }),
    onScaffoldProgress: (cb) => subscribeEvent('scaffold-progress', cb),

    readEnvFile: (folderPath: string) => invoke('read_env_file', { folderPath }),
    writeEnvFile: (folderPath: string, content: string, fileName = '.env') =>
      invoke('write_env_file', { folderPath, content, fileName }),
    syncEnvPort: (folderPath: string, port: number) =>
      invoke('sync_env_port', { folderPath, port: Number(port) }),

    cloneRepository: (repoUrl: string, destinationParentFolder: string) =>
      invoke('clone_repository', { repoUrl, destinationParentFolder }),
    cancelCloneRepository: () => invoke('cancel_clone_repository'),
    onCloneProgress: (cb) => subscribeEvent('clone-progress', cb),

    db: {
      testConnection: (config) => invoke('db_test_connection', { config }),
      getSchema: (config) => invoke('db_get_schema', { config }),
      getTableRows: (payload) => invoke('db_get_table_rows', { payload }),
      updateTableRow: (payload) => invoke('db_update_table_row', { payload }),
      getErDiagram: (config) => invoke('db_get_er_diagram', { config }),
      executeQuery: (config, query) => invoke('db_execute_query', { config, query }),
      importSql: (config, filePath) => invoke('db_import_sql', { config, filePath }),
      exportSql: (config, destinationPath) => invoke('db_export_sql', { config, destinationPath }),
      exportDataFile: (payload) => invoke('db_export_data_file', { payload }),
      createSnapshot: (config, targetFolder) => invoke('db_create_snapshot', { config, targetFolder }),
      getDefaultDbPath: (name) => invoke('db_get_default_path', { name }),
      migrateDatabaseFile: (config) => invoke('db_migrate_database_file', { config }),
      redis: {
        test: (config) => invoke('db_redis_test', { config }),
        getKeys: (config, pattern) => invoke('db_redis_get_keys', { config, pattern }),
        getValue: (config, key) => invoke('db_redis_get_value', { config, key }),
        setValue: (config, payload) => invoke('db_redis_set_value', { config, payload }),
        deleteKey: (config, key) => invoke('db_redis_delete_key', { config, key }),
        flush: (config) => invoke('db_redis_flush', { config })
      }
    },

    installDependencies: (projectId, folderPath, manager) =>
      invoke('install_dependencies', { projectId, folderPath, manager }),
    setupHttps: (projectId, folderPath, domain, port) =>
      invoke('setup_https', { projectId, folderPath, domain, port }),

    startTunnel: (projectId, port, provider = 'cloudflare') =>
      invoke('start_tunnel', { projectId, port: Number(port), provider }),
    stopTunnel: (projectId) => invoke('stop_tunnel', { projectId }),
    onTunnelUrl: (cb) => subscribeEvent('tunnel-url', cb),

    ssl: {
      getStatus: () => invoke('ssl_get_status'),
      installCa: () => invoke('ssl_install_ca'),
      uninstallCa: () => invoke('ssl_uninstall_ca'),
      generateCert: (domain) => invoke('ssl_generate_cert', { domain })
    },

    setLocalDomain: (domain, port, enableSsl) =>
      invoke('set_local_domain', { domain, port: Number(port), enableSsl: Boolean(enableSsl) }),
    getLocalDomains: () => invoke('get_local_domains'),

    runProjectScript: (projectId, folderPath, scriptCommand) =>
      invoke('run_project_script', { projectId, folderPath, scriptCommand }),

    docker: {
      checkAvailable: () => invoke('docker_check_available'),
      detectFiles: (folderPath) => invoke('docker_detect_files', { folderPath }),
      getStatus: (folderPath) => invoke('docker_get_status', { folderPath }),
      runAction: (folderPath, action, serviceName) =>
        invoke('docker_run_action', { folderPath, action, serviceName }),
      getLogs: (folderPath, serviceName, tail) =>
        invoke('docker_get_logs', { folderPath, serviceName, tail }),
      generateCompose: (folderPath, selectedServices, customConfig) =>
        invoke('docker_generate_compose', { folderPath, selectedServices, customConfig })
    },

    apiClient: {
      sendRequest: (requestData) => invoke('api_send_request', { requestData }),
      getCollections: (folderPath) => invoke('api_get_collections', { folderPath }),
      saveCollections: (folderPath, collections) =>
        invoke('api_save_collections', { folderPath, collections })
    },

    webhookInspector: {
      getEvents: (projectId) => invoke('webhook_get_events', { projectId }),
      clearEvents: (projectId) => invoke('webhook_clear_events', { projectId }),
      replayEvent: (projectId, eventData, targetPort) =>
        invoke('webhook_replay_event', { projectId, eventData, targetPort }),
      getMockTemplates: () => invoke('webhook_get_mock_templates'),
      sendMock: (payload) => invoke('webhook_send_mock', { payload }),
      onTrafficEvent: (cb) => subscribeEvent('webhook-traffic-event', cb)
    },

    openLogWindow: (projectId, projectName) =>
      invoke('open_log_window', { projectId, projectName }),
    openApiHubWindow: (data) => invoke('open_api_hub_window', { data }),
    openGitWindow: (data) => invoke('open_git_window', { data }),
    getProjectLogs: (projectId) => invoke<string[]>('get_project_logs', { projectId }),
    clearProjectLogs: (projectId) => invoke('clear_project_logs', { projectId }),
    writeProjectStdin: (projectId, input) => invoke('write_project_stdin', { projectId, input }),
    clearAllLogs: () => invoke('clear_all_logs'),

    sendNotification: (title, body, silent = false) =>
      invoke('send_notification', { title, body, silent }),

    downloadAndInstallTech: (techKeys) => invoke('system_install_tech', { techKeys }),
    onTechInstallProgress: (cb) => subscribeEvent('tech-install-progress', cb),

    windowMinimize: async () => {
      try {
        await getCurrentWindow().minimize();
      } catch {
        await invoke('window_minimize');
      }
    },
    windowMaximize: async () => {
      try {
        const win = getCurrentWindow();
        if (await win.isMaximized()) {
          await win.unmaximize();
        } else {
          await win.maximize();
        }
      } catch {
        await invoke('window_maximize');
      }
    },
    windowClose: async () => {
      try {
        await getCurrentWindow().close();
      } catch {
        await invoke('window_close');
      }
    },

    onProcessLog: (cb) => subscribeEvent('process-log', cb),
    onProcessStatus: (cb) => subscribeEvent('process-status', cb),
    onLogsCleared: (cb) => subscribeEvent('logs-cleared', cb),
    onFileDrop: (cb) =>
      subscribeEvent<{ paths?: string[] }>('tauri://drag-drop', (payload) => {
        if (payload?.paths && Array.isArray(payload.paths) && payload.paths.length > 0) {
          cb(payload.paths);
        }
      }),

    updater: {
      getVersion: () => invoke<string>('updater_get_version'),
      checkForUpdates: () => invoke('updater_check_for_updates'),
      startDownload: () => invoke('updater_start_download'),
      restartAndApply: () => invoke('updater_restart_and_apply'),
      simulateFlow: (payload) => invoke('updater_simulate_flow', { payload }),
      onUpdateStatus: (cb) => subscribeEvent('update-status', cb),
      onUpdateAvailable: (cb) => subscribeEvent('update-available', cb),
      onUpdateNotAvailable: (cb) => subscribeEvent('update-not-available', () => cb()),
      onDownloadProgress: (cb) => subscribeEvent('update-download-progress', cb),
      onUpdateDownloaded: (cb) => subscribeEvent('update-downloaded', cb),
      onUpdateError: (cb) => subscribeEvent('update-error', cb)
    },

    relaunchApp: () => invoke('relaunch_app'),

    git: {
      getStatus: (folderPath) => invoke('git_get_status', { folderPath }),
      getHistory: (folderPath, limit = 50) => invoke('git_get_history', { folderPath, limit }),
      getBranches: (folderPath) => invoke('git_get_branches', { folderPath }),
      checkoutBranch: (folderPath, branchName) =>
        invoke('git_checkout_branch', { folderPath, branchName }),
      stageAll: (folderPath) => invoke('git_stage_all', { folderPath }),
      commit: (folderPath, message) => invoke('git_commit', { folderPath, message }),
      push: (folderPath) => invoke('git_push', { folderPath }),
      pull: (folderPath) => invoke('git_pull', { folderPath })
    },

    ai: {
      testConnection: (options) => invoke('ai_test_connection', { options }),
      chatCompletion: (payload) => invoke('ai_chat_completion', { payload })
    }
  };
}

export function initPlatformBridge(): void {
  if (typeof window !== 'undefined' && isTauriRuntime() && !window.electronAPI) {
    window.electronAPI = createTauriBridge();
  }
}
