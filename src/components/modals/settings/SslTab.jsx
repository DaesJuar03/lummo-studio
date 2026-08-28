import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  Key, 
  Copy, 
  Check, 
  Trash2, 
  RefreshCw, 
  Globe, 
  ExternalLink, 
  Loader2 
} from 'lucide-react';
import useClipboard from '../../../hooks/useClipboard';

export default function SslTab({ theme }) {
  const isDark = theme === 'dark';
  const [sslStatus, setSslStatus] = useState(null);
  const [isInstallingCa, setIsInstallingCa] = useState(false);
  const [sslNotice, setSslNotice] = useState('');
  const { copied: copiedCaPath, copyToClipboard } = useClipboard();

  const loadSslStatus = async () => {
    if (window.electronAPI?.ssl?.getStatus) {
      const status = await window.electronAPI.ssl.getStatus();
      setSslStatus(status);
    }
  };

  useEffect(() => {
    loadSslStatus();
  }, []);

  const handleInstallCa = async () => {
    if (!window.electronAPI?.ssl?.installCa) return;
    setIsInstallingCa(true);
    const res = await window.electronAPI.ssl.installCa();
    setIsInstallingCa(false);
    if (res.success) {
      setSslNotice('¡Certificado Raíz de Lummo instalado con éxito en Windows!');
      loadSslStatus();
    } else {
      setSslNotice(`Error: ${res.error}`);
    }
    setTimeout(() => setSslNotice(''), 4500);
  };

  const handleUninstallCa = async () => {
    if (!window.electronAPI?.ssl?.uninstallCa) return;
    setIsInstallingCa(true);
    const res = await window.electronAPI.ssl.uninstallCa();
    setIsInstallingCa(false);
    if (res.success) {
      setSslNotice('CA Raíz de Lummo desinstalada de Windows.');
      loadSslStatus();
    } else {
      setSslNotice(`Error: ${res.error}`);
    }
    setTimeout(() => setSslNotice(''), 4500);
  };

  return (
    <motion.div initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }} className="space-y-6">
      <div className={`border-b pb-4 ${isDark ? 'border-white/[0.08]' : 'border-slate-100'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Certificados SSL & HTTPS Local
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Desarrolla en local con candado verde HTTPS (sin advertencias del navegador) mediante la Autoridad de Certificación de Lummo.
            </p>
          </div>
          <button
            type="button"
            onClick={loadSslStatus}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isDark ? 'border-white/[0.08] bg-[#252525] text-slate-400 hover:text-white' : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'
            }`}
            title="Actualizar estado SSL"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {sslNotice && (
        <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono font-medium flex items-center justify-between">
          <span>{sslNotice}</span>
        </div>
      )}

      {/* Main Root CA Status Card */}
      <div className={`p-5 rounded-3xl border relative overflow-hidden ${
        sslStatus?.caInstalled
          ? isDark ? 'bg-emerald-950/15 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'
          : isDark ? 'bg-[#1E1E1E] border-amber-500/30' : 'bg-amber-50 border-amber-200'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${
              sslStatus?.caInstalled
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
            }`}>
              {sslStatus?.caInstalled ? (
                <ShieldCheck className="h-6 w-6" />
              ) : (
                <ShieldAlert className="h-6 w-6" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <h4 className={`font-extrabold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Lummo Local Development CA
                </h4>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                  sslStatus?.caInstalled
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}>
                  {sslStatus?.caInstalled ? 'CONFIABLE (INSTALADA)' : 'NO INSTALADA'}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {sslStatus?.caInstalled
                  ? 'Tu sistema operativo y navegadores confían en los certificados emitidos por Lummo Studio. No verás pantallas de advertencia.'
                  : 'Instala el certificado raíz en el almacén de Windows para habilitar HTTPS automático y candado verde en todos tus proyectos.'}
              </p>
            </div>
          </div>

          {/* Action button */}
          <div className="shrink-0">
            {sslStatus?.caInstalled ? (
              <button
                type="button"
                onClick={handleUninstallCa}
                disabled={isInstallingCa}
                className={`px-4 py-2.5 rounded-xl border text-xs font-bold text-rose-400 border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 transition-all flex items-center gap-1.5 cursor-pointer`}
              >
                {isInstallingCa ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                <span>Desinstalar CA</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleInstallCa}
                disabled={isInstallingCa}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 hover:shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all cursor-pointer"
              >
                {isInstallingCa ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                <span>Instalar CA Raíz (1-Clic)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Technical details grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <div className={`p-4 rounded-2xl border space-y-1.5 ${
          isDark ? 'bg-[#1E1E1E] border-white/[0.08]' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-400">
            <Lock className="h-4 w-4 text-emerald-400" />
            <span>Puerto HTTPS Reverse Proxy</span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className={`text-xl font-extrabold font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
              :{sslStatus?.httpsProxyPort || 8443}
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
              SNI Dinámico
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Redirige peticiones SSL transparentemente al puerto de desarrollo de tu servidor.
          </p>
        </div>

        <div className={`p-4 rounded-2xl border space-y-1.5 ${
          isDark ? 'bg-[#1E1E1E] border-white/[0.08]' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-400">
            <Key className="h-4 w-4 text-purple-400" />
            <span>Certificados de Dominio Emitidos</span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className={`text-xl font-extrabold font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {sslStatus?.generatedCertCount || 0} Certificados
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
              RSA 2048 / SHA256
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Válidos para *.test, *.local, localhost y dominios asignados.
          </p>
        </div>
      </div>

      {/* CA Public Cert Path */}
      {sslStatus?.caCertPath && (
        <div className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
          isDark ? 'bg-[#1E1E1E] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="min-w-0">
            <span className="block text-[10px] font-mono font-bold text-slate-400 uppercase">Ubicación del Certificado Público (.crt)</span>
            <span className="block text-xs font-mono truncate text-slate-300" title={sslStatus.caCertPath}>
              {sslStatus.caCertPath}
            </span>
          </div>
          <button
            type="button"
            onClick={() => copyToClipboard(sslStatus.caCertPath)}
            className={`p-2 rounded-xl border transition-colors cursor-pointer shrink-0 ${
              isDark ? 'bg-[#252525] border-white/[0.08] text-slate-300 hover:text-white' : 'bg-white border-slate-200 text-slate-700'
            }`}
            title="Copiar ruta"
          >
            {copiedCaPath ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      )}

      {/* Active Registered Local Domains */}
      <div className="space-y-2.5 pt-2">
        <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
          Dominios Locales Vinculados ({sslStatus?.domains?.length || 0})
        </h4>

        {(!sslStatus?.domains || sslStatus.domains.length === 0) ? (
          <div className={`p-6 rounded-2xl border text-center space-y-1.5 ${
            isDark ? 'bg-[#1E1E1E] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
          }`}>
            <Globe className="h-6 w-6 text-slate-500 mx-auto" />
            <p className="text-xs text-slate-400">No hay dominios locales vinculados aún.</p>
            <p className="text-[11px] text-slate-500">
              Ve a la vista de un proyecto y haz clic en "Red & Acceso Externo" para asignar un dominio .test.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sslStatus.domains.map((dom) => (
              <div
                key={dom.domain}
                className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isDark ? 'bg-[#1E1E1E] border-white/[0.08]' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Lock className="h-4 w-4" />
                  </div>
                  <div>
                    <span className={`text-xs font-bold font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {dom.domain}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono block">
                      Destino: localhost:{dom.port}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    HTTPS :8443
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.electronAPI?.openInBrowser) {
                        window.electronAPI.openInBrowser(dom.httpsUrl);
                      }
                    }}
                    className="px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>Abrir HTTPS</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
