import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, 
  X, 
  Send, 
  Sparkles, 
  Trash2, 
  Copy, 
  Check, 
  Settings, 
  AlertTriangle, 
  Terminal, 
  Database, 
  Zap, 
  RefreshCw,
  Code2
} from 'lucide-react';
import { getTranslations } from '../../locales';

export default function AiAssistantDock({
  isOpen,
  onClose,
  projects = [],
  customDatabases = [],
  logs = {},
  onOpenSettings,
  theme,
  language = 'es'
}) {
  const isDark = theme === 'dark';
  const t = getTranslations(language);
  const messagesEndRef = useRef(null);

  // Configuration from localStorage
  const [provider, setProvider] = useState('ollama');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('llama3:latest');
  const [endpoint, setAiEndpoint] = useState('http://127.0.0.1:11434');

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('lummo-ai-chat-history');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        role: 'assistant',
        content: language === 'es' 
          ? '👋 ¡Hola! Soy **Lummo AI**, tu copiloto de infraestructura, servidores y bases de datos.\n\nPuedo ayudarte a diagnosticar errores en tus logs, escribir consultas SQL para MySQL/Postgres/SQLite, generar mocks o sugerir comandos.'
          : '👋 Hello! I am **Lummo AI**, your infrastructure, server, and database copilot.\n\nI can help you diagnose terminal errors, write SQL queries, generate mock data, or optimize server setups.'
      }
    ];
  });

  // Reload AI settings when dock opens
  useEffect(() => {
    if (isOpen) {
      try {
        setProvider(localStorage.getItem('lummo-ai-provider') || 'ollama');
        setApiKey(localStorage.getItem('lummo-ai-apikey') || '');
        setModel(localStorage.getItem('lummo-ai-model') || 'llama3:latest');
        setAiEndpoint(localStorage.getItem('lummo-ai-endpoint') || 'http://127.0.0.1:11434');
      } catch {}
    }
  }, [isOpen]);

  // Save chat history
  useEffect(() => {
    try {
      localStorage.setItem('lummo-ai-chat-history', JSON.stringify(messages.slice(-30)));
    } catch {}
  }, [messages]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  const handleClearHistory = () => {
    const welcome = [
      {
        role: 'assistant',
        content: language === 'es' 
          ? '🧹 Conversación reiniciada. ¿En qué puedo ayudarte hoy?' 
          : '🧹 Chat cleared. How can I help you today?'
      }
    ];
    setMessages(welcome);
    try {
      localStorage.setItem('lummo-ai-chat-history', JSON.stringify(welcome));
    } catch {}
  };

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMsg = { role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputMessage('');
    setIsLoading(true);

    // Build context
    const runningProjects = projects.filter(p => p.status === 'RUNNING');
    const recentLogsArray = [];
    Object.keys(logs).forEach(pId => {
      const pLogs = logs[pId] || [];
      if (pLogs.length > 0) {
        recentLogsArray.push(...pLogs.slice(-10));
      }
    });

    const context = {
      runningProjectsCount: runningProjects.length,
      projectName: runningProjects[0]?.name || projects[0]?.name || '',
      projectType: runningProjects[0]?.techStack || '',
      port: runningProjects[0]?.port || 3000,
      recentLogs: recentLogsArray.slice(-15),
      databaseInfo: customDatabases[0] ? {
        name: customDatabases[0].name,
        type: customDatabases[0].type,
        tables: customDatabases[0].tables || []
      } : null
    };

    try {
      if (!window.electronAPI?.ai?.chatCompletion) {
        throw new Error('API de IA no disponible en Electron');
      }

      // Convert messages to clean array for API
      const apiMessages = updatedMessages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }));

      const res = await window.electronAPI.ai.chatCompletion({
        provider,
        apiKey,
        model,
        endpoint,
        messages: apiMessages,
        context
      });

      if (res?.success && res.message?.content) {
        setMessages([...updatedMessages, { role: 'assistant', content: res.message.content }]);
      } else {
        setMessages([
          ...updatedMessages,
          {
            role: 'assistant',
            content: `⚠️ **${language === 'es' ? 'Error del Asistente' : 'Assistant Error'}:** ${res?.error || 'No se pudo obtener respuesta del modelo.'}\n\n*${language === 'es' ? 'Verifica tu API Key o endpoint en Ajustes > Experimental.' : 'Check your API Key or endpoint in Settings > Experimental.'}*`
          }
        ]);
      }
    } catch (err) {
      setMessages([
        ...updatedMessages,
        {
          role: 'assistant',
          content: `⚠️ **${language === 'es' ? 'Error' : 'Error'}:** ${err.message || 'Error de conexión'}`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = (codeText, idx) => {
    navigator.clipboard.writeText(codeText);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Quick Prompt shortcuts
  const quickPrompts = [
    { label: t.aiQuickExplainError || 'Diagnosticar errores en logs', icon: Terminal, prompt: language === 'es' ? 'Analiza los últimos errores en mis logs de servidor y dame la solución paso a paso.' : 'Analyze the latest error logs from my server and provide a step-by-step solution.' },
    { label: t.aiQuickSqlSchema || 'Escribir consulta SQL / migración', icon: Database, prompt: language === 'es' ? 'Genera un script SQL con claves foráneas e índices para un sistema de usuarios, roles y permisos.' : 'Generate a SQL migration with foreign keys and indexes for a user, role, and permission system.' },
    { label: t.aiQuickMockData || 'Generar Mock Data (20 registros)', icon: Zap, prompt: language === 'es' ? 'Genera 20 registros ficticios de prueba en formato SQL INSERT y JSON para pruebas locales.' : 'Generate 20 mock records in SQL INSERT and JSON format for testing.' }
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end select-none"
        onClick={onClose}
      >
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-md md:max-w-lg h-full border-l shadow-2xl flex flex-col ${
            isDark ? 'bg-[#121316] border-white/[0.08] text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Header */}
          <div className={`px-5 py-4 border-b flex items-center justify-between shrink-0 ${
            isDark ? 'bg-[#16171b] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.25)]">
                <Sparkles className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm flex items-center gap-2">
                  <span>Lummo AI</span>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 font-bold uppercase">
                    {provider} ({model})
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  {language === 'es' ? 'Copiloto de Infraestructura & Bases de Datos' : 'Infrastructure & Database Copilot'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={handleClearHistory}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10' : 'text-slate-400 hover:text-rose-600 hover:bg-slate-100'
                }`}
                title={t.aiClearChat || 'Limpiar conversación'}
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenSettings) onOpenSettings('experimental');
                }}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-purple-400 hover:bg-purple-500/10' : 'text-slate-400 hover:text-purple-600 hover:bg-slate-100'
                }`}
                title={language === 'es' ? 'Configurar modelo y API keys' : 'Configure model & API keys'}
              >
                <Settings className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Prompts Bar */}
          <div className={`px-4 py-2.5 border-b flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 ${
            isDark ? 'bg-[#141519] border-white/[0.04]' : 'bg-slate-50/60 border-slate-100'
          }`}>
            {quickPrompts.map((qp, i) => {
              const Icon = qp.icon;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSendMessage(qp.prompt)}
                  disabled={isLoading}
                  className={`px-3 py-1 rounded-xl text-[11px] font-bold shrink-0 flex items-center space-x-1.5 transition-all cursor-pointer border ${
                    isDark 
                      ? 'bg-[#1c1d22] border-white/[0.08] text-slate-300 hover:border-purple-500/40 hover:text-purple-300' 
                      : 'bg-white border-slate-200 text-slate-700 hover:border-purple-300 hover:text-purple-700'
                  }`}
                >
                  <Icon className="w-3 h-3 text-purple-400" />
                  <span>{qp.label}</span>
                </button>
              );
            })}
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-5 overflow-y-auto custom-scrollbar space-y-4">
            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[88%] rounded-2xl p-4 text-xs leading-relaxed ${
                    isUser
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                      : isDark
                        ? 'bg-[#1a1b20] border border-white/[0.08] text-slate-200'
                        : 'bg-slate-100 border border-slate-200 text-slate-800'
                  }`}>
                    {/* Render message with formatted code block detection */}
                    <div className="space-y-2 whitespace-pre-wrap">
                      {msg.content}
                    </div>

                    {!isUser && (
                      <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span className="flex items-center gap-1">
                          <Bot className="w-3 h-3 text-purple-400" />
                          <span>Lummo AI</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(msg.content, idx)}
                          className="hover:text-white flex items-center space-x-1 cursor-pointer"
                          title="Copiar respuesta"
                        >
                          {copiedIndex === idx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedIndex === idx ? 'Copiado' : 'Copiar'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {isLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className={`rounded-2xl p-3.5 text-xs flex items-center space-x-2.5 ${
                  isDark ? 'bg-[#1a1b20] border border-white/[0.08] text-purple-300' : 'bg-slate-100 text-purple-700'
                }`}>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
                  <span className="font-mono text-[11px]">{t.aiThinking || 'Lummo AI está pensando...'}</span>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className={`p-4 border-t shrink-0 ${isDark ? 'bg-[#16171b] border-white/[0.08]' : 'bg-slate-50 border-slate-200'}`}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center space-x-2"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={t.aiChatPlaceholder || 'Pregunta sobre tus servidores, bases de datos o errores...'}
                disabled={isLoading}
                className={`flex-1 px-4 py-2.5 rounded-xl border text-xs outline-none transition-all ${
                  isDark 
                    ? 'bg-[#1c1d22] border-white/[0.08] text-white focus:border-purple-500 placeholder:text-slate-500' 
                    : 'bg-white border-slate-200 text-slate-900 focus:border-purple-500 placeholder:text-slate-400'
                } disabled:opacity-50`}
              />

              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:opacity-40 disabled:pointer-events-none text-white transition-all shadow-md shadow-purple-600/20 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
