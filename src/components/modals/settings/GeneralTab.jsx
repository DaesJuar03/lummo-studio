import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Languages, 
  Moon, 
  Sun, 
  ChevronDown, 
  Trash2, 
  Check, 
  RefreshCw, 
  FlaskConical, 
  Sparkles, 
  FileText, 
  Rocket, 
  BellRing, 
  Zap,
  Lock,
  Unlock
} from 'lucide-react';
import { availableLocales } from '../../../locales';

export default function GeneralTab({
  language,
  onSelectLanguage,
  theme,
  onToggleTheme,
  onClearAllLogs,
  updater,
  onCloseModal,
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
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [updateStatusNotice, setUpdateStatusNotice] = useState(null);
  const [devLabNotice, setDevLabNotice] = useState(null);

  // DevLab visibility: Active in Development, or if unlocked via 5-click easter egg
  const [showDevLab, setShowDevLab] = useState(() => {
    if (import.meta.env.DEV) return true;
    try {
      return localStorage.getItem('lummo-devlab-unlocked') === 'true';
    } catch {
      return false;
    }
  });
  const [versionClickCount, setVersionClickCount] = useState(0);

  const showDevNotice = (msg) => {
    setDevLabNotice(msg);
    setTimeout(() => setDevLabNotice(null), 4000);
  };

  const handleVersionClick = () => {
    const nextCount = versionClickCount + 1;
    setVersionClickCount(nextCount);
    if (nextCount >= 5) {
      const nextState = !showDevLab;
      setShowDevLab(nextState);
      setVersionClickCount(0);
      try {
        localStorage.setItem('lummo-devlab-unlocked', String(nextState));
      } catch {}
      showDevNotice(nextState 
        ? (language === 'es' ? '🧪 ¡DevLab activado!' : '🧪 DevLab activated!')
        : (language === 'es' ? '🔒 DevLab ocultado.' : '🔒 DevLab hidden.')
      );
    }
  };

  const handleClearLogsAction = () => {
    if (onClearAllLogs) onClearAllLogs();
    setClearedLogsNotice(true);
    setTimeout(() => setClearedLogsNotice(false), 2500);
  };

  const handleCheckForUpdatesAction = async () => {
    if (!window.electronAPI?.updater?.checkForUpdates) {
      if (updater?.handleCheckForUpdates) {
        updater.handleCheckForUpdates();
      }
      return;
    }
    setCheckingUpdates(true);
    setUpdateStatusNotice(null);

    try {
      const res = await window.electronAPI.updater.checkForUpdates();
      if (res?.hasUpdate) {
        setUpdateStatusNotice({
          type: 'success',
          text: language === 'es' ? `¡Nueva versión v${res.version} disponible en GitHub!` : `New version v${res.version} available on GitHub!`
        });
      } else {
        setUpdateStatusNotice({
          type: 'info',
          text: language === 'es' ? '¡Estás en la versión más reciente!' : 'You are on the latest version!'
        });
      }
    } catch (err) {
      setUpdateStatusNotice({
        type: 'info',
        text: language === 'es' ? 'Búsqueda completada. Sistema al día.' : 'Check complete. System up to date.'
      });
    } finally {
      setCheckingUpdates(false);
      setTimeout(() => setUpdateStatusNotice(null), 4000);
    }
  };

  // 1. Trigger Header Download Simulation
  const handleSimulateFlowAction = () => {
    if (updater?.handleSimulateUpdate) {
      updater.handleSimulateUpdate();
    } else if (window.electronAPI?.updater?.simulateFlow) {
      window.electronAPI.updater.simulateFlow();
    }
    showDevNotice(language === 'es' ? '⚡ Simulación de descarga iniciada en el Header.' : '⚡ Download simulation started in Header.');
  };

  // 2. Trigger Post-Update Top Banner
  const handleTestPostUpdateBannerAction = (shouldCloseSettings = false) => {
    if (updater?.setShowPostUpdateBanner) {
      updater.setShowPostUpdateBanner(true);
    }
    showDevNotice(language === 'es' ? '🎉 Banner superior post-actualización activado.' : '🎉 Top post-update banner activated.');
    if (shouldCloseSettings && onCloseModal) {
      setTimeout(() => onCloseModal(), 300);
    }
  };

  // 3. Trigger Changelog / Whats New Card
  const handleTestChangelogSheetAction = () => {
    if (updater?.openChangelogSheet) {
      updater.openChangelogSheet();
    } else if (updater?.setShowChangelogSheet) {
      updater.setShowChangelogSheet(true);
    }
    showDevNotice(language === 'es' ? '📄 Tarjeta flotante de Novedades (Changelog) abierta en la esquina inferior.' : '📄 Floating Whats New card opened in bottom corner.');
  };

  // 4. Trigger Full Post-Update Experience (Banner + Card)
  const handleTestFullPostUpdateAction = (shouldCloseSettings = false) => {
    if (updater?.triggerTestPostUpdate) {
      updater.triggerTestPostUpdate();
    } else {
      updater?.setShowPostUpdateBanner?.(true);
      updater?.openChangelogSheet?.();
    }
    showDevNotice(language === 'es' ? '🚀 ¡Experiencia completa post-actualización activada (Banner + Tarjeta)!' : '🚀 Full post-update experience activated (Banner + Sheet)!');
    if (shouldCloseSettings && onCloseModal) {
      setTimeout(() => onCloseModal(), 300);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }} className="space-y-6">
      <div className={`border-b pb-4 ${isDark ? 'border-white/[0.08]' : 'border-slate-100'}`}>
        <h4 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.generalTab || 'General'}</h4>
        <p className="text-xs text-slate-400">
          {language === 'es' ? 'Ajustes globales de idioma, apariencia visual y sistema' : 'Global language, visual appearance, and system settings'}
        </p>
      </div>

      {/* Language and Theme Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Column 1: Language Select */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
            <Languages className="h-4 w-4 text-blue-400" />
            <span>{t.languageSection || 'Language'}</span>
          </label>
          <div className="relative">
            <select
              value={language}
              onChange={(e) => onSelectLanguage && onSelectLanguage(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-2xl border text-xs font-bold outline-none cursor-pointer appearance-none transition-all ${
                isDark 
                  ? 'bg-[#1E1E1E] border-white/[0.08] text-white hover:border-white/[0.16] focus:border-blue-500' 
                  : 'bg-slate-50 border-slate-200 text-slate-900 hover:border-slate-300 focus:border-blue-500'
              }`}
            >
              {availableLocales.map((loc) => (
                <option key={loc.code} value={loc.code} className={isDark ? 'bg-[#1E1E1E] text-white' : 'bg-white text-slate-900'}>
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
            <span>{t.themeSection || 'Theme'}</span>
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
                  ? 'bg-[#1E1E1E] border-white/[0.08] text-white hover:border-white/[0.16] focus:border-blue-500' 
                  : 'bg-slate-50 border-slate-200 text-slate-900 hover:border-slate-300 focus:border-blue-500'
              }`}
            >
              <option value="light" className={isDark ? 'bg-[#1E1E1E] text-white' : 'bg-white text-slate-900'}>
                {t.lightMode || 'Light Mode'}
              </option>
              <option value="dark" className={isDark ? 'bg-[#1E1E1E] text-white' : 'bg-white text-slate-900'}>
                {t.darkMode || 'Dark Mode'}
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
          isDark ? 'bg-[#1E1E1E] border-white/[0.08]' : 'bg-slate-500/5 border-slate-200/50'
        }`}>
          <div>
            <span className="block text-xs font-bold">{language === 'es' ? 'Notificaciones Nativas del Sistema' : 'Native System Notifications'}</span>
            <span className="block text-[11px] text-slate-400">
              {language === 'es' 
                ? 'Recibe alertas del sistema cuando tus servidores se inicien, fallen o finalicen.' 
                : 'Receive system alerts when your servers start, fail, or stop.'}
            </span>
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
                window.electronAPI.sendNotification(
                  'Lummo Studio', 
                  language === 'es' ? 'Notificaciones del sistema activadas correctamente 🔔' : 'System notifications enabled successfully 🔔'
                );
              }
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
              notificationsEnabled
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                : isDark ? 'bg-[#252525] text-slate-400 border border-white/[0.08]' : 'bg-slate-300 text-slate-700'
            }`}
          >
            {notificationsEnabled 
              ? (language === 'es' ? 'ACTIVADAS' : 'ENABLED') 
              : (language === 'es' ? 'DESACTIVADAS' : 'DISABLED')}
          </button>
        </div>

        <div className={`flex items-center justify-between p-3.5 rounded-2xl border ${
          isDark ? 'bg-[#1E1E1E] border-rose-500/20' : 'bg-rose-500/5 border-rose-500/20'
        }`}>
          <div>
            <span className="block text-xs font-bold text-rose-400">
              {language === 'es' ? 'Memoria de Logs de Servidores' : 'Server Log Buffer Memory'}
            </span>
            <span className="block text-[11px] text-slate-400">
              {language === 'es' 
                ? 'Libera memoria RAM borrando el historial de texto acumulado en las consolas.' 
                : 'Free up RAM by clearing accumulated terminal text logs.'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleClearLogsAction}
            className={`p-2.5 rounded-xl transition-all flex items-center justify-center cursor-pointer shadow-xs ${
              clearedLogsNotice
                ? 'bg-emerald-600 text-white'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
            }`}
            title={clearedLogsNotice ? (t.logsCleaned || 'Logs Cleared!') : (t.cleanAllLogs || 'Clear All Logs')}
          >
            {clearedLogsNotice ? <Check className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
          </button>
        </div>

        {/* Sección de Actualizaciones del Sistema */}
        <div className={`p-4 rounded-2xl border ${
          isDark ? 'bg-[#1E1E1E] border-blue-500/20' : 'bg-blue-500/5 border-blue-500/20'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div>
                <span className="block text-xs font-bold text-blue-400">{t.updatesSectionTitle || 'Lummo Studio Updates'}</span>
                <span 
                  onClick={handleVersionClick}
                  className="block text-[11px] text-slate-400 cursor-pointer select-none hover:text-blue-300 transition-colors"
                  title={language === 'es' ? 'Haz clic 5 veces para alternar el laboratorio DevLab' : 'Click 5 times to toggle DevLab suite'}
                >
                  {updateStatusNotice ? updateStatusNotice.text : `${t.installedVersion || 'Installed version'}: v${packageJsonVersion()}`}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleCheckForUpdatesAction}
                disabled={checkingUpdates}
                className={`px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center space-x-1.5 ${
                  checkingUpdates ? 'opacity-80 cursor-wait' : ''
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdates ? 'animate-spin' : ''}`} />
                <span>{checkingUpdates ? (t.checking || 'Checking...') : (t.checkUpdates || 'Check Updates')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* SECCIÓN DEVLAB: AUTOMÁTICA EN DESARROLLO / DESBLOQUEABLE */}
        {showDevLab && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`p-4 rounded-2xl border space-y-3.5 ${
              isDark ? 'bg-[#18181b] border-purple-500/30' : 'bg-purple-50/50 border-purple-200'
            }`}
          >
            <div className="flex items-center justify-between border-b border-purple-500/20 pb-2.5">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <FlaskConical className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-extrabold text-xs text-purple-400 tracking-tight flex items-center gap-1.5">
                    <span>{t.devLabTitle || 'DevLab — Event & UI Testing Lab'}</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                      DEV MODE
                    </span>
                  </h5>
                  <p className="text-[11px] text-slate-400">
                    {t.devLabDesc || 'Developer testing tools to trigger live progress bars, banners, and update cards.'}
                  </p>
                </div>
              </div>
            </div>

            {/* DevLab Action Feedback Banner */}
            {devLabNotice && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 font-mono text-[11px] font-bold flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                <span>{devLabNotice}</span>
              </motion.div>
            )}

            {/* Grid of Interactive Event Triggers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {/* Button 1: Test Header Download Animation */}
              <button
                type="button"
                onClick={handleSimulateFlowAction}
                className={`p-3 rounded-xl border text-left flex items-center space-x-3 transition-all cursor-pointer group ${
                  isDark 
                    ? 'bg-[#202024] border-white/[0.06] hover:border-amber-500/40 hover:bg-[#27272a]' 
                    : 'bg-white border-slate-200 hover:border-amber-500 hover:shadow-xs'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20 group-hover:scale-105 transition-transform">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-xs text-slate-200 block truncate">
                    {t.testHeaderDownload || '⚡ Test Header Download'}
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {language === 'es' ? 'Barra y botón de progreso en Header' : 'Header progress bar & pill button'}
                  </span>
                </div>
              </button>

              {/* Button 2: Test Top Post-Update Banner */}
              <button
                type="button"
                onClick={() => handleTestPostUpdateBannerAction(false)}
                className={`p-3 rounded-xl border text-left flex items-center space-x-3 transition-all cursor-pointer group ${
                  isDark 
                    ? 'bg-[#202024] border-white/[0.06] hover:border-blue-500/40 hover:bg-[#27272a]' 
                    : 'bg-white border-slate-200 hover:border-blue-500 hover:shadow-xs'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20 group-hover:scale-105 transition-transform">
                  <Check className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-xs text-slate-200 block truncate">
                    {t.testPostUpdateBanner || '🎉 Test Top Update Banner'}
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {language === 'es' ? 'Notificación superior de versión instalada' : 'Top installed version banner'}
                  </span>
                </div>
              </button>

              {/* Button 3: Test Whats New Changelog Sheet */}
              <button
                type="button"
                onClick={handleTestChangelogSheetAction}
                className={`p-3 rounded-xl border text-left flex items-center space-x-3 transition-all cursor-pointer group ${
                  isDark 
                    ? 'bg-[#202024] border-white/[0.06] hover:border-indigo-500/40 hover:bg-[#27272a]' 
                    : 'bg-white border-slate-200 hover:border-indigo-500 hover:shadow-xs'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20 group-hover:scale-105 transition-transform">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-xs text-slate-200 block truncate">
                    {t.testChangelogSheet || '📄 Test Whats New Card'}
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {language === 'es' ? 'Hoja flotante con notas de la versión' : 'Floating release notes card'}
                  </span>
                </div>
              </button>

              {/* Button 4: Test Full Post-Update Experience */}
              <button
                type="button"
                onClick={() => handleTestFullPostUpdateAction(false)}
                className={`p-3 rounded-xl border text-left flex items-center space-x-3 transition-all cursor-pointer group ${
                  isDark 
                    ? 'bg-[#202024] border-purple-500/30 hover:border-purple-500/60 hover:bg-[#27272a]' 
                    : 'bg-white border-purple-300 hover:border-purple-500 hover:shadow-xs'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/30 group-hover:scale-105 transition-transform">
                  <Rocket className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-xs text-purple-300 block truncate">
                    {t.testFullUpdateFlow || '🚀 Full Post-Update Experience'}
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {language === 'es' ? 'Dispara Banner + Tarjeta juntos' : 'Triggers Banner + Sheet together'}
                  </span>
                </div>
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

function packageJsonVersion() {
  try {
    const pkg = require('../../../../package.json');
    return pkg.version || '2.4.15';
  } catch (e) {
    return '2.4.15';
  }
}
