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
  Download
} from 'lucide-react';
import CreateDatabaseModal from '../modals/CreateDatabaseModal';
import CloneRepoModal from '../modals/CloneRepoModal';
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

        {/* Left Column: Launcher Cards (Including Git Clone Card) */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Card 1: Import Local Project Folder */}
          <div className="space-y-3 py-1">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
                <FolderPlus className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className={`text-sm font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Importar Proyecto Local
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Arrastra o selecciona una carpeta de tu equipo para comenzar.
                </p>
              </div>
            </div>

            <button
              onClick={onAddProject}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-3 rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center justify-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Importar Proyecto</span>
            </button>
          </div>

          {/* Card 2: Clone Git Repository */}
          <div className="space-y-3 py-1">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
                <GitBranch className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className={`text-sm font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Clonar Repositorio Git
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Pega el link de GitHub/GitLab y elige la carpeta de destino.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowCloneRepoModal(true)}
              className={`w-full font-bold text-xs py-2 px-3 rounded-xl border transition-all flex items-center justify-center space-x-2 ${
                isDark ? 'bg-[#1a1c24] border-[#232631] text-[#e2e8ec] hover:bg-[#212430] hover:border-[#3b82f6]' : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200/60'
              }`}
            >
              <Download className="h-4 w-4 text-blue-500" />
              <span>Descargar Repositorio</span>
            </button>
          </div>

          {/* Card 3: Projects Panel Shortcut */}
          <div className="space-y-3 py-1">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
                <Layers className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className={`text-sm font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Gestor de Proyectos
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  React, Vite, PHP, Express, Python y Node.js
                </p>
              </div>
            </div>

            <button
              onClick={onOpenProjectsTab}
              className={`w-full font-bold text-xs py-2 px-3 rounded-xl border transition-all flex items-center justify-center space-x-2 ${
                isDark ? 'bg-[#1a1c24] border-[#232631] text-[#e2e8ec] hover:bg-[#212430] hover:border-[#3b82f6]' : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200/60'
              }`}
            >
              <span>Explorar Proyectos</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Card 4: Databases Panel Shortcut */}
          <div className="space-y-3 py-1">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
                <Database className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className={`text-sm font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Gestor de Bases de Datos
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  MySQL, PostgreSQL & SQLite nativo
                </p>
              </div>
            </div>

            <button
              onClick={onOpenDatabasesTab}
              className={`w-full font-bold text-xs py-2 px-3 rounded-xl border transition-all flex items-center justify-center space-x-2 ${
                isDark ? 'bg-[#1a1c24] border-[#232631] text-[#e2e8ec] hover:bg-[#212430] hover:border-[#3b82f6]' : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200/60'
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
            isDark ? 'border-[#232631]' : 'border-slate-200'
          }`}>
            <div>
              <h2 className={`text-2xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Proyectos Recientes...
              </h2>
              <p className="text-xs text-slate-500">Acceso rápido a tus entornos de desarrollo</p>
            </div>
          </div>

          {combinedList.length === 0 ? (
            <motion.div 
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center py-16 space-y-4"
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto border ${
                isDark ? 'bg-blue-950/60 border-blue-800 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600'
              }`}>
                <FolderOpen className="h-7 w-7" />
              </div>
              <div>
                <h4 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>No hay elementos recientes</h4>
                <p className="text-slate-500 text-xs mt-1">
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
                          isDark ? 'border-[#232631]' : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          
                          <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                            <div className={`p-2.5 rounded-xl border shrink-0 ${
                              isDark ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600'
                            }`}>
                              <Database className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center space-x-2">
                                <h4 className={`font-bold text-base tracking-tight truncate hover:text-blue-500 transition-colors ${
                                  isDark ? 'text-white' : 'text-slate-900'
                                }`}>
                                  {item.name}
                                </h4>
                                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border shrink-0 ${
                                  isDark ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-700 border-blue-200'
                                }`}>
                                  Base de Datos
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 font-mono mt-0.5 truncate">{item.tech}</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <span className={`w-28 py-2 text-center text-xs font-mono font-bold px-2.5 rounded-xl border ${
                              isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              Activo
                            </span>

                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={() => onSelectDatabaseDetail && onSelectDatabaseDetail(item)}
                              className="w-32 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-xs flex items-center justify-center space-x-1.5"
                            >
                              <Table className="h-3.5 w-3.5" />
                              <span>Abrir Tablas</span>
                            </motion.button>

                            {onRemoveDatabase ? (
                              <button
                                onClick={() => onRemoveDatabase(item.id)}
                                className="p-2 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors shrink-0"
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
                      className={`pure-card p-4 cursor-pointer transition-all hover:border-blue-500 border ${
                        isRunning ? 'border-blue-500 ring-2 ring-blue-500/20' : isDark ? 'border-[#232631]' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        
                        <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                          <div className={`p-2.5 rounded-xl border shrink-0 ${
                            isRunning 
                              ? isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                              : isDark ? 'bg-[#14161c] border-[#232631] text-[#94a3b8]' : 'bg-slate-100 border-slate-200 text-slate-600'
                          }`}>
                            <Layers className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <h4 className={`font-bold text-base tracking-tight truncate hover:text-blue-500 transition-colors ${
                                isDark ? 'text-white' : 'text-slate-900'
                              }`}>
                                {item.name}
                              </h4>
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-200 shrink-0">
                                :{item.port}
                              </span>
                              {item.hasBackend && (
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border bg-purple-500/10 text-purple-400 border-purple-500/30 shrink-0">
                                  Entorno Dual
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 font-mono mt-0.5 truncate">{item.techStack}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <span className={`w-28 py-2 text-center text-xs font-mono font-bold px-2.5 rounded-xl border flex items-center justify-center gap-1.5 ${
                            isRunning ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : isDark ? 'bg-[#181818] text-slate-400 border-[#2e2e2e]' : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                            {isRunning ? 'En Ejecución' : 'Stopped'}
                          </span>

                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onToggleProject(item)}
                            className={`w-32 py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all text-white shadow-xs ${
                              isRunning ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                          >
                            {isRunning ? <Square className="h-3.5 w-3.5 fill-white" /> : <Play className="h-3.5 w-3.5 fill-white" />}
                            <span>{isRunning ? 'Detener' : 'Arrancar'}</span>
                          </motion.button>

                          <button
                            onClick={() => onRemoveProject(item.id)}
                            className="p-2 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors"
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
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline transition-all cursor-pointer"
                  >
                    Mostrar más ({combinedList.length - 5} adicionales)...
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.div>

      </div>

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
                isDark ? 'bg-[#1e1e1e] border-[#2a2a2a] text-[#e4e4e7]' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              {/* Header */}
              <div className={`px-6 py-4 border-b flex items-center justify-between ${
                isDark ? 'bg-[#181818] border-[#2a2a2a]' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <h3 className={`font-extrabold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Lista Extendida de Proyectos y BDs
                  </h3>
                  <p className="text-xs text-slate-500">Haz clic en cualquier enlace para ser redirigido directamente</p>
                </div>
                <button
                  onClick={() => setShowMoreModal(false)}
                  className={`p-1.5 rounded-xl transition-colors ${
                    isDark ? 'text-slate-400 hover:text-white hover:bg-[#282828]' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
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
            port: newDb.engine === 'mysql' ? 3306 : newDb.engine === 'postgres' ? 5432 : null,
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
