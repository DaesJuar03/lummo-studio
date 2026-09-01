import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, FileText, X } from 'lucide-react';
import { getTranslations } from '../../locales';

export default function PostUpdateBanner({
  version = '2.4.69',
  show,
  onDismiss,
  onOpenChangelog,
  theme = 'dark',
  language = 'es'
}) {
  if (!show) return null;
  const t = getTranslations(language);
  const isDark = theme === 'dark';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="w-full max-w-4xl mx-auto my-3 px-6 select-none"
      >
        <div className={`rounded-2xl border p-3.5 sm:px-5 sm:py-3 flex items-center justify-between gap-4 transition-all ${
          isDark 
            ? 'bg-[#181818] border-white/[0.08] text-white shadow-xl shadow-black/40' 
            : 'bg-white border-slate-200 text-slate-900 shadow-lg shadow-slate-200/50'
        }`}>
          {/* Left: Status Icon & Details */}
          <div className="flex items-center space-x-3.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <Check className="w-4.5 h-4.5 stroke-[2.5]" />
            </div>
            
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono font-black tracking-wide uppercase px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  v{version}
                </span>
                <h4 className={`text-xs sm:text-sm font-extrabold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {language === 'es' ? '¡Actualización aplicada con éxito!' : 'Update applied successfully!'}
                </h4>
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                {language === 'es' ? 'Lummo Studio se ha reiniciado con las últimas mejoras instaladas.' : 'Lummo Studio restarted with the latest optimizations installed.'}
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center space-x-2 shrink-0">
            {onOpenChangelog && (
              <button
                type="button"
                onClick={onOpenChangelog}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/25 text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer hover:shadow-xs"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{language === 'es' ? 'Ver Novedades' : 'View Whats New'}</span>
                <span className="sm:hidden">{language === 'es' ? 'Novedades' : 'Changelog'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onDismiss}
              className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
              title={language === 'es' ? 'Cerrar notificación' : 'Dismiss notification'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
