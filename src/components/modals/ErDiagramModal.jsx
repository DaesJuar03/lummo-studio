import React, { useState, useEffect, useCallback } from 'react';
import { Database, X, ZoomIn, ZoomOut, RotateCcw, Key, Table } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { getTranslations } from '../../locales';

export default function ErDiagramModal({ isOpen = true, onClose, dbConfig, db, theme = 'dark', language = 'es', isEmbedded = false }) {
  const activeDb = dbConfig || db;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ entities: [], relationships: [] });
  const [zoom, setZoom] = useState(1);
  const toast = useToast();
  const isDark = theme === 'dark';
  const t = getTranslations(language);

  const loadErDiagram = useCallback(async () => {
    setLoading(true);
    try {
      if (window.electronAPI && window.electronAPI.db?.getErDiagram) {
        const res = await window.electronAPI.db.getErDiagram(activeDb);
        if (res && res.success) {
          setData(res);
        } else {
          toast.showError(language === 'es' ? 'Error al cargar diagrama ER' : 'Error loading ER diagram', res?.error || (language === 'es' ? 'No se pudieron extraer las relaciones' : 'Could not extract relationships'));
        }
      } else {
        // Demo Fallback Data
        setData({
          entities: [
            {
              name: 'users',
              columns: [
                { name: 'id', type: 'INTEGER', isPk: true },
                { name: 'name', type: 'VARCHAR' },
                { name: 'email', type: 'VARCHAR' },
                { name: 'created_at', type: 'DATETIME' }
              ]
            },
            {
              name: 'posts',
              columns: [
                { name: 'id', type: 'INTEGER', isPk: true },
                { name: 'title', type: 'VARCHAR' },
                { name: 'user_id', type: 'INTEGER', isFk: true },
                { name: 'content', type: 'TEXT' }
              ]
            }
          ],
          relationships: [
            { fromTable: 'posts', fromColumn: 'user_id', toTable: 'users', toColumn: 'id' }
          ]
        });
      }
    } catch (err) {
      toast.showError(language === 'es' ? 'Error en Diagrama ER' : 'ER Diagram Error', err.message);
    } finally {
      setLoading(false);
    }
  }, [activeDb, toast, language]);

  useEffect(() => {
    if (activeDb) {
      loadErDiagram();
    }
  }, [activeDb, loadErDiagram]);

  if (!isOpen && !isEmbedded) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl h-[85vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100">
                {language === 'es' ? 'Diagrama Entidad-Relación (ER Diagram)' : 'Entity-Relationship Diagram (ER Diagram)'}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {activeDb?.name} ({data.entities?.length || 0} {language === 'es' ? 'entidades' : 'entities'})
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setZoom(prev => Math.max(0.6, prev - 0.1))}
              className="p-1.5 rounded-lg border border-white/10 text-slate-300 hover:text-white cursor-pointer"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom(prev => Math.min(1.5, prev + 0.1))}
              className="p-1.5 rounded-lg border border-white/10 text-slate-300 hover:text-white cursor-pointer"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="p-1.5 rounded-lg border border-white/10 text-slate-300 hover:text-white cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors ml-2 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ER Canvas */}
        <div className="flex-1 overflow-auto p-8 bg-[#0d1117] flex flex-wrap gap-6 items-start custom-scrollbar" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
          {data.entities?.map((ent) => (
            <div key={ent.name} className="w-64 rounded-2xl border border-slate-700 bg-slate-900 shadow-xl overflow-hidden shrink-0">
              <div className="px-4 py-2.5 bg-blue-600/20 border-b border-slate-700 flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-blue-300">{ent.name}</span>
                <Table className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div className="p-3 space-y-1.5 font-mono text-xs">
                {ent.columns?.map((c) => (
                  <div key={c.name} className="flex items-center justify-between text-slate-300">
                    <div className="flex items-center space-x-1.5 truncate">
                      {c.isPk && <Key className="w-3 h-3 text-amber-400 shrink-0" />}
                      <span className={`truncate ${c.isPk ? 'font-bold text-amber-300' : ''}`}>{c.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0">{c.type}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
