import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FolderPlus, 
  Play, 
  Square, 
  ExternalLink, 
  FolderOpen, 
  Plus, 
  Layers, 
  Database,
  ArrowRight,
  Trash2,
  Table,
  Activity,
  Cpu,
  X,
  GitBranch,
  Download,
  Sparkles
} from 'lucide-react';
import CreateDatabaseModal from '../modals/CreateDatabaseModal';
import CloneRepoModal from '../modals/CloneRepoModal';
import NewProjectWizardModal from '../modals/NewProjectWizardModal';
import { getTranslations } from '../../locales';

export default function HomeDashboard({
  projects = [],
  customDatabases = [],
  onAddProject,
  onOpenProjectsTab,
  onOpenDatabasesTab,
  onOpenSettings,
  onToggleProject,
  onRemoveProject,
  onSelectProjectDetail,
  onSelectDatabaseDetail,
  onAddCustomDatabase,
  onRemoveDatabase,
  onImportFolder,
  theme,
  language = 'es'
}) {
  const [showCreateDbModal, setShowCreateDbModal] = useState(false);
  const [showCloneRepoModal, setShowCloneRepoModal] = useState(false);
  const [showWizardModal, setShowWizardModal] = useState(false);
  const [showMoreModal, setShowMoreModal] = useState(false);
  const isDark = theme === 'dark';

  const t = getTranslations(language);

  const allDbs = customDatabases.map(d => ({ ...d, isDb: true }));
  const combinedList = [...projects.map(p => ({ ...p, isDb: false })), ...allDbs];

  const runningCount = projects.filter(p => p.status === 'RUNNING').length;

  // Maximum 4 items displayed directly on the Home Dashboard card list to keep layout compact
  const displayedList = combinedList.slice(0, 4);

  return (
    <div className={`py-4 px-6 md:px-8 max-w-7xl w-full mx-auto space-y-5 flex-1 flex flex-col justify-center overflow-hidden ${
      isDark ? 'bg-transparent text-[#f4f4f5]' : 'bg-transparent text-slate-900'
    }`}>

      {/* Page Header Title with Simple Telemetry Text */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-4 ${
        isDark ? 'border-[#2b2b2b]' : 'border-slate-200'
      }`}>
        <div>
          <h2 className={`text-2xl md:text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Lanzador de Entornos Locales
          </h2>
          <p className="text-slate-500 text-xs md:text-sm mt-0.5">
            Administra tus proyectos de desarrollo y bases de datos con un solo clic.
          </p>
        </div>

        {/* Simple Plain Telemetry (Servidores / Proyectos / BDs) */}
        <div className="flex items-center space-x-3 text-xs font-mono font-bold shrink-0 pt-1">
          <span className={`inline-flex items-center space-x-1.5 ${
            runningCount > 0 ? 'text-emerald-500 font-extrabold' : isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>
            <span className={`w-2 h-2 rounded-full ${runningCount > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
            <span>{runningCount} Servidores</span>
          </span>

          <span className="text-slate-400">/</span>

          <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
            {projects.length} Proyectos
          </span>

          <span className="text-slate-400">/</span>

          <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
            {allDbs.length} BDs
          </span>
        </div>
      </div>

      {/* Main Grid: Left Launcher Cards & Right Recent List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">

        {/* Left Column: Launcher Cards (Including Wizard, Import & Git Clone) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Card 1: New Project Wizard & Import Folder Row */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isDark 
              ? 'bg-[#12141F] border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] hover:border-white/[0.14]' 
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(59,130,246,0.15)]">
                <FolderPlus className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className={`text-sm font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Crear o Importar Proyectos
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Crea desde cero con plantillas o abre una carpeta existente.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => setShowWizardModal(true)}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2 px-3 rounded-xl shadow-md shadow-blue-600/20 hover:shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Nuevo (Wizard)</span>
              </button>

              <button
                onClick={onAddProject}
                className={`w-full font-bold text-xs py-2 px-3 rounded-xl border transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  isDark ? 'bg-[#181B28] border-white/[0.08] text-[#F3F4F6] hover:bg-[#1E2235] hover:border-white/[0.16]' : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200/60'
                }`}
              >
                <FolderOpen className="h-3.5 w-3.5 text-blue-400" />
                <span>Importar Carpeta</span>
              </button>
            </div>
          </div>

          {/* Card 2: Clone Git Repository */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isDark 
              ? 'bg-[#12141F] border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] hover:border-white/[0.14]' 
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <GitBranch className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className={`text-sm font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Clonar Repositorio Git
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Pega el link de GitHub/GitLab y elige la carpeta de destino.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowCloneRepoModal(true)}
              className={`w-full font-bold text-xs py-2 px-3 rounded-xl border transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                isDark ? 'bg-[#181B28] border-white/[0.08] text-[#F3F4F6] hover:bg-[#1E2235] hover:border-white/[0.16]' : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200/60'
              }`}
            >
              <Download className="h-4 w-4 text-blue-400" />
              <span>Descargar Repositorio</span>
            </button>
          </div>

          {/* Card 3: Projects Panel Shortcut */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isDark 
              ? 'bg-[#12141F] border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] hover:border-white/[0.14]' 
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <Layers className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className={`text-sm font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Gestor de Proyectos
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  React, Vite, Next.js, Express, Python y PHP
                </p>
              </div>
            </div>

            <button
              onClick={onOpenProjectsTab}
              className={`w-full font-bold text-xs py-2 px-3 rounded-xl border transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                isDark ? 'bg-[#181B28] border-white/[0.08] text-[#F3F4F6] hover:bg-[#1E2235] hover:border-white/[0.16]' : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200/60'
              }`}
            >
              <span>Explorar Proyectos</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Card 4: Databases Panel Shortcut */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isDark 
              ? 'bg-[#12141F] border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] hover:border-white/[0.14]' 
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <Database className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className={`text-sm font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Gestor de Bases de Datos
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  SQLite, MySQL, PostgreSQL y Redis
                </p>
              </div>
            </div>

            <button
              onClick={onOpenDatabasesTab}
              className={`w-full font-bold text-xs py-2 px-3 rounded-xl border transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                isDark ? 'bg-[#181B28] border-white/[0.08] text-[#F3F4F6] hover:bg-[#1E2235] hover:border-white/[0.16]' : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200/60'
              }`}
            >
              <span>Explorar Bases de Datos</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

        </div>

        {/* Right Column: Recent Items */}
        <motion.div 
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="lg:col-span-7 space-y-4 lg:pl-2"
        >
          {/* Header Title with Clean Proyectos Recientes... */}
          <div className={`flex items-center justify-between border-b pb-3 ${
            isDark ? 'border-white/[0.08]' : 'border-slate-200'
          }`}>
            <div>
              <h2 className={`text-2xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Proyectos Recientes...
              </h2>
              <p className="text-xs text-slate-400">Acceso rápido a tus entornos de desarrollo</p>
            </div>
          </div>

          {combinedList.length === 0 ? (
            <motion.div 
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center py-16 space-y-4"
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto border ${
                isDark ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'bg-blue-50 border-blue-200 text-blue-600'
              }`}>
                <FolderOpen className="h-7 w-7" />
              </div>
              <div>
                <h4 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>No hay elementos recientes</h4>
                <p className="text-slate-400 text-xs mt-1">
                  Usa los lanzadores de la izquierda para agregar tus proyectos o bases de datos.
                </p>
              </div>
            </motion.div>
          ) : (
            <div className="space-y-3.5">
              <AnimatePresence>
                {displayedList.map((item, index) => {
                  const isDb = item.isDb;

                  if (isDb) {
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2, delay: index * 0.04 }}
                        onClick={() => onSelectDatabaseDetail && onSelectDatabaseDetail(item)}
                        className={`pure-card p-4 cursor-pointer transition-all hover:border-blue-500 border ${
                          isDark ? 'border-white/[0.08]' : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          
                          <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                            <div className={`p-2.5 rounded-xl border shrink-0 ${
                              isDark ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.15)]' : 'bg-blue-50 border-blue-200 text-blue-600'
                            }`}>
                              <Database className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center space-x-2">
                                <h4 className={`font-bold text-base tracking-tight truncate hover:text-blue-400 transition-colors ${
                                  isDark ? 'text-white' : 'text-slate-900'
                                }`}>
                                  {item.name}
                                </h4>
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border bg-blue-500/10 text-blue-400 border-blue-500/20 shrink-0">
                                  Base de Datos
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">{item.tech}</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <span className={`w-28 py-2 text-center text-xs font-mono font-bold px-2.5 rounded-xl border ${
                              isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              Activo
                            </span>

                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={() => onSelectDatabaseDetail && onSelectDatabaseDetail(item)}
                              className="w-32 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md shadow-blue-600/20 hover:shadow-[0_0_15px_rgba(37,99,235,0.3)] flex items-center justify-center space-x-1.5 cursor-pointer"
                            >
                              <Table className="h-3.5 w-3.5" />
                              <span>Abrir Tablas</span>
                            </motion.button>

                            {onRemoveDatabase ? (
                              <button
                                onClick={() => onRemoveDatabase(item.id)}
                                className="p-2 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-400 transition-colors shrink-0 cursor-pointer"
                                title="Eliminar"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            ) : null}
                          </div>

                        </div>
                      </motion.div>
                    );
                  }

                  const isRunning = item.status === 'RUNNING';

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2, delay: index * 0.04 }}
                      onClick={() => onSelectProjectDetail(item)}
                      className={`pure-card p-4 cursor-pointer transition-all border ${
                        isRunning 
                          ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.15)]' 
                          : isDark ? 'border-white/[0.08]' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        
                        <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                          <div className={`p-2.5 rounded-xl border shrink-0 ${
                            isRunning 
                              ? isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                              : isDark ? 'bg-[#181B28] border-white/[0.08] text-[#94A3B8]' : 'bg-slate-100 border-slate-200 text-slate-600'
                          }`}>
                            <Layers className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <h4 className={`font-bold text-base tracking-tight truncate hover:text-blue-400 transition-colors ${
                                isDark ? 'text-white' : 'text-slate-900'
                              }`}>
                                {item.name}
                              </h4>
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border bg-blue-500/10 text-blue-400 border-blue-500/20 shrink-0">
                                :{item.port}
                              </span>
                              {item.hasBackend && (
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border bg-purple-500/10 text-purple-400 border-purple-500/30 shrink-0">
                                  Entorno Dual
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">{item.techStack}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <span className={`w-28 py-2 text-center text-xs font-mono font-bold px-2.5 rounded-xl border flex items-center justify-center gap-1.5 ${
                            isRunning 
                              ? isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : isDark ? 'bg-[#181B28] text-[#94A3B8] border-white/[0.08]' : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
                            {isRunning ? 'En Ejecución' : 'Stopped'}
                          </span>

                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onToggleProject(item)}
                            className={`w-32 py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all text-white shadow-md cursor-pointer ${
                              isRunning 
                                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20' 
                                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20 hover:shadow-[0_0_15px_rgba(37,99,235,0.35)]'
                            }`}
                          >
                            {isRunning ? <Square className="h-3.5 w-3.5 fill-white" /> : <Play className="h-3.5 w-3.5 fill-white" />}
                            <span>{isRunning ? 'Detener' : 'Arrancar'}</span>
                          </motion.button>

                          <button
                            onClick={() => onRemoveProject(item.id)}
                            className="p-2 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Hyperlink "Mostrar más..." if > 5 items */}
              {combinedList.length > 5 && (
                <div className="pt-2 text-right">
                  <button
                    onClick={() => setShowMoreModal(true)}
                    className="text-xs font-bold text-blue-400 hover:text-blue-300 hover:underline transition-all cursor-pointer"
                  >
                    Mostrar más ({combinedList.length - 5} adicionales)...
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.div>

      </div>

      {/* New Project Wizard Modal */}
      <NewProjectWizardModal
        isOpen={showWizardModal}
        onClose={() => setShowWizardModal(false)}
        onProjectCreated={(folderPath) => {
          if (onImportFolder) onImportFolder(folderPath);
        }}
        theme={theme}
      />

      {/* Git Clone Repo Modal */}
      <CloneRepoModal
        isOpen={showCloneRepoModal}
        onClose={() => setShowCloneRepoModal(false)}
        onImportFolder={onImportFolder}
        theme={theme}
        language={language}
      />

      {/* Modal with Hypertext List of All Recent Projects & Databases */}
      <AnimatePresence>
        {showMoreModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none"
            onClick={() => setShowMoreModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden ${
                isDark ? 'bg-[#0D0E15] border-white/[0.08] text-[#F3F4F6]' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              {/* Header */}
              <div className={`px-6 py-4 border-b flex items-center justify-between ${
                isDark ? 'bg-[#090A0F] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <h3 className={`font-extrabold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Lista Extendida de Proyectos y BDs
                  </h3>
                  <p className="text-xs text-slate-400">Haz clic en cualquier enlace para ser redirigido directamente</p>
                </div>
                <button
                  onClick={() => setShowMoreModal(false)}
                  className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                    isDark ? 'text-slate-400 hover:text-white hover:bg-[#1E2235]' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
                  }`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Clean Hypertext List */}
              <div className="p-6 max-h-96 overflow-y-auto space-y-3">
                {combinedList.map((item) => {
                  const isDb = item.isDb;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setShowMoreModal(false);
                        if (isDb) {
                          if (onSelectDatabaseDetail) onSelectDatabaseDetail(item);
                        } else {
                          if (onSelectProjectDetail) onSelectProjectDetail(item);
                        }
                      }}
                      className="flex items-center justify-between group cursor-pointer py-2 border-b border-slate-200/30 last:border-0 transition-colors"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        {/* Pure Hypertext Link */}
                        <span className={`font-bold text-sm transition-all truncate group-hover:text-blue-600 group-hover:underline ${
                          isDark ? 'text-slate-200' : 'text-slate-900'
                        }`}>
                          {item.name}
                        </span>
                      </div>

                      <span className="text-xs font-mono text-slate-400 group-hover:text-blue-500 transition-colors shrink-0 pl-2">
                        {item.tech || item.techStack} →
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <CreateDatabaseModal
        isOpen={showCreateDbModal}
        onClose={() => setShowCreateDbModal(false)}
        onCreate={(newDb) => {
          setShowCreateDbModal(false);
          const createdItem = {
            id: 'db-' + Date.now(),
            name: newDb.name,
            engine: newDb.engine || 'sqlite',
            type: newDb.engine || 'sqlite',
            port: newDb.engine === 'mysql' ? 3306 : newDb.engine === 'postgres' ? 5432 : newDb.engine === 'redis' ? 6379 : null,
            status: 'READY',
            tech: `Esquema ${(newDb.engine || 'sqlite').toUpperCase()}`,
            installed: true,
            isDb: true
          };
          if (onAddCustomDatabase) {
            onAddCustomDatabase(createdItem);
          } else if (onSelectDatabaseDetail) {
            onSelectDatabaseDetail(createdItem);
          }
        }}
      />
    </div>
  );
}
