import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Database, Plus, Check } from 'lucide-react';

export default function CreateDatabaseModal({ isOpen, onClose, onCreate }) {
  const [dbName, setDbName] = useState('');
  const [engine, setEngine] = useState('sqlite');
  const [charset, setCharset] = useState('utf8mb4');
  const [created, setCreated] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!dbName.trim()) return;

    onCreate({
      name: dbName.trim().toLowerCase().replace(/\s+/g, '_'),
      engine,
      charset
    });

    setCreated(true);
    setTimeout(() => {
      setCreated(false);
      setDbName('');
      onClose();
    }, 1200);
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
          className="bg-white w-full max-w-md rounded-3xl border border-slate-200 shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Crear Nueva Base de Datos</h3>
                <p className="text-xs text-slate-500">Crea esquemas locales al instante</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            <div>
              <label className="text-slate-700 font-semibold block mb-1.5">Motor de Base de Datos:</label>
              <select
                value={engine}
                onChange={(e) => setEngine(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 focus:outline-none focus:border-blue-600"
              >
                <option value="sqlite">SQLite (archivo local .sqlite en Documentos)</option>
                <option value="mysql">MySQL / MariaDB (Puerto :3306)</option>
                <option value="postgres">PostgreSQL (Puerto :5432)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-700 font-semibold block mb-1.5">Nombre de la Base de Datos:</label>
              <input
                type="text"
                required
                placeholder="ej: mi_tienda_db, users_db"
                value={dbName}
                onChange={(e) => setDbName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            {engine !== 'sqlite' && (
              <div>
                <label className="text-slate-700 font-semibold block mb-1.5">Cotejamiento / Charset:</label>
                <input
                  type="text"
                  value={charset}
                  onChange={(e) => setCharset(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono text-slate-700 focus:outline-none"
                />
              </div>
            )}

            <div className="pt-3 flex justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>

              <motion.button
                whileTap={{ scale: 0.96 }}
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/20 transition-all flex items-center space-x-1.5"
              >
                {created ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                <span>{created ? '¡Creada con Éxito!' : 'Crear Base de Datos'}</span>
              </motion.button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
