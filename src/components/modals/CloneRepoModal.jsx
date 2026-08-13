import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, GitBranch, Folder, Download, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { getTranslations } from '../../locales';

export default function CloneRepoModal({
  isOpen,
  onClose,
  onImportFolder,
  theme,
  language = 'es'
}) {
  const [repoUrl, setRepoUrl] = useState('');
  const [destinationFolder, setDestinationFolder] = useState('');
  const [isCloning, setIsCloning] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const isDark = theme === 'dark';
  const t = getTranslations(language);

  useEffect(() => {
    if (!isOpen) {
      setRepoUrl('');
      setDestinationFolder('');
      setIsCloning(false);
      setProgressPercent(0);
      setStatusText('');
      setErrorMessage('');
      return;
    }

    if (window.electronAPI?.onCloneProgress) {
      const unsubscribe = window.electronAPI.onCloneProgress(({ percentage, statusText }) => {
        setProgressPercent(percentage || 0);
        if (statusText) setStatusText(statusText);
      });
      return () => unsubscribe();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectDestination = async () => {
    if (window.electronAPI) {
      const folderPath = await window.electronAPI.selectFolder();
      if (folderPath) {
        setDestinationFolder(folderPath);
      }
    } else {
      setDestinationFolder('C:\\Proyectos\\Clonados');
    }
  };

  const handleCancel = async () => {
    if (isCloning && window.electronAPI?.cancelCloneRepository) {
      try {
        await window.electronAPI.cancelCloneRepository();
      } catch (e) {}
    }
    setIsCloning(false);
    setErrorMessage('');
    onClose();
  };

  const handleStartClone = async (e) => {
    e.preventDefault();
    const cleanUrl = (repoUrl || '').trim();
    if (!cleanUrl) {
      setErrorMessage('Por favor ingresa una URL válida de repositorio Git.');
      return;
    }
    if (cleanUrl.startsWith('-')) {
      setErrorMessage('URL inválida. No se permiten opciones o argumentos de comando en la URL.');
      return;
    }
    if (/[\x00-\x1F\x7F\r\n]/.test(cleanUrl)) {
      setErrorMessage('La URL contiene caracteres prohibidos o saltos de línea.');
      return;
    }
    const validGitProtocol = /^(https?:\/\/|git@|ssh:\/\/|git:\/\/)/i;
    if (!validGitProtocol.test(cleanUrl)) {
      setErrorMessage('Formato de URL no soportado. Debe comenzar con https://, http://, git@, ssh:// o git://');
      return;
    }
    if (!destinationFolder.trim()) {
      setErrorMessage('Por favor selecciona la carpeta de destino donde se guardará el repositorio.');
      return;
    }

    setErrorMessage('');
    setIsCloning(true);
    setProgressPercent(10);
    setStatusText('Iniciando conexión con el repositorio Git remoto...');

    try {
      if (window.electronAPI?.cloneRepository) {
        const result = await window.electronAPI.cloneRepository(repoUrl, destinationFolder);
        if (result.success && result.targetFolder) {
          setProgressPercent(100);
          setStatusText('¡Repositorio clonado con éxito!');
          setTimeout(() => {
            setIsCloning(false);
            if (onImportFolder) onImportFolder(result.targetFolder);
            onClose();
          }, 1000);
        } else {
          setIsCloning(false);
          setErrorMessage(result.error || 'Error al clonar el repositorio.');
        }
      } else {
        // Fallback for web mode
        let current = 10;
        const interval = setInterval(() => {
          current += 30;
          if (current >= 100) {
            clearInterval(interval);
            setProgressPercent(100);
            setStatusText('¡Repositorio clonado con éxito!');
            setTimeout(() => {
              setIsCloning(false);
              if (onImportFolder) onImportFolder(`${destinationFolder}\\mi-repo-clonado`);
              onClose();
            }, 1000);
          } else {
            setProgressPercent(current);
            setStatusText('Descargando archivos y objetos...');
          }
        }, 400);
      }
    } catch (err) {
      setIsCloning(false);
      setErrorMessage(err.message || 'No se pudo iniciar la clonación del repositorio.');
    }
  };

  // Clean status text by stripping any embedded percentage numbers
  const cleanStatus = (statusText || 'Clonando...').replace(/:\s*\d+%/g, '').replace(/\s*\d+%/g, '');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none"
        onClick={handleCancel}
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
                <GitBranch className="h-5 w-5" />
              </div>
              <div>
                <h3 className={`font-extrabold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Descargar / Clonar Repositorio Git
                </h3>
                <p className="text-xs text-slate-500">Clona repositorios de GitHub, GitLab o Bitbucket</p>
              </div>
            </div>

            {/* Close Button is always active */}
            <button
              onClick={handleCancel}
              className={`p-1.5 rounded-xl transition-colors ${
                isDark ? 'text-[#a1a1aa] hover:text-white hover:bg-[#282828]' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
              }`}
              title="Cancelar y Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Modal Body */}
          <form onSubmit={handleStartClone} className="p-6 space-y-5">
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-semibold flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* URL Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider block">
                URL del Repositorio Git (.git):
              </label>
              <input
                type="text"
                disabled={isCloning}
                placeholder="https://github.com/usuario/mi-repositorio.git"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className={`w-full border rounded-2xl px-4 py-3 text-xs font-mono font-semibold focus:outline-none focus:border-blue-600 ${
                  isDark ? 'bg-[#181818] border-[#2e2e2e] text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>

            {/* Destination Folder Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider block">
                Carpeta donde Alojar el Repositorio:
              </label>

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  disabled={isCloning}
                  placeholder="Selecciona la carpeta de tu equipo..."
                  value={destinationFolder}
                  className={`flex-1 border rounded-2xl px-4 py-3 text-xs font-mono font-semibold truncate focus:outline-none ${
                    isDark ? 'bg-[#181818] border-[#2e2e2e] text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                  }`}
                />

                <button
                  type="button"
                  disabled={isCloning}
                  onClick={handleSelectDestination}
                  className={`px-4 py-3 rounded-2xl border text-xs font-bold shrink-0 flex items-center space-x-1.5 transition-all ${
                    isDark
                      ? 'bg-[#252525] border-[#383838] text-slate-200 hover:bg-[#2d2d2d] hover:text-white'
                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200/70'
                  }`}
                >
                  <Folder className="h-4 w-4 text-blue-500" />
                  <span>Explorar</span>
                </button>
              </div>
            </div>

            {/* Live Progress Bar Section */}
            {isCloning && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs font-mono font-bold">
                  <span className="text-blue-500 flex items-center gap-2">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>{cleanStatus}</span>
                  </span>
                  <span className="text-blue-500">{progressPercent}%</span>
                </div>

                {/* Animated Progress Track */}
                <div className={`w-full h-3 rounded-full overflow-hidden p-0.5 border ${
                  isDark ? 'bg-[#181818] border-[#2e2e2e]' : 'bg-slate-100 border-slate-200'
                }`}>
                  <motion.div
                    initial={{ width: '0%' }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.3 }}
                    className="h-full bg-blue-600 rounded-full shadow-md shadow-blue-500/50"
                  />
                </div>
              </div>
            )}

            {/* Submit & Cancel Buttons */}
            <div className="pt-3 flex items-center justify-end space-x-3 border-t border-slate-200/30">
              <button
                type="button"
                onClick={handleCancel}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isDark ? 'text-slate-300 hover:text-white hover:bg-[#282828]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isCloning}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md shadow-blue-600/20 flex items-center space-x-2 transition-all cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>{isCloning ? 'Clonando Repositorio...' : 'Iniciar Descarga / Clonar'}</span>
              </button>
            </div>

          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
