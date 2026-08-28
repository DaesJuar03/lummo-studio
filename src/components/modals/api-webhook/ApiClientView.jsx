import React, { useState, useEffect } from 'react';
import { 
  Send, 
  RotateCw, 
  Save, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  Clock, 
  HardDrive, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle 
} from 'lucide-react';
import useClipboard from '../../../hooks/useClipboard';

export default function ApiClientView({
  port,
  theme,
  collections = [],
  onSaveCollectionRequest
}) {
  const isDark = theme === 'dark';

  // Request state
  const [method, setMethod] = useState('GET');
  const [endpoint, setEndpoint] = useState(() => `http://localhost:${port || 3000}/api`);
  const [isSending, setIsSending] = useState(false);

  // Request Config Tabs: 'params' | 'headers' | 'body' | 'auth' | 'snippets'
  const [reqConfigTab, setReqConfigTab] = useState('params');
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
  const { copied: copiedResp, copyToClipboard: copyResp } = useClipboard();

  // Collections State
  const [selectedReqName, setSelectedReqName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [reqSaveName, setReqSaveName] = useState('');

  // Code Snippet Generator
  const [snippetLang, setSnippetLang] = useState('fetch'); // 'fetch' | 'axios' | 'curl' | 'python'
  const { copied: snippetCopied, copyToClipboard: copySnippet } = useClipboard();

  useEffect(() => {
    if (port) {
      setEndpoint(`http://localhost:${port}/api`);
    }
  }, [port]);

  const handleSendRequest = async () => {
    setIsSending(true);
    setApiResponse(null);

    const activeParams = {};
    queryParams.forEach((p) => {
      if (p.enabled && p.key) activeParams[p.key] = p.value;
    });

    const activeHeaders = {};
    headers.forEach((h) => {
      if (h.enabled && h.key) activeHeaders[h.key] = h.value;
    });

    if (authType === 'bearer' && bearerToken) {
      activeHeaders['Authorization'] = `Bearer ${bearerToken}`;
    } else if (authType === 'basic' && (basicAuth.username || basicAuth.password)) {
      const creds = btoa(`${basicAuth.username}:${basicAuth.password}`);
      activeHeaders['Authorization'] = `Basic ${creds}`;
    }

    let payloadBody = null;
    if (method !== 'GET' && method !== 'HEAD') {
      if (bodyType === 'json') {
        try {
          payloadBody = jsonBody ? JSON.parse(jsonBody) : null;
        } catch (_e) {
          payloadBody = jsonBody;
        }
      } else if (bodyType === 'form') {
        const formData = {};
        formPairs.forEach((p) => {
          if (p.enabled && p.key) formData[p.key] = p.value;
        });
        payloadBody = formData;
      } else if (bodyType === 'raw') {
        payloadBody = rawBodyText;
      }
    }

    try {
      if (window.electronAPI?.apiClient?.sendRequest) {
        const result = await window.electronAPI.apiClient.sendRequest({
          method,
          url: endpoint,
          headers: activeHeaders,
          params: activeParams,
          body: payloadBody,
          bodyType
        });
        setApiResponse(result);
      } else {
        const res = await fetch(endpoint, {
          method,
          headers: activeHeaders
        });
        const data = await res.json().catch(() => ({}));
        setApiResponse({
          status: res.status,
          durationMs: 45,
          body: data
        });
      }
    } catch (err) {
      setApiResponse({
        status: 500,
        error: err.message,
        durationMs: 0
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleLoadCollectionRequest = (item) => {
    setSelectedReqName(item.name);
    setMethod(item.method || 'GET');
    setEndpoint(item.url || '');
    if (item.params) setQueryParams(item.params);
    if (item.headers) setHeaders(item.headers);
    if (item.body) {
      setBodyType(item.bodyType || 'json');
      if (typeof item.body === 'object') {
        setJsonBody(JSON.stringify(item.body, null, 2));
      } else {
        setRawBodyText(String(item.body));
      }
    }
  };

  const handleSaveCollectionSubmit = () => {
    if (!reqSaveName.trim()) return;
    const item = {
      id: 'req-' + Date.now(),
      name: reqSaveName.trim(),
      method,
      url: endpoint,
      params: queryParams,
      headers,
      body: bodyType === 'json' ? jsonBody : rawBodyText,
      bodyType
    };
    if (onSaveCollectionRequest) onSaveCollectionRequest(item);
    setShowSaveModal(false);
    setReqSaveName('');
    setSelectedReqName(item.name);
  };

  const getGeneratedSnippet = () => {
    if (snippetLang === 'curl') {
      let cmd = `curl -X ${method} "${endpoint}"`;
      headers.forEach((h) => {
        if (h.enabled && h.key) cmd += ` \\\n  -H "${h.key}: ${h.value}"`;
      });
      if (bodyType === 'json' && jsonBody) {
        cmd += ` \\\n  -d '${jsonBody.replace(/\n/g, '')}'`;
      }
      return cmd;
    }
    if (snippetLang === 'fetch') {
      return `fetch("${endpoint}", {\n  method: "${method}",\n  headers: ${JSON.stringify(headers.filter(h => h.enabled && h.key).reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {}), null, 4)},\n  body: ${bodyType === 'json' ? jsonBody : 'null'}\n})\n  .then(res => res.json())\n  .then(data => console.log(data));`;
    }
    if (snippetLang === 'axios') {
      return `import axios from 'axios';\n\nconst response = await axios({\n  method: '${method.toLowerCase()}',\n  url: '${endpoint}',\n  headers: ${JSON.stringify(headers.filter(h => h.enabled && h.key).reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {}), null, 4)},\n  data: ${bodyType === 'json' ? jsonBody : 'null'}\n});\nconsole.log(response.data);`;
    }
    if (snippetLang === 'python') {
      return `import requests\n\nurl = "${endpoint}"\nheaders = ${JSON.stringify(headers.filter(h => h.enabled && h.key).reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {}), null, 4)}\npayload = ${bodyType === 'json' ? jsonBody : 'None'}\n\nresponse = requests.request("${method}", url, headers=headers, json=payload)\nprint(response.json())`;
    }
    return '';
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

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* REQUEST ADDRESS BAR */}
      <div className={`p-4 border-b flex items-center gap-3 shrink-0 ${
        isDark ? 'border-[rgba(255, 255, 255, 0.08)] bg-[#141414]' : 'border-slate-200 bg-white'
      }`}>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className={`px-3 py-2.5 rounded-2xl font-mono font-black text-xs border outline-none cursor-pointer ${
            getMethodBadgeColor(method)
          } ${isDark ? 'bg-[#1E1E1E]' : 'bg-slate-100'}`}
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
          <option value="DELETE">DELETE</option>
          <option value="HEAD">HEAD</option>
          <option value="OPTIONS">OPTIONS</option>
        </select>

        <div className="flex-1 relative">
          <input
            type="text"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder={`http://localhost:${port}/api/v1/users`}
            className={`w-full px-4 py-2.5 rounded-2xl border font-mono text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
              isDark ? 'bg-[#1E1E1E] border-[rgba(255, 255, 255, 0.08)] text-white' : 'bg-slate-100 border-slate-200 text-slate-900'
            }`}
          />
        </div>

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

        <button
          onClick={() => setShowSaveModal(true)}
          className={`p-2.5 rounded-2xl border transition-colors cursor-pointer ${
            isDark ? 'border-[rgba(255, 255, 255, 0.08)] hover:bg-[#1E1E1E] text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
          }`}
          title="Guardar en Colección de Proyecto (.lummo)"
        >
          <Save className="w-4 h-4" />
        </button>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-4 ${
            isDark ? 'bg-[#1E1E1E] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <h3 className="font-extrabold text-sm">Guardar Petición en Colección</h3>
            <input
              type="text"
              placeholder="Nombre descriptivo (ej: Get Users List)"
              value={reqSaveName}
              onChange={(e) => setReqSaveName(e.target.value)}
              className={`w-full p-3 rounded-2xl border text-xs font-mono outline-none ${
                isDark ? 'bg-[#181818] border-[rgba(255, 255, 255, 0.08)]' : 'bg-slate-50 border-slate-200'
              }`}
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveCollectionSubmit}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN API CLIENT CONTENT (Split Request Config & Response) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-[rgba(255, 255, 255, 0.08)]">
        {/* LEFT 6 COLS: REQUEST BUILDER */}
        <div className="lg:col-span-6 flex flex-col min-h-0 overflow-hidden">
          <div className={`flex items-center justify-between px-4 border-b shrink-0 ${
            isDark ? 'border-[rgba(255, 255, 255, 0.08)] bg-[#181818]' : 'border-slate-200 bg-slate-50'
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

            {collections.length > 0 && (
              <select
                value={selectedReqName}
                onChange={(e) => {
                  const item = collections.find((c) => c.name === e.target.value);
                  if (item) handleLoadCollectionRequest(item);
                }}
                className={`text-[11px] font-mono px-2.5 py-1 rounded-xl border outline-none ${
                  isDark ? 'bg-[#1E1E1E] border-[rgba(255, 255, 255, 0.08)] text-slate-300' : 'bg-white border-slate-200'
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
                        isDark ? 'bg-[#1E1E1E] border-[rgba(255, 255, 255, 0.08)] text-white' : 'bg-slate-50 border-slate-200'
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
                        isDark ? 'bg-[#1E1E1E] border-[rgba(255, 255, 255, 0.08)] text-white' : 'bg-slate-50 border-slate-200'
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
                        isDark ? 'bg-[#1E1E1E] border-[rgba(255, 255, 255, 0.08)] text-white' : 'bg-slate-50 border-slate-200'
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
                        isDark ? 'bg-[#1E1E1E] border-[rgba(255, 255, 255, 0.08)] text-white' : 'bg-slate-50 border-slate-200'
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
                          } catch (_e) {}
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
                        isDark ? 'bg-[#1E1E1E] border-[rgba(255, 255, 255, 0.08)] text-emerald-400' : 'bg-slate-50 border-slate-200 text-slate-800'
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
                            isDark ? 'bg-[#1E1E1E] border-[rgba(255, 255, 255, 0.08)] text-white' : 'bg-slate-50 border-slate-200'
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
                            isDark ? 'bg-[#1E1E1E] border-[rgba(255, 255, 255, 0.08)] text-white' : 'bg-slate-50 border-slate-200'
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
                      isDark ? 'bg-[#1E1E1E] border-[rgba(255, 255, 255, 0.08)] text-white' : 'bg-slate-50 border-slate-200'
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
                        isDark ? 'bg-[#1E1E1E] border-[rgba(255, 255, 255, 0.08)] text-white' : 'bg-slate-50 border-slate-200'
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
                          isDark ? 'bg-[#1E1E1E] border-[rgba(255, 255, 255, 0.08)] text-white' : 'bg-slate-50 border-slate-200'
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
                          isDark ? 'bg-[#1E1E1E] border-[rgba(255, 255, 255, 0.08)] text-white' : 'bg-slate-50 border-slate-200'
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
                    onClick={() => copySnippet(getGeneratedSnippet())}
                    className="px-3 py-1 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-mono font-bold flex items-center space-x-1.5 hover:bg-blue-500/20 cursor-pointer"
                  >
                    {snippetCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{snippetCopied ? '¡Copiado!' : 'Copiar Código'}</span>
                  </button>
                </div>
                <pre className={`p-4 rounded-2xl border font-mono text-xs overflow-x-auto ${
                  isDark ? 'bg-[#1E1E1E] border-[rgba(255, 255, 255, 0.08)] text-slate-300' : 'bg-slate-100 border-slate-200'
                }`}>
                  <code>{getGeneratedSnippet()}</code>
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT 6 COLS: RESPONSE VIEWER */}
        <div className="lg:col-span-6 flex flex-col min-h-0 overflow-hidden">
          <div className={`flex items-center justify-between px-4 py-2.5 border-b shrink-0 ${
            isDark ? 'border-[rgba(255, 255, 255, 0.08)] bg-[#181818]' : 'border-slate-200 bg-slate-50'
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
                    copyResp(val);
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
  );
}
