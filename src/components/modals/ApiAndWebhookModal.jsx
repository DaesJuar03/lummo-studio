import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Send,
  Zap,
  Radio,
  RotateCw,
  Copy,
  Check,
  Plus,
  Trash2,
  Code2,
  FolderOpen,
  Save,
  Sparkles,
  Layers,
  Search,
  Clock,
  HardDrive,
  Shield,
  Server,
  ArrowRight,
  ChevronRight,
  SlidersHorizontal,
  FileCode,
  FileJson,
  Play,
  Share2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Minus,
  Maximize2,
  Minimize2
} from 'lucide-react';

export default function ApiAndWebhookModal({
  isOpen,
  onClose,
  project,
  tunnelUrl,
  onStartTunnel,
  theme = 'dark'
}) {
  const isDark = theme === 'dark';
  const port = project?.port || 3000;

  // Active Main Tab: 'api-client' | 'webhook-inspector'
  const [activeMainTab, setActiveMainTab] = useState('api-client');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // ==========================================
  // --- 1. STATE: API CLIENT (REST & GRAPHQL) ---
  // ==========================================
  const [method, setMethod] = useState('GET');
  const [endpoint, setEndpoint] = useState(`http://localhost:${port}/api`);
  const [isSending, setIsSending] = useState(false);

  // Request Config Tabs: 'params' | 'headers' | 'body' | 'auth' | 'snippets'
  const [reqConfigTab, setReqConfigTab] = useState('params');

  // Params & Headers
  const [queryParams, setQueryParams] = useState([{ key: '', value: '', enabled: true }]);
  const [headers, setHeaders] = useState([
    { key: 'Accept', value: 'application/json', enabled: true },
    { key: 'Content-Type', value: 'application/json', enabled: true }
  ]);

  // Body
  const [bodyType, setBodyType] = useState('json'); // 'none' | 'json' | 'form' | 'raw'
  const [jsonBody, setJsonBody] = useState('{\n  "hello": "world"\n}');
  const [formPairs, setFormPairs] = useState([{ key: '', value: '', enabled: true }]);
  const [rawBodyText, setRawBodyText] = useState('');

  // Auth
  const [authType, setAuthType] = useState('none'); // 'none' | 'bearer' | 'basic'
  const [bearerToken, setBearerToken] = useState('');
  const [basicAuth, setBasicAuth] = useState({ username: '', password: '' });

  // Response State
  const [apiResponse, setApiResponse] = useState(null);
  const [respTab, setRespTab] = useState('body'); // 'body' | 'headers' | 'cookies'
  const [copiedResp, setCopiedResp] = useState(false);

  // Collections State
  const [collections, setCollections] = useState([]);
  const [selectedReqName, setSelectedReqName] = useState('');
  const [showSaveReqModal, setShowSaveReqModal] = useState(false);
  const [reqSaveName, setReqSaveName] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Code Snippet Generator
  const [snippetLang, setSnippetLang] = useState('fetch'); // 'fetch' | 'axios' | 'curl' | 'python' | 'php'
  const [snippetCopied, setSnippetCopied] = useState(false);

  // ==========================================
  // --- 2. STATE: WEBHOOK INSPECTOR & REPLAY ---
  // ==========================================
  const [webhookEvents, setWebhookEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [webhookFilter, setWebhookFilter] = useState('all'); // 'all' | '2xx' | 'errors' | 'replays'
  const [searchQuery, setSearchQuery] = useState('');
  const [isReplaying, setIsReplaying] = useState(false);
  const [replaySuccessMsg, setReplaySuccessMsg] = useState('');

  // Mock Webhook Generator Modal
  const [showMockModal, setShowMockModal] = useState(false);
  const [mockTemplates, setMockTemplates] = useState({});
  const [selectedMockKey, setSelectedMockKey] = useState('stripe_payment_success');
  const [mockEndpoint, setMockEndpoint] = useState('/api/webhooks/stripe');
  const [mockPayloadText, setMockPayloadText] = useState('');
  const [mockHeadersText, setMockHeadersText] = useState('');
  const [isSendingMock, setIsSendingMock] = useState(false);

  // Sync endpoint with project port
  useEffect(() => {
    if (project?.port) {
      setEndpoint(`http://localhost:${project.port}/api`);
    }
  }, [project?.port]);

  // Load Saved Collections for Project
  useEffect(() => {
    if (isOpen && window.electronAPI?.apiClient?.getCollections && project?.path) {
      window.electronAPI.apiClient.getCollections(project.path).then((res) => {
        if (res.success && Array.isArray(res.collections)) {
          setCollections(res.collections);
        }
      });
    }
  }, [isOpen, project?.path]);

  // Load Webhook Events & Mock Templates
  useEffect(() => {
    if (!isOpen || !project?.id) return;

    if (window.electronAPI?.webhookInspector) {
      window.electronAPI.webhookInspector.getEvents(project.id).then((events) => {
        if (Array.isArray(events)) {
          setWebhookEvents(events);
          if (events.length > 0 && !selectedEventId) {
            setSelectedEventId(events[0].id);
          }
        }
      });

      window.electronAPI.webhookInspector.getMockTemplates().then((templates) => {
        if (templates) {
          setMockTemplates(templates);
          if (templates.stripe_payment_success) {
            setMockEndpoint(templates.stripe_payment_success.defaultEndpoint);
            setMockPayloadText(JSON.stringify(templates.stripe_payment_success.payload, null, 2));
            setMockHeadersText(JSON.stringify(templates.stripe_payment_success.headers, null, 2));
          }
        }
      });

      const unsub = window.electronAPI.webhookInspector.onTrafficEvent(({ projectId, event }) => {
        if (projectId === project.id) {
          setWebhookEvents((prev) => [event, ...prev.filter((e) => e.id !== event.id)]);
          setSelectedEventId(event.id);
        }
      });

      return () => {
        if (typeof unsub === 'function') unsub();
      };
    }
  }, [isOpen, project?.id]);

  // ==========================================
  // --- ACTIONS: API CLIENT ---
  // ==========================================
  const handleSendRequest = async () => {
    setIsSending(true);
    setApiResponse(null);

    // Build Headers
    const reqHeaders = {};
    headers.forEach((h) => {
      if (h.enabled && h.key.trim()) reqHeaders[h.key.trim()] = h.value;
    });

    if (authType === 'bearer' && bearerToken.trim()) {
      reqHeaders['Authorization'] = `Bearer ${bearerToken.trim()}`;
    } else if (authType === 'basic' && basicAuth.username) {
      const encoded = btoa(`${basicAuth.username}:${basicAuth.password}`);
      reqHeaders['Authorization'] = `Basic ${encoded}`;
    }

    // Build Params
    const reqParams = {};
    queryParams.forEach((p) => {
      if (p.enabled && p.key.trim()) reqParams[p.key.trim()] = p.value;
    });

    // Build Body
    let reqBody = null;
    if (method !== 'GET' && method !== 'HEAD') {
      if (bodyType === 'json') {
        try {
          reqBody = jsonBody ? JSON.parse(jsonBody) : {};
        } catch (e) {
          reqBody = jsonBody;
        }
      } else if (bodyType === 'form') {
        reqBody = {};
        formPairs.forEach((f) => {
          if (f.enabled && f.key.trim()) reqBody[f.key.trim()] = f.value;
        });
      } else if (bodyType === 'raw') {
        reqBody = rawBodyText;
      }
    }

    if (window.electronAPI?.apiClient?.sendRequest) {
      const res = await window.electronAPI.apiClient.sendRequest({
        method,
        url: endpoint,
        headers: reqHeaders,
        params: reqParams,
        body: reqBody,
        bodyType
      });
      setApiResponse(res);
    } else {
      // Fallback simulation in browser
      const start = Date.now();
      try {
        const urlObj = new URL(endpoint);
        Object.entries(reqParams).forEach(([k, v]) => urlObj.searchParams.append(k, v));
        const res = await fetch(urlObj.toString(), {
          method,
          headers: reqHeaders,
          body: method !== 'GET' && method !== 'HEAD' && reqBody ? (typeof reqBody === 'string' ? reqBody : JSON.stringify(reqBody)) : undefined
        });
        const durationMs = Date.now() - start;
        const text = await res.text();
        let parsed = text;
        try { parsed = JSON.parse(text); } catch (e) {}

        const headersObj = {};
        res.headers.forEach((v, k) => { headersObj[k] = v; });

        setApiResponse({
          success: true,
          status: res.status,
          statusText: res.statusText,
          headers: headersObj,
          cookies: [],
          body: parsed,
          rawBody: text,
          sizeBytes: new Blob([text]).size,
          durationMs,
          contentType: res.headers.get('content-type') || ''
        });
      } catch (err) {
        setApiResponse({
          success: false,
          error: err.message,
          durationMs: Date.now() - start
        });
      }
    }

    setIsSending(false);
  };

  const handleSaveCollectionRequest = async () => {
    if (!reqSaveName.trim()) return;
    const newReq = {
      id: 'req_' + Date.now(),
      name: reqSaveName.trim(),
      method,
      endpoint,
      queryParams,
      headers,
      bodyType,
      jsonBody,
      formPairs,
      rawBodyText,
      authType,
      bearerToken,
      basicAuth
    };

    const updated = [newReq, ...collections.filter((c) => c.name !== newReq.name)];
    setCollections(updated);
    setSelectedReqName(newReq.name);

    if (window.electronAPI?.apiClient?.saveCollections && project?.path) {
      await window.electronAPI.apiClient.saveCollections(project.path, updated);
    }
    setReqSaveName('');
    setShowSaveReqModal(false);
    setSaveSuccessMsg('¡Petición guardada en .lummo/api-collections.json!');
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  const handleLoadCollectionRequest = (item) => {
    setSelectedReqName(item.name);
    setMethod(item.method || 'GET');
    setEndpoint(item.endpoint || `http://localhost:${port}/api`);
    if (item.queryParams) setQueryParams(item.queryParams);
    if (item.headers) setHeaders(item.headers);
    if (item.bodyType) setBodyType(item.bodyType);
    if (item.jsonBody) setJsonBody(item.jsonBody);
    if (item.formPairs) setFormPairs(item.formPairs);
    if (item.rawBodyText) setRawBodyText(item.rawBodyText);
    if (item.authType) setAuthType(item.authType);
    if (item.bearerToken) setBearerToken(item.bearerToken);
    if (item.basicAuth) setBasicAuth(item.basicAuth);
  };

  const handleDeleteCollectionRequest = async (e, id) => {
    e.stopPropagation();
    const updated = collections.filter((c) => c.id !== id);
    setCollections(updated);
    if (window.electronAPI?.apiClient?.saveCollections && project?.path) {
      await window.electronAPI.apiClient.saveCollections(project.path, updated);
    }
  };

  const generatedSnippet = useMemo(() => {
    const cleanHeaders = {};
    headers.forEach((h) => {
      if (h.enabled && h.key.trim()) cleanHeaders[h.key.trim()] = h.value;
    });
    if (authType === 'bearer' && bearerToken) cleanHeaders['Authorization'] = `Bearer ${bearerToken}`;

    const bodyPayload = bodyType === 'json' ? jsonBody : rawBodyText;

    if (snippetLang === 'fetch') {
      return `fetch('${endpoint}', {
  method: '${method}',
  headers: ${JSON.stringify(cleanHeaders, null, 2)},
  ${method !== 'GET' && method !== 'HEAD' && bodyPayload ? `body: JSON.stringify(${bodyPayload})` : ''}
})
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));`;
    }

    if (snippetLang === 'axios') {
      return `import axios from 'axios';

const response = await axios({
  method: '${method.toLowerCase()}',
  url: '${endpoint}',
  headers: ${JSON.stringify(cleanHeaders, null, 2)},
  ${method !== 'GET' && method !== 'HEAD' && bodyPayload ? `data: ${bodyPayload}` : ''}
});

console.log(response.data);`;
    }

    if (snippetLang === 'curl') {
      let headerFlags = Object.entries(cleanHeaders)
        .map(([k, v]) => `  -H "${k}: ${v}"`)
        .join(' \\\n');
      let dataFlag = method !== 'GET' && method !== 'HEAD' && bodyPayload
        ? ` \\\n  -d '${bodyPayload.replace(/'/g, "\\'")}'`
        : '';
      return `curl -X ${method} "${endpoint}"${headerFlags ? ' \\\n' + headerFlags : ''}${dataFlag}`;
    }

    if (snippetLang === 'python') {
      return `import requests

url = "${endpoint}"
headers = ${JSON.stringify(cleanHeaders, null, 2)}
${method !== 'GET' && method !== 'HEAD' && bodyPayload ? `payload = ${bodyPayload}` : 'payload = None'}

response = requests.${method.toLowerCase()}(url, headers=headers, json=payload)
print(response.json())`;
    }

    return '';
  }, [method, endpoint, headers, bodyType, jsonBody, rawBodyText, authType, bearerToken, snippetLang]);

  // ==========================================
  // --- ACTIONS: WEBHOOK INSPECTOR ---
  // ==========================================
  const filteredWebhookEvents = useMemo(() => {
    return webhookEvents.filter((ev) => {
      // Filter tab
      if (webhookFilter === '2xx' && (ev.statusCode < 200 || ev.statusCode >= 300)) return false;
      if (webhookFilter === 'errors' && ev.statusCode < 400) return false;
      if (webhookFilter === 'replays' && !ev.isReplay) return false;

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const pathMatch = (ev.path || ev.url || '').toLowerCase().includes(q);
        const bodyMatch = JSON.stringify(ev.body || '').toLowerCase().includes(q);
        return pathMatch || bodyMatch;
      }
      return true;
    });
  }, [webhookEvents, webhookFilter, searchQuery]);

  const activeWebhookEvent = useMemo(() => {
    return webhookEvents.find((e) => e.id === selectedEventId) || webhookEvents[0] || null;
  }, [webhookEvents, selectedEventId]);

  const handleReplayWebhook = async (eventObj) => {
    if (!eventObj || !project?.id) return;
    setIsReplaying(true);
    setReplaySuccessMsg('');

    if (window.electronAPI?.webhookInspector?.replayEvent) {
      const res = await window.electronAPI.webhookInspector.replayEvent(project.id, eventObj, port);
      if (res.success && res.event) {
        setWebhookEvents((prev) => [res.event, ...prev]);
        setSelectedEventId(res.event.id);
        setReplaySuccessMsg('¡Petición reenviada con éxito al servidor local!');
      } else {
        setReplaySuccessMsg(`Error al reenviar: ${res.error || 'Fallo de conexión'}`);
      }
    } else {
      setReplaySuccessMsg('¡Replay simulado con éxito!');
    }

    setIsReplaying(false);
    setTimeout(() => setReplaySuccessMsg(''), 3500);
  };

  const handleClearWebhookHistory = async () => {
    if (window.electronAPI?.webhookInspector?.clearEvents && project?.id) {
      await window.electronAPI.webhookInspector.clearEvents(project.id);
    }
    setWebhookEvents([]);
    setSelectedEventId(null);
  };

  const handleSelectMockTemplate = (key) => {
    setSelectedMockKey(key);
    const tmpl = mockTemplates[key];
    if (tmpl) {
      setMockEndpoint(tmpl.defaultEndpoint);
      setMockPayloadText(JSON.stringify(tmpl.payload, null, 2));
      setMockHeadersText(JSON.stringify(tmpl.headers, null, 2));
    }
  };

  const handleDispatchMockWebhook = async () => {
    setIsSendingMock(true);
    let parsedPayload = {};
    let parsedHeaders = {};
    try {
      parsedPayload = mockPayloadText ? JSON.parse(mockPayloadText) : {};
      parsedHeaders = mockHeadersText ? JSON.parse(mockHeadersText) : {};
    } catch (e) {
      alert('Error de sintaxis JSON en el Payload o Headers');
      setIsSendingMock(false);
      return;
    }

    if (window.electronAPI?.webhookInspector?.sendMock && project?.id) {
      const res = await window.electronAPI.webhookInspector.sendMock({
        projectId: project.id,
        targetPort: port,
        endpoint: mockEndpoint,
        method: 'POST',
        headers: parsedHeaders,
        payload: parsedPayload
      });
      if (res.success && res.event) {
        setWebhookEvents((prev) => [res.event, ...prev]);
        setSelectedEventId(res.event.id);
      }
    }
    setIsSendingMock(false);
    setShowMockModal(false);
  };

  const getMethodBadgeColor = (m) => {
    if (!m) return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    switch (m.toUpperCase()) {
      case 'GET': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'POST': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'PUT': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'PATCH': return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'DELETE': return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  const getStatusBadge = (statusCode) => {
    if (!statusCode) return null;
    if (statusCode >= 200 && statusCode < 300) {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="w-3 h-3" /> {statusCode} OK
        </span>
      );
    }
    if (statusCode >= 400 && statusCode < 500) {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <AlertTriangle className="w-3 h-3" /> {statusCode} Client Error
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">
        <XCircle className="w-3 h-3" /> {statusCode} Server Error
      </span>
    );
  };

  if (!isOpen) return null;

  // MINIMIZED FLOATING DOCK WIDGET (Bottom-Right Corner)
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
            {project?.name || 'Local'} (:{port}) • {activeMainTab === 'api-client' ? 'API Client' : `${webhookEvents.length} eventos`}
          </span>
        </div>

        <div className="flex items-center gap-1 pl-2 border-l border-white/10" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setIsMinimized(false)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Restaurar / Abrir Ventana"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
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
                  v3.0 Preview
                </span>
                <span className="font-mono text-xs text-slate-400 font-semibold">
                  • {project?.name} (:{port})
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Cliente de pruebas HTTP integrado & monitor de tráfico en vivo con Replay
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
              title="Minimizar (Widget flotante)"
            >
              <Minus className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isDark ? 'border-[#262a36] hover:bg-[#1a1d27] text-slate-400 hover:text-white' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
              }`}
              title={isMaximized ? "Restaurar tamaño normal" : "Maximizar"}
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isDark ? 'border-[#262a36] hover:bg-[#1a1d27] text-slate-400 hover:text-white' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
              }`}
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ==================================================== */}
        {/* --- TAB 1: ⚡ NATIVE API CLIENT (REST & GRAPHQL) --- */}
        {/* ==================================================== */}
        {activeMainTab === 'api-client' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* REQUEST ADDRESS BAR */}
            <div className={`p-4 border-b flex items-center gap-3 shrink-0 ${
              isDark ? 'border-[#1e212b] bg-[#0c0d12]' : 'border-slate-200 bg-white'
            }`}>
              {/* Method Selector */}
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className={`px-3 py-2.5 rounded-2xl font-mono font-black text-xs border outline-none cursor-pointer ${
                  getMethodBadgeColor(method)
                } ${isDark ? 'bg-[#151822]' : 'bg-slate-100'}`}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
                <option value="HEAD">HEAD</option>
                <option value="OPTIONS">OPTIONS</option>
              </select>

              {/* Endpoint Input */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder={`http://localhost:${port}/api/v1/users`}
                  className={`w-full px-4 py-2.5 rounded-2xl border font-mono text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                    isDark ? 'bg-[#151822] border-[#262a36] text-white' : 'bg-slate-100 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              {/* Send Button */}
              <button
                onClick={handleSendRequest}
                disabled={isSending}
                className="px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSending ? (
                  <RotateCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>{isSending ? 'Enviando...' : 'Enviar'}</span>
              </button>

              {/* Save Request Button */}
              <button
                onClick={() => setShowSaveReqModal(true)}
                className={`p-2.5 rounded-2xl border transition-colors cursor-pointer ${
                  isDark ? 'border-[#262a36] hover:bg-[#151822] text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                }`}
                title="Guardar en Colección de Proyecto (.lummo)"
              >
                <Save className="w-4 h-4" />
              </button>
            </div>

            {/* MAIN API CLIENT CONTENT (Split Request Config & Response) */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-[#1e212b]">
              {/* LEFT 6 COLS: REQUEST BUILDER */}
              <div className="lg:col-span-6 flex flex-col min-h-0 overflow-hidden">
                {/* Request Tabs Header */}
                <div className={`flex items-center justify-between px-4 border-b shrink-0 ${
                  isDark ? 'border-[#1e212b] bg-[#12141c]' : 'border-slate-200 bg-slate-50'
                }`}>
                  <div className="flex space-x-2 py-2">
                    {[
                      { id: 'params', label: `Params (${queryParams.filter((p) => p.key).length})` },
                      { id: 'headers', label: `Headers (${headers.filter((h) => h.key).length})` },
                      { id: 'body', label: `Body ${bodyType !== 'none' ? `(${bodyType.toUpperCase()})` : ''}` },
                      { id: 'auth', label: `Auth ${authType !== 'none' ? `(${authType})` : ''}` },
                      { id: 'snippets', label: 'Code Snippets' }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setReqConfigTab(tab.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          reqConfigTab === tab.id
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Saved Collection Dropdown / Badge */}
                  {collections.length > 0 && (
                    <select
                      value={selectedReqName}
                      onChange={(e) => {
                        const item = collections.find((c) => c.name === e.target.value);
                        if (item) handleLoadCollectionRequest(item);
                      }}
                      className={`text-[11px] font-mono px-2.5 py-1 rounded-xl border outline-none ${
                        isDark ? 'bg-[#151822] border-[#262a36] text-slate-300' : 'bg-white border-slate-200'
                      }`}
                    >
                      <option value="">Colecciones ({collections.length})...</option>
                      {collections.map((c) => (
                        <option key={c.id || c.name} value={c.name}>
                          {c.method} • {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Request Tab Contents */}
                <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-4">
                  {/* TAB: PARAMS */}
                  {reqConfigTab === 'params' && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                        Query Parameters (URL)
                      </span>
                      {queryParams.map((param, idx) => (
                        <div key={idx} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={param.enabled}
                            onChange={(e) => {
                              const updated = [...queryParams];
                              updated[idx].enabled = e.target.checked;
                              setQueryParams(updated);
                            }}
                            className="rounded accent-blue-600 cursor-pointer"
                          />
                          <input
                            type="text"
                            placeholder="Clave (ej: page)"
                            value={param.key}
                            onChange={(e) => {
                              const updated = [...queryParams];
                              updated[idx].key = e.target.value;
                              setQueryParams(updated);
                            }}
                            className={`w-1/2 p-2 rounded-xl border text-xs font-mono font-semibold ${
                              isDark ? 'bg-[#151822] border-[#262a36] text-white' : 'bg-slate-50 border-slate-200'
                            }`}
                          />
                          <input
                            type="text"
                            placeholder="Valor (ej: 1)"
                            value={param.value}
                            onChange={(e) => {
                              const updated = [...queryParams];
                              updated[idx].value = e.target.value;
                              setQueryParams(updated);
                            }}
                            className={`flex-1 p-2 rounded-xl border text-xs font-mono ${
                              isDark ? 'bg-[#151822] border-[#262a36] text-white' : 'bg-slate-50 border-slate-200'
                            }`}
                          />
                          <button
                            onClick={() => setQueryParams(queryParams.filter((_, i) => i !== idx))}
                            className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => setQueryParams([...queryParams, { key: '', value: '', enabled: true }])}
                        className="text-xs text-blue-500 font-bold hover:text-blue-400 flex items-center space-x-1 pt-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Agregar Parámetro</span>
                      </button>
                    </div>
                  )}

                  {/* TAB: HEADERS */}
                  {reqConfigTab === 'headers' && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                        Cabeceras HTTP (Headers)
                      </span>
                      {headers.map((h, idx) => (
                        <div key={idx} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={h.enabled}
                            onChange={(e) => {
                              const updated = [...headers];
                              updated[idx].enabled = e.target.checked;
                              setHeaders(updated);
                            }}
                            className="rounded accent-blue-600 cursor-pointer"
                          />
                          <input
                            type="text"
                            placeholder="Header (ej: Authorization)"
                            value={h.key}
                            onChange={(e) => {
                              const updated = [...headers];
                              updated[idx].key = e.target.value;
                              setHeaders(updated);
                            }}
                            className={`w-1/2 p-2 rounded-xl border text-xs font-mono font-semibold ${
                              isDark ? 'bg-[#151822] border-[#262a36] text-white' : 'bg-slate-50 border-slate-200'
                            }`}
                          />
                          <input
                            type="text"
                            placeholder="Valor"
                            value={h.value}
                            onChange={(e) => {
                              const updated = [...headers];
                              updated[idx].value = e.target.value;
                              setHeaders(updated);
                            }}
                            className={`flex-1 p-2 rounded-xl border text-xs font-mono ${
                              isDark ? 'bg-[#151822] border-[#262a36] text-white' : 'bg-slate-50 border-slate-200'
                            }`}
                          />
                          <button
                            onClick={() => setHeaders(headers.filter((_, i) => i !== idx))}
                            className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => setHeaders([...headers, { key: '', value: '', enabled: true }])}
                        className="text-xs text-blue-500 font-bold hover:text-blue-400 flex items-center space-x-1 pt-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Agregar Header</span>
                      </button>
                    </div>
                  )}

                  {/* TAB: BODY */}
                  {reqConfigTab === 'body' && (
                    <div className="space-y-3">
                      {/* Body Type Selection */}
                      <div className="flex items-center space-x-3 pb-2 border-b border-white/5">
                        {['none', 'json', 'form', 'raw'].map((type) => (
                          <label key={type} className="flex items-center space-x-1.5 text-xs font-mono font-bold cursor-pointer">
                            <input
                              type="radio"
                              name="bodyType"
                              value={type}
                              checked={bodyType === type}
                              onChange={(e) => setBodyType(e.target.value)}
                              className="accent-blue-600"
                            />
                            <span className={bodyType === type ? 'text-blue-400' : 'text-slate-400'}>
                              {type.toUpperCase()}
                            </span>
                          </label>
                        ))}
                      </div>

                      {bodyType === 'json' && (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[11px] font-mono text-slate-400">JSON Payload</span>
                            <button
                              onClick={() => {
                                try {
                                  setJsonBody(JSON.stringify(JSON.parse(jsonBody), null, 2));
                                } catch (e) {}
                              }}
                              className="text-[11px] font-mono text-blue-400 hover:underline cursor-pointer"
                            >
                              Prettify JSON
                            </button>
                          </div>
                          <textarea
                            rows={12}
                            value={jsonBody}
                            onChange={(e) => setJsonBody(e.target.value)}
                            className={`w-full p-3 rounded-2xl font-mono text-xs focus:outline-none border ${
                              isDark ? 'bg-[#151822] border-[#262a36] text-emerald-400' : 'bg-slate-50 border-slate-200 text-slate-800'
                            }`}
                          />
                        </div>
                      )}

                      {bodyType === 'form' && (
                        <div className="space-y-2">
                          {formPairs.map((pair, idx) => (
                            <div key={idx} className="flex items-center space-x-2">
                              <input
                                type="text"
                                placeholder="Campo (Key)"
                                value={pair.key}
                                onChange={(e) => {
                                  const updated = [...formPairs];
                                  updated[idx].key = e.target.value;
                                  setFormPairs(updated);
                                }}
                                className={`w-1/2 p-2 rounded-xl border text-xs font-mono font-semibold ${
                                  isDark ? 'bg-[#151822] border-[#262a36] text-white' : 'bg-slate-50 border-slate-200'
                                }`}
                              />
                              <input
                                type="text"
                                placeholder="Valor (Value)"
                                value={pair.value}
                                onChange={(e) => {
                                  const updated = [...formPairs];
                                  updated[idx].value = e.target.value;
                                  setFormPairs(updated);
                                }}
                                className={`flex-1 p-2 rounded-xl border text-xs font-mono ${
                                  isDark ? 'bg-[#151822] border-[#262a36] text-white' : 'bg-slate-50 border-slate-200'
                                }`}
                              />
                              <button
                                onClick={() => setFormPairs(formPairs.filter((_, i) => i !== idx))}
                                className="p-1.5 text-slate-400 hover:text-rose-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => setFormPairs([...formPairs, { key: '', value: '', enabled: true }])}
                            className="text-xs text-blue-500 font-bold hover:text-blue-400 flex items-center space-x-1 pt-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Agregar Campo Form-Data</span>
                          </button>
                        </div>
                      )}

                      {bodyType === 'raw' && (
                        <textarea
                          rows={12}
                          value={rawBodyText}
                          onChange={(e) => setRawBodyText(e.target.value)}
                          placeholder="Raw data / XML / Text..."
                          className={`w-full p-3 rounded-2xl font-mono text-xs focus:outline-none border ${
                            isDark ? 'bg-[#151822] border-[#262a36] text-white' : 'bg-slate-50 border-slate-200'
                          }`}
                        />
                      )}
                    </div>
                  )}

                  {/* TAB: AUTH */}
                  {reqConfigTab === 'auth' && (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3 pb-2 border-b border-white/5">
                        {['none', 'bearer', 'basic'].map((type) => (
                          <label key={type} className="flex items-center space-x-1.5 text-xs font-mono font-bold cursor-pointer">
                            <input
                              type="radio"
                              name="authType"
                              value={type}
                              checked={authType === type}
                              onChange={(e) => setAuthType(e.target.value)}
                              className="accent-blue-600"
                            />
                            <span className={authType === type ? 'text-blue-400' : 'text-slate-400'}>
                              {type.toUpperCase()}
                            </span>
                          </label>
                        ))}
                      </div>

                      {authType === 'bearer' && (
                        <div className="space-y-2">
                          <label className="text-xs font-mono text-slate-400 font-bold block">Bearer Token</label>
                          <input
                            type="text"
                            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                            value={bearerToken}
                            onChange={(e) => setBearerToken(e.target.value)}
                            className={`w-full p-2.5 rounded-2xl border font-mono text-xs ${
                              isDark ? 'bg-[#151822] border-[#262a36] text-white' : 'bg-slate-50 border-slate-200'
                            }`}
                          />
                        </div>
                      )}

                      {authType === 'basic' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-mono text-slate-400 font-bold block">Username</label>
                            <input
                              type="text"
                              value={basicAuth.username}
                              onChange={(e) => setBasicAuth({ ...basicAuth, username: e.target.value })}
                              className={`w-full p-2.5 rounded-2xl border font-mono text-xs ${
                                isDark ? 'bg-[#151822] border-[#262a36] text-white' : 'bg-slate-50 border-slate-200'
                              }`}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-mono text-slate-400 font-bold block">Password</label>
                            <input
                              type="password"
                              value={basicAuth.password}
                              onChange={(e) => setBasicAuth({ ...basicAuth, password: e.target.value })}
                              className={`w-full p-2.5 rounded-2xl border font-mono text-xs ${
                                isDark ? 'bg-[#151822] border-[#262a36] text-white' : 'bg-slate-50 border-slate-200'
                              }`}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB: CODE SNIPPETS */}
                  {reqConfigTab === 'snippets' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex space-x-1.5">
                          {['fetch', 'axios', 'curl', 'python'].map((lang) => (
                            <button
                              key={lang}
                              onClick={() => setSnippetLang(lang)}
                              className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                                snippetLang === lang
                                  ? 'bg-blue-600 text-white'
                                  : 'text-slate-400 hover:text-white bg-white/5'
                              }`}
                            >
                              {lang.toUpperCase()}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(generatedSnippet);
                            setSnippetCopied(true);
                            setTimeout(() => setSnippetCopied(false), 2000);
                          }}
                          className="px-3 py-1 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-mono font-bold flex items-center space-x-1.5 hover:bg-blue-500/20 cursor-pointer"
                        >
                          {snippetCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{snippetCopied ? '¡Copiado!' : 'Copiar Código'}</span>
                        </button>
                      </div>
                      <pre className={`p-4 rounded-2xl border font-mono text-xs overflow-x-auto ${
                        isDark ? 'bg-[#151822] border-[#262a36] text-slate-300' : 'bg-slate-100 border-slate-200'
                      }`}>
                        <code>{generatedSnippet}</code>
                      </pre>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT 6 COLS: RESPONSE VIEWER */}
              <div className="lg:col-span-6 flex flex-col min-h-0 overflow-hidden">
                {/* Response Header Bar */}
                <div className={`flex items-center justify-between px-4 py-2.5 border-b shrink-0 ${
                  isDark ? 'border-[#1e212b] bg-[#12141c]' : 'border-slate-200 bg-slate-50'
                }`}>
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                      Respuesta (Response)
                    </span>
                    {apiResponse && getStatusBadge(apiResponse.status)}
                  </div>

                  {apiResponse && (
                    <div className="flex items-center space-x-3 text-xs font-mono text-slate-400 font-semibold">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-blue-400" /> {apiResponse.durationMs} ms
                      </span>
                      {apiResponse.sizeBytes !== undefined && (
                        <span className="flex items-center gap-1">
                          <HardDrive className="w-3.5 h-3.5 text-purple-400" /> {(apiResponse.sizeBytes / 1024).toFixed(1)} KB
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Response Body / Headers Tabs */}
                {apiResponse ? (
                  <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 shrink-0">
                      <div className="flex space-x-2">
                        {['body', 'headers', 'cookies'].map((t) => (
                          <button
                            key={t}
                            onClick={() => setRespTab(t)}
                            className={`px-3 py-1 rounded-xl text-xs font-mono font-bold cursor-pointer ${
                              respTab === t ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {t.toUpperCase()}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={() => {
                          const val = typeof apiResponse.body === 'object' ? JSON.stringify(apiResponse.body, null, 2) : String(apiResponse.rawBody || '');
                          navigator.clipboard.writeText(val);
                          setCopiedResp(true);
                          setTimeout(() => setCopiedResp(false), 2000);
                        }}
                        className="text-xs font-mono text-slate-400 hover:text-white flex items-center space-x-1 cursor-pointer"
                      >
                        {copiedResp ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedResp ? '¡Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>

                    <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                      {respTab === 'body' && (
                        <pre className="font-mono text-xs text-emerald-400 whitespace-pre-wrap select-text">
                          {typeof apiResponse.body === 'object'
                            ? JSON.stringify(apiResponse.body, null, 2)
                            : String(apiResponse.rawBody || apiResponse.error || 'Respuesta vacía')}
                        </pre>
                      )}

                      {respTab === 'headers' && (
                        <div className="space-y-1 font-mono text-xs">
                          {Object.entries(apiResponse.headers || {}).map(([k, v]) => (
                            <div key={k} className="flex py-1 border-b border-white/5">
                              <span className="w-1/3 text-blue-400 font-bold truncate">{k}:</span>
                              <span className="flex-1 text-slate-300 break-all">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {respTab === 'cookies' && (
                        <div className="space-y-2 font-mono text-xs">
                          {(apiResponse.cookies || []).length > 0 ? (
                            apiResponse.cookies.map((c, i) => (
                              <div key={i} className="p-2 rounded-xl bg-white/5 text-slate-300 break-all">
                                {c}
                              </div>
                            ))
                          ) : (
                            <p className="text-slate-500">No se recibieron cookies en esta respuesta.</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
                    <Send className="w-12 h-12 stroke-[1.2] mb-3 text-slate-600" />
                    <h4 className="font-bold text-sm text-slate-400">Sin Respuesta Aún</h4>
                    <p className="text-xs max-w-xs mt-1">
                      Configura los parámetros a la izquierda y presiona <strong>"Enviar"</strong> para inspeccionar la respuesta local.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* --- TAB 2: 🪝 LIVE WEBHOOK INSPECTOR & REPLAY HUB --- */}
        {/* ========================================================= */}
        {activeMainTab === 'webhook-inspector' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Top Webhook Control Bar */}
            <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${
              isDark ? 'border-[#1e212b] bg-[#0c0d12]' : 'border-slate-200 bg-white'
            }`}>
              {/* Left: Tunnel Status & Live Indicator */}
              <div className="flex items-center space-x-3">
                {tunnelUrl ? (
                  <div className="flex items-center space-x-2 px-3 py-1.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>TÚNEL ACTIVO:</span>
                    <a href={tunnelUrl} target="_blank" rel="noreferrer" className="underline hover:text-white">
                      {tunnelUrl}
                    </a>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono text-amber-400 font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" /> Túnel público no iniciado
                    </span>
                    {onStartTunnel && (
                      <button
                        onClick={onStartTunnel}
                        className="px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-md shadow-blue-600/20"
                      >
                        Iniciar Túnel Ahora
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Right: Actions (Mock Generator, Clear) */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowMockModal(true)}
                  className="px-4 py-2 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-purple-600/20 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Simular Webhook Mock</span>
                </button>

                <button
                  onClick={handleClearWebhookHistory}
                  className={`p-2 rounded-2xl border transition-colors cursor-pointer ${
                    isDark ? 'border-[#262a36] hover:bg-[#151822] text-slate-400 hover:text-rose-400' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                  }`}
                  title="Limpiar Historial de Webhooks"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* SPLIT SCREEN: FEED (Left 4 cols) & DEEP INSPECTOR (Right 8 cols) */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-[#1e212b]">
              
              {/* LEFT 4 COLS: TRAFFIC FEED LIST */}
              <div className="lg:col-span-4 flex flex-col min-h-0 overflow-hidden">
                {/* Search & Filter Bar */}
                <div className={`p-3 border-b space-y-2 shrink-0 ${
                  isDark ? 'border-[#1e212b] bg-[#12141c]' : 'border-slate-200 bg-slate-50'
                }`}>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Buscar por ruta o payload..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-full pl-9 pr-3 py-1.5 rounded-xl border text-xs font-mono focus:outline-none ${
                        isDark ? 'bg-[#181a24] border-[#262a36] text-white' : 'bg-white border-slate-200'
                      }`}
                    />
                  </div>

                  {/* Filter Pills */}
                  <div className="flex space-x-1">
                    {[
                      { id: 'all', label: `Todos (${webhookEvents.length})` },
                      { id: '2xx', label: '2xx OK' },
                      { id: 'errors', label: 'Errores' },
                      { id: 'replays', label: 'Replays' }
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setWebhookFilter(f.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                          webhookFilter === f.id
                            ? 'bg-purple-600 text-white'
                            : 'text-slate-400 hover:text-white bg-white/5'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Events Feed Scroll */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1.5">
                  {filteredWebhookEvents.length > 0 ? (
                    filteredWebhookEvents.map((ev) => {
                      const isSelected = ev.id === (activeWebhookEvent?.id || selectedEventId);
                      return (
                        <div
                          key={ev.id}
                          onClick={() => setSelectedEventId(ev.id)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer space-y-1.5 ${
                            isSelected
                              ? 'bg-purple-500/10 border-purple-500/40 shadow-sm'
                              : isDark ? 'bg-[#12141c] border-[#1f222e] hover:border-[#2f3346]' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-black border ${getMethodBadgeColor(ev.method)}`}>
                                {ev.method}
                              </span>
                              <span className="font-mono text-xs font-bold text-white truncate max-w-[140px]">
                                {ev.path || ev.url}
                              </span>
                            </div>
                            {getStatusBadge(ev.statusCode)}
                          </div>

                          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-500" /> {ev.durationMs}ms
                            </span>
                            {ev.isReplay && (
                              <span className="text-[10px] text-purple-400 font-bold px-1.5 py-0.2 rounded bg-purple-500/20 border border-purple-500/30">
                                REPLAY
                              </span>
                            )}
                            <span>{new Date(ev.timestamp).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-8 text-center text-slate-500 space-y-2">
                      <Radio className="w-8 h-8 stroke-[1.2] mx-auto text-slate-600" />
                      <p className="text-xs">No hay webhooks registrados aún.</p>
                      <p className="text-[11px] text-slate-600">
                        Usa el botón "Simular Webhook Mock" para probar Stripe o GitHub al instante.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT 8 COLS: DEEP WEBHOOK INSPECTOR & REPLAY ACTION */}
              <div className="lg:col-span-8 flex flex-col min-h-0 overflow-hidden">
                {activeWebhookEvent ? (
                  <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    {/* Header Action Bar */}
                    <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${
                      isDark ? 'border-[#1e212b] bg-[#12141c]' : 'border-slate-200 bg-slate-50'
                    }`}>
                      <div className="flex items-center space-x-3">
                        <span className={`px-2.5 py-1 rounded-xl font-mono text-xs font-black border ${getMethodBadgeColor(activeWebhookEvent.method)}`}>
                          {activeWebhookEvent.method}
                        </span>
                        <div>
                          <h3 className="font-mono text-xs font-bold text-white">
                            {activeWebhookEvent.path || activeWebhookEvent.url}
                          </h3>
                          <span className="text-[11px] font-mono text-slate-400">
                            Origen: {activeWebhookEvent.clientIp} • {new Date(activeWebhookEvent.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Replay & Copy cURL Buttons */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleReplayWebhook(activeWebhookEvent)}
                          disabled={isReplaying}
                          className="px-4 py-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-purple-600/20 cursor-pointer disabled:opacity-50"
                        >
                          <RotateCw className={`w-3.5 h-3.5 ${isReplaying ? 'animate-spin' : ''}`} />
                          <span>{isReplaying ? 'Reenviando...' : 'Replay Webhook'}</span>
                        </button>

                        <button
                          onClick={() => {
                            const curl = `curl -X ${activeWebhookEvent.method} "http://localhost:${port}${activeWebhookEvent.path}" \\\n` +
                              Object.entries(activeWebhookEvent.headers || {}).map(([k, v]) => `  -H "${k}: ${v}"`).join(' \\\n') +
                              (activeWebhookEvent.rawBody ? ` \\\n  -d '${activeWebhookEvent.rawBody}'` : '');
                            navigator.clipboard.writeText(curl);
                            alert('¡Comando cURL copiado al portapapeles!');
                          }}
                          className={`p-2 rounded-2xl border transition-colors cursor-pointer ${
                            isDark ? 'border-[#262a36] hover:bg-[#151822] text-slate-300' : 'border-slate-200 hover:bg-slate-100'
                          }`}
                          title="Copiar como cURL"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {replaySuccessMsg && (
                      <div className="px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-400 font-mono text-xs font-bold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" /> {replaySuccessMsg}
                      </div>
                    )}

                    {/* Split Inspection View: Request Body & Headers vs Server Response */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#1e212b] overflow-hidden min-h-0">
                      
                      {/* Left: Incoming Request Payload & Headers */}
                      <div className="p-4 flex flex-col min-h-0 overflow-hidden space-y-3">
                        <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                          📥 Payload & Headers Entrantes
                        </span>

                        {/* Incoming Headers Collapsible */}
                        <div className="space-y-1 font-mono text-[11px] max-h-36 overflow-y-auto custom-scrollbar p-2.5 rounded-xl bg-black/20 border border-white/5">
                          {Object.entries(activeWebhookEvent.headers || {}).map(([k, v]) => (
                            <div key={k} className="flex">
                              <span className="text-purple-400 font-bold mr-2">{k}:</span>
                              <span className="text-slate-300 truncate">{String(v)}</span>
                            </div>
                          ))}
                        </div>

                        {/* Incoming JSON Body */}
                        <div className="flex-1 flex flex-col min-h-0 overflow-hidden space-y-1">
                          <span className="text-[11px] font-mono text-slate-400">Cuerpo de la Petición (Request Body)</span>
                          <pre className="flex-1 p-3 rounded-2xl border font-mono text-xs overflow-y-auto custom-scrollbar bg-[#12141c] border-[#1e212b] text-emerald-400 select-text">
                            {typeof activeWebhookEvent.body === 'object'
                              ? JSON.stringify(activeWebhookEvent.body, null, 2)
                              : String(activeWebhookEvent.rawBody || 'Sin cuerpo')}
                          </pre>
                        </div>
                      </div>

                      {/* Right: Local Server Response */}
                      <div className="p-4 flex flex-col min-h-0 overflow-hidden space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                            📤 Respuesta de tu Servidor
                          </span>
                          {getStatusBadge(activeWebhookEvent.statusCode)}
                        </div>

                        {/* Response Headers */}
                        <div className="space-y-1 font-mono text-[11px] max-h-36 overflow-y-auto custom-scrollbar p-2.5 rounded-xl bg-black/20 border border-white/5">
                          {Object.entries(activeWebhookEvent.responseHeaders || {}).map(([k, v]) => (
                            <div key={k} className="flex">
                              <span className="text-blue-400 font-bold mr-2">{k}:</span>
                              <span className="text-slate-300 truncate">{String(v)}</span>
                            </div>
                          ))}
                        </div>

                        {/* Response Body */}
                        <div className="flex-1 flex flex-col min-h-0 overflow-hidden space-y-1">
                          <span className="text-[11px] font-mono text-slate-400">Cuerpo de Respuesta (Response Body)</span>
                          <pre className="flex-1 p-3 rounded-2xl border font-mono text-xs overflow-y-auto custom-scrollbar bg-[#12141c] border-[#1e212b] text-slate-300 select-text">
                            {typeof activeWebhookEvent.responseBody === 'object'
                              ? JSON.stringify(activeWebhookEvent.responseBody, null, 2)
                              : String(activeWebhookEvent.responseBody || 'Respuesta vacía del servidor')}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
                    <Radio className="w-12 h-12 stroke-[1.2] mb-3 text-slate-600" />
                    <h4 className="font-bold text-sm text-slate-400">Selecciona un Webhook</h4>
                    <p className="text-xs max-w-xs mt-1">
                      Elige cualquier evento de la lista izquierda para inspeccionar sus cabeceras y hacer Replay.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* --- MODAL DIALOG: MOCK WEBHOOK GENERATOR --- */}
        {/* ==================================================== */}
        <AnimatePresence>
          {showMockModal && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`w-full max-w-2xl rounded-3xl border p-6 space-y-4 shadow-2xl ${
                  isDark ? 'bg-[#151822] border-[#2b3040] text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between border-b pb-3 border-white/5">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    <h3 className="font-extrabold text-base">Simular Webhook Mock</h3>
                  </div>
                  <button onClick={() => setShowMockModal(false)} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Templates Selector */}
                <div className="space-y-1">
                  <label className="text-xs font-mono font-bold text-slate-400">Plantilla Preconfigurada</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(mockTemplates).map(([k, t]) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => handleSelectMockTemplate(k)}
                        className={`p-2.5 rounded-xl border text-left text-xs font-mono transition-all cursor-pointer ${
                          selectedMockKey === k
                            ? 'bg-purple-600 text-white border-purple-500 font-bold'
                            : isDark ? 'bg-[#1e2230] border-[#2a2f42] text-slate-300' : 'bg-slate-100 border-slate-200'
                        }`}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target Endpoint */}
                <div className="space-y-1">
                  <label className="text-xs font-mono font-bold text-slate-400">Ruta de Destino (Endpoint)</label>
                  <input
                    type="text"
                    value={mockEndpoint}
                    onChange={(e) => setMockEndpoint(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border font-mono text-xs ${
                      isDark ? 'bg-[#1e2230] border-[#2a2f42] text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>

                {/* Payload Editor */}
                <div className="space-y-1">
                  <label className="text-xs font-mono font-bold text-slate-400">Payload JSON</label>
                  <textarea
                    rows={6}
                    value={mockPayloadText}
                    onChange={(e) => setMockPayloadText(e.target.value)}
                    className={`w-full p-3 rounded-2xl border font-mono text-xs text-emerald-400 focus:outline-none ${
                      isDark ? 'bg-[#12141c] border-[#1e212b]' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    onClick={() => setShowMockModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDispatchMockWebhook}
                    disabled={isSendingMock}
                    className="px-5 py-2 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-purple-600/20 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Disparar Webhook</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ==================================================== */}
        {/* --- MODAL DIALOG: SAVE TO COLLECTION --- */}
        {/* ==================================================== */}
        <AnimatePresence>
          {showSaveReqModal && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`w-full max-w-md rounded-3xl border p-6 space-y-4 shadow-2xl ${
                  isDark ? 'bg-[#151822] border-[#2b3040] text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between border-b pb-3 border-white/5">
                  <h3 className="font-extrabold text-base">Guardar Petición en Colección</h3>
                  <button onClick={() => setShowSaveReqModal(false)} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono font-bold text-slate-400">Nombre de la Petición</label>
                  <input
                    type="text"
                    placeholder="Ej: Login Usuario / Get Products"
                    value={reqSaveName}
                    onChange={(e) => setReqSaveName(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border font-mono text-xs ${
                      isDark ? 'bg-[#1e2230] border-[#2a2f42] text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                  <p className="text-[11px] text-slate-500 pt-1">
                    Se guardará en <code>.lummo/api-collections.json</code> dentro de tu repositorio.
                  </p>
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    onClick={() => setShowSaveReqModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveCollectionRequest}
                    className="px-5 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-md shadow-blue-600/20"
                  >
                    Guardar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
