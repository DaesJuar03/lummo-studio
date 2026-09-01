import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FlaskConical, 
  GitBranch, 
  Bot, 
  Sparkles, 
  RefreshCw, 
  Check, 
  AlertTriangle, 
  Key, 
  Cpu, 
  Server, 
  Eye, 
  EyeOff, 
  Zap,
  Globe
} from 'lucide-react';

const AI_PROVIDERS = [
  { id: 'ollama', name: 'Ollama Local (100% Gratis)', defaultModel: 'llama3:latest', requiresKey: false, desc: 'Modelos locales ejecutados en tu PC sin costo de API' },
  { id: 'openai', name: 'OpenAI (ChatGPT)', defaultModel: 'gpt-4o-mini', requiresKey: true, desc: 'GPT-4o, GPT-4o-mini' },
  { id: 'gemini', name: 'Google Gemini', defaultModel: 'gemini-1.5-flash', requiresKey: true, desc: 'Gemini 2.5 Flash, Gemini 1.5 Pro' },
  { id: 'anthropic', name: 'Anthropic Claude', defaultModel: 'claude-3-5-sonnet-20241022', requiresKey: true, desc: 'Claude 3.5 Sonnet' },
  { id: 'deepseek', name: 'DeepSeek', defaultModel: 'deepseek-chat', requiresKey: true, desc: 'DeepSeek-V3, DeepSeek-Coder' },
  { id: 'groq', name: 'Groq (Ultra Rápido)', defaultModel: 'llama-3.3-70b-versatile', requiresKey: true, desc: 'Inferencia ultra rápida con Llama 3' },
  { id: 'openrouter', name: 'OpenRouter', defaultModel: 'openai/gpt-4o-mini', requiresKey: true, desc: 'Acceso unificado a cientos de modelos' }
];

export default function ExperimentalTab({
  theme,
  language = 'es',
  t
}) {
  const isDark = theme === 'dark';

  // 1. Initial State from localStorage
  const [gitEnabled, setGitEnabled] = useState(() => {
    try {
      return localStorage.getItem('lummo-exp-git') === 'true';
    } catch {
      return false;
    }
  });

  const [aiEnabled, setAiEnabled] = useState(() => {
    try {
      return localStorage.getItem('lummo-exp-ai') === 'true';
    } catch {
      return false;
    }
  });

  // AI Configuration State
  const [aiProvider, setAiProvider] = useState(() => {
    try {
      return localStorage.getItem('lummo-ai-provider') || 'ollama';
    } catch {
      return 'ollama';
    }
  });

  const [aiApiKey, setAiApiKey] = useState(() => {
    try {
      return localStorage.getItem('lummo-ai-apikey') || '';
    } catch {
      return '';
    }
  });

  const [aiModel, setAiModel] = useState(() => {
    try {
      return localStorage.getItem('lummo-ai-model') || 'llama3:latest';
    } catch {
      return 'llama3:latest';
    }
  });

  const [aiEndpoint, setAiEndpoint] = useState(() => {
    try {
      return localStorage.getItem('lummo-ai-endpoint') || 'http://127.0.0.1:11434';
    } catch {
      return 'http://127.0.0.1:11434';
    }
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Restart Required Detection
  const [initialSettings] = useState({
    git: gitEnabled,
    ai: aiEnabled
  });
  const [hasPendingRestart, setHasPendingRestart] = useState(false);

  const handleToggleGit = () => {
    const next = !gitEnabled;
    setGitEnabled(next);
    try {
      localStorage.setItem('lummo-exp-git', String(next));
    } catch {}
    setHasPendingRestart(true);
  };

  const handleToggleAi = () => {
    const next = !aiEnabled;
    setAiEnabled(next);
    try {
      localStorage.setItem('lummo-exp-ai', String(next));
    } catch {}
    setHasPendingRestart(true);
  };

  const handleSelectProvider = (provId) => {
    setAiProvider(provId);
    const prov = AI_PROVIDERS.find(p => p.id === provId);
    if (prov) {
      setAiModel(prov.defaultModel);
      try {
        localStorage.setItem('lummo-ai-provider', provId);
        localStorage.setItem('lummo-ai-model', prov.defaultModel);
      } catch {}
    }
    setTestResult(null);
  };

  const handleSaveAiConfig = (key, val) => {
    try {
      localStorage.setItem(key, val);
    } catch {}
  };

  const handleTestAiConnection = async () => {
    if (!window.electronAPI?.ai?.testConnection) return;
    setIsTestingAi(true);
    setTestResult(null);

    try {
      const res = await window.electronAPI.ai.testConnection({
        provider: aiProvider,
        apiKey: aiApiKey,
        endpoint: aiEndpoint,
        model: aiModel
      });

      if (res?.success) {
        setTestResult({
          type: 'success',
          message: res.message || (language === 'es' ? '¡Conexión establecida con éxito!' : 'Connection established successfully!')
        });
      } else {
        setTestResult({
          type: 'error',
          message: res?.error || (language === 'es' ? 'Error al conectar' : 'Connection failed')
        });
      }
    } catch (err) {
      setTestResult({
        type: 'error',
        message: err.message || (language === 'es' ? 'Error inesperado' : 'Unexpected error')
      });
    } finally {
      setIsTestingAi(false);
    }
  };

  const handleRelaunchApp = () => {
    if (window.electronAPI?.relaunchApp) {
      window.electronAPI.relaunchApp();
    } else {
      window.location.reload();
    }
  };

  const selectedProvObj = AI_PROVIDERS.find(p => p.id === aiProvider) || AI_PROVIDERS[0];

  return (
    <motion.div initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }} className="space-y-6">
      {/* Header */}
      <div className={`border-b pb-4 flex items-center justify-between ${isDark ? 'border-white/[0.08]' : 'border-slate-100'}`}>
        <div>
          <div className="flex items-center space-x-2.5">
            <h4 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {t.experimentalTab || 'Experimental'}
            </h4>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              BETA LAB
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {t.experimentalDesc || 'Funciones experimentales de última generación. Activa o desactiva módulos avanzados.'}
          </p>
        </div>
      </div>

      {/* Floating Restart Required Notification */}
      <AnimatePresence>
        {hasPendingRestart && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl ${
              isDark 
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' 
                : 'bg-amber-50 border-amber-300 text-amber-900'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
                <RefreshCw className="w-4 h-4 animate-spin-slow" />
              </div>
              <div>
                <h5 className="font-extrabold text-xs tracking-tight">
                  {t.restartRequiredTitle || (language === 'es' ? '¡Reinicio de la aplicación requerido!' : 'Application restart required!')}
                </h5>
                <p className="text-[11px] opacity-85 mt-0.5">
                  {t.restartRequiredDesc || (language === 'es' ? 'Has modificado módulos del sistema. Reinicia Lummo Studio para aplicar los cambios.' : 'You modified system modules. Restart Lummo Studio to apply changes.')}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={handleRelaunchApp}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-extrabold text-xs shadow-md flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{t.restartNow || (language === 'es' ? 'Reiniciar Ahora' : 'Restart Now')}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feature 1: Git Inspector */}
      <div className={`p-4 rounded-2xl border transition-all ${
        isDark ? 'bg-[#18181b] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start space-x-3.5 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              gitEnabled
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : isDark ? 'bg-[#222226] border-white/[0.06] text-slate-500' : 'bg-slate-200 border-slate-300 text-slate-400'
            }`}>
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h5 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {t.gitInspectorTitle || (language === 'es' ? 'Inspector de Git & Grafo Visual' : 'Git Inspector & Visual Graph')}
              </h5>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {t.gitInspectorDesc || (language === 'es' 
                  ? 'Detección automática de repositorios .git, visualizador interactivo de ramas, historial de commits con grafo, cambios y sincronización (push/pull).' 
                  : 'Automatic .git repository detection, interactive branch switcher, commits history graph, pending changes, and sync (push/pull).')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleGit}
            className={`w-12 h-6.5 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
              gitEnabled ? 'bg-emerald-600' : isDark ? 'bg-[#2a2a2e]' : 'bg-slate-300'
            }`}
          >
            <motion.div
              animate={{ x: gitEnabled ? 22 : 2 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="w-5 h-5 rounded-full bg-white shadow-xs"
            />
          </button>
        </div>
      </div>

      {/* Feature 2: AI Assistant */}
      <div className={`p-4 rounded-2xl border space-y-4 transition-all ${
        isDark ? 'bg-[#18181b] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start space-x-3.5 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              aiEnabled
                ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                : isDark ? 'bg-[#222226] border-white/[0.06] text-slate-500' : 'bg-slate-200 border-slate-300 text-slate-400'
            }`}>
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h5 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {t.aiAssistantTitle || (language === 'es' ? 'Agente Asistente de IA (Infraestructura & BD)' : 'AI Infrastructure & Database Assistant')}
              </h5>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {t.aiAssistantDesc || (language === 'es'
                  ? 'Conecta OpenAI, Gemini, Anthropic, DeepSeek, Groq, OpenRouter u Ollama local para consultar esquemas, diagnosticar errores y generar código.'
                  : 'Connect OpenAI, Gemini, Anthropic, DeepSeek, Groq, OpenRouter, or local Ollama to inspect schemas, diagnose errors, and generate code.')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleAi}
            className={`w-12 h-6.5 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
              aiEnabled ? 'bg-purple-600' : isDark ? 'bg-[#2a2a2e]' : 'bg-slate-300'
            }`}
          >
            <motion.div
              animate={{ x: aiEnabled ? 22 : 2 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="w-5 h-5 rounded-full bg-white shadow-xs"
            />
          </button>
        </div>

        {/* AI Provider Config Sub-panel (Active when AI is toggled ON) */}
        {aiEnabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`pt-4 border-t space-y-4 ${isDark ? 'border-white/[0.08]' : 'border-slate-200'}`}
          >
            {/* Provider Grid Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-purple-400" />
                <span>{t.aiProvider || 'Proveedor de IA'}</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {AI_PROVIDERS.map((prov) => {
                  const isSelected = aiProvider === prov.id;
                  return (
                    <button
                      key={prov.id}
                      type="button"
                      onClick={() => handleSelectProvider(prov.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? isDark 
                            ? 'bg-purple-500/15 border-purple-500/40 text-white shadow-xs' 
                            : 'bg-purple-50 border-purple-300 text-purple-900'
                          : isDark
                            ? 'bg-[#202024] border-white/[0.06] text-slate-400 hover:border-white/[0.12] hover:text-white'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs truncate">{prov.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                      </div>
                      <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                        {prov.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* API Key or Ollama Endpoint Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {selectedProvObj.requiresKey ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-purple-400" />
                    <span>{t.aiApiKey || 'API Key'}</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={aiApiKey}
                      onChange={(e) => {
                        setAiApiKey(e.target.value);
                        handleSaveAiConfig('lummo-ai-apikey', e.target.value);
                      }}
                      placeholder={`sk-... (${selectedProvObj.name})`}
                      className={`w-full px-3.5 py-2.5 pr-10 rounded-xl border text-xs font-mono outline-none transition-all ${
                        isDark 
                          ? 'bg-[#202024] border-white/[0.08] text-white focus:border-purple-500' 
                          : 'bg-white border-slate-200 text-slate-900 focus:border-purple-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-purple-400" />
                    <span>{t.aiEndpoint || 'Endpoint Local'}</span>
                  </label>
                  <input
                    type="text"
                    value={aiEndpoint}
                    onChange={(e) => {
                      setAiEndpoint(e.target.value);
                      handleSaveAiConfig('lummo-ai-endpoint', e.target.value);
                    }}
                    placeholder="http://127.0.0.1:11434"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono outline-none transition-all ${
                      isDark 
                        ? 'bg-[#202024] border-white/[0.08] text-white focus:border-purple-500' 
                        : 'bg-white border-slate-200 text-slate-900 focus:border-purple-500'
                    }`}
                  />
                </div>
              )}

              {/* Model Identifier */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>{t.aiModel || 'Modelo'}</span>
                </label>
                <input
                  type="text"
                  value={aiModel}
                  onChange={(e) => {
                    setAiModel(e.target.value);
                    handleSaveAiConfig('lummo-ai-model', e.target.value);
                  }}
                  placeholder={selectedProvObj.defaultModel}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono outline-none transition-all ${
                    isDark 
                      ? 'bg-[#202024] border-white/[0.08] text-white focus:border-purple-500' 
                      : 'bg-white border-slate-200 text-slate-900 focus:border-purple-500'
                  }`}
                />
              </div>
            </div>

            {/* Test Connection Button & Result */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleTestAiConnection}
                disabled={isTestingAi}
                className={`px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center space-x-1.5 ${
                  isTestingAi ? 'opacity-75 cursor-wait' : ''
                }`}
              >
                <Zap className={`w-3.5 h-3.5 ${isTestingAi ? 'animate-spin' : ''}`} />
                <span>{isTestingAi ? (language === 'es' ? 'Verificando...' : 'Testing...') : (t.aiTestConnection || 'Probar Conexión')}</span>
              </button>

              {testResult && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 ${
                    testResult.type === 'success'
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {testResult.type === 'success' ? <Check className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  <span>{testResult.message}</span>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
