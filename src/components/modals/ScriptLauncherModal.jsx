import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, PlayCircle, Terminal, Play, RefreshCw, Plus, Trash2 } from 'lucide-react';

export default function ScriptLauncherModal({
  isOpen,
  onClose,
  project,
  onRunScript,
  isExecutingScript,
  scriptMsg,
  onOpenLogs,
  theme
}) {
  const isDark = theme === 'dark';

  const [customInput, setCustomInput] = useState('');

  // Persisted custom script shortcuts per project
  const [customShortcuts, setCustomShortcuts] = useState(() => {
    try {
      const saved = localStorage.getItem(`lummo-shortcuts-${project?.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch (_e) {
      return [];
    }
  });

  const [newShortcutName, setNewShortcutName] = useState('');
  const [newShortcutCmd, setNewShortcutCmd] = useState('');
  const [showAddShortcut, setShowAddShortcut] = useState(false);

  if (!isOpen || !project) return null;

  const handleAddShortcut = (e) => {
    e.preventDefault();
    if (!newShortcutCmd.trim()) return;

    const updated = [
      ...customShortcuts,
      {
        id: Date.now().toString(),
        name: newShortcutName.trim() || newShortcutCmd.trim(),
        cmd: newShortcutCmd.trim()
      }
    ];

    setCustomShortcuts(updated);
    try {
      localStorage.setItem(`lummo-shortcuts-${project.id}`, JSON.stringify(updated));
    } catch (_e) {}

    setNewShortcutName('');
    setNewShortcutCmd('');
    setShowAddShortcut(false);
  };

  const handleRemoveShortcut = (id) => {
    const updated = customShortcuts.filter(s => s.id !== id);
    setCustomShortcuts(updated);
    try {
      localStorage.setItem(`lummo-shortcuts-${project.id}`, JSON.stringify(updated));
    } catch (_e) {}
  };

  const handleExecute = (cmd) => {
    if (!cmd) return;
    onRunScript(cmd);
  };

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
          className={`w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden ${
            isDark ? 'bg-[#141414] border-white/[0.08] text-[#E5E5E5]' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Modal Header */}
          <div className={`px-6 py-4 border-b flex items-center justify-between ${
            isDark ? 'bg-[#141414] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h3 className={`font-extrabold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Lanzador de Scripts & Comandos
                </h3>
                <p className="text-xs text-slate-400">Ejecuta comandos CLI y administra accesos directos para {project.name}</p>
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
          <div className="p-6 space-y-5 text-xs">

            {/* Status Feedback Banner */}
            {scriptMsg && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl font-mono text-xs flex items-center justify-between">
                <span>{scriptMsg}</span>
                {isExecutingScript && <RefreshCw className="h-4 w-4 animate-spin shrink-0" />}
              </div>
            )}

            {/* Preset Contextual Commands Grid */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-mono text-[10px] font-bold uppercase tracking-wider block">
                  Comandos Predeterminados del Stack ({project.techStack || 'CLI'})
                </span>
                <button
                  onClick={() => onOpenLogs(project)}
                  className="text-emerald-400 hover:underline text-[11px] font-mono font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Terminal className="h-3.5 w-3.5" />
                  <span>Ver Consola Completa</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {project.icon === 'php' ? (
                  <>
                    <button
                      onClick={() => handleExecute('php artisan migrate')}
                      disabled={isExecutingScript}
                      className="p-3 rounded-xl border font-mono font-bold flex items-center space-x-2 text-left transition-all hover:border-amber-500/40 bg-amber-500/10 text-amber-300 border-amber-500/20 hover:bg-amber-500/20 cursor-pointer disabled:opacity-50"
                    >
                      <PlayCircle className="h-4 w-4 text-amber-400 shrink-0" />
                      <span className="truncate">php artisan migrate</span>
                    </button>
                    <button
                      onClick={() => handleExecute('php artisan db:seed')}
                      disabled={isExecutingScript}
                      className="p-3 rounded-xl border font-mono font-bold flex items-center space-x-2 text-left transition-all hover:border-amber-500/40 bg-amber-500/10 text-amber-300 border-amber-500/20 hover:bg-amber-500/20 cursor-pointer disabled:opacity-50"
                    >
                      <PlayCircle className="h-4 w-4 text-amber-400 shrink-0" />
                      <span className="truncate">php artisan db:seed</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleExecute('npm run build')}
                      disabled={isExecutingScript}
                      className="p-3 rounded-xl border font-mono font-bold flex items-center space-x-2 text-left transition-all hover:border-amber-500/40 bg-amber-500/10 text-amber-300 border-amber-500/20 hover:bg-amber-500/20 cursor-pointer disabled:opacity-50"
                    >
                      <PlayCircle className="h-4 w-4 text-amber-400 shrink-0" />
                      <span className="truncate">npm run build</span>
                    </button>
                    <button
                      onClick={() => handleExecute('npm test')}
                      disabled={isExecutingScript}
                      className="p-3 rounded-xl border font-mono font-bold flex items-center space-x-2 text-left transition-all hover:border-amber-500/40 bg-amber-500/10 text-amber-300 border-amber-500/20 hover:bg-amber-500/20 cursor-pointer disabled:opacity-50"
                    >
                      <PlayCircle className="h-4 w-4 text-amber-400 shrink-0" />
                      <span className="truncate">npm test</span>
                    </button>
                  </>
                )}

                <button
                  onClick={() => handleExecute('npx prisma db push')}
                  disabled={isExecutingScript}
                  className={`p-3 rounded-xl border font-mono font-bold flex items-center space-x-2 text-left transition-all cursor-pointer disabled:opacity-50 ${
                    isDark ? 'bg-[#1E1E1E] border-white/[0.08] text-slate-300 hover:border-blue-500/40 hover:bg-[#2A2A2A]' : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-400'
                  }`}
                >
                  <PlayCircle className="h-4 w-4 text-blue-400 shrink-0" />
                  <span className="truncate">prisma db push</span>
                </button>

                <button
                  onClick={() => handleExecute('npx eslint . --fix')}
                  disabled={isExecutingScript}
                  className={`p-3 rounded-xl border font-mono font-bold flex items-center space-x-2 text-left transition-all cursor-pointer disabled:opacity-50 ${
                    isDark ? 'bg-[#1E1E1E] border-white/[0.08] text-slate-300 hover:border-purple-500/40 hover:bg-[#2A2A2A]' : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-400'
                  }`}
                >
                  <PlayCircle className="h-4 w-4 text-purple-400 shrink-0" />
                  <span className="truncate">eslint . --fix</span>
                </button>
              </div>
            </div>

            {/* Custom Project Shortcuts List */}
            {customShortcuts.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-white/[0.08]">
                <span className="text-slate-400 font-mono text-[10px] font-bold uppercase tracking-wider block">
                  Mis Accesos Directos Guardados
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {customShortcuts.map((sc) => (
                    <div key={sc.id} className="flex items-center space-x-1">
                      <button
                        onClick={() => handleExecute(sc.cmd)}
                        disabled={isExecutingScript}
                        className={`flex-1 p-2.5 rounded-xl border font-mono font-bold flex items-center space-x-2 text-left transition-all cursor-pointer truncate ${
                          isDark ? 'bg-[#1E1E1E] border-white/[0.08] text-amber-400 hover:border-amber-500/40 hover:bg-[#2A2A2A]' : 'bg-amber-50 border-amber-200 text-amber-900 hover:border-amber-400'
                        }`}
                      >
                        <PlayCircle className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{sc.name}</span>
                      </button>
                      <button
                        onClick={() => handleRemoveShortcut(sc.id)}
                        className="p-2 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Eliminar acceso directo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Execute & Add Custom CLI Command Form */}
            <div className="pt-3 border-t border-white/[0.08] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-mono text-[10px] font-bold uppercase tracking-wider block">
                  Ejecutar Comando CLI Personalizado
                </span>
                <button
                  onClick={() => setShowAddShortcut(!showAddShortcut)}
                  className="text-blue-400 font-bold hover:underline text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  <span>{showAddShortcut ? 'Cancelar' : 'Guardar como Acceso Directo'}</span>
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="ej: npm run build:prod o python manage.py migrate"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customInput.trim()) {
                      handleExecute(customInput.trim());
                    }
                  }}
                  className={`flex-1 border rounded-xl p-2.5 text-xs font-mono font-bold focus:outline-none transition-all ${
                    isDark ? 'bg-[#1E1E1E] border-white/[0.08] text-white focus:border-amber-500' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
                <button
                  onClick={() => handleExecute(customInput.trim())}
                  disabled={!customInput.trim() || isExecutingScript}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center space-x-1.5 shadow-md shadow-amber-600/20 hover:shadow-[0_0_15px_rgba(245,158,11,0.35)] transition-all cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {isExecutingScript ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  <span>Ejecutar</span>
                </button>
              </div>

              {/* Form to save custom shortcut */}
              {showAddShortcut && (
                <form onSubmit={handleAddShortcut} className={`p-3 rounded-2xl border space-y-2 mt-2 ${
                  isDark ? 'bg-[#1E1E1E] border-white/[0.08]' : 'bg-amber-50/5 border-amber-500/20'
                }`}>
                  <span className="font-bold text-[11px] text-amber-400 block">Guardar Nuevo Acceso Directo</span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Nombre (ej: Build Prod)"
                      value={newShortcutName}
                      onChange={(e) => setNewShortcutName(e.target.value)}
                      className={`border rounded-xl p-2 text-xs font-mono transition-all ${
                        isDark ? 'bg-[#252525] border-white/[0.08] text-white focus:border-amber-500' : 'bg-white border-slate-200'
                      }`}
                    />
                    <input
                      type="text"
                      placeholder="Comando (ej: npm run build)"
                      value={newShortcutCmd}
                      onChange={(e) => setNewShortcutCmd(e.target.value)}
                      className={`border rounded-xl p-2 text-xs font-mono transition-all ${
                        isDark ? 'bg-[#252525] border-white/[0.08] text-white focus:border-amber-500' : 'bg-white border-slate-200'
                      }`}
                    />
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={!newShortcutCmd.trim()}
                      className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-md shadow-amber-600/20 transition-all cursor-pointer disabled:opacity-50"
                    >
                      Guardar Acceso Directo
                    </button>
                  </div>
                </form>
              )}
            </div>

          </div>

          {/* Modal Footer */}
          <div className={`px-6 py-3.5 border-t flex justify-end ${
            isDark ? 'bg-[#141414] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
          }`}>
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                isDark ? 'bg-[#252525] border-white/[0.08] text-slate-300 hover:bg-[#303030] hover:text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              Cerrar
            </button>
          </div>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
