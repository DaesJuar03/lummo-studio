import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Trash2, Copy, Check, Minus, Square, X, Search, Activity } from 'lucide-react';

// Strip ANSI escape codes (e.g. \x1b[32m, \x1b[1m, [39m, etc.) for clean rendering
function stripAnsi(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[\u001b\u009b][FormatSpecifier]*[a-zA-K]/g, '')
            .replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '')
            .replace(/\[\d+m/g, '')
            .replace(/\[\d+;\d+m/g, '');
}

export default function StandaloneLogWindow({ projectId, projectName }) {
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    // Initial fetch of stored logs
    if (window.electronAPI?.getProjectLogs) {
      window.electronAPI.getProjectLogs(projectId).then((initialLogs) => {
        if (Array.isArray(initialLogs)) {
          setLogs(initialLogs.map(stripAnsi));
        }
      });

      const unsubscribe = window.electronAPI.onProcessLog(({ projectId: id, message }) => {
        if (id === projectId) {
          setLogs((prev) => [...prev, stripAnsi(message)]);
        }
      });

      return () => unsubscribe();
    }
  }, [projectId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const filteredLogs = logs.filter(l => l.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="h-screen bg-slate-900 text-slate-100 flex flex-col font-sans select-none selection:bg-blue-600 selection:text-white">
      {/* Titlebar Header in Pure White & Blue Aesthetic */}
      <header 
        className="px-4 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between select-none"
        style={{ WebkitAppRegion: 'drag' }}
      >
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold">
            <Terminal className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="font-extrabold text-slate-900 text-sm tracking-tight flex items-center gap-2">
              Lummo Terminal <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200">{projectName || projectId}</span>
            </span>
          </div>
        </div>

        {/* Window controls */}
        <div className="flex items-center space-x-1" style={{ WebkitAppRegion: 'no-drag' }}>
          <button
            onClick={() => window.electronAPI?.windowMinimize()}
            className="w-9 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Minimizar"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => window.electronAPI?.windowMaximize()}
            className="w-9 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Maximizar"
          >
            <Square className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => window.electronAPI?.windowClose()}
            className="w-9 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-rose-600 transition-colors"
            title="Cerrar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* Toolbar Sub-bar in Soft Slate Palette */}
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center space-x-2 flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtrar mensajes de salida..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 font-sans shadow-2xs"
            />
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-mono text-slate-600">
            <Activity className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
            <span>{filteredLogs.length} líneas</span>
          </div>

          <button
            onClick={handleCopyLogs}
            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:bg-slate-100 flex items-center space-x-1.5 font-bold text-xs shadow-2xs transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
            <span>{copied ? '¡Copiado!' : 'Copiar Logs'}</span>
          </button>

          <button
            onClick={handleClearLogs}
            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-rose-600 hover:bg-rose-50 flex items-center space-x-1.5 font-bold text-xs shadow-2xs transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5 text-slate-400" />
            <span>Limpiar</span>
          </button>
        </div>
      </div>

      {/* Terminal Output Body in Studio Dark Slate */}
      <div className="flex-1 p-5 overflow-y-auto space-y-1.5 bg-[#080b11] font-mono text-xs leading-relaxed">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-600 italic">
            Esperando mensajes de consola para el proyecto...
          </div>
        ) : (
          filteredLogs.map((line, index) => (
            <div
              key={index}
              className="flex items-start space-x-3 hover:bg-white/5 py-1 px-2.5 rounded-lg group border-l-2 border-transparent hover:border-blue-500 transition-colors"
            >
              <span className="text-slate-600 text-[11px] select-none min-w-[28px] text-right pt-0.5 font-mono">{index + 1}</span>
              <span className={`whitespace-pre-wrap font-mono ${
                line.includes('[Lummo Error]') || line.includes('ERR') || line.includes('Error:') 
                  ? 'text-rose-400 font-semibold' 
                  : line.includes('[Lummo]') || line.includes('http://')
                  ? 'text-blue-400 font-semibold'
                  : 'text-slate-300'
              }`}>
                {line}
              </span>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
