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

import ApiClientView from '../modals/api-webhook/ApiClientView';
import WebhookInspectorView from '../modals/api-webhook/WebhookInspectorView';

export default function StandaloneApiHubWindow({
  projectId,
  projectName = 'Proyecto',
  port = 3000,
  projectPath = '',
  theme = 'dark'
}) {
  const isDark = theme === 'dark';
  const [activeMainTab, setActiveMainTab] = useState('api-client');
  const [collections, setCollections] = useState([]);
  const [webhookEvents, setWebhookEvents] = useState([]);
  const [tunnelUrl, setTunnelUrl] = useState(null);

  // Load Collections for Project Path
  useEffect(() => {
    if (window.electronAPI?.apiClient?.getCollections && projectPath) {
      window.electronAPI.apiClient.getCollections(projectPath).then((res) => {
        if (res?.success && Array.isArray(res.collections)) {
          setCollections(res.collections);
        }
      });
    }
  }, [projectPath]);

  // Load Webhook Events & Listen to Realtime Events
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

  return (
    <div className={`h-screen w-screen flex flex-col font-sans select-none overflow-hidden ${
      isDark ? 'bg-[#141414] text-[#E5E5E5]' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Titlebar Header with Native Window Drag & Controls */}
      <header 
        className={`pl-4 pr-0 h-11 border-b flex items-center justify-between select-none shrink-0 ${
          isDark ? 'bg-[#141414] border-white/[0.08]' : 'bg-white border-slate-200'
        }`}
        style={{ WebkitAppRegion: 'drag' }}
      >
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md">
            <Zap className="h-4 w-4" />
          </div>
          <div className="flex items-center space-x-2.5">
            <span className={`font-extrabold text-sm tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              API & Webhook Hub
            </span>
            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              v3.0 Preview
            </span>
            <span className="font-mono text-xs text-[#888888] font-semibold">
              • {projectName} (:{port})
            </span>
          </div>
        </div>

        {/* Window controls */}
        <div className="flex items-stretch h-full" style={{ WebkitAppRegion: 'no-drag' }}>
          <button
            onClick={() => window.electronAPI?.windowMinimize ? window.electronAPI.windowMinimize() : null}
            className={`w-11 h-full flex items-center justify-center transition-colors cursor-pointer ${
              isDark ? 'text-[#888888] hover:text-white hover:bg-white/[0.06]' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Minimizar"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => window.electronAPI?.windowMaximize ? window.electronAPI.windowMaximize() : null}
            className={`w-11 h-full flex items-center justify-center transition-colors cursor-pointer ${
              isDark ? 'text-[#888888] hover:text-white hover:bg-white/[0.06]' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Maximizar"
          >
            <Square className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => window.electronAPI?.windowClose ? window.electronAPI.windowClose() : window.close()}
            className={`w-12 h-full flex items-center justify-center transition-colors cursor-pointer ${
              isDark ? 'text-[#888888] hover:text-white hover:bg-rose-600' : 'text-slate-500 hover:text-white hover:bg-rose-600'
            }`}
            title="Cerrar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* Main Tab Navigation Toolbar */}
      <div className={`px-6 py-2.5 border-b flex items-center justify-between shrink-0 ${
        isDark ? 'bg-[#181818] border-white/[0.08]' : 'bg-slate-100 border-slate-200'
      }`}>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveMainTab('api-client')}
            className={`px-4 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer ${
              activeMainTab === 'api-client'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : isDark 
                  ? 'text-[#888888] hover:text-white hover:bg-white/[0.04]' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>API Client (REST)</span>
          </button>

          <button
            onClick={() => setActiveMainTab('webhook-inspector')}
            className={`px-4 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer relative ${
              activeMainTab === 'webhook-inspector'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : isDark 
                  ? 'text-[#888888] hover:text-white hover:bg-white/[0.04]' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Webhook Inspector</span>
            {webhookEvents.length > 0 && (
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                activeMainTab === 'webhook-inspector' 
                  ? 'bg-white/20 text-white' 
                  : isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700'
              }`}>
                {webhookEvents.length}
              </span>
            )}
          </button>
        </div>

        {tunnelUrl && (
          <div className="flex items-center space-x-2 text-xs font-mono px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Globe className="w-3.5 h-3.5" />
            <span>Túnel Público Activo</span>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {activeMainTab === 'api-client' ? (
          <ApiClientView
            port={port}
            theme={theme}
            collections={collections}
            onSaveCollectionRequest={handleSaveCollectionRequest}
          />
        ) : (
          <WebhookInspectorView
            projectId={projectId}
            port={port}
            tunnelUrl={tunnelUrl}
            onStartTunnel={() => {}}
            events={webhookEvents}
            onClearEvents={handleClearWebhookEvents}
            onReplayEvent={handleReplayWebhook}
            onSendMock={handleSendMockWebhook}
            theme={theme}
          />
        )}
      </div>
    </div>
  );
}
