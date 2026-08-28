import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radio, 
  RotateCw, 
  Trash2, 
  Search, 
  Sparkles, 
  Copy, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  X, 
  Send 
} from 'lucide-react';
import useClipboard from '../../../hooks/useClipboard';
import { getTranslations } from '../../../locales';

export default function WebhookInspectorView({
  port,
  tunnelUrl,
  onStartTunnel,
  theme,
  language = 'es',
  webhookEvents = [],
  onClearEvents,
  onReplayEvent,
  onSendMock
}) {
  const isDark = theme === 'dark';
  const t = getTranslations(language);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [webhookFilter, setWebhookFilter] = useState('all'); // 'all' | '2xx' | 'errors' | 'replays'
  const [searchQuery, setSearchQuery] = useState('');
  const [isReplaying, setIsReplaying] = useState(false);
  const [replaySuccessMsg, setReplaySuccessMsg] = useState('');
  const { copyToClipboard } = useClipboard();

  // Mock modal
  const [showMockModal, setShowMockModal] = useState(false);
  const [mockTemplates, setMockTemplates] = useState({});
  const [selectedMockKey, setSelectedMockKey] = useState('stripe_payment_success');
  const [mockEndpoint, setMockEndpoint] = useState('/api/webhooks/stripe');
  const [mockPayloadText, setMockPayloadText] = useState('');
  const [mockHeadersText, setMockHeadersText] = useState('');
  const [isSendingMock, setIsSendingMock] = useState(false);

  React.useEffect(() => {
    if (window.electronAPI?.webhookInspector?.getMockTemplates) {
      window.electronAPI.webhookInspector.getMockTemplates().then((tmpl) => {
        if (tmpl && typeof tmpl === 'object') {
          setMockTemplates(tmpl);
          const firstKey = Object.keys(tmpl)[0] || 'stripe_payment_success';
          setSelectedMockKey(firstKey);
          if (tmpl[firstKey]) {
            setMockEndpoint(tmpl[firstKey].defaultEndpoint || '/api/webhooks/stripe');
            setMockPayloadText(JSON.stringify(tmpl[firstKey].payload || {}, null, 2));
            setMockHeadersText(JSON.stringify(tmpl[firstKey].headers || {}, null, 2));
          }
        }
      });
    }
  }, []);

  const filteredWebhookEvents = useMemo(() => {
    return webhookEvents.filter((ev) => {
      if (webhookFilter === '2xx' && (ev.statusCode < 200 || ev.statusCode >= 300)) return false;
      if (webhookFilter === 'errors' && ev.statusCode < 400) return false;
      if (webhookFilter === 'replays' && !ev.isReplay) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const pathStr = (ev.path || ev.url || '').toLowerCase();
        const bodyStr = typeof ev.body === 'object' ? JSON.stringify(ev.body).toLowerCase() : String(ev.rawBody || '').toLowerCase();
        return pathStr.includes(q) || bodyStr.includes(q);
      }
      return true;
    });
  }, [webhookEvents, webhookFilter, searchQuery]);

  const activeWebhookEvent = useMemo(() => {
    return webhookEvents.find((e) => e.id === selectedEventId) || webhookEvents[0] || null;
  }, [webhookEvents, selectedEventId]);

  const handleReplay = async (eventObj) => {
    if (!eventObj) return;
    setIsReplaying(true);
    setReplaySuccessMsg('');
    if (onReplayEvent) {
      const res = await onReplayEvent(eventObj);
      if (res?.success) {
        setReplaySuccessMsg(language === 'es' ? '¡Petición reenviada con éxito al servidor local!' : 'Request replayed successfully to local server!');
      } else {
        setReplaySuccessMsg(language === 'es' ? `Error al reenviar: ${res?.error || 'Fallo de conexión'}` : `Replay error: ${res?.error || 'Connection failed'}`);
      }
    }
    setIsReplaying(false);
    setTimeout(() => setReplaySuccessMsg(''), 3500);
  };

  const handleSelectMockTemplate = (key) => {
    setSelectedMockKey(key);
    const tmpl = mockTemplates[key];
    if (tmpl) {
      setMockEndpoint(tmpl.defaultEndpoint || '/api/webhooks/stripe');
      setMockPayloadText(JSON.stringify(tmpl.payload || {}, null, 2));
      setMockHeadersText(JSON.stringify(tmpl.headers || {}, null, 2));
    }
  };

  const handleDispatchMock = async () => {
    setIsSendingMock(true);
    let parsedPayload = {};
    let parsedHeaders = {};
    try {
      parsedPayload = mockPayloadText ? JSON.parse(mockPayloadText) : {};
      parsedHeaders = mockHeadersText ? JSON.parse(mockHeadersText) : {};
    } catch (_e) {
      alert(language === 'es' ? 'Error de sintaxis JSON en el Payload o Headers' : 'JSON syntax error in Payload or Headers');
      setIsSendingMock(false);
      return;
    }

    if (onSendMock) {
      await onSendMock({
        endpoint: mockEndpoint,
        headers: parsedHeaders,
        payload: parsedPayload
      });
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

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Top Webhook Control Bar */}
      <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${
        isDark ? 'border-[rgba(255, 255, 255, 0.08)] bg-[#141414]' : 'border-slate-200 bg-white'
      }`}>
        <div className="flex items-center space-x-3">
          {tunnelUrl ? (
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{language === 'es' ? 'TÚNEL ACTIVO:' : 'ACTIVE TUNNEL:'}</span>
              <a href={tunnelUrl} target="_blank" rel="noreferrer" className="underline hover:text-white">
                {tunnelUrl}
              </a>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono text-amber-400 font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> {language === 'es' ? 'Túnel público no iniciado' : 'Public tunnel not running'}
              </span>
              {onStartTunnel && (
                <button
                  onClick={onStartTunnel}
                  className="px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-md shadow-blue-600/20"
                >
                  {language === 'es' ? 'Iniciar Túnel Ahora' : 'Start Tunnel Now'}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowMockModal(true)}
            className="px-4 py-2 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-purple-600/20 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>{language === 'es' ? 'Simular Webhook Mock' : 'Simulate Mock Webhook'}</span>
          </button>

          <button
            onClick={onClearEvents}
            className={`p-2 rounded-2xl border transition-colors cursor-pointer ${
              isDark ? 'border-[rgba(255, 255, 255, 0.08)] hover:bg-[#1E1E1E] text-slate-400 hover:text-rose-400' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
            }`}
            title={language === 'es' ? "Limpiar Historial de Webhooks" : "Clear Webhook History"}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Split Feed & Inspector */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-[rgba(255, 255, 255, 0.08)]">
        {/* LEFT 4 COLS: TRAFFIC FEED LIST */}
        <div className="lg:col-span-4 flex flex-col min-h-0 overflow-hidden">
          <div className={`p-3 border-b space-y-2 shrink-0 ${
            isDark ? 'border-[rgba(255, 255, 255, 0.08)] bg-[#181818]' : 'border-slate-200 bg-slate-50'
          }`}>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder={language === 'es' ? "Buscar por ruta o payload..." : "Search path or payload..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-3 py-1.5 rounded-xl border text-xs font-mono focus:outline-none ${
                  isDark ? 'bg-[#181a24] border-[rgba(255, 255, 255, 0.08)] text-white' : 'bg-white border-slate-200'
                }`}
              />
            </div>

            <div className="flex space-x-1">
              {[
                { id: 'all', label: language === 'es' ? `Todos (${webhookEvents.length})` : `All (${webhookEvents.length})` },
                { id: '2xx', label: '2xx OK' },
                { id: 'errors', label: language === 'es' ? 'Errores' : 'Errors' },
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
                        : isDark ? 'bg-[#181818] border-[#1f222e] hover:border-[#2f3346]' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
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
                <p className="text-xs">{language === 'es' ? 'No hay webhooks registrados aún.' : 'No webhooks recorded yet.'}</p>
                <p className="text-[11px] text-slate-600">
                  {language === 'es' ? 'Usa el botón "Simular Webhook Mock" para probar Stripe o GitHub al instante.' : 'Use "Simulate Mock Webhook" to test Stripe or GitHub instantly.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT 8 COLS: DEEP WEBHOOK INSPECTOR & REPLAY ACTION */}
        <div className="lg:col-span-8 flex flex-col min-h-0 overflow-hidden">
          {activeWebhookEvent ? (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${
                isDark ? 'border-[rgba(255, 255, 255, 0.08)] bg-[#181818]' : 'border-slate-200 bg-slate-50'
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
                      {language === 'es' ? 'Origen:' : 'Source:'} {activeWebhookEvent.clientIp} • {new Date(activeWebhookEvent.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleReplay(activeWebhookEvent)}
                    disabled={isReplaying}
                    className="px-4 py-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-purple-600/20 cursor-pointer disabled:opacity-50"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isReplaying ? 'animate-spin' : ''}`} />
                    <span>{isReplaying ? (language === 'es' ? 'Reenviando...' : 'Replaying...') : 'Replay Webhook'}</span>
                  </button>

                  <button
                    onClick={() => {
                      const curl = `curl -X ${activeWebhookEvent.method} "http://localhost:${port}${activeWebhookEvent.path}" \\\n` +
                        Object.entries(activeWebhookEvent.headers || {}).map(([k, v]) => `  -H "${k}: ${v}"`).join(' \\\n') +
                        (activeWebhookEvent.rawBody ? ` \\\n  -d '${activeWebhookEvent.rawBody}'` : '');
                      copyToClipboard(curl);
                    }}
                    className={`p-2 rounded-2xl border transition-colors cursor-pointer ${
                      isDark ? 'border-[rgba(255, 255, 255, 0.08)] hover:bg-[#1E1E1E] text-slate-300' : 'border-slate-200 hover:bg-slate-100'
                    }`}
                    title={language === 'es' ? "Copiar como cURL" : "Copy as cURL"}
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

              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[rgba(255, 255, 255, 0.08)] overflow-hidden min-h-0">
                {/* Left: Incoming Request Payload & Headers */}
                <div className="p-4 flex flex-col min-h-0 overflow-hidden space-y-3">
                  <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                    {language === 'es' ? '📥 Payload & Headers Entrantes' : '📥 Incoming Payload & Headers'}
                  </span>

                  <div className="space-y-1 font-mono text-[11px] max-h-36 overflow-y-auto custom-scrollbar p-2.5 rounded-xl bg-black/20 border border-white/5">
                    {Object.entries(activeWebhookEvent.headers || {}).map(([k, v]) => (
                      <div key={k} className="flex">
                        <span className="text-purple-400 font-bold mr-2">{k}:</span>
                        <span className="text-slate-300 truncate">{String(v)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex-1 flex flex-col min-h-0 overflow-hidden space-y-1">
                    <span className="text-[11px] font-mono text-slate-400">{language === 'es' ? 'Cuerpo de la Petición (Request Body)' : 'Request Body'}</span>
                    <pre className="flex-1 p-3 rounded-2xl border font-mono text-xs overflow-y-auto custom-scrollbar bg-[#181818] border-[rgba(255, 255, 255, 0.08)] text-emerald-400 select-text">
                      {typeof activeWebhookEvent.body === 'object'
                        ? JSON.stringify(activeWebhookEvent.body, null, 2)
                        : String(activeWebhookEvent.rawBody || (language === 'es' ? 'Sin cuerpo' : 'No body'))}
                    </pre>
                  </div>
                </div>

                {/* Right: Local Server Response */}
                <div className="p-4 flex flex-col min-h-0 overflow-hidden space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                      {language === 'es' ? '📤 Respuesta de tu Servidor' : '📤 Local Server Response'}
                    </span>
                    {getStatusBadge(activeWebhookEvent.statusCode)}
                  </div>

                  <div className="space-y-1 font-mono text-[11px] max-h-36 overflow-y-auto custom-scrollbar p-2.5 rounded-xl bg-black/20 border border-white/5">
                    {Object.entries(activeWebhookEvent.responseHeaders || {}).map(([k, v]) => (
                      <div key={k} className="flex">
                        <span className="text-blue-400 font-bold mr-2">{k}:</span>
                        <span className="text-slate-300 truncate">{String(v)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex-1 flex flex-col min-h-0 overflow-hidden space-y-1">
                    <span className="text-[11px] font-mono text-slate-400">{language === 'es' ? 'Cuerpo de Respuesta (Response Body)' : 'Response Body'}</span>
                    <pre className="flex-1 p-3 rounded-2xl border font-mono text-xs overflow-y-auto custom-scrollbar bg-[#181818] border-[rgba(255, 255, 255, 0.08)] text-slate-300 select-text">
                      {typeof activeWebhookEvent.responseBody === 'object'
                        ? JSON.stringify(activeWebhookEvent.responseBody, null, 2)
                        : String(activeWebhookEvent.responseBody || (language === 'es' ? 'Respuesta vacía del servidor' : 'Empty server response'))}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <Radio className="w-12 h-12 stroke-[1.2] mb-3 text-slate-600" />
              <h4 className="font-bold text-sm text-slate-400">{language === 'es' ? 'Selecciona un Webhook' : 'Select a Webhook'}</h4>
              <p className="text-xs max-w-xs mt-1">
                {language === 'es' 
                  ? 'Elige cualquier evento de la lista izquierda para inspeccionar sus cabeceras y hacer Replay.' 
                  : 'Choose any event from the left list to inspect headers and perform Replay.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Mock Webhook Dialog */}
      <AnimatePresence>
        {showMockModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-2xl rounded-3xl border p-6 space-y-4 shadow-2xl ${
                isDark ? 'bg-[#1E1E1E] border-[#2b3040] text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between border-b pb-3 border-white/5">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  <h3 className="font-extrabold text-base">{language === 'es' ? 'Simular Webhook Mock' : 'Simulate Mock Webhook'}</h3>
                </div>
                <button onClick={() => setShowMockModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono font-bold text-slate-400">{language === 'es' ? 'Plantilla Preconfigurada' : 'Preconfigured Template'}</label>
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

              <div className="space-y-1">
                <label className="text-xs font-mono font-bold text-slate-400">{language === 'es' ? 'Ruta de Destino (Endpoint)' : 'Target Endpoint'}</label>
                <input
                  type="text"
                  value={mockEndpoint}
                  onChange={(e) => setMockEndpoint(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border font-mono text-xs ${
                    isDark ? 'bg-[#1e2230] border-[#2a2f42] text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono font-bold text-slate-400">Payload JSON</label>
                <textarea
                  rows={6}
                  value={mockPayloadText}
                  onChange={(e) => setMockPayloadText(e.target.value)}
                  className={`w-full p-3 rounded-2xl border font-mono text-xs text-emerald-400 focus:outline-none ${
                    isDark ? 'bg-[#181818] border-[rgba(255, 255, 255, 0.08)]' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => setShowMockModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                >
                  {t.cancel || 'Cancel'}
                </button>
                <button
                  onClick={handleDispatchMock}
                  disabled={isSendingMock}
                  className="px-5 py-2 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-purple-600/20 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{language === 'es' ? 'Disparar Webhook' : 'Dispatch Webhook'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
