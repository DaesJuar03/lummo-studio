import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Send, 
  Radio, 
  Minus, 
  Square, 
  X, 
  Globe 
} from 'lucide-react';
import { getTranslations } from '../../locales';

import ApiClientView from '../modals/api-webhook/ApiClientView';
import WebhookInspectorView from '../modals/api-webhook/WebhookInspectorView';

export default function StandaloneApiHubWindow({
  projectId,
  projectName = 'Proyecto',
  port = 3000,
  projectPath = '',
  theme = 'dark',
  language = 'es'
}) {
  const isDark = theme === 'dark';
  const t = getTranslations(language);
  const [activeMainTab, setActiveMainTab] = useState('api-client');
  const [collections, setCollections] = useState([]);
  const [webhookEvents, setWebhookEvents] = useState([]);
  const [tunnelUrl, setTunnelUrl] = useState(null);

  useEffect(() => {
    if (window.electronAPI?.apiClient?.getCollections && projectPath) {
      window.electronAPI.apiClient.getCollections(projectPath).then((res) => {
        if (res?.success && Array.isArray(res.collections)) {
          setCollections(res.collections);
        }
      });
    }
  }, [projectPath]);

  useEffect(() => {
    if (!projectId) return;

    if (window.electronAPI?.webhookInspector) {
      window.electronAPI.webhookInspector.getEvents(projectId).then((events) => {
        if (Array.isArray(events)) {
          setWebhookEvents(events);
        }
      });

      const unsubscribe = window.electronAPI.webhookInspector.onTrafficEvent?.(({ projectId: id, event }) => {
        if (id === projectId && event) {
          setWebhookEvents((prev) => [event, ...prev]);
        }
      });

      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [projectId]);

  const handleSaveCollectionRequest = async (item) => {
    const updated = [item, ...collections.filter((c) => c.name !== item.name)];
    setCollections(updated);
    if (window.electronAPI?.apiClient?.saveCollections && projectPath) {
      await window.electronAPI.apiClient.saveCollections(projectPath, updated);
    }
  };

  const handleClearWebhookEvents = async () => {
    if (window.electronAPI?.webhookInspector?.clearEvents && projectId) {
      await window.electronAPI.webhookInspector.clearEvents(projectId);
    }
    setWebhookEvents([]);
  };

  const handleReplayWebhook = async (eventObj) => {
    if (!eventObj || !projectId) return { success: false };
    if (window.electronAPI?.webhookInspector?.replayEvent) {
      const res = await window.electronAPI.webhookInspector.replayEvent(projectId, eventObj, port);
      if (res?.success && res.event) {
        setWebhookEvents((prev) => [res.event, ...prev]);
      }
      return res;
    }
    return { success: true };
  };

  const handleSendMockWebhook = async ({ endpoint, headers, payload }) => {
    if (window.electronAPI?.webhookInspector?.sendMock && projectId) {
      const res = await window.electronAPI.webhookInspector.sendMock({
        projectId,
        targetPort: port,
        endpoint,
        method: 'POST',
        headers,
        payload
      });
      if (res?.success && res.event) {
        setWebhookEvents((prev) => [res.event, ...prev]);
      }
      return res;
    }
    return { success: false };
  };

  const handleStartTunnel = async (provider = 'cloudflare') => {
    if (window.electronAPI?.startTunnel) {
      const res = await window.electronAPI.startTunnel(projectId, port, provider);
      if (res?.success && res.url) {
        setTunnelUrl(res.url);
      }
    }
  };

  return (
    <div className={`h-screen flex flex-col font-sans select-none overflow-hidden ${
      isDark ? 'bg-[#0e1015] text-[#f4f4f6]' : 'bg-slate-100 text-slate-900'
    }`}>
      {/* Titlebar Header */}
      <header 
        className={`pl-4 pr-0 h-11 border-b flex items-center justify-between select-none shrink-0 ${
          isDark ? 'bg-[#12141c] border-[#1e212b]' : 'bg-white border-slate-200'
        }`}
        style={{ WebkitAppRegion: 'drag' }}
      >
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
            <Zap className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className={`font-extrabold text-sm tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              API & Webhook Hub <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">{projectName} (:{port})</span>
            </span>
          </div>
        </div>

        {/* Tab switchers in header */}
        <div className="flex items-center space-x-1 p-1 rounded-2xl border bg-black/20 border-white/5" style={{ WebkitAppRegion: 'no-drag' }}>
          <button
            onClick={() => setActiveMainTab('api-client')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeMainTab === 'api-client'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Send className="w-3 h-3" />
            <span>API Client</span>
          </button>

          <button
            onClick={() => setActiveMainTab('webhook-inspector')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 relative cursor-pointer ${
              activeMainTab === 'webhook-inspector'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="w-3 h-3" />
            <span>Webhooks</span>
            {webhookEvents.length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            )}
          </button>
        </div>

        {/* Window controls */}
        <div className="flex items-stretch h-full" style={{ WebkitAppRegion: 'no-drag' }}>
          <button
            onClick={() => window.electronAPI?.windowMinimize?.()}
            className={`w-11 h-full flex items-center justify-center transition-colors cursor-pointer ${
              isDark ? 'text-slate-400 hover:text-white hover:bg-[#1a1d27]' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title={language === 'es' ? "Minimizar" : "Minimize"}
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => window.electronAPI?.windowMaximize?.()}
            className={`w-11 h-full flex items-center justify-center transition-colors cursor-pointer ${
              isDark ? 'text-slate-400 hover:text-white hover:bg-[#1a1d27]' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title={language === 'es' ? "Maximizar" : "Maximize"}
          >
            <Square className="h-3 w-3" />
          </button>
          <button
            onClick={() => window.electronAPI?.windowClose?.()}
            className="w-12 h-full flex items-center justify-center text-slate-500 hover:text-white hover:bg-rose-600 transition-colors cursor-pointer"
            title={language === 'es' ? "Cerrar" : "Close"}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main View Container */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeMainTab === 'api-client' && (
          <ApiClientView
            project={{ id: projectId, name: projectName, path: projectPath }}
            port={port}
            theme={theme}
            language={language}
            collections={collections}
            onSaveCollectionRequest={handleSaveCollectionRequest}
          />
        )}

        {activeMainTab === 'webhook-inspector' && (
          <WebhookInspectorView
            project={{ id: projectId, name: projectName, path: projectPath }}
            port={port}
            tunnelUrl={tunnelUrl}
            onStartTunnel={handleStartTunnel}
            theme={theme}
            language={language}
            webhookEvents={webhookEvents}
            onClearEvents={handleClearWebhookEvents}
            onReplayEvent={handleReplayWebhook}
            onSendMock={handleSendMockWebhook}
          />
        )}
      </div>
    </div>
  );
}
