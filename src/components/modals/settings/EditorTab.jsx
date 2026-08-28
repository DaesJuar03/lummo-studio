import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Check, Code2 } from 'lucide-react';

const DEFAULT_EDITORS = [
  { id: 'vscode', name: 'Visual Studio Code', cmd: 'code', installed: true },
  { id: 'cursor', name: 'Cursor AI Editor', cmd: 'cursor', installed: false },
  { id: 'windsurf', name: 'Windsurf IDE', cmd: 'windsurf', installed: false },
  { id: 'vscodium', name: 'VSCodium', cmd: 'vscodium', installed: false },
  { id: 'subl', name: 'Sublime Text', cmd: 'subl', installed: false },
  { id: 'webstorm', name: 'JetBrains WebStorm', cmd: 'webstorm', installed: false },
  { id: 'phpstorm', name: 'JetBrains PhpStorm', cmd: 'phpstorm', installed: false },
  { id: 'idea', name: 'JetBrains IntelliJ IDEA', cmd: 'idea', installed: false },
  { id: 'notepad', name: 'Bloc de Notas (Notepad)', cmd: 'notepad', installed: true },
  { id: 'explorer', name: 'Explorador de Archivos', cmd: 'explorer', installed: true }
];

export default function EditorTab({
  detectedEditors = [],
  isScanningEditors = false,
  onScanEditors,
  selectedEditorCmd = 'code',
  onSelectEditorCmd,
  theme,
  t,
  language = 'es'
}) {
  const isDark = theme === 'dark';
  const editors = Array.isArray(detectedEditors) && detectedEditors.length > 0
    ? detectedEditors
    : DEFAULT_EDITORS;

  const installedEditors = editors.filter(e => e?.installed);
  const otherEditors = editors.filter(e => e && !e?.installed);

  return (
    <motion.div initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }} className="space-y-4 pb-8">
      <div className={`border-b pb-3 flex items-center justify-between ${isDark ? 'border-white/[0.08]' : 'border-slate-100'}`}>
        <div>
          <h4 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.codeEditorTab || 'Code Editor'}</h4>
          <p className="text-xs text-slate-400">{t.codeEditorDesc || 'Select the editor or IDE to open your projects'}</p>
        </div>

        <button
          type="button"
          onClick={onScanEditors}
          disabled={isScanningEditors}
          className={`px-3 py-1.5 rounded-xl border flex items-center space-x-1.5 text-xs font-bold transition-all cursor-pointer ${
            isDark 
              ? 'bg-[#252525] border-white/[0.08] text-slate-200 hover:bg-[#303030] active:scale-95' 
              : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200 active:scale-95'
          } ${isScanningEditors ? 'opacity-80' : ''}`}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isScanningEditors ? 'animate-spin text-blue-400' : 'text-slate-400'}`} />
          <span>{isScanningEditors ? (language === 'es' ? 'Escaneando...' : 'Scanning...') : (t.rescanShort || t.rescan || 'Rescan')}</span>
        </button>
      </div>

      {/* Selector Dropdown Principal */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider block">
          {t.defaultEditorSelected || 'DEFAULT EDITOR SELECTED:'}
        </label>
        <select
          value={selectedEditorCmd}
          onChange={(e) => onSelectEditorCmd && onSelectEditorCmd(e.target.value)}
          className={`w-full p-3.5 rounded-2xl border text-xs font-bold font-mono focus:outline-none transition-all cursor-pointer ${
            isDark 
              ? 'bg-[#1E1E1E] border-white/[0.08] text-white focus:border-blue-500' 
              : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600'
          }`}
        >
          {installedEditors.length > 0 && (
            <optgroup label={language === 'es' ? 'Editores Detectados en el Sistema' : 'Editors Detected on System'}>
              {installedEditors.map((ed) => (
                <option key={ed.id} value={ed.cmd}>
                  {ed.name} ({ed.cmd})
                </option>
              ))}
            </optgroup>
          )}

          {otherEditors.length > 0 && (
            <optgroup label={language === 'es' ? 'Otros Editores e IDEs Compatibles' : 'Other Compatible Editors & IDEs'}>
              {otherEditors.map((ed) => (
                <option key={ed.id} value={ed.cmd}>
                  {ed.name} ({ed.cmd})
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      {/* Catálogo de Editores e IDEs */}
      <div className="space-y-2 pt-1">
        <label className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider block">
          {language === 'es' ? 'Catálogo de Editores e IDEs Compatibles:' : 'Compatible Editors & IDEs Catalog:'}
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {editors.map((ed) => {
            const isSelected = selectedEditorCmd === ed.cmd;
            return (
              <button
                key={ed.id}
                type="button"
                onClick={() => onSelectEditorCmd && onSelectEditorCmd(ed.cmd)}
                className={`p-3 rounded-2xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                  isSelected
                    ? isDark
                      ? 'bg-blue-600/20 border-blue-500 ring-1 ring-blue-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.25)]'
                      : 'bg-blue-50 border-blue-500 ring-2 ring-blue-100 text-blue-950 font-bold'
                    : isDark
                      ? 'bg-[#1E1E1E] border-white/[0.08] text-slate-300 hover:text-white hover:bg-[#282828] hover:border-white/[0.16]'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <div className="space-y-0.5 truncate pr-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs truncate">{ed.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono font-bold uppercase tracking-tight shrink-0 ${
                      ed.installed 
                        ? isDark
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                          : 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    }`}>
                      {ed.installed ? (language === 'es' ? 'Disponible' : 'Available') : (language === 'es' ? 'No en PATH' : 'Not in PATH')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono font-semibold truncate">{ed.cmd}</p>
                </div>

                {isSelected && (
                  <Check className="h-4 w-4 text-blue-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
