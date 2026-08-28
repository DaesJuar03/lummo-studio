import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Trash2, Copy, Check, Minus, Square, X, Search } from 'lucide-react';
import { getTranslations } from '../../locales';

function stripAnsi(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[\u001b\u009b][FormatSpecifier]*[a-zA-K]/g, '')
            .replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '')
            .replace(/\[\d+m/g, '')
            .replace(/\[\d+;\d+m/g, '');
}

export default function StandaloneLogWindow({ projectId, projectName, language = 'es' }) {
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);
  const endRef = useRef(null);
  const t = getTranslations(language);

  useEffect(() => {
    if (window.electronAPI?.getProjectLogs) {
      window.electronAPI.getProjectLogs(projectId).then((initialLogs) => {
        if (Array.isArray(initialLogs)) {
          setLogs(initialLogs.map(stripAnsi));
        }
      });

      const unsubscribeLog = window.electronAPI.onProcessLog(({ projectId: id, message }) => {
        if (id === projectId) {
          setLogs((prev) => [...prev, stripAnsi(message)]);
        }
      });

      const unsubscribeCleared = window.electronAPI.onLogsCleared?.(({ projectId: id, all }) => {
        if (all || id === projectId) {
          setLogs([]);
        }
      });

      return () => {
        unsubscribeLog();
        if (unsubscribeCleared) unsubscribeCleared();
      };
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

  const handleClearLogs = async () => {
    setLogs([]);
    if (window.electronAPI?.clearProjectLogs) {
      await window.electronAPI.clearProjectLogs(projectId);
    }
  };

  const filteredLogs = logs.filter(l => l.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="h-screen bg-slate-900 text-slate-100 flex flex-col font-sans select-none selection:bg-blue-600 selection:text-white">
      <header 
        className="pl-4 pr-0 h-11 bg-white border-b border-slate-200 flex items-center justify-between select-none"
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

        <div className="flex items-stretch h-full" style={{ WebkitAppRegion: 'no-drag' }}>
          <button
            onClick={() => window.electronAPI?.windowMinimize()}
            className="w-11 h-full flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title={language === 'es' ? "Minimizar" : "Minimize"}
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => window.electronAPI?.windowMaximize()}
            className="w-11 h-full flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title={language === 'es' ? "Maximizar" : "Maximize"}
          >
            <Square className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => window.electronAPI?.windowClose()}
            className="w-12 h-full flex items-center justify-center text-slate-500 hover:text-white hover:bg-rose-600 transition-colors cursor-pointer"
            title={language === 'es' ? "Cerrar" : "Close"}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Toolbar */}
      <div className="px-4 py-2 border-b border-slate-800 bg-slate-950 flex items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-xs">
          <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={language === 'es' ? "Filtrar en consola..." : "Filter console..."}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopyLogs}
            className="px-3 py-1 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-300 flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? (language === 'es' ? '¡Copiado!' : 'Copied!') : (language === 'es' ? 'Copiar Todo' : 'Copy All')}</span>
          </button>
          <button
            onClick={handleClearLogs}
            className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
            title={language === 'es' ? 'Limpiar consola' : 'Clear console'}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Logs Area */}
      <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-slate-300 space-y-1 bg-black/90 selection:bg-blue-600 selection:text-white custom-scrollbar">
        {filteredLogs.length === 0 ? (
          <div className="py-20 text-center text-slate-600 italic">
            {language === 'es' ? 'No hay registros que coincidan con el filtro...' : 'No logs matching filter...'}
          </div>
        ) : (
          filteredLogs.map((line, idx) => (
            <div key={idx} className="whitespace-pre-wrap leading-relaxed border-l-2 border-transparent hover:border-blue-500 px-2 py-0.5">
              <span className={line.includes('[Lummo Error]') || line.includes('ERR') || line.includes('Error') ? 'text-rose-400 font-semibold' : 'text-slate-300'}>
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
