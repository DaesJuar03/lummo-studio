import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Download } from 'lucide-react';
import { getTranslations } from '../../locales';

export default function HeaderUpdateWidget({
  status,
  progress = 0,
  updateInfo,
  onRestartAndApply,
  isDark = true,
  language = 'es'
}) {
  const t = getTranslations(language);

  // 1. Estado: Descargando la actualización
  if (status === 'downloading') {
    return (
      <div 
        className="relative mr-2 h-7 px-3 rounded-full flex items-center space-x-2.5 bg-[#151515] border border-white/[0.08] shadow-inner select-none"
        title={t.downloadingUpdateTitle || 'Downloading new version...'}
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        <div className="flex items-center space-x-1.5 text-white text-[10.5px] font-extrabold uppercase tracking-wider">
          <Download className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
          <span>{t.downloadingUpdate || 'Descargando...'}</span>
        </div>

        {/* Barra hundida con profundidad y progreso blanco */}
        <div className="w-20 h-2 bg-[#08080a] rounded-full overflow-hidden relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.95),0_1px_0_rgba(255,255,255,0.08)] border border-white/[0.04]">
          <motion.div 
            className="absolute left-0 top-0 bottom-0 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]"
            initial={{ width: '0%' }}
            animate={{ width: `${Math.max(progress, 6)}%` }}
            transition={{ ease: 'easeOut', duration: 0.3 }}
          />
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
        className="mr-2 h-7 px-3 rounded-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-[11px] flex items-center space-x-1.5 shadow-[0_0_15px_rgba(37,99,235,0.45)] border border-blue-400/40 cursor-pointer transition-colors"
        title={t.restartAndApplyTitle || 'Click to restart the application and apply update'}
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        <RefreshCw className="w-3.5 h-3.5 text-white animate-spin-slow" />
        <span>{t.restartAndApply || 'Restart and apply changes'}</span>
      </motion.button>
    );
  }

  // Estado reposo / inactivo
  return null;
}
