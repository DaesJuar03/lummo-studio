import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileJson, FileText, Database, X, Check } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { getTranslations } from '../../locales';

export default function DataExportModal({ isOpen, onClose, tableName, rows = [], columns = [], language = 'es' }) {
  const [format, setFormat] = useState('csv');
  const [exporting, setExporting] = useState(false);
  const toast = useToast();
  const t = getTranslations(language);

  if (!isOpen) return null;

  const formats = [
    { 
      id: 'csv', 
      name: language === 'es' ? 'CSV (Valores por Coma)' : 'CSV (Comma-Separated Values)', 
      icon: FileText, 
      desc: language === 'es' ? 'Ideal para procesar en scripts o Excel' : 'Ideal for scripting or Excel processing' 
    },
    { 
      id: 'excel', 
      name: language === 'es' ? 'TSV / Excel' : 'TSV / Excel', 
      icon: FileSpreadsheet, 
      desc: language === 'es' ? 'Delimitado por tabulaciones para Hojas de Cálculo' : 'Tab-delimited for Spreadsheets' 
    },
    { 
      id: 'json', 
      name: language === 'es' ? 'JSON (Objeto Estructurado)' : 'JSON (Structured Objects)', 
      icon: FileJson, 
      desc: language === 'es' ? 'Formato estándar para APIs y almacenamiento NoSQL' : 'Standard format for APIs and NoSQL stores' 
    },
    { 
      id: 'sql', 
      name: language === 'es' ? 'SQL Dump (Sentencias INSERT)' : 'SQL Dump (INSERT Statements)', 
      icon: Database, 
      desc: language === 'es' ? 'Volcado de datos en sentencias SQL listas para ejecutar' : 'Data dump in ready-to-run SQL INSERTs' 
    }
  ];

  const handleExport = async () => {
    setExporting(true);
    try {
      if (window.electronAPI && window.electronAPI.db?.exportDataFile) {
        const res = await window.electronAPI.db.exportDataFile({
          format,
          tableName,
          rows,
          columns
        });

        if (res && res.success) {
          toast.showSuccess(language === 'es' ? 'Exportación Completa' : 'Export Complete', `${language === 'es' ? 'Archivo guardado en:' : 'File saved at:'} ${res.filePath}`);
          onClose();
        } else if (res && !res.canceled) {
          toast.showError(language === 'es' ? 'Error al Exportar' : 'Export Error', res.error || (language === 'es' ? 'Ocurrió un problema guardando el archivo' : 'A problem occurred saving the file'));
        }
      } else {
        toast.showInfo(language === 'es' ? 'Exportador Simulado' : 'Simulated Export', `${language === 'es' ? 'Simulación de exportación en formato' : 'Export simulation in format'} ${format.toUpperCase()}`);
        onClose();
      }
    } catch (err) {
      toast.showError(language === 'es' ? 'Error en Exportación' : 'Export Error', err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100">{language === 'es' ? 'Exportación Avanzada de Datos' : 'Advanced Data Export'}</h3>
              <p className="text-xs text-slate-400 font-mono">
                {tableName || (language === 'es' ? 'Tabla / Consulta' : 'Table / Query')} ({rows.length} {language === 'es' ? 'registros' : 'records'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formats list */}
        <div className="p-6 space-y-3">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            {language === 'es' ? 'Seleccionar Formato de Archivo' : 'Select File Format'}
          </label>
          <div className="grid grid-cols-1 gap-2.5">
            {formats.map((fmt) => {
              const Icon = fmt.icon;
              const isSelected = format === fmt.id;

              return (
                <div
                  key={fmt.id}
                  onClick={() => setFormat(fmt.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-emerald-950/40 border-emerald-500/80 text-emerald-200 shadow-md shadow-emerald-500/10'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-slate-100">{fmt.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{fmt.desc}</p>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            {t.cancel || 'Cancel'}
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{exporting ? (language === 'es' ? 'Exportando...' : 'Exporting...') : (language === 'es' ? 'Guardar Archivo' : 'Save File')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
