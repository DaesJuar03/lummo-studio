import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings2, Save, RefreshCw, Check } from 'lucide-react';
import { getTranslations } from '../../locales';

export default function ExecutionConfigModal({
  isOpen,
  onClose,
  project,
  portInput,
  setPortInput,
  commandInput,
  setCommandInput,
  onSaveConfig,
  isRestarting,
  savedMessage,
  theme,
  language = 'es'
}) {
  const isDark = theme === 'dark';
  const t = getTranslations(language);

  if (!isOpen || !project) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden ${
            isDark ? 'bg-[#141414] border-white/[0.08] text-[#E5E5E5]' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Modal Header */}
          <div className={`px-6 py-4 border-b flex items-center justify-between ${
            isDark ? 'bg-[#141414] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <Settings2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className={`font-extrabold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {language === 'es' ? 'Configuración de Ejecución' : 'Execution Configuration'}
                </h3>
                <p className="text-xs text-slate-400">
                  {language === 'es' ? `Modifica el puerto y comando de ${project.name}` : `Modify port and start command for ${project.name}`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-[#303030]' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
              }`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-slate-400 font-mono text-[10px] font-bold uppercase tracking-wider block">
                {language === 'es' ? 'Puerto Asignado' : 'Assigned Port'}
              </label>
              <input
                type="number"
                value={portInput}
                onChange={(e) => setPortInput(e.target.value)}
                placeholder="ej: 3000"
                className={`w-full border rounded-xl p-3 font-mono font-bold text-sm focus:outline-none transition-all ${
                  isDark ? 'bg-[#1E1E1E] border-white/[0.08] text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
              <span className="text-[11px] text-slate-400 block">
                {language === 'es' ? 'El puerto en el que escuchará el servidor local.' : 'The port where local server will listen.'}
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-400 font-mono text-[10px] font-bold uppercase tracking-wider block">
                {language === 'es' ? 'Comando de Inicio' : 'Start Command'}
              </label>
              <input
                type="text"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                placeholder="ej: npm run dev"
                className={`w-full border rounded-xl p-3 font-mono font-bold text-sm focus:outline-none transition-all ${
                  isDark ? 'bg-[#1E1E1E] border-white/[0.08] text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
              <span className="text-[11px] text-slate-400 block">
                {language === 'es' ? 'Comando ejecutado al hacer clic en "Arrancar Servidor".' : 'Command executed when clicking "Start Server".'}
              </span>
            </div>

            {savedMessage && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs flex items-center space-x-2">
                <Check className="h-4 w-4" />
                <span>{savedMessage}</span>
              </div>
            )}

            <div className="flex items-center justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-white hover:bg-[#252525]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {t.cancel || 'Cancel'}
              </button>

              <button
                type="button"
                onClick={onSaveConfig}
                disabled={isRestarting}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-2 shadow-md shadow-blue-600/20 hover:shadow-[0_0_15px_rgba(37,99,235,0.35)] transition-all cursor-pointer disabled:opacity-50"
              >
                {isRestarting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>{language === 'es' ? 'Guardando...' : 'Saving...'}</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>{language === 'es' ? 'Guardar Cambios' : 'Save Changes'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
