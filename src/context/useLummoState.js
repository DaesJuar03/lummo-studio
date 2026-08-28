import { useState, useEffect, useCallback, useRef } from 'react';
import { getTranslations, detectSystemLanguage } from '../locales';
import { useTabNavigation } from '../hooks/useTabNavigation';

export function useLummoState() {
  const isInitialDbMount = useRef(true);
  // Initialize projects immediately from localStorage
  const [projects, setProjects] = useState(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('lummo-projects');
        return saved ? JSON.parse(saved) : [];
      }
    } catch {
      return [];
    }
    return [];
  });
  const [envStatus, setEnvStatus] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [logs, setLogs] = useState({});
  const [activeLogsProject, setActiveLogsProject] = useState(null);
  const [userError, setUserError] = useState(null);

  // Auto-detect user system language on first run
  const [langDetection] = useState(() => detectSystemLanguage());

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem('lummo-onboarded') !== 'true';
      }
    } catch {}
    return false;
  });

  // i18n Language state
  const [language, setLanguage] = useState(() => {
    return langDetection.language;
  });

  // Custom user databases state
  const [customDatabases, setCustomDatabases] = useState(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('lummo-custom-databases');
        return saved ? JSON.parse(saved) : [];
      }
    } catch {
      return [];
    }
    return [];
  });

  // Modals state
  const [showSettings, setShowSettings] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showNewTabModal, setShowNewTabModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Theme state ('light' | 'dark')
  const [theme, setTheme] = useState(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem('lummo-theme') || 'light';
      }
    } catch {}
    return 'light';
  });

  const t = getTranslations(language);

  // Use centralized tab navigation
  const tabNav = useTabNavigation(t);
  const { openTab, closeTab, setOpenTabs } = tabNav;

  // Persist language
  useEffect(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('lummo-language', language);
      }
    } catch {}
  }, [language]);

  // Persist theme
  useEffect(() => {
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.remove('light-theme', 'dark-theme');
      document.body.classList.add(`${theme}-theme`);
    }
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('lummo-theme', theme);
      }
    } catch {}
  }, [theme]);

  // Persist custom databases to localStorage and Electron JSON file
  useEffect(() => {
    if (isInitialDbMount.current) {
      isInitialDbMount.current = false;
      return;
    }
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('lummo-custom-databases', JSON.stringify(customDatabases));
      }
    } catch (e) {
      console.error(e);
    }
    if (window.electronAPI?.saveCustomDatabases) {
      window.electronAPI.saveCustomDatabases(customDatabases).catch(console.error);
    }
  }, [customDatabases]);

  // Initial load of custom databases from disk if available
  useEffect(() => {
    if (window.electronAPI?.getCustomDatabases) {
      window.electronAPI.getCustomDatabases().then(dbs => {
        if (Array.isArray(dbs) && dbs.length > 0) {
          setCustomDatabases(dbs);
          try {
            localStorage.setItem('lummo-custom-databases', JSON.stringify(dbs));
          } catch {}
        }
      }).catch(console.error);
    }
  }, []);

  // Global Error Listener
  useEffect(() => {
    const handleGlobalError = (event) => {
      const detail = event.detail || {};
      setUserError({
        error: detail.error || event.error || event.reason || 'Ocurrió una interrupción inesperada.',
        title: detail.title || 'Atención'
      });
    };

    window.addEventListener('lummo:error', handleGlobalError);
    window.showLummoError = (error, title) => {
      window.dispatchEvent(new CustomEvent('lummo:error', { detail: { error, title } }));
    };

    return () => {
      window.removeEventListener('lummo:error', handleGlobalError);
    };
  }, []);

  // Global Ctrl + K Keyboard Shortcut Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    localStorage.setItem('lummo-onboarded', 'true');
    setShowOnboarding(false);
  }, []);

  const handleScanEnv = useCallback(async () => {
    setIsScanning(true);
    if (window.electronAPI) {
      const res = await window.electronAPI.scanEnvironment();
      setEnvStatus(res);
    } else {
      setEnvStatus({
        node: { installed: true, version: 'v20.11.0' },
        php: { installed: true, version: 'PHP 8.2.12' },
        mysql: { installed: true, version: 'MySQL 8.0' },
        postgres: { installed: false },
        python: { installed: true, version: 'Python 3.11' },
        docker: { installed: true, version: 'Docker Desktop' },
        sqlite: { installed: true, version: 'Engine Embebido Lummo' }
      });
    }
    setIsScanning(false);
  }, []);

  const loadRecentProjects = useCallback(async () => {
    let loadedProjects = [];

    // 1. Try reading from Electron JSON persistence
    if (window.electronAPI?.getRecentProjects) {
      try {
        const recents = await window.electronAPI.getRecentProjects();
        if (Array.isArray(recents) && recents.length > 0) {
          loadedProjects = recents;
        }
      } catch (err) {
        console.error('Error cargando proyectos desde persistencia Electron:', err);
      }
    }

    // 2. Fallback to localStorage if Electron had no projects saved yet
    if (loadedProjects.length === 0) {
      try {
        const saved = localStorage.getItem('lummo-projects');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            loadedProjects = parsed;
            // Synchronize back to Electron disk JSON file
            if (window.electronAPI?.saveRecentProjects) {
              window.electronAPI.saveRecentProjects(parsed);
            }
          }
        }
      } catch {}
    }

    if (loadedProjects.length > 0) {
      setProjects(loadedProjects);
      try {
        localStorage.setItem('lummo-projects', JSON.stringify(loadedProjects));
      } catch {}
    }
  }, []);

  const saveProjects = useCallback(async (updatedProjects) => {
    setProjects(updatedProjects);
    try {
      localStorage.setItem('lummo-projects', JSON.stringify(updatedProjects));
    } catch (e) {
      console.error(e);
    }
    if (window.electronAPI?.saveRecentProjects) {
      try {
        await window.electronAPI.saveRecentProjects(updatedProjects);
      } catch (e) {
        console.error('Error guardando proyectos en archivo JSON:', e);
      }
    }
  }, []);

  // Lifecycle listeners for logs & status
  useEffect(() => {
    handleScanEnv();
    loadRecentProjects();

    if (window.electronAPI) {
      const unsubscribeLog = window.electronAPI.onProcessLog(({ projectId, message }) => {
        setLogs((prev) => ({
          ...prev,
          [projectId]: [...(prev[projectId] || []), message]
        }));
      });

      const unsubscribeStatus = window.electronAPI.onProcessStatus(({ projectId, status }) => {
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId || p.path === projectId ? { ...p, status } : p))
        );
      });

      const unsubscribeCleared = window.electronAPI.onLogsCleared?.(({ projectId, all }) => {
        if (all) {
          setLogs({});
        } else if (projectId) {
          setLogs((prev) => ({ ...prev, [projectId]: [] }));
        }
      });

      return () => {
        unsubscribeLog();
        unsubscribeStatus();
        if (unsubscribeCleared) unsubscribeCleared();
      };
    }
  }, [handleScanEnv, loadRecentProjects]);

  const handleClearProjectLogs = useCallback(async (projectId) => {
    setLogs(prev => ({ ...prev, [projectId]: [] }));
    if (window.electronAPI?.clearProjectLogs) {
      await window.electronAPI.clearProjectLogs(projectId);
    }
  }, []);

  const handleClearAllLogs = useCallback(async () => {
    setLogs({});
    if (window.electronAPI?.clearAllLogs) {
      await window.electronAPI.clearAllLogs();
    }
  }, []);

  const handleAddCustomDatabase = useCallback(async (newDbObj) => {
    let filePath = newDbObj.filePath || null;
    if ((!filePath || !newDbObj.filePath) && window.electronAPI?.db?.getDefaultDbPath) {
      const res = await window.electronAPI.db.getDefaultDbPath(newDbObj.name);
      if (res?.filePath) filePath = res.filePath;
    }
    const fullDbObj = {
      ...newDbObj,
      filePath,
      installed: true,
      isDb: true,
      tech: newDbObj.engine === 'sqlite' ? 'SQLite (.sqlite en Documentos)' : `Esquema ${(newDbObj.engine || 'sqlite').toUpperCase()}`
    };
    setCustomDatabases(prev => [fullDbObj, ...prev]);
    openTab({ id: `db-${fullDbObj.id}`, title: `Base de Datos / ${fullDbObj.name}`, type: 'database-detail', db: fullDbObj });
  }, [openTab]);

  const handleRemoveDatabase = useCallback((dbId) => {
    setCustomDatabases(prev => prev.filter(d => d.id !== dbId));
    closeTab(`db-${dbId}`);
  }, [closeTab]);

  const handleImportFolderPath = useCallback(async (folderPath) => {
    let detected = { name: 'proyecto-local', techStack: 'Vite + React', command: 'npm run dev', defaultPort: 5173 };

    if (window.electronAPI?.detectProject) {
      detected = await window.electronAPI.detectProject(folderPath);
    }

    const existingIndex = projects.findIndex(p => p.path === folderPath || (p.path && p.path.toLowerCase() === folderPath.toLowerCase()));
    const existingProject = existingIndex >= 0 ? projects[existingIndex] : null;

    let freePort = existingProject ? existingProject.port : (detected.defaultPort || 3000);
    if (!existingProject && window.electronAPI?.findFreePort) {
      freePort = await window.electronAPI.findFreePort(detected.defaultPort || 3000);
    }

    const newProject = {
      id: existingProject ? existingProject.id : 'proj-' + Date.now(),
      name: detected.name,
      path: folderPath,
      techStack: detected.techStack,
      command: detected.command,
      port: freePort,
      status: existingProject ? existingProject.status : 'STOPPED',
      hasBackend: detected.hasBackend || false,
      backend: detected.backend || null,
      envApiUrl: detected.envApiUrl || null,
      dualLabel: detected.dualLabel || null
    };

    let updatedProjects;
    if (existingIndex >= 0) {
      updatedProjects = [...projects];
      updatedProjects[existingIndex] = newProject;
    } else {
      updatedProjects = [newProject, ...projects];
    }

    saveProjects(updatedProjects);
    openTab({ id: newProject.id, title: `Proyecto / ${newProject.name}`, type: 'project-detail', project: newProject });
  }, [projects, saveProjects, openTab]);

  const handleToggleProject = useCallback(async (project) => {
    const isCurrentlyRunning = project.status === 'RUNNING';
    const nextStatus = isCurrentlyRunning ? 'STOPPED' : 'RUNNING';

    const updatedProjects = projects.map(p => (p.id === project.id || p.path === project.path) ? { ...p, status: nextStatus } : p);
    setProjects(updatedProjects);

    setOpenTabs(prev => prev.map(t => {
      if (t.project && (t.project.id === project.id || t.project.path === project.path)) {
        return { ...t, project: { ...t.project, status: nextStatus } };
      }
      return t;
    }));

    if (isCurrentlyRunning) {
      if (window.electronAPI) {
        await window.electronAPI.stopProject(project.id);
      }
    } else {
      if (window.electronAPI) {
        await window.electronAPI.startProject(project);
      } else {
        setLogs(prev => ({
          ...prev,
          [project.id]: [`[Lummo] Servidor escuchando en http://localhost:${project.port}`]
        }));
      }
    }
  }, [projects, setOpenTabs]);

  const handleOpenLogWindow = useCallback((project) => {
    if (window.electronAPI?.openLogWindow) {
      window.electronAPI.openLogWindow(project.id, project.name);
    } else {
      setActiveLogsProject(prev => prev === project.id ? null : project.id);
    }
  }, []);

  const handleOpenBrowser = useCallback((url) => {
    if (window.electronAPI) {
      window.electronAPI.openInBrowser(url);
    } else {
      window.open(url, '_blank');
    }
  }, []);

  const handleOpenEditor = useCallback((folderPath) => {
    if (window.electronAPI) {
      const preferredCmd = localStorage.getItem('lummo-preferred-editor') || 'code';
      window.electronAPI.openInEditor(folderPath, preferredCmd);
    }
  }, []);

  const handleRemoveProject = useCallback((projectId) => {
    const updated = projects.filter(p => p.id !== projectId && p.path !== projectId);
    saveProjects(updated);
    closeTab(projectId);
  }, [projects, saveProjects, closeTab]);

  const handleUpdatePort = useCallback((projectId, newPort) => {
    const updated = projects.map(p => (p.id === projectId || p.path === projectId) ? { ...p, port: newPort } : p);
    saveProjects(updated);
    setOpenTabs(prev => prev.map(t => {
      if (t.project && (t.project.id === projectId || t.project.path === projectId)) {
        return { ...t, project: { ...t.project, port: newPort } };
      }
      return t;
    }));
  }, [projects, saveProjects, setOpenTabs]);

  const handleUpdateCommand = useCallback((projectId, newCommand) => {
    const updated = projects.map(p => (p.id === projectId || p.path === projectId) ? { ...p, command: newCommand } : p);
    saveProjects(updated);
    setOpenTabs(prev => prev.map(t => {
      if (t.project && (t.project.id === projectId || t.project.path === projectId)) {
        return { ...t, project: { ...t.project, command: newCommand } };
      }
      return t;
    }));
  }, [projects, saveProjects, setOpenTabs]);

  return {
    projects,
    setProjects,
    saveProjects,
    loadRecentProjects,
    envStatus,
    setEnvStatus,
    isScanning,
    setIsScanning,
    handleScanEnv,
    logs,
    setLogs,
    activeLogsProject,
    setActiveLogsProject,
    handleClearProjectLogs,
    handleClearAllLogs,
    userError,
    setUserError,
    showOnboarding,
    setShowOnboarding,
    handleOnboardingComplete,
    language,
    setLanguage,
    langDetection,
    customDatabases,
    setCustomDatabases,
    handleAddCustomDatabase,
    handleRemoveDatabase,
    showSettings,
    setShowSettings,
    showCommandPalette,
    setShowCommandPalette,
    showNewTabModal,
    setShowNewTabModal,
    showImportModal,
    setShowImportModal,
    theme,
    toggleTheme,
    t,
    tabNav,
    handleImportFolderPath,
    handleToggleProject,
    handleOpenLogWindow,
    handleOpenBrowser,
    handleOpenEditor,
    handleRemoveProject,
    handleUpdatePort,
    handleUpdateCommand
  };
}
