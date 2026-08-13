import { useState, useEffect, useCallback } from 'react';
import { getTranslations } from '../locales';

export function useLummoState() {
  const [projects, setProjects] = useState([]);
  const [envStatus, setEnvStatus] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [logs, setLogs] = useState({});
  const [activeLogsProject, setActiveLogsProject] = useState(null);

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return localStorage.getItem('lummo-onboarded') !== 'true';
  });

  // i18n Language state
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('lummo-language') || 'es';
  });

  // Custom user databases state
  const [customDatabases, setCustomDatabases] = useState(() => {
    try {
      const saved = localStorage.getItem('lummo-custom-databases');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modals state
  const [showSettings, setShowSettings] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showNewTabModal, setShowNewTabModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Tabs state
  const [activeTabId, setActiveTabId] = useState('home');
  const [tabs, setTabs] = useState([
    { id: 'home', title: 'Inicio / Dashboard', type: 'home' }
  ]);

  // Theme state ('dark' | 'light')
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('lummo-theme') || 'dark';
  });

  const isDark = theme === 'dark';
  const t = getTranslations(language);

  // Persist language
  useEffect(() => {
    localStorage.setItem('lummo-language', language);
  }, [language]);

  // Persist theme
  useEffect(() => {
    localStorage.setItem('lummo-theme', theme);
  }, [theme]);

  // Persist custom databases
  useEffect(() => {
    localStorage.setItem('lummo-custom-databases', JSON.stringify(customDatabases));
  }, [customDatabases]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const openTab = useCallback((tabObj) => {
    setTabs(prev => {
      if (prev.some(t => t.id === tabObj.id)) return prev;
      return [...prev, tabObj];
    });
    setActiveTabId(tabObj.id);
  }, []);

  const closeTab = useCallback((tabId, e) => {
    if (e) e.stopPropagation();
    setTabs(prev => {
      const next = prev.filter(t => t.id !== tabId);
      if (next.length === 0) {
        setActiveTabId('home');
        return [{ id: 'home', title: t.home || 'Inicio', type: 'home' }];
      }
      return next;
    });
    setActiveTabId(prev => (prev === tabId ? 'home' : prev));
  }, [t.home]);

  const handleClearProjectLogs = useCallback((projectId) => {
    setLogs(prev => ({ ...prev, [projectId]: [] }));
    if (window.electronAPI?.project?.clearProjectLogs) {
      window.electronAPI.project.clearProjectLogs(projectId);
    }
  }, []);

  const handleClearAllLogs = useCallback(() => {
    setLogs({});
    if (window.electronAPI?.project?.clearAllLogs) {
      window.electronAPI.project.clearAllLogs();
    }
  }, []);

  return {
    projects,
    setProjects,
    envStatus,
    setEnvStatus,
    isScanning,
    setIsScanning,
    logs,
    setLogs,
    activeLogsProject,
    setActiveLogsProject,
    showOnboarding,
    setShowOnboarding,
    language,
    setLanguage,
    customDatabases,
    setCustomDatabases,
    showSettings,
    setShowSettings,
    showCommandPalette,
    setShowCommandPalette,
    showNewTabModal,
    setShowNewTabModal,
    showImportModal,
    setShowImportModal,
    activeTabId,
    setActiveTabId,
    tabs,
    setTabs,
    theme,
    isDark,
    toggleTheme,
    t,
    openTab,
    closeTab,
    handleClearProjectLogs,
    handleClearAllLogs
  };
}
