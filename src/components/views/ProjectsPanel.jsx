import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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

export default function ProjectsPanel({
  projects = [],
  onAddProject,
  onToggleProject,
  onOpenBrowser,
  onOpenEditor,
  onRemoveProject,
  onUpdatePort,
  onToggleLogs,
  onSelectProjectDetail,
  activeLogsProject,
  theme
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [portStatus, setPortStatus] = useState({});

  const isDark = theme === 'dark';

  useEffect(() => {
    projects.forEach((p) => {
      checkPort(p.id, p.port);
    });
  }, [projects]);

  const checkPort = async (projectId, port) => {
    if (window.electronAPI?.checkPort) {
      const busy = await window.electronAPI.checkPort(port);
      setPortStatus((prev) => ({ ...prev, [projectId]: busy }));
    }
  };

  const handlePortChange = async (projectId, newPort) => {
    const portNum = parseInt(newPort, 10);
    if (onUpdatePort) onUpdatePort(projectId, portNum);
    checkPort(projectId, portNum);
  };

  const handleAutoAssignFreePort = async (projectId, currentPort) => {
    if (window.electronAPI) {
      const freePort = await window.electronAPI.findFreePort(currentPort || 3000);
      if (onUpdatePort) onUpdatePort(projectId, freePort);
      checkPort(projectId, freePort);
    } else {
      if (onUpdatePort) onUpdatePort(projectId, 5173);
    }
  };

  const copyPath = (id, pathStr) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(pathStr || '');
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.path.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            Gestor Completo de Proyectos
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Administra tus repositorios, comandos de arranque, puertos y vistas previas.
          </p>
        </div>

        <button
          onClick={onAddProject}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-3 rounded-2xl flex items-center space-x-2 shadow-md shadow-blue-600/20 hover:shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-all text-xs cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Importar Carpeta de Proyecto</span>
        </button>
      </div>

      {/* Search Filter Bar */}
      <div className="flex items-center space-x-3">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre o ruta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full border rounded-2xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 font-sans transition-all ${
              isDark ? 'bg-[#12141F] border-white/[0.08] text-[#F3F4F6] placeholder-slate-500' : 'bg-white border-slate-200 text-slate-800'
            }`}
          />
        </div>
      </div>

      {/* Projects List */}
      {filteredProjects.length === 0 ? (
        <div className={`text-center py-20 rounded-3xl border space-y-4 ${
          isDark ? 'bg-[#12141F] border-white/[0.08]' : 'bg-white border-slate-200'
        }`}>
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
            <FolderPlus className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>No se encontraron proyectos</h3>
            <p className="text-xs text-slate-400">Haz clic en el botón superior para importar una carpeta de tu equipo</p>
          </div>
          <button
            onClick={onAddProject}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md shadow-blue-600/20 hover:shadow-[0_0_15px_rgba(37,99,235,0.35)] transition-all cursor-pointer"
          >
            + Importar Primer Proyecto
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
                        : isDark ? 'bg-[#181B28] border-white/[0.08] text-[#94A3B8]' : 'bg-slate-100 border-slate-200 text-slate-600'
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
                            : isDark ? 'bg-[#181B28] text-[#94A3B8] border-white/[0.08]' : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
                          {isRunning ? 'RUNNING' : 'STOPPED'}
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
                        Entorno Dual: Backend ({project.backend?.techStack || 'API'})
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
                      <span>{isRunning ? 'Detener' : 'Arrancar'}</span>
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
                        isDark ? 'bg-[#181B28] border-white/[0.08] text-[#F3F4F6] hover:bg-[#1E2235] hover:border-white/[0.16]' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                      title="Abrir en Navegador"
                    >
                      <Globe className="h-3.5 w-3.5 text-blue-400" />
                      <span>{projectUrl}</span>
                    </button>

                    <button
                      onClick={() => onOpenEditor(project.path)}
                      className={`text-xs py-1.5 px-3 rounded-xl border font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                        isDark ? 'bg-[#181B28] border-white/[0.08] text-[#F3F4F6] hover:bg-[#1E2235] hover:border-white/[0.16]' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                      title="Abrir en VS Code / Editor"
                    >
                      <FolderOpen className="h-3.5 w-3.5 text-slate-400" />
                      <span>Abrir Editor</span>
                    </button>

                    <button
                      onClick={() => onToggleLogs(project.id)}
                      className={`text-xs py-1.5 px-3 rounded-xl border font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                        activeLogsProject === project.id
                          ? 'bg-blue-600 text-white border-blue-600 shadow-[0_0_12px_rgba(59,130,246,0.25)]'
                          : isDark ? 'bg-[#181B28] border-white/[0.08] text-[#F3F4F6] hover:bg-[#1E2235] hover:border-white/[0.16]' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                      title="Ver Logs en Vivo"
                    >
                      <Terminal className="h-3.5 w-3.5 text-slate-400" />
                      <span>Logs</span>
                    </button>
                  </div>

                  {/* Port Config and Trash */}
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1 text-xs font-mono">
                      <span className="text-slate-500">Puerto:</span>
                      <input
                        type="number"
                        value={project.port}
                        onChange={(e) => handlePortChange(project.id, e.target.value)}
                        className={`w-16 border rounded-lg px-2 py-1 font-bold text-center focus:outline-none transition-all ${
                          isDark ? 'bg-[#12141F] border-white/[0.08] text-white focus:border-blue-500' : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      />
                      {isBusy && (
                        <button
                          onClick={() => handleAutoAssignFreePort(project.id, project.port)}
                          className="text-amber-500 hover:text-amber-600 p-1"
                          title="Puerto ocupado. Haz clic para auto-asignar puerto libre"
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => onRemoveProject(project.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                      title="Eliminar de proyectos"
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
    </div>
  );
}
