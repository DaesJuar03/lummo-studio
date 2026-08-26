import React, { useState, useEffect } from 'react';
import { Database, X, ZoomIn, ZoomOut, RotateCcw, Key, Link2, Table, Loader2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export default function ErDiagramModal({ isOpen = true, onClose, dbConfig, theme = 'dark', isEmbedded = false }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ entities: [], relationships: [] });
  const [zoom, setZoom] = useState(1);
  const [selectedTable, setSelectedTable] = useState(null);
  const toast = useToast();
  const isDark = theme === 'dark';

  useEffect(() => {
    if (dbConfig) {
      loadErDiagram();
    }
  }, [dbConfig]);

  const loadErDiagram = async () => {
    setLoading(true);
    try {
      if (window.electronAPI && window.electronAPI.db?.getErDiagram) {
        const res = await window.electronAPI.db.getErDiagram(dbConfig);
        if (res && res.success) {
          setData(res);
        } else {
          toast.showError('Error al cargar diagrama ER', res?.error || 'No se pudieron extraer las relaciones');
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
            },
            {
              name: 'comments',
              columns: [
                { name: 'id', type: 'INTEGER', isPk: true },
                { name: 'post_id', type: 'INTEGER', isFk: true },
                { name: 'user_id', type: 'INTEGER', isFk: true },
                { name: 'text', type: 'TEXT' }
              ]
            }
          ],
          relationships: [
            { fromTable: 'posts', fromColumn: 'user_id', toTable: 'users', toColumn: 'id' },
            { fromTable: 'comments', fromColumn: 'post_id', toTable: 'posts', toColumn: 'id' },
            { fromTable: 'comments', fromColumn: 'user_id', toTable: 'users', toColumn: 'id' }
          ]
        });
      }
    } catch (err) {
      toast.showError('Error en Diagrama ER', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen && !isEmbedded) return null;

  // Calculate layout grid for entity cards
  const CARD_WIDTH = 250;
  const CARD_HEIGHT = 210;
  const COLS = 3;

  const positions = {};
  data.entities.forEach((entity, idx) => {
    const col = idx % COLS;
    const row = Math.floor(idx / COLS);
    positions[entity.name] = {
      x: col * (CARD_WIDTH + 80) + 40,
      y: row * (CARD_HEIGHT + 80) + 40
    };
  });

  const content = (
    <div className={`w-full rounded-2xl border overflow-hidden flex flex-col transition-colors ${
      isDark ? 'border-white/[0.08] bg-[#0D0E15]' : 'border-slate-200 bg-white'
    } ${isEmbedded ? 'h-[600px]' : 'h-full'}`}>
      
      {/* Header Bar */}
      <div className={`px-5 py-3.5 border-b flex items-center justify-between ${
        isDark ? 'border-white/[0.08] bg-[#090A0F]' : 'border-slate-200 bg-slate-50/80'
      }`}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h3 className={`font-bold text-xs tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Diagrama Entidad-Relación (ER)
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">
              {dbConfig?.name || dbConfig?.database || 'Base de datos'} • ({data.entities.length} Tablas)
            </p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.15, 2))}
            className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              isDark ? 'bg-[#181B28] border-white/[0.08] text-slate-300 hover:bg-[#1E2235]' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
            title="Acercar Zoom"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.15, 0.5))}
            className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              isDark ? 'bg-[#181B28] border-white/[0.08] text-slate-300 hover:bg-[#1E2235]' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
            title="Alejar Zoom"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              isDark ? 'bg-[#181B28] border-white/[0.08] text-slate-300 hover:bg-[#1E2235]' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
            title="Restablecer Zoom"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {onClose && !isEmbedded && (
            <>
              <div className={`h-5 w-[1px] mx-1 ${isDark ? 'bg-white/[0.08]' : 'bg-slate-200'}`} />
              <button
                onClick={onClose}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-white hover:bg-[#1E2235]' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Interactive Canvas Area */}
      <div className={`flex-1 relative overflow-auto p-6 ${
        isDark ? 'bg-[#090A0F]' : 'bg-slate-50'
      }`}>
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-7 h-7 animate-spin text-purple-500" />
            <p className="text-xs font-mono font-medium">Analizando esquema y extrayendo relaciones SQL...</p>
          </div>
        ) : data.entities.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Table className="w-10 h-10 text-slate-600 stroke-[1.5]" />
            <p className="text-xs font-bold text-slate-400">Esta base de datos aún no tiene tablas creadas.</p>
            <p className="text-[11px] text-slate-500">Crea una tabla en la Vista General para visualizar la estructura ER.</p>
          </div>
        ) : (
          <div
            className="relative min-w-[1200px] min-h-[700px] transition-transform duration-150 origin-top-left"
            style={{ transform: `scale(${zoom})` }}
          >
            {/* SVG Connector Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              <defs>
                <marker
                  id="er-arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#a855f7" />
                </marker>
              </defs>
              {data.relationships.map((rel, i) => {
                const fromPos = positions[rel.fromTable];
                const toPos = positions[rel.toTable];
                if (!fromPos || !toPos) return null;

                const x1 = fromPos.x + CARD_WIDTH / 2;
                const y1 = fromPos.y + 50;
                const x2 = toPos.x + CARD_WIDTH / 2;
                const y2 = toPos.y + 50;

                const cx1 = x1 + (x2 - x1) / 2;
                const cy1 = y1;
                const cx2 = x1 + (x2 - x1) / 2;
                const cy2 = y2;

                return (
                  <path
                    key={i}
                    d={`M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`}
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    markerEnd="url(#er-arrowhead)"
                    className="opacity-70 hover:opacity-100 transition-opacity"
                  />
                );
              })}
            </svg>

            {/* Table Cards */}
            {data.entities.map((entity) => {
              const pos = positions[entity.name] || { x: 50, y: 50 };
              const isSelected = selectedTable === entity.name;

              return (
                <div
                  key={entity.name}
                  onClick={() => setSelectedTable(entity.name)}
                  style={{ left: `${pos.x}px`, top: `${pos.y}px`, width: `${CARD_WIDTH}px` }}
                  className={`absolute z-10 rounded-2xl border transition-all cursor-pointer shadow-sm ${
                    isSelected
                      ? 'border-purple-500 ring-2 ring-purple-500/30'
                      : isDark
                        ? 'bg-[#12141F] border-white/[0.08] hover:border-purple-500/40'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                  } ${
                    isSelected && isDark ? 'bg-purple-950/40 text-purple-200' : ''
                  }`}
                >
                  <div className={`px-4 py-2.5 border-b flex items-center justify-between rounded-t-2xl ${
                    isDark ? 'border-white/[0.08] bg-[#181B28]' : 'border-slate-200 bg-slate-100/70'
                  }`}>
                    <div className="flex items-center gap-2 font-bold text-xs truncate">
                      <Table className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span className={`truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{entity.name}</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                      isDark ? 'bg-[#12141F] text-slate-400' : 'bg-white text-slate-600 border border-slate-200'
                    }`}>
                      {entity.columns?.length || 0} cols
                    </span>
                  </div>

                  <div className="p-2.5 space-y-1 max-h-52 overflow-y-auto font-mono text-xs custom-scrollbar">
                    {entity.columns?.map((col) => (
                      <div
                        key={col.name}
                        className={`flex items-center justify-between p-1.5 rounded-lg transition-colors ${
                          isDark ? 'hover:bg-[#1A1D2D] text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          {col.isPk ? (
                            <Key className="w-3.5 h-3.5 text-amber-400 shrink-0" title="Primary Key" />
                          ) : col.isFk ? (
                            <Link2 className="w-3.5 h-3.5 text-purple-400 shrink-0" title="Foreign Key" />
                          ) : (
                            <span className="w-3.5 h-3.5 block" />
                          )}
                          <span className={col.isPk ? 'font-bold text-amber-400' : ''}>{col.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">{col.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  if (isEmbedded) return content;

  return (
    <div className="w-full h-full">
      {content}
    </div>
  );
}
