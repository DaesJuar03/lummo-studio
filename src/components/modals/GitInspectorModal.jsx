import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, GitBranch } from 'lucide-react';
import GitInspectorView from '../views/git/GitInspectorView';
import { getTranslations } from '../../locales';

export default function GitInspectorModal({
  isOpen,
  onClose,
  project,
  theme,
  language = 'es'
}) {
  if (!isOpen || !project) return null;

  const isDark = theme === 'dark';
  const t = getTranslations(language);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-4xl max-h-[90vh] rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${
            isDark ? 'bg-[#141414] border-white/[0.08] text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Header */}
          <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
            isDark ? 'bg-[#18181b] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                <GitBranch className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base flex items-center gap-2">
                  <span>{t.gitInspectorTitle || 'Inspector de Git & Grafo'}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                    {project.name}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 font-mono truncate max-w-md">{project.path}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
            <GitInspectorView
              folderPath={project.path}
              theme={theme}
              language={language}
              t={t}
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
