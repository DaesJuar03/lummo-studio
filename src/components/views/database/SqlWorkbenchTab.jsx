import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Code, 
  Play, 
  Plus, 
  RefreshCw, 
  Edit2, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';

export default function SqlWorkbenchTab({
  db,
  theme,
  tablesList = [],
  selectedTable,
  onSelectTable,
  onOpenSchemaDesigner,
  onNotice
}) {
  const isDark = theme === 'dark';
  const [activeSubTab, setActiveSubTab] = useState('tables'); // 'tables' | 'query'

  // Pagination & rows
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalRows, setTotalRows] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('ASC');
  const [tableRows, setTableRows] = useState([]);
  const [tableColumns, setTableColumns] = useState([]);
  const [isLoadingRows, setIsLoadingRows] = useState(false);

  // In-line editing
  const [editingCell, setEditingCell] = useState(null);

  // Query editor
  const [query, setQuery] = useState('');
  const [queryMessage, setQueryMessage] = useState('');

  const isRunning = db?.status === 'RUNNING' || db?.status === 'READY';

  const fetchTableRows = async (tableName, page = 1, limit = 25, sortCol = null, sortDir = 'ASC') => {
    if (!tableName) return;
    setIsLoadingRows(true);

    if (window.electronAPI?.db?.getTableRows && isRunning) {
      try {
        const res = await window.electronAPI.db.getTableRows({
          config: db,
          tableName,
          page,
          limit,
          sortColumn: sortCol,
          sortDir
        });

        if (res && res.success) {
          setTableRows(res.rows || []);
          setTableColumns(res.columns || []);
          setTotalRows(res.totalRows || 0);
          setCurrentPage(res.page || 1);
          setTotalPages(res.totalPages || 1);
          setIsLoadingRows(false);
          return;
        }
      } catch (e) {
        console.warn('Error fetching paginated rows:', e);
      }
    }

    // Demo fallback
    const demoRows = [
      { id: 1, name: 'Admin Lummo', email: 'admin@lummo.local', role: 'Administrator', status: 'Active' },
      { id: 2, name: 'Desarrollador', email: 'dev@lummo.local', role: 'Developer', status: 'Active' },
      { id: 3, name: 'Tester QA', email: 'qa@lummo.local', role: 'QA Engineer', status: 'Active' }
    ];
    setTableRows(demoRows);
    setTableColumns(Object.keys(demoRows[0]));
    setTotalRows(demoRows.length);
    setCurrentPage(1);
    setTotalPages(1);
    setIsLoadingRows(false);
  };

  useEffect(() => {
    if (selectedTable) {
      fetchTableRows(selectedTable, currentPage, pageSize, sortColumn, sortDirection);
      setQuery(`SELECT * FROM ${selectedTable} LIMIT ${pageSize};`);
    }
  }, [selectedTable, currentPage, pageSize, sortColumn, sortDirection]);

  const handleSaveCellEdit = async (rowIndex, colName, originalVal) => {
    if (!editingCell || editingCell.rowIndex !== rowIndex || editingCell.colName !== colName) return;
    const newVal = editingCell.value;

    if (newVal !== originalVal) {
      const row = tableRows[rowIndex];
      const primaryKey = row && row.id !== undefined ? 'id' : Object.keys(row)[0];
      const pkVal = row[primaryKey];

      if (window.electronAPI?.db?.updateTableRow && isRunning) {
        await window.electronAPI.db.updateTableRow({
          config: db,
          tableName: selectedTable,
          primaryKey,
          primaryKeyValue: pkVal,
          column: colName,
          newValue: newVal
        });
      }

      const updated = [...tableRows];
      updated[rowIndex] = { ...updated[rowIndex], [colName]: newVal };
      setTableRows(updated);
      if (onNotice) onNotice(`Celda [${colName}] actualizada.`);
    }
    setEditingCell(null);
  };

  const handleExecuteSql = async () => {
    if (!query.trim()) return;
    if (window.electronAPI?.db?.executeQuery) {
      const res = await window.electronAPI.db.executeQuery(db, query);
      if (res && res.success) {
        setQueryMessage(`Consulta ejecutada con éxito (${res.count} filas / ${res.executionTimeMs || 0} ms)`);
        if (res.rows) {
          setTableRows(res.rows);
          setTableColumns(res.columns || Object.keys(res.rows[0] || {}));
        }
      } else {
        setQueryMessage(`Error: ${res?.error}`);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Sub Navigation Tabs */}
      <div className={`flex items-center space-x-2 border-b pb-2 ${isDark ? 'border-white/[0.08]' : 'border-slate-200'}`}>
        <button
          onClick={() => setActiveSubTab('tables')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
            activeSubTab === 'tables'
              ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.25)]'
              : isDark ? 'text-slate-400 hover:text-white hover:bg-[#1E1E1E]' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Table className="h-3.5 w-3.5" />
          <span>Visor de Tablas & Datos</span>
        </button>

        <button
          onClick={() => setActiveSubTab('query')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
            activeSubTab === 'query'
              ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.25)]'
              : isDark ? 'text-slate-400 hover:text-white hover:bg-[#1E1E1E]' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Code className="h-3.5 w-3.5" />
          <span>Editor de Consultas SQL</span>
        </button>
      </div>

      {activeSubTab === 'tables' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Tables Sidebar */}
          <div className="lg:col-span-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase">Tablas ({tablesList.length})</span>
              <button
                onClick={onOpenSchemaDesigner}
                className="p-1 text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                title="Diseñar nueva tabla"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className={`border rounded-2xl p-2 max-h-[500px] overflow-y-auto space-y-1 custom-scrollbar ${
              isDark ? 'bg-[#1E1E1E] border-white/[0.08]' : 'bg-white border-slate-200'
            }`}>
              {tablesList.map(t => (
                <div
                  key={t}
                  onClick={() => {
                    if (onSelectTable) onSelectTable(t);
                    setCurrentPage(1);
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-mono font-bold cursor-pointer transition-all flex items-center justify-between ${
                    selectedTable === t
                      ? 'bg-blue-600/15 border-blue-500 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.15)]'
                      : isDark ? 'bg-[#252525] border-white/[0.06] text-[#E5E5E5] hover:bg-[#303030] hover:border-white/[0.12]' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <span className="truncate">{t}</span>
                  <Table className="h-3.5 w-3.5 opacity-60 shrink-0 ml-2" />
                </div>
              ))}
            </div>
          </div>

          {/* Table Data Grid */}
          <div className={`lg:col-span-9 border rounded-2xl overflow-hidden shadow-sm ${
            isDark ? 'bg-[#1E1E1E] border-white/[0.08]' : 'bg-white border-slate-200'
          }`}>
            <div className={`p-4 border-b flex items-center justify-between ${
              isDark ? 'bg-[#141414] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center space-x-2">
                <Table className="h-4 w-4 text-blue-400" />
                <span className="font-mono font-bold text-xs text-white">{selectedTable || 'Selecciona una tabla'}</span>
                <span className="text-[11px] text-slate-400 font-mono">({totalRows} registros)</span>
              </div>

              <div className="text-[11px] text-slate-400 font-mono flex items-center space-x-1">
                <Edit2 className="h-3 w-3 text-blue-400" />
                <span>Doble clic en una celda para editar</span>
              </div>
            </div>

            <div className="overflow-x-auto max-h-96 custom-scrollbar">
              {isLoadingRows ? (
                <div className="py-20 text-center text-xs font-mono text-slate-400">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-500" />
                  <span>Cargando filas de la base de datos...</span>
                </div>
              ) : tableRows.length === 0 ? (
                <div className="py-20 text-center text-xs font-mono text-slate-400">
                  Esta tabla no contiene registros.
                </div>
              ) : (
                <table className="w-full text-xs font-mono text-left border-collapse">
                  <thead>
                    <tr className={`border-b ${isDark ? 'bg-[#141414] border-white/[0.08] text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>
                      {tableColumns.map(col => (
                        <th
                          key={col}
                          onClick={() => {
                            if (sortColumn === col) {
                              setSortDirection(prev => prev === 'ASC' ? 'DESC' : 'ASC');
                            } else {
                              setSortColumn(col);
                              setSortDirection('ASC');
                            }
                          }}
                          className="p-3 font-bold border-r border-slate-700/20 cursor-pointer hover:text-blue-400 select-none"
                        >
                          {col} {sortColumn === col ? (sortDirection === 'ASC' ? '↑' : '↓') : ''}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className={`border-b transition-colors ${
                          isDark ? 'border-white/[0.06] hover:bg-[#252525]' : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {tableColumns.map(col => {
                          const val = row[col];
                          const isEditing = editingCell && editingCell.rowIndex === rIdx && editingCell.colName === col;

                          return (
                            <td
                              key={col}
                              onDoubleClick={() => setEditingCell({ rowIndex: rIdx, colName: col, value: val ?? '' })}
                              className="p-2.5 border-r border-slate-700/20 truncate max-w-xs cursor-pointer"
                            >
                              {isEditing ? (
                                <input
                                  type="text"
                                  autoFocus
                                  value={editingCell.value}
                                  onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                                  onBlur={() => handleSaveCellEdit(rIdx, col, val)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveCellEdit(rIdx, col, val);
                                    if (e.key === 'Escape') setEditingCell(null);
                                  }}
                                  className="w-full px-1.5 py-0.5 rounded bg-[#141414] border border-blue-500 text-white font-mono text-xs focus:outline-none shadow-[0_0_10px_rgba(59,130,246,0.25)]"
                                />
                              ) : (
                                <span className={val === null ? 'text-slate-600 italic' : ''}>
                                  {val === null ? 'NULL' : typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Footer */}
            <div className={`p-3.5 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono ${
              isDark ? 'bg-[#141414] border-white/[0.08] text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              <div className="flex items-center space-x-2">
                <span>Filas por página:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className={`px-2 py-1 rounded-lg border font-mono font-bold focus:outline-none transition-all ${
                    isDark ? 'bg-[#252525] border-white/[0.08] text-white focus:border-blue-500' : 'bg-white border-slate-300'
                  }`}
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="flex items-center space-x-3">
                <span>
                  Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong> (Total: {totalRows})
                </span>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage <= 1}
                    className={`p-1.5 rounded-lg border disabled:opacity-30 transition-colors cursor-pointer ${
                      isDark ? 'bg-[#252525] border-white/[0.08] text-white hover:bg-[#303030]' : 'bg-white border-slate-300'
                    }`}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage >= totalPages}
                    className={`p-1.5 rounded-lg border disabled:opacity-30 transition-colors cursor-pointer ${
                      isDark ? 'bg-[#252525] border-white/[0.08] text-white hover:bg-[#303030]' : 'bg-white border-slate-300'
                    }`}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'query' && (
        <div className={`p-6 border rounded-2xl space-y-4 ${
          isDark ? 'bg-[#1E1E1E] border-white/[0.08]' : 'bg-white border-slate-200'
        }`}>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300">Editor SQL:</label>
              <button
                onClick={handleExecuteSql}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 hover:shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <Play className="h-3.5 w-3.5 fill-white" />
                <span>Ejecutar SQL</span>
              </button>
            </div>
            <textarea
              rows={8}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="SELECT * FROM users;"
              className={`w-full p-3.5 font-mono text-xs rounded-xl border focus:outline-none transition-all ${
                isDark ? 'bg-[#141414] border-white/[0.08] text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            />
          </div>

          {queryMessage && (
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono text-xs">
              {queryMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
