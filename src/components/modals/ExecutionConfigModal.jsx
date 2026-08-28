import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings2, Save, RefreshCw, Check } from 'lucide-react';

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
  theme
}) {
  const isDark = theme === 'dark';

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
                  Configuración de Ejecución
                </h3>
                <p className="text-xs text-slate-400">Modifica el puerto y comando de {project.name}</p>
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
                Puerto Asignado
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
                El puerto en el que escuchará el servidor local.
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-400 font-mono text-[10px] font-bold uppercase tracking-wider block">
                Comando de Inicio
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
                Comando ejecutado al hacer clic en "Arrancar Servidor".
              </span>
            </div>

            {savedMessage && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl font-mono text-xs flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0" />
                <span>{savedMessage}</span>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className={`px-6 py-4 border-t flex items-center justify-between ${
            isDark ? 'bg-[#141414] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
          }`}>
            <button
              onClick={onClose}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                isDark ? 'bg-[#252525] border-white/[0.08] text-slate-300 hover:bg-[#303030] hover:text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              Cancelar
            </button>

            <button
              onClick={onSaveConfig}
              disabled={isRestarting}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center space-x-2 shadow-md shadow-blue-600/20 hover:shadow-[0_0_15px_rgba(37,99,235,0.35)] transition-all cursor-pointer disabled:opacity-50"
            >
              {isRestarting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>{isRestarting ? 'Reiniciando...' : 'Guardar y Aplicar'}</span>
            </button>
          </div>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
