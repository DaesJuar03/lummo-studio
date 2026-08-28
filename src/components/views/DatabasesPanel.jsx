import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Database, 
  Copy, 
  Check, 
  Plus, 
  Upload, 
  Search,
  Table
} from 'lucide-react';
import { getTranslations } from '../../locales';
import CreateDatabaseModal from '../modals/CreateDatabaseModal';
import ImportExportSqlModal from '../modals/ImportExportSqlModal';

export default function DatabasesPanel({ 
  envStatus: _envStatus, 
  customDatabases = [], 
  onAddCustomDatabase, 
  onSelectDatabaseDetail, 
  theme,
  language = 'es'
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [importExportDb, setImportExportDb] = useState(null);

  const t = getTranslations(language);
  const isDark = theme === 'dark';

  const databases = customDatabases.map(db => ({
    ...db,
    status: db.status || 'READY'
  }));

  const handleCreateDB = (newDb) => {
    const createdItem = {
      id: 'db-' + Date.now(),
      name: newDb.name,
      engine: newDb.engine || 'sqlite',
      type: newDb.engine || 'sqlite',
      port: newDb.engine === 'mysql' ? 3306 : newDb.engine === 'postgres' ? 5432 : newDb.engine === 'redis' ? 6379 : null,
      status: 'READY',
      tech: `${(newDb.engine || 'sqlite').toUpperCase()}`,
      installed: true,
      size: '0.0 MB',
      tables: 0,
      connections: 1
    };

    if (onAddCustomDatabase) {
      onAddCustomDatabase(createdItem);
    } else if (onSelectDatabaseDetail) {
      onSelectDatabaseDetail(createdItem);
    }
  };

  const copyConnectionString = (db) => {
    let str = '';
    if (db.engine === 'redis' || db.type === 'redis' || db.id === 'redis') str = `redis://127.0.0.1:${db.port || 6379}`;
    else if (db.id === 'mysql' || db.engine === 'mysql') str = `mysql://root@127.0.0.1:${db.port || 3306}/${db.name || 'test'}`;
    else if (db.id === 'postgres' || db.engine === 'postgres') str = `postgresql://postgres:postgres@127.0.0.1:${db.port || 5432}/${db.name || 'mydb'}`;
    else if (db.id === 'sqlite' || db.engine === 'sqlite') str = `sqlite://local.db`;
    else str = `${db.name}://127.0.0.1:${db.port || 3306}`;

    navigator.clipboard.writeText(str);
    setCopiedId(db.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const installedDatabases = databases.filter(db => db.installed !== false && db.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const notDetectedEngines = databases.filter(db => !db.installed);

  return (
    <div className={`py-6 px-8 max-w-7xl w-full mx-auto space-y-8 flex-1 ${
      isDark ? 'bg-transparent text-[#f4f4f5]' : 'bg-transparent text-slate-900'
    }`}>
      
      {/* Header Navigation */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6 ${
        isDark ? 'border-white/[0.08]' : 'border-slate-200'
      }`}>
        <div>
          <h2 className={`text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {t.gestorDatabases || 'Database Manager'}
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {t.gestorDatabasesDesc || 'Start, stop, and manage SQLite, MySQL, PostgreSQL, and Redis.'}
          </p>
        </div>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-3 rounded-2xl flex items-center space-x-2 shadow-md shadow-blue-600/20 hover:shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-all text-xs cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>{t.connectOrNewDatabase || 'Connect / Create DB'}</span>
        </motion.button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center space-x-3">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={language === 'es' ? 'Buscar base de datos...' : 'Search database...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full border rounded-2xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 font-sans transition-all ${
              isDark ? 'bg-[#1E1E1E] border-white/[0.08] text-[#E5E5E5] placeholder-slate-500' : 'bg-white border-slate-200 text-slate-800'
            }`}
          />
        </div>
      </div>

      {/* INSTALLED & CUSTOM DATABASES */}
      <div className="space-y-4">
        <span className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider">
          {language === 'es' ? 'Instancias Activas y Disponibles' : 'Active and Available Instances'} ({installedDatabases.length})
        </span>
        {installedDatabases.length === 0 ? (
          <div className={`p-12 text-center rounded-2xl border space-y-4 ${
            isDark ? 'bg-[#1E1E1E] border-white/[0.08]' : 'bg-white border-slate-200'
          }`}>
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)] mx-auto flex items-center justify-center">
              <Database className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {t.noDatabasesConfigured || 'No databases configured'}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto font-sans">
                {t.noDatabasesDesc || 'The panel is clean. You can connect or create your first local instance of SQLite, MySQL, PostgreSQL or Redis.'}
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl inline-flex items-center gap-2 shadow-md shadow-blue-600/20 hover:shadow-[0_0_15px_rgba(37,99,235,0.35)] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t.connectOrNewDatabase || 'Connect / Create First DB'}</span>
            </button>
          </div>
        ) : (
          installedDatabases.map((db) => {
            const isRunning = db.status === 'RUNNING' || db.status === 'READY';
            const isRedis = db.engine === 'redis' || db.type === 'redis';

            return (
              <motion.div
                key={db.id}
                whileHover={{ y: -1 }}
                onClick={() => onSelectDatabaseDetail && onSelectDatabaseDetail(db)}
                className={`pure-card p-5 cursor-pointer transition-all space-y-4 ${
                  isRunning 
                    ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.15)]' 
                    : isDark ? 'border-white/[0.08]' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Info Block */}
                  <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                    <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center font-bold shrink-0 ${
                      isRedis
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
                        : isDark ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.15)]' : 'bg-blue-50 border-blue-200 text-blue-600'
                    }`}>
                      <Database className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2.5">
                        <h3 className={`font-extrabold text-lg tracking-tight truncate hover:text-blue-400 transition-colors ${
                          isDark ? 'text-white' : 'text-slate-900'
                        }`}>
                          {db.name}
                        </h3>
                        <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-md border flex items-center gap-1.5 ${
                          isRunning 
                            ? isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.2)]' : 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : isDark ? 'bg-transparent text-[#888888] border-white/[0.08]' : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
                          {isRunning ? (t.active || 'ACTIVE') : (t.stopped || 'STOPPED')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{db.tech || db.type || 'SQLite'}</p>
                    </div>
                  </div>

                  {/* Actions & Start/Stop Controls */}
                  <div className="flex items-center space-x-3 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyConnectionString(db);
                      }}
                      className={`text-xs py-1.5 px-3 rounded-xl flex items-center space-x-1.5 border font-semibold transition-colors cursor-pointer ${
                        isDark ? 'bg-transparent border-white/[0.1] text-[#E5E5E5] hover:bg-white/[0.06] hover:border-white/[0.2]' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {copiedId === db.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
                      <span>{copiedId === db.id ? (language === 'es' ? '¡Copiado!' : 'Copied!') : (language === 'es' ? 'Copiar URL' : 'Copy URL')}</span>
                    </button>

                    {!isRedis && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setImportExportDb(db);
                        }}
                        className={`text-xs py-1.5 px-3 rounded-xl flex items-center space-x-1.5 border font-semibold transition-colors cursor-pointer ${
                          isDark ? 'bg-[#252525] border-white/[0.08] text-[#E5E5E5] hover:bg-[#303030] hover:border-white/[0.16]' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                        title={language === 'es' ? 'Importar o Exportar respaldos SQL' : 'Import or Export SQL dumps'}
                      >
                        <Upload className="h-3.5 w-3.5 text-blue-400" />
                        <span>Dump SQL</span>
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectDatabaseDetail) onSelectDatabaseDetail(db);
                      }}
                      className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-1.5 px-3.5 rounded-xl transition-all shadow-md shadow-blue-600/20 hover:shadow-[0_0_15px_rgba(37,99,235,0.35)] flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Table className="h-3.5 w-3.5" />
                      <span>{isRedis ? (language === 'es' ? 'Explorar Claves Redis' : 'Explore Redis Keys') : (language === 'es' ? 'Abrir Tablas & Consultas' : 'Open Tables & Queries')}</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* NOT DETECTED ENGINES */}
      {notDetectedEngines.length > 0 && (
        <div className={`p-4 rounded-2xl border space-y-2 text-xs ${
          isDark ? 'bg-[#1E1E1E]/80 border-white/[0.08]' : 'bg-slate-100/60 border-slate-200/80'
        }`}>
          <div className="text-slate-400 font-bold font-mono">
            {language === 'es' ? 'Motores no detectados en el sistema local:' : 'Engines not detected on local system:'}
          </div>

          <div className="flex flex-wrap items-center gap-3 font-mono text-slate-400">
            {notDetectedEngines.map((db) => (
              <div key={db.id} className={`flex items-center space-x-2 px-3 py-1 rounded-xl border ${
                isDark ? 'bg-[#252525] border-white/[0.08]' : 'bg-white border-slate-200'
              }`}>
                <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                <span className={`font-bold ${isDark ? 'text-[#E5E5E5]' : 'text-slate-700'}`}>{db.name}</span>
                <span className="text-slate-400 text-[11px]">({t.notInstalled || 'Not detected'})</span>
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
        theme={theme}
        language={language}
      />

      <ImportExportSqlModal
        isOpen={!!importExportDb}
        onClose={() => setImportExportDb(null)}
        dbEngine={importExportDb}
        theme={theme}
        language={language}
      />
    </div>
  );
}
