import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings as SettingsIcon, Cpu, Hash, Code, Sliders, RefreshCw, Sun, Moon, Languages } from 'lucide-react';
import { availableLocales, getTranslations } from '../locales';

export default function SettingsModal({ 
  onClose, 
  envStatus, 
  onScanEnv, 
  isScanning, 
  theme, 
  onToggleTheme,
  language = 'es',
  onSelectLanguage
}) {
  const [activeCategory, setActiveCategory] = useState('services');

  const t = getTranslations(language);

  const categories = [
    { id: 'services', label: t.systemServices, icon: Cpu },
    { id: 'ports', label: t.defaultPorts, icon: Hash },
    { id: 'editor', label: t.codeEditorTab, icon: Code },
    { id: 'general', label: t.generalTab, icon: Sliders },
  ];

  const isDark = theme === 'dark';

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none"
        onClick={onClose}
      >
        {/* Modal Container */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-4xl h-[580px] rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${
            isDark ? 'bg-[#1e1e1e] border-[#2a2a2a] text-[#e4e4e7]' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          
          {/* Modal Header */}
          <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
            isDark ? 'bg-[#181818] border-[#2a2a2a]' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <SettingsIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className={`font-extrabold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.settingsTitle}</h3>
                <p className="text-xs text-slate-500">{t.settingsDesc}</p>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors ${
                isDark ? 'text-[#a1a1aa] hover:text-white hover:bg-[#282828]' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
              }`}
            >
              <X className="h-5 w-5" />
            </motion.button>
          </div>

          {/* Modal Content */}
          <div className="flex-1 flex overflow-hidden">
            
            {/* Left Sidebar Categories */}
            <div className={`w-64 border-r p-4 space-y-1 shrink-0 ${
              isDark ? 'bg-[#181818] border-[#2a2a2a]' : 'bg-slate-50/80 border-slate-200'
            }`}>
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left ${
                      isActive
                        ? isDark 
                          ? 'bg-[#2b2b2b] border border-[#3f3f46] text-white shadow-xs' 
                          : 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                        : isDark
                          ? 'text-[#a1a1aa] hover:bg-[#242424] hover:text-white'
                          : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? (isDark ? 'text-blue-400' : 'text-white') : 'text-slate-400'}`} />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Right Category Details View */}
            <div className={`flex-1 p-6 overflow-y-auto space-y-6 ${isDark ? 'bg-[#161616]' : 'bg-white'}`}>
              
              {/* Category 1: Servicios del Sistema */}
              {activeCategory === 'services' && (
                <motion.div initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }} className="space-y-6">
                  <div className={`flex items-center justify-between border-b pb-4 ${isDark ? 'border-[#2a2a2a]' : 'border-slate-100'}`}>
                    <div>
                      <h4 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.systemServices}</h4>
                      <p className="text-xs text-slate-500">Diagnóstico de ejecutables y motores locales detectados en tu equipo</p>
                    </div>
                    {onScanEnv && (
                      <motion.button
                        whileTap={{ scale: 0.94 }}
                        onClick={onScanEnv}
                        disabled={isScanning}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 ${
                          isDark ? 'bg-[#222] border-[#333] text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                        <span>{isScanning ? 'Escaneando...' : 'Re-Escanear'}</span>
                      </motion.button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { name: 'Node.js', key: 'node' },
                      { name: 'PHP Engine', key: 'php' },
                      { name: 'MySQL', key: 'mysql' },
                      { name: 'PostgreSQL', key: 'postgres' },
                      { name: 'Python', key: 'python' },
                      { name: 'Docker', key: 'docker' },
                      { name: 'SQLite', key: 'sqlite' }
                    ].map((srv) => {
                      const status = envStatus ? envStatus[srv.key] : null;
                      const isInstalled = status?.installed;
                      return (
                        <div key={srv.key} className={`p-4 rounded-2xl border flex items-center justify-between ${
                          isDark ? 'bg-[#181818] border-[#2a2a2a]' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <div>
                            <span className={`block font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>{srv.name}</span>
                            <span className="block text-[11px] font-mono text-slate-500">{status?.version || (isInstalled ? 'Instalado' : 'No instalado')}</span>
                          </div>
                          <span className={`w-2.5 h-2.5 rounded-full ${isInstalled ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Category 2: Puertos por Defecto */}
              {activeCategory === 'ports' && (
                <motion.div initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }} className="space-y-6">
                  <div className={`border-b pb-4 ${isDark ? 'border-[#2a2a2a]' : 'border-slate-100'}`}>
                    <h4 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.defaultPorts}</h4>
                    <p className="text-xs text-slate-500">Mapeo predeterminado de puertos para evitar conflictos en local</p>
                  </div>

                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200/50">
                      <span>Vite / React Dev Server</span>
                      <span className="font-bold text-blue-500">:5173</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200/50">
                      <span>Next.js App Router</span>
                      <span className="font-bold text-blue-500">:3000</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200/50">
                      <span>Express / Node API</span>
                      <span className="font-bold text-blue-500">:8080</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200/50">
                      <span>PHP Artisan Serve</span>
                      <span className="font-bold text-blue-500">:8000</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Category 3: Editor de Código */}
              {activeCategory === 'editor' && (
                <motion.div initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }} className="space-y-6">
                  <div className={`border-b pb-4 ${isDark ? 'border-[#2a2a2a]' : 'border-slate-100'}`}>
                    <h4 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.codeEditorTab}</h4>
                    <p className="text-xs text-slate-500">Editor predeterminado para abrir las carpetas de tus proyectos</p>
                  </div>

                  <div className="p-4 rounded-2xl border bg-blue-500/10 border-blue-500/30 text-blue-500 text-xs font-semibold">
                    Se utilizará `Visual Studio Code` (`code`) mediante comandos de terminal. Si no se encuentra, se abrirá el Explorador de archivos de Windows.
                  </div>
                </motion.div>
              )}

              {/* Category 4: General */}
              {activeCategory === 'general' && (
                <motion.div initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }} className="space-y-6">
                  <div className={`border-b pb-4 ${isDark ? 'border-[#2a2a2a]' : 'border-slate-100'}`}>
                    <h4 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.generalTab}</h4>
                    <p className="text-xs text-slate-500">Ajustes globales de idioma y apariencia visual</p>
                  </div>

                  {/* Dynamic Language Switcher from src/locales/ *.json */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase font-mono tracking-wider block flex items-center gap-1.5">
                      <Languages className="h-4 w-4 text-blue-500" />
                      {t.languageSection}
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      {availableLocales.map((loc) => {
                        const isSelected = language === loc.code;
                        return (
                          <button
                            key={loc.code}
                            type="button"
                            onClick={() => onSelectLanguage && onSelectLanguage(loc.code)}
                            className={`p-4 rounded-2xl border flex items-center justify-between text-left transition-all ${
                              isSelected 
                                ? isDark
                                  ? 'bg-[#2b2b2b] border-[#3f3f46] text-white ring-1 ring-blue-500 font-bold'
                                  : 'bg-blue-50 border-blue-600 text-blue-900 ring-2 ring-blue-100 font-bold'
                                : isDark
                                  ? 'bg-[#181818] border-[#2e2e2e] text-slate-400 hover:text-white'
                                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <span className="text-lg font-bold font-mono">{loc.badge}</span>
                              <div>
                                <span className="block text-xs font-bold">{loc.name}</span>
                                <span className="block text-[11px] text-slate-500 font-normal">{loc.description}</span>
                              </div>
                            </div>
                            {isSelected && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Theme Switcher Setting */}
                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-bold text-slate-500 uppercase font-mono tracking-wider block">
                      {t.themeSection}
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => theme !== 'light' && onToggleTheme()}
                        className={`p-4 rounded-2xl border flex items-center justify-between text-left transition-all ${
                          !isDark 
                            ? 'bg-blue-50 border-blue-600 text-blue-900 ring-2 ring-blue-100 font-bold' 
                            : 'bg-[#181818] border-[#2e2e2e] text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <Sun className={`h-5 w-5 ${!isDark ? 'text-blue-600' : 'text-slate-400'}`} />
                          <div>
                            <span className="block text-xs font-bold">{t.lightMode}</span>
                            <span className="block text-[11px] text-slate-500 font-normal">{t.lightModeDesc}</span>
                          </div>
                        </div>
                        {!isDark && <span className="w-2 h-2 rounded-full bg-blue-600"></span>}
                      </button>

                      <button
                        type="button"
                        onClick={() => theme !== 'dark' && onToggleTheme()}
                        className={`p-4 rounded-2xl border flex items-center justify-between text-left transition-all ${
                          isDark 
                            ? 'bg-[#2b2b2b] border-[#3f3f46] text-white ring-1 ring-blue-500 font-bold' 
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <Moon className={`h-5 w-5 ${isDark ? 'text-blue-400' : 'text-slate-400'}`} />
                          <div>
                            <span className="block text-xs font-bold">{t.darkMode}</span>
                            <span className="block text-[11px] text-slate-500 font-normal">{t.darkModeDesc}</span>
                          </div>
                        </div>
                        {isDark && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                      </button>
                    </div>
                  </div>

                </motion.div>
              )}

            </div>

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
