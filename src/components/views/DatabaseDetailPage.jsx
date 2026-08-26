import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  FileCode,
  Camera,
  Network,
  Download,
  Search,
  RefreshCw,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Key,
  Clock,
  Layers,
  AlertTriangle,
  X
} from 'lucide-react';
import ImportExportSqlModal from '../modals/ImportExportSqlModal';
import ErDiagramModal from '../modals/ErDiagramModal';
import DataExportModal from '../modals/DataExportModal';
import MockDataGeneratorModal from '../modals/MockDataGeneratorModal';
import SchemaDesignerModal from '../modals/SchemaDesignerModal';

export default function DatabaseDetailPage({
  db,
  onBack,
  theme
}) {
  const isRedis = db?.engine === 'redis' || db?.type === 'redis';
  const [activeSubTab, setActiveSubTab] = useState(isRedis ? 'redis-keys' : 'overview'); // 'overview' | 'tables' | 'query' | 'redis-keys'
  const [selectedTable, setSelectedTable] = useState('');
  const [query, setQuery] = useState('');
  const [queryMessage, setQueryMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const [showErModal, setShowErModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showMockModal, setShowMockModal] = useState(false);
  const [showSchemaDesigner, setShowSchemaDesigner] = useState(false);
  const [exportNotice, setExportNotice] = useState('');

  // Pagination State for Tables
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalRows, setTotalRows] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('ASC');
  const [tableRows, setTableRows] = useState([]);
  const [tableColumns, setTableColumns] = useState([]);
  const [isLoadingRows, setIsLoadingRows] = useState(false);

  // In-line Cell Editing State
  const [editingCell, setEditingCell] = useState(null); // { rowIndex, colName, value }

  // Database Execution Status
  const [dbRunningStatus, setDbRunningStatus] = useState(db?.status || 'READY');

  // Form State for Table Creation
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

  // --------------------------------------------------------------------------
  // REDIS WORKBENCH STATE
  // --------------------------------------------------------------------------
  const [redisPattern, setRedisPattern] = useState('*');
  const [redisKeys, setRedisKeys] = useState([]);
  const [selectedRedisKey, setSelectedRedisKey] = useState(null);
  const [redisKeyDetail, setRedisKeyDetail] = useState(null);
  const [isLoadingRedis, setIsLoadingRedis] = useState(false);
  const [redisEditVal, setRedisEditVal] = useState('');
  const [showAddRedisKeyModal, setShowAddRedisKeyModal] = useState(false);
  const [newRedisKeyName, setNewRedisKeyName] = useState('');
  const [newRedisKeyVal, setNewRedisKeyVal] = useState('');
  const [newRedisKeyTtl, setNewRedisKeyTtl] = useState(-1);
  const [newRedisKeyType, setNewRedisKeyType] = useState('string');

  const isDark = theme === 'dark';
  const isRunning = dbRunningStatus === 'RUNNING' || dbRunningStatus === 'READY';

  const [tablesList, setTablesList] = useState([]);

  // Load Schema / Tables
  const loadSchema = async () => {
    if (isRedis) return;
    if (window.electronAPI?.db?.getSchema && isRunning) {
      try {
        const res = await window.electronAPI.db.getSchema(db);
        if (res && res.success && res.tables) {
          const names = Object.keys(res.tables);
          setTablesList(names);
          if (names.length > 0 && !selectedTable) {
            setSelectedTable(names[0]);
          }
        }
      } catch (err) {
        console.error('Error al cargar esquema:', err);
      }
    } else {
      // Local demo fallback
      if (db?.id === 'sqlite') {
        const fallback = ['users', 'projects', 'sessions', 'settings_config'];
        setTablesList(fallback);
        if (!selectedTable) setSelectedTable('users');
      }
    }
  };

  useEffect(() => {
    loadSchema();
  }, [db, isRunning]);

  // Fetch Paginated Table Rows
  const fetchTableRows = async (tableName, page = 1, limit = 25, sortCol = null, sortDir = 'ASC') => {
    if (!tableName || isRedis) return;
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

    // Fallback simulation
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

  // --------------------------------------------------------------------------
  // REDIS Operations
  // --------------------------------------------------------------------------
  const fetchRedisKeys = async (pat = '*') => {
    if (!isRedis) return;
    setIsLoadingRedis(true);
    if (window.electronAPI?.db?.redis?.getKeys) {
      const res = await window.electronAPI.db.redis.getKeys(db, pat);
      if (res && res.success) {
        setRedisKeys(res.keys || []);
        if (res.keys.length > 0 && !selectedRedisKey) {
          handleSelectRedisKey(res.keys[0].key);
        }
      } else {
        setQueryMessage(`Error Redis: ${res?.error || 'No se pudo conectar'}`);
      }
    } else {
      // Demo fallback
      const demoKeys = [
        { key: 'session:user_891', type: 'hash', ttl: 3600 },
        { key: 'cache:config_theme', type: 'string', ttl: -1 },
        { key: 'queue:emails_pending', type: 'list', ttl: 7200 },
        { key: 'set:active_nodes', type: 'set', ttl: -1 }
      ];
      setRedisKeys(demoKeys);
      if (!selectedRedisKey) handleSelectRedisKey(demoKeys[0].key);
    }
    setIsLoadingRedis(false);
  };

  const handleSelectRedisKey = async (keyName) => {
    setSelectedRedisKey(keyName);
    if (window.electronAPI?.db?.redis?.getValue) {
      const res = await window.electronAPI.db.redis.getValue(db, keyName);
      if (res && res.success) {
        setRedisKeyDetail(res);
        setRedisEditVal(typeof res.value === 'object' ? JSON.stringify(res.value, null, 2) : String(res.value));
      }
    } else {
      setRedisKeyDetail({ key: keyName, type: 'string', ttl: 3600, value: 'valor demo en memoria' });
      setRedisEditVal('valor demo en memoria');
    }
  };

  const handleSaveRedisVal = async () => {
    if (!selectedRedisKey) return;
    if (window.electronAPI?.db?.redis?.setValue) {
      let valToSave = redisEditVal;
      try {
        if (redisKeyDetail?.type === 'hash' && redisEditVal.startsWith('{')) {
          valToSave = JSON.parse(redisEditVal);
        }
      } catch (e) {}

      const res = await window.electronAPI.db.redis.setValue(db, {
        key: selectedRedisKey,
        value: valToSave,
        type: redisKeyDetail?.type || 'string'
      });
      if (res && res.success) {
        setExportNotice('¡Clave Redis actualizada!');
        setTimeout(() => setExportNotice(''), 3000);
      }
    }
  };

  const handleDeleteRedisKey = async (keyName) => {
    if (!keyName) return;
    if (window.electronAPI?.db?.redis?.deleteKey) {
      await window.electronAPI.db.redis.deleteKey(db, keyName);
    }
    setRedisKeys(prev => prev.filter(k => k.key !== keyName));
    setSelectedRedisKey(null);
    setRedisKeyDetail(null);
    setExportNotice(`Clave "${keyName}" eliminada.`);
    setTimeout(() => setExportNotice(''), 3000);
  };

  const handleFlushRedis = async () => {
    if (window.electronAPI?.db?.redis?.flush) {
      const res = await window.electronAPI.db.redis.flush(db);
      if (res && res.success) {
        setRedisKeys([]);
        setSelectedRedisKey(null);
        setRedisKeyDetail(null);
        setExportNotice('¡Base de datos Redis vaciada (FLUSHDB)!');
        setTimeout(() => setExportNotice(''), 4000);
      }
    }
  };

  const handleCreateRedisKey = async (e) => {
    e.preventDefault();
    if (!newRedisKeyName.trim()) return;

    if (window.electronAPI?.db?.redis?.setValue) {
      await window.electronAPI.db.redis.setValue(db, {
        key: newRedisKeyName.trim(),
        value: newRedisKeyVal,
        type: newRedisKeyType,
        ttl: parseInt(newRedisKeyTtl, 10) || -1
      });
    }

    setShowAddRedisKeyModal(false);
    fetchRedisKeys(redisPattern);
    setNewRedisKeyName('');
    setNewRedisKeyVal('');
    setExportNotice(`¡Clave "${newRedisKeyName}" creada en Redis!`);
    setTimeout(() => setExportNotice(''), 3000);
  };

  useEffect(() => {
    if (isRedis) {
      fetchRedisKeys('*');
    }
  }, [isRedis, db]);

  // In-line Cell Update Handler
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

      // Update in local state
      const updated = [...tableRows];
      updated[rowIndex] = { ...updated[rowIndex], [colName]: newVal };
      setTableRows(updated);
      setExportNotice(`Celda [${colName}] actualizada.`);
      setTimeout(() => setExportNotice(''), 2500);
    }
    setEditingCell(null);
  };

  if (!db) return null;

  const connectionString = isRedis
    ? `redis://${db.host || '127.0.0.1'}:${db.port || 6379}`
    : db.id === 'sqlite' 
    ? 'sqlite://local.db'
    : `${db.id}://root@127.0.0.1:${db.port || 3306}/${db.name?.toLowerCase().replace(/\s+/g, '_')}`;

  const handleCopyConn = () => {
    navigator.clipboard.writeText(connectionString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={`p-6 max-w-7xl w-full mx-auto space-y-6 flex-1 ${
        isDark ? 'bg-transparent text-[#f4f4f5]' : 'bg-transparent text-slate-900'
      }`}
    >
      {/* Header */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 ${
        isDark ? 'border-white/[0.08]' : 'border-slate-200'
      }`}>
        <div className="flex items-center space-x-3.5 min-w-0">
          <button
            onClick={onBack}
            className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer ${
              isDark ? 'bg-[#181B28] border-white/[0.08] text-[#F3F4F6] hover:bg-[#1E2235] hover:border-white/[0.16]' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver</span>
          </button>

          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h2 className={`text-2xl font-extrabold tracking-tight truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {db.name}
              </h2>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.15)]">
                {isRedis ? 'Redis Key-Value Cache' : db.tech || 'Base de Datos Relacional'}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono mt-0.5">
              <span>{connectionString}</span>
              <button
                onClick={handleCopyConn}
                className="hover:text-blue-400 transition-colors cursor-pointer"
                title="Copiar string de conexión"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Global Toolbar Actions */}
        <div className="flex items-center gap-2">
          {!isRedis ? (
            <>
              <button
                onClick={() => setShowErModal(true)}
                className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  isDark ? 'bg-[#181B28] border-white/[0.08] text-[#F3F4F6] hover:bg-[#1E2235] hover:border-white/[0.16]' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Network className="h-4 w-4 text-purple-400" />
                <span>Diagrama ER</span>
              </button>

              <button
                onClick={() => setShowExportModal(true)}
                className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  isDark ? 'bg-[#181B28] border-white/[0.08] text-[#F3F4F6] hover:bg-[#1E2235] hover:border-white/[0.16]' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Download className="h-4 w-4 text-emerald-400" />
                <span>Exportar Datos</span>
              </button>

              <button
                onClick={() => setShowImportExport(true)}
                className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  isDark ? 'bg-[#181B28] border-white/[0.08] text-[#F3F4F6] hover:bg-[#1E2235] hover:border-white/[0.16]' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Upload className="h-4 w-4 text-blue-400" />
                <span>SQL Dump</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowAddRedisKeyModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 hover:shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Nueva Clave</span>
              </button>

              <button
                onClick={() => {
                  if (confirm('¿Estás seguro de vaciar toda la base de datos Redis (FLUSHDB)?')) {
                    handleFlushRedis();
                  }
                }}
                className="px-3 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 font-bold text-xs hover:bg-rose-500/20 transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                <span>Vaciar BD (FLUSHDB)</span>
              </button>
            </>
          )}
        </div>
      </div>

      {exportNotice && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold flex items-center space-x-2">
          <Check className="h-4 w-4" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* REDIS WORKBENCH VIEW */}
      {/* ------------------------------------------------------------------ */}
      {isRedis ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Redis Key Browser */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center space-x-2">
              <div className="flex-1 relative">
                <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={redisPattern}
                  onChange={(e) => setRedisPattern(e.target.value)}
                  placeholder="Patrón (ej: * o user:*)"
                  className={`w-full border rounded-xl py-2 pl-9 pr-3 text-xs font-mono focus:outline-none transition-all ${
                    isDark ? 'bg-[#12141F] border-white/[0.08] text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>
              <button
                onClick={() => fetchRedisKeys(redisPattern)}
                className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer"
                title="Buscar / Refrescar"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            <div className={`border rounded-2xl p-2 max-h-[520px] overflow-y-auto space-y-1.5 custom-scrollbar ${
              isDark ? 'bg-[#12141F] border-white/[0.08]' : 'bg-white border-slate-200'
            }`}>
              {redisKeys.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 font-mono">
                  No se encontraron claves en Redis.
                </div>
              ) : (
                redisKeys.map((k) => {
                  const isSelected = selectedRedisKey === k.key;
                  return (
                    <div
                      key={k.key}
                      onClick={() => handleSelectRedisKey(k.key)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-blue-600/15 border-blue-500 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.15)]'
                          : isDark
                          ? 'bg-[#181B28] border-white/[0.06] text-[#F3F4F6] hover:bg-[#1E2235] hover:border-white/[0.12]'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="font-mono text-xs font-bold truncate">{k.key}</div>
                        <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-1">
                          <span className="font-mono uppercase px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            {k.type}
                          </span>
                          <span className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{k.ttl === -1 ? 'Sin expiración' : `${k.ttl}s TTL`}</span>
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRedisKey(k.key);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Eliminar clave"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Key Value Inspector */}
          <div className={`lg:col-span-7 border rounded-2xl p-6 space-y-4 ${
            isDark ? 'bg-[#12141F] border-white/[0.08]' : 'bg-white border-slate-200'
          }`}>
            {selectedRedisKey && redisKeyDetail ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-3 border-white/[0.08]">
                  <div>
                    <h3 className="font-mono text-sm font-bold text-white break-all">{redisKeyDetail.key}</h3>
                    <div className="flex items-center space-x-2 text-xs text-slate-400 mt-1 font-mono">
                      <span>Tipo: <strong className="text-purple-400 uppercase">{redisKeyDetail.type}</strong></span>
                      <span>•</span>
                      <span>TTL: <strong>{redisKeyDetail.ttl === -1 ? 'Persistente' : `${redisKeyDetail.ttl} segundos`}</strong></span>
                    </div>
                  </div>
                  <button
                    onClick={handleSaveRedisVal}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Guardar Valor</span>
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Valor / Payload (JSON / Texto):</label>
                  <textarea
                    rows={14}
                    value={redisEditVal}
                    onChange={(e) => setRedisEditVal(e.target.value)}
                    className={`w-full p-3.5 font-mono text-xs rounded-xl border focus:outline-none transition-all ${
                      isDark ? 'bg-[#090A0F] border-white/[0.08] text-slate-100 focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>
            ) : (
              <div className="py-24 text-center text-xs text-slate-400 font-mono space-y-2">
                <Key className="h-8 w-8 mx-auto text-slate-500" />
                <p>Selecciona una clave a la izquierda para inspeccionar y editar su valor.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ------------------------------------------------------------------ */
        /* RELATIONAL DB WORKBENCH (SQLite / MySQL / Postgres) */
        /* ------------------------------------------------------------------ */
        <div className="space-y-4">
          {/* Sub Navigation Tabs */}
          <div className={`flex items-center space-x-2 border-b pb-2 ${isDark ? 'border-white/[0.08]' : 'border-slate-200'}`}>
            <button
              onClick={() => setActiveSubTab('tables')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                activeSubTab === 'tables'
                  ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.25)]'
                  : isDark ? 'text-slate-400 hover:text-white hover:bg-[#12141F]' : 'text-slate-600 hover:text-slate-900'
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
                  : isDark ? 'text-slate-400 hover:text-white hover:bg-[#12141F]' : 'text-slate-600 hover:text-slate-900'
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
                    onClick={() => setShowSchemaDesigner(true)}
                    className="p-1 text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                    title="Diseñar nueva tabla"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <div className={`border rounded-2xl p-2 max-h-[500px] overflow-y-auto space-y-1 custom-scrollbar ${
                  isDark ? 'bg-[#12141F] border-white/[0.08]' : 'bg-white border-slate-200'
                }`}>
                  {tablesList.map(t => (
                    <div
                      key={t}
                      onClick={() => {
                        setSelectedTable(t);
                        setCurrentPage(1);
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-mono font-bold cursor-pointer transition-all flex items-center justify-between ${
                        selectedTable === t
                          ? 'bg-blue-600/15 border-blue-500 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.15)]'
                          : isDark ? 'bg-[#181B28] border-white/[0.06] text-[#F3F4F6] hover:bg-[#1E2235] hover:border-white/[0.12]' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <span className="truncate">{t}</span>
                      <Table className="h-3.5 w-3.5 opacity-60 shrink-0 ml-2" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Table Data Grid with Server-Side Pagination & In-line Cell Editing */}
              <div className={`lg:col-span-9 border rounded-2xl overflow-hidden shadow-sm ${
                isDark ? 'bg-[#12141F] border-white/[0.08]' : 'bg-white border-slate-200'
              }`}>
                {/* Table Toolbar */}
                <div className={`p-4 border-b flex items-center justify-between ${
                  isDark ? 'bg-[#0D0E15] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
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

                {/* Table Content */}
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
                        <tr className={`border-b ${isDark ? 'bg-[#090A0F] border-white/[0.08] text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>
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
                              isDark ? 'border-white/[0.06] hover:bg-[#181B28]' : 'border-slate-200 hover:bg-slate-50'
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
                                      className="w-full px-1.5 py-0.5 rounded bg-[#090A0F] border border-blue-500 text-white font-mono text-xs focus:outline-none shadow-[0_0_10px_rgba(59,130,246,0.25)]"
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

                {/* Server-Side Pagination Footer */}
                <div className={`p-3.5 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono ${
                  isDark ? 'bg-[#0D0E15] border-white/[0.08] text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
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
                        isDark ? 'bg-[#181B28] border-white/[0.08] text-white focus:border-blue-500' : 'bg-white border-slate-300'
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
                          isDark ? 'bg-[#181B28] border-white/[0.08] text-white hover:bg-[#1E2235]' : 'bg-white border-slate-300'
                        }`}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage >= totalPages}
                        className={`p-1.5 rounded-lg border disabled:opacity-30 transition-colors cursor-pointer ${
                          isDark ? 'bg-[#181B28] border-white/[0.08] text-white hover:bg-[#1E2235]' : 'bg-white border-slate-300'
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
              isDark ? 'bg-[#12141F] border-white/[0.08]' : 'bg-white border-slate-200'
            }`}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">Editor SQL:</label>
                  <button
                    onClick={async () => {
                      if (!query.trim()) return;
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
                    }}
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
                    isDark ? 'bg-[#090A0F] border-white/[0.08] text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900'
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
      )}

      {/* Modals */}
      <SchemaDesignerModal
        isOpen={showSchemaDesigner}
        onClose={() => setShowSchemaDesigner(false)}
        db={db}
        onTableCreated={() => loadSchema()}
        theme={theme}
      />

      <ErDiagramModal
        isOpen={showErModal}
        onClose={() => setShowErModal(false)}
        db={db}
        theme={theme}
      />

      <DataExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        db={db}
        selectedTable={selectedTable}
        rows={tableRows}
        columns={tableColumns}
        theme={theme}
      />

      <ImportExportSqlModal
        isOpen={showImportExport}
        onClose={() => setShowImportExport(false)}
        db={db}
        theme={theme}
      />

      {/* Add Redis Key Modal */}
      <AnimatePresence>
        {showAddRedisKeyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden p-6 space-y-4 ${
                isDark ? 'bg-[#0D0E15] border-white/[0.08] text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between border-b pb-3 border-white/[0.08]">
                <h3 className="font-bold text-sm">Crear Nueva Clave Redis</h3>
                <button onClick={() => setShowAddRedisKeyModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCreateRedisKey} className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Nombre de Clave (Key):</label>
                  <input
                    type="text"
                    required
                    placeholder="ej: user:100:profile"
                    value={newRedisKeyName}
                    onChange={(e) => setNewRedisKeyName(e.target.value)}
                    className={`w-full p-2 rounded-xl border font-mono transition-all ${
                      isDark ? 'bg-[#12141F] border-white/[0.08] text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-300 font-bold block mb-1">Tipo:</label>
                    <select
                      value={newRedisKeyType}
                      onChange={(e) => setNewRedisKeyType(e.target.value)}
                      className={`w-full p-2 rounded-xl border font-mono transition-all ${
                        isDark ? 'bg-[#12141F] border-white/[0.08] text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <option value="string">STRING</option>
                      <option value="hash">HASH (JSON)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-300 font-bold block mb-1">TTL en Segundos (-1 = infinito):</label>
                    <input
                      type="number"
                      value={newRedisKeyTtl}
                      onChange={(e) => setNewRedisKeyTtl(e.target.value)}
                      className={`w-full p-2 rounded-xl border font-mono transition-all ${
                        isDark ? 'bg-[#12141F] border-white/[0.08] text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Valor / Contenido:</label>
                  <textarea
                    rows={4}
                    value={newRedisKeyVal}
                    onChange={(e) => setNewRedisKeyVal(e.target.value)}
                    placeholder="Escribe el valor o JSON..."
                    className={`w-full p-2 rounded-xl border font-mono transition-all ${
                      isDark ? 'bg-[#12141F] border-white/[0.08] text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddRedisKeyModal(false)}
                    className="px-4 py-2 rounded-xl border border-white/[0.08] text-slate-400 hover:text-white hover:bg-[#181B28] cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md shadow-blue-600/20 hover:shadow-[0_0_15px_rgba(37,99,235,0.35)] cursor-pointer"
                  >
                    Guardar Clave
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
