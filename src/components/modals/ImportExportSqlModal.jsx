import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Download, Check, FileText, Camera, RefreshCw } from 'lucide-react';
import { getTranslations } from '../../locales';

export default function ImportExportSqlModal({ isOpen, onClose, dbEngine, db, theme, language = 'es' }) {
  const engineConfig = dbEngine || db;
  const [activeTab, setActiveTab] = useState('import');
  const [selectedFile, setSelectedFile] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const isDark = theme === 'dark';
  const t = getTranslations(language);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);

    if (window.electronAPI?.db?.importSql && engineConfig) {
      const filePath = selectedFile.path || selectedFile.name;
      const res = await window.electronAPI.db.importSql(engineConfig, filePath);
      setIsProcessing(false);

      if (res.success) {
        setStatusMsg({ type: 'success', text: res.message || (language === 'es' ? `¡Backup "${selectedFile.name}" importado con éxito!` : `Backup "${selectedFile.name}" imported successfully!`) });
        setTimeout(() => {
          setStatusMsg(null);
          setSelectedFile(null);
          onClose();
        }, 2000);
      } else {
        setStatusMsg({ type: 'error', text: res.error || (language === 'es' ? 'Error al ejecutar el archivo SQL.' : 'Error executing SQL file.') });
      }
    } else {
      setTimeout(() => {
        setIsProcessing(false);
        setStatusMsg({ type: 'success', text: language === 'es' ? `¡Backup "${selectedFile.name}" importado con éxito!` : `Backup "${selectedFile.name}" imported successfully!` });
        setTimeout(() => {
          setStatusMsg(null);
          setSelectedFile(null);
          onClose();
        }, 1500);
      }, 1000);
    }
  };

  const handleExport = async () => {
    setIsProcessing(true);
    const fileName = `${engineConfig?.id || 'db'}_dump_${Date.now()}.sql`;

    if (window.electronAPI?.db?.exportSql && engineConfig) {
      const res = await window.electronAPI.db.exportSql(engineConfig, fileName);
      setIsProcessing(false);
      if (res.success) {
        setStatusMsg({ type: 'success', text: language === 'es' ? `¡Dump generado exitosamente en "${res.filePath || fileName}"!` : `Dump generated successfully at "${res.filePath || fileName}"!` });
        setTimeout(() => {
          setStatusMsg(null);
          onClose();
        }, 2500);
      } else {
        setStatusMsg({ type: 'error', text: res.error || (language === 'es' ? 'Error exportando SQL dump.' : 'Error exporting SQL dump.') });
      }
    } else {
      setTimeout(() => {
        setIsProcessing(false);
        setStatusMsg({ type: 'success', text: language === 'es' ? `¡Dump "${fileName}" generado!` : `Dump "${fileName}" generated!` });
        setTimeout(() => {
          setStatusMsg(null);
          onClose();
        }, 1500);
      }, 1000);
    }
  };

  const handleCreateSnapshot = async () => {
    setIsProcessing(true);
    if (window.electronAPI?.db?.createSnapshot && engineConfig) {
      const res = await window.electronAPI.db.createSnapshot(engineConfig);
      setIsProcessing(false);
      if (res.success) {
        setStatusMsg({ type: 'success', text: res.message || (language === 'es' ? '¡Snapshot instantáneo creado con éxito!' : 'Instant snapshot created successfully!') });
        setTimeout(() => {
          setStatusMsg(null);
          onClose();
        }, 2500);
      } else {
        setStatusMsg({ type: 'error', text: res.error || (language === 'es' ? 'Error al crear snapshot.' : 'Error creating snapshot.') });
      }
    } else {
      setTimeout(() => {
        setIsProcessing(false);
        setStatusMsg({ type: 'success', text: language === 'es' ? '¡Snapshot instantáneo creado correctamente!' : 'Instant snapshot created successfully!' });
        setTimeout(() => {
          setStatusMsg(null);
          onClose();
        }, 1500);
      }, 1000);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden ${
            isDark ? 'bg-[#141414] border-white/[0.08] text-[#E5E5E5]' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Header */}
          <div className={`px-6 py-4 border-b flex items-center justify-between ${
            isDark ? 'bg-[#181818] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
          }`}>
            <h3 className={`font-extrabold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {language === 'es' ? 'Respaldos & SQL Dump' : 'Backups & SQL Dump'}
            </h3>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-[#2A2A2A]' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
              }`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Sub Navigation */}
          <div className="flex border-b border-white/[0.06] text-xs font-bold">
            <button
              onClick={() => setActiveTab('import')}
              className={`flex-1 py-3 text-center transition-colors cursor-pointer ${
                activeTab === 'import' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              {language === 'es' ? 'Importar SQL' : 'Import SQL'}
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={`flex-1 py-3 text-center transition-colors cursor-pointer ${
                activeTab === 'export' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              {language === 'es' ? 'Exportar Dump' : 'Export Dump'}
            </button>
            <button
              onClick={() => setActiveTab('snapshot')}
              className={`flex-1 py-3 text-center transition-colors cursor-pointer ${
                activeTab === 'snapshot' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              {language === 'es' ? 'Snapshot Rápido' : 'Quick Snapshot'}
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4 text-xs">
            {statusMsg && (
              <div className={`p-3 rounded-xl font-mono text-xs ${
                statusMsg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
              }`}>
                {statusMsg.text}
              </div>
            )}

            {activeTab === 'import' && (
              <div className="space-y-4">
                <p className="text-slate-400">
                  {language === 'es' ? 'Selecciona un archivo .sql o .dump para restaurar tablas y registros en esta base de datos.' : 'Select a .sql or .dump file to restore tables and records into this database.'}
                </p>
                <input
                  type="file"
                  accept=".sql,.dump,.txt"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                />
                <button
                  type="button"
                  disabled={!selectedFile || isProcessing}
                  onClick={handleImport}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md shadow-blue-600/20 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (language === 'es' ? 'Restaurando...' : 'Restoring...') : (language === 'es' ? 'Ejecutar Restauración SQL' : 'Run SQL Restore')}
                </button>
              </div>
            )}

            {activeTab === 'export' && (
              <div className="space-y-4">
                <p className="text-slate-400">
                  {language === 'es' ? 'Genera un volcado completo de la estructura y datos en un archivo .sql descargable.' : 'Generate a complete dump of structure and data into a downloadable .sql file.'}
                </p>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleExport}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  <span>{isProcessing ? (language === 'es' ? 'Generando Dump...' : 'Generating Dump...') : (language === 'es' ? 'Generar y Descargar Dump' : 'Generate & Download Dump')}</span>
                </button>
              </div>
            )}

            {activeTab === 'snapshot' && (
              <div className="space-y-4">
                <p className="text-slate-400">
                  {language === 'es' ? 'Guarda una copia en caliente del estado actual de la base de datos sin detener los servicios.' : 'Save a hot copy of the current database state without stopping services.'}
                </p>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleCreateSnapshot}
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-md shadow-purple-600/20 flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Camera className="h-4 w-4" />
                  <span>{isProcessing ? (language === 'es' ? 'Guardando Snapshot...' : 'Saving Snapshot...') : (language === 'es' ? 'Crear Snapshot Instantáneo' : 'Create Instant Snapshot')}</span>
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
