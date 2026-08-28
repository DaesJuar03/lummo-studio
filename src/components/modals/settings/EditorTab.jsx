import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Check } from 'lucide-react';

export default function EditorTab({
  detectedEditors,
  isScanningEditors,
  onScanEditors,
  selectedEditorCmd,
  onSelectEditorCmd,
  theme,
  t
}) {
  const isDark = theme === 'dark';

  return (
    <motion.div initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }} className="space-y-3.5">
      <div className={`border-b pb-2 flex items-center justify-between ${isDark ? 'border-white/[0.08]' : 'border-slate-100'}`}>
        <div>
          <h4 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.codeEditorTab}</h4>
          <p className="text-xs text-slate-400">Selecciona el editor o IDE para abrir tus proyectos</p>
        </div>

        <button
          type="button"
          onClick={onScanEditors}
          disabled={isScanningEditors}
          className={`px-3 py-1.5 rounded-xl border flex items-center space-x-1.5 text-xs font-bold transition-all cursor-pointer ${
            isDark ? 'bg-[#252525] border-white/[0.08] text-slate-200 hover:bg-[#303030]' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isScanningEditors ? 'animate-spin text-blue-400' : 'text-slate-400'}`} />
          <span>{isScanningEditors ? 'Escaneando...' : 'Re-escanear'}</span>
        </button>
      </div>

      {/* Enterprise Dropdown Selector */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider block">
          Editor Predeterminado Seleccionado:
        </label>
        <select
          value={selectedEditorCmd}
          onChange={(e) => onSelectEditorCmd(e.target.value)}
          className={`w-full p-3.5 rounded-2xl border text-xs font-bold font-mono focus:outline-none transition-all cursor-pointer ${
            isDark 
              ? 'bg-[#1E1E1E] border-white/[0.08] text-white focus:border-blue-500' 
              : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600'
          }`}
        >
          {(detectedEditors || []).filter(e => e?.installed).length > 0 && (
            <optgroup label="Editores Instalados en el Sistema">
              {(detectedEditors || []).filter(e => e?.installed).map((ed) => (
                <option key={ed.id} value={ed.cmd}>
                  {ed.name} ({ed.cmd})
                </option>
              ))}
            </optgroup>
          )}

          {(detectedEditors || []).filter(e => e && !e.installed).length > 0 && (
            <optgroup label="Otros Editores e IDEs (No detectados en PATH)">
              {(detectedEditors || []).filter(e => e && !e.installed).map((ed) => (
                <option key={ed.id} value={ed.cmd}>
                  {ed.name} ({ed.cmd})
                </option>
              ))}
            </optgroup>
          )}

          {(!detectedEditors || detectedEditors.length === 0) && (
            <>
              <option value="code">Visual Studio Code (code)</option>
              <option value="cursor">Cursor AI Editor (cursor)</option>
              <option value="windsurf">Windsurf IDE (windsurf)</option>
              <option value="subl">Sublime Text (subl)</option>
              <option value="webstorm">JetBrains WebStorm (webstorm)</option>
              <option value="phpstorm">JetBrains PhpStorm (phpstorm)</option>
              <option value="explorer">Explorador de Archivos (explorer)</option>
            </>
          )}
        </select>
      </div>

      {/* Grid List of Detected System Editors */}
      <div className="space-y-2 pt-2">
        <label className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider block">
          Catálogo de Editores e IDEs Compatibles:
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-56 overflow-y-auto custom-scrollbar pr-1">
          {(detectedEditors || []).map((ed) => {
            const isSelected = selectedEditorCmd === ed.cmd;
            return (
              <button
                key={ed.id}
                type="button"
                onClick={() => onSelectEditorCmd(ed.cmd)}
                className={`p-3.5 rounded-2xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                  isSelected
                    ? isDark
                      ? 'bg-blue-600/15 border-blue-500 ring-1 ring-blue-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.2)]'
                      : 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-100 text-blue-900 font-bold'
                    : isDark
                      ? 'bg-[#1E1E1E] border-white/[0.08] text-slate-400 hover:text-white hover:bg-[#2A2A2A]'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs">{ed.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-bold uppercase tracking-tight ${
                      ed.installed 
                        ? isDark
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                    }`}>
                      {ed.installed ? 'Disponible' : 'No en PATH'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono font-semibold">{ed.cmd}</p>
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
