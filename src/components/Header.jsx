import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Settings as SettingsIcon,
  Search,
  Minus,
  Square
} from 'lucide-react';
import { getTranslations } from '../locales';

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
  theme,
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
    <header 
      className={`sticky top-0 z-40 border-b shadow-xs pl-3 pr-0 py-0 flex items-center justify-between select-none w-full transition-colors duration-200 h-11 ${
        isDark ? 'bg-[#181818] border-[#2a2a2a] text-[#e4e4e7]' : 'bg-slate-200/80 border-slate-300 text-slate-900'
      }`}
      style={{ WebkitAppRegion: 'drag' }}
    >
      {/* Left: History Navigation & Dynamic Tabs */}
      <div className="flex items-center space-x-2 shrink-0 h-full max-w-[45%]" style={{ WebkitAppRegion: 'no-drag' }}>
        
        {/* Back / Forward Buttons */}
        <div className={`flex items-center space-x-0.5 pr-1.5 border-r ${isDark ? 'border-[#2a2a2a]' : 'border-slate-300/80'}`}>
          <button
            onClick={onGoBack}
            disabled={!canGoBack}
            className={`p-1.5 rounded-xl transition-colors disabled:opacity-20 ${
              isDark ? 'text-[#a1a1aa] hover:text-white hover:bg-[#282828]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/60'
            }`}
            title="Retroceder"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={onGoForward}
            disabled={!canGoForward}
            className={`p-1.5 rounded-xl transition-colors disabled:opacity-20 ${
              isDark ? 'text-[#a1a1aa] hover:text-white hover:bg-[#282828]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/60'
            }`}
            title="Avanzar"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Dynamic Tab Bar */}
        <div className="flex items-end space-x-1 h-full pt-1.5 overflow-x-auto">
          <AnimatePresence mode="popLayout">
            {openTabs.map((tab) => {
              const isActive = activeTabId === tab.id;
              return (
                <motion.div
                  key={tab.id}
                  layout
                  initial={{ opacity: 0, y: 6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                  transition={{ type: "spring", stiffness: 450, damping: 30 }}
                  onClick={() => onSelectTab(tab.id)}
                  className={`group relative flex items-center space-x-2 px-3.5 py-1.5 rounded-t-xl text-xs font-bold transition-all cursor-pointer border-t border-x h-9 ${
                    isActive
                      ? isDark 
                        ? 'bg-[#2b2b2b] border-[#3f3f46] text-white shadow-xs' 
                        : 'bg-slate-50 border-slate-300 text-blue-600 shadow-xs'
                      : isDark
                        ? 'bg-[#1e1e1e] border-transparent text-[#a1a1aa] hover:text-white hover:bg-[#242424]'
                        : 'bg-slate-200/50 border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-300/50'
                  }`}
                >
                  <span className="max-w-[150px] truncate">{tab.title}</span>

                  {tab.closable && (
                    <motion.button
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onCloseTab(tab.id);
                      }}
                      className="p-0.5 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                      title="Cerrar pestaña"
                    >
                      <X className="h-3 w-3" />
                    </motion.button>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          <motion.div layout className="relative mb-1">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onPlusClick}
              className={`p-1.5 rounded-xl transition-all ${
                isDark ? 'text-[#a1a1aa] hover:text-white hover:bg-[#282828]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/60'
              }`}
              title="Nueva pestaña"
            >
              <Plus className="h-4 w-4" />
            </motion.button>
          </motion.div>
        </div>

      </div>

      {/* Center: Quick Command Omnibox Trigger */}
      <div className="flex-1 flex justify-center items-center px-4" style={{ WebkitAppRegion: 'no-drag' }}>
        <button
          onClick={onOpenCommandPalette}
          className={`w-full max-w-xs sm:max-w-sm flex items-center justify-between px-3 py-1 rounded-xl border text-xs transition-all shadow-2xs ${
            isDark
              ? 'bg-[#222222] border-[#333333] text-[#d4d4d8] hover:bg-[#2a2a2a] hover:border-slate-600'
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

      {/* Right Controls Row: Settings as Text-Only Link + Window Controls */}
      <div className="flex items-center space-x-3 shrink-0 h-full">
        <div className="flex items-center space-x-2" style={{ WebkitAppRegion: 'no-drag' }}>
          {/* Settings as clean text-only link without border/box */}
          <button
            onClick={onOpenSettings}
            className={`px-2 py-1 flex items-center space-x-1.5 text-xs font-bold transition-all hover:text-blue-500 ${
              isDark ? 'text-slate-300' : 'text-slate-700'
            }`}
            title={t.settings}
          >
            <SettingsIcon className="h-3.5 w-3.5 text-slate-400" />
            <span>{t.settings || 'Ajustes'}</span>
          </button>
        </div>

        {/* Window Controls */}
        <div className={`flex items-center pl-2 border-l h-11 ${isDark ? 'border-[#2a2a2a]' : 'border-slate-300/80'}`} style={{ WebkitAppRegion: 'no-drag' }}>
          <button
            onClick={handleMinimize}
            className={`w-11 h-11 flex items-center justify-center transition-all ${
              isDark ? 'text-[#a1a1aa] hover:text-white hover:bg-[#282828]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/60'
            }`}
            title="Minimizar"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleMaximize}
            className={`w-11 h-11 flex items-center justify-center transition-all ${
              isDark ? 'text-[#a1a1aa] hover:text-white hover:bg-[#282828]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/60'
            }`}
            title="Maximizar"
          >
            <Square className="h-3 w-3" />
          </button>
          <button
            onClick={handleClose}
            className="w-11 h-11 flex items-center justify-center text-slate-600 hover:text-white hover:bg-rose-600 transition-colors"
            title="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
