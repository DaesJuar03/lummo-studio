import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings as SettingsIcon, Cpu, Hash, Code, Sliders, RefreshCw, Sun, Moon, Languages, Check, Download, CheckSquare, Loader2, ChevronDown, Trash2 } from 'lucide-react';
import { availableLocales, getTranslations } from '../../locales';

export default function SettingsModal({ 
  onClose, 
  envStatus, 
  onScanEnv, 
  isScanning, 
  theme, 
  onToggleTheme,
  language = 'es',
  onSelectLanguage,
  onClearAllLogs
}) {
  const [activeCategory, setActiveCategory] = useState('services');
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return localStorage.getItem('lummo-notifications') !== 'false';
  });
  const [clearedLogsNotice, setClearedLogsNotice] = useState(false);

  const [selectedTechs, setSelectedTechs] = useState(new Set());
  const [isInstallingTechs, setIsInstallingTechs] = useState(false);
  const [installProgressMap, setInstallProgressMap] = useState({});

  React.useEffect(() => {
    if (envStatus) {
      const missingKeys = ['node', 'php', 'mysql', 'postgres', 'python', 'git'].filter(
        k => !envStatus[k]?.installed
      );
      setSelectedTechs(new Set(missingKeys));
    }
  }, [envStatus]);

  React.useEffect(() => {
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

  const [detectedEditors, setDetectedEditors] = useState([]);
  const [isScanningEditors, setIsScanningEditors] = useState(false);
  const [selectedEditorCmd, setSelectedEditorCmd] = useState(() => {
    return localStorage.getItem('lummo-preferred-editor') || 'code';
  });

  const handleScanEditors = async () => {
    if (window.electronAPI?.detectEditors) {
      setIsScanningEditors(true);
      const editors = await window.electronAPI.detectEditors();
      setDetectedEditors(editors || []);
      setIsScanningEditors(false);
    }
  };

  React.useEffect(() => {
    if (activeCategory === 'editor') {
      handleScanEditors();
    }
  }, [activeCategory]);

  const handleClearLogsAction = () => {
    if (onClearAllLogs) onClearAllLogs();
    setClearedLogsNotice(true);
    setTimeout(() => setClearedLogsNotice(false), 2500);
  };

  const t = getTranslations(language);

  const categories = [
    { id: 'services', label: t.systemServices, icon: Cpu },
    { id: 'ports', label: t.defaultPorts, icon: Hash },
    { id: 'editor', label: t.codeEditorTab, icon: Code },
    { id: 'general', label: t.generalTab, icon: Sliders },
  ];

  const isDark = theme === 'dark';

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none"
        onClick={onClose}
      >
        {/* Modal Container */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-4xl h-[680px] max-h-[90vh] rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${
            isDark ? 'bg-[#14161c] border-[#232631] text-[#e6e8ec]' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          
          {/* Modal Header */}
          <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
            isDark ? 'bg-[#181a20] border-[#232631]' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <SettingsIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className={`font-extrabold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.settingsTitle}</h3>
                <p className="text-xs text-slate-500">{t.settingsDesc}</p>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors ${
                isDark ? 'text-[#8a8f9e] hover:text-white hover:bg-[#1d202a]' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
              }`}
            >
              <X className="h-5 w-5" />
            </motion.button>
          </div>

          {/* Modal Content */}
          <div className="flex-1 flex overflow-hidden">
            
            {/* Left Sidebar Categories */}
            <div className={`w-64 border-r p-4 space-y-1 shrink-0 ${
              isDark ? 'bg-[#0d0e11] border-[#232631]' : 'bg-slate-50/80 border-slate-200'
            }`}>
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left ${
                      isActive
                        ? isDark 
                          ? 'bg-[#1f222e] border border-[#2c3040] text-white shadow-xs' 
                          : 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                        : isDark
                          ? 'text-[#8a8f9e] hover:bg-[#1a1c24] hover:text-white'
                          : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? (isDark ? 'text-blue-400' : 'text-white') : 'text-slate-400'}`} />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Right Category Details View */}
            <div className={`flex-1 p-6 overflow-y-auto space-y-6 ${isDark ? 'bg-[#14161c]' : 'bg-white'}`}>
              
              {/* Category 1: Servicios del Sistema */}
              {activeCategory === 'services' && (
                <motion.div initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }} className="space-y-6">
                  <div className={`flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-3 ${isDark ? 'border-[#2a2a2a]' : 'border-slate-100'}`}>
                    <div>
                      <h4 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.systemServices}</h4>
                      <p className="text-xs text-slate-500">Diagnóstico de ejecutables y motores locales detectados en tu equipo</p>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      {onScanEnv && (
                        <motion.button
                          whileTap={{ scale: 0.94 }}
                          onClick={onScanEnv}
                          disabled={isScanning || isInstallingTechs}
                          className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 whitespace-nowrap shrink-0 transition-all disabled:opacity-50 ${
                            isDark ? 'bg-[#222] border-[#333] text-slate-200 hover:bg-[#2c2c2c]' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          <RefreshCw className={`h-4 w-4 shrink-0 ${isScanning ? 'animate-spin' : ''}`} />
                          <span className="whitespace-nowrap">{isScanning ? 'Escaneando...' : 'Re-Escanear'}</span>
                        </motion.button>
                      )}

                      {selectedTechs.size > 0 && (
                        <button
                          onClick={handleStartInstallation}
                          disabled={isInstallingTechs}
                          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 whitespace-nowrap shrink-0 shadow-md shadow-blue-600/20 transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {isInstallingTechs ? (
                            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                          ) : (
                            <Download className="h-4 w-4 shrink-0" />
                          )}
                          <span className="whitespace-nowrap">
                            {isInstallingTechs 
                              ? 'Instalando...' 
                              : `Descargar e Instalar (${selectedTechs.size})`}
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
                            Progreso de Instalación en el Sistema
                          </h4>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-blue-400">
                          {isInstallingTechs ? 'Instalando...' : 'Completado'}
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
                                  {progressData.message || (stage === 'waiting' ? 'En cola...' : `${percent}%`)}
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
                      { name: 'SQLite Nativo', key: 'sqlite' }
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
                              : isDark ? 'bg-[#181818] border-[#2a2a2a]' : 'bg-slate-50 border-slate-200'
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
                              <span className="block text-[11px] font-mono text-slate-500">{status?.version || (isInstalled ? 'Instalado' : 'No instalado')}</span>
                            </div>
                          </div>
                          <span className={`w-2.5 h-2.5 rounded-full ${isInstalled ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Category 2: Puertos por Defecto */}
              {activeCategory === 'ports' && (
                <motion.div initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }} className="space-y-6">
                  <div className={`border-b pb-4 ${isDark ? 'border-[#2a2a2a]' : 'border-slate-100'}`}>
                    <h4 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.defaultPorts}</h4>
                    <p className="text-xs text-slate-500">Mapeo predeterminado de puertos para evitar conflictos en local</p>
                  </div>

                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200/50">
                      <span>Vite / React Dev Server</span>
                      <span className="font-bold text-blue-500">:5173</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200/50">
                      <span>Next.js App Router</span>
                      <span className="font-bold text-blue-500">:3000</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200/50">
                      <span>Express / Node API</span>
                      <span className="font-bold text-blue-500">:8080</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200/50">
                      <span>PHP Artisan Serve</span>
                      <span className="font-bold text-blue-500">:8000</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Category 3: Editor de Código */}
              {activeCategory === 'editor' && (
                <motion.div initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }} className="space-y-3.5">
                  <div className={`border-b pb-2 flex items-center justify-between ${isDark ? 'border-[#2a2a2a]' : 'border-slate-100'}`}>
                    <div>
                      <h4 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.codeEditorTab}</h4>
                      <p className="text-xs text-slate-500">Selecciona el editor o IDE para abrir tus proyectos</p>
                    </div>

                    <button
                      type="button"
                      onClick={handleScanEditors}
                      disabled={isScanningEditors}
                      className={`px-3 py-1.5 rounded-xl border flex items-center space-x-1.5 text-xs font-bold transition-all shadow-2xs ${
                        isDark ? 'bg-[#242424] border-[#333333] text-slate-200 hover:bg-[#2c2c2c]' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isScanningEditors ? 'animate-spin text-blue-500' : 'text-slate-400'}`} />
                      <span>{isScanningEditors ? 'Escaneando...' : 'Re-escanear'}</span>
                    </button>
                  </div>

                  {/* Enterprise Dropdown Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase font-mono tracking-wider block">
                      Editor Predeterminado Seleccionado:
                    </label>
                    <select
                      value={selectedEditorCmd}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedEditorCmd(val);
                        localStorage.setItem('lummo-preferred-editor', val);
                      }}
                      className={`w-full p-3.5 rounded-2xl border text-xs font-bold font-mono focus:outline-none transition-all cursor-pointer shadow-2xs ${
                        isDark 
                          ? 'bg-[#181818] border-[#2e2e2e] text-white focus:border-blue-500' 
                          : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600'
                      }`}
                    >
                      {(detectedEditors || []).filter(e => e?.installed).length > 0 && (
                        <optgroup label="Editores Instalados en el Sistema">
                          {(detectedEditors || []).filter(e => e?.installed).map((ed) => (
                            <option key={ed.id} value={ed.cmd}>
                              {ed.name} ({ed.cmd})
                            </option>
                          ))}
                        </optgroup>
                      )}

                      {(detectedEditors || []).filter(e => e && !e.installed).length > 0 && (
                        <optgroup label="Otros Editores e IDEs (No detectados en PATH)">
                          {(detectedEditors || []).filter(e => e && !e.installed).map((ed) => (
                            <option key={ed.id} value={ed.cmd}>
                              {ed.name} ({ed.cmd})
                            </option>
                          ))}
                        </optgroup>
                      )}

                      {(!detectedEditors || detectedEditors.length === 0) && (
                        <>
                          <option value="code">Visual Studio Code (code)</option>
                          <option value="cursor">Cursor AI Editor (cursor)</option>
                          <option value="windsurf">Windsurf IDE (windsurf)</option>
                          <option value="subl">Sublime Text (subl)</option>
                          <option value="webstorm">JetBrains WebStorm (webstorm)</option>
                          <option value="phpstorm">JetBrains PhpStorm (phpstorm)</option>
                          <option value="explorer">Explorador de Archivos (explorer)</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Grid List of Detected System Editors */}
                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-bold text-slate-500 uppercase font-mono tracking-wider block">
                      Catálogo de Editores e IDEs Compatibles:
                    </label>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
                      {(detectedEditors || []).map((ed) => {
                        const isSelected = selectedEditorCmd === ed.cmd;
                        return (
                          <button
                            key={ed.id}
                            type="button"
                            onClick={() => {
                              setSelectedEditorCmd(ed.cmd);
                              localStorage.setItem('lummo-preferred-editor', ed.cmd);
                            }}
                            className={`p-3.5 rounded-2xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                              isSelected
                                ? isDark
                                  ? 'bg-[#2b2b2b] border-blue-500/60 ring-1 ring-blue-500 text-white'
                                  : 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-100 text-blue-900 font-bold'
                                : isDark
                                  ? 'bg-[#181818] border-[#2e2e2e] text-slate-400 hover:text-white hover:bg-[#222222]'
                                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-xs">{ed.name}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-bold uppercase tracking-tight ${
                                  ed.installed 
                                    ? isDark
                                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                                }`}>
                                  {ed.installed ? 'Disponible' : 'No en PATH'}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 font-mono font-semibold">{ed.cmd}</p>
                            </div>

                            {isSelected && (
                              <Check className="h-4 w-4 text-blue-500 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </motion.div>
              )}

              {/* Category 4: General */}
              {activeCategory === 'general' && (
                <motion.div initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }} className="space-y-6">
                  <div className={`border-b pb-4 ${isDark ? 'border-[#2a2a2a]' : 'border-slate-100'}`}>
                    <h4 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.generalTab}</h4>
                    <p className="text-xs text-slate-500">Ajustes globales de idioma y apariencia visual</p>
                  </div>

                  {/* Language and Theme Selectors sharing the SAME ROW */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Column 1: Language Select */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase font-mono tracking-wider flex items-center gap-1.5">
                        <Languages className="h-4 w-4 text-blue-500" />
                        <span>{t.languageSection}</span>
                      </label>
                      <div className="relative">
                        <select
                          value={language}
                          onChange={(e) => onSelectLanguage && onSelectLanguage(e.target.value)}
                          className={`w-full px-3.5 py-2.5 rounded-2xl border text-xs font-bold outline-none cursor-pointer appearance-none transition-all ${
                            isDark 
                              ? 'bg-[#181a22] border-[#2a2f40] text-white hover:border-blue-500/50 focus:border-blue-500' 
                              : 'bg-slate-50 border-slate-200 text-slate-900 hover:border-slate-300 focus:border-blue-500'
                          }`}
                        >
                          {availableLocales.map((loc) => (
                            <option key={loc.code} value={loc.code} className={isDark ? 'bg-[#181a22] text-white' : 'bg-white text-slate-900'}>
                              {loc.name} ({loc.badge})
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                          <ChevronDown className="h-4 w-4" />
                        </div>
                      </div>
                    </div>

                    {/* Column 2: Theme Select */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase font-mono tracking-wider flex items-center gap-1.5">
                        {isDark ? <Moon className="h-4 w-4 text-blue-400" /> : <Sun className="h-4 w-4 text-amber-500" />}
                        <span>{t.themeSection}</span>
                      </label>
                      <div className="relative">
                        <select
                          value={theme}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val !== theme) onToggleTheme();
                          }}
                          className={`w-full px-3.5 py-2.5 rounded-2xl border text-xs font-bold outline-none cursor-pointer appearance-none transition-all ${
                            isDark 
                              ? 'bg-[#181a22] border-[#2a2f40] text-white hover:border-blue-500/50 focus:border-blue-500' 
                              : 'bg-slate-50 border-slate-200 text-slate-900 hover:border-slate-300 focus:border-blue-500'
                          }`}
                        >
                          <option value="light" className={isDark ? 'bg-[#181a22] text-white' : 'bg-white text-slate-900'}>
                            ☀️ {t.lightMode}
                          </option>
                          <option value="dark" className={isDark ? 'bg-[#181a22] text-white' : 'bg-white text-slate-900'}>
                            🌙 {t.darkMode}
                          </option>
                        </select>
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                          <ChevronDown className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* System Notifications & Logs Memory Management */}
                  <div className="space-y-2.5 pt-4 border-t border-slate-200/40">
                    <div className="flex items-center justify-between p-3 rounded-2xl border bg-slate-500/5 border-slate-200/50">
                      <div>
                        <span className="block text-xs font-bold">Notificaciones Nativas de Windows</span>
                        <span className="block text-[11px] text-slate-500">Recibe alertas del sistema cuando tus servidores se inicien, fallen o finalicen.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const next = !notificationsEnabled;
                          setNotificationsEnabled(next);
                          localStorage.setItem('lummo-notifications', String(next));
                          if (next && window.electronAPI?.sendNotification) {
                            window.electronAPI.sendNotification('Lummo Studio', 'Notificaciones del sistema activadas correctamente 🔔');
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                          notificationsEnabled
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-300 text-slate-700'
                        }`}
                      >
                        {notificationsEnabled ? 'ACTIVADAS' : 'DESACTIVADAS'}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-2xl border bg-rose-500/5 border-rose-500/20">
                      <div>
                        <span className="block text-xs font-bold text-rose-500">Memoria de Logs de Servidores</span>
                        <span className="block text-[11px] text-slate-500">Libera memoria RAM borrando el historial de texto acumulado en las consolas.</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearLogsAction}
                        className={`p-2.5 rounded-xl transition-all flex items-center justify-center cursor-pointer shadow-xs ${
                          clearedLogsNotice
                            ? 'bg-emerald-600 text-white'
                            : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                        }`}
                        title={clearedLogsNotice ? '¡Logs Limpiados!' : 'Limpiar Todo los Logs'}
                      >
                        {clearedLogsNotice ? <Check className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                </motion.div>
              )}

            </div>

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
