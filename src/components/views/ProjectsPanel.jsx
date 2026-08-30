import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Square, 
  Globe, 
  FolderOpen, 
  Terminal, 
  Trash2, 
  Check, 
  Copy, 
  ExternalLink,
  Plus,
  RefreshCw,
  AlertTriangle,
  FolderPlus,
  Search,
  Code
} from 'lucide-react';
import { getTranslations } from '../../locales';

export default function ProjectsPanel({
  projects = [],
  onAddProject,
  onToggleProject,
  onOpenBrowser,
  onOpenEditor,
  onRemoveProject,
  onUpdateProject,
  onUpdatePort,
  onToggleLogs,
  onSelectProjectDetail,
  activeLogsProject,
  theme,
  language = 'es'
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterView, setFilterView] = useState('active'); // 'active' | 'archived' | 'all'
  const [copiedId, setCopiedId] = useState(null);
  const [portStatus, setPortStatus] = useState({});
  const [projectToDelete, setProjectToDelete] = useState(null);

  const t = getTranslations(language);
  const isDark = theme === 'dark';

  const activeCount = projects.filter(p => !p.isArchived).length;
  const archivedCount = projects.filter(p => p.isArchived).length;

  useEffect(() => {
    projects.forEach((p) => {
      checkPort(p.id, p.port);
    });
  }, [projects]);

  const checkPort = async (projectId, port) => {
    if (window.electronAPI?.checkPort && port) {
      const busy = await window.electronAPI.checkPort(port);
      setPortStatus((prev) => ({ ...prev, [projectId]: busy }));
    }
  };

  const handlePortChange = async (projectId, newPort) => {
    if (newPort === '') return;
    const portNum = parseInt(newPort, 10);
    if (!isNaN(portNum) && portNum > 0) {
      if (onUpdateProject) {
        onUpdateProject(projectId, { port: portNum });
      } else if (onUpdatePort) {
        onUpdatePort(projectId, portNum);
      }
      checkPort(projectId, portNum);
    }
  };

  const handleAutoAssignFreePort = async (projectId, currentPort) => {
    if (window.electronAPI) {
      const freePort = await window.electronAPI.findFreePort(currentPort || 3000);
      if (onUpdateProject) {
        onUpdateProject(projectId, { port: freePort });
      } else if (onUpdatePort) {
        onUpdatePort(projectId, freePort);
      }
      checkPort(projectId, freePort);
    } else {
      const fallback = 5173;
      if (onUpdateProject) onUpdateProject(projectId, { port: fallback });
      else if (onUpdatePort) onUpdatePort(projectId, fallback);
    }
  };

  const copyPath = (id, pathStr) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(pathStr || '');
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredProjects = projects.filter((p) => {
    if (filterView === 'active' && p.isArchived) return false;
    if (filterView === 'archived' && !p.isArchived) return false;
    return (
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.path.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className={`py-6 px-8 max-w-7xl w-full mx-auto space-y-8 flex-1 ${
      isDark ? 'bg-transparent text-[#f4f4f5]' : 'bg-transparent text-slate-900'
    }`}>
      
      {/* Header Bar */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 ${
        isDark ? 'border-white/[0.08]' : 'border-slate-200'
      }`}>
        <div>
          <h1 className={`text-3xl font-extrabold tracking-tight ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
            {t.gestorProyectos || 'Project Manager'}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {t.gestorProyectosDesc || 'Manage your repositories, launch commands, ports, and live previews.'}
          </p>
        </div>

        <button
          onClick={onAddProject}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-3 rounded-2xl flex items-center space-x-2 shadow-md shadow-blue-600/20 hover:shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-all text-xs cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>{t.importFolder || 'Import Project Folder'}</span>
        </button>
      </div>

      {/* Search & Filter View Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t.filterByNameOrPath || 'Search by name or path...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full border rounded-2xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 font-sans transition-all ${
              isDark ? 'bg-[#1E1E1E] border-white/[0.08] text-[#E5E5E5] placeholder-slate-500' : 'bg-white border-slate-200 text-slate-800'
            }`}
          />
        </div>

        {archivedCount > 0 && (
          <div className={`p-1 rounded-2xl border flex items-center space-x-1 shrink-0 ${
            isDark ? 'bg-[#141414] border-white/[0.08]' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setFilterView('active')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterView === 'active'
                  ? isDark ? 'bg-[#252525] text-white shadow-xs border border-white/[0.08]' : 'bg-white text-slate-900 shadow-xs'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{t.activeCount || 'Active'}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-blue-500/20 text-blue-400 font-mono">
                {activeCount}
              </span>
            </button>

            <button
              onClick={() => setFilterView('archived')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterView === 'archived'
                  ? isDark ? 'bg-[#252525] text-white shadow-xs border border-white/[0.08]' : 'bg-white text-slate-900 shadow-xs'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{t.archivedHidden || 'Archived'}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-400 font-mono font-bold">
                {archivedCount}
              </span>
            </button>

            <button
              onClick={() => setFilterView('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterView === 'all'
                  ? isDark ? 'bg-[#252525] text-white shadow-xs border border-white/[0.08]' : 'bg-white text-slate-900 shadow-xs'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{t.allCount || 'All'} ({projects.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* Projects List */}
      {filteredProjects.length === 0 ? (
        <div className={`text-center py-20 rounded-3xl border space-y-4 ${
          isDark ? 'bg-[#1E1E1E] border-white/[0.08]' : 'bg-white border-slate-200'
        }`}>
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
            <FolderPlus className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {t.noProjects || 'No projects found'}
            </h3>
            <p className="text-xs text-slate-400">
              {language === 'es' ? 'Haz clic en el botón superior para importar una carpeta de tu equipo' : 'Click the button above to import a project folder'}
            </p>
          </div>
          <button
            onClick={onAddProject}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md shadow-blue-600/20 hover:shadow-[0_0_15px_rgba(37,99,235,0.35)] transition-all cursor-pointer"
          >
            + {t.importFolder || 'Import Project'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProjects.map((project) => {
            const isRunning = project.status === 'RUNNING';
            const isBusy = portStatus[project.id];
            const projectUrl = `http://localhost:${project.port}`;

            return (
              <motion.div
                key={project.id}
                whileHover={{ y: -1 }}
                onClick={() => onSelectProjectDetail && onSelectProjectDetail(project)}
                className={`pure-card p-5 cursor-pointer transition-all space-y-4 ${
                  isRunning 
                    ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.15)]' 
                    : isDark ? 'border-white/[0.08]' : 'border-slate-200'
                }`}
              >
                {/* Top Info Row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className={`w-9 h-9 rounded-xl border flex items-center justify-center font-medium shrink-0 ${
                      isRunning 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                        : isDark ? 'bg-transparent border-white/[0.08] text-[#888888]' : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}>
                      <Code className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className={`font-semibold text-base tracking-tight truncate hover:text-blue-400 transition-colors ${
                          isDark ? 'text-white' : 'text-slate-900'
                        }`}>
                          {project.name}
                        </h3>
                        <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-md border flex items-center gap-1.5 ${
                          isRunning 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.2)]' 
                            : isDark ? 'bg-transparent text-[#888888] border-white/[0.08]' : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
                          {isRunning ? (t.running || 'RUNNING') : (t.stopped || 'STOPPED')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate" title={project.path}>
                        {project.path}
                      </p>
                    </div>
                  </div>

                  {/* Right Status Controls */}
                  <div className="flex items-center space-x-2 shrink-0 flex-wrap gap-y-1" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md border bg-blue-500/10 text-blue-400 border-blue-500/20">
                      {project.techStack || 'Web Project'}
                    </span>

                    {project.hasBackend && (
                      <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md border bg-purple-500/10 text-purple-400 border-purple-500/20">
                        {t.dualEnvironment || 'Dual Environment'}: Backend ({project.backend?.techStack || 'API'})
                      </span>
                    )}

                    {/* Start / Stop Toggle */}
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={() => onToggleProject(project)}
                      className={`w-28 py-2 rounded-xl text-xs font-medium flex items-center justify-center space-x-1.5 transition-all text-white cursor-pointer shadow-md ${
                        isRunning 
                          ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20' 
                          : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20 hover:shadow-[0_0_15px_rgba(37,99,235,0.35)]'
                      }`}
                    >
                      {isRunning ? <Square className="h-3.5 w-3.5 fill-white" /> : <Play className="h-3.5 w-3.5 fill-white" />}
                      <span>{isRunning ? (t.detener || 'Stop') : (t.arrancar || 'Start')}</span>
                    </motion.button>
                  </div>
                </div>

                {/* Bottom Actions Toolbar */}
                <div className={`pt-3 border-t flex flex-wrap items-center justify-between gap-3 ${
                  isDark ? 'border-white/[0.08]' : 'border-slate-100'
                }`} onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onOpenBrowser(projectUrl)}
                      className={`text-xs py-1.5 px-3 rounded-xl border font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                        isDark ? 'bg-[#252525] border-white/[0.08] text-[#E5E5E5] hover:bg-[#303030] hover:border-white/[0.16]' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                      title={language === 'es' ? 'Abrir en Navegador' : 'Open in Browser'}
                    >
                      <Globe className="h-3.5 w-3.5 text-blue-400" />
                      <span>{projectUrl}</span>
                    </button>

                    <button
                      onClick={() => onOpenEditor(project.path)}
                      className={`text-xs py-1.5 px-3 rounded-xl border font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                        isDark ? 'bg-[#252525] border-white/[0.08] text-[#E5E5E5] hover:bg-[#303030] hover:border-white/[0.16]' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                      title={language === 'es' ? 'Abrir en Editor de Código' : 'Open in Code Editor'}
                    >
                      <FolderOpen className="h-3.5 w-3.5 text-slate-400" />
                      <span>{language === 'es' ? 'Abrir Editor' : 'Open Editor'}</span>
                    </button>

                    <button
                      onClick={() => onToggleLogs(project.id)}
                      className={`text-xs py-1.5 px-3 rounded-xl border font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                        activeLogsProject === project.id
                          ? 'bg-blue-600 text-white border-blue-600 shadow-[0_0_12px_rgba(59,130,246,0.25)]'
                          : isDark ? 'bg-[#252525] border-white/[0.08] text-[#E5E5E5] hover:bg-[#303030] hover:border-white/[0.16]' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                      title={language === 'es' ? 'Ver Logs en Vivo' : 'View Live Logs'}
                    >
                      <Terminal className="h-3.5 w-3.5 text-slate-400" />
                      <span>Logs</span>
                    </button>
                  </div>

                  {/* Port Config and Trash */}
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1 text-xs font-mono">
                      <span className="text-slate-500">{t.port || 'Port:'}</span>
                      <input
                        type="number"
                        value={project.port ?? ''}
                        onChange={(e) => handlePortChange(project.id, e.target.value)}
                        className={`w-16 border rounded-lg px-2 py-1 font-bold text-center focus:outline-none transition-all ${
                          isDark ? 'bg-[#1E1E1E] border-white/[0.08] text-white focus:border-blue-500' : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      />
                      {isBusy && (
                        <button
                          onClick={() => handleAutoAssignFreePort(project.id, project.port)}
                          className="text-amber-500 hover:text-amber-600 p-1"
                          title={language === 'es' ? 'Puerto ocupado. Haz clic para auto-asignar puerto libre' : 'Port busy. Click to auto-assign a free port'}
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => setProjectToDelete(project)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                      title={t.delete || 'Delete'}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Delete Project Confirmation Modal */}
      <AnimatePresence>
        {projectToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none"
            onClick={() => setProjectToDelete(null)}
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
                    {t.confirmDeleteProject || 'Delete Project?'}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {t.confirmDeleteProjectMsg 
                      ? t.confirmDeleteProjectMsg.replace('{name}', projectToDelete.name)
                      : `Are you sure you want to remove "${projectToDelete.name}" from Lummo Studio? Physical files will not be deleted.`}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2.5 pt-2">
                <button
                  onClick={() => setProjectToDelete(null)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isDark ? 'text-[#888888] hover:text-white hover:bg-white/[0.06]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {t.cancel || 'Cancel'}
                </button>
                <button
                  onClick={() => {
                    if (onRemoveProject) onRemoveProject(projectToDelete.id);
                    setProjectToDelete(null);
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
