import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FolderKanban, 
  FolderOpen, 
  Archive, 
  Search, 
  Trash2, 
  Check, 
  CheckSquare, 
  Square, 
  ChevronUp, 
  ChevronDown, 
  X 
} from 'lucide-react';

export default function ProjectsManagerTab({
  projects = [],
  onSaveProjects,
  onRemoveProject,
  onOpenFolder,
  theme,
  t,
  language = 'es'
}) {
  const isDark = theme === 'dark';
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
    showProjectNotice(
      archive 
        ? (language === 'es' ? `¡${count} proyecto(s) archivado(s)!` : `${count} project(s) archived!`)
        : (language === 'es' ? `¡${count} proyecto(s) restaurado(s)!` : `${count} project(s) restored!`)
    );
  };

  const handleDeleteSelected = () => {
    const count = selectedProjectIds.size;
    const updated = (projects || []).filter(p => !selectedProjectIds.has(p.id || p.path));
    if (onSaveProjects) onSaveProjects(updated);
    setSelectedProjectIds(new Set());
    showProjectNotice(language === 'es' ? `¡${count} proyecto(s) eliminado(s)!` : `${count} project(s) removed!`);
  };

  const handleToggleArchiveSingle = (project, archive) => {
    const updated = (projects || []).map(p => {
      if ((p.id && p.id === project.id) || p.path === project.path) {
        return { ...p, isArchived: archive };
      }
      return p;
    });
    if (onSaveProjects) onSaveProjects(updated);
    showProjectNotice(
      archive 
        ? (language === 'es' ? `"${project.name}" archivado.` : `"${project.name}" archived.`)
        : (language === 'es' ? `"${project.name}" restaurado.` : `"${project.name}" restored.`)
    );
  };

  const handleDeleteSingle = (project) => {
    const pId = project.id || project.path;
    if (onRemoveProject) {
      onRemoveProject(pId);
    } else {
      const updated = (projects || []).filter(p => (p.id ? p.id !== project.id : p.path !== project.path));
      if (onSaveProjects) onSaveProjects(updated);
    }
    showProjectNotice(language === 'es' ? `"${project.name}" eliminado.` : `"${project.name}" removed.`);
  };

  const handleMoveProject = (currentIndex, direction) => {
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= (projects || []).length) return;
    const copy = [...(projects || [])];
    const [moved] = copy.splice(currentIndex, 1);
    copy.splice(targetIndex, 0, moved);
    if (onSaveProjects) onSaveProjects(copy);
  };

  return (
    <motion.div initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }} className="space-y-5">
      {/* Header & Stats */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-3 ${isDark ? 'border-white/[0.08]' : 'border-slate-100'}`}>
        <div>
          <h4 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {t.projectsManagerTab || 'Project Management'}
          </h4>
          <p className="text-xs text-slate-400">
            {t.projectsManagerDesc || 'Organize your projects order, archive inactive ones and manage batch selections.'}
          </p>
        </div>

        {/* Quick Stats Pills */}
        <div className="flex items-center gap-2 text-xs font-mono shrink-0">
          <span className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 font-bold ${
            isDark ? 'bg-[#1E1E1E] border-white/[0.08] text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
          }`}>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{activeProjects.length} {t.activeCount || 'Active'}</span>
          </span>

          <span className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 font-bold ${
            archivedProjects.length > 0
              ? isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-800'
              : isDark ? 'bg-[#1E1E1E] border-white/[0.08] text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'
          }`}>
            <span className={`w-2 h-2 rounded-full ${archivedProjects.length > 0 ? 'bg-amber-500' : 'bg-slate-400'}`}></span>
            <span>{archivedProjects.length} {t.archivedCount || 'Archived'}</span>
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
          isDark ? 'bg-[#141414] border-white/[0.08]' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            type="button"
            onClick={() => { setProjectsFilter('active'); setSelectedProjectIds(new Set()); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              projectsFilter === 'active'
                ? isDark ? 'bg-[#252525] text-white shadow-xs border border-white/[0.08]' : 'bg-white text-slate-900 shadow-xs'
                : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>{t.activeCount || 'Active'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-blue-500/20 text-blue-400 font-mono">
              {activeProjects.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setProjectsFilter('archived'); setSelectedProjectIds(new Set()); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              projectsFilter === 'archived'
                ? isDark ? 'bg-[#252525] text-white shadow-xs border border-white/[0.08]' : 'bg-white text-slate-900 shadow-xs'
                : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>{t.archivedHidden || 'Archived / Hidden'}</span>
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
                ? isDark ? 'bg-[#252525] text-white shadow-xs border border-white/[0.08]' : 'bg-white text-slate-900 shadow-xs'
                : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>{t.allCount || 'All'}</span>
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
            placeholder={t.filterByNameOrPath || 'Filter by name or path...'}
            value={projectSearch}
            onChange={(e) => setProjectSearch(e.target.value)}
            className={`w-full pl-8.5 pr-3 py-1.5 rounded-2xl border text-xs outline-none transition-all ${
              isDark 
                ? 'bg-[#1E1E1E] border-white/[0.08] text-white placeholder-slate-500 focus:border-blue-500' 
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

      {/* Multi-selection Toolbar */}
      {filteredProjectsList.length > 0 && (
        <div className={`p-2.5 rounded-2xl border flex flex-wrap items-center justify-between gap-2 text-xs ${
          selectedProjectIds.size > 0
            ? isDark ? 'bg-[#252525] border-blue-500/40 ring-1 ring-blue-500/20' : 'bg-blue-50/80 border-blue-200'
            : isDark ? 'bg-[#141414] border-white/[0.06]' : 'bg-slate-50 border-slate-200'
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
                  : isDark ? 'border-white/[0.15] bg-[#1E1E1E] text-slate-300' : 'border-slate-300 bg-white text-slate-700'
              }`}
            >
              {selectedProjectIds.size === filteredProjectsList.length && filteredProjectsList.length > 0 ? (
                <CheckSquare className="h-4 w-4 text-white" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              <span>
                {selectedProjectIds.size > 0 
                  ? (language === 'es' ? `${selectedProjectIds.size} de ${filteredProjectsList.length} seleccionados` : `${selectedProjectIds.size} of ${filteredProjectsList.length} selected`)
                  : (t.selectAll || 'Select all')}
              </span>
            </button>

            {selectedProjectIds.size > 0 && (
              <button
                type="button"
                onClick={handleDeselectAll}
                className="text-xs text-slate-400 hover:text-slate-200 underline cursor-pointer"
              >
                {language === 'es' ? 'Deseleccionar' : 'Deselect'}
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
                  <span>{t.archive || 'Archive'} ({selectedProjectIds.size})</span>
                </button>
              )}

              {(projectsFilter === 'archived' || projectsFilter === 'all') && (
                <button
                  type="button"
                  onClick={() => handleArchiveSelected(false)}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>{language === 'es' ? 'Restaurar' : 'Restore'} ({selectedProjectIds.size})</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleDeleteSelected}
                className="px-3 py-1.5 rounded-xl bg-rose-600/15 border border-rose-500/30 hover:bg-rose-600/30 text-rose-400 font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{t.delete || 'Delete'} ({selectedProjectIds.size})</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Projects List Container */}
      <div className="max-h-[320px] overflow-y-auto custom-scrollbar space-y-2.5 pr-1">
        {filteredProjectsList.length === 0 ? (
          <div className={`p-10 text-center rounded-3xl border space-y-3 ${
            isDark ? 'bg-[#1E1E1E] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto border border-blue-500/20">
              {projectsFilter === 'archived' ? <Archive className="h-6 w-6" /> : <FolderKanban className="h-6 w-6" />}
            </div>
            <div className="space-y-1">
              <h5 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {projectsFilter === 'archived'
                  ? (language === 'es' ? 'No hay proyectos archivados u ocultos' : 'No archived or hidden projects')
                  : projectSearch
                  ? (language === 'es' ? 'No se encontraron proyectos con ese criterio' : 'No projects matched the search criteria')
                  : (t.noProjects || 'No projects registered')}
              </h5>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                {projectsFilter === 'archived'
                  ? (language === 'es' ? 'Cuando archives proyectos inactivos para despejar tu panel principal, aparecerán aquí para que puedas recuperarlos con un solo clic.' : 'When you archive inactive projects to declutter your main dashboard, they will appear here so you can restore them anytime.')
                  : (language === 'es' ? 'Importa tus proyectos o crea nuevos para gestionarlos desde este panel.' : 'Import your projects or create new ones to manage them from this panel.')}
              </p>
            </div>
          </div>
        ) : (
          filteredProjectsList.map((project, idx) => {
            const pId = project.id || project.path;
            const isSelected = selectedProjectIds.has(pId);
            const isArchived = Boolean(project.isArchived);
            const masterIndex = (projects || []).findIndex(p => (p.id ? p.id === project.id : p.path === project.path));

            return (
              <div
                key={pId || idx}
                className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isSelected
                    ? isDark 
                      ? 'bg-[#252525] border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/30' 
                      : 'bg-blue-50/80 border-blue-400'
                    : isDark 
                      ? 'bg-[#1E1E1E] border-white/[0.08] hover:border-white/[0.16]' 
                      : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Left: Checkbox + Reorder Controls + Info */}
                <div className="flex items-center space-x-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggleSelect(pId)}
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : isDark ? 'border-white/[0.2] bg-[#141414] hover:border-white/[0.4]' : 'border-slate-300 bg-slate-50'
                    }`}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </button>

                  <div className="flex flex-col space-y-0.5 shrink-0">
                    <button
                      type="button"
                      disabled={masterIndex <= 0}
                      onClick={() => handleMoveProject(masterIndex, 'up')}
                      title={language === 'es' ? 'Mover arriba' : 'Move up'}
                      className={`p-0.5 rounded transition-colors cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed ${
                        isDark ? 'text-slate-400 hover:text-white hover:bg-[#303030]' : 'text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={masterIndex >= (projects || []).length - 1}
                      onClick={() => handleMoveProject(masterIndex, 'down')}
                      title={language === 'es' ? 'Mover abajo' : 'Move down'}
                      className={`p-0.5 rounded transition-colors cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed ${
                        isDark ? 'text-slate-400 hover:text-white hover:bg-[#303030]' : 'text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className={`font-bold text-xs truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {project.name}
                      </span>

                      {isArchived ? (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          {language === 'es' ? 'Archivado' : 'Archived'}
                        </span>
                      ) : (
                        project.status === 'RUNNING' && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            {t.running || 'Running'}
                          </span>
                        )
                      )}

                      {project.port && (
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md border ${
                          isDark ? 'bg-[#141414] border-white/[0.08] text-blue-400' : 'bg-slate-100 border-slate-200 text-blue-600'
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
                  {isArchived ? (
                    <button
                      type="button"
                      onClick={() => handleToggleArchiveSingle(project, false)}
                      className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                      title={language === 'es' ? 'Restaurar y mostrar en panel principal' : 'Restore and display in main dashboard'}
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>{language === 'es' ? 'Restaurar' : 'Restore'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleToggleArchiveSingle(project, true)}
                      className="px-2.5 py-1.5 rounded-xl border text-xs font-bold text-amber-400 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20 transition-all flex items-center gap-1 cursor-pointer"
                      title={language === 'es' ? 'Archivar u ocultar del panel principal' : 'Archive or hide from main dashboard'}
                    >
                      <Archive className="h-3.5 w-3.5" />
                      <span>{t.archive || 'Archive'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onOpenFolder && onOpenFolder(project.path)}
                    className={`p-2 rounded-xl border transition-all cursor-pointer ${
                      isDark ? 'border-white/[0.08] bg-[#252525] text-slate-300 hover:text-white hover:bg-[#303030]' : 'border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900'
                    }`}
                    title={language === 'es' ? 'Abrir carpeta en el Explorador de archivos' : 'Open folder in File Explorer'}
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteSingle(project)}
                    className="p-2 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition-all cursor-pointer"
                    title={t.delete || 'Delete'}
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
  );
}
