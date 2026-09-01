import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Settings as SettingsIcon,
  Search,
  Minus,
  Square,
  Pin,
  PinOff,
  Copy,
  FolderX,
  Sparkles
} from 'lucide-react';
import { getTranslations } from '../../locales';
import HeaderUpdateWidget from './HeaderUpdateWidget';

export default function Header({
  updater,
  openTabs = [],
  activeTabId = 'home',
  onSelectTab,
  onCloseTab,
  onPlusClick,
  onOpenCommandPalette,
  onOpenSettings,
  onOpenAiAssistant,
  runningCount,
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
  onReorderTabs,
  onTogglePinTab,
  onCloseOtherTabs,
  onDuplicateTab,
  theme,
  language = 'es'
}) {
  const isDark = theme === 'dark';
  const t = getTranslations(language);
  const [draggedTabId, setDraggedTabId] = useState(null);
  const [contextMenu, setContextMenu] = useState(null); // { x, y, tab }

  const handleMinimize = () => {
    if (window.electronAPI?.windowMinimize) window.electronAPI.windowMinimize();
  };

  const handleMaximize = () => {
    if (window.electronAPI?.windowMaximize) window.electronAPI.windowMaximize();
  };

  const handleClose = () => {
    if (window.electronAPI?.windowClose) window.electronAPI.windowClose();
  };

  // Drag & Drop handlers
  const handleDragStart = (e, tabId) => {
    setDraggedTabId(tabId);
    e.dataTransfer.setData('text/plain', tabId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetTabId) => {
    e.preventDefault();
    if (draggedTabId && draggedTabId !== targetTabId && onReorderTabs) {
      onReorderTabs(draggedTabId, targetTabId);
    }
    setDraggedTabId(null);
  };

  // Right-click context menu
  const handleContextMenu = (e, tab) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      tab
    });
  };

  const closeContextMenu = () => setContextMenu(null);

  // Sort pinned tabs first
  const sortedTabs = [...openTabs].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

  return (
    <header className={`relative z-40 border-b select-none w-full transition-colors duration-200 ${
      isDark ? 'border-white/[0.08] bg-[#141414]' : 'border-slate-200'
    }`} onClick={closeContextMenu}>
      {/* Top Titlebar Row */}
      <div 
        className={`h-11 pl-3 pr-0 flex items-center justify-between border-b ${
          isDark ? 'bg-[#141414]/95 backdrop-blur-md border-white/[0.08] text-[#E5E5E5]' : 'bg-slate-200/80 border-slate-300/70 text-slate-900'
        }`}
        style={{ WebkitAppRegion: 'drag' }}
      >
        {/* Left: Navigation Buttons & Logo */}
        <div className="flex items-center space-x-3 shrink-0" style={{ WebkitAppRegion: 'no-drag' }}>
          <div className="flex items-center space-x-1.5">
            <button
              onClick={onGoBack}
              disabled={!canGoBack}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all shadow-2xs disabled:opacity-25 disabled:pointer-events-none cursor-pointer ${
                isDark
                  ? 'bg-[#1E1E1E] border border-white/[0.08] text-[#888888] hover:text-white hover:bg-[#2A2A2A] hover:border-white/[0.16]'
                  : 'bg-white border border-slate-300 text-slate-800 hover:bg-blue-600 hover:text-white hover:border-blue-600'
              }`}
              title={language === 'es' ? 'Retroceder' : 'Go Back'}
            >
              <ChevronLeft className="h-4 w-4 stroke-[2.5]" />
            </button>

            <button
              onClick={onGoForward}
              disabled={!canGoForward}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all shadow-2xs disabled:opacity-25 disabled:pointer-events-none cursor-pointer ${
                isDark
                  ? 'bg-[#1E1E1E] border border-white/[0.08] text-[#888888] hover:text-white hover:bg-[#2A2A2A] hover:border-white/[0.16]'
                  : 'bg-white border border-slate-300 text-slate-800 hover:bg-blue-600 hover:text-white hover:border-blue-600'
              }`}
              title={language === 'es' ? 'Avanzar' : 'Go Forward'}
            >
              <ChevronRight className="h-4 w-4 stroke-[2.5]" />
            </button>
          </div>

          <div className="flex items-center space-x-2 pl-1">
            <img 
              src="Lummo.png" 
              onError={(e) => { e.target.src = 'public/Lummo.png'; }} 
              alt="Lummo Studio Logo" 
              className="w-5 h-5 object-contain" 
            />
            <span className={`font-extrabold text-xs tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Lummo Studio
            </span>
            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
              isDark 
                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                : 'bg-blue-50 text-blue-600 border border-blue-200'
            }`}>
              {updater?.currentVersion ? (updater.currentVersion.startsWith('v') ? updater.currentVersion : `v${updater.currentVersion}`) : 'v2.3.12'}
            </span>
          </div>
        </div>

        {/* Center: Quick Command Omnibox Search */}
        <div className="flex-1 flex justify-center items-center px-4" style={{ WebkitAppRegion: 'no-drag' }}>
          <button
            onClick={onOpenCommandPalette}
            className={`w-60 sm:w-72 md:w-80 flex items-center justify-between px-3 py-1 rounded-xl border text-xs transition-all shadow-2xs cursor-pointer ${
              isDark
                ? 'bg-[#1E1E1E] border border-white/[0.08] text-[#E5E5E5] hover:bg-[#2A2A2A] hover:border-blue-500/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-400'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Search className="h-3.5 w-3.5 text-blue-500" />
              <span className="font-semibold">{t.quickCommand || 'Quick Command'}</span>
            </div>
            <kbd className="hotkey-badge">Ctrl K</kbd>
          </button>
        </div>

        {/* Right Controls */}
        <div className="flex items-center shrink-0 h-full" style={{ WebkitAppRegion: 'no-drag' }}>
          {/* Widget / Botón de Actualización (Descargando o Listo para reiniciar) */}
          {updater && (
            <HeaderUpdateWidget
              status={updater.status}
              progress={updater.progress}
              updateInfo={updater.updateInfo}
              onRestartAndApply={updater.handleRestartAndApply}
              isDark={isDark}
              language={language}
            />
          )}

          {/* Botón Asistente IA (Si está habilitado en Experimental) */}
          {(typeof localStorage !== 'undefined' && localStorage.getItem('lummo-exp-ai') === 'true') && (
            <button
              onClick={onOpenAiAssistant}
              className={`mr-2 px-2.5 py-1 rounded-xl border flex items-center space-x-1.5 text-xs font-bold transition-all cursor-pointer ${
                isDark 
                  ? 'bg-purple-500/10 border-purple-500/30 text-purple-300 hover:bg-purple-500/20 hover:border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.2)]' 
                  : 'bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100 shadow-xs'
              }`}
              title={language === 'es' ? 'Abrir Asistente Lummo IA' : 'Open Lummo AI Assistant'}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
              <span>AI</span>
            </button>
          )}

          <button
            onClick={onOpenSettings}
            className={`mr-2 px-2.5 py-1 rounded-lg border border-transparent transition-all flex items-center space-x-1.5 text-xs font-bold cursor-pointer ${
              isDark 
                ? 'text-[#888888] hover:bg-[#1E1E1E] hover:border-white/[0.08] hover:text-white hover:shadow-2xs' 
                : 'text-slate-700 hover:bg-slate-300/60 hover:border-slate-300 hover:text-slate-900 hover:shadow-2xs'
            }`}
            title={t.settings}
          >
            <SettingsIcon className="h-3.5 w-3.5 text-slate-400" />
            <span>{t.settings}</span>
          </button>

          <div className={`flex items-stretch border-l h-full ${isDark ? 'border-white/[0.08]' : 'border-slate-300/70'}`}>
            <button
              onClick={handleMinimize}
              className={`w-11 h-full flex items-center justify-center transition-colors cursor-pointer ${
                isDark ? 'text-slate-400 hover:bg-white/5 hover:text-white' : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
              title={language === 'es' ? 'Minimizar' : 'Minimize'}
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleMaximize}
              className={`w-11 h-full flex items-center justify-center transition-colors cursor-pointer ${
                isDark ? 'text-slate-400 hover:bg-white/5 hover:text-white' : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
              title={language === 'es' ? 'Maximizar' : 'Maximize'}
            >
              <Square className="h-3 w-3" />
            </button>
            <button
              onClick={handleClose}
              className="w-11 h-full flex items-center justify-center text-slate-400 hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
              title={language === 'es' ? 'Cerrar' : 'Close'}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Row Bar */}
      <div 
        className={`flex items-center px-2 py-1 space-x-1 select-none overflow-x-auto no-scrollbar ${
          isDark ? 'bg-[#181818]' : 'bg-slate-200/90'
        }`}
        style={{ WebkitAppRegion: 'drag' }}
      >
        <AnimatePresence initial={false}>
          {sortedTabs.map((tab) => {
            const isActive = activeTabId === tab.id;
            const isPinned = tab.pinned;

            return (
              <motion.div
                key={tab.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                draggable={!isPinned}
                onDragStart={(e) => handleDragStart(e, tab.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, tab.id)}
                onClick={() => onSelectTab(tab.id)}
                onContextMenu={(e) => handleContextMenu(e, tab)}
                style={{ WebkitAppRegion: 'no-drag' }}
                className={`h-7 rounded-md flex items-center text-xs font-semibold px-3 space-x-1.5 transition-colors cursor-pointer shrink-0 ${
                  isActive
                    ? isDark 
                      ? 'bg-[#282828] text-white shadow-2xs border border-white/[0.08]' 
                      : 'bg-white text-slate-900 shadow-2xs border border-slate-300'
                    : isDark 
                      ? 'text-[#888888] hover:bg-[#1E1E1E] hover:text-[#CCCCCC]' 
                      : 'text-slate-600 hover:bg-slate-300/60 hover:text-slate-900'
                } ${isPinned ? 'px-2' : ''}`}
                title={tab.title}
              >
                {isPinned && <Pin className="w-3 h-3 text-cyan-400 shrink-0 rotate-45" />}
                {!isPinned && <span className="max-w-[150px] truncate">{tab.title}</span>}

                {tab.closable && !isPinned && (
                  <motion.button
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab(tab.id);
                    }}
                    className="p-0.5 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors ml-1"
                    title={t.closeTab || 'Close tab'}
                  >
                    <X className="h-3 w-3" />
                  </motion.button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onPlusClick}
          className={`p-1 rounded-md transition-all h-7 w-7 flex items-center justify-center shrink-0 cursor-pointer ${
            isDark ? 'text-[#888888] hover:text-white hover:bg-[#1E1E1E]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
          }`}
          title={t.newTab || 'New tab'}
          style={{ WebkitAppRegion: 'no-drag' }}
        >
          <Plus className="h-4 w-4" />
        </motion.button>
      </div>

      {/* Tab Context Menu */}
      {contextMenu && (
        <div
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="fixed z-50 bg-[#1E1E1E] border border-white/[0.08] rounded-xl shadow-2xl p-1.5 w-48 text-xs font-medium text-neutral-200 animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              if (onTogglePinTab) onTogglePinTab(contextMenu.tab.id);
              closeContextMenu();
            }}
            className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-[#2A2A2A] flex items-center gap-2 transition-colors"
          >
            {contextMenu.tab.pinned ? (
              <>
                <PinOff className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t.unpinTab || 'Unpin Tab'}</span>
              </>
            ) : (
              <>
                <Pin className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t.pinTab || 'Pin Tab'}</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              if (onDuplicateTab) onDuplicateTab(contextMenu.tab.id);
              closeContextMenu();
            }}
            className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-[#2A2A2A] flex items-center gap-2 transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-purple-400" />
            <span>{t.duplicateTab || 'Duplicate Tab'}</span>
          </button>

          {contextMenu.tab.closable && (
            <>
              <div className="h-[1px] bg-white/[0.08] my-1" />
              <button
                onClick={() => {
                  if (onCloseOtherTabs) onCloseOtherTabs(contextMenu.tab.id);
                  closeContextMenu();
                }}
                className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-[#2A2A2A] flex items-center gap-2 transition-colors"
              >
                <FolderX className="w-3.5 h-3.5 text-amber-400" />
                <span>{t.closeOtherTabs || 'Close Other Tabs'}</span>
              </button>

              <button
                onClick={() => {
                  onCloseTab(contextMenu.tab.id);
                  closeContextMenu();
                }}
                className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-rose-950/60 text-rose-300 flex items-center gap-2 transition-colors"
              >
                <X className="w-3.5 h-3.5 text-rose-400" />
                <span>{t.closeTab || 'Close Tab'}</span>
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );
}
