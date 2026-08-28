import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Plus, 
  Database, 
  Settings as SettingsIcon, 
  Layers, 
  Play, 
  Square, 
  X,
  Table,
  Radio
} from 'lucide-react';
import { getTranslations } from '../../locales';

export default function CommandPaletteModal({
  isOpen,
  onClose,
  projects = [],
  customDatabases = [],
  onAddProject,
  onOpenProjects,
  onOpenDatabases,
  onOpenSettings,
  onToggleProject,
  onSelectDatabaseDetail,
  theme,
  language = 'es'
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const isDark = theme === 'dark';
  const t = getTranslations(language);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      return;
    }

    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Escape') {
        onClose();
        return;
      }

      const key = e.key.toLowerCase();
      const isInputEmpty = searchTerm.trim() === '';

      if (isInputEmpty || e.altKey) {
        if (key === 'n') {
          e.preventDefault();
          onAddProject();
          onClose();
        } else if (key === 'p') {
          e.preventDefault();
          if (onOpenProjects) onOpenProjects();
          onClose();
        } else if (key === 'd') {
          e.preventDefault();
          if (onOpenDatabases) onOpenDatabases();
          onClose();
        } else if (key === 's') {
          e.preventDefault();
          if (onOpenSettings) onOpenSettings();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, searchTerm, onClose, onAddProject, onOpenProjects, onOpenDatabases, onOpenSettings]);

  if (!isOpen) return null;

  const allDatabases = customDatabases.map(d => ({ ...d, isDb: true }));

  const actions = [
    {
      id: 'add-project',
      label: language === 'es' ? 'Agregar Nuevo Proyecto / Servicio Web' : 'Add New Project / Web Service',
      category: language === 'es' ? 'Acciones y Lanzadores' : 'Actions & Launchers',
      icon: Plus,
      hotkey: 'N',
      action: () => {
        onAddProject();
        onClose();
      }
    },
    {
      id: 'open-projects-panel',
      label: language === 'es' ? 'Abrir Panel de Proyectos' : 'Open Projects Panel',
      category: language === 'es' ? 'Acciones y Lanzadores' : 'Actions & Launchers',
      icon: Layers,
      hotkey: 'P',
      action: () => {
        if (onOpenProjects) onOpenProjects();
        onClose();
      }
    },
    {
      id: 'open-db-panel',
      label: language === 'es' ? 'Abrir Panel de Bases de Datos' : 'Open Databases Panel',
      category: language === 'es' ? 'Acciones y Lanzadores' : 'Actions & Launchers',
      icon: Database,
      hotkey: 'D',
      action: () => {
        if (onOpenDatabases) onOpenDatabases();
        onClose();
      }
    },
    {
      id: 'open-settings-modal',
      label: language === 'es' ? 'Abrir Ajustes y Configuración' : 'Open Settings & Preferences',
      category: language === 'es' ? 'Acciones y Lanzadores' : 'Actions & Launchers',
      icon: SettingsIcon,
      hotkey: 'S',
      action: () => {
        if (onOpenSettings) onOpenSettings();
        onClose();
      }
    }
  ];

  const projectItems = projects.map((p) => ({
    id: `proj-${p.id}`,
    label: `${p.name} (http://localhost:${p.port})`,
    category: language === 'es' ? 'Proyectos' : 'Projects',
    icon: Layers,
    project: p,
    action: () => {
      onToggleProject(p);
      onClose();
    }
  }));

  const databaseItems = allDatabases.map((db) => ({
    id: `db-item-${db.id}`,
    label: `${db.name} (${db.tech || (language === 'es' ? 'Base de datos' : 'Database')})`,
    category: language === 'es' ? 'Bases de Datos' : 'Databases',
    icon: Database,
    dbItem: db,
    action: () => {
      if (onSelectDatabaseDetail) onSelectDatabaseDetail(db);
      onClose();
    }
  }));

  const allItems = [...actions, ...projectItems, ...databaseItems].filter(item =>
    item.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-slate-900/60 backdrop-blur-sm p-4 select-none"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden ${
            isDark ? 'bg-[#141414] border-white/[0.08] text-[#E5E5E5]' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Header Search Box */}
          <div className={`px-5 py-4 border-b flex items-center space-x-3 ${
            isDark ? 'bg-[#181818] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
          }`}>
            <Search className="h-5 w-5 text-blue-400 shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder={language === 'es' ? "Escribe un comando o presiona N, P, D, S... (Ctrl + K)" : "Type a command or press N, P, D, S... (Ctrl + K)"}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full bg-transparent text-sm font-semibold focus:outline-none ${
                isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
              }`}
            />
            <button
              onClick={onClose}
              className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-[#2A2A2A]' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
              }`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Results List */}
          <div className="max-h-96 overflow-y-auto p-3 pr-2.5 space-y-4 custom-scrollbar">
            {allItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 font-mono">
                {language === 'es' ? 'No se encontraron comandos, proyectos o bases de datos coincidentes.' : 'No matching commands, projects, or databases found.'}
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* 1. Actions Section */}
                {allItems.some(i => i.category.includes('Acciones') || i.category.includes('Actions')) && (
                  <div className="space-y-1">
                    <span className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase font-mono">
                      {language === 'es' ? 'Acciones y Atajos' : 'Actions & Shortcuts'}
                    </span>
                    {allItems
                      .filter(i => i.category.includes('Acciones') || i.category.includes('Actions'))
                      .map((item) => {
                        const Icon = item.icon;
                        return (
                          <motion.button
                            key={item.id}
                            whileHover={{ x: 2 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={item.action}
                            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all text-left border cursor-pointer ${
                              isDark
                                ? 'border-transparent text-slate-300 hover:text-white hover:bg-[#252525] hover:border-white/[0.08]'
                                : 'border-transparent text-slate-700 hover:text-blue-700 hover:bg-blue-50/70 hover:border-blue-200'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`p-1.5 rounded-lg border ${
                                isDark ? 'bg-[#252525] border-white/[0.08] text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600'
                              }`}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <span>{item.label}</span>
                            </div>
                            {item.hotkey && (
                              <kbd className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                                isDark ? 'bg-[#1E1E1E] border-white/[0.08] text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'
                              }`}>{item.hotkey}</kbd>
                            )}
                          </motion.button>
                        );
                      })}
                  </div>
                )}

                {/* 2. Databases Section */}
                {allItems.some(i => i.category.includes('Bases') || i.category.includes('Databases')) && (
                  <div className="space-y-1">
                    <span className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase font-mono">
                      {language === 'es' ? 'Bases de Datos' : 'Databases'} ({allItems.filter(i => i.category.includes('Bases') || i.category.includes('Databases')).length})
                    </span>
                    {allItems
                      .filter(i => i.category.includes('Bases') || i.category.includes('Databases'))
                      .map((item) => (
                        <motion.div
                          key={item.id}
                          whileHover={{ x: 2 }}
                          onClick={item.action}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold border transition-all cursor-pointer ${
                            isDark
                              ? 'border-transparent text-slate-300 hover:bg-[#252525] hover:text-white hover:border-white/[0.08]'
                              : 'border-transparent text-slate-700 hover:bg-blue-50/70 hover:text-blue-900 hover:border-blue-200'
                          }`}
                        >
                          <div className="flex items-center space-x-3 truncate">
                            <div className={`p-1.5 rounded-lg border ${
                              isDark ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600'
                            }`}>
                              <Database className="h-4 w-4" />
                            </div>
                            <div className="truncate">
                              <span className={`font-bold block truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.dbItem?.name}</span>
                              <span className="text-[11px] font-mono text-slate-400 block truncate">{item.dbItem?.tech}</span>
                            </div>
                          </div>

                          <motion.button
                            whileTap={{ scale: 0.94 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              item.action();
                            }}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded-xl text-[11px] shadow-md shadow-blue-600/20 hover:shadow-[0_0_12px_rgba(37,99,235,0.35)] flex items-center space-x-1 shrink-0 cursor-pointer"
                          >
                            <Table className="h-3.5 w-3.5" />
                            <span>{t.abrirTablas || 'Open Tables'}</span>
                          </motion.button>
                        </motion.div>
                      ))}
                  </div>
                )}

                {/* 3. Projects Section */}
                {allItems.some(i => i.category.includes('Proyectos') || i.category.includes('Projects')) && (
                  <div className="space-y-1">
                    <span className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase font-mono">
                      {language === 'es' ? 'Proyectos' : 'Projects'} ({allItems.filter(i => i.category.includes('Proyectos') || i.category.includes('Projects')).length})
                    </span>
                    {allItems
                      .filter(i => i.category.includes('Proyectos') || i.category.includes('Projects'))
                      .map((item) => {
                        const isRunning = item.project?.status === 'RUNNING';
                        return (
                          <motion.div
                            key={item.id}
                            whileHover={{ x: 2 }}
                            onClick={item.action}
                            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold border transition-all cursor-pointer ${
                              isDark
                                ? 'border-transparent text-slate-300 hover:bg-[#252525] hover:text-white hover:border-white/[0.08]'
                                : 'border-transparent text-slate-700 hover:bg-blue-50/70 hover:text-blue-900 hover:border-blue-200'
                            }`}
                          >
                            <div className="flex items-center space-x-3 truncate">
                              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isRunning ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-slate-500'}`}></span>
                              <span className={`font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.project?.name}</span>
                              <span className="text-[11px] font-mono text-blue-400 font-bold shrink-0">:{item.project?.port}</span>
                            </div>

                            <motion.button
                              whileTap={{ scale: 0.94 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                item.action();
                              }}
                              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center space-x-1 text-white shadow-xs shrink-0 cursor-pointer ${
                                isRunning ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'
                              }`}
                            >
                              {isRunning ? <Square className="h-3 w-3 fill-white" /> : <Play className="h-3 w-3 fill-white" />}
                              <span>{isRunning ? (t.detener || 'Stop') : (t.arrancar || 'Start')}</span>
                            </motion.button>
                          </motion.div>
                        );
                      })}
                  </div>
                )}

              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
