import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GitBranch, 
  GitCommit, 
  Copy, 
  RotateCcw, 
  CornerDownRight, 
  Check, 
  Tag, 
  ExternalLink 
} from 'lucide-react';

export default function GitContextMenu({
  menu,
  onClose,
  onCheckout,
  onCreateBranch,
  onCopySha,
  onRevert,
  theme = 'dark',
  language = 'es'
}) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (!menu || !menu.commit) return null;

  const { x, y, commit } = menu;
  const isDark = theme === 'dark';

  // Keep menu within screen boundaries
  const adjustedX = Math.min(x, window.innerWidth - 240);
  const adjustedY = Math.min(y, window.innerHeight - 260);

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -4 }}
        transition={{ duration: 0.12 }}
        style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
        className={`fixed z-50 w-56 rounded-2xl border shadow-2xl p-1.5 space-y-1 font-sans text-xs select-none backdrop-blur-md ${
          isDark 
            ? 'bg-[#181920]/95 border-white/[0.12] text-white shadow-black/60' 
            : 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-400/30'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header commit preview */}
        <div className={`px-2.5 py-1.5 border-b mb-1 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
          <div className="flex items-center space-x-1.5 font-mono text-[11px] font-bold text-blue-400">
            <GitCommit className="w-3.5 h-3.5" />
            <span>{commit.shortHash}</span>
          </div>
          <p className="text-[11px] text-slate-400 truncate mt-0.5">{commit.message}</p>
        </div>

        {/* Action 1: Checkout */}
        <button
          type="button"
          onClick={() => {
            onClose();
            onCheckout(commit);
          }}
          className={`w-full px-2.5 py-1.5 rounded-xl flex items-center space-x-2 transition-colors cursor-pointer text-left ${
            isDark ? 'hover:bg-white/[0.08] text-slate-200' : 'hover:bg-slate-100 text-slate-700'
          }`}
        >
          <CornerDownRight className="w-3.5 h-3.5 text-blue-400" />
          <span>{language === 'es' ? 'Checkout commit' : 'Checkout commit'}</span>
        </button>

        {/* Action 2: Create Branch Here */}
        <button
          type="button"
          onClick={() => {
            onClose();
            onCreateBranch(commit);
          }}
          className={`w-full px-2.5 py-1.5 rounded-xl flex items-center space-x-2 transition-colors cursor-pointer text-left ${
            isDark ? 'hover:bg-white/[0.08] text-slate-200' : 'hover:bg-slate-100 text-slate-700'
          }`}
        >
          <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
          <span>{language === 'es' ? 'Crear rama aquí...' : 'Create branch here...'}</span>
        </button>

        {/* Action 3: Copy Full SHA */}
        <button
          type="button"
          onClick={() => {
            onClose();
            onCopySha(commit.hash);
          }}
          className={`w-full px-2.5 py-1.5 rounded-xl flex items-center space-x-2 transition-colors cursor-pointer text-left ${
            isDark ? 'hover:bg-white/[0.08] text-slate-200' : 'hover:bg-slate-100 text-slate-700'
          }`}
        >
          <Copy className="w-3.5 h-3.5 text-amber-400" />
          <span>{language === 'es' ? 'Copiar SHA completo' : 'Copy full SHA'}</span>
        </button>

        <div className={`h-px my-1 ${isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`} />

        {/* Action 4: Revert Commit */}
        <button
          type="button"
          onClick={() => {
            onClose();
            onRevert(commit);
          }}
          className={`w-full px-2.5 py-1.5 rounded-xl flex items-center space-x-2 transition-colors cursor-pointer text-left ${
            isDark ? 'hover:bg-rose-500/20 text-rose-300' : 'hover:bg-rose-50 text-rose-600'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
          <span>{language === 'es' ? 'Revertir este commit' : 'Revert this commit'}</span>
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
