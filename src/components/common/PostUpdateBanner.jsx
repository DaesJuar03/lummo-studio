import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, FileText, X, CheckCircle2 } from 'lucide-react';

export default function PostUpdateBanner({
  version = '2.4.7',
  show,
  onDismiss,
  onOpenChangelog
}) {
  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -15, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        className="w-full max-w-2xl mx-auto my-3 px-4"
      >
        {/* Banner con contorno negro pronunciado (Black Outline) y acabado Dark Modern */}
        <div className="relative overflow-hidden rounded-2xl bg-zinc-950 text-white p-3.5 sm:px-5 sm:py-3 shadow-[0_10px_30px_rgba(0,0,0,0.5)] border-2 border-black ring-1 ring-white/15 flex items-center justify-between gap-3">
          
          {/* Acento de gradiente sutil de fondo */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/15 via-transparent to-purple-600/10 pointer-events-none" />

          {/* Izquierda: Icono + Mensaje */}
          <div className="relative z-10 flex items-center space-x-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0 shadow-inner">
              <Sparkles className="w-5 h-5 text-blue-400 animate-pulse" />
            </div>
            
            <div className="truncate">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-black tracking-wide uppercase bg-blue-500/20 text-blue-300 border border-blue-400/30 px-1.5 py-0.5 rounded-md">
                  v{version}
                </span>
                <h4 className="text-xs sm:text-sm font-bold text-zinc-100 truncate">
                  ¡Actualización aplicada con éxito!
                </h4>
              </div>
              <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                Lummo Studio se ha reiniciado e instalado las últimas optimizaciones del sistema.
              </p>
            </div>
          </div>

          {/* Derecha: Botón de Hoja de Novedades + Cerrar */}
          <div className="relative z-10 flex items-center space-x-2 shrink-0">
            {onOpenChangelog && (
              <button
                onClick={onOpenChangelog}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 hover:border-blue-500/40 text-blue-400 hover:text-blue-300 text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ver qué se implementó</span>
                <span className="sm:hidden">Novedades</span>
              </button>
            )}

            <button
              onClick={onDismiss}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              title="Cerrar notificación"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
