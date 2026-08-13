import React, { useState } from 'react';
import { X, Play, Table, Check, Network, Download } from 'lucide-react';
import ErDiagramModal from './ErDiagramModal';
import DataExportModal from './DataExportModal';

export default function SQLiteWorkbench({ onClose, theme }) {
  const [query, setQuery] = useState('SELECT * FROM users;');
  const [selectedTable, setSelectedTable] = useState('users');
  const [tablesList, setTablesList] = useState(['users', 'projects', 'sessions', 'settings_config']);
  const [showErModal, setShowErModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [results, setResults] = useState([
    { id: 1, name: 'Admin Lummo', email: 'admin@lummo.local', role: 'Administrator', status: 'Active' },
    { id: 2, name: 'Desarrollador', email: 'dev@lummo.local', role: 'Developer', status: 'Active' },
    { id: 3, name: 'Testing Demo', email: 'test@lummo.local', role: 'Tester', status: 'Inactive' }
  ]);
  const [message, setMessage] = useState('Consulta ejecutada con éxito (3 filas devueltas)');

  const isDark = theme === 'dark';

  React.useEffect(() => {
    if (window.electronAPI?.db?.getSchema) {
      window.electronAPI.db.getSchema({ id: 'sqlite' }).then((res) => {
        if (res.success && res.tables) {
          const keys = Object.keys(res.tables);
          if (keys.length > 0) {
            setTablesList(keys);
            const firstTbl = keys[0];
            setSelectedTable(firstTbl);
            setResults(res.tables[firstTbl] || []);
            setQuery(`SELECT * FROM ${firstTbl};`);
          }
        }
      });
    }
  }, []);

  const handleRunQuery = async () => {
    if (window.electronAPI?.db?.executeQuery) {
      const res = await window.electronAPI.db.executeQuery({ id: 'sqlite' }, query);
      if (res.success) {
        setResults(res.rows || []);
        setMessage(`Consulta ejecutada con éxito (${res.count} filas / ${res.executionTimeMs || 0} ms)`);
        if (/CREATE|INSERT|UPDATE|DELETE|DROP|ALTER/i.test(query)) {
          const schemaRes = await window.electronAPI.db.getSchema({ id: 'sqlite' });
          if (schemaRes.success) setTablesList(Object.keys(schemaRes.tables));
        }
      } else {
        setMessage(`Error SQL: ${res.error}`);
      }
    } else {
      setMessage(`Consulta "${query.substring(0, 30)}..." ejecutada correctamente.`);
    }
  };

  const handleSelectTable = async (tbl) => {
    setSelectedTable(tbl);
    const sqlStr = `SELECT * FROM ${tbl};`;
    setQuery(sqlStr);

    if (window.electronAPI?.db?.executeQuery) {
      const res = await window.electronAPI.db.executeQuery({ id: 'sqlite' }, sqlStr);
      if (res.success) {
        setResults(res.rows || []);
        setMessage(`Consulta "${sqlStr}" ejecutada (${res.count} filas)`);
      }
    } else {
      if (tbl === 'projects') {
        setResults([
          { id: 101, project_name: 'mi-proyecto-react', port: 5173, status: 'RUNNING' },
          { id: 102, project_name: 'api-express', port: 3000, status: 'STOPPED' }
        ]);
        setMessage('Consulta "SELECT * FROM projects;" ejecutada (2 filas)');
      } else {
        setResults([
          { id: 1, name: 'Admin Lummo', email: 'admin@lummo.local', role: 'Administrator', status: 'Active' },
          { id: 2, name: 'Desarrollador', email: 'dev@lummo.local', role: 'Developer', status: 'Active' }
        ]);
        setMessage(`Consulta "SELECT * FROM ${tbl};" ejecutada`);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className={`w-full max-w-5xl h-[620px] rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${
        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
          isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div>
            <h3 className="font-extrabold text-base">Visualizador de Tablas & Workbench SQL</h3>
            <p className="text-xs text-slate-500">Explorador de registros y ejecutor de consultas en tiempo real</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowErModal(true)}
              className={`text-xs py-1.5 px-3 rounded-xl border font-semibold flex items-center gap-1.5 transition-colors ${
                isDark ? 'bg-slate-800 border-slate-700 text-purple-400 hover:bg-slate-700' : 'bg-slate-100 border-slate-300 text-purple-600 hover:bg-slate-200'
              }`}
              title="Ver Diagrama ER"
            >
              <Network className="w-3.5 h-3.5" />
              <span>Diagrama ER</span>
            </button>

            <button
              onClick={() => setShowExportModal(true)}
              className={`text-xs py-1.5 px-3 rounded-xl border font-semibold flex items-center gap-1.5 transition-colors ${
                isDark ? 'bg-slate-800 border-slate-700 text-emerald-400 hover:bg-slate-700' : 'bg-slate-100 border-slate-300 text-emerald-600 hover:bg-slate-200'
              }`}
              title="Exportar Datos (CSV, JSON, Excel, SQL)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar</span>
            </button>

            <button 
              onClick={onClose} 
              className={`p-2 rounded-xl transition-colors ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
              }`}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Layout */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Tables Sidebar */}
          <div className={`w-56 border-r p-4 space-y-3 shrink-0 ${
            isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/80 border-slate-200'
          }`}>
            <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider block">
              Tablas del Esquema
            </span>

            <div className="space-y-1">
              {tablesList.map((tbl) => (
                <button
                  key={tbl}
                  onClick={() => handleSelectTable(tbl)}
                  className={`w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all text-left ${
                    selectedTable === tbl
                      ? 'bg-blue-600 text-white shadow-sm'
                      : isDark
                      ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
                  }`}
                >
                  <Table className="h-3.5 w-3.5" />
                  <span>{tbl}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Right SQL Editor and Data Grid */}
          <div className={`flex-1 p-6 overflow-y-auto space-y-4 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
            
            {/* SQL Query Editor Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-slate-500 uppercase">Editor SQL</span>
                <span className="text-slate-400">Database: local.db</span>
              </div>

              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                rows={3}
                className={`w-full border rounded-xl p-3 text-xs font-mono font-bold focus:outline-none ${
                  isDark ? 'bg-slate-950 border-slate-800 text-blue-400 focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-blue-600 focus:border-blue-600'
                }`}
              />

              {/* SQL Autocomplete Helper Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-mono font-bold text-slate-500 mr-1">Autocompletar:</span>
                {['SELECT * FROM', 'WHERE', 'ORDER BY id DESC', 'LIMIT 50'].map((kw) => (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => setQuery((prev) => `${prev} ${kw}`.trim())}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-md border font-semibold transition-all ${
                      isDark ? 'bg-slate-800/80 border-slate-700 text-blue-400 hover:bg-slate-700' : 'bg-slate-100 border-slate-300 text-blue-700 hover:bg-slate-200'
                    }`}
                  >
                    + {kw}
                  </button>
                ))}
                {tablesList.map((tbl) => (
                  <button
                    key={tbl}
                    type="button"
                    onClick={() => setQuery((prev) => `${prev} "${tbl}"`.trim())}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-md border font-semibold transition-all ${
                      isDark ? 'bg-purple-950/40 border-purple-800/40 text-purple-300 hover:bg-purple-900/60' : 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100'
                    }`}
                  >
                    + "{tbl}"
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border-b pb-3 border-slate-200/40">
              <button
                onClick={handleRunQuery}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center space-x-1.5 shadow-sm transition-all"
              >
                <Play className="h-3.5 w-3.5 fill-white" />
                <span>Ejecutar Consulta</span>
              </button>

              {message && (
                <span className="text-xs text-emerald-600 font-mono flex items-center gap-1 font-semibold">
                  <Check className="h-3.5 w-3.5" /> {message}
                </span>
              )}
            </div>

            {/* Results Table Grid */}
            <div className="space-y-2 pt-1">
              <h4 className="text-xs font-bold text-slate-500 uppercase font-mono">
                Registros Devueltos ({results.length})
              </h4>

              <div className={`overflow-x-auto rounded-2xl border ${
                isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50/50'
              }`}>
                <table className="w-full text-left text-xs font-mono">
                  <thead className={`border-b text-[11px] uppercase ${
                    isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'
                  }`}>
                    <tr>
                      {results.length > 0 && Object.keys(results[0]).map((key) => (
                        <th key={key} className="px-4 py-2.5 font-bold">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-slate-800 text-slate-300' : 'divide-slate-200 text-slate-800'}`}>
                    {results.map((row, idx) => (
                      <tr key={idx} className={isDark ? 'hover:bg-slate-900/80' : 'hover:bg-white'}>
                        {Object.values(row).map((val, cellIdx) => (
                          <td key={cellIdx} className="px-4 py-2.5 whitespace-nowrap">
                            {String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* ER Diagram Modal */}
      <ErDiagramModal
        isOpen={showErModal}
        onClose={() => setShowErModal(false)}
        dbConfig={{ id: 'sqlite', name: 'SQLite (Lummo Local)' }}
      />

      {/* Advanced Multi-format Data Export Modal */}
      <DataExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        tableName={selectedTable}
        rows={results}
        columns={results.length > 0 ? Object.keys(results[0]) : []}
      />
    </div>
  );
}
