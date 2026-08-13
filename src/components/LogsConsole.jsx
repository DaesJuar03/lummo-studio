import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Trash2, X, Pause, Play, ArrowDown } from 'lucide-react';

export default function LogsConsole({ logs, activeProjectId, projects, onClose, onClearLogs }) {
  const endRef = useRef(null);
  const containerRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const currentProject = projects.find(p => p.id === activeProjectId);
  const projectLogs = logs[activeProjectId] || [];

  // Buffering: limit visible rendered lines for extreme performance
  const displayLogs = useMemo(() => {
    return projectLogs.length > 500 ? projectLogs.slice(projectLogs.length - 500) : projectLogs;
  }, [projectLogs]);

  useEffect(() => {
    if (autoScroll) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [projectLogs, autoScroll]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 40;
    if (!isAtBottom && autoScroll) {
      setAutoScroll(false);
    }
  };

  const scrollToBottom = () => {
    setAutoScroll(true);
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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
            {!autoScroll && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono flex items-center gap-1 animate-pulse">
                Auto-scroll Pausado
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={autoScroll ? () => setAutoScroll(false) : scrollToBottom}
              className={`px-2 py-1 text-xs rounded-lg font-mono flex items-center gap-1 transition-colors ${
                autoScroll 
                  ? 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700' 
                  : 'bg-amber-600 text-white hover:bg-amber-500'
              }`}
              title={autoScroll ? 'Pausar auto-scroll' : 'Reanudar auto-scroll'}
            >
              {autoScroll ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              <span>{autoScroll ? 'Pausar' : 'Reanudar'}</span>
            </motion.button>

            {!autoScroll && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={scrollToBottom}
                className="p-1.5 rounded-lg text-blue-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Ir al final de los logs"
              >
                <ArrowDown className="h-4 w-4" />
              </motion.button>
            )}

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
        <div 
          ref={containerRef}
          onScroll={handleScroll}
          className="p-4 h-52 overflow-y-auto font-mono text-xs text-slate-300 space-y-1 bg-black/90 selection:bg-blue-600 selection:text-white scrollbar-thin"
        >
          {displayLogs.length === 0 ? (
            <p className="text-slate-600 italic">No hay logs registrados para este servicio aún...</p>
          ) : (
            displayLogs.map((line, idx) => (
              <div key={idx} className="whitespace-pre-wrap leading-relaxed border-l-2 border-transparent hover:border-blue-500 hover:bg-white/5 px-2 py-0.5 rounded">
                <span className="text-slate-600 mr-2">[{new Date().toLocaleTimeString()}]</span>
                <span className={line.includes('[Lummo Error]') || line.includes('ERR') || line.includes('Error') ? 'text-rose-400 font-semibold' : 'text-slate-300'}>
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

