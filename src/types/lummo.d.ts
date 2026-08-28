/**
 * Tipos de datos globales para Lummo Studio v2.3.11
 */

export interface LummoProject {
  id: string;
  name: string;
  path: string;
  techStack: string;
  icon: string;
  command: string;
  defaultPort: number;
  port?: number;
  hasPackageJson?: boolean;
  availableCommands?: string[];
  hasBackend?: boolean;
  backend?: Partial<LummoProject>;
  envApiUrl?: string | null;
  status?: 'RUNNING' | 'STOPPED' | 'ERROR';
}

export interface DatabaseConfig {
  id: string;
  name: string;
  type: 'sqlite' | 'mysql' | 'postgres';
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  filePath?: string;
}

export interface SystemEnvironment {
  node: { installed: boolean; version?: string };
  npm?: { installed: boolean; version?: string };
  git?: { installed: boolean; version?: string };
  php?: { installed: boolean; version?: string };
  python?: { installed: boolean; version?: string };
  docker?: { installed: boolean; version?: string };
  sqlite: { installed: boolean; version?: string };
}

export interface ElectronAPI {
  system: {
    scanEnvironment: () => Promise<SystemEnvironment>;
    openExternal: (url: string) => Promise<void>;
    openFolder: (path: string) => Promise<void>;
    selectFolder: () => Promise<string | null>;
  };
  project: {
    detectProject: (path: string) => Promise<LummoProject>;
    runScript: (params: { projectId: string; folderPath: string; scriptCommand: string }) => Promise<{ success: boolean; code?: number; error?: string }>;
    installDependencies: (params: { projectId: string; folderPath: string; manager?: string }) => Promise<{ success: boolean; message?: string; error?: string }>;
    readEnvFile: (folderPath: string) => Promise<{ success: boolean; content?: string; exists?: boolean; error?: string }>;
    writeEnvFile: (params: { folderPath: string; content: string }) => Promise<{ success: boolean; message?: string; error?: string }>;
  };
  db: {
    testConnection: (config: DatabaseConfig) => Promise<{ success: boolean; message?: string; error?: string }>;
    getSchema: (config: DatabaseConfig) => Promise<{ success: boolean; tables?: Record<string, any[]>; error?: string }>;
    executeQuery: (config: DatabaseConfig, query: string) => Promise<{ success: boolean; rows?: any[]; error?: string }>;
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
