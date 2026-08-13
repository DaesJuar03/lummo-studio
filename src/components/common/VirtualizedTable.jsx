import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Trash2 } from 'lucide-react';

/**
 * VirtualizedTable - Renderizador virtualizado de alto rendimiento para tablas SQL
 * @param {Object} props
 * @param {Array} props.rows - Lista de filas JSON
 * @param {boolean} props.isDark - Tema oscuro activo
 * @param {number} [props.containerHeight=420] - Altura máxima del contenedor en px
 * @param {number} [props.rowHeight=40] - Altura aproximada de cada fila en px
 * @param {Function} [props.onDeleteRow] - Callback opcional para eliminar una fila
 */
export default function VirtualizedTable({ rows, isDark, containerHeight = 420, rowHeight = 40, onDeleteRow }) {
  const [scrollTop, setScrollTop] = useState(0);
  const [filterTerm, setFilterTerm] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  if (!rows || rows.length === 0) return null;

  const filteredRows = useMemo(() => {
    if (!filterTerm.trim()) return rows;
    const term = filterTerm.toLowerCase();
    return rows.filter((row) =>
      Object.values(row).some((val) =>
        val !== null && val !== undefined && String(val).toLowerCase().includes(term)
      )
    );
  }, [rows, filterTerm]);

  const keys = Object.keys(rows[0]);
  const totalCount = filteredRows.length;

  const handleScroll = (e) => {
    setScrollTop(e.target.scrollTop);
  };

  const buffer = 5;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - buffer);
  const endIndex = Math.min(totalCount, Math.ceil((scrollTop + containerHeight) / rowHeight) + buffer);

  const visibleRows = useMemo(() => {
    return filteredRows.slice(startIndex, endIndex).map((row, index) => ({
      row,
      originalIndex: startIndex + index
    }));
  }, [filteredRows, startIndex, endIndex]);

  const topPadding = startIndex * rowHeight;
  const bottomPadding = Math.max(0, (totalCount - endIndex) * rowHeight);

  return (
    <div className={`rounded-2xl border ${isDark ? 'border-[#27272a] bg-[#121215]' : 'border-slate-200 bg-slate-50/50'}`}>
      {/* Quick Filter Header */}
      <div className={`px-4 py-2 border-b flex items-center justify-between gap-3 text-xs font-mono min-h-[44px] ${
        isDark ? 'bg-[#09090b] border-[#27272a]' : 'bg-slate-100/80 border-slate-200'
      }`}>
        <div className="flex items-center flex-1 max-w-md">
          <AnimatePresence mode="wait">
            {!isExpanded && !filterTerm ? (
              <motion.button
                key="search-btn"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                title="Buscar en esta tabla"
                onClick={() => {
                  setIsExpanded(true);
                  setTimeout(() => inputRef.current?.focus(), 80);
                }}
                className={`p-2 rounded-xl border flex items-center justify-center transition-all ${
                  isDark
                    ? 'bg-[#18181b] border-[#27272a] text-slate-300 hover:text-white hover:border-blue-500/50 shadow-xs'
                    : 'bg-white border-slate-300 text-slate-700 hover:text-slate-900 hover:border-blue-500 shadow-xs'
                }`}
              >
                <Search className="h-4 w-4 text-blue-500" />
              </motion.button>
            ) : (
              <motion.div
                key="search-input"
                initial={{ width: 40, opacity: 0 }}
                animate={{ width: '100%', opacity: 1 }}
                exit={{ width: 40, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono w-full ${
                  isDark
                    ? 'bg-[#18181b] border-blue-500/60 text-slate-200 shadow-sm shadow-blue-500/10'
                    : 'bg-white border-blue-500 text-slate-900 shadow-sm'
                }`}
              >
                <Search className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={filterTerm}
                  onChange={(e) => setFilterTerm(e.target.value)}
                  placeholder="Filtrar datos al instante en esta tabla..."
                  className="w-full bg-transparent focus:outline-none text-xs font-mono"
                />
                <button
                  onClick={() => {
                    setFilterTerm('');
                    setIsExpanded(false);
                  }}
                  className={`p-1 rounded-lg transition-colors shrink-0 ${
                    isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  title="Cerrar búsqueda"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <span className="text-[11px] text-slate-500 font-semibold shrink-0">
          {filterTerm ? `${filteredRows.length} / ${rows.length} coincidencias` : `${rows.length} filas`}
        </span>
      </div>

      <div 
        ref={containerRef}
        onScroll={handleScroll}
        style={{ maxHeight: `${containerHeight}px` }}
        className="overflow-auto scrollbar-thin"
      >
        <table className="w-full text-left text-xs font-mono">
          <thead className={`sticky top-0 z-10 border-b text-[11px] uppercase ${
            isDark ? 'bg-[#1e1e1e] border-[#2a2a2a] text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'
          }`}>
            <tr>
              <th className="px-3 py-3 w-12 text-center text-slate-500">#</th>
              {keys.map((key) => (
                <th key={key} className="px-4 py-3 font-bold whitespace-nowrap">{key}</th>
              ))}
            </tr>
          </thead>
          <tbody className={`divide-y ${isDark ? 'divide-[#2a2a2a] text-slate-300' : 'divide-slate-200 text-slate-800'}`}>
            {topPadding > 0 && (
              <tr>
                <td colSpan={keys.length + 1} style={{ height: `${topPadding}px` }} />
              </tr>
            )}
            {visibleRows.map(({ row, originalIndex }) => (
              <tr 
                key={originalIndex} 
                style={{ height: `${rowHeight}px` }}
                className={isDark ? 'hover:bg-[#202020] group' : 'hover:bg-white group'}
              >
                <td className="px-2 py-2 text-center text-[10px] text-slate-500 font-mono select-none">
                  {onDeleteRow ? (
                    <button
                      onClick={() => onDeleteRow(row, originalIndex)}
                      className="p-1 text-slate-400 hover:text-rose-500 transition-colors opacity-70 group-hover:opacity-100"
                      title="Eliminar esta fila"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <span>{originalIndex + 1}</span>
                  )}
                </td>
                {Object.values(row).map((val, cellIdx) => (
                  <td key={cellIdx} className="px-4 py-2 whitespace-nowrap max-w-xs truncate" title={String(val)}>
                    {val === null || val === undefined ? (
                      <span className="italic text-slate-500">NULL</span>
                    ) : (
                      String(val)
                    )}
                  </td>
                ))}
              </tr>
            ))}
            {bottomPadding > 0 && (
              <tr>
                <td colSpan={keys.length + 1} style={{ height: `${bottomPadding}px` }} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className={`px-4 py-2 border-t text-[10px] font-mono flex items-center justify-between ${
        isDark ? 'border-[#2a2a2a] bg-[#1a1a1a] text-slate-400' : 'border-slate-200 bg-slate-100 text-slate-600'
      }`}>
        <span>Total: {totalCount} fila(s)</span>
        <span>Mostrando filas {startIndex + 1} - {Math.min(totalCount, endIndex)} (Virtualizado)</span>
      </div>
    </div>
  );
}
