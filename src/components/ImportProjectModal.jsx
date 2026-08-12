import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  FolderPlus, 
  UploadCloud, 
  Folder, 
  CheckCircle, 
  RefreshCw, 
  Server, 
  Layers, 
  Search, 
  ArrowRight, 
  AlertTriangle
} from 'lucide-react';
import { getTranslations } from '../locales';

export default function ImportProjectModal({
  isOpen,
  onClose,
  onImportFolder,
  projects = [],
  theme,
  language = 'es'
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [step, setStep] = useState('browse'); // 'browse' | 'analyzing' | 'results'
  const [scanProgress, setScanProgress] = useState(0);
  const [scanMessage, setScanMessage] = useState('');
  const [targetPath, setTargetPath] = useState('');
  const [detectedFolder, setDetectedFolder] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setStep('browse');
      setDetectedFolder(null);
      setScanProgress(0);
      setScanMessage('');
      setTargetPath('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isDark = theme === 'dark';
  const t = getTranslations(language);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const folderPath = files[0].path;
      if (folderPath) {
        processFolderPath(folderPath);
      }
    }
  };

  const handleBrowseFolder = async () => {
    if (window.electronAPI) {
      const folderPath = await window.electronAPI.selectFolder();
      if (folderPath) {
        processFolderPath(folderPath);
      }
    } else {
      processFolderPath('C:\\Proyectos\\mi-nuevo-proyecto');
    }
  };

  const processFolderPath = async (folderPath) => {
    setTargetPath(folderPath);
    setStep('analyzing');
    setScanProgress(15);
    setScanMessage('Analizando manifiestos y estructura...');

    const timer1 = setTimeout(() => {
      setScanProgress(45);
      setScanMessage('Buscando subcarpetas backend (/backend, /server, /api)...');
    }, 300);

    let detectedInfo = { name: 'mi-proyecto', techStack: 'Vite + React', defaultPort: 5173 };

    if (window.electronAPI?.detectProject) {
      detectedInfo = await window.electronAPI.detectProject(folderPath);
    }

    const existingProject = (projects || []).find(
      p => p.path === folderPath || (p.path && p.path.toLowerCase() === folderPath.toLowerCase())
    );

    const timer2 = setTimeout(() => {
      setScanProgress(80);
      setScanMessage('Verificando variables .env y puertos...');
    }, 600);

    const timer3 = setTimeout(() => {
      setScanProgress(100);
      setScanMessage('Análisis completado');

      setDetectedFolder({
        path: folderPath,
        name: detectedInfo.name || 'proyecto-local',
        techStack: detectedInfo.techStack || 'Web Project',
        port: existingProject ? existingProject.port : (detectedInfo.defaultPort || 3000),
        hasBackend: detectedInfo.hasBackend || false,
        backend: detectedInfo.backend || null,
        dualLabel: detectedInfo.dualLabel || null,
        envApiUrl: detectedInfo.envApiUrl || null,
        isAlreadyImported: Boolean(existingProject),
        existingProject
      });

      setStep('results');
    }, 900);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  };

  const handleConfirmImport = () => {
    if (detectedFolder && onImportFolder) {
      onImportFolder(detectedFolder.path);
      setDetectedFolder(null);
      setStep('browse');
      onClose();
    }
  };

  const handleResetScan = () => {
    setStep('browse');
    setDetectedFolder(null);
    setScanProgress(0);
    setScanMessage('');
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden ${
            isDark ? 'bg-[#181818] border-[#2a2a2a] text-[#e4e4e7]' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Header */}
          <div className={`px-5 py-3.5 border-b flex items-center justify-between ${
            isDark ? 'bg-[#141414] border-[#262626]' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                {step === 'analyzing' ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : step === 'results' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <FolderPlus className="h-4 w-4" />
                )}
              </div>
              <div>
                <h3 className={`font-semibold text-sm tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {step === 'analyzing'
                    ? 'Analizando proyecto'
                    : step === 'results'
                    ? 'Diagnóstico completado'
                    : 'Importar proyecto local'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {step === 'analyzing'
                    ? 'Escaneando manifiestos y estructura dual'
                    : step === 'results'
                    ? 'Revisa la arquitectura detectada'
                    : 'Selecciona o arrastra tu carpeta'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-[#262626]' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
              }`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5">
            {/* STEP 1: BROWSE */}
            {step === 'browse' && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`p-7 rounded-xl border border-dashed text-center transition-all cursor-pointer space-y-3.5 ${
                  isDragging
                    ? 'border-blue-500 bg-blue-500/5 scale-[1.005]'
                    : isDark
                    ? 'border-[#333333] bg-[#141414] hover:border-blue-500/50 hover:bg-[#1a1a1a]'
                    : 'border-slate-300 bg-slate-50/50 hover:border-blue-400 hover:bg-blue-50/20'
                }`}
                onClick={handleBrowseFolder}
              >
                <div className={`w-12 h-12 rounded-xl mx-auto flex items-center justify-center border transition-all ${
                  isDragging 
                    ? 'bg-blue-600 text-white border-blue-400' 
                    : isDark 
                    ? 'bg-[#222222] border-[#333333] text-blue-400' 
                    : 'bg-white border-slate-200 text-blue-600 shadow-2xs'
                }`}>
                  <UploadCloud className="h-6 w-6" />
                </div>

                <div className="space-y-1">
                  <h4 className={`font-semibold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Arrastra y suelta tu carpeta aquí
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    O haz clic para abrir el navegador de archivos
                  </p>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBrowseFolder();
                    }}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs px-4 py-2 rounded-xl shadow-2xs inline-flex items-center space-x-1.5 transition-all cursor-pointer"
                  >
                    <Folder className="h-3.5 w-3.5" />
                    <span>Buscar carpeta</span>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: ANALYZING */}
            {step === 'analyzing' && (
              <div className={`p-6 rounded-xl border text-center space-y-5 ${
                isDark ? 'bg-[#141414] border-[#262626]' : 'bg-slate-50/50 border-slate-200/80'
              }`}>
                <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-blue-500/20 animate-ping"></div>
                  <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/30 text-blue-500 flex items-center justify-center">
                    <Search className="h-5 w-5 animate-pulse" />
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className={`font-semibold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Escaneando estructura del proyecto
                  </h4>
                  <p className="text-[11px] text-slate-400 font-mono truncate max-w-sm mx-auto" title={targetPath}>
                    {targetPath}
                  </p>
                </div>

                <div className="space-y-1.5 max-w-xs mx-auto">
                  <div className="w-full h-1.5 rounded-full bg-slate-700/30 overflow-hidden">
                    <motion.div
                      className="h-full bg-blue-500 rounded-full"
                      initial={{ width: '0%' }}
                      animate={{ width: `${scanProgress}%` }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>
                  <p className="text-[10px] font-mono text-blue-400 font-medium animate-pulse">
                    {scanMessage}
                  </p>
                </div>
              </div>
            )}

            {/* STEP 3: RESULTS */}
            {step === 'results' && detectedFolder && (
              <div className="space-y-4">

                {/* Duplicate Warning Banner */}
                {detectedFolder.isAlreadyImported && (
                  <div className={`p-3.5 rounded-xl border flex items-start space-x-2.5 ${
                    isDark ? 'bg-amber-500/10 border-amber-500/25 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}>
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="space-y-0.5 text-xs min-w-0">
                      <h5 className="font-semibold text-amber-400">
                        Proyecto previamente importado
                      </h5>
                      <p className="text-amber-300/80 text-[11px] leading-normal">
                        Esta carpeta ya existe en tu lista. Confirmar actualizará su configuración manteniendo tus datos.
                      </p>
                    </div>
                  </div>
                )}

                {/* Dual Environment Card */}
                {detectedFolder.hasBackend ? (
                  <div className={`p-4 rounded-xl border space-y-3 ${
                    isDark ? 'bg-[#141414] border-purple-500/20' : 'bg-purple-50/40 border-purple-200/80'
                  }`}>
                    <div className="flex items-center justify-between border-b pb-2.5 border-purple-500/15">
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
                          <Server className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <h4 className={`font-semibold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            Entorno Dual Detectado
                          </h4>
                          <p className="text-[10px] text-purple-400">
                            Frontend + Backend identificados
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded border bg-purple-500/10 text-purple-400 border-purple-500/20">
                        Entorno Dual
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 text-xs">
                      {/* Frontend */}
                      <div className={`p-3 rounded-lg border space-y-1 ${
                        isDark ? 'bg-[#1c1c1c] border-[#282828]' : 'bg-white border-slate-200'
                      }`}>
                        <div className="flex items-center space-x-1.5 text-blue-400 font-medium text-[11px]">
                          <Layers className="h-3.5 w-3.5" />
                          <span>Frontend</span>
                        </div>
                        <p className={`font-semibold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {detectedFolder.techStack}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Puerto :{detectedFolder.port}
                        </p>
                      </div>

                      {/* Backend */}
                      <div className={`p-3 rounded-lg border space-y-1 ${
                        isDark ? 'bg-[#1c1c1c] border-[#282828]' : 'bg-white border-slate-200'
                      }`}>
                        <div className="flex items-center space-x-1.5 text-purple-400 font-medium text-[11px]">
                          <Server className="h-3.5 w-3.5" />
                          <span>Backend API</span>
                        </div>
                        <p className={`font-semibold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {detectedFolder.backend?.techStack || 'Servidor Backend'}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Puerto :{detectedFolder.backend?.defaultPort || 5000}
                        </p>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 font-mono truncate" title={detectedFolder.path}>
                      {detectedFolder.path}
                    </p>
                  </div>
                ) : (
                  /* Single Environment Card */
                  <div className={`p-4 rounded-xl border ${
                    isDark ? 'bg-[#141414] border-[#262626]' : 'bg-slate-50/50 border-slate-200/80'
                  }`}>
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                        <CheckCircle className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className={`font-semibold text-xs truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {detectedFolder.name}
                          </h4>
                          <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded border bg-blue-500/10 text-blue-400 border-blue-500/20">
                            {detectedFolder.techStack}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5" title={detectedFolder.path}>
                          {detectedFolder.path}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bottom Actions */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/40">
                  <button
                    onClick={handleResetScan}
                    className="text-xs text-slate-400 hover:text-slate-200 font-medium cursor-pointer transition-colors"
                  >
                    Escanear otra carpeta
                  </button>

                  {detectedFolder.isAlreadyImported ? (
                    <button
                      onClick={handleConfirmImport}
                      className="bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs px-4 py-2 rounded-xl shadow-2xs transition-all cursor-pointer flex items-center space-x-1.5"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Reemplazar proyecto</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleConfirmImport}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs px-4 py-2 rounded-xl shadow-2xs transition-all cursor-pointer flex items-center space-x-1.5"
                    >
                      <span>Confirmar e importar</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
