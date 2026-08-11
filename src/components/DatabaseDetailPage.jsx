import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Database, 
  Table, 
  Play, 
  Square,
  Plus, 
  Copy, 
  Check, 
  Upload, 
  Code,
  HardDrive,
  Activity,
  Trash2,
  FileSpreadsheet,
  FileJson,
  FileCode
} from 'lucide-react';
import ImportExportSqlModal from './ImportExportSqlModal';

export default function DatabaseDetailPage({
  db,
  onBack,
  theme
}) {
  const [activeSubTab, setActiveSubTab] = useState('overview'); // 'overview' | 'tables' | 'query'
  const [selectedTable, setSelectedTable] = useState('');
  const [query, setQuery] = useState('');
  const [queryMessage, setQueryMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const [exportNotice, setExportNotice] = useState('');

  // Database Execution Status ('RUNNING' vs 'STOPPED')
  const [dbRunningStatus, setDbRunningStatus] = useState(db?.status || 'READY');

  // Form State for Table Creation (with advanced column builder!)
  const [showNewTableForm, setShowNewTableForm] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [newTableCols, setNewTableCols] = useState([
    { name: 'id', type: 'INT (PRIMARY KEY)' },
    { name: 'nombre', type: 'VARCHAR(255)' },
    { name: 'fecha_creacion', type: 'DATETIME' }
  ]);

  // Form State for Record Insertion
  const [showInsertRowForm, setShowInsertRowForm] = useState(false);
  const [insertData, setInsertData] = useState({ col1: '', col2: '', col3: '' });

  const isDark = theme === 'dark';
  const isRunning = dbRunningStatus === 'RUNNING' || dbRunningStatus === 'READY';

  const toggleDbExecution = () => {
    setDbRunningStatus(prev => (prev === 'RUNNING' || prev === 'READY' ? 'STOPPED' : 'RUNNING'));
  };

  // State holding Tables and their Row Records!
  const [dbData, setDbData] = useState(() => {
    if (db?.id === 'sqlite') {
      return {
        users: [
          { id: 1, name: 'Admin Lummo', email: 'admin@lummo.local', role: 'Administrator', status: 'Active' },
          { id: 2, name: 'Desarrollador', email: 'dev@lummo.local', role: 'Developer', status: 'Active' }
        ],
        projects: [
          { id: 101, project_name: 'mi-proyecto-react', tech: 'Vite + React', port: 5173, status: 'RUNNING' },
          { id: 102, project_name: 'api-express', tech: 'Node.js', port: 3000, status: 'STOPPED' }
        ],
        sessions: [
          { session_id: 'sess-84920', user_id: 1, created_at: '2026-08-10 15:30:00' }
        ],
        settings_config: [
          { key: 'theme', value: 'dark', updated_at: '2026-08-10' }
        ]
      };
    }
    // New databases start 100% EMPTY!
    return {};
  });

  const tablesList = Object.keys(dbData);

  useEffect(() => {
    if (tablesList.length > 0) {
      if (!selectedTable || !dbData[selectedTable]) {
        const firstTbl = tablesList[0];
        setSelectedTable(firstTbl);
        setQuery(`SELECT * FROM ${firstTbl};`);
      }
    } else {
      setSelectedTable('');
      setQuery('');
    }
  }, [dbData]);

  if (!db) return null;

  const connectionString = db.id === 'sqlite' 
    ? 'sqlite://local.db'
    : `${db.id}://root@127.0.0.1:${db.port || 3306}/${db.name.toLowerCase().replace(/\s+/g, '_')}`;

  const handleCopyConn = () => {
    navigator.clipboard.writeText(connectionString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddColumnField = () => {
    setNewTableCols([...newTableCols, { name: '', type: 'VARCHAR(255)' }]);
  };

  const handleRemoveColumnField = (idx) => {
    setNewTableCols(newTableCols.filter((_, i) => i !== idx));
  };

  const handleColumnChange = (idx, field, val) => {
    const updated = [...newTableCols];
    updated[idx][field] = val;
    setNewTableCols(updated);
  };

  const handleCreateTable = (tableNameStr) => {
    const formatted = tableNameStr.trim().toLowerCase().replace(/\s+/g, '_');
    if (!formatted) return;

    if (!dbData[formatted]) {
      setDbData(prev => ({
        ...prev,
        [formatted]: []
      }));
      setSelectedTable(formatted);
      setQuery(`SELECT * FROM ${formatted};`);
      setQueryMessage(`¡Tabla "${formatted}" creada con esquemas de columna!`);
    } else {
      setQueryMessage(`La tabla "${formatted}" ya existe.`);
    }
    setNewTableName('');
    setShowNewTableForm(false);
  };

  const handleExportJSON = () => {
    if (!selectedTable || !dbData[selectedTable]) return;
    const jsonStr = JSON.stringify(dbData[selectedTable], null, 2);
    navigator.clipboard.writeText(jsonStr);
    setExportNotice('¡Tabla copiada en formato JSON!');
    setTimeout(() => setExportNotice(''), 3000);
  };

  const handleExportCSV = () => {
    if (!selectedTable || !dbData[selectedTable] || dbData[selectedTable].length === 0) return;
    const rows = dbData[selectedTable];
    const headers = Object.keys(rows[0]).join(',');
    const csvLines = rows.map(r => Object.values(r).join(','));
    const csvContent = [headers, ...csvLines].join('\n');
    navigator.clipboard.writeText(csvContent);
    setExportNotice('¡Tabla copiada en formato CSV!');
    setTimeout(() => setExportNotice(''), 3000);
  };

  const handleExportSQL = () => {
    if (!selectedTable || !dbData[selectedTable] || dbData[selectedTable].length === 0) return;
    const rows = dbData[selectedTable];
    const sqlStatements = rows.map(r => {
      const keys = Object.keys(r).join(', ');
      const vals = Object.values(r).map(v => typeof v === 'string' ? `'${v}'` : v).join(', ');
      return `INSERT INTO ${selectedTable} (${keys}) VALUES (${vals});`;
    }).join('\n');
    navigator.clipboard.writeText(sqlStatements);
    setExportNotice('¡Dump de consultas SQL copiado!');
    setTimeout(() => setExportNotice(''), 3000);
  };

  const handleInsertRow = (e) => {
    e.preventDefault();
    if (!selectedTable || !dbData[selectedTable]) return;

    const currentRows = dbData[selectedTable];
    const newId = currentRows.length + 1;
    const newRecord = {
      id: newId,
      col_1: insertData.col1 || `Registro ${newId}`,
      col_2: insertData.col2 || 'Dato Demo',
      created_at: new Date().toISOString().split('T')[0]
    };

    setDbData(prev => ({
      ...prev,
      [selectedTable]: [...(prev[selectedTable] || []), newRecord]
    }));

    setInsertData({ col1: '', col2: '', col3: '' });
    setShowInsertRowForm(false);
    setQueryMessage(`¡Fila insertada en "${selectedTable}"!`);
  };

  const handleDropTable = (tblName) => {
    setDbData(prev => {
      const copy = { ...prev };
      delete copy[tblName];
      return copy;
    });
    setSelectedTable('');
    setQueryMessage(`Tabla "${tblName}" eliminada de la base de datos.`);
  };

  const handleRunQuery = () => {
    const trimmed = query.trim().toUpperCase();

    if (trimmed.startsWith('CREATE TABLE')) {
      const match = query.match(/CREATE TABLE\s+([a-zA-Z0-9_]+)/i);
      const tblName = match ? match[1] : 'nueva_tabla';
      handleCreateTable(tblName);
    } else if (trimmed.startsWith('INSERT INTO')) {
      const match = query.match(/INSERT INTO\s+([a-zA-Z0-9_]+)/i);
      const tblName = match ? match[1] : selectedTable;
      if (tblName && dbData[tblName]) {
        const newRecord = { id: (dbData[tblName].length + 1), val: 'Dato desde Query', date: new Date().toLocaleTimeString() };
        setDbData(prev => ({ ...prev, [tblName]: [...prev[tblName], newRecord] }));
        setQueryMessage(`Fila insertada en "${tblName}" vía Query SQL.`);
      } else {
        setQueryMessage('Tabla no encontrada para insertar.');
      }
    } else if (trimmed.startsWith('DROP TABLE')) {
      const match = query.match(/DROP TABLE\s+([a-zA-Z0-9_]+)/i);
      const tblName = match ? match[1] : selectedTable;
      if (tblName) handleDropTable(tblName);
    } else if (trimmed.startsWith('SELECT')) {
      setQueryMessage(`Consulta "${query.substring(0, 30)}..." ejecutada correctamente.`);
    } else {
      setQueryMessage(`Comando SQL ejecutado con éxito.`);
    }
  };

  const activeRows = selectedTable && dbData[selectedTable] ? dbData[selectedTable] : [];

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.2 }}
      className={`p-6 max-w-7xl mx-auto space-y-6 min-h-[calc(100vh-60px)] ${
        isDark ? 'bg-[#161616] text-[#e4e4e7]' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Top Header Navigation */}
      <div className={`flex items-center justify-between border-b pb-4 ${isDark ? 'border-[#2a2a2a]' : 'border-slate-200'}`}>
        <div className="flex items-center space-x-4">
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={onBack}
            className={`p-2 px-3 rounded-xl border flex items-center space-x-2 text-xs font-bold transition-all ${
              isDark ? 'bg-[#1e1e1e] border-[#2a2a2a] text-slate-300 hover:bg-[#282828]' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver</span>
          </motion.button>

          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center font-bold ${
              isDark ? 'bg-blue-950/60 border-blue-800 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600'
            }`}>
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className={`text-xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{db.name}</h1>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border flex items-center gap-1.5 ${
                  isRunning ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : isDark ? 'bg-[#181818] text-slate-400 border-[#2e2e2e]' : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                  {isRunning ? 'EJECUTANDO' : 'APAGADO'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{connectionString}</p>
            </div>
          </div>
        </div>

        {/* Top Control Actions: Start / Stop Execution Toggle */}
        <div className="flex items-center space-x-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={toggleDbExecution}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all text-white shadow-xs ${
              isRunning ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isRunning ? <Square className="h-3.5 w-3.5 fill-white" /> : <Play className="h-3.5 w-3.5 fill-white" />}
            <span>{isRunning ? 'Apagar Servidor BD' : 'Ejecutar Servidor BD'}</span>
          </motion.button>

          <button
            onClick={handleCopyConn}
            className={`text-xs py-2 px-3 rounded-xl border font-semibold flex items-center space-x-1.5 transition-colors ${
              isDark ? 'bg-[#1e1e1e] border-[#2a2a2a] text-slate-300 hover:bg-[#282828]' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
            <span>{copied ? '¡Copiado!' : 'Copiar Cadena URL'}</span>
          </button>

          <button
            onClick={() => setShowImportExport(true)}
            className={`text-xs py-2 px-3 rounded-xl border font-semibold flex items-center space-x-1.5 transition-colors ${
              isDark ? 'bg-[#1e1e1e] border-[#2a2a2a] text-slate-300 hover:bg-[#282828]' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Upload className="h-3.5 w-3.5 text-blue-500" />
            <span>Dump SQL</span>
          </button>
        </div>
      </div>

      {/* Workspace Navigation Sub-tabs */}
      <div className={`flex items-center space-x-2 border-b pb-3 ${isDark ? 'border-[#2a2a2a]' : 'border-slate-200'}`}>
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'overview'
              ? 'bg-blue-600 text-white shadow-sm'
              : isDark ? 'text-slate-400 hover:bg-[#242424] hover:text-white' : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
          }`}
        >
          Vista General (Overview)
        </button>

        <button
          onClick={() => setActiveSubTab('tables')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
            activeSubTab === 'tables'
              ? 'bg-blue-600 text-white shadow-sm'
              : isDark ? 'text-slate-400 hover:bg-[#242424] hover:text-white' : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
          }`}
        >
          <Table className="h-3.5 w-3.5" />
          <span>Visualizar Tablas ({tablesList.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('query')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
            activeSubTab === 'query'
              ? 'bg-blue-600 text-white shadow-sm'
              : isDark ? 'text-slate-400 hover:bg-[#242424] hover:text-white' : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
          }`}
        >
          <Code className="h-3.5 w-3.5" />
          <span>Realizar Consultas SQL</span>
        </button>
      </div>

      {/* SUB-TAB 1: VISTA GENERAL (OVERVIEW) */}
      {activeSubTab === 'overview' && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className={`pure-card p-5 space-y-2 border ${isDark ? 'border-[#2a2a2a]' : 'border-slate-200'}`}>
              <span className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <HardDrive className="h-4 w-4 text-blue-500" /> Tamaño Almacenado
              </span>
              <div className={`text-2xl font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {tablesList.length === 0 ? '0.0 MB' : `${(tablesList.length * 0.5 + 0.1).toFixed(1)} MB`}
              </div>
            </div>

            <div className={`pure-card p-5 space-y-2 border ${isDark ? 'border-[#2a2a2a]' : 'border-slate-200'}`}>
              <span className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Table className="h-4 w-4 text-blue-500" /> Total de Tablas
              </span>
              <div className={`text-2xl font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {tablesList.length} tablas
              </div>
            </div>

            <div className={`pure-card p-5 space-y-2 border ${isDark ? 'border-[#2a2a2a]' : 'border-slate-200'}`}>
              <span className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-emerald-500" /> Conexiones Activas
              </span>
              <div className={`text-2xl font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {isRunning ? '1 activa' : '0 activas'}
              </div>
            </div>
          </div>

          {/* Quick Create Table Section with Column Builder */}
          <div className={`pure-card p-6 border space-y-4 ${isDark ? 'border-[#2a2a2a]' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-200/40">
              <div>
                <h3 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>Creación de Tablas & Estructura Avanzada</h3>
                <p className="text-xs text-slate-500">Define tablas con tipos de datos e índices directamente</p>
              </div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowNewTableForm(!showNewTableForm)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center space-x-1.5 shadow-sm transition-all"
              >
                <Plus className="h-4 w-4" />
                <span>+ Crear Nueva Tabla</span>
              </motion.button>
            </div>

            {showNewTableForm && (
              <form onSubmit={(e) => { e.preventDefault(); handleCreateTable(newTableName); }} className="p-4 rounded-2xl border space-y-3 bg-blue-50/20 border-blue-500/30">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">Nombre de la Nueva Tabla:</label>
                  <input
                    type="text"
                    required
                    placeholder="ej: clientes, ventas, productos"
                    value={newTableName}
                    onChange={(e) => setNewTableName(e.target.value)}
                    className={`w-full border rounded-xl p-2.5 text-xs font-mono font-bold focus:outline-none ${
                      isDark ? 'bg-[#181818] border-[#2e2e2e] text-white focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                {/* Column Definition List */}
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold text-slate-400 font-mono block">Definición de Columnas:</span>
                  {newTableCols.map((col, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder="Nombre Columna (ej: email)"
                        value={col.name}
                        onChange={(e) => handleColumnChange(idx, 'name', e.target.value)}
                        className={`flex-1 border rounded-xl p-2 text-xs font-mono font-bold ${
                          isDark ? 'bg-[#181818] border-[#2e2e2e] text-white' : 'bg-white border-slate-200'
                        }`}
                      />
                      <select
                        value={col.type}
                        onChange={(e) => handleColumnChange(idx, 'type', e.target.value)}
                        className={`w-48 border rounded-xl p-2 text-xs font-mono font-semibold ${
                          isDark ? 'bg-[#181818] border-[#2e2e2e] text-white' : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      >
                        <option value="INT (PRIMARY KEY)">INT (PRIMARY KEY)</option>
                        <option value="VARCHAR(255)">VARCHAR(255)</option>
                        <option value="TEXT">TEXT</option>
                        <option value="BOOLEAN">BOOLEAN</option>
                        <option value="DATETIME">DATETIME</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleRemoveColumnField(idx)}
                        className="text-slate-400 hover:text-rose-500 p-1.5"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={handleAddColumnField}
                    className="text-xs text-blue-500 font-bold hover:text-blue-600 flex items-center space-x-1 pt-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ Añadir Otra Columna</span>
                  </button>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs transition-all"
                  >
                    Crear Tabla con Esquema
                  </button>
                </div>
              </form>
            )}

            {tablesList.length === 0 ? (
              <div className="text-center py-10 space-y-3">
                <p className="text-slate-500 text-xs font-mono">
                  Esta base de datos está vacía. Haz clic en <strong className="text-blue-500 font-bold">"+ Crear Nueva Tabla"</strong> para añadir tu primera tabla.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {tablesList.map((tbl) => (
                  <div
                    key={tbl}
                    onClick={() => {
                      setSelectedTable(tbl);
                      setActiveSubTab('tables');
                    }}
                    className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition-all group ${
                      isDark ? 'bg-[#181818] border-[#2e2e2e] hover:border-blue-500' : 'bg-slate-50 border-slate-200 hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-center space-x-2 font-mono text-xs font-bold">
                      <Table className="h-4 w-4 text-blue-500" />
                      <span className={isDark ? 'text-slate-200 group-hover:text-blue-400' : 'text-slate-800 group-hover:text-blue-600'}>{tbl}</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDropTable(tbl);
                      }}
                      className="text-slate-400 hover:text-rose-500 p-1"
                      title="Eliminar tabla"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </motion.div>
      )}

      {/* SUB-TAB 2: VISUALIZAR TABLAS & EXPORTACIÓN DATA */}
      {activeSubTab === 'tables' && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Tables Sidebar */}
          <div className={`lg:col-span-3 p-4 rounded-2xl border space-y-3 ${
            isDark ? 'bg-[#1e1e1e] border-[#2a2a2a]' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider">
                Tablas ({tablesList.length})
              </span>
              <button
                onClick={() => setShowNewTableForm(!showNewTableForm)}
                className="text-blue-500 hover:text-blue-600 text-xs font-bold"
                title="Crear Tabla"
              >
                + Nueva
              </button>
            </div>

            {tablesList.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center font-mono">Sin tablas aún</p>
            ) : (
              <div className="space-y-1">
                {tablesList.map((tbl) => (
                  <button
                    key={tbl}
                    onClick={() => {
                      setSelectedTable(tbl);
                      setQuery(`SELECT * FROM ${tbl};`);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all text-left ${
                      selectedTable === tbl
                        ? 'bg-blue-600 text-white shadow-sm'
                        : isDark
                        ? 'text-slate-400 hover:bg-[#282828] hover:text-white'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <Table className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{tbl}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Table Data Grid Explorer & Instant Exports */}
          <div className={`lg:col-span-9 p-6 rounded-2xl border space-y-4 ${
            isDark ? 'bg-[#1e1e1e] border-[#2a2a2a]' : 'bg-white border-slate-200'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 border-slate-200/40">
              <div className="flex items-center space-x-2">
                <Table className="h-5 w-5 text-blue-500" />
                <h3 className={`font-extrabold text-base font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {selectedTable ? `Tabla: ${selectedTable}` : 'Selecciona una tabla'}
                </h3>
              </div>

              {selectedTable && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleExportJSON}
                    className={`text-xs px-2.5 py-1.5 rounded-xl border font-bold flex items-center gap-1 transition-colors ${
                      isDark ? 'bg-[#181818] border-[#2e2e2e] text-slate-300 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                    title="Exportar como JSON"
                  >
                    <FileJson className="h-3.5 w-3.5 text-amber-500" />
                    <span>JSON</span>
                  </button>

                  <button
                    onClick={handleExportCSV}
                    className={`text-xs px-2.5 py-1.5 rounded-xl border font-bold flex items-center gap-1 transition-colors ${
                      isDark ? 'bg-[#181818] border-[#2e2e2e] text-slate-300 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                    title="Exportar como CSV"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
                    <span>CSV</span>
                  </button>

                  <button
                    onClick={handleExportSQL}
                    className={`text-xs px-2.5 py-1.5 rounded-xl border font-bold flex items-center gap-1 transition-colors ${
                      isDark ? 'bg-[#181818] border-[#2e2e2e] text-slate-300 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                    title="Exportar como consultas SQL"
                  >
                    <FileCode className="h-3.5 w-3.5 text-blue-500" />
                    <span>SQL</span>
                  </button>

                  <button
                    onClick={() => setShowInsertRowForm(!showInsertRowForm)}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center space-x-1 shadow-2xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ Fila</span>
                  </button>
                </div>
              )}
            </div>

            {exportNotice && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-mono font-bold flex items-center gap-2">
                <Check className="h-4 w-4" /> {exportNotice}
              </div>
            )}

            {/* Quick Insert Form */}
            {showInsertRowForm && selectedTable && (
              <form onSubmit={handleInsertRow} className="p-4 rounded-2xl border space-y-3 bg-blue-50/20 border-blue-500/30">
                <span className="text-xs font-bold text-slate-500 font-mono block">Insertar nuevo registro en "{selectedTable}":</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Valor 1..."
                    value={insertData.col1}
                    onChange={(e) => setInsertData({ ...insertData, col1: e.target.value })}
                    className={`border rounded-xl p-2 text-xs font-mono ${isDark ? 'bg-[#181818] border-[#2e2e2e] text-white' : 'bg-white border-slate-200'}`}
                  />
                  <input
                    type="text"
                    placeholder="Valor 2..."
                    value={insertData.col2}
                    onChange={(e) => setInsertData({ ...insertData, col2: e.target.value })}
                    className={`border rounded-xl p-2 text-xs font-mono ${isDark ? 'bg-[#181818] border-[#2e2e2e] text-white' : 'bg-white border-slate-200'}`}
                  />
                </div>
                <button type="submit" className="bg-blue-600 text-white font-bold text-xs px-4 py-2 rounded-xl">
                  Guardar Fila
                </button>
              </form>
            )}

            {activeRows.length === 0 ? (
              <div className="text-center py-16 space-y-2">
                <p className="text-slate-500 text-xs font-mono">
                  {selectedTable 
                    ? `La tabla "${selectedTable}" no contiene filas aún.` 
                    : 'No hay tablas seleccionadas.'}
                </p>
                {selectedTable && (
                  <button
                    onClick={() => setShowInsertRowForm(true)}
                    className="bg-blue-600 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs"
                  >
                    + Insertar Primera Fila
                  </button>
                )}
              </div>
            ) : (
              <div className={`overflow-x-auto rounded-2xl border ${
                isDark ? 'border-[#2a2a2a] bg-[#161616]' : 'border-slate-200 bg-slate-50/50'
              }`}>
                <table className="w-full text-left text-xs font-mono">
                  <thead className={`border-b text-[11px] uppercase ${
                    isDark ? 'bg-[#1e1e1e] border-[#2a2a2a] text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'
                  }`}>
                    <tr>
                      {activeRows.length > 0 && Object.keys(activeRows[0]).map((key) => (
                        <th key={key} className="px-4 py-3 font-bold">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-[#2a2a2a] text-slate-300' : 'divide-slate-200 text-slate-800'}`}>
                    {activeRows.map((row, idx) => (
                      <tr key={idx} className={isDark ? 'hover:bg-[#202020]' : 'hover:bg-white'}>
                        {Object.values(row).map((val, cellIdx) => (
                          <td key={cellIdx} className="px-4 py-3 whitespace-nowrap">
                            {String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </motion.div>
      )}

      {/* SUB-TAB 3: REALIZAR CONSULTAS SQL */}
      {activeSubTab === 'query' && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className={`pure-card p-6 border space-y-4 ${isDark ? 'border-[#2a2a2a]' : 'border-slate-200'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold uppercase font-mono text-slate-500">Editor SQL de Consultas</label>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setQuery(`CREATE TABLE productos (id INT, nombre TEXT, precio REAL);`)}
                  className="text-[11px] font-mono px-2 py-1 rounded bg-slate-100 dark:bg-[#282828] text-slate-600 dark:text-slate-300 hover:text-blue-500"
                >
                  CREATE TABLE
                </button>
                <button
                  onClick={() => setQuery(`INSERT INTO ${selectedTable || 'users'} (nombre) VALUES ('Nuevo Registro');`)}
                  className="text-[11px] font-mono px-2 py-1 rounded bg-slate-100 dark:bg-[#282828] text-slate-600 dark:text-slate-300 hover:text-blue-500"
                >
                  INSERT INTO
                </button>
                <button
                  onClick={() => setQuery(`SELECT * FROM ${selectedTable || 'users'};`)}
                  className="text-[11px] font-mono px-2 py-1 rounded bg-slate-100 dark:bg-[#282828] text-slate-600 dark:text-slate-300 hover:text-blue-500"
                >
                  SELECT *
                </button>
              </div>
            </div>

            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={5}
              placeholder="CREATE TABLE usuarios (id INT, nombre TEXT);"
              className={`w-full border rounded-2xl p-4 text-xs font-mono font-bold focus:outline-none ${
                isDark ? 'bg-[#161616] border-[#2a2a2a] text-blue-400 focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-blue-600 focus:border-blue-600'
              }`}
            />

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={handleRunQuery}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs flex items-center space-x-2 shadow-md shadow-blue-600/20 transition-all"
              >
                <Play className="h-4 w-4 fill-white" />
                <span>Ejecutar Consulta SQL</span>
              </button>

              {queryMessage && (
                <span className="text-xs text-emerald-500 font-mono font-bold flex items-center gap-1">
                  <Check className="h-4 w-4" /> {queryMessage}
                </span>
              )}
            </div>
          </div>

          {/* Results Grid */}
          <div className={`pure-card p-6 border space-y-3 ${isDark ? 'border-[#2a2a2a]' : 'border-slate-200'}`}>
            <h4 className="text-xs font-bold text-slate-500 uppercase font-mono">Resultados Devueltos ({activeRows.length})</h4>

            {activeRows.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 font-mono text-center">Sin filas devueltas</p>
            ) : (
              <div className={`overflow-x-auto rounded-2xl border ${
                isDark ? 'border-[#2a2a2a] bg-[#161616]' : 'border-slate-200 bg-slate-50/50'
              }`}>
                <table className="w-full text-left text-xs font-mono">
                  <thead className={`border-b text-[11px] uppercase ${
                    isDark ? 'bg-[#1e1e1e] border-[#2a2a2a] text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'
                  }`}>
                    <tr>
                      {activeRows.length > 0 && Object.keys(activeRows[0]).map((key) => (
                        <th key={key} className="px-4 py-2.5 font-bold">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-[#2a2a2a] text-slate-300' : 'divide-slate-200 text-slate-800'}`}>
                    {activeRows.map((row, idx) => (
                      <tr key={idx} className={isDark ? 'hover:bg-[#202020]' : 'hover:bg-white'}>
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
            )}
          </div>
        </motion.div>
      )}

      {/* SQL Import Export Modal */}
      <ImportExportSqlModal
        isOpen={showImportExport}
        onClose={() => setShowImportExport(false)}
        dbEngine={db}
      />
    </motion.div>
  );
}
