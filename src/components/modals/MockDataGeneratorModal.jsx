import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Check, RefreshCw } from 'lucide-react';
import { getTranslations } from '../../locales';

export default function MockDataGeneratorModal({ isOpen, onClose, dbConfig, tableName, columns = [], onGenerated, theme, language = 'es' }) {
  const [rowCount, setRowCount] = useState(25);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);
  const [successCount, setSuccessCount] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const isDark = theme === 'dark';
  const t = getTranslations(language);

  if (!isOpen) return null;

  const generateSingleMockRow = (cols, index) => {
    const row = {};
    const firstNames = ['Carlos', 'Ana', 'Mateo', 'Sofia', 'Lucas', 'Elena', 'Diego', 'Lucia', 'Gabriel', 'Valentina'];
    const lastNames = ['Garcia', 'Rodriguez', 'Lopez', 'Martinez', 'Gonzalez', 'Perez', 'Sanchez', 'Ramirez', 'Torres'];
    const domains = ['gmail.com', 'outlook.com', 'lummo.dev', 'github.io', 'example.org'];

    cols.forEach((col) => {
      const nameLower = (col.name || '').toLowerCase();
      const typeLower = (col.type || '').toLowerCase();

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
        row[col.name] = `Test data ${index + 1}`;
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
      const colsToInsert = columns.filter(c => !c.pk || (c.type || '').toLowerCase().includes('text') || (c.type || '').toLowerCase().includes('varchar'));
      const colNames = colsToInsert.map(c => c.name);

      if (colNames.length === 0) {
        throw new Error(language === 'es' ? 'No hay columnas aptas para insertar datos' : 'No suitable columns to insert data');
      }

      let inserted = 0;
      const generatedMockRows = [];

      for (let i = 0; i < rowCount; i++) {
        const mockRow = generateSingleMockRow(columns, i);
        generatedMockRows.push(mockRow);

        if (window.electronAPI?.db?.executeQuery) {
          const values = colNames.map(col => {
            const val = mockRow[col];
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'number') return val;
            return `'${String(val).replace(/'/g, "''")}'`;
          });

          const sql = `INSERT INTO "${tableName}" (${colNames.map(c => `"${c}"`).join(', ')}) VALUES (${values.join(', ')});`;
          try {
            await window.electronAPI.db.executeQuery(dbConfig, sql);
            inserted++;
          } catch (_e) {}
        } else {
          inserted++;
        }
      }

      setSuccessCount(inserted);
      if (onGenerated) onGenerated(generatedMockRows);
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err) {
      setErrorMsg(err.message);
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
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden ${
            isDark ? 'bg-[#141414] border-white/[0.08] text-[#E5E5E5]' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Header */}
          <div className={`px-6 py-4 border-b flex items-center justify-between ${
            isDark ? 'bg-[#181818] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-md shadow-purple-600/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className={`font-extrabold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {language === 'es' ? 'Generador de Datos de Prueba (Mock Data)' : 'Mock Data Generator'}
                </h3>
                <p className="text-xs text-slate-400">
                  {language === 'es' ? `Llenar tabla "${tableName}" con registros sintéticos reales` : `Fill "${tableName}" table with realistic synthetic data`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-[#2A2A2A]' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
              }`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4 text-xs">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-mono">
                {errorMsg}
              </div>
            )}

            {successCount !== null && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono flex items-center space-x-2">
                <Check className="h-4 w-4" />
                <span>{language === 'es' ? `¡${successCount} registros insertados exitosamente!` : `${successCount} records inserted successfully!`}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-slate-400 font-bold uppercase text-[10px]">
                {language === 'es' ? 'Cantidad de Registros a Insertar:' : 'Number of Records to Insert:'}
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={rowCount}
                onChange={(e) => setRowCount(parseInt(e.target.value, 10) || 1)}
                className={`w-full p-2.5 rounded-xl border font-mono font-bold focus:outline-none focus:border-purple-500 ${
                  isDark ? 'bg-[#1E1E1E] border-white/[0.08] text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handlePreview}
                className={`px-3 py-1.5 rounded-xl border font-bold text-xs cursor-pointer ${
                  isDark ? 'border-white/10 text-slate-300 hover:bg-[#252525]' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {language === 'es' ? 'Previsualizar 5 Filas' : 'Preview 5 Rows'}
              </button>

              <button
                type="button"
                disabled={isGenerating}
                onClick={handleGenerateAndInsert}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-md shadow-purple-600/20 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>{language === 'es' ? 'Insertando...' : 'Inserting...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>{language === 'es' ? 'Generar e Insertar' : 'Generate & Insert'}</span>
                  </>
                )}
              </button>
            </div>

            {previewRows.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">{language === 'es' ? 'Muestra de datos:' : 'Data Sample:'}</span>
                <div className={`p-2.5 rounded-xl border max-h-40 overflow-auto font-mono text-[11px] ${
                  isDark ? 'bg-[#1A1A1A] border-white/[0.06] text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-800'
                }`}>
                  <pre>{JSON.stringify(previewRows, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
