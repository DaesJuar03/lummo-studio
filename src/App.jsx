import React, { useState, useEffect, lazy, Suspense } from 'react';
import Header from './components/common/Header';
import HomeDashboard from './components/views/HomeDashboard';
import ProjectsPanel from './components/views/ProjectsPanel';
import DatabasesPanel from './components/views/DatabasesPanel';
import LogsConsole from './components/common/LogsConsole';
import ErrorBoundary from './components/common/ErrorBoundary';
import { useTabNavigation } from './hooks/useTabNavigation';
import { getTranslations, detectSystemLanguage } from './locales';

// Code Splitting with React.lazy for heavy modals and detail pages
const SettingsModal = lazy(() => import('./components/modals/SettingsModal'));
const CommandPaletteModal = lazy(() => import('./components/modals/CommandPaletteModal'));
const NewTabActionModal = lazy(() => import('./components/modals/NewTabActionModal'));
const ImportProjectModal = lazy(() => import('./components/modals/ImportProjectModal'));
const OnboardingWizard = lazy(() => import('./components/views/OnboardingWizard'));
import UserErrorModal from './components/modals/UserErrorModal';
const StandaloneLogWindow = lazy(() => import('./components/views/StandaloneLogWindow'));
const ProjectDetailPage = lazy(() => import('./components/views/ProjectDetailPage'));
const DatabaseDetailPage = lazy(() => import('./components/views/DatabaseDetailPage'));

export default function App() {
  const [projects, setProjects] = useState([]);
  const [envStatus, setEnvStatus] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [logs, setLogs] = useState({});
  const [activeLogsProject, setActiveLogsProject] = useState(null);
  const [userError, setUserError] = useState(null);

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

  // Auto-detect user system language on first run
  const [langDetection] = useState(() => detectSystemLanguage());

  // First-Time User Onboarding State (Only true on the very first startup)
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return localStorage.getItem('lummo-onboarded') !== 'true';
  });

  // Language State ('es' vs 'en') persisted in localStorage or auto-detected
  const [language, setLanguage] = useState(() => {
    return langDetection.language;
  });

  // Custom User Databases State (Persisted in localStorage)
  const [customDatabases, setCustomDatabases] = useState(() => {
    try {
      const saved = localStorage.getItem('lummo-custom-databases');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const t = getTranslations(language);

  // Custom Hook para Pestañas e Historial de Navegación
  const {
    openTabs,
    setOpenTabs,
    activeTabId,
    setActiveTabId,
    navIndex,
    navHistory,
    openTab,
    closeTab,
    reorderTabs,
    togglePinTab,
    closeOtherTabs,
    duplicateTab,
    handleGoBack,
    handleGoForward
  } = useTabNavigation(t);

  // Theme State ('light' vs 'dark')
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('lummo-theme') || 'light';
  });

  const [showSettings, setShowSettings] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showNewTabModal, setShowNewTabModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

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

  // Guardar preferencia de idioma en localStorage
  useEffect(() => {
    localStorage.setItem('lummo-language', language);
  }, [language]);

  // Save custom databases to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('lummo-custom-databases', JSON.stringify(customDatabases));
    } catch (e) {
      console.error(e);
    }
  }, [customDatabases]);

  // Apply body theme class
  useEffect(() => {
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(`${theme}-theme`);
    localStorage.setItem('lummo-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem('lummo-onboarded', 'true');
    setShowOnboarding(false);
  };

  // Check Hash for Standalone Log Window route: #/logs/{projectId}
  const hash = window.location.hash;
  if (hash.startsWith('#/logs/')) {
    const projectId = hash.replace('#/logs/', '').split('?')[0];
    const searchParams = new URLSearchParams(hash.split('?')[1] || '');
    const projectName = searchParams.get('name') || 'Terminal Logs';

    return <StandaloneLogWindow projectId={projectId} projectName={projectName} />;
  }

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
  }, []);

  const handleClearProjectLogs = async (projectId) => {
    setLogs((prev) => ({ ...prev, [projectId]: [] }));
    if (window.electronAPI?.clearProjectLogs) {
      await window.electronAPI.clearProjectLogs(projectId);
    }
  };

  const handleClearAllLogs = async () => {
    setLogs({});
    if (window.electronAPI?.clearAllLogs) {
      await window.electronAPI.clearAllLogs();
    }
  };

  const handleScanEnv = async () => {
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
  };

  const loadRecentProjects = async () => {
    if (window.electronAPI?.getRecentProjects) {
      const recents = await window.electronAPI.getRecentProjects();
      if (Array.isArray(recents) && recents.length > 0) {
        setProjects(recents);
        try {
          localStorage.setItem('lummo-projects', JSON.stringify(recents));
        } catch (e) {}
      }
    }
  };

  const saveProjects = async (updatedProjects) => {
    setProjects(updatedProjects);
    try {
      localStorage.setItem('lummo-projects', JSON.stringify(updatedProjects));
    } catch (e) {
      console.error(e);
    }
    if (window.electronAPI?.saveRecentProjects) {
      await window.electronAPI.saveRecentProjects(updatedProjects);
    }
  };

  const handleAddCustomDatabase = async (newDbObj) => {
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
  };

  const handleRemoveDatabase = (dbId) => {
    setCustomDatabases(prev => prev.filter(d => d.id !== dbId));
    closeTab(`db-${dbId}`);
  };



  const handleImportFolderPath = async (folderPath) => {
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
  };

  const handleToggleProject = async (project) => {
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
  };

  const handleOpenLogWindow = (project) => {
    if (window.electronAPI?.openLogWindow) {
      window.electronAPI.openLogWindow(project.id, project.name);
    } else {
      setActiveLogsProject(prev => prev === project.id ? null : project.id);
    }
  };

  const handleOpenBrowser = (url) => {
    if (window.electronAPI) {
      window.electronAPI.openInBrowser(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const handleOpenEditor = (folderPath) => {
    if (window.electronAPI) {
      const preferredCmd = localStorage.getItem('lummo-preferred-editor') || 'code';
      window.electronAPI.openInEditor(folderPath, preferredCmd);
    }
  };

  const handleRemoveProject = (projectId) => {
    const updated = projects.filter(p => p.id !== projectId && p.path !== projectId);
    saveProjects(updated);
    closeTab(projectId);
  };

  const handleUpdatePort = (projectId, newPort) => {
    const updated = projects.map(p => (p.id === projectId || p.path === projectId) ? { ...p, port: newPort } : p);
    saveProjects(updated);
    setOpenTabs(prev => prev.map(t => {
      if (t.project && (t.project.id === projectId || t.project.path === projectId)) {
        return { ...t, project: { ...t.project, port: newPort } };
      }
      return t;
    }));
  };

  const handleUpdateCommand = (projectId, newCommand) => {
    const updated = projects.map(p => (p.id === projectId || p.path === projectId) ? { ...p, command: newCommand } : p);
    saveProjects(updated);
    setOpenTabs(prev => prev.map(t => {
      if (t.project && (t.project.id === projectId || t.project.path === projectId)) {
        return { ...t, project: { ...t.project, command: newCommand } };
      }
      return t;
    }));
  };

  const runningCount = projects.filter(p => p.status === 'RUNNING').length;
  const activeTabObj = openTabs.find(t => t.id === activeTabId) || openTabs[0];

  const cleanSQLite = {
    id: 'sqlite-custom',
    name: 'Nueva Base de Datos SQLite',
    type: 'sqlite',
    port: null,
    status: 'READY'
  };

  // IF FIRST TIME USER ONBOARDING: Render standalone full-page setup view BEFORE main app
  if (showOnboarding) {
    return (
      <OnboardingWizard
        isOpen={true}
        onComplete={handleOnboardingComplete}
        envStatus={envStatus}
        onScanEnv={handleScanEnv}
        isScanning={isScanning}
        theme={theme}
        onToggleTheme={toggleTheme}
        language={language}
        onSelectLanguage={(lang) => setLanguage(lang)}
        detectedLang={langDetection.detectedLang}
        isLangSupported={langDetection.isSupported}
      />
    );
  }

  return (
    <div className={`h-screen w-screen flex flex-col font-sans overflow-hidden transition-colors duration-200 ${
      theme === 'dark' ? 'bg-[#0d0e11] text-[#e6e8ec]' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Header */}
      <Header
        openTabs={openTabs}
        activeTabId={activeTabId}
        onSelectTab={(id) => setActiveTabId(id)}
        onCloseTab={closeTab}
        onPlusClick={() => setShowNewTabModal(true)}
        onOpenCommandPalette={() => setShowCommandPalette(true)}
        onOpenSettings={() => setShowSettings(true)}
        runningCount={runningCount}
        canGoBack={navIndex > 0}
        canGoForward={navIndex < navHistory.length - 1}
        onGoBack={handleGoBack}
        onGoForward={handleGoForward}
        onReorderTabs={reorderTabs}
        onTogglePinTab={togglePinTab}
        onCloseOtherTabs={closeOtherTabs}
        onDuplicateTab={duplicateTab}
        theme={theme}
        language={language}
      />

      {/* Main Content Pane rendered according to Active Tab */}
      <main className={`flex-1 flex flex-col ${activeTabObj?.type === 'home' ? 'overflow-hidden' : 'overflow-y-auto custom-scrollbar'}`}>
        <ErrorBoundary>
          {activeTabObj?.type === 'home' && (
            <HomeDashboard
              projects={projects}
              customDatabases={customDatabases}
              onAddProject={() => setShowImportModal(true)}
              onImportFolder={handleImportFolderPath}
              onOpenProjectsTab={() => openTab({ id: 'projects', title: t.projects, type: 'projects' })}
              onOpenDatabasesTab={() => openTab({ id: 'databases', title: t.databases, type: 'databases' })}
              onOpenSettings={() => setShowSettings(true)}
              onToggleProject={handleToggleProject}
              onRemoveProject={handleRemoveProject}
              onSelectProjectDetail={(project) => openTab({ id: project.id, title: `Proyecto / ${project.name}`, type: 'project-detail', project })}
              onSelectDatabaseDetail={(dbItem) => openTab({ id: `db-${dbItem.id}`, title: `Base de Datos / ${dbItem.name}`, type: 'database-detail', db: dbItem })}
              onAddCustomDatabase={handleAddCustomDatabase}
              onRemoveDatabase={handleRemoveDatabase}
              theme={theme}
              language={language}
            />
          )}

          {activeTabObj?.type === 'projects' && (
            <ProjectsPanel
              projects={projects}
              onAddProject={() => setShowImportModal(true)}
              onToggleProject={handleToggleProject}
              onOpenBrowser={handleOpenBrowser}
              onOpenEditor={handleOpenEditor}
              onRemoveProject={handleRemoveProject}
              onUpdatePort={handleUpdatePort}
              onToggleLogs={(id) => {
                const project = projects.find(p => p.id === id || p.path === id);
                if (project) handleOpenLogWindow(project);
              }}
              onSelectProjectDetail={(project) => openTab({ id: project.id, title: `Proyecto / ${project.name}`, type: 'project-detail', project })}
              activeLogsProject={activeLogsProject}
              theme={theme}
            />
          )}

          {activeTabObj?.type === 'databases' && (
            <DatabasesPanel
              envStatus={envStatus}
              customDatabases={customDatabases}
              onAddCustomDatabase={handleAddCustomDatabase}
              onSelectDatabaseDetail={(dbItem) => openTab({ id: `db-${dbItem.id}`, title: `Base de Datos / ${dbItem.name}`, type: 'database-detail', db: dbItem })}
              theme={theme}
            />
          )}

        <Suspense fallback={
          <div className="flex items-center justify-center p-12 text-xs font-mono text-slate-500">
            <span className="animate-pulse">Cargando módulo de Lummo Studio...</span>
          </div>
        }>
          {activeTabObj?.type === 'project-detail' && activeTabObj.project && (
            <ProjectDetailPage
              project={projects.find(p => p.id === activeTabObj.project.id || p.path === activeTabObj.project.path) || activeTabObj.project}
              onBack={() => setActiveTabId('home')}
              onToggleProject={handleToggleProject}
              onOpenBrowser={handleOpenBrowser}
              onOpenEditor={handleOpenEditor}
              onOpenLogs={handleOpenLogWindow}
              onUpdatePort={handleUpdatePort}
              onUpdateCommand={handleUpdateCommand}
              theme={theme}
            />
          )}

          {activeTabObj?.type === 'database-detail' && activeTabObj.db && (
            <DatabaseDetailPage
              db={activeTabObj.db}
              onBack={() => setActiveTabId('databases')}
              theme={theme}
            />
          )}
        </Suspense>
        </ErrorBoundary>
      </main>

      <Suspense fallback={null}>
        {/* Real-time Console Logs Drawer (Fallback) */}
        {activeLogsProject && (
          <LogsConsole
            logs={logs}
            activeProjectId={activeLogsProject}
            projects={projects}
            onClose={() => setActiveLogsProject(null)}
            onClearLogs={handleClearProjectLogs}
          />
        )}

        {/* Settings Modal */}
        {showSettings && (
          <SettingsModal
            onClose={() => setShowSettings(false)}
            envStatus={envStatus}
            onScanEnv={handleScanEnv}
            isScanning={isScanning}
            theme={theme}
            onToggleTheme={toggleTheme}
            language={language}
            onSelectLanguage={(lang) => setLanguage(lang)}
            onOpenOnboarding={() => setShowOnboarding(true)}
            onClearAllLogs={handleClearAllLogs}
            projects={projects}
            onSaveProjects={saveProjects}
            onRemoveProject={handleRemoveProject}
            onOpenFolder={(folderPath) => {
              if (window.electronAPI?.openFolder) {
                window.electronAPI.openFolder(folderPath);
              }
            }}
          />
        )}

        {/* New Tab Action Picker Modal */}
        <NewTabActionModal
          isOpen={showNewTabModal}
          onClose={() => setShowNewTabModal(false)}
          onOpenProjects={() => openTab({ id: 'projects', title: t.projects, type: 'projects' })}
          onOpenDatabases={() => openTab({ id: 'databases', title: t.databases, type: 'databases' })}
          onAddProject={() => setShowImportModal(true)}
          onOpenSQLiteWorkbench={() => openTab({ id: 'db-sqlite', title: 'Base de Datos / SQLite', type: 'database-detail', db: cleanSQLite })}
          theme={theme}
        />

        {/* Import Project Modal with Drag and Drop Zone */}
        <ImportProjectModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImportFolder={handleImportFolderPath}
          projects={projects}
          theme={theme}
          language={language}
        />

        {/* Quick Command Omnibox (Ctrl + K) */}
        <CommandPaletteModal
          isOpen={showCommandPalette}
          onClose={() => setShowCommandPalette(false)}
          projects={projects}
          customDatabases={customDatabases}
          onAddProject={() => setShowImportModal(true)}
          onOpenProjects={() => openTab({ id: 'projects', title: t.projects, type: 'projects' })}
          onOpenDatabases={() => openTab({ id: 'databases', title: t.databases, type: 'databases' })}
          onOpenSettings={() => setShowSettings(true)}
          onToggleProject={handleToggleProject}
          onSelectDatabaseDetail={(dbItem) => openTab({ id: `db-${dbItem.id}`, title: `Base de Datos / ${dbItem.name}`, type: 'database-detail', db: dbItem })}
          onOpenOnboarding={() => setShowOnboarding(true)}
          theme={theme}
        />

        {/* Simplified User-Friendly Error Modal */}
        {userError && (
          <UserErrorModal
            error={userError.error}
            title={userError.title}
            onClose={() => setUserError(null)}
            onOpenInstaller={() => setShowSettings(true)}
            theme={theme}
          />
        )}
      </Suspense>
    </div>
  );
}
