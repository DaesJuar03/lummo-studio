import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Database, 
  Play, 
  Square, 
  Copy, 
  Check, 
  Plus, 
  Upload, 
  Search,
  Table,
  ChevronRight
} from 'lucide-react';
import CreateDatabaseModal from './CreateDatabaseModal';
import ImportExportSqlModal from './ImportExportSqlModal';

export default function DatabasesPanel({ 
  envStatus, 
  customDatabases = [], 
  onAddCustomDatabase, 
  onSelectDatabaseDetail, 
  theme 
}) {
  const defaultDatabases = [
    {
      id: 'sqlite',
      name: 'SQLite (Embebido)',
      port: null,
      status: 'READY',
      tech: 'Motor Nativo en Lummo Studio',
      installed: true,
      size: '2.1 MB',
      tables: 12,
      connections: 1
    },
    {
      id: 'mysql',
      name: 'MySQL / MariaDB',
      port: 3306,
      status: 'STOPPED',
      tech: 'Servidor Local MySQL',
      installed: envStatus?.mysql?.installed ?? true,
      size: '14.2 MB',
      tables: 8,
      connections: 2
    },
    {
      id: 'postgres',
      name: 'PostgreSQL',
      port: 5432,
      status: 'STOPPED',
      tech: 'Servidor Local PostgreSQL',
      installed: envStatus?.postgres?.installed ?? false,
      size: '6.8 MB',
      tables: 4,
      connections: 1
    },
    {
      id: 'mongodb',
      name: 'MongoDB',
      port: 27017,
      status: 'STOPPED',
      tech: 'Ejecución CLI / Docker',
      installed: envStatus?.docker?.installed ?? false,
      size: '0.0 MB',
      tables: 0,
      connections: 0
    }
  ];

  // Dynamic database status state map
  const [dbStatuses, setDbStatuses] = useState({
    sqlite: 'READY',
    mysql: 'STOPPED',
    postgres: 'STOPPED',
    mongodb: 'STOPPED'
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [importExportDb, setImportExportDb] = useState(null);

  const isDark = theme === 'dark';

  const databases = [...customDatabases, ...defaultDatabases].map(db => ({
    ...db,
    status: dbStatuses[db.id] !== undefined ? dbStatuses[db.id] : (db.status || 'STOPPED')
  }));

  const toggleDatabaseStatus = (dbItem) => {
    setDbStatuses(prev => {
      const current = prev[dbItem.id] !== undefined ? prev[dbItem.id] : (dbItem.status || 'STOPPED');
      const isCurrentlyActive = current === 'RUNNING' || current === 'READY';
      const next = isCurrentlyActive ? 'STOPPED' : 'RUNNING';
      return { ...prev, [dbItem.id]: next };
    });
  };

  const handleCreateDB = (newDb) => {
    const createdItem = {
      id: 'db-' + Date.now(),
      name: newDb.name,
      port: newDb.engine === 'mysql' ? 3306 : newDb.engine === 'postgres' ? 5432 : null,
      status: 'READY',
      tech: `Esquema ${newDb.engine.toUpperCase()}`,
      installed: true,
      size: '0.0 MB',
      tables: 0,
      connections: 1
    };

    setDbStatuses(prev => ({ ...prev, [createdItem.id]: 'READY' }));

    if (onAddCustomDatabase) {
      onAddCustomDatabase(createdItem);
    } else if (onSelectDatabaseDetail) {
      onSelectDatabaseDetail(createdItem);
    }
  };

  const copyConnectionString = (db) => {
    let str = '';
    if (db.id === 'mysql') str = `mysql://root@127.0.0.1:${db.port}/test`;
    if (db.id === 'postgres') str = `postgresql://postgres:postgres@127.0.0.1:${db.port}/mydb`;
    if (db.id === 'sqlite') str = `sqlite://local.db`;
    if (db.id === 'mongodb') str = `mongodb://127.0.0.1:${db.port}`;
    if (!str) str = `${db.name}://127.0.0.1`;

    navigator.clipboard.writeText(str);
    setCopiedId(db.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const installedDatabases = databases.filter(db => db.installed && db.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const notDetectedEngines = databases.filter(db => !db.installed);

  return (
    <div className={`py-6 px-8 max-w-7xl w-full mx-auto space-y-8 flex-1 ${
      isDark ? 'bg-[#161616] text-[#e4e4e7]' : 'bg-slate-50 text-slate-900'
    }`}>
      
      {/* Header Navigation */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6 ${
        isDark ? 'border-[#2a2a2a]' : 'border-slate-200'
      }`}>
        <div>
          <h2 className={`text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Gestor de Bases de Datos
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Arranca, detén y administra tus instancias locales de bases de datos.
          </p>
        </div>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-3 rounded-2xl flex items-center space-x-2 shadow-md shadow-blue-600/20 transition-all text-xs"
        >
          <Plus className="h-4 w-4" />
          <span>Crear Nueva BD</span>
        </motion.button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center space-x-3">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar base de datos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full border rounded-2xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-blue-600 font-sans ${
              isDark ? 'bg-[#1e1e1e] border-[#2a2a2a] text-[#e4e4e7] placeholder-slate-500' : 'bg-white border-slate-200 text-slate-800'
            }`}
          />
        </div>
      </div>

      {/* INSTALLED & CUSTOM DATABASES WITH WORKING START/STOP CONTROLS */}
      <div className="space-y-4">
        <span className="text-xs font-bold font-mono text-slate-500 uppercase tracking-wider">
          Instancias Activas y Disponibles ({installedDatabases.length})
        </span>

        {installedDatabases.map((db) => {
          const isRunning = db.status === 'RUNNING' || db.status === 'READY';

          return (
            <motion.div
              key={db.id}
              whileHover={{ y: -1 }}
              onClick={() => onSelectDatabaseDetail && onSelectDatabaseDetail(db)}
              className={`pure-card p-5 cursor-pointer transition-all space-y-4 ${
                isRunning 
                  ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-sm' 
                  : isDark ? 'border-[#2a2a2a]' : 'border-slate-200'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                {/* Info Block */}
                <div className="flex items-center space-x-3.5 min-w-0">
                  <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center font-bold shrink-0 ${
                    isDark ? 'bg-blue-950/60 border-blue-800 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600'
                  }`}>
                    <Database className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2.5">
                      <h3 className={`font-extrabold text-lg tracking-tight truncate hover:text-blue-500 transition-colors ${
                        isDark ? 'text-white' : 'text-slate-900'
                      }`}>
                        {db.name}
                      </h3>
                      <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-md border flex items-center gap-1.5 ${
                        isRunning ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : isDark ? 'bg-[#181818] text-slate-400 border-[#2e2e2e]' : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                        {isRunning ? 'EJECUTANDO (ACTIVO)' : 'APAGADO (STOPPED)'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{db.tech}</p>
                  </div>
                </div>

                {/* Metrics & Start/Stop Controls */}
                <div className="flex items-center space-x-3 shrink-0">
                  <div className={`hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-mono ${
                    isDark ? 'bg-[#181818] border-[#2e2e2e] text-[#a1a1aa]' : 'bg-slate-100 border-slate-200 text-slate-700'
                  }`}>
                    <span className="font-semibold">{db.size || '0.0 MB'}</span>
                    <span className="text-slate-400">|</span>
                    <span className="font-semibold">{db.tables || 0} tablas</span>
                  </div>

                  {db.port && (
                    <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border font-mono text-xs ${
                      isDark ? 'bg-[#181818] border-[#2e2e2e]' : 'bg-slate-100 border-slate-200'
                    }`}>
                      <span className="text-slate-500">Puerto:</span>
                      <span className="font-bold text-blue-500">{db.port}</span>
                    </div>
                  )}

                  {/* Working Start / Stop Toggle Button */}
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDatabaseStatus(db);
                    }}
                    className={`w-32 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-xs text-white ${
                      isRunning
                        ? 'bg-rose-600 hover:bg-rose-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {isRunning ? <Square className="h-3.5 w-3.5 fill-white" /> : <Play className="h-3.5 w-3.5 fill-white" />}
                    <span>{isRunning ? 'Apagar' : 'Ejecutar'}</span>
                  </motion.button>

                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </div>

              </div>

              {/* Bottom Actions Row */}
              <div className={`pt-3 border-t flex flex-wrap items-center justify-between gap-3 ${
                isDark ? 'border-[#282828]' : 'border-slate-100'
              }`}>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyConnectionString(db);
                    }}
                    className={`text-xs py-1.5 px-3 rounded-xl flex items-center space-x-1.5 border font-semibold transition-colors ${
                      isDark ? 'bg-[#181818] border-[#2e2e2e] text-[#a1a1aa] hover:bg-[#282828] hover:text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {copiedId === db.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
                    <span>{copiedId === db.id ? '¡Copiado!' : 'Copiar URL'}</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setImportExportDb(db);
                    }}
                    className={`text-xs py-1.5 px-3 rounded-xl flex items-center space-x-1.5 border font-semibold transition-colors ${
                      isDark ? 'bg-[#181818] border-[#2e2e2e] text-[#a1a1aa] hover:bg-[#282828] hover:text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                    title="Importar o Exportar respaldos SQL"
                  >
                    <Upload className="h-3.5 w-3.5 text-blue-500" />
                    <span>Dump SQL</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelectDatabaseDetail) onSelectDatabaseDetail(db);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1.5 px-3.5 rounded-xl transition-all shadow-xs flex items-center space-x-1.5"
                  >
                    <Table className="h-3.5 w-3.5" />
                    <span>Abrir Tablas & Consultas</span>
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* NOT DETECTED ENGINES */}
      {notDetectedEngines.length > 0 && (
        <div className={`p-4 rounded-2xl border space-y-2 text-xs ${
          isDark ? 'bg-[#1e1e1e]/60 border-[#2a2a2a]' : 'bg-slate-100/60 border-slate-200/80'
        }`}>
          <div className="text-slate-500 font-bold font-mono">
            Motores no detectados en el sistema local:
          </div>

          <div className="flex flex-wrap items-center gap-3 font-mono text-slate-500">
            {notDetectedEngines.map((db) => (
              <div key={db.id} className={`flex items-center space-x-2 px-3 py-1 rounded-xl border ${
                isDark ? 'bg-[#181818] border-[#2e2e2e]' : 'bg-white border-slate-200'
              }`}>
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                <span className={`font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{db.name}</span>
                <span className="text-slate-400 text-[11px]">(No detectado)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateDatabaseModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateDB}
      />

      <ImportExportSqlModal
        isOpen={!!importExportDb}
        onClose={() => setImportExportDb(null)}
        dbEngine={importExportDb}
      />
    </div>
  );
}
