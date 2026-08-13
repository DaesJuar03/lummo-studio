import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Download, Check, FileText, Camera, RefreshCw } from 'lucide-react';

export default function ImportExportSqlModal({ isOpen, onClose, dbEngine }) {
  const [activeTab, setActiveTab] = useState('import'); // 'import' | 'export' | 'snapshot'
  const [selectedFile, setSelectedFile] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);

    if (window.electronAPI?.db?.importSql && dbEngine) {
      const filePath = selectedFile.path || selectedFile.name;
      const res = await window.electronAPI.db.importSql(dbEngine, filePath);
      setIsProcessing(false);

      if (res.success) {
        setStatusMsg({ type: 'success', text: res.message || `¡Backup "${selectedFile.name}" importado con éxito!` });
        setTimeout(() => {
          setStatusMsg(null);
          setSelectedFile(null);
          onClose();
        }, 2000);
      } else {
        setStatusMsg({ type: 'error', text: res.error || 'Error al ejecutar el archivo SQL.' });
      }
    } else {
      setTimeout(() => {
        setIsProcessing(false);
        setStatusMsg({ type: 'success', text: `¡Backup "${selectedFile.name}" importado!` });
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
    const fileName = `${dbEngine?.id || 'db'}_dump_${Date.now()}.sql`;

    if (window.electronAPI?.db?.exportSql && dbEngine) {
      const res = await window.electronAPI.db.exportSql(dbEngine, fileName);
      setIsProcessing(false);
      if (res.success) {
        setStatusMsg({ type: 'success', text: `¡Dump generado exitosamente en "${res.filePath || fileName}"!` });
        setTimeout(() => {
          setStatusMsg(null);
          onClose();
        }, 2500);
      } else {
        setStatusMsg({ type: 'error', text: res.error || 'Error exportando SQL dump.' });
      }
    } else {
      setTimeout(() => {
        setIsProcessing(false);
        setStatusMsg({ type: 'success', text: `¡Dump "${fileName}" generado!` });
        setTimeout(() => {
          setStatusMsg(null);
          onClose();
        }, 1500);
      }, 1000);
    }
  };

  const handleCreateSnapshot = async () => {
    setIsProcessing(true);
    if (window.electronAPI?.db?.createSnapshot && dbEngine) {
      const res = await window.electronAPI.db.createSnapshot(dbEngine);
      setIsProcessing(false);
      if (res.success) {
        setStatusMsg({ type: 'success', text: res.message || '¡Snapshot instantáneo creado con éxito!' });
        setTimeout(() => {
          setStatusMsg(null);
          onClose();
        }, 2500);
      } else {
        setStatusMsg({ type: 'error', text: res.error || 'Error al crear snapshot.' });
      }
    } else {
      setTimeout(() => {
        setIsProcessing(false);
        setStatusMsg({ type: 'success', text: '¡Snapshot instantáneo creado correctamente!' });
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
                <h3 className="font-extrabold text-slate-900 text-base">Respaldos & Dumps SQL</h3>
                <p className="text-xs text-slate-500">Herramientas de respaldo para {dbEngine?.name || 'Base de datos'}</p>
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
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeTab === 'import' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Importar (.sql)</span>
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeTab === 'export' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <Download className="h-3.5 w-3.5" />
              <span>Exportar Dump</span>
            </button>
            <button
              onClick={() => setActiveTab('snapshot')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeTab === 'snapshot' ? 'bg-purple-600 text-white shadow-xs' : 'text-purple-600 hover:bg-purple-100'
              }`}
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Snapshot Instantáneo</span>
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4 text-xs">
            {statusMsg && (
              <div className={`p-3 border rounded-xl font-semibold flex items-center gap-2 ${
                statusMsg.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}>
                <Check className="h-4 w-4 shrink-0" />
                <span>{statusMsg.text}</span>
              </div>
            )}

            {activeTab === 'import' && (
              <div className="space-y-4">
                <p className="text-slate-600">
                  Selecciona un archivo script de respaldo <strong className="text-slate-900 font-mono">.sql</strong> para restaurarlo:
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
                  <button
                    onClick={handleImport}
                    disabled={!selectedFile || isProcessing}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/20 transition-all flex items-center space-x-1.5 disabled:opacity-40 cursor-pointer"
                  >
                    {isProcessing && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                    <span>{isProcessing ? 'Importando...' : 'Ejecutar Importación'}</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'export' && (
              <div className="space-y-4">
                <p className="text-slate-600">
                  Genera un archivo dump SQL con la estructura <code className="font-mono font-bold text-blue-600">CREATE TABLE</code> y todos los registros:
                </p>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl space-y-2 font-mono text-[11px] text-blue-900">
                  <div className="flex justify-between">
                    <span>Motor:</span>
                    <span className="font-bold">{dbEngine?.name || 'Base de datos'}</span>
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
                  <button
                    onClick={handleExport}
                    disabled={isProcessing}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/20 transition-all flex items-center space-x-2 disabled:opacity-40 cursor-pointer"
                  >
                    {isProcessing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    <span>{isProcessing ? 'Generando...' : 'Generar Dump SQL'}</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'snapshot' && (
              <div className="space-y-4">
                <p className="text-slate-600">
                  Crea una foto de respaldo instantánea (snapshot) etiquetada con fecha y hora en el directorio local:
                </p>

                <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl space-y-2 font-mono text-[11px] text-purple-900">
                  <div className="flex justify-between">
                    <span>Destino:</span>
                    <span className="font-bold">.lummo_backups/</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Marca de Tiempo:</span>
                    <span className="font-bold">{new Date().toLocaleTimeString()}</span>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleCreateSnapshot}
                    disabled={isProcessing}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md shadow-purple-600/20 transition-all flex items-center space-x-2 disabled:opacity-40 cursor-pointer"
                  >
                    {isProcessing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                    <span>{isProcessing ? 'Guardando...' : 'Crear Snapshot Instantáneo'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
