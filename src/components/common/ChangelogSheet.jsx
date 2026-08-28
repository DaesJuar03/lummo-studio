import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, CheckCircle2, Sparkles, X, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export default function ChangelogSheet({
  show,
  version = '2.3.12',
  releaseNotes,
  onClose
}) {
  if (!show) return null;

  // Si releaseNotes viene como texto multilinea o vacío, formatear en lista
  const defaultFeatures = [
    {
      icon: Zap,
      title: 'Sistema de Auto-Update Integrado',
      desc: 'Detección, descarga en segundo plano y aplicación fluida sin descargas manuales.'
    },
    {
      icon: Sparkles,
      title: 'Rendimiento y Arranque Acelerado',
      desc: 'Optimización en el escaneo de puertos libres y arranque instantáneo de proyectos Vite/React.'
    },
    {
      icon: ShieldCheck,
      title: 'Seguridad y Telemetría en Tiempo Real',
      desc: 'Mayor estabilidad en el aislamiento de procesos y gestión de memoria RAM/CPU.'
    }
  ];

  // Si vienen notas de GitHub / electron-updater personalizadas
  const customNotes = typeof releaseNotes === 'string' && releaseNotes.trim().length > 0
    ? releaseNotes.split('\n').filter(line => line.trim().length > 0)
    : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.94 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="fixed bottom-6 right-6 z-50 max-w-sm w-92 select-none"
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        <div className="relative overflow-hidden rounded-2xl bg-zinc-950/95 border border-white/[0.12] shadow-[0_15px_40px_rgba(0,0,0,0.7)] backdrop-blur-xl p-5 text-white ring-1 ring-black/80">
          
          {/* Luz de acento sutil */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Encabezado: Hoja de Actualización */}
          <div className="flex items-start justify-between gap-3 mb-4 pb-3 border-b border-white/[0.08]">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                  Hoja de Actualización
                  <span className="text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-400/30 px-1.5 py-0.2 rounded-md">
                    v{version}
                  </span>
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Nuevos cambios y mejoras implementadas
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              title="Cerrar hoja"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Cuerpo: Lista de cambios implementados */}
          <div className="space-y-3 mb-5 max-h-60 overflow-y-auto pr-1 no-scrollbar">
            {customNotes ? (
              <div className="space-y-2">
                {customNotes.map((note, idx) => (
                  <div key={idx} className="flex items-start space-x-2 text-xs text-zinc-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{note.replace(/^[-*•]\s*/, '')}</span>
                  </div>
                ))}
              </div>
            ) : (
              defaultFeatures.map((feat, idx) => {
                const IconComponent = feat.icon;
                return (
                  <div key={idx} className="flex items-start space-x-2.5 p-2 rounded-xl bg-zinc-900/60 border border-white/[0.04]">
                    <div className="w-6 h-6 rounded-md bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                      <IconComponent className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-200">{feat.title}</h4>
                      <p className="text-[11px] text-zinc-400 leading-snug mt-0.5">{feat.desc}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Botón de acción */}
          <button
            onClick={onClose}
            className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <span>¡Entendido!</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
