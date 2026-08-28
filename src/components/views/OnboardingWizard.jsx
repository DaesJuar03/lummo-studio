import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ChevronRight, 
  ChevronLeft, 
  Sliders, 
  Sun, 
  Moon, 
  RefreshCw, 
  Rocket, 
  Minus, 
  Square, 
  X, 
  Database, 
  Terminal, 
  Layers, 
  CheckCircle2, 
  Globe, 
  Download, 
  CheckSquare, 
  Loader2 
} from 'lucide-react';
import { availableLocales, getTranslations } from '../../locales';
import lummoLogo from '../../assets/Lummo.png';

export default function OnboardingWizard({
  isOpen,
  onComplete,
  envStatus,
  onScanEnv,
  isScanning,
  theme,
  onToggleTheme,
  language = 'es',
  onSelectLanguage,
  detectedLang,
  isLangSupported = true
}) {
  const [step, setStep] = useState(1);
  const [dismissUnsupportedNotice, setDismissUnsupportedNotice] = useState(false);
  const [selectedTechs, setSelectedTechs] = useState(new Set());
  const [isInstallingTechs, setIsInstallingTechs] = useState(false);
  const [installProgressMap, setInstallProgressMap] = useState({});

  const t = getTranslations(language);
  const isDark = theme === 'dark';

  React.useEffect(() => {
    if (envStatus) {
      const missingKeys = ['node', 'php', 'mysql', 'postgres', 'python', 'git'].filter(
        k => !envStatus[k]?.installed
      );
      setSelectedTechs(new Set(missingKeys));
    }
  }, [envStatus]);

  React.useEffect(() => {
    if (window.electronAPI?.onTechInstallProgress) {
      const unsubscribe = window.electronAPI.onTechInstallProgress((data) => {
        setInstallProgressMap(prev => ({
          ...prev,
          [data.techKey]: data
        }));
      });
      return () => unsubscribe();
    }
  }, []);

  const handleToggleTechSelect = (key) => {
    setSelectedTechs(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleStartInstallation = async () => {
    if (selectedTechs.size === 0 || !window.electronAPI?.downloadAndInstallTech) return;
    setIsInstallingTechs(true);

    const keysToInstall = Array.from(selectedTechs);
    try {
      await window.electronAPI.downloadAndInstallTech(keysToInstall);
      if (onScanEnv) await onScanEnv();
    } catch (err) {
      console.error('Error installing technologies:', err);
    } finally {
      setIsInstallingTechs(false);
      if (onScanEnv) onScanEnv();
    }
  };

  if (!isOpen) return null;

  const handleMinimize = () => {
    if (window.electronAPI?.windowMinimize) window.electronAPI.windowMinimize();
  };

  const handleMaximize = () => {
    if (window.electronAPI?.windowMaximize) window.electronAPI.windowMaximize();
  };

  const handleClose = () => {
    if (window.electronAPI?.windowClose) window.electronAPI.windowClose();
  };

  const showUnsupportedNotice = !isLangSupported && detectedLang && !dismissUnsupportedNotice;

  if (showUnsupportedNotice) {
    return (
      <div className={`min-h-screen w-full flex flex-col font-sans select-none overflow-x-hidden transition-colors duration-200 ${
        isDark ? 'bg-[#09090b] text-[#f4f4f5]' : 'bg-slate-50 text-slate-900'
      }`}>
        
        {/* Electron Custom Title Drag Bar */}
        <div 
          className={`h-11 border-b pl-6 pr-0 flex items-center justify-between shrink-0 ${
            isDark ? 'bg-[#181818] border-[#2a2a2a]' : 'bg-white border-slate-200'
          }`}
          style={{ WebkitAppRegion: 'drag' }}
        >
          <div className="flex items-center space-x-2.5">
            <img src={lummoLogo} className="w-6 h-6 object-contain rounded-md" alt="Lummo Studio" />
            <span className={`text-xs font-extrabold font-mono tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Lummo Studio — System Language Notice
            </span>
          </div>

          {/* Window Controls */}
          <div className="flex items-stretch h-full" style={{ WebkitAppRegion: 'no-drag' }}>
            <button
              onClick={handleMinimize}
              className={`w-11 h-full flex items-center justify-center transition-colors cursor-pointer ${
                isDark ? 'text-[#a1a1aa] hover:text-white hover:bg-[#282828]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
              title={language === 'es' ? "Minimizar" : "Minimize"}
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleMaximize}
              className={`w-11 h-full flex items-center justify-center transition-colors cursor-pointer ${
                isDark ? 'text-[#a1a1aa] hover:text-white hover:bg-[#282828]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
              title={language === 'es' ? "Maximizar" : "Maximize"}
            >
              <Square className="h-3 w-3" />
            </button>
            <button
              onClick={handleClose}
              className="w-12 h-full flex items-center justify-center text-slate-500 hover:text-white hover:bg-rose-600 active:bg-rose-700 transition-colors cursor-pointer"
              title={language === 'es' ? "Cerrar" : "Close"}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Main Unsupported Language Notice Area */}
        <div className="flex-1 max-w-xl w-full mx-auto p-8 flex flex-col justify-center my-auto space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6"
          >
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/5">
              <Globe className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-mono font-extrabold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wider">
                Language Notice ({detectedLang.toUpperCase()})
              </span>
              <h1 className={`text-2xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Your System Language is Not Supported Yet
              </h1>
              <p className="text-slate-500 text-sm leading-relaxed max-w-md mx-auto">
                We detected that your computer language is <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>"{detectedLang.toUpperCase()}"</strong>, which does not currently have native language support in Lummo Studio.
              </p>
              <p className="text-slate-500 text-xs leading-relaxed max-w-md mx-auto">
                Because <strong>English</strong> is a universal language, Lummo Studio has automatically selected English as your default language. You can keep English or choose Spanish below.
              </p>
            </div>

            {/* Language Options */}
            <div className="space-y-3 pt-2 text-left">
              <label className="text-[11px] font-bold text-slate-400 font-mono uppercase tracking-wider block text-center">
                Available App Languages:
              </label>
              <div className="grid grid-cols-2 gap-3">
                {availableLocales.map((loc) => {
                  const isSelected = language === loc.code;
                  return (
                    <div
                      key={loc.code}
                      onClick={() => onSelectLanguage && onSelectLanguage(loc.code)}
                      className={`p-4 rounded-xl cursor-pointer border flex items-center justify-between transition-all ${
                        isSelected
                          ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-500/10'
                          : isDark ? 'border-[#2a2a2a] bg-[#1e1e1e]' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                          isSelected ? 'bg-blue-600 text-white' : isDark ? 'bg-[#282828] text-slate-400' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {loc.code.toUpperCase()}
                        </div>
                        <div>
                          <h4 className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>{loc.name}</h4>
                          <p className="text-[10px] text-slate-500">{loc.label || loc.description}</p>
                        </div>
                      </div>
                      {isSelected && <CheckCircle2 className="h-4 w-4 text-blue-500" />}
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => setDismissUnsupportedNotice(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-3 px-6 rounded-xl shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>Continue Setup in {language === 'es' ? 'Spanish' : 'English'}</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
    else onComplete();
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className={`min-h-screen w-full flex flex-col font-sans select-none overflow-x-hidden transition-colors duration-200 ${
      isDark ? 'bg-[#141414] text-[#E5E5E5]' : 'bg-slate-50 text-slate-900'
    }`}>
      
      {/* Electron Custom Title Drag Bar */}
      <div 
        className={`h-11 border-b pl-6 pr-0 flex items-center justify-between shrink-0 ${
          isDark ? 'bg-[#141414] border-white/[0.08]' : 'bg-white border-slate-200'
        }`}
        style={{ WebkitAppRegion: 'drag' }}
      >
        <div className="flex items-center space-x-2.5">
          <img src={lummoLogo} className="w-6 h-6 object-contain rounded-md" alt="Lummo Studio" />
          <span className={`text-xs font-extrabold font-mono tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {language === 'es' ? 'Lummo Studio — Asistente de Configuración Inicial' : 'Lummo Studio — Initial Setup Wizard'}
          </span>
        </div>

        {/* Window Controls */}
        <div className="flex items-stretch h-full" style={{ WebkitAppRegion: 'no-drag' }}>
          <button
            onClick={handleMinimize}
            className={`w-11 h-full flex items-center justify-center transition-colors cursor-pointer ${
              isDark ? 'text-slate-400 hover:text-white hover:bg-[#303030]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
            title={language === 'es' ? "Minimizar" : "Minimize"}
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleMaximize}
            className={`w-11 h-full flex items-center justify-center transition-colors cursor-pointer ${
              isDark ? 'text-slate-400 hover:text-white hover:bg-[#303030]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
            title={language === 'es' ? "Maximizar" : "Maximize"}
          >
            <Square className="h-3 w-3" />
          </button>
          <button
            onClick={handleClose}
            className="w-12 h-full flex items-center justify-center text-slate-500 hover:text-white hover:bg-rose-600 active:bg-rose-700 transition-colors cursor-pointer"
            title={language === 'es' ? "Cerrar" : "Close"}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Wizard Content Area */}
      <div className="flex-1 max-w-5xl w-full mx-auto p-8 flex flex-col justify-center my-auto space-y-8">
        
        {/* Wizard Header Progress Indicator */}
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 ${
          isDark ? 'border-white/[0.08]' : 'border-slate-200/40'
        }`}>
          <div>
            <h1 className={`text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {language === 'es' ? 'Bienvenido a Lummo Studio' : 'Welcome to Lummo Studio'}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {language === 'es' 
                ? 'Configuración inicial de entorno, diagnóstico de motores y preferencias del sistema' 
                : 'Initial environment setup, engine diagnostics, and system preferences'}
            </p>
          </div>

          {/* Stepper Tabs */}
          <div className="flex items-center space-x-2">
            {[
              { id: 1, label: language === 'es' ? '1 Preferencias' : '1 Preferences' },
              { id: 2, label: language === 'es' ? '2 Diagnóstico' : '2 Diagnostics' },
              { id: 3, label: language === 'es' ? '3 Entorno' : '3 Environment' },
              { id: 4, label: language === 'es' ? '4 Listo' : '4 Ready' }
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setStep(s.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  step === s.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : step > s.id
                      ? isDark ? 'bg-[#252525] text-emerald-400 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      : isDark ? 'bg-[#1E1E1E] text-slate-400 border border-white/[0.08]' : 'bg-slate-100 text-slate-400'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Step 1: Language & Theme Preferences */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {language === 'es' ? '1. Idioma de la Aplicación & Apariencia Visual' : '1. Application Language & Visual Appearance'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {language === 'es' ? 'Selecciona tu idioma preferido y el tema con el que deseas trabajar en Lummo Studio.' : 'Select your preferred language and theme for working in Lummo Studio.'}
              </p>
            </div>

            {/* Language Selector */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider block">
                  {language === 'es' ? 'Idioma de Interfaz:' : 'Interface Language:'}
                </label>
                {detectedLang && (
                  <span className={`text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-md flex items-center shrink-0 ${
                    isLangSupported 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.3)]' 
                      : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                  }`}>
                    <Globe className="h-3 w-3 inline mr-1.5" />
                    <span>OS ({detectedLang.toUpperCase()}): {isLangSupported ? (language === 'es' ? 'Detectado & Soportado' : 'Detected & Supported') : (language === 'es' ? 'Sin soporte (Inglés asignado)' : 'Unsupported (English assigned)')}</span>
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableLocales.map((loc) => {
                  const isSelected = language === loc.code;
                  return (
                    <div
                      key={loc.code}
                      onClick={() => onSelectLanguage && onSelectLanguage(loc.code)}
                      className={`pure-card p-5 cursor-pointer border flex items-center justify-between transition-all ${
                        isSelected
                          ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-500/10'
                          : isDark ? 'border-white/[0.08] bg-[#1E1E1E] hover:bg-[#252525]' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center space-x-3.5">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${
                          isSelected ? 'bg-blue-600 text-white' : isDark ? 'bg-[#252525] text-slate-400' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {loc.code.toUpperCase()}
                        </div>
                        <div>
                          <h4 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{loc.name}</h4>
                          <p className="text-xs text-slate-400">{loc.label}</p>
                        </div>
                      </div>
                      {isSelected && <CheckCircle2 className="h-5 w-5 text-blue-400" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Theme Selector */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider block">
                {language === 'es' ? 'Tema Visual Por Defecto:' : 'Default Visual Theme:'}
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Light Mode Card */}
                <div
                  onClick={() => theme !== 'light' && onToggleTheme()}
                  className={`pure-card p-5 cursor-pointer border flex items-center justify-between transition-all ${
                    !isDark
                      ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-500/10'
                      : 'border-white/[0.08] bg-[#1E1E1E] hover:bg-[#252525]'
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                      <Sun className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{language === 'es' ? 'Modo Claro (Light)' : 'Light Mode'}</h4>
                      <p className="text-xs text-slate-400">{language === 'es' ? 'Limpio, brillante y blanco minimalista' : 'Clean, bright, minimalist white'}</p>
                    </div>
                  </div>
                  {!isDark && <CheckCircle2 className="h-5 w-5 text-blue-500" />}
                </div>

                {/* Dark Mode Card */}
                <div
                  onClick={() => theme !== 'dark' && onToggleTheme()}
                  className={`pure-card p-5 cursor-pointer border flex items-center justify-between transition-all ${
                    isDark
                      ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-500/10'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                      <Moon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{language === 'es' ? 'Modo Oscuro (Dark)' : 'Dark Mode'}</h4>
                      <p className="text-xs text-slate-400">{language === 'es' ? 'Diseño Linear / Vercel mate carbón de alto contraste' : 'Linear / Vercel matte carbon high-contrast design'}</p>
                    </div>
                  </div>
                  {isDark && <CheckCircle2 className="h-5 w-5 text-blue-400" />}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 2: System Environment Diagnostic */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {language === 'es' ? '2. Diagnóstico & Instalador de Motores de Desarrollo' : '2. Dev Engine Diagnostics & Installer'}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {language === 'es' ? 'Verificamos e instalamos las herramientas en tu sistema operativo. Elige las que necesites descargar.' : 'We verify and install tools on your system. Select which ones to download.'}
                </p>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={onScanEnv}
                  disabled={isScanning || isInstallingTechs}
                  className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 whitespace-nowrap shrink-0 transition-all cursor-pointer disabled:opacity-50 ${
                    isDark ? 'bg-[#252525] border-white/[0.08] text-slate-200 hover:bg-[#303030]' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <RefreshCw className={`h-4 w-4 shrink-0 ${isScanning ? 'animate-spin' : ''}`} />
                  <span className="whitespace-nowrap">{isScanning ? (language === 'es' ? 'Escaneando...' : 'Scanning...') : (language === 'es' ? 'Re-Escanear' : 'Re-Scan')}</span>
                </button>

                {selectedTechs.size > 0 && (
                  <button
                    onClick={handleStartInstallation}
                    disabled={isInstallingTechs}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 whitespace-nowrap shrink-0 shadow-md shadow-blue-600/20 hover:shadow-[0_0_15px_rgba(37,99,235,0.35)] transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isInstallingTechs ? (
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    ) : (
                      <Download className="h-4 w-4 shrink-0" />
                    )}
                    <span className="whitespace-nowrap">
                      {isInstallingTechs 
                        ? (language === 'es' ? 'Instalando...' : 'Installing...') 
                        : (language === 'es' ? `Descargar e Instalar (${selectedTechs.size})` : `Download & Install (${selectedTechs.size})`)}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Multi-Select Controls for Uninstalled Technologies */}
            {(() => {
              const allMissing = ['node', 'php', 'mysql', 'postgres', 'python', 'git'].filter(
                k => !envStatus?.[k]?.installed
              );

              if (allMissing.length === 0) return null;

              return (
                <div className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs ${
                  isDark ? 'bg-[#1E1E1E] border-white/[0.08] text-slate-300' : 'bg-blue-50/60 border-blue-100 text-slate-700'
                }`}>
                  <div className="flex items-center space-x-2">
                    <CheckSquare className="h-4 w-4 text-blue-400" />
                    <span className="font-semibold">
                      {language === 'es' ? `Se detectaron ${allMissing.length} herramientas no instaladas en tu sistema.` : `Detected ${allMissing.length} tools not installed on your system.`}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedTechs(new Set(allMissing))}
                      className="px-2.5 py-1 rounded-lg font-bold text-[11px] bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 transition-all cursor-pointer"
                    >
                      {language === 'es' ? `Seleccionar Todas (${allMissing.length})` : `Select All (${allMissing.length})`}
                    </button>
                    <button
                      onClick={() => setSelectedTechs(new Set())}
                      className="px-2 py-1 rounded-lg font-bold text-[11px] text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                    >
                      {language === 'es' ? 'Limpiar' : 'Clear'}
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Real-Time Installation Progress Monitor Panel */}
            {(isInstallingTechs || Object.keys(installProgressMap).length > 0) && (
              <div className={`p-5 rounded-2xl border space-y-4 ${
                isDark ? 'bg-[#1E1E1E] border-blue-500/30' : 'bg-slate-50 border-blue-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <Loader2 className={`h-4 w-4 text-blue-400 ${isInstallingTechs ? 'animate-spin' : ''}`} />
                    <h4 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {language === 'es' ? 'Progreso de Descarga e Instalación Oficial' : 'Official Download & Installation Progress'}
                    </h4>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-blue-400">
                    {isInstallingTechs ? (language === 'es' ? 'Procesando instaladores...' : 'Processing installers...') : (language === 'es' ? 'Completado' : 'Completed')}
                  </span>
                </div>

                <div className="space-y-3">
                  {Array.from(selectedTechs).map((techKey) => {
                    const progressData = installProgressMap[techKey] || {};
                    const stage = progressData.stage || 'waiting';
                    const percent = progressData.percent || 0;

                    return (
                      <div key={techKey} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className={`font-bold uppercase ${isDark ? 'text-white' : 'text-slate-800'}`}>
                            {progressData.name || techKey}
                          </span>
                          <span className="text-[11px] text-slate-400 font-semibold">
                            {progressData.message || (stage === 'waiting' ? (language === 'es' ? 'En cola...' : 'Queued...') : `${percent}%`)}
                          </span>
                        </div>
                        <div className="w-full bg-slate-700/30 h-2.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${
                              stage === 'completed' 
                                ? 'bg-emerald-500' 
                                : stage === 'error' 
                                  ? 'bg-rose-500' 
                                  : 'bg-blue-500'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Grid of Technologies */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { name: 'Node.js', key: 'node', desc: language === 'es' ? 'Entorno de ejecución JS / Vite' : 'JS / Vite runtime environment' },
                { name: 'PHP Engine', key: 'php', desc: language === 'es' ? 'Servidor dinámico PHP 8.x' : 'PHP 8.x dynamic server' },
                { name: 'MySQL Server', key: 'mysql', desc: language === 'es' ? 'Gestor de bases de datos relacionales' : 'Relational database management system' },
                { name: 'PostgreSQL', key: 'postgres', desc: language === 'es' ? 'Motor relacional PostgreSQL' : 'PostgreSQL relational engine' },
                { name: 'Python', key: 'python', desc: language === 'es' ? 'Lenguaje y scripts backend' : 'Backend scripting and runtime' },
                { name: 'Git for Windows', key: 'git', desc: language === 'es' ? 'Control de versiones Git' : 'Git version control' },
                { name: language === 'es' ? 'SQLite Nativo' : 'Native SQLite', key: 'sqlite', desc: language === 'es' ? 'Motor embebido integrado en Lummo' : 'Embedded engine integrated into Lummo' }
              ].map((item) => {
                const info = envStatus ? envStatus[item.key] : null;
                const isInstalled = info?.installed;
                const isChecked = selectedTechs.has(item.key);
                const isInternal = item.key === 'sqlite';

                return (
                  <div
                    key={item.key}
                    onClick={() => !isInstalled && !isInternal && handleToggleTechSelect(item.key)}
                    className={`pure-card p-5 border space-y-3 transition-all ${
                      !isInstalled && !isInternal ? 'cursor-pointer hover:border-blue-500/50' : ''
                    } ${
                      isChecked && !isInstalled
                        ? isDark ? 'border-blue-500/60 bg-blue-500/10' : 'border-blue-500 bg-blue-50/50'
                        : isDark ? 'border-white/[0.08] bg-[#1E1E1E] hover:bg-[#252525]' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        {!isInstalled && !isInternal && (
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleTechSelect(item.key)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 rounded border-slate-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        )}
                        <h4 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {item.name}
                        </h4>
                      </div>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                        isInstalled
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                      }`}>
                        {isInstalled ? (language === 'es' ? 'INSTALADO' : 'INSTALLED') : (language === 'es' ? 'NO DETECTADO' : 'NOT DETECTED')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono">
                      {info?.version || item.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Step 3: Features Overview */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {language === 'es' ? '3. Herramientas Integradas en Lummo Studio' : '3. Built-in Tools in Lummo Studio'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {language === 'es' ? 'Explora las funcionalidades principales que facilitarán tu flujo de desarrollo.' : 'Explore key features that accelerate your local development workflow.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`pure-card p-6 border space-y-3 ${isDark ? 'border-white/[0.08] bg-[#1E1E1E]' : 'border-slate-200 bg-white'}`}>
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Layers className="h-5 w-5" />
                </div>
                <h4 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>{language === 'es' ? 'Gestión Multi-Proyectos' : 'Multi-Project Management'}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {language === 'es' ? 'Lanza y administra múltiples proyectos de React, Vite, Node, Express y PHP de forma simultánea asignando puertos dinámicos de manera automática.' : 'Launch and manage multiple React, Vite, Node, Express, and PHP projects simultaneously with dynamic port assignment.'}
                </p>
              </div>

              <div className={`pure-card p-6 border space-y-3 ${isDark ? 'border-white/[0.08] bg-[#1E1E1E]' : 'border-slate-200 bg-white'}`}>
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Database className="h-5 w-5" />
                </div>
                <h4 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>{language === 'es' ? 'Workbench SQL Embebido' : 'Embedded SQL Workbench'}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {language === 'es' ? 'Conéctate y administra bases de datos SQLite nativas, MySQL y PostgreSQL directamente desde la app con explorador de tablas y consultas SQL.' : 'Connect and manage SQLite, MySQL, and PostgreSQL databases directly within the app with table explorers and SQL queries.'}
                </p>
              </div>

              <div className={`pure-card p-6 border space-y-3 ${isDark ? 'border-white/[0.08] bg-[#1E1E1E]' : 'border-slate-200 bg-white'}`}>
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Terminal className="h-5 w-5" />
                </div>
                <h4 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>{language === 'es' ? 'Ventanas Independientes de Logs' : 'Standalone Log Windows'}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {language === 'es' ? 'Abre consolas de terminal flotantes para cada proyecto con transmisión de registros en tiempo real y limpieza con un solo clic.' : 'Open floating log consoles for each project with real-time streaming and one-click log clearing.'}
                </p>
              </div>

              <div className={`pure-card p-6 border space-y-3 ${isDark ? 'border-white/[0.08] bg-[#1E1E1E]' : 'border-slate-200 bg-white'}`}>
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Sliders className="h-5 w-5" />
                </div>
                <h4 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>{language === 'es' ? 'Buscador Omnibox (Ctrl + K)' : 'Omnibox Search (Ctrl + K)'}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {language === 'es' ? 'Accede velozmente a tus proyectos, bases de datos o acciones rápidas con el atajo de teclado universal Ctrl + K.' : 'Quickly access projects, databases, or actions with universal shortcut Ctrl + K.'}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 4: Ready to Start */}
        {step === 4 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-10 space-y-6"
          >
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <Rocket className="h-10 w-10 animate-bounce" />
            </div>

            <div>
              <h2 className={`text-3xl font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {language === 'es' ? '¡Todo Listo para Comenzar!' : 'All Ready to Begin!'}
              </h2>
              <p className="text-slate-400 text-sm mt-2 max-w-lg mx-auto leading-relaxed">
                {language === 'es' 
                  ? 'Tu entorno de desarrollo Lummo Studio se encuentra configurado y listo para acelerar tu flujo de trabajo local.' 
                  : 'Your Lummo Studio development environment is configured and ready to accelerate your local workflow.'}
              </p>
            </div>
          </motion.div>
        )}

        {/* Stepper Navigation Buttons */}
        <div className="pt-6 border-t border-white/[0.08] flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer disabled:opacity-30 ${
              isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ChevronLeft className="h-4 w-4" />
            <span>{language === 'es' ? 'Anterior' : 'Back'}</span>
          </button>

          <button
            onClick={handleNext}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2.5 px-6 rounded-xl shadow-md shadow-blue-600/20 hover:shadow-[0_0_15px_rgba(37,99,235,0.35)] flex items-center space-x-2 transition-all cursor-pointer"
          >
            <span>{step === 4 ? (language === 'es' ? 'Comenzar a Usar Lummo Studio' : 'Start Using Lummo Studio') : (language === 'es' ? 'Siguiente Paso' : 'Next Step')}</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
