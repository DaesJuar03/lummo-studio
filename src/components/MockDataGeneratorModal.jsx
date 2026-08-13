import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Database, Check, RefreshCw, Layers } from 'lucide-react';

export default function MockDataGeneratorModal({ isOpen, onClose, dbConfig, tableName, columns = [], onGenerated, theme }) {
  const [rowCount, setRowCount] = useState(25);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);
  const [successCount, setSuccessCount] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const isDark = theme === 'dark';

  if (!isOpen) return null;

  // Generate fake data row based on column type heuristics
  const generateSingleMockRow = (cols, index) => {
    const row = {};
    const firstNames = ['Carlos', 'Ana', 'Mateo', 'Sofia', 'Lucas', 'Elena', 'Diego', 'Lucia', 'Gabriel', 'Valentina'];
    const lastNames = ['Garcia', 'Rodriguez', 'Lopez', 'Martinez', 'Gonzalez', 'Perez', 'Sanchez', 'Ramirez', 'Torres'];
    const domains = ['gmail.com', 'outlook.com', 'lummo.dev', 'github.io', 'example.org'];

    cols.forEach((col) => {
      const nameLower = (col.name || '').toLowerCase();
      const typeLower = (col.type || '').toLowerCase();

      // Primary key auto-increment skipping or numeric fallback
      if (col.pk || nameLower === 'id') {
        row[col.name] = index + 1;
        return;
      }

      if (nameLower.includes('email') || nameLower.includes('correo')) {
        const fn = firstNames[index % firstNames.length].toLowerCase();
        const ln = lastNames[index % lastNames.length].toLowerCase();
        row[col.name] = `${fn}.${ln}${index + 10}@${domains[index % domains.length]}`;
      } else if (nameLower.includes('name') || nameLower.includes('nombre') || nameLower.includes('user') || nameLower.includes('author')) {
        row[col.name] = `${firstNames[index % firstNames.length]} ${lastNames[(index * 2) % lastNames.length]}`;
      } else if (nameLower.includes('uuid') || nameLower.includes('token') || nameLower.includes('hash')) {
        row[col.name] = `lummo_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
      } else if (nameLower.includes('price') || nameLower.includes('cost') || nameLower.includes('monto') || nameLower.includes('salary') || nameLower.includes('amount')) {
        row[col.name] = parseFloat((Math.random() * 500 + 10).toFixed(2));
      } else if (nameLower.includes('status') || nameLower.includes('estado')) {
        const statuses = ['active', 'pending', 'completed', 'verified'];
        row[col.name] = statuses[index % statuses.length];
      } else if (nameLower.includes('age') || nameLower.includes('edad') || nameLower.includes('count') || nameLower.includes('stock')) {
        row[col.name] = Math.floor(Math.random() * 80) + 18;
      } else if (nameLower.includes('date') || nameLower.includes('created') || nameLower.includes('updated') || nameLower.includes('fecha')) {
        const d = new Date(Date.now() - Math.floor(Math.random() * 10000000000));
        row[col.name] = d.toISOString().replace('T', ' ').substring(0, 19);
      } else if (typeLower.includes('bool') || typeLower.includes('is_') || typeLower.includes('has_')) {
        row[col.name] = index % 2 === 0 ? 1 : 0;
      } else if (typeLower.includes('int') || typeLower.includes('number')) {
        row[col.name] = Math.floor(Math.random() * 1000) + 1;
      } else {
        row[col.name] = `Dato de prueba ${index + 1}`;
      }
    });

    return row;
  };

  const handlePreview = () => {
    const sample = [];
    for (let i = 0; i < Math.min(5, rowCount); i++) {
      sample.push(generateSingleMockRow(columns, i));
    }
    setPreviewRows(sample);
  };

  const handleGenerateAndInsert = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    setSuccessCount(null);

    try {
      if (!window.electronAPI?.db?.executeQuery) {
        throw new Error('API de base de datos no disponible');
      }

      const colsToInsert = columns.filter(c => !c.pk || (c.type || '').toLowerCase().includes('text') || (c.type || '').toLowerCase().includes('varchar'));
      const colNames = colsToInsert.map(c => c.name);

      if (colNames.length === 0) {
        throw new Error('No hay columnas aptas para insertar datos');
      }

      let inserted = 0;
      for (let i = 0; i < rowCount; i++) {
        const mockRow = generateSingleMockRow(colsToInsert, i);
        const values = colNames.map(col => {
          const val = mockRow[col];
          if (val === null || val === undefined) return 'NULL';
          if (typeof val === 'number') return val;
          return `'${String(val).replace(/'/g, "''")}'`;
        });

        const sql = `INSERT INTO "${tableName}" (${colNames.map(c => `"${c}"`).join(', ')}) VALUES (${values.join(', ')});`;
        await window.electronAPI.db.executeQuery(dbConfig, sql);
        inserted++;
      }

      setSuccessCount(inserted);
      if (onGenerated) onGenerated();
    } catch (err) {
      setErrorMsg(err.message || 'Error al generar datos sintéticos');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${
            isDark ? 'bg-[#121215] border-[#27272a] text-[#f4f4f5]' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Header */}
          <div className={`px-6 py-4 border-b flex items-center justify-between ${
            isDark ? 'bg-[#09090b] border-[#27272a]' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-xs">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className={`font-extrabold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Generador de Datos Sintéticos (Mock Data)
                </h3>
                <p className="text-xs text-slate-500">Poblar tabla <strong className="text-purple-400 font-mono">"{tableName}"</strong> con filas sintéticas</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form Content */}
          <div className="p-6 space-y-5">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            {successCount !== null && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <Check className="h-4 w-4" />
                <span>¡Se insertaron exitosamente {successCount} filas sintéticas en la tabla "{tableName}"!</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider block">
                Cantidad de filas a generar:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[10, 25, 50, 100].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setRowCount(count)}
                    className={`py-2.5 rounded-xl border text-xs font-bold font-mono transition-all ${
                      rowCount === count
                        ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/20'
                        : isDark
                          ? 'bg-[#18181b] border-[#27272a] text-slate-400 hover:text-white'
                          : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {count} Filas
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handlePreview}
                className={`px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                  isDark ? 'bg-[#18181b] border-[#27272a] text-slate-300 hover:text-white' : 'bg-slate-100 border-slate-300 text-slate-700'
                }`}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Previsualizar Muestra</span>
              </button>

              <button
                type="button"
                onClick={handleGenerateAndInsert}
                disabled={isGenerating}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-lg shadow-purple-600/25 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <Sparkles className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>{isGenerating ? 'Generando & Insertando...' : `Insertar ${rowCount} Filas`}</span>
              </button>
            </div>

            {/* Preview table */}
            {previewRows.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="text-[11px] font-bold text-slate-500 font-mono uppercase tracking-wider block">
                  Muestra previa de datos generados:
                </label>
                <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-40">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                      <tr>
                        {Object.keys(previewRows[0] || {}).map(col => (
                          <th key={col} className="p-2 px-3 border-r border-slate-800">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {previewRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-purple-500/5">
                          {Object.values(row).map((val, i) => (
                            <td key={i} className="p-2 px-3 border-r border-slate-800/50 text-slate-300 truncate max-w-[150px]">
                              {String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
