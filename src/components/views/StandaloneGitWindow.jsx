import React from 'react';
import { 
  GitBranch, 
  Minus, 
  Square, 
  X 
} from 'lucide-react';
import GitInspectorView from './git/GitInspectorView';
import { getTranslations } from '../../locales';

export default function StandaloneGitWindow({
  projectId,
  projectName = 'Proyecto',
  projectPath = '',
  theme = 'dark',
  language = 'es'
}) {
  const isDark = theme === 'dark';
  const t = getTranslations(language);

  const handleMinimize = () => {
    if (window.electronAPI?.windowMinimize) window.electronAPI.windowMinimize();
  };

  const handleMaximize = () => {
    if (window.electronAPI?.windowMaximize) window.electronAPI.windowMaximize();
  };

  const handleClose = () => {
    if (window.electronAPI?.windowClose) window.electronAPI.windowClose();
  };

  return (
    <div className={`h-screen w-screen flex flex-col font-sans overflow-hidden select-none ${
      isDark ? 'bg-[#121214] text-[#E5E5E5]' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Titlebar Row (Frameless & Draggable) */}
      <div 
        className={`h-11 pl-4 pr-0 flex items-center justify-between border-b shrink-0 ${
          isDark ? 'bg-[#161619] border-white/[0.08]' : 'bg-slate-100 border-slate-200'
        }`}
        style={{ WebkitAppRegion: 'drag' }}
      >
        {/* Left: Window Title & Badge */}
        <div className="flex items-center space-x-3" style={{ WebkitAppRegion: 'no-drag' }}>
          <div className="w-6 h-6 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
            <GitBranch className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-xs tracking-tight">Git Inspector</span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {projectName}
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400 truncate max-w-sm hidden sm:inline" title={projectPath}>
            {projectPath}
          </span>
        </div>

        {/* Right: Window Controls */}
        <div className="flex items-stretch border-l h-full shrink-0" style={{ WebkitAppRegion: 'no-drag' }}>
          <button
            onClick={handleMinimize}
            className={`w-11 h-full flex items-center justify-center transition-colors cursor-pointer ${
              isDark ? 'text-slate-400 hover:bg-white/5 hover:text-white' : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
            title="Minimizar"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleMaximize}
            className={`w-11 h-full flex items-center justify-center transition-colors cursor-pointer ${
              isDark ? 'text-slate-400 hover:bg-white/5 hover:text-white' : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
            title="Maximizar"
          >
            <Square className="h-3 w-3" />
          </button>
          <button
            onClick={handleClose}
            className="w-11 h-full flex items-center justify-center text-slate-400 hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
        <GitInspectorView
          folderPath={projectPath}
          theme={theme}
          language={language}
          t={t}
        />
      </div>
    </div>
  );
}
