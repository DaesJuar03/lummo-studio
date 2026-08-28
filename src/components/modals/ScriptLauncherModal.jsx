import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, PlayCircle, Terminal, Play, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { getTranslations } from '../../locales';

export default function ScriptLauncherModal({
  isOpen,
  onClose,
  project,
  onRunScript,
  isExecutingScript,
  scriptMsg,
  onOpenLogs,
  theme,
  language = 'es'
}) {
  const isDark = theme === 'dark';
  const t = getTranslations(language);
  const [customInput, setCustomInput] = useState('');

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
                  {language === 'es' ? 'Lanzador de Scripts & Comandos' : 'Script & Command Launcher'}
                </h3>
                <p className="text-xs text-slate-400">
                  {language === 'es' ? `Ejecuta comandos CLI en ${project.name}` : `Run CLI commands in ${project.name}`}
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
            {/* Direct CLI input */}
            <div className="space-y-1.5">
              <label className="text-slate-400 font-bold uppercase text-[10px] font-mono">
                {language === 'es' ? 'Ejecutar Comando Directo:' : 'Execute Direct Command:'}
              </label>
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <Terminal className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customInput.trim()) {
                        onRunScript(customInput.trim());
                        setCustomInput('');
                      }
                    }}
                    placeholder={language === 'es' ? "ej: npm install axios, npx prisma migrate dev..." : "e.g. npm install axios, npx prisma migrate dev..."}
                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl border font-mono text-xs focus:outline-none focus:border-amber-500 ${
                      isDark ? 'bg-[#1E1E1E] border-white/[0.08] text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
                <button
                  type="button"
                  disabled={!customInput.trim() || isExecutingScript}
                  onClick={() => {
                    onRunScript(customInput.trim());
                    setCustomInput('');
                  }}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Play className="h-4 w-4 fill-black" />
                </button>
              </div>
            </div>

            {/* Script Status */}
            {scriptMsg && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-xs">
                {scriptMsg}
              </div>
            )}

            {/* Custom Shortcuts */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">
                  {language === 'es' ? 'Atajos Guardados:' : 'Saved Shortcuts:'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddShortcut(!showAddShortcut)}
                  className="text-[11px] text-amber-400 font-bold hover:text-amber-300 flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{language === 'es' ? 'Crear Atajo' : 'Create Shortcut'}</span>
                </button>
              </div>

              {showAddShortcut && (
                <form onSubmit={handleAddShortcut} className="p-3 rounded-xl border border-white/10 bg-[#1E1E1E] space-y-2">
                  <input
                    type="text"
                    placeholder={language === 'es' ? "Nombre (ej: Migrar DB)" : "Name (e.g. Migrate DB)"}
                    value={newShortcutName}
                    onChange={(e) => setNewShortcutName(e.target.value)}
                    className="w-full p-2 rounded-lg bg-[#141414] border border-white/10 text-white text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Comando (ej: npx prisma migrate dev)"
                    value={newShortcutCmd}
                    onChange={(e) => setNewShortcutCmd(e.target.value)}
                    className="w-full p-2 rounded-lg bg-[#141414] border border-white/10 text-white text-xs font-mono"
                  />
                  <div className="flex justify-end space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddShortcut(false)}
                      className="px-3 py-1 rounded-lg text-slate-400 text-xs cursor-pointer"
                    >
                      {t.cancel || 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 bg-amber-500 text-black font-bold rounded-lg text-xs cursor-pointer"
                    >
                      {language === 'es' ? 'Guardar' : 'Save'}
                    </button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                {customShortcuts.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-xl border border-white/[0.08] bg-[#1E1E1E] flex items-center justify-between group"
                  >
                    <div className="truncate mr-2">
                      <div className="font-bold text-white truncate">{s.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">{s.cmd}</div>
                    </div>
                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onRunScript(s.cmd)}
                        className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 cursor-pointer"
                        title={language === 'es' ? 'Ejecutar' : 'Run'}
                      >
                        <Play className="h-3 w-3 fill-amber-300" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveShortcut(s.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 cursor-pointer"
                        title={language === 'es' ? 'Eliminar' : 'Delete'}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
