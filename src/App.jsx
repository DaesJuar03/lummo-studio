import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import HomeDashboard from './components/HomeDashboard';
import ProjectsPanel from './components/ProjectsPanel';
import DatabasesPanel from './components/DatabasesPanel';
import LogsConsole from './components/LogsConsole';
import SettingsModal from './components/SettingsModal';
import CommandPaletteModal from './components/CommandPaletteModal';
import NewTabActionModal from './components/NewTabActionModal';
import ImportProjectModal from './components/ImportProjectModal';
import OnboardingWizard from './components/OnboardingWizard';
import StandaloneLogWindow from './components/StandaloneLogWindow';
import ProjectDetailPage from './components/ProjectDetailPage';
import DatabaseDetailPage from './components/DatabaseDetailPage';
import ErrorBoundary from './components/ErrorBoundary';
import { getTranslations } from './locales';

export default function App() {
  const [projects, setProjects] = useState([]);
  const [envStatus, setEnvStatus] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [logs, setLogs] = useState({});
  const [activeLogsProject, setActiveLogsProject] = useState(null);

  // First-Time User Onboarding State (Only true on the very first startup)
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return localStorage.getItem('lummo-onboarded') !== 'true';
  });

  // Language State ('es' vs 'en') persisted in localStorage
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('lummo-language') || 'es';
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

  // Firefox / Chrome Browser-style Dynamic Tab System
  const [openTabs, setOpenTabs] = useState([
    { id: 'home', title: t.home, type: 'home', closable: false }
  ]);
  const [activeTabId, setActiveTabId] = useState('home');

  // Navigation History Pointer for Back (<) and Forward (>)
  const [navHistory, setNavHistory] = useState(['home']);
  const [navIndex, setNavIndex] = useState(0);

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

  // Update tabs title when language changes
  useEffect(() => {
    localStorage.setItem('lummo-language', language);
    setOpenTabs(prev => prev.map(tab => {
      if (tab.id === 'home') return { ...tab, title: t.home };
      if (tab.id === 'projects') return { ...tab, title: t.projects };
      if (tab.id === 'databases') return { ...tab, title: t.databases };
      return tab;
    }));
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

  const handleAddCustomDatabase = (newDbObj) => {
    setCustomDatabases(prev => [newDbObj, ...prev]);
    openTab({ id: `db-${newDbObj.id}`, title: `Base de Datos / ${newDbObj.name}`, type: 'database-detail', db: newDbObj });
  };

  const handleRemoveDatabase = (dbId) => {
    setCustomDatabases(prev => prev.filter(d => d.id !== dbId));
    closeTab(`db-${dbId}`);
  };

  // Open / Select Tab Helper with Prefix Formatting
  const openTab = ({ id, title, type, project = null, db = null }) => {
    let tabTitle = title;
    if (type === 'project-detail') {
      const name = project?.name || title.replace(/^(Proyecto|Base de Datos)\s*\/\s*/, '');
      tabTitle = `Proyecto / ${name}`;
    } else if (type === 'database-detail') {
      const name = db?.name || title.replace(/^(Proyecto|Base de Datos)\s*\/\s*/, '');
      tabTitle = `Base de Datos / ${name}`;
    }

    const exists = openTabs.find(t => t.id === id);
    if (!exists) {
      const newTabObj = { id, title: tabTitle, type, project, db, closable: id !== 'home' };
      setOpenTabs(prev => [...prev, newTabObj]);
    } else {
      setOpenTabs(prev => prev.map(t => t.id === id ? { ...t, title: tabTitle, project: project || t.project } : t));
    }
    setActiveTabId(id);

    const newHistory = navHistory.slice(0, navIndex + 1);
    newHistory.push(id);
    setNavHistory(newHistory);
    setNavIndex(newHistory.length - 1);
  };

  const closeTab = (tabId) => {
    if (tabId === 'home') return; // Cannot close Home

    const updated = openTabs.filter(t => t.id !== tabId);
    setOpenTabs(updated);

    if (activeTabId === tabId) {
      const fallbackTab = updated[updated.length - 1] || updated[0];
      if (fallbackTab) setActiveTabId(fallbackTab.id);
    }
  };

  const reorderTabs = (draggedId, targetId) => {
    setOpenTabs((prev) => {
      const draggedIndex = prev.findIndex((t) => t.id === draggedId);
      const targetIndex = prev.findIndex((t) => t.id === targetId);
      if (draggedIndex < 0 || targetIndex < 0 || draggedIndex === targetIndex) return prev;
      const copy = [...prev];
      const [removed] = copy.splice(draggedIndex, 1);
      copy.splice(targetIndex, 0, removed);
      return copy;
    });
  };

  const togglePinTab = (tabId) => {
    setOpenTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, pinned: !t.pinned } : t))
    );
  };

  const closeOtherTabs = (tabId) => {
    setOpenTabs((prev) => prev.filter((t) => t.id === 'home' || t.id === tabId));
    setActiveTabId(tabId);
  };

  const duplicateTab = (tabId) => {
    const tabToDup = openTabs.find((t) => t.id === tabId);
    if (!tabToDup) return;
    const dupId = `${tabToDup.id}_dup_${Date.now()}`;
    const dupTab = {
      ...tabToDup,
      id: dupId,
      title: `${tabToDup.title} (Copia)`,
      closable: true
    };
    setOpenTabs((prev) => [...prev, dupTab]);
    setActiveTabId(dupId);
  };

  const handleGoBack = () => {
    if (navIndex > 0) {
      const prevTabId = navHistory[navIndex - 1];
      setNavIndex(navIndex - 1);
      if (openTabs.some(t => t.id === prevTabId)) {
        setActiveTabId(prevTabId);
      }
    }
  };

  const handleGoForward = () => {
    if (navIndex < navHistory.length - 1) {
      const nextTabId = navHistory[navIndex + 1];
      setNavIndex(navIndex + 1);
      if (openTabs.some(t => t.id === nextTabId)) {
        setActiveTabId(nextTabId);
      }
    }
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

  const defaultSQLite = {
    id: 'sqlite',
    name: 'SQLite (Embebido)',
    port: null,
    status: 'READY',
    size: '2.1 MB',
    tables: 12,
    connections: 1
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
      />
    );
  }

  return (
    <div className={`h-screen w-screen flex flex-col font-sans overflow-hidden transition-colors duration-200 ${
      theme === 'dark' ? 'bg-[#161616] text-[#e4e4e7]' : 'bg-slate-50 text-slate-900'
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
        </ErrorBoundary>
      </main>

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
        />
      )}

      {/* New Tab Action Picker Modal */}
      <NewTabActionModal
        isOpen={showNewTabModal}
        onClose={() => setShowNewTabModal(false)}
        onOpenProjects={() => openTab({ id: 'projects', title: t.projects, type: 'projects' })}
        onOpenDatabases={() => openTab({ id: 'databases', title: t.databases, type: 'databases' })}
        onAddProject={() => setShowImportModal(true)}
        onOpenSQLiteWorkbench={() => openTab({ id: 'db-sqlite', title: 'Base de Datos / SQLite (Embebido)', type: 'database-detail', db: defaultSQLite })}
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
    </div>
  );
}
