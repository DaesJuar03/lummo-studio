import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Copy, Check, Layers } from 'lucide-react';
import { getTranslations } from '../../locales';

export default function SchemaDesignerModal({ isOpen, onClose, tableName: initialTableName = 'new_table', theme, language = 'es' }) {
  const [tableName, setTableName] = useState(initialTableName);
  const [columns, setColumns] = useState([
    { id: 1, name: 'id', type: 'INTEGER', isPk: true, isNullable: false, defaultValue: '' },
    { id: 2, name: 'name', type: 'VARCHAR(255)', isPk: false, isNullable: false, defaultValue: '' },
    { id: 3, name: 'email', type: 'VARCHAR(255)', isPk: false, isNullable: false, defaultValue: '' },
    { id: 4, name: 'created_at', type: 'TIMESTAMP', isPk: false, isNullable: true, defaultValue: 'CURRENT_TIMESTAMP' }
  ]);
  const [activeFormat, setActiveFormat] = useState('sql');
  const [copied, setCopied] = useState(false);

  const isDark = theme === 'dark';
  const t = getTranslations(language);

  if (!isOpen) return null;

  const handleAddColumn = () => {
    setColumns(prev => [
      ...prev,
      { id: Date.now(), name: `col_${prev.length + 1}`, type: 'VARCHAR(255)', isPk: false, isNullable: true, defaultValue: '' }
    ]);
  };

  const handleRemoveColumn = (id) => {
    setColumns(prev => prev.filter(c => c.id !== id));
  };

  const handleColumnChange = (id, key, value) => {
    setColumns(prev => prev.map(c => c.id === id ? { ...c, [key]: value } : c));
  };

  const generateExportCode = () => {
    const cleanName = tableName.trim().toLowerCase() || 'new_table';

    if (activeFormat === 'sql') {
      const colDefs = columns.map(c => {
        let def = `  "${c.name}" ${c.type}`;
        if (c.isPk) def += ' PRIMARY KEY AUTOINCREMENT';
        if (!c.isNullable && !c.isPk) def += ' NOT NULL';
        if (c.defaultValue) def += ` DEFAULT ${c.defaultValue}`;
        return def;
      });
      return `CREATE TABLE "${cleanName}" (\n${colDefs.join(',\n')}\n);`;
    }

    if (activeFormat === 'prisma') {
      const modelName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
      const fields = columns.map(c => {
        let pType = 'String';
        if (c.type.includes('INT')) pType = 'Int';
        else if (c.type.includes('BOOL')) pType = 'Boolean';
        else if (c.type.includes('TIME') || c.type.includes('DATE')) pType = 'DateTime';
        
        let line = `  ${c.name} ${pType}${c.isNullable ? '?' : ''}`;
        if (c.isPk) line += ' @id @default(autoincrement())';
        if (c.defaultValue === 'CURRENT_TIMESTAMP') line += ' @default(now())';
        return line;
      });
      return `model ${modelName} {\n${fields.join('\n')}\n}`;
    }

    if (activeFormat === 'drizzle') {
      const fields = columns.map(c => {
        let dFunc = `text('${c.name}')`;
        if (c.type.includes('INT')) dFunc = `integer('${c.name}')`;
        else if (c.type.includes('BOOL')) dFunc = `boolean('${c.name}')`;
        else if (c.type.includes('TIME') || c.type.includes('DATE')) dFunc = `timestamp('${c.name}')`;
        
        let chain = `  ${c.name}: ${dFunc}`;
        if (c.isPk) chain += '.primaryKey()';
        if (!c.isNullable) chain += '.notNull()';
        return chain;
      });
      return `import { sqliteTable, text, integer, timestamp } from 'drizzle-orm/sqlite-core';\n\nexport const ${cleanName} = sqliteTable('${cleanName}', {\n${fields.join(',\n')}\n});`;
    }

    return '';
  };

  const generatedCode = generateExportCode();

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden ${
            isDark ? 'bg-[#141414] border-white/[0.08] text-[#E5E5E5]' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Header */}
          <div className={`px-6 py-4 border-b flex items-center justify-between ${
            isDark ? 'bg-[#181818] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/20">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <h3 className={`font-extrabold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {language === 'es' ? 'Diseñador Visual de Esquemas & Modelos' : 'Visual Schema & Model Designer'}
                </h3>
                <p className="text-xs text-slate-400">
                  {language === 'es' ? 'Crea tablas y exporta a SQL DDL, Prisma o Drizzle ORM' : 'Create tables and export to SQL DDL, Prisma or Drizzle ORM'}
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
          <div className="p-6 space-y-4 text-xs font-mono">
            <div className="space-y-1.5">
              <label className="text-slate-400 font-bold uppercase text-[10px]">
                {language === 'es' ? 'Nombre de la Tabla:' : 'Table Name:'}
              </label>
              <input
                type="text"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                className={`w-full p-2.5 rounded-xl border font-mono font-bold focus:outline-none focus:border-blue-500 ${
                  isDark ? 'bg-[#1E1E1E] border-white/[0.08] text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>

            {/* Column List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase">{language === 'es' ? 'Columnas del Modelo:' : 'Model Columns:'}</span>
                <button
                  type="button"
                  onClick={handleAddColumn}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  <span>{language === 'es' ? 'Agregar Columna' : 'Add Column'}</span>
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                {columns.map((c) => (
                  <div key={c.id} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={c.name}
                      onChange={(e) => handleColumnChange(c.id, 'name', e.target.value)}
                      placeholder="column_name"
                      className="flex-1 p-2 rounded-lg bg-[#1E1E1E] border border-white/10 text-white text-xs"
                    />
                    <select
                      value={c.type}
                      onChange={(e) => handleColumnChange(c.id, 'type', e.target.value)}
                      className="p-2 rounded-lg bg-[#1E1E1E] border border-white/10 text-white text-xs"
                    >
                      <option value="INTEGER">INTEGER</option>
                      <option value="VARCHAR(255)">VARCHAR(255)</option>
                      <option value="TEXT">TEXT</option>
                      <option value="BOOLEAN">BOOLEAN</option>
                      <option value="TIMESTAMP">TIMESTAMP</option>
                      <option value="DECIMAL(10,2)">DECIMAL(10,2)</option>
                    </select>
                    <label className="flex items-center space-x-1 text-[11px] text-slate-300">
                      <input
                        type="checkbox"
                        checked={c.isPk}
                        onChange={(e) => handleColumnChange(c.id, 'isPk', e.target.checked)}
                      />
                      <span>PK</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleRemoveColumn(c.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Export Format Selector & Code Preview */}
            <div className="space-y-2 pt-2 border-t border-white/[0.06]">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  {['sql', 'prisma', 'drizzle'].map(fmt => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setActiveFormat(fmt)}
                      className={`px-3 py-1 rounded-lg uppercase text-[10px] font-bold cursor-pointer ${
                        activeFormat === fmt ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs flex items-center space-x-1 cursor-pointer"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? (language === 'es' ? '¡Copiado!' : 'Copied!') : (language === 'es' ? 'Copiar Código' : 'Copy Code')}</span>
                </button>
              </div>

              <div className={`p-3 rounded-xl border max-h-40 overflow-auto font-mono text-xs ${
                isDark ? 'bg-[#1A1A1A] border-white/[0.06] text-emerald-400' : 'bg-slate-100 border-slate-200 text-slate-900'
              }`}>
                <pre className="whitespace-pre-wrap">{generatedCode}</pre>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
