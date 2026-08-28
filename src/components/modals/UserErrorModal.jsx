import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  WifiOff, 
  FolderX, 
  Database, 
  Cpu, 
  ShieldAlert, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Terminal, 
  Sparkles 
} from 'lucide-react';
import { parseLummoError } from '../../utils/errorParser';

export default function UserErrorModal({ 
  error, 
  title, 
  onClose, 
  onOpenInstaller, 
  theme = 'dark' 
}) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  if (!error) return null;

  const parsed = parseLummoError(error, title);
  const isDark = theme === 'dark';

  const renderIcon = () => {
    switch (parsed.iconType) {
      case 'network':
        return <WifiOff className="h-7 w-7 text-amber-400" />;
      case 'folder':
        return <FolderX className="h-7 w-7 text-rose-400" />;
      case 'database':
        return <Database className="h-7 w-7 text-blue-400" />;
      case 'cpu':
        return <Cpu className="h-7 w-7 text-indigo-400" />;
      case 'shield':
        return <ShieldAlert className="h-7 w-7 text-amber-500" />;
      default:
        return <AlertTriangle className="h-7 w-7 text-rose-500" />;
    }
  };

  const handleActionClick = () => {
    if (parsed.actionKey === 'OPEN_INSTALLER' && onOpenInstaller) {
      onOpenInstaller();
    }
    if (onClose) onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 select-none"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${
            isDark 
              ? 'bg-[#141414] border-white/[0.08] text-[#E5E5E5]' 
              : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Header Bar */}
          <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
            isDark ? 'bg-[#141414] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isDark ? 'bg-[#252525] border border-white/[0.08]' : 'bg-rose-50 border border-rose-100'
              }`}>
                {renderIcon()}
              </div>
              <h3 className={`font-extrabold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {parsed.title}
              </h3>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-[#303030]' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200'
              }`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-5">
            {/* Friendly Simple Message Card */}
            <div className={`p-4 rounded-2xl border space-y-2 ${
              isDark 
                ? 'bg-[#1E1E1E] border-white/[0.08] text-[#E5E5E5]' 
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}>
              <p className="text-xs font-semibold leading-relaxed">
                {parsed.userMessage}
              </p>
            </div>

            {/* Optional Collapsible Technical Details (for developers) */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowTechnicalDetails(prev => !prev)}
                className={`w-full flex items-center justify-between text-[11px] font-bold font-mono py-1.5 px-3 rounded-xl transition-all cursor-pointer ${
                  isDark 
                    ? 'text-slate-400 hover:text-white hover:bg-[#252525]' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center space-x-1.5">
                  <Terminal className="h-3.5 w-3.5 text-blue-400" />
                  <span>Detalle técnico para desarrolladores</span>
                </div>
                {showTechnicalDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>

              <AnimatePresence>
                {showTechnicalDetails && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <pre className={`p-3 rounded-xl text-[11px] font-mono whitespace-pre-wrap max-h-36 overflow-y-auto custom-scrollbar border ${
                      isDark 
                        ? 'bg-[#141414] border-white/[0.08] text-slate-400' 
                        : 'bg-slate-100 border-slate-200 text-slate-700'
                    }`}>
                      {parsed.rawDetails || 'Sin detalles técnicos adicionales.'}
                    </pre>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Modal Footer Controls */}
          <div className={`px-6 py-4 border-t flex items-center justify-end space-x-3 shrink-0 ${
            isDark ? 'bg-[#141414] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
          }`}>
            {parsed.actionKey === 'OPEN_INSTALLER' && (
              <button
                onClick={handleActionClick}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-2 shadow-md shadow-blue-600/20 hover:shadow-[0_0_15px_rgba(37,99,235,0.35)] transition-all cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{parsed.actionText}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className={`px-5 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                parsed.actionKey === 'OPEN_INSTALLER'
                  ? isDark ? 'text-slate-400 hover:text-white hover:bg-[#252525]' : 'text-slate-600 hover:text-slate-900'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 hover:shadow-[0_0_15px_rgba(37,99,235,0.35)]'
              }`}
            >
              <span>{parsed.actionKey === 'OPEN_INSTALLER' ? 'Cerrar' : parsed.actionText}</span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
