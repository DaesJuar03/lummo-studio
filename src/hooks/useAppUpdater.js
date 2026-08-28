import { useState, useEffect, useCallback } from 'react';
import packageInfo from '../../package.json';

const CURRENT_VERSION = packageInfo.version || '2.3.11';
const STORAGE_KEY_LAST_VERSION = 'lummo_last_seen_version';
const STORAGE_KEY_CHANGELOG_DISMISSED = 'lummo_changelog_dismissed_version';

export function useAppUpdater() {
  const [status, setStatus] = useState('idle'); // 'idle' | 'checking' | 'downloading' | 'ready' | 'error'
  const [progress, setProgress] = useState(0); // 0 - 100
  const [updateInfo, setUpdateInfo] = useState({
    version: '',
    releaseNotes: '',
    releaseDate: ''
  });
  const [errorMessage, setErrorMessage] = useState('');

  // Post-update notification banner & Changelog sheet states
  const [showPostUpdateBanner, setShowPostUpdateBanner] = useState(false);
  const [showChangelogSheet, setShowChangelogSheet] = useState(false);
  const [activeVersion, setActiveVersion] = useState(CURRENT_VERSION);

  // Helper para comparar si v1 es mayor que v2
  const isNewer = (v1, v2) => {
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

  // 1. Detectar si la app acaba de actualizarse (comparando con localStorage)
  useEffect(() => {
    try {
      if (typeof localStorage === 'undefined') return;

      const lastSeen = localStorage.getItem(STORAGE_KEY_LAST_VERSION);
      const changelogDismissed = localStorage.getItem(STORAGE_KEY_CHANGELOG_DISMISSED);

      if (lastSeen && isNewer(CURRENT_VERSION, lastSeen)) {
        // La versión actual es mayor a la última guardada -> Mostrar notificación y hoja de actualización
        setShowPostUpdateBanner(true);
        if (changelogDismissed !== CURRENT_VERSION) {
          setShowChangelogSheet(true);
        }
      }

      // Guardar la versión actual como vista
      localStorage.setItem(STORAGE_KEY_LAST_VERSION, CURRENT_VERSION);
    } catch (e) {
      console.warn('[useAppUpdater] Error al comprobar versión en localStorage:', e);
    }
  }, []);

  // 2. Suscribirse a los eventos de Electron Updater
  useEffect(() => {
    if (!window.electronAPI?.updater) return;

    // Obtener versión real de Electron si está disponible
    window.electronAPI.updater.getVersion?.().then((ver) => {
      if (ver) setActiveVersion(ver);
    }).catch(() => {});

    // Estado: comprobando
    const unsubStatus = window.electronAPI.updater.onUpdateStatus?.((data) => {
      if (data?.state === 'checking') {
        setStatus('checking');
      }
    });

    // Estado: actualización disponible -> Inicia descarga
    const unsubAvailable = window.electronAPI.updater.onUpdateAvailable?.((info) => {
      setStatus('downloading');
      setProgress(5);
      setUpdateInfo({
        version: info?.version || 'Nueva versión',
        releaseNotes: info?.releaseNotes || 'Mejoras y nuevas funcionalidades.',
        releaseDate: info?.releaseDate || new Date().toISOString()
      });
    });

    // Progreso de descarga
    const unsubProgress = window.electronAPI.updater.onDownloadProgress?.((data) => {
      setStatus('downloading');
      if (typeof data?.percent === 'number') {
        setProgress(Math.round(data.percent));
      }
    });

    // Descarga completada -> Listo para reiniciar
    const unsubDownloaded = window.electronAPI.updater.onUpdateDownloaded?.((info) => {
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

    // Error
    const unsubError = window.electronAPI.updater.onUpdateError?.((err) => {
      console.warn('[useAppUpdater] Error recibido:', err);
      setErrorMessage(err?.message || 'Error en la actualización');
      // Si falla la descarga, volver a reposo después de unos segundos
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

  // Handler para reiniciar y aplicar la actualización
  const handleRestartAndApply = useCallback(async () => {
    if (window.electronAPI?.updater?.restartAndApply) {
      await window.electronAPI.updater.restartAndApply();
    }
  }, []);

  // Handler para buscar actualizaciones manualmente
  const handleCheckForUpdates = useCallback(async () => {
    setStatus('checking');
    if (window.electronAPI?.updater?.checkForUpdates) {
      await window.electronAPI.updater.checkForUpdates();
    }
  }, []);

  // Simulador para pruebas rápidas de interfaz (Debug / Dev)
  const handleSimulateUpdate = useCallback((targetVer = '2.4.0') => {
    if (window.electronAPI?.updater?.simulateFlow) {
      window.electronAPI.updater.simulateFlow({ targetVersion: targetVer });
    } else {
      // Simulación local en React si no corre en Electron
      setStatus('downloading');
      setProgress(10);
      setUpdateInfo({
        version: targetVer,
        releaseNotes: '⚡ Mayor velocidad en servidores locales.\n🛡️ Nuevo sistema de túneles públicos.\n📊 Monitoreo de memoria RAM y CPU en tiempo real.\n🎨 Interfaz pulida con animaciones fluidas.'
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
    setShowPostUpdateBanner
  };
}
