import React, { useState, useRef, useMemo } from 'react';

/**
 * VirtualizedTable - Renderizador virtualizado de alto rendimiento para tablas SQL
 * @param {Object} props
 * @param {Array} props.rows - Lista de filas JSON
 * @param {boolean} props.isDark - Tema oscuro activo
 * @param {number} [props.containerHeight=420] - Altura máxima del contenedor en px
 * @param {number} [props.rowHeight=40] - Altura aproximada de cada fila en px
 */
export default function VirtualizedTable({ rows, isDark, containerHeight = 420, rowHeight = 40 }) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  if (!rows || rows.length === 0) return null;

  const keys = Object.keys(rows[0]);
  const totalCount = rows.length;

  const handleScroll = (e) => {
    setScrollTop(e.target.scrollTop);
  };

  const buffer = 5;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - buffer);
  const endIndex = Math.min(totalCount, Math.ceil((scrollTop + containerHeight) / rowHeight) + buffer);

  const visibleRows = useMemo(() => {
    return rows.slice(startIndex, endIndex).map((row, index) => ({
      row,
      originalIndex: startIndex + index
    }));
  }, [rows, startIndex, endIndex]);

  const topPadding = startIndex * rowHeight;
  const bottomPadding = Math.max(0, (totalCount - endIndex) * rowHeight);

  return (
    <div className={`rounded-2xl border ${isDark ? 'border-[#27272a] bg-[#121215]' : 'border-slate-200 bg-slate-50/50'}`}>
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
                className={isDark ? 'hover:bg-[#202020]' : 'hover:bg-white'}
              >
                <td className="px-3 py-2 text-center text-[10px] text-slate-500 font-mono select-none">
                  {originalIndex + 1}
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
