import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Languages, Moon, Sun, ChevronDown, Trash2, Check } from 'lucide-react';
import { availableLocales } from '../../../locales';

export default function GeneralTab({
  language,
  onSelectLanguage,
  theme,
  onToggleTheme,
  onClearAllLogs,
  t
}) {
  const isDark = theme === 'dark';
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem('lummo-notifications') !== 'false';
      }
    } catch {
      // Ignored
    }
    return true;
  });
  const [clearedLogsNotice, setClearedLogsNotice] = useState(false);

  const handleClearLogsAction = () => {
    if (onClearAllLogs) onClearAllLogs();
    setClearedLogsNotice(true);
    setTimeout(() => setClearedLogsNotice(false), 2500);
  };

  return (
    <motion.div initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }} className="space-y-6">
      <div className={`border-b pb-4 ${isDark ? 'border-white/[0.08]' : 'border-slate-100'}`}>
        <h4 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.generalTab}</h4>
        <p className="text-xs text-slate-400">Ajustes globales de idioma y apariencia visual</p>
      </div>

      {/* Language and Theme Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Column 1: Language Select */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
            <Languages className="h-4 w-4 text-blue-400" />
            <span>{t.languageSection}</span>
          </label>
          <div className="relative">
            <select
              value={language}
              onChange={(e) => onSelectLanguage && onSelectLanguage(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-2xl border text-xs font-bold outline-none cursor-pointer appearance-none transition-all ${
                isDark 
                  ? 'bg-[#12141F] border-white/[0.08] text-white hover:border-white/[0.16] focus:border-blue-500' 
                  : 'bg-slate-50 border-slate-200 text-slate-900 hover:border-slate-300 focus:border-blue-500'
              }`}
            >
              {availableLocales.map((loc) => (
                <option key={loc.code} value={loc.code} className={isDark ? 'bg-[#12141F] text-white' : 'bg-white text-slate-900'}>
                  {loc.name} ({loc.badge})
                </option>
              ))}
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Column 2: Theme Select */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
            {isDark ? <Moon className="h-4 w-4 text-blue-400" /> : <Sun className="h-4 w-4 text-amber-500" />}
            <span>{t.themeSection}</span>
          </label>
          <div className="relative">
            <select
              value={theme}
              onChange={(e) => {
                const val = e.target.value;
                if (val !== theme) onToggleTheme();
              }}
              className={`w-full px-3.5 py-2.5 rounded-2xl border text-xs font-bold outline-none cursor-pointer appearance-none transition-all ${
                isDark 
                  ? 'bg-[#12141F] border-white/[0.08] text-white hover:border-white/[0.16] focus:border-blue-500' 
                  : 'bg-slate-50 border-slate-200 text-slate-900 hover:border-slate-300 focus:border-blue-500'
              }`}
            >
              <option value="light" className={isDark ? 'bg-[#12141F] text-white' : 'bg-white text-slate-900'}>
                {t.lightMode}
              </option>
              <option value="dark" className={isDark ? 'bg-[#12141F] text-white' : 'bg-white text-slate-900'}>
                {t.darkMode}
              </option>
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>

      {/* System Notifications & Logs Memory Management */}
      <div className="space-y-2.5 pt-4 border-t border-white/[0.08]">
        <div className={`flex items-center justify-between p-3.5 rounded-2xl border ${
          isDark ? 'bg-[#12141F] border-white/[0.08]' : 'bg-slate-500/5 border-slate-200/50'
        }`}>
          <div>
            <span className="block text-xs font-bold">Notificaciones Nativas de Windows</span>
            <span className="block text-[11px] text-slate-400">Recibe alertas del sistema cuando tus servidores se inicien, fallen o finalicen.</span>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = !notificationsEnabled;
              setNotificationsEnabled(next);
              try {
                if (typeof localStorage !== 'undefined') {
                  localStorage.setItem('lummo-notifications', String(next));
                }
              } catch {}
              if (next && window.electronAPI?.sendNotification) {
                window.electronAPI.sendNotification('Lummo Studio', 'Notificaciones del sistema activadas correctamente 🔔');
              }
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
              notificationsEnabled
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                : isDark ? 'bg-[#181B28] text-slate-400 border border-white/[0.08]' : 'bg-slate-300 text-slate-700'
            }`}
          >
            {notificationsEnabled ? 'ACTIVADAS' : 'DESACTIVADAS'}
          </button>
        </div>

        <div className={`flex items-center justify-between p-3.5 rounded-2xl border ${
          isDark ? 'bg-[#12141F] border-rose-500/20' : 'bg-rose-500/5 border-rose-500/20'
        }`}>
          <div>
            <span className="block text-xs font-bold text-rose-400">Memoria de Logs de Servidores</span>
            <span className="block text-[11px] text-slate-400">Libera memoria RAM borrando el historial de texto acumulado en las consolas.</span>
          </div>
          <button
            type="button"
            onClick={handleClearLogsAction}
            className={`p-2.5 rounded-xl transition-all flex items-center justify-center cursor-pointer shadow-xs ${
              clearedLogsNotice
                ? 'bg-emerald-600 text-white'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
            }`}
            title={clearedLogsNotice ? '¡Logs Limpiados!' : 'Limpiar Todo los Logs'}
          >
            {clearedLogsNotice ? <Check className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
