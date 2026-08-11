import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Download, Check, FileText } from 'lucide-react';

export default function ImportExportSqlModal({ isOpen, onClose, dbEngine }) {
  const [activeTab, setActiveTab] = useState('import');
  const [selectedFile, setSelectedFile] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleImport = () => {
    if (!selectedFile) return;
    setStatusMsg({ type: 'success', text: `¡Backup "${selectedFile.name}" importado con éxito en ${dbEngine?.name}!` });
    setTimeout(() => {
      setStatusMsg(null);
      setSelectedFile(null);
      onClose();
    }, 1500);
  };

  const handleExport = () => {
    const fileName = `${dbEngine?.id || 'dump'}_backup_${Date.now()}.sql`;
    setStatusMsg({ type: 'success', text: `¡Dump de base de datos generado como "${fileName}"!` });
    setTimeout(() => {
      setStatusMsg(null);
      onClose();
    }, 1500);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Importar / Exportar SQL Dump</h3>
                <p className="text-xs text-slate-500">Respaldos para {dbEngine?.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Sub-tabs */}
          <div className="px-6 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('import')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeTab === 'import' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Importar (.sql)</span>
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeTab === 'export' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <Download className="h-3.5 w-3.5" />
              <span>Exportar Dump (.sql)</span>
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4 text-xs">
            {statusMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl font-semibold flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{statusMsg.text}</span>
              </div>
            )}

            {activeTab === 'import' ? (
              <div className="space-y-4">
                <p className="text-slate-600">
                  Selecciona un archivo script de respaldo <strong className="text-slate-900 font-mono">.sql</strong> para restaurarlo en {dbEngine?.name}:
                </p>

                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-blue-400 transition-colors bg-slate-50/50">
                  <input
                    type="file"
                    accept=".sql"
                    onChange={handleFileChange}
                    className="hidden"
                    id="sql-file-input"
                  />
                  <label htmlFor="sql-file-input" className="cursor-pointer space-y-2 block">
                    <Upload className="h-8 w-8 text-blue-600 mx-auto" />
                    <span className="font-bold text-slate-800 block">
                      {selectedFile ? selectedFile.name : 'Haz clic para seleccionar tu archivo .sql'}
                    </span>
                    <span className="text-[11px] text-slate-400 block">Archivos aceptados: .sql, .dump</span>
                  </label>
                </div>

                <div className="flex justify-end pt-2">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={handleImport}
                    disabled={!selectedFile}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/20 transition-all disabled:opacity-40"
                  >
                    Ejecutar Importación
                  </motion.button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-slate-600">
                  Genera una copia de seguridad en archivo SQL comprimido con todas las tablas y esquemas de {dbEngine?.name}:
                </p>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl space-y-2 font-mono text-[11px] text-blue-900">
                  <div className="flex justify-between">
                    <span>Motor:</span>
                    <span className="font-bold">{dbEngine?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Formato:</span>
                    <span className="font-bold">SQL Standard Dump (.sql)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cotejamiento:</span>
                    <span className="font-bold">UTF-8 Unicode</span>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={handleExport}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/20 transition-all flex items-center space-x-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Generar y Descargar Dump .sql</span>
                  </motion.button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
