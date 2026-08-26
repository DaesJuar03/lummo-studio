import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Settings as SettingsIcon, 
  Cpu, 
  Hash, 
  Code, 
  Sliders, 
  RefreshCw, 
  Sun, 
  Moon, 
  Languages, 
  Check, 
  Download, 
  CheckSquare, 
  Square,
  Loader2, 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  FolderKanban, 
  FolderOpen, 
  Archive, 
  Search,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Key,
  Copy,
  ExternalLink,
  Globe,
  Shield
} from 'lucide-react';
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
  onClearAllLogs,
  projects = [],
  onSaveProjects,
  onRemoveProject,
  onOpenFolder
}) {
  const [activeCategory, setActiveCategory] = useState('services');
  const [sslStatus, setSslStatus] = useState(null);
  const [isInstallingCa, setIsInstallingCa] = useState(false);
  const [sslNotice, setSslNotice] = useState('');
  const [copiedCaPath, setCopiedCaPath] = useState(false);

  const loadSslStatus = async () => {
    if (window.electronAPI?.ssl?.getStatus) {
      const status = await window.electronAPI.ssl.getStatus();
      setSslStatus(status);
    }
  };

  const handleInstallCa = async () => {
    if (!window.electronAPI?.ssl?.installCa) return;
    setIsInstallingCa(true);
    const res = await window.electronAPI.ssl.installCa();
    setIsInstallingCa(false);
    if (res.success) {
      setSslNotice('¡Certificado Raíz de Lummo instalado con éxito en Windows!');
      loadSslStatus();
    } else {
      setSslNotice(`Error: ${res.error}`);
    }
    setTimeout(() => setSslNotice(''), 4500);
  };

  const handleUninstallCa = async () => {
    if (!window.electronAPI?.ssl?.uninstallCa) return;
    setIsInstallingCa(true);
    const res = await window.electronAPI.ssl.uninstallCa();
    setIsInstallingCa(false);
    if (res.success) {
      setSslNotice('CA Raíz de Lummo desinstalada de Windows.');
      loadSslStatus();
    } else {
      setSslNotice(`Error: ${res.error}`);
    }
    setTimeout(() => setSslNotice(''), 4500);
  };

  const handleCopyCaPath = (pathStr) => {
    if (navigator.clipboard && pathStr) {
      navigator.clipboard.writeText(pathStr);
      setCopiedCaPath(true);
      setTimeout(() => setCopiedCaPath(false), 2000);
    }
  };
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return localStorage.getItem('lummo-notifications') !== 'false';
  });
  const [clearedLogsNotice, setClearedLogsNotice] = useState(false);

  // Projects Manager State
  const [projectsFilter, setProjectsFilter] = useState('active'); // 'active' | 'archived' | 'all'
  const [projectSearch, setProjectSearch] = useState('');
  const [selectedProjectIds, setSelectedProjectIds] = useState(new Set());
  const [projectNotice, setProjectNotice] = useState('');

  const showProjectNotice = (msg) => {
    setProjectNotice(msg);
    setTimeout(() => setProjectNotice(''), 3000);
  };

  const activeProjects = (projects || []).filter(p => !p.isArchived);
  const archivedProjects = (projects || []).filter(p => p.isArchived);

  const filteredProjectsList = (projects || []).filter(p => {
    if (projectsFilter === 'active' && p.isArchived) return false;
    if (projectsFilter === 'archived' && !p.isArchived) return false;
    if (!projectSearch.trim()) return true;
    const q = projectSearch.toLowerCase();
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.path || '').toLowerCase().includes(q) ||
      (p.type || '').toLowerCase().includes(q)
    );
  });

  const handleToggleSelect = (id) => {
    setSelectedProjectIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    const allIds = new Set(filteredProjectsList.map(p => p.id || p.path));
    setSelectedProjectIds(allIds);
  };

  const handleDeselectAll = () => {
    setSelectedProjectIds(new Set());
  };

  const handleArchiveSelected = (archive = true) => {
    const updated = (projects || []).map(p => {
      const pId = p.id || p.path;
      if (selectedProjectIds.has(pId)) {
        return { ...p, isArchived: archive };
      }
      return p;
    });
    if (onSaveProjects) onSaveProjects(updated);
    const count = selectedProjectIds.size;
    setSelectedProjectIds(new Set());
    showProjectNotice(archive ? `¡${count} proyecto(s) archivado(s)!` : `¡${count} proyecto(s) restaurado(s)!`);
  };

  const handleDeleteSelected = () => {
    const count = selectedProjectIds.size;
    const updated = (projects || []).filter(p => !selectedProjectIds.has(p.id || p.path));
    if (onSaveProjects) onSaveProjects(updated);
    setSelectedProjectIds(new Set());
    showProjectNotice(`¡${count} proyecto(s) eliminado(s)!`);
  };

  const handleToggleArchiveSingle = (project, archive) => {
    const updated = (projects || []).map(p => {
      if ((p.id && p.id === project.id) || p.path === project.path) {
        return { ...p, isArchived: archive };
      }
      return p;
    });
    if (onSaveProjects) onSaveProjects(updated);
    showProjectNotice(archive ? `"${project.name}" archivado.` : `"${project.name}" restaurado.`);
  };

  const handleDeleteSingle = (project) => {
    const pId = project.id || project.path;
    if (onRemoveProject) {
      onRemoveProject(pId);
    } else {
      const updated = (projects || []).filter(p => (p.id ? p.id !== project.id : p.path !== project.path));
      if (onSaveProjects) onSaveProjects(updated);
    }
    showProjectNotice(`"${project.name}" eliminado.`);
  };

  const handleMoveProject = (currentIndex, direction) => {
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= (projects || []).length) return;
    const copy = [...(projects || [])];
    const [moved] = copy.splice(currentIndex, 1);
    copy.splice(targetIndex, 0, moved);
    if (onSaveProjects) onSaveProjects(copy);
  };

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
    if (activeCategory === 'ssl') {
      loadSslStatus();
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
    { 
      id: 'projects', 
      label: t.projectsManagerTab || 'Gestión de Proyectos', 
      icon: FolderKanban, 
      badge: archivedProjects.length > 0 ? `${archivedProjects.length}` : null 
    },
    { id: 'ssl', label: t.sslTab || 'Certificados SSL & HTTPS', icon: ShieldCheck },
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
          className={`w-full max-w-5xl lg:max-w-6xl h-[720px] max-h-[92vh] rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${
            isDark ? 'bg-[#0D0E15] border-white/[0.08] text-[#F3F4F6]' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          
          {/* Modal Header */}
          <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
            isDark ? 'bg-[#090A0F] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/20">
                <SettingsIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className={`font-extrabold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.settingsTitle}</h3>
                <p className="text-xs text-slate-400">{t.settingsDesc}</p>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-[#1E2235]' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
              }`}
            >
              <X className="h-5 w-5" />
            </motion.button>
          </div>

          {/* Modal Content */}
          <div className="flex-1 flex overflow-hidden">
            
            {/* Left Sidebar Categories */}
            <div className={`w-64 border-r p-4 space-y-1 shrink-0 ${
              isDark ? 'bg-[#090A0F] border-white/[0.08]' : 'bg-slate-50/80 border-slate-200'
            }`}>
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left cursor-pointer ${
                      isActive
                        ? isDark 
                          ? 'bg-[#181B28] border border-white/[0.08] text-white shadow-[0_0_12px_rgba(59,130,246,0.15)]' 
                          : 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                        : isDark
                          ? 'text-slate-400 hover:bg-[#12141F] hover:text-white'
                          : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`h-4 w-4 ${isActive ? (isDark ? 'text-blue-400' : 'text-white') : 'text-slate-400'}`} />
                      <span>{cat.label}</span>
                    </div>
                    {cat.badge && (
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                        isActive 
                          ? isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-white/20 text-white' 
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {cat.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right Category Details View */}
            <div className={`flex-1 p-6 overflow-y-auto space-y-6 ${isDark ? 'bg-[#0D0E15]' : 'bg-white'}`}>
              
              {/* Category 1: Servicios del Sistema */}
              {activeCategory === 'services' && (
                <motion.div initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }} className="space-y-6">
                  <div className={`flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-3 ${isDark ? 'border-white/[0.08]' : 'border-slate-100'}`}>
                    <div>
                      <h4 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.systemServices}</h4>
                      <p className="text-xs text-slate-400">Diagnóstico de ejecutables y motores locales detectados en tu equipo</p>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      {onScanEnv && (
                        <motion.button
                          whileTap={{ scale: 0.94 }}
                          onClick={onScanEnv}
                          disabled={isScanning || isInstallingTechs}
                          className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 whitespace-nowrap shrink-0 transition-all cursor-pointer disabled:opacity-50 ${
                            isDark ? 'bg-[#181B28] border-white/[0.08] text-slate-200 hover:bg-[#1E2235]' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
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
                          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 whitespace-nowrap shrink-0 shadow-md shadow-blue-600/20 hover:shadow-[0_0_15px_rgba(37,99,235,0.35)] transition-all disabled:opacity-50 cursor-pointer"
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
                              : isDark ? 'bg-[#12141F] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
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
                              <span className="block text-[11px] font-mono text-slate-400">{status?.version || (isInstalled ? 'Instalado' : 'No instalado')}</span>
                            </div>
                          </div>
                          <span className={`w-2.5 h-2.5 rounded-full ${isInstalled ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-amber-400'}`}></span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Category 2: Puertos por Defecto */}
              {activeCategory === 'ports' && (
                <motion.div initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }} className="space-y-6">
                  <div className={`border-b pb-4 ${isDark ? 'border-white/[0.08]' : 'border-slate-100'}`}>
                    <h4 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.defaultPorts}</h4>
                    <p className="text-xs text-slate-400">Mapeo predeterminado de puertos para evitar conflictos en local</p>
                  </div>

                  <div className="space-y-3 font-mono text-xs">
                    <div className={`flex items-center justify-between p-3.5 rounded-xl border ${
                      isDark ? 'bg-[#12141F] border-white/[0.08] text-[#F3F4F6]' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <span>Vite / React Dev Server</span>
                      <span className="font-bold text-blue-400">:5173</span>
                    </div>
                    <div className={`flex items-center justify-between p-3.5 rounded-xl border ${
                      isDark ? 'bg-[#12141F] border-white/[0.08] text-[#F3F4F6]' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <span>Next.js App Router</span>
                      <span className="font-bold text-blue-400">:3000</span>
                    </div>
                    <div className={`flex items-center justify-between p-3.5 rounded-xl border ${
                      isDark ? 'bg-[#12141F] border-white/[0.08] text-[#F3F4F6]' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <span>Express / Node API</span>
                      <span className="font-bold text-blue-400">:8080</span>
                    </div>
                    <div className={`flex items-center justify-between p-3.5 rounded-xl border ${
                      isDark ? 'bg-[#12141F] border-white/[0.08] text-[#F3F4F6]' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <span>PHP Artisan Serve</span>
                      <span className="font-bold text-blue-400">:8000</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Category 3: Editor de Código */}
              {activeCategory === 'editor' && (
                <motion.div initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }} className="space-y-3.5">
                  <div className={`border-b pb-2 flex items-center justify-between ${isDark ? 'border-white/[0.08]' : 'border-slate-100'}`}>
                    <div>
                      <h4 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.codeEditorTab}</h4>
                      <p className="text-xs text-slate-400">Selecciona el editor o IDE para abrir tus proyectos</p>
                    </div>

                    <button
                      type="button"
                      onClick={handleScanEditors}
                      disabled={isScanningEditors}
                      className={`px-3 py-1.5 rounded-xl border flex items-center space-x-1.5 text-xs font-bold transition-all cursor-pointer ${
                        isDark ? 'bg-[#181B28] border-white/[0.08] text-slate-200 hover:bg-[#1E2235]' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isScanningEditors ? 'animate-spin text-blue-400' : 'text-slate-400'}`} />
                      <span>{isScanningEditors ? 'Escaneando...' : 'Re-escanear'}</span>
                    </button>
                  </div>

                  {/* Enterprise Dropdown Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider block">
                      Editor Predeterminado Seleccionado:
                    </label>
                    <select
                      value={selectedEditorCmd}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedEditorCmd(val);
                        localStorage.setItem('lummo-preferred-editor', val);
                      }}
                      className={`w-full p-3.5 rounded-2xl border text-xs font-bold font-mono focus:outline-none transition-all cursor-pointer ${
                        isDark 
                          ? 'bg-[#12141F] border-white/[0.08] text-white focus:border-blue-500' 
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
                    <label className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider block">
                      Catálogo de Editores e IDEs Compatibles:
                    </label>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-56 overflow-y-auto custom-scrollbar pr-1">
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
                                  ? 'bg-blue-600/15 border-blue-500 ring-1 ring-blue-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.2)]'
                                  : 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-100 text-blue-900 font-bold'
                                : isDark
                                  ? 'bg-[#12141F] border-white/[0.08] text-slate-400 hover:text-white hover:bg-[#1A1D2D]'
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
                              <p className="text-[11px] text-slate-400 font-mono font-semibold">{ed.cmd}</p>
                            </div>

                            {isSelected && (
                              <Check className="h-4 w-4 text-blue-400 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </motion.div>
              )}

              {/* Category: Gestión de Proyectos */}
              {activeCategory === 'projects' && (
                <motion.div initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }} className="space-y-5">
                  
                  {/* Header & Stats */}
                  <div className={`flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-3 ${isDark ? 'border-white/[0.08]' : 'border-slate-100'}`}>
                    <div>
                      <h4 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {t.projectsManagerTab || 'Gestión de Proyectos'}
                      </h4>
                      <p className="text-xs text-slate-400">
                        Organiza el orden de tus proyectos, archiva los inactivos y gestiona selecciones en lote.
                      </p>
                    </div>

                    {/* Quick Stats Pills */}
                    <div className="flex items-center gap-2 text-xs font-mono shrink-0">
                      <span className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 font-bold ${
                        isDark ? 'bg-[#12141F] border-white/[0.08] text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                      }`}>
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span>{activeProjects.length} Activos</span>
                      </span>

                      <span className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 font-bold ${
                        archivedProjects.length > 0
                          ? isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-800'
                          : isDark ? 'bg-[#12141F] border-white/[0.08] text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${archivedProjects.length > 0 ? 'bg-amber-500' : 'bg-slate-400'}`}></span>
                        <span>{archivedProjects.length} Archivados</span>
                      </span>
                    </div>
                  </div>

                  {/* Notification Feedback Toast Banner */}
                  {projectNotice && (
                    <motion.div 
                      initial={{ opacity: 0, y: -4 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      className="p-3 rounded-2xl bg-blue-600/15 border border-blue-500/30 text-blue-400 text-xs font-bold flex items-center space-x-2"
                    >
                      <Check className="h-4 w-4 shrink-0" />
                      <span>{projectNotice}</span>
                    </motion.div>
                  )}

                  {/* Controls Row: Subtabs + Search */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    
                    {/* Subtabs Filter */}
                    <div className={`p-1 rounded-2xl border flex items-center space-x-1 shrink-0 ${
                      isDark ? 'bg-[#090A0F] border-white/[0.08]' : 'bg-slate-100 border-slate-200'
                    }`}>
                      <button
                        type="button"
                        onClick={() => { setProjectsFilter('active'); setSelectedProjectIds(new Set()); }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          projectsFilter === 'active'
                            ? isDark ? 'bg-[#181B28] text-white shadow-xs border border-white/[0.08]' : 'bg-white text-slate-900 shadow-xs'
                            : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span>Activos</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-blue-500/20 text-blue-400 font-mono">
                          {activeProjects.length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => { setProjectsFilter('archived'); setSelectedProjectIds(new Set()); }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          projectsFilter === 'archived'
                            ? isDark ? 'bg-[#181B28] text-white shadow-xs border border-white/[0.08]' : 'bg-white text-slate-900 shadow-xs'
                            : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span>Archivados / Ocultos</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                          archivedProjects.length > 0 
                            ? 'bg-amber-500/20 text-amber-400 font-bold' 
                            : 'bg-slate-500/20 text-slate-400'
                        }`}>
                          {archivedProjects.length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => { setProjectsFilter('all'); setSelectedProjectIds(new Set()); }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          projectsFilter === 'all'
                            ? isDark ? 'bg-[#181B28] text-white shadow-xs border border-white/[0.08]' : 'bg-white text-slate-900 shadow-xs'
                            : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span>Todos</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-500/20 text-slate-400 font-mono">
                          {(projects || []).length}
                        </span>
                      </button>
                    </div>

                    {/* Search Input */}
                    <div className="relative flex-1 max-w-xs">
                      <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Filtrar por nombre o ruta..."
                        value={projectSearch}
                        onChange={(e) => setProjectSearch(e.target.value)}
                        className={`w-full pl-8.5 pr-3 py-1.5 rounded-2xl border text-xs outline-none transition-all ${
                          isDark 
                            ? 'bg-[#12141F] border-white/[0.08] text-white placeholder-slate-500 focus:border-blue-500' 
                            : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500'
                        }`}
                      />
                      {projectSearch && (
                        <button
                          type="button"
                          onClick={() => setProjectSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Multi-selection Toolbar (appears if items exist) */}
                  {filteredProjectsList.length > 0 && (
                    <div className={`p-2.5 rounded-2xl border flex flex-wrap items-center justify-between gap-2 text-xs ${
                      selectedProjectIds.size > 0
                        ? isDark ? 'bg-[#181B28] border-blue-500/40 ring-1 ring-blue-500/20' : 'bg-blue-50/80 border-blue-200'
                        : isDark ? 'bg-[#090A0F] border-white/[0.06]' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedProjectIds.size === filteredProjectsList.length) {
                              handleDeselectAll();
                            } else {
                              handleSelectAll();
                            }
                          }}
                          className={`px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 font-bold ${
                            selectedProjectIds.size === filteredProjectsList.length && filteredProjectsList.length > 0
                              ? 'bg-blue-600 text-white border-blue-500'
                              : isDark ? 'border-white/[0.15] bg-[#12141F] text-slate-300' : 'border-slate-300 bg-white text-slate-700'
                          }`}
                        >
                          {selectedProjectIds.size === filteredProjectsList.length && filteredProjectsList.length > 0 ? (
                            <CheckSquare className="h-4 w-4 text-white" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                          <span>
                            {selectedProjectIds.size > 0 
                              ? `${selectedProjectIds.size} de ${filteredProjectsList.length} seleccionados`
                              : 'Seleccionar todos'}
                          </span>
                        </button>

                        {selectedProjectIds.size > 0 && (
                          <button
                            type="button"
                            onClick={handleDeselectAll}
                            className="text-xs text-slate-400 hover:text-slate-200 underline cursor-pointer"
                          >
                            Deseleccionar
                          </button>
                        )}
                      </div>

                      {/* Bulk Action Buttons */}
                      {selectedProjectIds.size > 0 && (
                        <div className="flex items-center gap-2">
                          {(projectsFilter === 'active' || projectsFilter === 'all') && (
                            <button
                              type="button"
                              onClick={() => handleArchiveSelected(true)}
                              className="px-3 py-1.5 rounded-xl bg-amber-600/15 border border-amber-500/30 hover:bg-amber-600/30 text-amber-400 font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <Archive className="h-3.5 w-3.5" />
                              <span>Archivar ({selectedProjectIds.size})</span>
                            </button>
                          )}

                          {(projectsFilter === 'archived' || projectsFilter === 'all') && (
                            <button
                              type="button"
                              onClick={() => handleArchiveSelected(false)}
                              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>Restaurar ({selectedProjectIds.size})</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={handleDeleteSelected}
                            className="px-3 py-1.5 rounded-xl bg-rose-600/15 border border-rose-500/30 hover:bg-rose-600/30 text-rose-400 font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Eliminar ({selectedProjectIds.size})</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Projects List Container */}
                  <div className="max-h-[320px] overflow-y-auto custom-scrollbar space-y-2.5 pr-1">
                    {filteredProjectsList.length === 0 ? (
                      <div className={`p-10 text-center rounded-3xl border space-y-3 ${
                        isDark ? 'bg-[#12141F] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto border border-blue-500/20">
                          {projectsFilter === 'archived' ? <Archive className="h-6 w-6" /> : <FolderKanban className="h-6 w-6" />}
                        </div>
                        <div className="space-y-1">
                          <h5 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {projectsFilter === 'archived'
                              ? 'No hay proyectos archivados u ocultos'
                              : projectSearch
                              ? 'No se encontraron proyectos con ese criterio'
                              : 'No hay proyectos registrados'}
                          </h5>
                          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                            {projectsFilter === 'archived'
                              ? 'Cuando archives proyectos inactivos para despejar tu panel principal, aparecerán aquí para que puedas recuperarlos con un solo clic.'
                              : 'Importa tus proyectos o crea nuevos para gestionarlos desde este panel.'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      filteredProjectsList.map((project, idx) => {
                        const pId = project.id || project.path;
                        const isSelected = selectedProjectIds.has(pId);
                        const isArchived = Boolean(project.isArchived);

                        // Find global index in master projects array for reordering
                        const masterIndex = (projects || []).findIndex(p => (p.id ? p.id === project.id : p.path === project.path));

                        return (
                          <div
                            key={pId || idx}
                            className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              isSelected
                                ? isDark 
                                  ? 'bg-[#181B28] border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/30' 
                                  : 'bg-blue-50/80 border-blue-400'
                                : isDark 
                                  ? 'bg-[#12141F] border-white/[0.08] hover:border-white/[0.16]' 
                                  : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {/* Left: Checkbox + Reorder Controls + Info */}
                            <div className="flex items-center space-x-3 min-w-0">
                              
                              {/* Checkbox */}
                              <button
                                type="button"
                                onClick={() => handleToggleSelect(pId)}
                                className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                                  isSelected
                                    ? 'bg-blue-600 border-blue-500 text-white'
                                    : isDark ? 'border-white/[0.2] bg-[#090A0F] hover:border-white/[0.4]' : 'border-slate-300 bg-slate-50'
                                }`}
                              >
                                {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                              </button>

                              {/* Reorder Arrows (Move up / down) */}
                              <div className="flex flex-col space-y-0.5 shrink-0">
                                <button
                                  type="button"
                                  disabled={masterIndex <= 0}
                                  onClick={() => handleMoveProject(masterIndex, 'up')}
                                  title="Mover arriba"
                                  className={`p-0.5 rounded transition-colors cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed ${
                                    isDark ? 'text-slate-400 hover:text-white hover:bg-[#1E2235]' : 'text-slate-400 hover:text-slate-700'
                                  }`}
                                >
                                  <ChevronUp className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={masterIndex >= (projects || []).length - 1}
                                  onClick={() => handleMoveProject(masterIndex, 'down')}
                                  title="Mover abajo"
                                  className={`p-0.5 rounded transition-colors cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed ${
                                    isDark ? 'text-slate-400 hover:text-white hover:bg-[#1E2235]' : 'text-slate-400 hover:text-slate-700'
                                  }`}
                                >
                                  <ChevronDown className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              {/* Project Details */}
                              <div className="min-w-0">
                                <div className="flex items-center space-x-2">
                                  <span className={`font-bold text-xs truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    {project.name}
                                  </span>

                                  {isArchived ? (
                                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                      Archivado
                                    </span>
                                  ) : (
                                    project.status === 'RUNNING' && (
                                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                        En Ejecución
                                      </span>
                                    )
                                  )}

                                  {project.port && (
                                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md border ${
                                      isDark ? 'bg-[#090A0F] border-white/[0.08] text-blue-400' : 'bg-slate-100 border-slate-200 text-blue-600'
                                    }`}>
                                      :{project.port}
                                    </span>
                                  )}
                                </div>

                                <p className="text-[11px] text-slate-400 font-mono truncate max-w-sm mt-0.5" title={project.path}>
                                  {project.path}
                                </p>
                              </div>
                            </div>

                            {/* Right: Actions */}
                            <div className="flex items-center space-x-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/[0.06]">
                              
                              {/* Archive / Restore Button */}
                              {isArchived ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleArchiveSingle(project, false)}
                                  className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                                  title="Restaurar y mostrar en panel principal"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  <span>Restaurar</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleToggleArchiveSingle(project, true)}
                                  className="px-2.5 py-1.5 rounded-xl border text-xs font-bold text-amber-400 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20 transition-all flex items-center gap-1 cursor-pointer"
                                  title="Archivar u ocultar del panel principal"
                                >
                                  <Archive className="h-3.5 w-3.5" />
                                  <span>Archivar</span>
                                </button>
                              )}

                              {/* Open Folder in Explorer */}
                              <button
                                type="button"
                                onClick={() => onOpenFolder && onOpenFolder(project.path)}
                                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                                  isDark ? 'border-white/[0.08] bg-[#181B28] text-slate-300 hover:text-white hover:bg-[#1E2235]' : 'border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900'
                                }`}
                                title="Abrir carpeta en el Explorador de Windows"
                              >
                                <FolderOpen className="h-3.5 w-3.5" />
                              </button>

                              {/* Delete Project */}
                              <button
                                type="button"
                                onClick={() => handleDeleteSingle(project)}
                                className="p-2 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition-all cursor-pointer"
                                title="Eliminar de la lista de proyectos"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                </motion.div>
              )}

              {/* Category: SSL & HTTPS Certificates */}
              {activeCategory === 'ssl' && (
                <motion.div initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }} className="space-y-6">
                  <div className={`border-b pb-4 ${isDark ? 'border-white/[0.08]' : 'border-slate-100'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          Certificados SSL & HTTPS Local
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Desarrolla en local con candado verde HTTPS (sin advertencias del navegador) mediante la Autoridad de Certificación de Lummo.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={loadSslStatus}
                        className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                          isDark ? 'border-white/[0.08] bg-[#181B28] text-slate-400 hover:text-white' : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'
                        }`}
                        title="Actualizar estado SSL"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {sslNotice && (
                    <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono font-medium flex items-center justify-between">
                      <span>{sslNotice}</span>
                    </div>
                  )}

                  {/* Main Root CA Status Card */}
                  <div className={`p-5 rounded-3xl border relative overflow-hidden ${
                    sslStatus?.caInstalled
                      ? isDark ? 'bg-emerald-950/15 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'
                      : isDark ? 'bg-[#12141F] border-amber-500/30' : 'bg-amber-50 border-amber-200'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start space-x-3.5">
                        <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${
                          sslStatus?.caInstalled
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                            : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        }`}>
                          {sslStatus?.caInstalled ? (
                            <ShieldCheck className="h-6 w-6" />
                          ) : (
                            <ShieldAlert className="h-6 w-6" />
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <h4 className={`font-extrabold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              Lummo Local Development CA
                            </h4>
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                              sslStatus?.caInstalled
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            }`}>
                              {sslStatus?.caInstalled ? 'CONFIABLE (INSTALADA)' : 'NO INSTALADA'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            {sslStatus?.caInstalled
                              ? 'Tu sistema operativo y navegadores confían en los certificados emitidos por Lummo Studio. No verás pantallas de advertencia.'
                              : 'Instala el certificado raíz en el almacén de Windows para habilitar HTTPS automático y candado verde en todos tus proyectos.'}
                          </p>
                        </div>
                      </div>

                      {/* Action button */}
                      <div className="shrink-0">
                        {sslStatus?.caInstalled ? (
                          <button
                            type="button"
                            onClick={handleUninstallCa}
                            disabled={isInstallingCa}
                            className={`px-4 py-2.5 rounded-xl border text-xs font-bold text-rose-400 border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 transition-all flex items-center gap-1.5 cursor-pointer`}
                          >
                            {isInstallingCa ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            <span>Desinstalar CA</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleInstallCa}
                            disabled={isInstallingCa}
                            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 hover:shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all cursor-pointer"
                          >
                            {isInstallingCa ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                            <span>Instalar CA Raíz (1-Clic)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Technical details grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    
                    {/* HTTPS Port Card */}
                    <div className={`p-4 rounded-2xl border space-y-1.5 ${
                      isDark ? 'bg-[#12141F] border-white/[0.08]' : 'bg-white border-slate-200'
                    }`}>
                      <div className="flex items-center space-x-2 text-xs font-bold text-slate-400">
                        <Lock className="h-4 w-4 text-emerald-400" />
                        <span>Puerto HTTPS Reverse Proxy</span>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className={`text-xl font-extrabold font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          :{sslStatus?.httpsProxyPort || 8443}
                        </span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          SNI Dinámico
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Redirige peticiones SSL transparentemente al puerto de desarrollo de tu servidor.
                      </p>
                    </div>

                    {/* Certs generated count */}
                    <div className={`p-4 rounded-2xl border space-y-1.5 ${
                      isDark ? 'bg-[#12141F] border-white/[0.08]' : 'bg-white border-slate-200'
                    }`}>
                      <div className="flex items-center space-x-2 text-xs font-bold text-slate-400">
                        <Key className="h-4 w-4 text-purple-400" />
                        <span>Certificados de Dominio Emitidos</span>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className={`text-xl font-extrabold font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {sslStatus?.generatedCertCount || 0} Certificados
                        </span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          RSA 2048 / SHA256
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Válidos para *.test, *.local, localhost y dominios asignados.
                      </p>
                    </div>

                  </div>

                  {/* CA Public Cert Path */}
                  {sslStatus?.caCertPath && (
                    <div className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                      isDark ? 'bg-[#12141F] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="min-w-0">
                        <span className="block text-[10px] font-mono font-bold text-slate-400 uppercase">Ubicación del Certificado Público (.crt)</span>
                        <span className="block text-xs font-mono truncate text-slate-300" title={sslStatus.caCertPath}>
                          {sslStatus.caCertPath}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyCaPath(sslStatus.caCertPath)}
                        className={`p-2 rounded-xl border transition-colors cursor-pointer shrink-0 ${
                          isDark ? 'bg-[#181B28] border-white/[0.08] text-slate-300 hover:text-white' : 'bg-white border-slate-200 text-slate-700'
                        }`}
                        title="Copiar ruta"
                      >
                        {copiedCaPath ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  )}

                  {/* Active Registered Local Domains */}
                  <div className="space-y-2.5 pt-2">
                    <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                      Dominios Locales Vinculados ({sslStatus?.domains?.length || 0})
                    </h4>

                    {(!sslStatus?.domains || sslStatus.domains.length === 0) ? (
                      <div className={`p-6 rounded-2xl border text-center space-y-1.5 ${
                        isDark ? 'bg-[#12141F] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <Globe className="h-6 w-6 text-slate-500 mx-auto" />
                        <p className="text-xs text-slate-400">No hay dominios locales vinculados aún.</p>
                        <p className="text-[11px] text-slate-500">
                          Ve a la vista de un proyecto y haz clic en "Red & Acceso Externo" para asignar un dominio .test.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {sslStatus.domains.map((dom) => (
                          <div
                            key={dom.domain}
                            className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              isDark ? 'bg-[#12141F] border-white/[0.08]' : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                                <Lock className="h-4 w-4" />
                              </div>
                              <div>
                                <span className={`text-xs font-bold font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                  {dom.domain}
                                </span>
                                <span className="text-[11px] text-slate-400 font-mono block">
                                  Destino: localhost:{dom.port}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2">
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                HTTPS :8443
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.electronAPI?.openInBrowser) {
                                    window.electronAPI.openInBrowser(dom.httpsUrl);
                                  }
                                }}
                                className="px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                              >
                                <ExternalLink className="h-3 w-3" />
                                <span>Abrir HTTPS</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </motion.div>
              )}

              {/* Category 4: General */}
              {activeCategory === 'general' && (
                <motion.div initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }} className="space-y-6">
                  <div className={`border-b pb-4 ${isDark ? 'border-white/[0.08]' : 'border-slate-100'}`}>
                    <h4 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.generalTab}</h4>
                    <p className="text-xs text-slate-400">Ajustes globales de idioma y apariencia visual</p>
                  </div>

                  {/* Language and Theme Selectors sharing the SAME ROW */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Column 1: Language Select */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                        <Languages className="h-4 w-4 text-blue-400" />
                        <span>{t.languageSection}</span>
                      </label>
                      <div className="relative">
                        <select
                          value={language}
                          onChange={(e) => onSelectLanguage && onSelectLanguage(e.target.value)}
                          className={`w-full px-3.5 py-2.5 rounded-2xl border text-xs font-bold outline-none cursor-pointer appearance-none transition-all ${
                            isDark 
                              ? 'bg-[#12141F] border-white/[0.08] text-white hover:border-white/[0.16] focus:border-blue-500' 
                              : 'bg-slate-50 border-slate-200 text-slate-900 hover:border-slate-300 focus:border-blue-500'
                          }`}
                        >
                          {availableLocales.map((loc) => (
                            <option key={loc.code} value={loc.code} className={isDark ? 'bg-[#12141F] text-white' : 'bg-white text-slate-900'}>
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
                      <label className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
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
                              ? 'bg-[#12141F] border-white/[0.08] text-white hover:border-white/[0.16] focus:border-blue-500' 
                              : 'bg-slate-50 border-slate-200 text-slate-900 hover:border-slate-300 focus:border-blue-500'
                          }`}
                        >
                          <option value="light" className={isDark ? 'bg-[#12141F] text-white' : 'bg-white text-slate-900'}>
                            {t.lightMode}
                          </option>
                          <option value="dark" className={isDark ? 'bg-[#12141F] text-white' : 'bg-white text-slate-900'}>
                            {t.darkMode}
                          </option>
                        </select>
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                          <ChevronDown className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* System Notifications & Logs Memory Management */}
                  <div className="space-y-2.5 pt-4 border-t border-white/[0.08]">
                    <div className={`flex items-center justify-between p-3.5 rounded-2xl border ${
                      isDark ? 'bg-[#12141F] border-white/[0.08]' : 'bg-slate-500/5 border-slate-200/50'
                    }`}>
                      <div>
                        <span className="block text-xs font-bold">Notificaciones Nativas de Windows</span>
                        <span className="block text-[11px] text-slate-400">Recibe alertas del sistema cuando tus servidores se inicien, fallen o finalicen.</span>
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
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                            : isDark ? 'bg-[#181B28] text-slate-400 border border-white/[0.08]' : 'bg-slate-300 text-slate-700'
                        }`}
                      >
                        {notificationsEnabled ? 'ACTIVADAS' : 'DESACTIVADAS'}
                      </button>
                    </div>

                    <div className={`flex items-center justify-between p-3.5 rounded-2xl border ${
                      isDark ? 'bg-[#12141F] border-rose-500/20' : 'bg-rose-500/5 border-rose-500/20'
                    }`}>
                      <div>
                        <span className="block text-xs font-bold text-rose-400">Memoria de Logs de Servidores</span>
                        <span className="block text-[11px] text-slate-400">Libera memoria RAM borrando el historial de texto acumulado en las consolas.</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearLogsAction}
                        className={`p-2.5 rounded-xl transition-all flex items-center justify-center cursor-pointer shadow-xs ${
                          clearedLogsNotice
                            ? 'bg-emerald-600 text-white'
                            : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
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
