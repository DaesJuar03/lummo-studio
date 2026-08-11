import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Globe, 
  Play, 
  Square, 
  ExternalLink, 
  Code, 
  Terminal, 
  Layers, 
  Copy, 
  Check, 
  RefreshCw, 
  Folder,
  Eye
} from 'lucide-react';

export default function ProjectDetailModal({
  project,
  onClose,
  onToggleProject,
  onOpenBrowser,
  onOpenEditor,
  onOpenLogs,
  onUpdatePort,
  onUpdateCommand
}) {
  const [activeSubTab, setActiveSubTab] = useState(project.status === 'RUNNING' ? 'preview' : 'details');
  const [iframeKey, setIframeKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const [customCommand, setCustomCommand] = useState(project.command || '');

  if (!project) return null;

  const isRunning = project.status === 'RUNNING';

  const handleCopyPath = () => {
    navigator.clipboard.writeText(project.path);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveCommand = () => {
    if (onUpdateCommand) onUpdateCommand(project.id, customCommand);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          className="bg-white w-full max-w-4xl h-[620px] rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Modal Header */}
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-extrabold text-slate-900 text-lg">{project.name}</h3>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    {project.techStack}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono truncate max-w-md">{project.path}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 ${
                isRunning ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                {isRunning ? `Running on :${project.port}` : 'Stopped'}
              </span>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              >
                <X className="h-5 w-5" />
              </motion.button>
            </div>
          </div>

          {/* Sub-tabs Navigation */}
          <div className="px-6 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2">
              {isRunning && (
                <button
                  onClick={() => setActiveSubTab('preview')}
                  className={`flex items-center space-x-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeSubTab === 'preview'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Vista Previa en Vivo</span>
                </button>
              )}

              <button
                onClick={() => setActiveSubTab('details')}
                className={`flex items-center space-x-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeSubTab === 'details'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                <Globe className="h-3.5 w-3.5" />
                <span>Detalles y Configuración</span>
              </button>
            </div>

            {/* Quick Action Toolbar */}
            <div className="flex items-center space-x-2">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => onToggleProject(project)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 text-white transition-all shadow-sm ${
                  isRunning ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isRunning ? <Square className="h-3.5 w-3.5 fill-white" /> : <Play className="h-3.5 w-3.5 fill-white" />}
                <span>{isRunning ? 'Detener' : 'Arrancar'}</span>
              </motion.button>

              <button
                onClick={() => onOpenBrowser(`http://localhost:${project.port}`)}
                disabled={!isRunning}
                className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:text-blue-600 hover:bg-slate-50 transition-all disabled:opacity-30"
                title="Abrir en Navegador Web"
              >
                <ExternalLink className="h-4 w-4" />
              </button>

              <button
                onClick={() => onOpenEditor(project.path)}
                className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:text-blue-600 hover:bg-slate-50 transition-all"
                title="Abrir en VS Code"
              >
                <Code className="h-4 w-4" />
              </button>

              <button
                onClick={() => onOpenLogs(project)}
                className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:text-blue-600 hover:bg-slate-50 transition-all"
                title="Abrir Consola de Logs"
              >
                <Terminal className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Modal Body Content */}
          <div className="flex-1 overflow-hidden bg-slate-50">
            {/* View 1: Live Web Preview inside iframe */}
            {activeSubTab === 'preview' && isRunning && (
              <div className="w-full h-full flex flex-col">
                <div className="px-4 py-2 bg-slate-200/80 border-b border-slate-300 flex items-center justify-between text-xs font-mono text-slate-700">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setIframeKey(prev => prev + 1)}
                      className="p-1 rounded hover:bg-slate-300 text-slate-600"
                      title="Recargar vista previa"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                    <span className="font-semibold text-blue-700">http://localhost:{project.port}</span>
                  </div>
                  <span className="text-[11px] text-slate-500">Embedded Web Preview</span>
                </div>

                <iframe
                  key={iframeKey}
                  src={`http://localhost:${project.port}`}
                  title={project.name}
                  className="w-full flex-1 bg-white border-0"
                />
              </div>
            )}

            {/* View 2: Project Details & Configurations */}
            {activeSubTab === 'details' && (
              <div className="p-6 overflow-y-auto h-full space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* General Info */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
                    <h4 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">Información del Repositorio</h4>
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Ruta de la Carpeta:</span>
                        <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-200 font-mono mt-1">
                          <span className="truncate max-w-[240px] text-slate-800">{project.path}</span>
                          <button onClick={handleCopyPath} className="text-slate-400 hover:text-slate-700">
                            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="pt-2">
                        <span className="text-slate-400 block text-[11px]">Tecnología Detectada:</span>
                        <span className="font-bold text-blue-600 text-sm mt-0.5 block">{project.techStack}</span>
                      </div>
                    </div>
                  </div>

                  {/* Server Command & Port Config */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
                    <h4 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">Configuración de Ejecución</h4>
                    
                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="text-slate-600 font-semibold block mb-1">Comando de Inicio:</label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={customCommand}
                            onChange={(e) => setCustomCommand(e.target.value)}
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                          />
                          <button
                            onClick={handleSaveCommand}
                            className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl text-xs"
                          >
                            Guardar
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-slate-600 font-semibold block mb-1">Puerto de Escucha:</label>
                        <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                          <span className="font-mono text-slate-500">http://localhost:</span>
                          <input
                            type="number"
                            value={project.port}
                            disabled={isRunning}
                            onChange={(e) => onUpdatePort(project.id, parseInt(e.target.value, 10))}
                            className="w-20 bg-transparent text-xs font-mono font-bold text-blue-600 focus:outline-none disabled:opacity-60"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-all"
            >
              Cerrar
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
