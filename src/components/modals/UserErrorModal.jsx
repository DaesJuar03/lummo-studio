import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Download, X, Terminal } from 'lucide-react';
import { getTranslations } from '../../locales';

export default function UserErrorModal({
  error,
  title,
  onClose,
  onOpenInstaller,
  theme,
  language = 'es'
}) {
  if (!error) return null;

  const isDark = theme === 'dark';
  const t = getTranslations(language);

  // Parsing error details
  let cleanTitle = title || (language === 'es' ? 'Se requiere instalar un componente' : 'Component installation required');
  let cleanMessage = error.message || String(error);
  let missingEngine = null;

  const lower = cleanMessage.toLowerCase();
  if (lower.includes('node') || lower.includes('npm')) {
    missingEngine = 'Node.js';
  } else if (lower.includes('php')) {
    missingEngine = 'PHP Engine';
  } else if (lower.includes('python')) {
    missingEngine = 'Python';
  } else if (lower.includes('git')) {
    missingEngine = 'Git for Windows';
  } else if (lower.includes('docker')) {
    missingEngine = 'Docker Desktop';
  }

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
          className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden ${
            isDark ? 'bg-[#181818] border-white/[0.08] text-[#E5E5E5]' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          <div className="p-6 space-y-4">
            <div className="flex items-start space-x-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 shadow-md shadow-amber-500/10">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className={`font-extrabold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {cleanTitle}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {missingEngine 
                    ? (language === 'es' ? `Para ejecutar este proyecto necesitas tener ${missingEngine} instalado en tu equipo.` : `To run this project you need ${missingEngine} installed on your machine.`)
                    : cleanMessage}
                </p>
              </div>
            </div>

            {missingEngine && (
              <div className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs ${
                isDark ? 'bg-[#1E1E1E] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center space-x-2">
                  <Terminal className="h-4 w-4 text-blue-400" />
                  <span className="font-bold">{missingEngine}</span>
                </div>
                <span className="text-[11px] font-mono text-amber-400 font-bold">
                  {t.notInstalled || 'Not installed'}
                </span>
              </div>
            )}

            <div className="flex items-center justify-end space-x-2.5 pt-2">
              <button
                onClick={onClose}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-white hover:bg-[#252525]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {t.cancel || 'Close'}
              </button>

              {onOpenInstaller && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenInstaller();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-blue-600/20 hover:shadow-[0_0_15px_rgba(37,99,235,0.35)] transition-all cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{language === 'es' ? 'Abrir Instalador de Servicios' : 'Open Services Installer'}</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
