import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Download, Sparkles } from 'lucide-react';

export default function HeaderUpdateWidget({
  status,
  progress = 0,
  updateInfo,
  onRestartAndApply,
  isDark = true
}) {
  // 1. Estado: Descargando la actualización
  if (status === 'downloading') {
    return (
      <div 
        className="relative mr-2 h-7 px-3 rounded-lg overflow-hidden flex items-center justify-center bg-blue-600 shadow-md min-w-[130px] border border-blue-500/40 select-none"
        title="Descargando nueva versión..."
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        {/* Barra de progreso de color blanco llenando el fondo (sin porcentaje numérico) */}
        <motion.div 
          className="absolute left-0 top-0 bottom-0 bg-white/35 rounded-md"
          initial={{ width: '0%' }}
          animate={{ width: `${Math.max(progress, 6)}%` }}
          transition={{ ease: 'easeOut', duration: 0.3 }}
        />

        {/* Contenido en primer plano */}
        <div className="relative z-10 flex items-center space-x-1.5 text-white text-[11px] font-bold tracking-tight">
          <Download className="w-3.5 h-3.5 animate-bounce text-white" />
          <span>Descargando update...</span>
        </div>
      </div>
    );
  }

  // 2. Estado: Descarga completada -> Botón azul para reiniciar y aplicar
  if (status === 'ready') {
    return (
      <motion.button
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={onRestartAndApply}
        className="mr-2 h-7 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-[11px] flex items-center space-x-1.5 shadow-[0_0_15px_rgba(37,99,235,0.45)] border border-blue-400/40 cursor-pointer transition-colors"
        title="Haz clic para reiniciar la aplicación y aplicar la actualización"
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        <RefreshCw className="w-3.5 h-3.5 text-white animate-spin-slow" />
        <span>Reiniciar y aplicar cambios</span>
      </motion.button>
    );
  }

  // Estado reposo / inactivo
  return null;
}
