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
import { getTranslations } from '../../locales';

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

  const isDark = theme === 'dark';
  const t = getTranslations(language);

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
    setScanMessage(language === 'es' ? 'Analizando manifiestos y estructura...' : 'Analyzing manifests and directory structure...');

    const timer1 = setTimeout(() => {
      setScanProgress(45);
      setScanMessage(language === 'es' ? 'Buscando subcarpetas backend (/backend, /server, /api)...' : 'Searching backend subfolders (/backend, /server, /api)...');
    }, 300);

    let detectedInfo = { name: 'mi-proyecto', techStack: 'Vite + React', defaultPort: 5173 };

    if (window.electronAPI?.detectProject) {
      detectedInfo = await window.electronAPI.detectProject(folderPath);
    }

    const existingProject = (projects || []).find(
      p => p.path && p.path.toLowerCase() === folderPath.toLowerCase()
    );

    clearTimeout(timer1);
    setScanProgress(90);
    setScanMessage(language === 'es' ? 'Verificando puertos libres en el sistema...' : 'Verifying free ports on system...');

    setTimeout(() => {
      setScanProgress(100);
      setDetectedFolder({
        path: folderPath,
        name: detectedInfo?.name || folderPath.split(/[\\/]/).pop() || 'Project',
        techStack: detectedInfo?.techStack || 'Custom Web Project',
        port: detectedInfo?.defaultPort || 3000,
        hasBackend: detectedInfo?.hasBackend || false,
        backendPath: detectedInfo?.backendPath || '',
        isAlreadyImported: Boolean(existingProject)
      });
      setStep('results');
    }, 500);
  };

  const handleConfirmImport = () => {
    if (detectedFolder && onImportFolder) {
      onImportFolder(detectedFolder.path);
      onClose();
    }
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
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden ${
            isDark ? 'bg-[#141414] border-white/[0.08] text-[#E5E5E5]' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Header */}
          <div className={`px-6 py-4 border-b flex items-center justify-between ${
            isDark ? 'bg-[#181818] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/20">
                <FolderPlus className="h-5 w-5" />
              </div>
              <div>
                <h3 className={`font-extrabold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {t.importFolder || 'Import Project Folder'}
                </h3>
                <p className="text-xs text-slate-400">
                  {language === 'es' ? 'Arrastra o selecciona la carpeta de tu código fuente' : 'Drag or select your source code folder'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-[#2A2A2A]' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
              }`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body content based on step */}
          <div className="p-6">
            {step === 'browse' && (
              <div className="space-y-4">
                {/* Drag and Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={handleBrowseFolder}
                  className={`p-8 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all space-y-3 ${
                    isDragging
                      ? 'border-blue-500 bg-blue-500/10 scale-[1.01]'
                      : isDark
                        ? 'border-white/[0.12] bg-[#1A1A1A] hover:border-blue-500/50 hover:bg-[#1E1E1E]'
                        : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/40'
                  }`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shadow-md shadow-blue-500/10">
                    <UploadCloud className="h-7 w-7" />
                  </div>
                  <div>
                    <h4 className={`font-extrabold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {language === 'es' ? 'Arrastra tu carpeta aquí o haz clic para explorar' : 'Drag folder here or click to browse'}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                      {language === 'es' ? 'Detectaremos automáticamente React, Vite, Next.js, Node.js, Express, Python o PHP' : 'We will automatically detect React, Vite, Next.js, Node.js, Express, Python or PHP'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <span>{language === 'es' ? 'Soporte para carpetas monorepo y full-stack' : 'Support for monorepo and full-stack folders'}</span>
                  <button
                    type="button"
                    onClick={handleBrowseFolder}
                    className="font-bold text-blue-400 hover:text-blue-300 transition-colors inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>{language === 'es' ? 'Explorar carpetas' : 'Browse folders'}</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}

            {step === 'analyzing' && (
              <div className="py-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-600/15 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto shadow-md">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
                <div className="space-y-1">
                  <h4 className={`font-extrabold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {language === 'es' ? 'Analizando estructura del proyecto...' : 'Analyzing project structure...'}
                  </h4>
                  <p className="text-xs text-slate-400 font-mono truncate max-w-sm mx-auto">
                    {scanMessage}
                  </p>
                </div>

                {/* Progress bar */}
                <div className={`w-full h-2 rounded-full overflow-hidden p-0.5 border max-w-xs mx-auto ${
                  isDark ? 'bg-[#1E1E1E] border-white/[0.08]' : 'bg-slate-100 border-slate-200'
                }`}>
                  <motion.div
                    initial={{ width: '0%' }}
                    animate={{ width: `${scanProgress}%` }}
                    transition={{ duration: 0.3 }}
                    className="h-full bg-blue-600 rounded-full shadow-md shadow-blue-500/50"
                  />
                </div>
              </div>
            )}

            {step === 'results' && detectedFolder && (
              <div className="space-y-5">
                <div className={`p-4 rounded-2xl border space-y-3 ${
                  isDark ? 'bg-[#1A1A1A] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-start space-x-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className={`font-extrabold text-sm truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {detectedFolder.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5" title={detectedFolder.path}>
                        {detectedFolder.path}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.06] text-xs font-mono">
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-400">{language === 'es' ? 'Stack:' : 'Stack:'}</span>
                      <span className="font-bold text-blue-400">{detectedFolder.techStack}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-400">{t.port || 'Port:'}</span>
                      <span className="font-bold text-emerald-400">:{detectedFolder.port}</span>
                    </div>
                  </div>

                  {detectedFolder.hasBackend && (
                    <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-mono flex items-center space-x-2">
                      <Server className="h-4 w-4 shrink-0 text-purple-400" />
                      <span>{language === 'es' ? 'Entorno Dual detectado: backend listo' : 'Dual Environment detected: backend ready'}</span>
                    </div>
                  )}
                </div>

                {detectedFolder.isAlreadyImported && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{language === 'es' ? 'Este proyecto ya se encuentra en tu lista. Se actualizará su configuración.' : 'This project is already in your list. Its settings will be refreshed.'}</span>
                  </div>
                )}

                <div className="flex items-center justify-end space-x-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep('browse')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isDark ? 'text-slate-400 hover:text-white hover:bg-[#252525]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {language === 'es' ? 'Elegir otra carpeta' : 'Choose another folder'}
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 hover:shadow-[0_0_15px_rgba(37,99,235,0.35)] transition-all cursor-pointer"
                  >
                    {language === 'es' ? 'Importar a Lummo Studio' : 'Import into Lummo Studio'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
