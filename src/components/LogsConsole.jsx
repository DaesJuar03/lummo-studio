import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Trash2, X } from 'lucide-react';

export default function LogsConsole({ logs, activeProjectId, projects, onClose, onClearLogs }) {
  const endRef = useRef(null);

  const currentProject = projects.find(p => p.id === activeProjectId);
  const projectLogs = logs[activeProjectId] || [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [projectLogs]);

  if (!activeProjectId) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-700 shadow-2xl text-slate-100"
      >
        {/* Console Header */}
        <div className="px-6 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center space-x-3">
            <Terminal className="h-4 w-4 text-blue-400" />
            <span className="text-xs font-bold font-mono text-slate-200">
              Console Logs: <span className="text-blue-400 font-mono">{currentProject?.name || activeProjectId}</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
              {projectLogs.length} líneas
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => onClearLogs(activeProjectId)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Limpiar logs"
            >
              <Trash2 className="h-4 w-4" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Cerrar consola"
            >
              <X className="h-4 w-4" />
            </motion.button>
          </div>
        </div>

        {/* Terminal Content */}
        <div className="p-4 h-52 overflow-y-auto font-mono text-xs text-slate-300 space-y-1 bg-black/90 selection:bg-blue-600 selection:text-white">
          {projectLogs.length === 0 ? (
            <p className="text-slate-600 italic">No hay logs registrados para este servicio aún...</p>
          ) : (
            projectLogs.map((line, idx) => (
              <div key={idx} className="whitespace-pre-wrap leading-relaxed border-l-2 border-transparent hover:border-blue-500 hover:bg-white/5 px-2 py-0.5 rounded">
                <span className="text-slate-600 mr-2">[{new Date().toLocaleTimeString()}]</span>
                <span className={line.includes('[Lummo Error]') || line.includes('ERR') ? 'text-rose-400 font-semibold' : 'text-slate-300'}>
                  {line}
                </span>
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
