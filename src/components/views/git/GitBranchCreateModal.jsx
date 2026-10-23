import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitBranch, X, Check, GitCommit } from 'lucide-react';

export default function GitBranchCreateModal({
  isOpen,
  onClose,
  commit,
  onSubmit,
  theme = 'dark',
  language = 'es'
}) {
  const [branchName, setBranchName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !commit) return null;

  const isDark = theme === 'dark';

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const cleanName = branchName.trim().replace(/\s+/g, '-');
    if (!cleanName) {
      setError(language === 'es' ? 'Ingresa un nombre para la rama' : 'Enter a branch name');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(cleanName, commit.hash);
      setBranchName('');
      onClose();
    } catch (err) {
      setError(err?.message || 'Error al crear la rama');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none font-sans"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-md rounded-2xl border shadow-2xl p-5 space-y-4 ${
            isDark ? 'bg-[#181920] border-white/[0.1] text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                <GitBranch className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-sm">
                  {language === 'es' ? 'Crear nueva rama' : 'Create new branch'}
                </h4>
                <div className="flex items-center space-x-1.5 text-[11px] font-mono text-slate-400">
                  <span>{language === 'es' ? 'En commit' : 'At commit'}</span>
                  <span className="text-blue-400 font-bold">{commit.shortHash}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono mb-1.5">
                {language === 'es' ? 'Nombre de la rama' : 'Branch name'}
              </label>
              <input
                type="text"
                autoFocus
                value={branchName}
                onChange={(e) => {
                  setBranchName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="feature/nueva-funcionalidad"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono outline-none transition-all ${
                  isDark 
                    ? 'bg-[#121316] border-white/[0.08] text-white focus:border-emerald-500 placeholder:text-slate-600' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500 placeholder:text-slate-400'
                }`}
              />
            </div>

            {error && (
              <p className="text-xs text-rose-400 font-medium">{error}</p>
            )}

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  isDark ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !branchName.trim()}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 shadow-sm"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSubmitting ? (language === 'es' ? 'Creando...' : 'Creating...') : (language === 'es' ? 'Crear y cambiar' : 'Create & checkout')}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
