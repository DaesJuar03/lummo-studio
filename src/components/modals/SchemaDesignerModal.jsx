import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Code, Copy, Check, Sparkles, Layers, Database } from 'lucide-react';

export default function SchemaDesignerModal({ isOpen, onClose, tableName: initialTableName = 'nueva_tabla', theme }) {
  const [tableName, setTableName] = useState(initialTableName);
  const [columns, setColumns] = useState([
    { id: 1, name: 'id', type: 'INTEGER', isPk: true, isNullable: false, defaultValue: '' },
    { id: 2, name: 'nombre', type: 'VARCHAR(255)', isPk: false, isNullable: false, defaultValue: '' },
    { id: 3, name: 'email', type: 'VARCHAR(255)', isPk: false, isNullable: false, defaultValue: '' },
    { id: 4, name: 'created_at', type: 'TIMESTAMP', isPk: false, isNullable: true, defaultValue: 'CURRENT_TIMESTAMP' }
  ]);
  const [activeFormat, setActiveFormat] = useState('sql');
  const [copied, setCopied] = useState(false);

  const isDark = theme === 'dark';

  if (!isOpen) return null;

  const handleAddColumn = () => {
    setColumns(prev => [
      ...prev,
      { id: Date.now(), name: `campo_${prev.length + 1}`, type: 'VARCHAR(255)', isPk: false, isNullable: true, defaultValue: '' }
    ]);
  };

  const handleRemoveColumn = (id) => {
    setColumns(prev => prev.filter(c => c.id !== id));
  };

  const handleColumnChange = (id, key, value) => {
    setColumns(prev => prev.map(c => c.id === id ? { ...c, [key]: value } : c));
  };

  // Code Exporter Generators
  const generateExportCode = () => {
    const cleanName = tableName.trim().toLowerCase() || 'nueva_tabla';

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

    if (activeFormat === 'laravel') {
      const fields = columns.map(c => {
        if (c.isPk) return `            $table->id();`;
        let lType = "string('" + c.name + "')";
        if (c.type.includes('INT')) lType = "integer('" + c.name + "')";
        else if (c.type.includes('TIME') || c.type.includes('DATE')) lType = "timestamp('" + c.name + "')";
        
        let chain = `            $table->${lType}`;
        if (c.isNullable) chain += '->nullable()';
        return chain + ';';
      });
      return `Schema::create('${cleanName}', function (Blueprint $table) {\n${fields.join('\n')}\n        });`;
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
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-4xl h-[640px] rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${
            isDark ? 'bg-[#121215] border-[#27272a] text-[#f4f4f5]' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Header */}
          <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
            isDark ? 'bg-[#09090b] border-[#27272a]' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <h3 className={`font-extrabold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Diseñador Visual de Esquemas & Migraciones
                </h3>
                <p className="text-xs text-slate-500">Diseña estructuras de tabla gráficamente y exporta a ORMs modernos</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Layout Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left: Column Builder */}
            <div className={`w-1/2 p-5 space-y-4 overflow-y-auto border-r ${
              isDark ? 'border-[#27272a]' : 'border-slate-200'
            }`}>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider block">Nombre de la Tabla:</label>
                <input
                  type="text"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold focus:outline-none ${
                    isDark ? 'bg-[#18181b] border-[#27272a] text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider block">Columnas ({columns.length}):</label>
                  <button
                    onClick={handleAddColumn}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold font-mono flex items-center gap-1 transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Columna</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {columns.map((col) => (
                    <div key={col.id} className={`p-3 rounded-xl border space-y-2 ${
                      isDark ? 'bg-[#18181b] border-[#27272a]' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={col.name}
                          onChange={(e) => handleColumnChange(col.id, 'name', e.target.value)}
                          placeholder="Nombre columna"
                          className={`flex-1 px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold focus:outline-none ${
                            isDark ? 'bg-[#121215] border-[#27272a] text-white' : 'bg-white border-slate-300'
                          }`}
                        />
                        <select
                          value={col.type}
                          onChange={(e) => handleColumnChange(col.id, 'type', e.target.value)}
                          className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold focus:outline-none ${
                            isDark ? 'bg-[#121215] border-[#27272a] text-blue-400' : 'bg-white border-slate-300 text-blue-700'
                          }`}
                        >
                          <option value="INTEGER">INTEGER</option>
                          <option value="VARCHAR(255)">VARCHAR(255)</option>
                          <option value="TEXT">TEXT</option>
                          <option value="BOOLEAN">BOOLEAN</option>
                          <option value="TIMESTAMP">TIMESTAMP</option>
                          <option value="FLOAT">FLOAT</option>
                        </select>
                        <button
                          onClick={() => handleRemoveColumn(col.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={col.isPk}
                            onChange={(e) => handleColumnChange(col.id, 'isPk', e.target.checked)}
                          />
                          <span>Primary Key</span>
                        </label>

                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={col.isNullable}
                            onChange={(e) => handleColumnChange(col.id, 'isNullable', e.target.checked)}
                          />
                          <span>Nullable</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Code Generator Preview */}
            <div className={`w-1/2 p-5 space-y-4 flex flex-col ${
              isDark ? 'bg-[#09090b]' : 'bg-slate-50'
            }`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {['sql', 'prisma', 'drizzle', 'laravel'].map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setActiveFormat(fmt)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase transition-all ${
                        activeFormat === fmt
                          ? 'bg-blue-600 text-white shadow-xs'
                          : isDark
                          ? 'bg-[#18181b] text-slate-400 hover:text-white border border-[#27272a]'
                          : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 shadow-xs'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleCopyCode}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 shrink-0 transition-colors ${
                    isDark
                      ? 'bg-[#18181b] hover:bg-[#27272a] text-slate-200 border border-[#27272a]'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs'
                  }`}
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? '¡Copiado!' : 'Copiar Código'}</span>
                </button>
              </div>

              <div className={`flex-1 rounded-2xl p-4 font-mono text-xs overflow-auto whitespace-pre leading-relaxed border ${
                isDark
                  ? 'bg-[#121215] border-[#27272a] text-blue-400'
                  : 'bg-slate-900 border-slate-800 text-blue-400'
              }`}>
                {generatedCode}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
