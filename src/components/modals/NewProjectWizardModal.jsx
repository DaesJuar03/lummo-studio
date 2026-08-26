import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  FolderPlus, 
  Folder, 
  Terminal, 
  Check, 
  AlertCircle, 
  Layers, 
  Code, 
  Play, 
  Zap,
  ArrowRight,
  Server,
  FileCode,
  Globe,
  Plus
} from 'lucide-react';

const TEMPLATES = [
  {
    id: 'vite-react',
    name: 'Vite + React',
    category: 'Frontend',
    desc: 'Aplicación React 19 ultra-rápida con Vite y hot module reloading.',
    badge: 'Popular',
    icon: 'react',
    defaultPort: 5173
  },
  {
    id: 'vite-react-ts',
    name: 'Vite + React (TypeScript)',
    category: 'Frontend',
    desc: 'React con tipado estricto TypeScript y configuración moderna.',
    badge: 'TypeScript',
    icon: 'react',
    defaultPort: 5173
  },
  {
    id: 'nextjs',
    name: 'Next.js (App Router)',
    category: 'Fullstack',
    desc: 'Framework React con Server Components y renderizado híbrido.',
    badge: 'Fullstack',
    icon: 'next',
    defaultPort: 3000
  },
  {
    id: 'express-api',
    name: 'Node.js + Express REST API',
    category: 'Backend',
    desc: 'Servidor API REST liviano con Express, CORS y soporte para variables .env.',
    badge: 'Backend',
    icon: 'node',
    defaultPort: 5000
  },
  {
    id: 'python-fastapi',
    name: 'Python FastAPI',
    category: 'Backend',
    desc: 'Microservicio API en Python de alto rendimiento con Uvicorn.',
    badge: 'Python',
    icon: 'python',
    defaultPort: 8000
  },
  {
    id: 'html-static',
    name: 'Sitio Web HTML5 + CSS3',
    category: 'Estático',
    desc: 'Estructura web estática clásica sin dependencias pesadas.',
    badge: 'Ligero',
    icon: 'html',
    defaultPort: 8080
  }
];

export default function NewProjectWizardModal({
  isOpen,
  onClose,
  onProjectCreated,
  theme = 'dark'
}) {
  const [selectedTemplate, setSelectedTemplate] = useState('vite-react');
  const [projectName, setProjectName] = useState('mi-nuevo-proyecto');
  const [destinationFolder, setDestinationFolder] = useState('');
  const [packageManager, setPackageManager] = useState('npm');
  const [isCreating, setIsCreating] = useState(false);
  const [logs, setLogs] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdPath, setCreatedPath] = useState('');

  const isDark = theme === 'dark';

  useEffect(() => {
    if (!isOpen) {
      setLogs([]);
      setErrorMsg('');
      setIsSuccess(false);
      setIsCreating(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !window.electronAPI?.onScaffoldProgress) return;
    const unsub = window.electronAPI.onScaffoldProgress(({ message }) => {
      setLogs(prev => [...prev, message]);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectDestination = async () => {
    if (window.electronAPI?.selectFolder) {
      const folder = await window.electronAPI.selectFolder();
      if (folder) {
        setDestinationFolder(folder);
      }
    }
  };

  const handleCreate = async () => {
    if (!projectName.trim()) {
      setErrorMsg('Por favor especifica un nombre para el proyecto.');
      return;
    }
    if (!destinationFolder.trim()) {
      setErrorMsg('Por favor selecciona una carpeta de destino para el proyecto.');
      return;
    }

    setErrorMsg('');
    setIsCreating(true);
    setLogs([`[Lummo Wizard] Iniciando creación de proyecto...`]);

    try {
      if (window.electronAPI?.scaffoldProject) {
        const res = await window.electronAPI.scaffoldProject({
          template: selectedTemplate,
          projectName: projectName.trim(),
          targetDirectory: destinationFolder,
          packageManager
        });

        if (res && res.success) {
          setIsSuccess(true);
          setCreatedPath(res.projectPath);
          setLogs(prev => [...prev, `\n✨ ¡Proyecto creado exitosamente en: ${res.projectPath}!`]);
        } else {
          setErrorMsg(res?.error || 'No se pudo crear el proyecto.');
        }
      } else {
        setTimeout(() => {
          setIsSuccess(true);
          setCreatedPath(`${destinationFolder}/${projectName}`);
          setLogs(prev => [...prev, '✨ ¡Proyecto simulado con éxito!']);
        }, 1500);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error inesperado al crear el proyecto.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleFinishAndOpen = () => {
    if (createdPath && typeof onProjectCreated === 'function') {
      onProjectCreated(createdPath);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className={`w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${
          isDark ? 'bg-[#18181b] border-[#27272a] text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDark ? 'border-[#27272a] bg-[#202024]' : 'border-slate-100 bg-slate-50'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shadow-md shadow-blue-500/10">
              <FolderPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight">
                Asistente de Nuevos Proyectos (Scaffolding Wizard)
              </h2>
              <p className="text-xs text-slate-400">
                Crea un proyecto moderno desde cero con plantillas oficiales listas para desarrollo.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isCreating}
            className={`p-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-[#27272a] text-slate-400' : 'hover:bg-slate-200 text-slate-500'
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {!isSuccess ? (
            <>
              {/* Step 1: Select Template */}
              <div className="space-y-3">
                <label className="text-xs font-extrabold uppercase tracking-wider text-blue-500 flex items-center space-x-2">
                  <Layers className="h-4 w-4" />
                  <span>1. Selecciona la Plantilla del Proyecto</span>
                </label>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {TEMPLATES.map((tmpl) => {
                    const isSelected = selectedTemplate === tmpl.id;
                    return (
                      <div
                        key={tmpl.id}
                        onClick={() => setSelectedTemplate(tmpl.id)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all relative flex flex-col justify-between ${
                          isSelected
                            ? isDark
                              ? 'bg-blue-600/10 border-blue-500 shadow-md shadow-blue-500/10 ring-1 ring-blue-500'
                              : 'bg-blue-50 border-blue-500 shadow-md ring-1 ring-blue-500'
                            : isDark
                            ? 'bg-[#202024] border-[#27272a] hover:border-slate-600'
                            : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              {tmpl.badge}
                            </span>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                                <Check className="h-3 w-3" />
                              </div>
                            )}
                          </div>
                          <h4 className="text-sm font-bold text-slate-100 mb-1">{tmpl.name}</h4>
                          <p className="text-[11px] text-slate-400 leading-relaxed">{tmpl.desc}</p>
                        </div>
                        <div className="mt-3 pt-2 border-t border-slate-700/40 text-[10px] font-mono text-slate-500 flex items-center justify-between">
                          <span>Puerto: :{tmpl.defaultPort}</span>
                          <span>{tmpl.category}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Configuration Fields */}
              <div className="space-y-4 pt-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-blue-500 flex items-center space-x-2">
                  <Terminal className="h-4 w-4" />
                  <span>2. Configuración y Directorio Destino</span>
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Project Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Nombre del Proyecto / Carpeta</label>
                    <input
                      type="text"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="mi-proyecto"
                      disabled={isCreating}
                      className={`w-full px-3 py-2 text-xs font-mono rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDark ? 'bg-[#202024] border-[#27272a] text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>

                  {/* Package Manager */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Gestor de Paquetes</label>
                    <div className="flex items-center space-x-2">
                      {['npm', 'pnpm', 'yarn', 'bun'].map((pm) => (
                        <button
                          key={pm}
                          type="button"
                          onClick={() => setPackageManager(pm)}
                          disabled={isCreating}
                          className={`flex-1 py-2 text-xs font-mono font-bold rounded-xl border transition-all ${
                            packageManager === pm
                              ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                              : isDark
                              ? 'bg-[#202024] border-[#27272a] text-slate-400 hover:text-slate-200'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {pm}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Destination Parent Folder */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Carpeta Contenedora de Destino</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={destinationFolder}
                      readOnly
                      placeholder="Selecciona la carpeta donde se creará el proyecto..."
                      className={`flex-1 px-3 py-2 text-xs font-mono rounded-xl border focus:outline-none ${
                        isDark ? 'bg-[#202024] border-[#27272a] text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleSelectDestination}
                      disabled={isCreating}
                      className={`px-4 py-2 text-xs font-bold rounded-xl border flex items-center space-x-2 transition-all ${
                        isDark
                          ? 'bg-[#27272a] hover:bg-[#323238] border-[#3f3f46] text-white'
                          : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                      }`}
                    >
                      <Folder className="h-4 w-4 text-blue-400" />
                      <span>Examinar...</span>
                    </button>
                  </div>
                  {destinationFolder && projectName && (
                    <p className="text-[11px] font-mono text-slate-500 pt-0.5">
                      Ruta final: <span className="text-blue-400">{destinationFolder}\{projectName.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase()}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Error Display */}
              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center space-x-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Creation Terminal Logs Stream */}
              {isCreating && (
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-bold text-slate-300 flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
                    <span>Progreso de Creación en Tiempo Real</span>
                  </label>
                  <div className="h-40 bg-black/90 text-emerald-400 font-mono text-[11px] p-3.5 rounded-xl border border-slate-800 overflow-y-auto custom-scrollbar whitespace-pre-wrap leading-relaxed">
                    {logs.map((l, idx) => (
                      <div key={idx}>{l}</div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Success View */
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                <Check className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-extrabold text-white">¡Proyecto Creado con Éxito!</h3>
                <p className="text-xs text-slate-400 max-w-md">
                  El proyecto se ha generado y configurado correctamente en tu equipo.
                </p>
                <div className="mt-3 p-2.5 rounded-xl bg-[#202024] border border-[#27272a] text-xs font-mono text-blue-400 break-all max-w-lg">
                  {createdPath}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className={`px-6 py-4 border-t flex items-center justify-between ${
          isDark ? 'border-[#27272a] bg-[#202024]' : 'border-slate-100 bg-slate-50'
        }`}>
          <button
            onClick={onClose}
            disabled={isCreating}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors ${
              isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isSuccess ? 'Cerrar' : 'Cancelar'}
          </button>

          {!isSuccess ? (
            <button
              onClick={handleCreate}
              disabled={isCreating}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              {isCreating ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Creando Proyecto...</span>
                </>
              ) : (
                <>
                  <span>Crear e Importar Proyecto</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleFinishAndOpen}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center space-x-2 cursor-pointer"
            >
              <Zap className="h-4 w-4" />
              <span>Abrir en Lummo Studio</span>
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
