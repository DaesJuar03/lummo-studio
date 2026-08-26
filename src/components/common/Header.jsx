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
  FolderX
} from 'lucide-react';
import { getTranslations } from '../../locales';

export default function Header({
  openTabs = [],
  activeTabId = 'home',
  onSelectTab,
  onCloseTab,
  onPlusClick,
  onOpenCommandPalette,
  onOpenSettings,
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
      isDark ? 'border-white/[0.08] bg-[#090A0F]' : 'border-slate-200'
    }`} onClick={closeContextMenu}>
      {/* Top Titlebar Row */}
      <div 
        className={`h-11 px-3 flex items-center justify-between border-b ${
          isDark ? 'bg-[#090A0F]/95 backdrop-blur-md border-white/[0.08] text-[#F3F4F6]' : 'bg-slate-200/80 border-slate-300/70 text-slate-900'
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
                  ? 'bg-[#12141F] border border-white/[0.08] text-[#94A3B8] hover:text-white hover:bg-[#1A1D2D] hover:border-white/[0.16]'
                  : 'bg-white border border-slate-300 text-slate-800 hover:bg-blue-600 hover:text-white hover:border-blue-600'
              }`}
              title="Retroceder"
            >
              <ChevronLeft className="h-4 w-4 stroke-[2.5]" />
            </button>

            <button
              onClick={onGoForward}
              disabled={!canGoForward}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all shadow-2xs disabled:opacity-25 disabled:pointer-events-none cursor-pointer ${
                isDark
                  ? 'bg-[#12141F] border border-white/[0.08] text-[#94A3B8] hover:text-white hover:bg-[#1A1D2D] hover:border-white/[0.16]'
                  : 'bg-white border border-slate-300 text-slate-800 hover:bg-blue-600 hover:text-white hover:border-blue-600'
              }`}
              title="Avanzar"
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
              v2.3.0
            </span>
          </div>
        </div>

        {/* Center: Quick Command Omnibox Search */}
        <div className="flex-1 flex justify-center items-center px-4" style={{ WebkitAppRegion: 'no-drag' }}>
          <button
            onClick={onOpenCommandPalette}
            className={`w-60 sm:w-72 md:w-80 flex items-center justify-between px-3 py-1 rounded-xl border text-xs transition-all shadow-2xs cursor-pointer ${
              isDark
                ? 'bg-[#12141F] border border-white/[0.08] text-[#F3F4F6] hover:bg-[#1A1D2D] hover:border-blue-500/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.15)]'
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
        <div className="flex items-center space-x-2 shrink-0" style={{ WebkitAppRegion: 'no-drag' }}>
          <button
            onClick={onOpenSettings}
            className={`px-2.5 py-1 rounded-lg border border-transparent transition-all flex items-center space-x-1.5 text-xs font-bold cursor-pointer ${
              isDark 
                ? 'text-[#94A3B8] hover:bg-[#12141F] hover:border-white/[0.08] hover:text-white hover:shadow-2xs' 
                : 'text-slate-700 hover:bg-slate-200/70 hover:border-slate-300 hover:text-slate-900 hover:shadow-2xs'
            }`}
            title={t.settings}
          >
            <SettingsIcon className="h-3.5 w-3.5 text-slate-400" />
            <span>{t.settings}</span>
          </button>

          <div className={`flex items-center pl-2 border-l h-11 ${isDark ? 'border-white/[0.08]' : 'border-slate-300/70'}`}>
            <button
              onClick={handleMinimize}
              className={`w-10 h-11 flex items-center justify-center transition-all cursor-pointer ${
                isDark ? 'text-[#94A3B8] hover:text-white hover:bg-[#12141F]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/60'
              }`}
              title="Minimizar"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleMaximize}
              className={`w-10 h-11 flex items-center justify-center transition-all cursor-pointer ${
                isDark ? 'text-[#94A3B8] hover:text-white hover:bg-[#12141F]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/60'
              }`}
              title="Maximizar"
            >
              <Square className="h-3 w-3" />
            </button>
            <button
              onClick={handleClose}
              className="w-10 h-11 flex items-center justify-center text-slate-500 hover:text-white hover:bg-rose-600 transition-colors cursor-pointer"
              title="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row: Dedicated Open Tabs Bar with Drag & Drop and Pin Tabs */}
      <div 
        className={`h-9 px-3 flex items-center space-x-1 overflow-x-auto no-scrollbar scroll-smooth w-full ${
          isDark ? 'bg-[#0D0E15] border-t border-white/[0.08]' : 'bg-slate-100/80 border-t border-slate-200/80'
        }`}
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        <AnimatePresence mode="popLayout">
          {sortedTabs.map((tab) => {
            const isActive = activeTabId === tab.id;
            const isPinned = tab.pinned;

            return (
              <motion.div
                key={tab.id}
                layout
                draggable
                onDragStart={(e) => handleDragStart(e, tab.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, tab.id)}
                onContextMenu={(e) => handleContextMenu(e, tab)}
                initial={{ opacity: 0, y: 4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.12 } }}
                transition={{ type: "spring", stiffness: 450, damping: 30 }}
                onClick={() => onSelectTab(tab.id)}
                className={`group relative flex items-center space-x-2 px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer h-7 shrink-0 border ${
                  isPinned ? 'px-2 border-cyan-500/50 bg-cyan-500/10 text-cyan-400' : ''
                } ${
                  isActive
                    ? isDark 
                      ? 'bg-[#12141F] border-blue-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.2)] font-extrabold' 
                      : 'bg-white border-slate-300/90 text-blue-600 shadow-2xs font-extrabold'
                    : isDark
                      ? 'bg-[#090A0F]/70 border-white/[0.06] text-[#94A3B8] hover:text-white hover:bg-[#12141F] hover:border-white/[0.12]'
                      : 'bg-slate-200/50 border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-300/50'
                }`}
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
                    title="Cerrar pestaña"
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
            isDark ? 'text-[#94A3B8] hover:text-white hover:bg-[#12141F]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
          }`}
          title="Nueva pestaña"
        >
          <Plus className="h-4 w-4" />
        </motion.button>
      </div>

      {/* Tab Context Menu */}
      {contextMenu && (
        <div
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="fixed z-50 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl p-1.5 w-48 text-xs font-medium text-slate-200 animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              if (onTogglePinTab) onTogglePinTab(contextMenu.tab.id);
              closeContextMenu();
            }}
            className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-800 flex items-center gap-2 transition-colors"
          >
            {contextMenu.tab.pinned ? (
              <>
                <PinOff className="w-3.5 h-3.5 text-cyan-400" />
                <span>Desfijar Pestaña</span>
              </>
            ) : (
              <>
                <Pin className="w-3.5 h-3.5 text-cyan-400" />
                <span>Fijar Pestaña (Pin)</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              if (onDuplicateTab) onDuplicateTab(contextMenu.tab.id);
              closeContextMenu();
            }}
            className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-800 flex items-center gap-2 transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-purple-400" />
            <span>Duplicar Pestaña</span>
          </button>

          {contextMenu.tab.closable && (
            <>
              <div className="h-[1px] bg-slate-800 my-1" />
              <button
                onClick={() => {
                  if (onCloseOtherTabs) onCloseOtherTabs(contextMenu.tab.id);
                  closeContextMenu();
                }}
                className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-800 flex items-center gap-2 transition-colors"
              >
                <FolderX className="w-3.5 h-3.5 text-amber-400" />
                <span>Cerrar Otras Pestañas</span>
              </button>

              <button
                onClick={() => {
                  onCloseTab(contextMenu.tab.id);
                  closeContextMenu();
                }}
                className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-rose-950/60 text-rose-300 flex items-center gap-2 transition-colors"
              >
                <X className="w-3.5 h-3.5 text-rose-400" />
                <span>Cerrar Pestaña</span>
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );
}
