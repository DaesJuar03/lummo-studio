import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileJson, FileText, Database, X, Check, Loader2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export default function DataExportModal({ isOpen, onClose, tableName, rows = [], columns = [] }) {
  const [format, setFormat] = useState('csv');
  const [exporting, setExporting] = useState(false);
  const toast = useToast();

  if (!isOpen) return null;

  const formats = [
    { id: 'csv', name: 'CSV (Valores por Coma)', icon: FileText, desc: 'Ideal para procesar en scripts o Excel' },
    { id: 'excel', name: 'TSV / Excel', icon: FileSpreadsheet, desc: 'Delimitado por tabulaciones para Hojas de Cálculo' },
    { id: 'json', name: 'JSON (Objeto Estructurado)', icon: FileJson, desc: 'Formato estándar para APIs y almacenamiento NoSQL' },
    { id: 'sql', name: 'SQL Dump (Sentencias INSERT)', icon: Database, desc: 'Volcado de datos en sentencias SQL listas para ejecutar' }
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
          toast.showSuccess('Exportación Completa', `Archivo guardado en: ${res.filePath}`);
          onClose();
        } else if (res && !res.canceled) {
          toast.showError('Error al Exportar', res.error || 'Ocurrió un problema guardando el archivo');
        }
      } else {
        toast.showInfo('Exportador Simulado', `Simulación de exportación en formato ${format.toUpperCase()}`);
        onClose();
      }
    } catch (err) {
      toast.showError('Error en Exportación', err.message);
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
              <h3 className="font-semibold text-slate-100">Exportación Avanzada de Datos</h3>
              <p className="text-xs text-slate-400 font-mono">
                {tableName || 'Tabla / Consulta'} ({rows.length} registros)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formats list */}
        <div className="p-6 space-y-3">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Seleccionar Formato de Archivo
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
            disabled={exporting}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || rows.length === 0}
            className="px-5 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Exportando...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Guardar Archivo</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
