import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Copy, Check, ExternalLink, Link2, RefreshCw, Square, Globe, Shield, Zap } from 'lucide-react';

export default function NetworkTunnelModal({
  isOpen,
  onClose,
  project,
  tunnelUrl,
  isStartingTunnel,
  onToggleTunnel,
  onCopyTunnelUrl,
  tunnelCopied,
  localDomainInput,
  setLocalDomainInput,
  onSaveLocalDomain,
  domainSaveMsg,
  onOpenBrowser,
  theme
}) {
  const [provider, setProvider] = useState('cloudflare');
  const isDark = theme === 'dark';

  if (!isOpen || !project) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden ${
            isDark ? 'bg-[#181818] border-[#2e2e2e] text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Modal Header */}
          <div className={`px-6 py-4 border-b flex items-center justify-between ${
            isDark ? 'bg-[#141414] border-[#262626]' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
                <Share2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className={`font-extrabold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Red & Acceso Externo
                </h3>
                <p className="text-xs text-slate-400">Túneles públicos HTTPS y Dominios Locales .test</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-[#252525]' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
              }`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-6 text-xs">

            {/* Section 1: Public Tunnel HTTPS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-mono text-[10px] font-bold uppercase tracking-wider block">
                  1. Túnel Público (HTTPS)
                </span>
                {tunnelUrl && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Activo
                  </span>
                )}
              </div>

              <p className="text-slate-400 leading-relaxed">
                Genera un enlace público seguro <code className="text-emerald-400 font-bold font-mono">HTTPS</code> para probar tu servidor en teléfonos móviles, compartir avances o recibir webhooks (Stripe, WhatsApp, GitHub).
              </p>

              {/* Provider Selector */}
              {!tunnelUrl && (
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-bold text-slate-300">Proveedor de Túnel:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setProvider('cloudflare')}
                      className={`p-2.5 rounded-xl border text-left flex items-center space-x-2 transition-all ${
                        provider === 'cloudflare'
                          ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 ring-1 ring-amber-500/30'
                          : isDark ? 'bg-[#202024] border-[#2e2e2e] text-slate-400' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <Shield className="h-4 w-4 text-amber-400 shrink-0" />
                      <div>
                        <div className="font-bold text-xs">Cloudflare (Recomendado)</div>
                        <div className="text-[10px] text-slate-500 font-mono">trycloudflare.com</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setProvider('localtunnel')}
                      className={`p-2.5 rounded-xl border text-left flex items-center space-x-2 transition-all ${
                        provider === 'localtunnel'
                          ? 'bg-blue-500/10 border-blue-500/40 text-blue-300 ring-1 ring-blue-500/30'
                          : isDark ? 'bg-[#202024] border-[#2e2e2e] text-slate-400' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <Globe className="h-4 w-4 text-blue-400 shrink-0" />
                      <div>
                        <div className="font-bold text-xs">Localtunnel</div>
                        <div className="text-[10px] text-slate-500 font-mono">loca.lt</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                <button
                  onClick={() => onToggleTunnel(provider)}
                  disabled={isStartingTunnel}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-md ${
                    tunnelUrl 
                      ? 'bg-rose-500/10 text-rose-500 border border-rose-500/30 hover:bg-rose-500/20' 
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                  }`}
                >
                  {isStartingTunnel ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : tunnelUrl ? (
                    <Square className="h-3.5 w-3.5 fill-current" />
                  ) : (
                    <Share2 className="h-4 w-4" />
                  )}
                  <span>{isStartingTunnel ? 'Generando URL...' : tunnelUrl ? 'Detener Túnel' : 'Activar Túnel Público'}</span>
                </button>

                {tunnelUrl && (
                  <div className="flex-1 flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 rounded-xl font-mono text-xs text-emerald-400 truncate">
                    <span className="truncate flex-1 font-bold">{tunnelUrl}</span>
                    <button
                      onClick={onCopyTunnelUrl}
                      className="p-1 hover:bg-emerald-500/20 rounded-lg text-emerald-300 transition-colors cursor-pointer"
                      title="Copiar URL"
                    >
                      {tunnelCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => onOpenBrowser(tunnelUrl)}
                      className="p-1 hover:bg-emerald-500/20 rounded-lg text-emerald-300 transition-colors cursor-pointer"
                      title="Abrir en navegador"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {tunnelUrl && (
                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[11px] flex items-center justify-between">
                  <span>🪝 <strong>Live Webhook Inspector activo:</strong> Capturando peticiones y payloads entrantes.</span>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className={`border-t ${isDark ? 'border-[#262626]' : 'border-slate-200'}`}></div>

            {/* Section 2: Custom Local Domain (.test) */}
            <div className="space-y-3">
              <span className="text-slate-400 font-mono text-[10px] font-bold uppercase tracking-wider block">
                2. Dominio Local Personalizado (.test)
              </span>

              <p className="text-slate-400 leading-relaxed">
                Asigna un nombre de dominio limpio (ej: <code className="text-purple-400 font-bold font-mono">http://app.test</code>) a este proyecto para acceder directamente sin recordar el puerto asignado.
              </p>

              <div className="flex items-center space-x-2 pt-1">
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-mono text-xs">http://</span>
                  <input
                    type="text"
                    value={localDomainInput}
                    onChange={(e) => setLocalDomainInput(e.target.value)}
                    placeholder="mi-proyecto.test"
                    className={`w-full border rounded-xl py-2 pl-14 pr-3 text-xs font-mono font-bold focus:outline-none ${
                      isDark ? 'bg-[#141414] border-[#2e2e2e] text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
                <button
                  onClick={onSaveLocalDomain}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center space-x-1.5 shadow-md shadow-purple-600/20 transition-all cursor-pointer"
                >
                  <Link2 className="h-4 w-4" />
                  <span>Vincular</span>
                </button>
              </div>

              {domainSaveMsg && (
                <div className={`p-3 rounded-xl font-mono text-xs border ${
                  typeof domainSaveMsg === 'object' && domainSaveMsg.type === 'warning'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : typeof domainSaveMsg === 'object' && domainSaveMsg.type === 'error'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    : 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                }`}>
                  <p className="leading-relaxed">
                    {typeof domainSaveMsg === 'string' ? domainSaveMsg : domainSaveMsg.text}
                  </p>
                  {typeof domainSaveMsg === 'object' && domainSaveMsg.url && (
                    <button
                      onClick={() => onOpenBrowser(domainSaveMsg.url)}
                      className="mt-2 flex items-center gap-1.5 font-bold text-emerald-400 hover:underline cursor-pointer"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Abrir {domainSaveMsg.url}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* Modal Footer */}
          <div className={`px-6 py-3.5 border-t flex justify-end ${
            isDark ? 'bg-[#141414] border-[#262626]' : 'bg-slate-50 border-slate-200'
          }`}>
            <button
              onClick={onClose}
              className="bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer"
            >
              Cerrar
            </button>
          </div>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
