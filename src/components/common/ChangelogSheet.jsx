import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, CheckCircle2, Sparkles, X, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { getTranslations } from '../../locales';

export default function ChangelogSheet({
  show,
  version = '2.4.30',
  releaseNotes,
  onClose,
  theme = 'dark',
  language = 'es'
}) {
  if (!show) return null;
  const t = getTranslations(language);
  const isDark = theme === 'dark';

  const defaultFeatures = [
    {
      icon: Zap,
      title: language === 'es' ? 'Sistema de Auto-Update Integrado' : 'Integrated Auto-Update System',
      desc: language === 'es' ? 'Detección, descarga en segundo plano y aplicación fluida sin descargas manuales.' : 'Detection, background download, and seamless application without manual downloads.'
    },
    {
      icon: Sparkles,
      title: language === 'es' ? 'Rendimiento y Arranque Acelerado' : 'Accelerated Launch & Performance',
      desc: language === 'es' ? 'Optimización en el escaneo de puertos libres y arranque instantáneo de proyectos Vite/React.' : 'Optimized free port scanning and instant startup for Vite/React projects.'
    },
    {
      icon: ShieldCheck,
      title: language === 'es' ? 'Seguridad y Telemetría en Tiempo Real' : 'Real-time Security & Telemetry',
      desc: language === 'es' ? 'Mayor estabilidad en el aislamiento de procesos y gestión de memoria RAM/CPU.' : 'Enhanced process isolation stability and RAM/CPU resource management.'
    }
  ];

  const customNotes = typeof releaseNotes === 'string' && releaseNotes.trim().length > 0
    ? releaseNotes.split('\n').filter(line => line.trim().length > 0)
    : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 25, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="fixed bottom-6 right-6 z-[80] max-w-sm w-[380px] select-none"
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        <div className={`rounded-3xl border p-5 space-y-4 transition-all ${
          isDark 
            ? 'bg-[#181818]/95 backdrop-blur-xl border-white/[0.08] text-white shadow-2xl shadow-black/80' 
            : 'bg-white/95 backdrop-blur-xl border-slate-200 text-slate-900 shadow-2xl shadow-slate-400/40'
        }`}>
          {/* Header */}
          <div className={`flex items-start justify-between gap-3 pb-3 border-b ${
            isDark ? 'border-white/[0.08]' : 'border-slate-100'
          }`}>
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <FileText className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className={`text-sm font-extrabold tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <span>{language === 'es' ? 'Novedades de la Versión' : 'Release Notes'}</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    v{version}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {language === 'es' ? 'Mejoras y características implementadas' : 'Implemented features and optimizations'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
              title={language === 'es' ? 'Cerrar hoja' : 'Close sheet'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Features List */}
          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
            {customNotes ? (
              <div className="space-y-2">
                {customNotes.map((note, idx) => (
                  <div 
                    key={idx} 
                    className={`p-3 rounded-2xl border text-xs flex items-start space-x-2.5 ${
                      isDark ? 'bg-[#1E1E1E] border-white/[0.05] text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-700'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{note.replace(/^[-*•]\s*/, '')}</span>
                  </div>
                ))}
              </div>
            ) : (
              defaultFeatures.map((feat, idx) => {
                const IconComponent = feat.icon;
                return (
                  <div 
                    key={idx} 
                    className={`p-3 rounded-2xl border flex items-start space-x-3 transition-all ${
                      isDark ? 'bg-[#1E1E1E] border-white/[0.05]' : 'bg-slate-50 border-slate-100'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                      <IconComponent className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        {feat.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                        {feat.desc}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20 hover:shadow-[0_0_15px_rgba(37,99,235,0.35)] flex items-center justify-center space-x-2 cursor-pointer"
          >
            <span>{t.understood || (language === 'es' ? '¡Entendido!' : 'Got it!')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
