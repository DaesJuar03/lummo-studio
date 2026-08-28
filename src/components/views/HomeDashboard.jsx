import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FolderPlus, 
  Play, 
  Square, 
  FolderOpen, 
  Plus, 
  Layers, 
  Database,
  ArrowRight,
  Trash2,
  Table,
  X,
  GitBranch,
  Download
} from 'lucide-react';
import { getTranslations } from '../../locales';
import CreateDatabaseModal from '../modals/CreateDatabaseModal';
import CloneRepoModal from '../modals/CloneRepoModal';
import NewProjectWizardModal from '../modals/NewProjectWizardModal';

export default function HomeDashboard({
  projects = [],
  customDatabases = [],
  onAddProject,
  onOpenProjectsTab,
  onOpenDatabasesTab,
  onOpenSettings: _onOpenSettings,
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
  const [itemToDelete, setItemToDelete] = useState(null);
  const isDark = theme === 'dark';
  const t = getTranslations(language);

  const allDbs = (customDatabases || []).map(d => ({ ...d, isDb: true }));
  const activeProjects = (projects || []).filter(p => !p.isArchived);
  const combinedList = [...activeProjects.map(p => ({ ...p, isDb: false })), ...allDbs];

  const runningCount = activeProjects.filter(p => p.status === 'RUNNING').length;

  // Maximum 4 items displayed directly on the Home Dashboard card list to keep layout compact
  const displayedList = combinedList.slice(0, 4);

  return (
    <div className={`py-4 px-6 md:px-8 max-w-7xl w-full mx-auto space-y-5 flex-1 flex flex-col justify-center overflow-hidden ${
      isDark ? 'bg-transparent text-[#f4f4f5]' : 'bg-transparent text-slate-900'
    }`}>

      {/* Page Header Title with Simple Telemetry Text */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-4 ${
        isDark ? 'border-white/[0.08]' : 'border-slate-200'
      }`}>
        <div>
          <h2 className={`text-2xl md:text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {t.localEnvLauncher || 'Local Environment Launcher'}
          </h2>
          <p className="text-slate-500 text-xs md:text-sm mt-0.5">
            {t.localEnvLauncherDesc || 'Manage your development projects and databases with a single click.'}
          </p>
        </div>

        {/* Simple Plain Telemetry (Servers / Projects / DBs) */}
        <div className="flex items-center space-x-3 text-xs font-mono font-bold shrink-0 pt-1">
          <span className={`inline-flex items-center space-x-1.5 ${
            runningCount > 0 ? 'text-emerald-500 font-extrabold' : isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>
            <span className={`w-2 h-2 rounded-full ${runningCount > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
            <span>{runningCount} {t.serversCount || 'Servers'}</span>
          </span>

          <span className="text-slate-400">/</span>

          <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
            {activeProjects.length} {t.projectsCount || 'Projects'}
          </span>

          <span className="text-slate-400">/</span>

          <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
            {allDbs.length} {t.bdsCount || 'DBs'}
          </span>
        </div>
      </div>

      {/* Main Grid: Left Launcher Cards & Right Recent List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">

        {/* Left Column: Launcher Options (Clean & Borderless) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Option 1: New Project Wizard & Import Folder Row */}
          <div className="space-y-2.5">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(59,130,246,0.15)]">
                <FolderPlus className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className={`text-sm font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {t.createOrImport || 'Create or Import Projects'}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {t.createOrImportDesc || 'Create from scratch with templates or open an existing folder.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                onClick={() => setShowWizardModal(true)}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2 px-3 rounded-xl shadow-md shadow-blue-600/20 hover:shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t.newWizard || 'New (Wizard)'}</span>
              </button>

              <button
                onClick={onAddProject}
                className={`w-full font-bold text-xs py-2 px-3 rounded-xl border transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  isDark ? 'bg-transparent border-white/[0.1] text-[#E5E5E5] hover:bg-white/[0.06] hover:border-white/[0.2]' : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200/60'
                }`}
              >
                <FolderOpen className="h-3.5 w-3.5 text-blue-400" />
                <span>{t.importFolder || 'Import Folder'}</span>
              </button>
            </div>
          </div>

          {/* Option 2: Clone Git Repository */}
          <div className="space-y-2.5">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <GitBranch className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className={`text-sm font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {t.cloneGitRepo || 'Clone Git Repository'}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {t.cloneGitRepoDesc || 'Paste GitHub/GitLab link and choose destination folder.'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowCloneRepoModal(true)}
              className={`w-full font-bold text-xs py-2 px-3 rounded-xl border transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                isDark ? 'bg-transparent border-white/[0.1] text-[#E5E5E5] hover:bg-white/[0.06] hover:border-white/[0.2]' : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200/60'
              }`}
            >
              <Download className="h-4 w-4 text-blue-400" />
              <span>{t.downloadRepo || 'Download Repository'}</span>
            </button>
          </div>

          {/* Option 3: Projects Panel Shortcut */}
          <div className="space-y-2.5">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <Layers className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className={`text-sm font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {t.gestorProyectos || 'Project Manager'}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {t.gestorProyectosDesc || 'React, Vite, Next.js, Express, Python and PHP'}
                </p>
              </div>
            </div>

            <button
              onClick={onOpenProjectsTab}
              className={`w-full font-bold text-xs py-2 px-3 rounded-xl border transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                isDark ? 'bg-transparent border-white/[0.1] text-[#E5E5E5] hover:bg-white/[0.06] hover:border-white/[0.2]' : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200/60'
              }`}
            >
              <span>{t.exploreProjects || 'Explore Projects'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Option 4: Databases Panel Shortcut */}
          <div className="space-y-2.5">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <Database className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className={`text-sm font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {t.gestorDatabases || 'Database Manager'}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {t.gestorDatabasesDesc || 'SQLite, MySQL, PostgreSQL and Redis'}
                </p>
              </div>
            </div>

            <button
              onClick={onOpenDatabasesTab}
              className={`w-full font-bold text-xs py-2 px-3 rounded-xl border transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                isDark ? 'bg-transparent border-white/[0.1] text-[#E5E5E5] hover:bg-white/[0.06] hover:border-white/[0.2]' : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200/60'
              }`}
            >
              <span>{t.exploreDatabases || 'Explore Databases'}</span>
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
          {/* Header Title */}
          <div className="flex items-center justify-between pb-1">
            <div>
              <h2 className={`text-2xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {t.recentProjects || 'Recent Projects...'}
              </h2>
              <p className="text-xs text-slate-400">{t.recentDesc || 'Fast access to your recent development environments'}</p>
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
                <h4 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.noItems || 'No recent items found'}</h4>
                <p className="text-slate-400 text-xs mt-1">
                  {t.noItemsDesc || 'Use the launchers on the left to add your first projects or databases.'}
                </p>
              </div>
            </motion.div>
          ) : (
            <div className="space-y-3">
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
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                          isDark 
                            ? 'bg-transparent border-white/[0.08] hover:border-white/[0.18] hover:bg-white/[0.02]' 
                            : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          
                          <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                            <div className={`p-2.5 rounded-xl shrink-0 ${
                              isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'
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
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 shrink-0">
                                  {t.baseDeDatos || 'Database'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">{item.tech}</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <span className={`w-28 py-2 text-center text-xs font-mono font-bold px-2.5 rounded-xl ${
                              isDark ? 'text-emerald-400' : 'text-emerald-700'
                            }`}>
                              {t.active || 'Active'}
                            </span>

                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={() => onSelectDatabaseDetail && onSelectDatabaseDetail(item)}
                              className="w-32 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md shadow-blue-600/20 hover:shadow-[0_0_15px_rgba(37,99,235,0.3)] flex items-center justify-center space-x-1.5 cursor-pointer"
                            >
                              <Table className="h-3.5 w-3.5" />
                              <span>{t.abrirTablas || 'Open Tables'}</span>
                            </motion.button>

                            {onRemoveDatabase ? (
                              <button
                                onClick={() => setItemToDelete({ id: item.id, name: item.name, isDb: true })}
                                className="p-2 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-400 transition-colors shrink-0 cursor-pointer"
                                title={t.delete || 'Delete'}
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
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        isRunning 
                          ? 'border-blue-500/50 ring-1 ring-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]' 
                          : isDark ? 'bg-transparent border-white/[0.08] hover:border-white/[0.18] hover:bg-white/[0.02]' : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        
                        <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                          <div className={`p-2.5 rounded-xl shrink-0 ${
                            isRunning 
                              ? isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                              : isDark ? 'bg-transparent text-[#888888]' : 'bg-slate-100 text-slate-600'
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
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 shrink-0">
                                :{item.port}
                              </span>
                              {item.hasBackend && (
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 shrink-0">
                                  {t.dualEnvironment || 'Dual Environment'}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">{item.techStack}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <span className={`w-28 py-2 text-center text-xs font-mono font-bold px-2.5 rounded-xl flex items-center justify-center gap-1.5 ${
                            isRunning 
                              ? isDark ? 'text-emerald-400' : 'text-emerald-700' 
                              : isDark ? 'text-[#888888]' : 'text-slate-600'
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
                            {isRunning ? (t.running || 'Running') : (t.stopped || 'Stopped')}
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
                            <span>{isRunning ? (t.detener || 'Stop') : (t.arrancar || 'Start')}</span>
                          </motion.button>

                          <button
                            onClick={() => setItemToDelete({ id: item.id, name: item.name, isDb: false })}
                            className="p-2 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                            title={t.delete || 'Delete'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Hyperlink "View more projects..." if > 4 items */}
              {combinedList.length > 4 && (
                <div className="pt-2 text-right">
                  <button
                    onClick={() => setShowMoreModal(true)}
                    className="text-xs font-bold text-blue-400 hover:text-blue-300 hover:underline transition-all cursor-pointer inline-flex items-center gap-1"
                  >
                    <span>{t.viewMoreProjects || 'View more projects'} ({combinedList.length - 4} {t.additional || 'additional'})...</span>
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
        language={language}
      />

      {/* Git Clone Repo Modal */}
      <CloneRepoModal
        isOpen={showCloneRepoModal}
        onClose={() => setShowCloneRepoModal(false)}
        onImportFolder={onImportFolder}
        theme={theme}
        language={language}
      />

      {/* Modal with Complete List of All Added Projects & Databases */}
      <AnimatePresence>
        {showMoreModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none"
            onClick={() => setShowMoreModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden ${
                isDark ? 'bg-[#1E1E1E] border-white/[0.08] text-[#E5E5E5]' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              {/* Header */}
              <div className={`px-6 py-4 border-b flex items-center justify-between ${
                isDark ? 'bg-[#181818] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <h3 className={`font-extrabold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {language === 'es' ? 'Todos los Proyectos y Bases de Datos' : 'All Projects and Databases'} ({combinedList.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    {language === 'es' ? 'Haz clic en cualquier elemento para abrir su panel de control' : 'Click any item to open its control panel'}
                  </p>
                </div>
                <button
                  onClick={() => setShowMoreModal(false)}
                  className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                    isDark ? 'text-slate-400 hover:text-white hover:bg-white/[0.06]' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
                  }`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Items List */}
              <div className="p-5 max-h-96 overflow-y-auto space-y-2 custom-scrollbar">
                {combinedList.map((item) => {
                  const isDb = item.isDb;
                  const isRunning = item.status === 'RUNNING';

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
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between group cursor-pointer ${
                        isDark 
                          ? 'bg-[#141414] border-white/[0.06] hover:border-blue-500/50 hover:bg-white/[0.03]' 
                          : 'bg-slate-50 border-slate-200 hover:border-blue-400 hover:bg-blue-50/30'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className={`p-2 rounded-xl border shrink-0 ${
                          isDb 
                            ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                            : isRunning
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : isDark ? 'bg-transparent border-white/[0.08] text-[#888888]' : 'bg-slate-100 border-slate-200 text-slate-600'
                        }`}>
                          {isDb ? <Database className="h-4 w-4" /> : <Layers className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <span className={`font-bold text-sm truncate block group-hover:text-blue-400 transition-colors ${
                            isDark ? 'text-slate-200' : 'text-slate-900'
                          }`}>
                            {item.name}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400 truncate block">
                            {item.tech || item.techStack}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0 pl-2">
                        {item.port && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            :{item.port}
                          </span>
                        )}
                        <span className="text-xs font-mono text-slate-400 group-hover:text-blue-400 transition-colors">
                          →
                        </span>
                      </div>
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
        language={language}
        theme={theme}
        onCreate={(newDb) => {
          setShowCreateDbModal(false);
          const createdItem = {
            id: 'db-' + Date.now(),
            name: newDb.name,
            engine: newDb.engine || 'sqlite',
            type: newDb.engine || 'sqlite',
            port: newDb.engine === 'mysql' ? 3306 : newDb.engine === 'postgres' ? 5432 : newDb.engine === 'redis' ? 6379 : null,
            status: 'READY',
            tech: `${newDb.engine || 'sqlite'}`.toUpperCase(),
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

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {itemToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none"
            onClick={() => setItemToDelete(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-md rounded-3xl border p-6 space-y-5 shadow-2xl ${
                isDark ? 'bg-[#1E1E1E] border-white/[0.08] text-[#E5E5E5]' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-start space-x-4">
                <div className="w-11 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 shadow-md shadow-rose-500/10">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h3 className={`font-extrabold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {itemToDelete.isDb ? (t.confirmDeleteDb || 'Delete Database?') : (t.confirmDeleteProject || 'Delete Project?')}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {itemToDelete.isDb 
                      ? (t.confirmDeleteDbMsg || 'Are you sure you want to delete this database configuration?') 
                      : (t.confirmDeleteProjectMsg ? t.confirmDeleteProjectMsg.replace('{name}', itemToDelete.name) : `Are you sure you want to remove "${itemToDelete.name}" from Lummo Studio? Physical files on your hard drive will not be deleted.`)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2.5 pt-2">
                <button
                  onClick={() => setItemToDelete(null)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isDark ? 'text-[#888888] hover:text-white hover:bg-white/[0.06]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {t.cancel || 'Cancel'}
                </button>
                <button
                  onClick={() => {
                    if (itemToDelete.isDb) {
                      if (onRemoveDatabase) onRemoveDatabase(itemToDelete.id);
                    } else {
                      if (onRemoveProject) onRemoveProject(itemToDelete.id);
                    }
                    setItemToDelete(null);
                  }}
                  className="px-5 py-2 rounded-xl bg-transparent border border-rose-500 text-white hover:text-rose-500 hover:border-rose-500 hover:bg-rose-500/10 font-bold text-xs transition-all cursor-pointer"
                >
                  {t.yesDelete || 'Yes, Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
