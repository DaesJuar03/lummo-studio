import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Download, Loader2 } from 'lucide-react';

export default function ServicesTab({
  envStatus,
  onScanEnv,
  isScanning,
  theme,
  t,
  language = 'es'
}) {
  const isDark = theme === 'dark';
  const [selectedTechs, setSelectedTechs] = useState(new Set());
  const [isInstallingTechs, setIsInstallingTechs] = useState(false);
  const [installProgressMap, setInstallProgressMap] = useState({});

  useEffect(() => {
    if (envStatus) {
      const missingKeys = ['node', 'php', 'mysql', 'postgres', 'python', 'git'].filter(
        k => !envStatus[k]?.installed
      );
      setSelectedTechs(new Set(missingKeys));
    }
  }, [envStatus]);

  useEffect(() => {
    if (window.electronAPI?.onTechInstallProgress) {
      const unsubscribe = window.electronAPI.onTechInstallProgress((data) => {
        setInstallProgressMap(prev => ({
          ...prev,
          [data.techKey]: data
        }));
      });
      return () => unsubscribe();
    }
  }, []);

  const handleToggleTechSelect = (key) => {
    setSelectedTechs(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleStartInstallation = async () => {
    if (selectedTechs.size === 0 || !window.electronAPI?.downloadAndInstallTech) return;
    setIsInstallingTechs(true);

    const keysToInstall = Array.from(selectedTechs);
    try {
      await window.electronAPI.downloadAndInstallTech(keysToInstall);
      if (onScanEnv) await onScanEnv();
    } catch (err) {
      console.error('Error al instalar desde Settings:', err);
    } finally {
      setIsInstallingTechs(false);
      if (onScanEnv) onScanEnv();
    }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }} className="space-y-6">
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-3 ${isDark ? 'border-white/[0.08]' : 'border-slate-100'}`}>
        <div>
          <h4 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.systemServices}</h4>
          <p className="text-xs text-slate-400">{t.diagnosticsDesc || 'Diagnostics of local executables and engines detected on your machine'}</p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {onScanEnv && (
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={onScanEnv}
              disabled={isScanning || isInstallingTechs}
              className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 whitespace-nowrap shrink-0 transition-all cursor-pointer disabled:opacity-50 ${
                isDark ? 'bg-[#252525] border-white/[0.08] text-slate-200 hover:bg-[#303030]' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <RefreshCw className={`h-4 w-4 shrink-0 ${isScanning ? 'animate-spin' : ''}`} />
              <span className="whitespace-nowrap">{isScanning ? (language === 'es' ? 'Escaneando...' : 'Scanning...') : (t.rescanShort || t.rescan || 'Rescan')}</span>
            </motion.button>
          )}

          {selectedTechs.size > 0 && (
            <button
              onClick={handleStartInstallation}
              disabled={isInstallingTechs}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 whitespace-nowrap shrink-0 shadow-md shadow-blue-600/20 hover:shadow-[0_0_15px_rgba(37,99,235,0.35)] transition-all disabled:opacity-50 cursor-pointer"
            >
              {isInstallingTechs ? (
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              ) : (
                <Download className="h-4 w-4 shrink-0" />
              )}
              <span className="whitespace-nowrap">
                {isInstallingTechs 
                  ? (language === 'es' ? 'Instalando...' : 'Installing...') 
                  : `${t.downloadAndInstall || 'Download & Install'} (${selectedTechs.size})`}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Installation Progress Bar Monitor */}
      {(isInstallingTechs || Object.keys(installProgressMap).length > 0) && (
        <div className={`p-4 rounded-2xl border space-y-3 ${
          isDark ? 'bg-[#151518] border-blue-500/30' : 'bg-slate-50 border-blue-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Loader2 className={`h-4 w-4 text-blue-500 ${isInstallingTechs ? 'animate-spin' : ''}`} />
              <h4 className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {language === 'es' ? 'Progreso de Instalación en el Sistema' : 'System Installation Progress'}
              </h4>
            </div>
            <span className="text-[10px] font-mono font-bold text-blue-400">
              {isInstallingTechs ? (language === 'es' ? 'Instalando...' : 'Installing...') : (language === 'es' ? 'Completado' : 'Completed')}
            </span>
          </div>

          <div className="space-y-2">
            {Array.from(selectedTechs).map((techKey) => {
              const progressData = installProgressMap[techKey] || {};
              const stage = progressData.stage || 'waiting';
              const percent = progressData.percent || 0;

              return (
                <div key={techKey} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className={`font-bold uppercase ${isDark ? 'text-white' : 'text-slate-800'}`}>
                      {progressData.name || techKey}
                    </span>
                    <span className="text-slate-400">
                      {progressData.message || (stage === 'waiting' ? (language === 'es' ? 'En cola...' : 'Queued...') : `${percent}%`)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-700/30 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        stage === 'completed' 
                          ? 'bg-emerald-500' 
                          : stage === 'error' 
                            ? 'bg-rose-500' 
                            : 'bg-blue-500'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {[
          { name: 'Node.js', key: 'node' },
          { name: 'PHP Engine', key: 'php' },
          { name: 'MySQL', key: 'mysql' },
          { name: 'PostgreSQL', key: 'postgres' },
          { name: 'Python', key: 'python' },
          { name: 'Git for Windows', key: 'git' },
          { name: 'Docker', key: 'docker' },
          { name: t.nativeSqlite || 'Native SQLite', key: 'sqlite' }
        ].map((srv) => {
          const status = envStatus ? envStatus[srv.key] : null;
          const isInstalled = status?.installed;
          const isChecked = selectedTechs.has(srv.key);
          const isInternal = srv.key === 'sqlite' || srv.key === 'docker';

          return (
            <div 
              key={srv.key} 
              onClick={() => !isInstalled && !isInternal && handleToggleTechSelect(srv.key)}
              className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                !isInstalled && !isInternal ? 'cursor-pointer hover:border-blue-500/50' : ''
              } ${
                isChecked && !isInstalled
                  ? isDark ? 'bg-blue-500/10 border-blue-500/50' : 'bg-blue-50 border-blue-200'
                  : isDark ? 'bg-[#1E1E1E] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center space-x-3">
                {!isInstalled && !isInternal && (
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleTechSelect(srv.key)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded border-slate-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                )}
                <div>
                  <span className={`block font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>{srv.name}</span>
                  <span className="block text-[11px] font-mono text-slate-400">{status?.version || (isInstalled ? (t.installed || 'Installed') : (t.notInstalled || 'Not installed'))}</span>
                </div>
              </div>
              <span className={`w-2.5 h-2.5 rounded-full ${isInstalled ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-amber-400'}`}></span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
