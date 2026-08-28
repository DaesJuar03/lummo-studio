import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Copy, 
  Check, 
  Upload, 
  Network, 
  Download 
} from 'lucide-react';
import useClipboard from '../../hooks/useClipboard';
import { getTranslations } from '../../locales';

import ImportExportSqlModal from '../modals/ImportExportSqlModal';
import ErDiagramModal from '../modals/ErDiagramModal';
import DataExportModal from '../modals/DataExportModal';
import SchemaDesignerModal from '../modals/SchemaDesignerModal';

import SqlWorkbenchTab from './database/SqlWorkbenchTab';
import RedisWorkbenchTab from './database/RedisWorkbenchTab';

export default function DatabaseDetailPage({
  db,
  onBack,
  theme,
  language = 'es'
}) {
  const isDark = theme === 'dark';
  const isRedis = db?.engine === 'redis' || db?.type === 'redis';
  const t = getTranslations(language);

  const { copied, copyToClipboard } = useClipboard();
  const [notice, setNotice] = useState('');

  // Modals state
  const [showImportExport, setShowImportExport] = useState(false);
  const [showErModal, setShowErModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showSchemaDesigner, setShowSchemaDesigner] = useState(false);

  // Schema state for SQL
  const [tablesList, setTablesList] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');

  const isRunning = db?.status === 'RUNNING' || db?.status === 'READY';

  const showNoticeToast = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3500);
  };

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
        console.error('Error loading schema:', err);
      }
    } else {
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

  if (!db) return null;

  const connectionString = isRedis
    ? `redis://${db.host || '127.0.0.1'}:${db.port || 6379}`
    : db.id === 'sqlite' 
    ? 'sqlite://local.db'
    : `${db.id}://root@127.0.0.1:${db.port || 3306}/${db.name?.toLowerCase().replace(/\s+/g, '_')}`;

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
              isDark ? 'bg-[#252525] border-white/[0.08] text-[#E5E5E5] hover:bg-[#303030] hover:border-white/[0.16]' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t.back || 'Back'}</span>
          </button>

          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h2 className={`text-2xl font-extrabold tracking-tight truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {db.name}
              </h2>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.15)]">
                {isRedis ? 'Redis Key-Value Cache' : db.tech || (language === 'es' ? 'Base de Datos Relacional' : 'Relational Database')}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono mt-0.5">
              <span>{connectionString}</span>
              <button
                onClick={() => copyToClipboard(connectionString)}
                className="hover:text-blue-400 transition-colors cursor-pointer"
                title={language === 'es' ? 'Copiar string de conexión' : 'Copy connection string'}
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Global Toolbar Actions */}
        {!isRedis && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowErModal(true)}
              className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                isDark ? 'bg-[#252525] border-white/[0.08] text-[#E5E5E5] hover:bg-[#303030] hover:border-white/[0.16]' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Network className="h-3.5 w-3.5 text-blue-400" />
              <span>{t.erDiagram || 'ER Diagram'}</span>
            </button>

            <button
              onClick={() => setShowExportModal(true)}
              className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                isDark ? 'bg-[#252525] border-white/[0.08] text-[#E5E5E5] hover:bg-[#303030] hover:border-white/[0.16]' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Download className="h-3.5 w-3.5 text-emerald-400" />
              <span>{t.exportData || 'Export Data'}</span>
            </button>

            <button
              onClick={() => setShowImportExport(true)}
              className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                isDark ? 'bg-[#252525] border-white/[0.08] text-[#E5E5E5] hover:bg-[#303030] hover:border-white/[0.16]' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Upload className="h-3.5 w-3.5 text-amber-400" />
              <span>{t.dumpSql || 'SQL Dump'}</span>
            </button>
          </div>
        )}
      </div>

      {notice && (
        <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono">
          {notice}
        </div>
      )}

      {/* Main Content Area */}
      {isRedis ? (
        <RedisWorkbenchTab
          db={db}
          theme={theme}
          language={language}
          onNotice={showNoticeToast}
        />
      ) : (
        <SqlWorkbenchTab
          db={db}
          theme={theme}
          language={language}
          tablesList={tablesList}
          selectedTable={selectedTable}
          onSelectTable={setSelectedTable}
          onOpenSchemaDesigner={() => setShowSchemaDesigner(true)}
          onNotice={showNoticeToast}
        />
      )}

      {/* Database Modals */}
      <ImportExportSqlModal
        isOpen={showImportExport}
        onClose={() => setShowImportExport(false)}
        dbEngine={db}
        db={db}
        theme={theme}
        language={language}
      />

      <ErDiagramModal
        isOpen={showErModal}
        onClose={() => setShowErModal(false)}
        dbConfig={db}
        db={db}
        theme={theme}
        language={language}
      />

      <DataExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        tableName={selectedTable}
        theme={theme}
        language={language}
      />

      <SchemaDesignerModal
        isOpen={showSchemaDesigner}
        onClose={() => {
          setShowSchemaDesigner(false);
          loadSchema();
        }}
        tableName="new_table"
        theme={theme}
        language={language}
      />
    </motion.div>
  );
}
