import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Copy, Check, ExternalLink, RefreshCw, Square, Globe, Shield, Zap } from 'lucide-react';
import { getTranslations } from '../../locales';

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
  theme,
  language = 'es'
}) {
  const [provider, setProvider] = useState('cloudflare');
  const isDark = theme === 'dark';
  const t = getTranslations(language);

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
            isDark ? 'bg-[#141414] border-white/[0.08] text-[#E5E5E5]' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Modal Header */}
          <div className={`px-6 py-4 border-b flex items-center justify-between ${
            isDark ? 'bg-[#141414] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Share2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className={`font-extrabold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {language === 'es' ? 'Red & Acceso Externo' : 'Network & External Access'}
                </h3>
                <p className="text-xs text-slate-400">
                  {language === 'es' ? 'Túneles públicos HTTPS y Dominios Locales .test' : 'Public HTTPS Tunnels and Local .test Domains'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-[#303030]' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
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
                  {language === 'es' ? '1. Túnel Público (HTTPS)' : '1. Public Tunnel (HTTPS)'}
                </span>
                {tunnelUrl && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> {language === 'es' ? 'Activo' : 'Active'}
                  </span>
                )}
              </div>

              <p className="text-slate-400 leading-relaxed">
                {language === 'es' 
                  ? 'Genera un enlace público seguro HTTPS para probar tu servidor en teléfonos móviles, compartir avances o recibir webhooks.' 
                  : 'Generate a secure public HTTPS link to test on mobile devices, share previews, or receive webhooks.'}
              </p>

              {/* Provider Selector */}
              {!tunnelUrl && (
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-bold text-slate-300">
                    {language === 'es' ? 'Proveedor de Túnel:' : 'Tunnel Provider:'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setProvider('cloudflare')}
                      className={`p-2.5 rounded-xl border text-left flex items-center space-x-2 transition-all cursor-pointer ${
                        provider === 'cloudflare'
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 ring-1 ring-amber-500/30'
                          : isDark ? 'bg-[#1E1E1E] border-white/[0.08] text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <Zap className="h-4 w-4 text-amber-400 shrink-0" />
                      <div>
                        <div className="font-bold">Cloudflare Quick</div>
                        <div className="text-[10px] text-slate-400">{language === 'es' ? 'trycloudflare.com' : 'trycloudflare.com'}</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setProvider('localtunnel')}
                      className={`p-2.5 rounded-xl border text-left flex items-center space-x-2 transition-all cursor-pointer ${
                        provider === 'localtunnel'
                          ? 'bg-blue-500/15 border-blue-500/40 text-blue-300 ring-1 ring-blue-500/30'
                          : isDark ? 'bg-[#1E1E1E] border-white/[0.08] text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <Globe className="h-4 w-4 text-blue-400 shrink-0" />
                      <div>
                        <div className="font-bold">Localtunnel</div>
                        <div className="text-[10px] text-slate-400">{language === 'es' ? 'loca.lt' : 'loca.lt'}</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Tunnel Active UI */}
              {tunnelUrl ? (
                <div className={`p-3.5 rounded-2xl border space-y-2.5 ${
                  isDark ? 'bg-[#1E1E1E] border-emerald-500/30' : 'bg-emerald-50/50 border-emerald-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-emerald-400 truncate mr-2" title={tunnelUrl}>
                      {tunnelUrl}
                    </span>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <button
                        onClick={onCopyTunnelUrl}
                        className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors cursor-pointer"
                        title={language === 'es' ? 'Copiar enlace público' : 'Copy public link'}
                      >
                        {tunnelCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => onOpenBrowser(tunnelUrl)}
                        className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors cursor-pointer"
                        title={language === 'es' ? 'Abrir en navegador' : 'Open in browser'}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => onToggleTunnel(provider)}
                    disabled={isStartingTunnel}
                    className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center justify-center space-x-1.5 shadow-md shadow-rose-600/20 cursor-pointer"
                  >
                    <Square className="h-3.5 w-3.5 fill-white" />
                    <span>{language === 'es' ? 'Detener Túnel' : 'Stop Tunnel'}</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => onToggleTunnel(provider)}
                  disabled={isStartingTunnel}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center space-x-2 shadow-md shadow-emerald-600/20 hover:shadow-[0_0_15px_rgba(16,185,129,0.35)] transition-all cursor-pointer disabled:opacity-50"
                >
                  {isStartingTunnel ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>{language === 'es' ? 'Iniciando Túnel...' : 'Starting Tunnel...'}</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="h-4 w-4" />
                      <span>{language === 'es' ? 'Crear Túnel Público Seguro' : 'Create Secure Public Tunnel'}</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <div className={`border-t ${isDark ? 'border-white/[0.08]' : 'border-slate-200'}`}></div>

            {/* Section 2: Local Domain (.test) */}
            <div className="space-y-3">
              <span className="text-slate-400 font-mono text-[10px] font-bold uppercase tracking-wider block">
                {language === 'es' ? '2. Dominio Local Personalizado' : '2. Custom Local Domain'}
              </span>

              <p className="text-slate-400 leading-relaxed">
                {language === 'es' 
                  ? 'Asigna un dominio local como ' 
                  : 'Assign a local domain like '}
                <code className="text-blue-400 font-bold font-mono">mi-app.test</code>
                {language === 'es' ? ' con certificado SSL automático.' : ' with automatic SSL certificates.'}
              </p>

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={localDomainInput}
                  onChange={(e) => setLocalDomainInput(e.target.value)}
                  placeholder="ej: mi-tienda.test"
                  className={`flex-1 p-2.5 rounded-xl border font-mono text-xs focus:outline-none focus:border-blue-500 ${
                    isDark ? 'bg-[#1E1E1E] border-white/[0.08] text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
                <button
                  type="button"
                  onClick={onSaveLocalDomain}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  {language === 'es' ? 'Vincular' : 'Link'}
                </button>
              </div>

              {domainSaveMsg && (
                <div className={`p-3 rounded-xl font-mono text-xs ${
                  domainSaveMsg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                }`}>
                  {domainSaveMsg.text}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
