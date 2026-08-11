import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FolderPlus, UploadCloud, Folder, CheckCircle } from 'lucide-react';
import { getTranslations } from '../locales';

export default function ImportProjectModal({
  isOpen,
  onClose,
  onImportFolder,
  theme,
  language = 'es'
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [detectedFolder, setDetectedFolder] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);

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
      // Fallback demo for web preview
      processFolderPath('C:\\Proyectos\\mi-nuevo-proyecto');
    }
  };

  const processFolderPath = async (folderPath) => {
    setIsDetecting(true);
    let detectedInfo = { name: 'mi-proyecto', techStack: 'Vite + React', defaultPort: 5173 };

    if (window.electronAPI?.detectProject) {
      detectedInfo = await window.electronAPI.detectProject(folderPath);
    }

    setDetectedFolder({
      path: folderPath,
      name: detectedInfo.name || 'proyecto-local',
      techStack: detectedInfo.techStack || 'Web Project',
      port: detectedInfo.defaultPort || 3000
    });
    setIsDetecting(false);
  };

  const handleConfirmImport = () => {
    if (detectedFolder && onImportFolder) {
      onImportFolder(detectedFolder.path);
      setDetectedFolder(null);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={onClose}
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
          {/* Modal Header */}
          <div className={`px-6 py-4 border-b flex items-center justify-between ${
            isDark ? 'bg-[#181818] border-[#2a2a2a]' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <FolderPlus className="h-5 w-5" />
              </div>
              <div>
                <h3 className={`font-extrabold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Importar Proyecto Local
                </h3>
                <p className="text-xs text-slate-500">Arrastra tu carpeta o selecciónala con el explorador</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className={`p-1.5 rounded-xl transition-colors ${
                isDark ? 'text-[#a1a1aa] hover:text-white hover:bg-[#282828]' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
              }`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Modal Body: Drag & Drop Zone */}
          <div className="p-6 space-y-5">
            {!detectedFolder ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`p-8 rounded-3xl border-2 border-dashed text-center transition-all cursor-pointer space-y-4 ${
                  isDragging
                    ? 'border-blue-500 bg-blue-500/10 scale-[1.01]'
                    : isDark
                    ? 'border-[#383838] bg-[#181818] hover:border-blue-500/60 hover:bg-[#202020]'
                    : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/30'
                }`}
                onClick={handleBrowseFolder}
              >
                <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center border transition-all ${
                  isDragging 
                    ? 'bg-blue-600 text-white border-blue-400' 
                    : isDark 
                    ? 'bg-[#252525] border-[#383838] text-blue-400' 
                    : 'bg-white border-slate-200 text-blue-600 shadow-sm'
                }`}>
                  <UploadCloud className="h-7 w-7" />
                </div>

                <div className="space-y-1">
                  <h4 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Arrastra y suelta tu carpeta aquí
                  </h4>
                  <p className="text-xs text-slate-500">
                    O haz clic en cualquier parte de este recuadro para abrir el buscador de archivos
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBrowseFolder();
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md shadow-blue-600/20 inline-flex items-center space-x-2 transition-all"
                  >
                    <Folder className="h-4 w-4" />
                    <span>Buscar Carpeta en tu Equipo</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Detected Folder Preview Box */
              <div className={`p-5 rounded-2xl border space-y-4 ${
                isDark ? 'bg-[#181818] border-[#2e2e2e]' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-500 flex items-center justify-center shrink-0">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className={`font-extrabold text-base truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {detectedFolder.name}
                      </h4>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-200">
                        {detectedFolder.techStack}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono truncate mt-0.5" title={detectedFolder.path}>
                      {detectedFolder.path}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/40">
                  <button
                    onClick={() => setDetectedFolder(null)}
                    className="text-xs text-slate-400 hover:text-slate-200 font-semibold"
                  >
                    Cambiar carpeta
                  </button>

                  <button
                    onClick={handleConfirmImport}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md shadow-blue-600/20 transition-all"
                  >
                    <span>Confirmar e Importar Proyecto</span>
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
