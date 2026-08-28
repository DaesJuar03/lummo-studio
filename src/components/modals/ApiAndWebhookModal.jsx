import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Zap, 
  Send, 
  Radio, 
  Minus, 
  Maximize2, 
  Minimize2, 
  X 
} from 'lucide-react';
import { getTranslations } from '../../locales';

import ApiClientView from './api-webhook/ApiClientView';
import WebhookInspectorView from './api-webhook/WebhookInspectorView';

export default function ApiAndWebhookModal({
  isOpen,
  onClose,
  project,
  tunnelUrl,
  onStartTunnel,
  theme = 'dark',
  language = 'es'
}) {
  const isDark = theme === 'dark';
  const t = getTranslations(language);
  const port = project?.port || 3000;

  // Active Main Tab: 'api-client' | 'webhook-inspector'
  const [activeMainTab, setActiveMainTab] = useState('api-client');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Shared state
  const [collections, setCollections] = useState([]);
  const [webhookEvents, setWebhookEvents] = useState([]);

  // Load Collections for Project
  useEffect(() => {
    if (isOpen && window.electronAPI?.apiClient?.getCollections && project?.path) {
      window.electronAPI.apiClient.getCollections(project.path).then((res) => {
        if (res.success && Array.isArray(res.collections)) {
          setCollections(res.collections);
        }
      });
    }
  }, [isOpen, project?.path]);

  // Load Webhook Events & Listen to Realtime Events
  useEffect(() => {
    if (!isOpen || !project?.id) return;

    if (window.electronAPI?.webhookInspector) {
      window.electronAPI.webhookInspector.getEvents(project.id).then((events) => {
        if (Array.isArray(events)) {
          setWebhookEvents(events);
        }
      });

      const unsubscribe = window.electronAPI.webhookInspector.onTrafficEvent?.(({ projectId, event }) => {
        if (projectId === project.id && event) {
          setWebhookEvents((prev) => [event, ...prev]);
        }
      });

      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [isOpen, project?.id]);

  const handleSaveCollectionRequest = async (item) => {
    const updated = [item, ...collections.filter((c) => c.name !== item.name)];
    setCollections(updated);
    if (window.electronAPI?.apiClient?.saveCollections && project?.path) {
      await window.electronAPI.apiClient.saveCollections(project.path, updated);
    }
  };

  const handleClearWebhookEvents = async () => {
    if (window.electronAPI?.webhookInspector?.clearEvents && project?.id) {
      await window.electronAPI.webhookInspector.clearEvents(project.id);
    }
    setWebhookEvents([]);
  };

  const handleReplayWebhook = async (eventObj) => {
    if (!eventObj || !project?.id) return { success: false };
    if (window.electronAPI?.webhookInspector?.replayEvent) {
      const res = await window.electronAPI.webhookInspector.replayEvent(project.id, eventObj, port);
      if (res.success && res.event) {
        setWebhookEvents((prev) => [res.event, ...prev]);
      }
      return res;
    }
    return { success: true };
  };

  const handleSendMockWebhook = async ({ endpoint, headers, payload }) => {
    if (window.electronAPI?.webhookInspector?.sendMock && project?.id) {
      const res = await window.electronAPI.webhookInspector.sendMock({
        projectId: project.id,
        targetPort: port,
        endpoint,
        method: 'POST',
        headers,
        payload
      });
      if (res.success && res.event) {
        setWebhookEvents((prev) => [res.event, ...prev]);
      }
      return res;
    }
    return { success: false };
  };

  if (!isOpen) return null;

  // MINIMIZED FLOATING DOCK WIDGET
  if (isMinimized) {
    return (
      <motion.div
        initial={{ y: 20, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={`fixed bottom-5 right-6 z-50 rounded-2xl border shadow-2xl p-3 flex items-center gap-3.5 backdrop-blur-md cursor-pointer select-none transition-all ${
          isDark 
            ? 'bg-[#12141c]/95 border-[#2c3040] text-white hover:border-purple-500/50 shadow-black/70' 
            : 'bg-white/95 border-slate-200 text-slate-900 hover:border-blue-400 shadow-slate-400/30'
        }`}
        onClick={() => setIsMinimized(false)}
      >
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white shadow-md">
          <Zap className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs">API & Webhooks</span>
            {tunnelUrl ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            ) : (
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
            )}
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            {project?.name || 'Local'} (:{port}) • {activeMainTab === 'api-client' ? 'API Client' : `${webhookEvents.length} ${language === 'es' ? 'eventos' : 'events'}`}
          </span>
        </div>

        <div className="flex items-center gap-1 pl-2 border-l border-white/10" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setIsMinimized(false)}
            className="p-1 text-slate-400 hover:text-white"
            title={language === 'es' ? "Maximizar" : "Maximize"}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-rose-400"
            title={language === 'es' ? "Cerrar" : "Close"}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.15 }}
        className={`w-full ${isMaximized ? 'max-w-[98vw] h-[97vh]' : 'max-w-7xl h-[92vh]'} flex flex-col rounded-3xl border shadow-2xl overflow-hidden ${
          isDark ? 'bg-[#0e1015] border-[#242731] text-[#f4f4f6]' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* TOP MODAL HEADER */}
        <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${
          isDark ? 'border-[#1e212b] bg-[#12141c]' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-extrabold text-base tracking-tight">API & Webhook Hub</h2>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  v3.0
                </span>
                <span className="font-mono text-xs text-slate-400 font-semibold">
                  • {project?.name} (:{port})
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {language === 'es' ? 'Cliente de pruebas HTTP integrado & monitor de tráfico en vivo con Replay' : 'Integrated HTTP test client & live traffic monitor with Replay'}
              </p>
            </div>
          </div>

          {/* MAIN TABS SWITCHER */}
          <div className="flex items-center space-x-1 p-1 rounded-2xl border bg-black/20 border-white/5">
            <button
              onClick={() => setActiveMainTab('api-client')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                activeMainTab === 'api-client'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>API Client (REST)</span>
            </button>

            <button
              onClick={() => setActiveMainTab('webhook-inspector')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 relative cursor-pointer ${
                activeMainTab === 'webhook-inspector'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Webhook Inspector</span>
              {webhookEvents.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              )}
            </button>
          </div>

          {/* WINDOW CONTROLS (Minimize, Maximize, Close) */}
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setIsMinimized(true)}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isDark ? 'border-[#262a36] hover:bg-[#1a1d27] text-slate-400 hover:text-white' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
              }`}
              title={language === 'es' ? "Minimizar (Widget flotante)" : "Minimize (Floating widget)"}
            >
              <Minus className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isDark ? 'border-[#262a36] hover:bg-[#1a1d27] text-slate-400 hover:text-white' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
              }`}
              title={isMaximized ? (language === 'es' ? "Restaurar tamaño normal" : "Restore normal size") : (language === 'es' ? "Maximizar" : "Maximize")}
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isDark ? 'border-[#262a36] hover:bg-[#1a1d27] text-slate-400 hover:text-white' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
              }`}
              title={language === 'es' ? "Cerrar" : "Close"}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TAB 1: NATIVE API CLIENT */}
        {activeMainTab === 'api-client' && (
          <ApiClientView
            project={project}
            port={port}
            theme={theme}
            language={language}
            collections={collections}
            onSaveCollectionRequest={handleSaveCollectionRequest}
          />
        )}

        {/* TAB 2: LIVE WEBHOOK INSPECTOR & REPLAY HUB */}
        {activeMainTab === 'webhook-inspector' && (
          <WebhookInspectorView
            project={project}
            port={port}
            tunnelUrl={tunnelUrl}
            onStartTunnel={onStartTunnel}
            theme={theme}
            language={language}
            webhookEvents={webhookEvents}
            onClearEvents={handleClearWebhookEvents}
            onReplayEvent={handleReplayWebhook}
            onSendMock={handleSendMockWebhook}
          />
        )}
      </motion.div>
    </div>
  );
}
