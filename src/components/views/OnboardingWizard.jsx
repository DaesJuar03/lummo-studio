import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, 
  ChevronLeft, 
  Cpu, 
  Code, 
  Sliders, 
  Check, 
  Sun, 
  Moon, 
  Languages, 
  RefreshCw,
  Rocket,
  Minus,
  Square,
  X,
  Database,
  Terminal,
  Layers,
  CheckCircle2,
  Globe
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

  if (!isOpen) return null;

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

  const showUnsupportedNotice = !isLangSupported && detectedLang && !dismissUnsupportedNotice;

  if (showUnsupportedNotice) {
    return (
      <div className={`min-h-screen w-full flex flex-col font-sans select-none overflow-x-hidden transition-colors duration-200 ${
        isDark ? 'bg-[#09090b] text-[#f4f4f5]' : 'bg-slate-50 text-slate-900'
      }`}>
        
        {/* Electron Custom Title Drag Bar */}
        <div 
          className={`h-11 border-b px-6 flex items-center justify-between shrink-0 ${
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
          <div className="flex items-center space-x-1" style={{ WebkitAppRegion: 'no-drag' }}>
            <button
              onClick={handleMinimize}
              className={`p-1.5 rounded-lg transition-colors ${
                isDark ? 'text-[#a1a1aa] hover:text-white hover:bg-[#282828]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleMaximize}
              className={`p-1.5 rounded-lg transition-colors ${
                isDark ? 'text-[#a1a1aa] hover:text-white hover:bg-[#282828]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <Square className="h-3 w-3" />
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-rose-600 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
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
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-3 px-6 rounded-xl shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center space-x-2"
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
      isDark ? 'bg-[#09090b] text-[#f4f4f5]' : 'bg-slate-50 text-slate-900'
    }`}>
      
      {/* Electron Custom Title Drag Bar */}
      <div 
        className={`h-11 border-b px-6 flex items-center justify-between shrink-0 ${
          isDark ? 'bg-[#181818] border-[#2a2a2a]' : 'bg-white border-slate-200'
        }`}
        style={{ WebkitAppRegion: 'drag' }}
      >
        <div className="flex items-center space-x-2.5">
          <img src={lummoLogo} className="w-6 h-6 object-contain rounded-md" alt="Lummo Studio" />
          <span className={`text-xs font-extrabold font-mono tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Lummo Studio — Asistente de Configuración Inicial
          </span>
        </div>

        {/* Window Controls */}
        <div className="flex items-center space-x-1" style={{ WebkitAppRegion: 'no-drag' }}>
          <button
            onClick={handleMinimize}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'text-[#a1a1aa] hover:text-white hover:bg-[#282828]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleMaximize}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'text-[#a1a1aa] hover:text-white hover:bg-[#282828]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Square className="h-3 w-3" />
          </button>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-rose-600 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Main Wizard Content Area */}
      <div className="flex-1 max-w-5xl w-full mx-auto p-8 flex flex-col justify-center my-auto space-y-8">
        
        {/* Wizard Header Progress Indicator */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 border-slate-200/40">
          <div>
            <h1 className={`text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Bienvenido a Lummo Studio
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Configuración inicial de entorno, diagnóstico de motores y preferencias del sistema
            </p>
          </div>

          {/* Stepper Tabs */}
          <div className="flex items-center space-x-2">
            {[
              { id: 1, label: '1 Preferencias' },
              { id: 2, label: '2 Diagnóstico' },
              { id: 3, label: '3 Entorno' },
              { id: 4, label: '4 Listo' }
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setStep(s.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  step === s.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : step > s.id
                      ? isDark ? 'bg-[#242424] text-emerald-400' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      : isDark ? 'bg-[#1e1e1e] text-slate-500' : 'bg-slate-100 text-slate-400'
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
                1. Idioma de la Aplicación & Apariencia Visual
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Selecciona tu idioma preferido y el tema con el que deseas trabajar en Lummo Studio.
              </p>
            </div>

            {/* Language Selector */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider block">
                  Idioma de Interfaz (Sistema JSON):
                </label>
                {detectedLang && (
                  <span className={`text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-md flex items-center shrink-0 ${
                    isLangSupported 
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                      : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                  }`}>
                    <Globe className="h-3 w-3 inline mr-1.5" />
                    <span>OS ({detectedLang.toUpperCase()}): {isLangSupported ? 'Detectado & Soportado' : 'Sin soporte (Inglés asignado)'}</span>
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
                          ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-500/5'
                          : isDark ? 'border-[#2a2a2a] bg-[#1e1e1e]' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center space-x-3.5">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${
                          isSelected ? 'bg-blue-600 text-white' : isDark ? 'bg-[#282828] text-slate-400' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {loc.code.toUpperCase()}
                        </div>
                        <div>
                          <h4 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{loc.name}</h4>
                          <p className="text-xs text-slate-500">{loc.label}</p>
                        </div>
                      </div>
                      {isSelected && <CheckCircle2 className="h-5 w-5 text-blue-500" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Theme Selector */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider block">
                Tema Visual Por Defecto:
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Light Mode Card */}
                <div
                  onClick={() => theme !== 'light' && onToggleTheme()}
                  className={`pure-card p-5 cursor-pointer border flex items-center justify-between transition-all ${
                    !isDark
                      ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-500/5'
                      : 'border-[#27272a] bg-[#121215]'
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
                      <Sun className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Modo Claro (Light)</h4>
                      <p className="text-xs text-slate-500">Limpio, brillante y blanco minimalista</p>
                    </div>
                  </div>
                  {!isDark && <CheckCircle2 className="h-5 w-5 text-blue-500" />}
                </div>

                {/* Dark Mode Card */}
                <div
                  onClick={() => theme !== 'dark' && onToggleTheme()}
                  className={`pure-card p-5 cursor-pointer border flex items-center justify-between transition-all ${
                    isDark
                      ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-500/5'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                      <Moon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Modo Oscuro (Dark)</h4>
                      <p className="text-xs text-slate-500">Diseño mate carbón elegante y contrastado</p>
                    </div>
                  </div>
                  {isDark && <CheckCircle2 className="h-5 w-5 text-blue-500" />}
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
            <div className="flex items-center justify-between">
              <div>
                <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  2. Diagnóstico de Motores de Desarrollo
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Verificamos las herramientas instaladas localmente en tu sistema operativo.
                </p>
              </div>

              <button
                onClick={onScanEnv}
                disabled={isScanning}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center space-x-2 shadow-sm transition-all"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                <span>{isScanning ? 'Escaneando...' : 'Re-Escanear Sistema'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { name: 'Node.js', key: 'node', desc: 'Entorno de ejecución JavaScript / Vite' },
                { name: 'PHP Engine', key: 'php', desc: 'Servidor dinámico PHP 8.x' },
                { name: 'MySQL Server', key: 'mysql', desc: 'Gestor de bases de datos relacionales' },
                { name: 'PostgreSQL', key: 'postgres', desc: 'Motor de base de datos relacional avanzado' },
                { name: 'Python', key: 'python', desc: 'Lenguaje y scripts backend' },
                { name: 'SQLite Nativo', key: 'sqlite', desc: 'Motor embebido integrado en Lummo' }
              ].map((item) => {
                const info = envStatus ? envStatus[item.key] : null;
                const isInstalled = info?.installed;

                return (
                  <div
                    key={item.key}
                    className={`pure-card p-5 border space-y-3 ${
                      isDark ? 'border-[#2a2a2a] bg-[#1e1e1e]' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {item.name}
                      </h4>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                        isInstalled
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                      }`}>
                        {isInstalled ? 'INSTALADO' : 'NO DETECTADO'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono">
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
                3. Herramientas Integradas en Lummo Studio
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Explora las funcionalidades principales que facilitarán tu flujo de desarrollo.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`pure-card p-6 border space-y-3 ${isDark ? 'border-[#2a2a2a]' : 'border-slate-200 bg-white'}`}>
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-500 flex items-center justify-center">
                  <Layers className="h-5 w-5" />
                </div>
                <h4 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>Gestión Multi-Proyectos</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Lanza y administra múltiples proyectos de React, Vite, Node, Express y PHP de forma simultánea asignando puertos dinámicos de manera automática.
                </p>
              </div>

              <div className={`pure-card p-6 border space-y-3 ${isDark ? 'border-[#2a2a2a]' : 'border-slate-200 bg-white'}`}>
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-500 flex items-center justify-center">
                  <Database className="h-5 w-5" />
                </div>
                <h4 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>Workbench SQL Embebido</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Conéctate y administra bases de datos SQLite nativas, MySQL y PostgreSQL directamente desde la app con explorador de tablas y consultas SQL.
                </p>
              </div>

              <div className={`pure-card p-6 border space-y-3 ${isDark ? 'border-[#2a2a2a]' : 'border-slate-200 bg-white'}`}>
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-500 flex items-center justify-center">
                  <Terminal className="h-5 w-5" />
                </div>
                <h4 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>Ventanas Independientes de Logs</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Abre consolas de terminal flotantes para cada proyecto con transmisión de registros en tiempo real y limpieza con un solo clic.
                </p>
              </div>

              <div className={`pure-card p-6 border space-y-3 ${isDark ? 'border-[#2a2a2a]' : 'border-slate-200 bg-white'}`}>
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-500 flex items-center justify-center">
                  <Sliders className="h-5 w-5" />
                </div>
                <h4 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>Buscador Omnibox (Ctrl + K)</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Accede velozmente a tus proyectos, bases de datos o acciones rápidas con el atajo de teclado universal `Ctrl + K`.
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
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto shadow-xl">
              <Rocket className="h-10 w-10 animate-bounce" />
            </div>

            <div>
              <h2 className={`text-3xl font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                ¡Todo Listo para Comenzar!
              </h2>
              <p className="text-slate-500 text-sm mt-2 max-w-lg mx-auto leading-relaxed">
                Tu entorno de desarrollo Lummo Studio se encuentra configurado y listo para acelerar tu flujo de trabajo local.
              </p>
            </div>
          </motion.div>
        )}

        {/* Stepper Navigation Buttons */}
        <div className="pt-6 border-t border-slate-200/40 flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all disabled:opacity-30 ${
              isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Anterior</span>
          </button>

          <button
            onClick={handleNext}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-6 rounded-xl shadow-md shadow-blue-600/20 flex items-center space-x-2 transition-all cursor-pointer"
          >
            <span>{step === 4 ? 'Comenzar a Usar Lummo Studio' : 'Siguiente Paso'}</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
