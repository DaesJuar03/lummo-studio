import { useState, useEffect, useCallback } from 'react';
import { getTranslations, detectSystemLanguage } from '../locales';
import { useTabNavigation } from '../hooks/useTabNavigation';

export function useLummoState() {
  const [projects, setProjects] = useState([]);
  const [envStatus, setEnvStatus] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [logs, setLogs] = useState({});
  const [activeLogsProject, setActiveLogsProject] = useState(null);
  const [userError, setUserError] = useState(null);

  // Auto-detect user system language on first run
  const [langDetection] = useState(() => detectSystemLanguage());

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return localStorage.getItem('lummo-onboarded') !== 'true';
  });

  // i18n Language state
  const [language, setLanguage] = useState(() => {
    return langDetection.language;
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

  // Theme state ('light' | 'dark')
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('lummo-theme') || 'light';
  });

  const t = getTranslations(language);

  // Use centralized tab navigation
  const tabNav = useTabNavigation(t);

  // Persist language
  useEffect(() => {
    localStorage.setItem('lummo-language', language);
  }, [language]);

  // Persist theme
  useEffect(() => {
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(`${theme}-theme`);
    localStorage.setItem('lummo-theme', theme);
  }, [theme]);

  // Persist custom databases
  useEffect(() => {
    try {
      localStorage.setItem('lummo-custom-databases', JSON.stringify(customDatabases));
    } catch (e) {
      console.error(e);
    }
  }, [customDatabases]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

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
    userError,
    setUserError,
    showOnboarding,
    setShowOnboarding,
    language,
    setLanguage,
    langDetection,
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
    theme,
    toggleTheme,
    t,
    tabNav,
    handleClearProjectLogs,
    handleClearAllLogs
  };
}
