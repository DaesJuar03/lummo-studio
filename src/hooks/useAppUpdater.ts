import { useState, useEffect, useCallback } from 'react';
import packageInfo from '../../package.json';

const CURRENT_VERSION: string = packageInfo.version || '2.4.69';
const STORAGE_KEY_LAST_VERSION = 'lummo_last_seen_version';
const STORAGE_KEY_CHANGELOG_DISMISSED = 'lummo_changelog_dismissed_version';

export type UpdaterStatus = 'idle' | 'checking' | 'downloading' | 'ready' | 'error';

export interface UpdateInfo {
  version: string;
  releaseNotes: string;
  releaseDate?: string;
}

export function useAppUpdater() {
  const [status, setStatus] = useState<UpdaterStatus>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({
    version: '',
    releaseNotes: '',
    releaseDate: ''
  });
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [showPostUpdateBanner, setShowPostUpdateBanner] = useState<boolean>(false);
  const [showChangelogSheet, setShowChangelogSheet] = useState<boolean>(false);
  const [activeVersion, setActiveVersion] = useState<string>(CURRENT_VERSION);

  const isNewer = (v1?: string, v2?: string): boolean => {
    if (!v1 || !v2) return false;
    const p1 = v1.replace(/^v/, '').split('.').map(Number);
    const p2 = v2.replace(/^v/, '').split('.').map(Number);
    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
      const a = p1[i] || 0;
      const b = p2[i] || 0;
      if (a > b) return true;
      if (a < b) return false;
    }
    return false;
  };

  useEffect(() => {
    try {
      if (typeof localStorage === 'undefined') return;

      const lastSeen = localStorage.getItem(STORAGE_KEY_LAST_VERSION);
      const changelogDismissed = localStorage.getItem(STORAGE_KEY_CHANGELOG_DISMISSED);

      if (lastSeen && isNewer(CURRENT_VERSION, lastSeen)) {
        setShowPostUpdateBanner(true);
        if (changelogDismissed !== CURRENT_VERSION) {
          setShowChangelogSheet(true);
        }
      }

      localStorage.setItem(STORAGE_KEY_LAST_VERSION, CURRENT_VERSION);
    } catch (e) {
      console.warn('[useAppUpdater] Error al comprobar versión en localStorage:', e);
    }
  }, []);

  useEffect(() => {
    if (!window.electronAPI?.updater) return;

    window.electronAPI.updater
      .getVersion?.()
      .then((ver: string) => {
        if (ver) setActiveVersion(ver);
      })
      .catch(() => {});

    const unsubStatus = window.electronAPI.updater.onUpdateStatus?.((data: any) => {
      if (data?.state === 'checking') {
        setStatus('checking');
      }
    });

    const unsubAvailable = window.electronAPI.updater.onUpdateAvailable?.((info: any) => {
      setStatus('downloading');
      setProgress(5);
      setUpdateInfo({
        version: info?.version || 'Nueva versión',
        releaseNotes: info?.releaseNotes || 'Mejoras y nuevas funcionalidades.',
        releaseDate: info?.releaseDate || new Date().toISOString()
      });
    });

    const unsubProgress = window.electronAPI.updater.onDownloadProgress?.((data: any) => {
      setStatus('downloading');
      if (typeof data?.percent === 'number') {
        setProgress(Math.round(data.percent));
      }
    });

    const unsubDownloaded = window.electronAPI.updater.onUpdateDownloaded?.((info: any) => {
      setStatus('ready');
      setProgress(100);
      if (info) {
        setUpdateInfo((prev) => ({
          version: info.version || prev.version,
          releaseNotes: info.releaseNotes || prev.releaseNotes,
          releaseDate: info.releaseDate || prev.releaseDate
        }));
      }
    });

    const unsubError = window.electronAPI.updater.onUpdateError?.((err: any) => {
      console.warn('[useAppUpdater] Error recibido:', err);
      setErrorMessage(err?.message || 'Error en la actualización');
      setTimeout(() => setStatus('idle'), 4000);
    });

    return () => {
      unsubStatus?.();
      unsubAvailable?.();
      unsubProgress?.();
      unsubDownloaded?.();
      unsubError?.();
    };
  }, []);

  const handleRestartAndApply = useCallback(async () => {
    if (window.electronAPI?.updater?.restartAndApply) {
      await window.electronAPI.updater.restartAndApply();
    }
  }, []);

  const handleCheckForUpdates = useCallback(async () => {
    setStatus('checking');
    if (window.electronAPI?.updater?.checkForUpdates) {
      await window.electronAPI.updater.checkForUpdates();
    }
  }, []);

  const handleSimulateUpdate = useCallback((targetVer = '2.4.15') => {
    if (window.electronAPI?.updater?.simulateFlow) {
      window.electronAPI.updater.simulateFlow({ targetVersion: targetVer });
    } else {
      setStatus('downloading');
      setProgress(10);
      setUpdateInfo({
        version: targetVer,
        releaseNotes:
          '⚡ Mayor velocidad en servidores locales.\n🛡️ Nuevo sistema de túneles públicos.\n📊 Monitoreo de memoria RAM y CPU en tiempo real.\n🎨 Interfaz pulida con animaciones fluidas.'
      });
      let current = 10;
      const interval = setInterval(() => {
        current += 15;
        if (current >= 100) {
          clearInterval(interval);
          setProgress(100);
          setStatus('ready');
        } else {
          setProgress(current);
        }
      }, 350);
    }
  }, []);

  const dismissPostUpdateBanner = useCallback(() => {
    setShowPostUpdateBanner(false);
  }, []);

  const dismissChangelogSheet = useCallback(() => {
    setShowChangelogSheet(false);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_CHANGELOG_DISMISSED, CURRENT_VERSION);
      }
    } catch {}
  }, []);

  const openChangelogSheet = useCallback(() => {
    setShowChangelogSheet(true);
  }, []);

  const triggerTestPostUpdate = useCallback((targetVer = CURRENT_VERSION) => {
    setShowPostUpdateBanner(true);
    setShowChangelogSheet(true);
    setUpdateInfo({
      version: targetVer,
      releaseNotes:
        '⚡ Sistema de Auto-Update Integrado y fluidez mejorada.\n🚀 Arranque acelerado de proyectos React y Vite.\n🛡️ Aislamiento de procesos y telemetría en tiempo real.\n🎨 Interfaz 100% traducida en Español e Inglés.'
    });
  }, []);

  return {
    status,
    progress,
    updateInfo,
    errorMessage,
    currentVersion: activeVersion,
    showPostUpdateBanner,
    showChangelogSheet,
    handleRestartAndApply,
    handleCheckForUpdates,
    handleSimulateUpdate,
    dismissPostUpdateBanner,
    dismissChangelogSheet,
    openChangelogSheet,
    setShowPostUpdateBanner,
    setShowChangelogSheet,
    triggerTestPostUpdate
  };
}

export default useAppUpdater;
