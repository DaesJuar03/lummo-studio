import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * SyntaxGuardBadge
 * Developer-grade, industrial telemetry badge for transient syntax/runtime errors.
 * STRICTLY NO EMOJIS, NO AI BRANDING.
 */
export default function SyntaxGuardBadge({
  diagnostic,
  onOpenEditor,
  onDismiss,
  projectPath,
  theme = 'dark',
  language = 'es'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const isDark = theme === 'dark';

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  if (!diagnostic) return null;

  const fileName = diagnostic.file ? diagnostic.file.split(/[\\/]/).pop() : 'unknown';
  const fileLoc = diagnostic.line ? `${fileName}:${diagnostic.line}` : fileName;

  const handleOpenInEditor = () => {
    if (onOpenEditor && projectPath) {
      onOpenEditor(projectPath);
    }
  };

  const handleDismiss = () => {
    setIsOpen(false);
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Telemetry Badge - Developer Monospace Style */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold tracking-tight border transition-all cursor-pointer select-none ${
          isDark
            ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-500/50'
            : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 hover:border-amber-400'
        }`}
        title={diagnostic.summary}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
        <span className="tracking-wider">[ SYNTAX_GUARD ]</span>
        <span className="opacity-90 max-w-[160px] truncate">{fileLoc}</span>
      </button>

      {/* Detail Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className={`absolute left-0 top-full mt-2 z-50 w-[380px] sm:w-[440px] rounded-xl border shadow-2xl p-4 font-mono text-xs ${
              isDark
                ? 'bg-[#12141a] border-amber-500/30 text-slate-200 shadow-black/80'
                : 'bg-white border-amber-300 text-slate-800 shadow-amber-900/10'
            }`}
          >
            {/* Header Telemetry Bar */}
            <div className="flex items-center justify-between border-b pb-2 mb-3 border-amber-500/20">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="font-bold text-[10px] tracking-widest text-amber-400 uppercase">
                  DIAGNOSTIC // TRANSIENT_FAULT
                </span>
              </div>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border ${
                isDark
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                IN_MEMORY_SUPERVISED
              </span>
            </div>

            {/* Error Description */}
            <div className="space-y-1.5 mb-3">
              <div className="flex items-start justify-between gap-2">
                <span className="font-bold text-amber-300 break-words">
                  {diagnostic.errorName || 'SyntaxError'}: {diagnostic.summary}
                </span>
              </div>

              <div className="text-[11px] text-slate-400 truncate">
                <span className="text-slate-500">FILE:</span> {diagnostic.file}
                {diagnostic.line && <span className="text-amber-400/80">:{diagnostic.line}</span>}
                {diagnostic.column && <span className="text-amber-400/60">:{diagnostic.column}</span>}
              </div>
            </div>

            {/* Code Excerpt Snippet (if extracted) */}
            {diagnostic.rawExcerpt && (
              <div className="mb-3">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                  FAULT_TRACE
                </div>
                <pre className={`p-2.5 rounded-lg text-[10px] leading-relaxed overflow-x-auto whitespace-pre font-mono border ${
                  isDark
                    ? 'bg-[#0b0c10] border-white/[0.08] text-amber-200/90'
                    : 'bg-slate-900 border-slate-800 text-amber-300'
                }`}>
                  {diagnostic.rawExcerpt}
                </pre>
              </div>
            )}

            {/* Non-Destructive Integrity Notice */}
            <div className={`p-2 rounded-lg text-[10px] mb-3 leading-normal border ${
              isDark
                ? 'bg-amber-950/20 text-amber-300/80 border-amber-500/20'
                : 'bg-amber-50 text-amber-900 border-amber-200'
            }`}>
              <div className="font-bold mb-0.5">
                {language === 'es' ? '[AVISO DE INTEGRIDAD]' : '[INTEGRITY NOTICE]'}
              </div>
              <div>
                {language === 'es' 
                  ? 'Archivos en disco no modificados. Lummo supervisa el proceso en memoria. Corrige el código en tu editor.'
                  : 'Disk files untouched. Lummo supervises the process in memory. Fix the issue in your editor.'}
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-amber-500/20">
              <button
                type="button"
                onClick={handleDismiss}
                className={`px-2.5 py-1 rounded text-[10px] font-bold tracking-wider uppercase border transition-colors cursor-pointer ${
                  isDark
                    ? 'border-white/[0.1] text-slate-400 hover:text-white hover:bg-white/[0.05]'
                    : 'border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {language === 'es' ? 'DESCARTAR' : 'DISMISS'}
              </button>

              <button
                type="button"
                onClick={handleOpenInEditor}
                className="px-3 py-1 rounded text-[10px] font-bold tracking-wider uppercase bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black shadow-xs transition-colors cursor-pointer"
              >
                {language === 'es' ? 'ABRIR EN EDITOR' : 'OPEN IN EDITOR'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
