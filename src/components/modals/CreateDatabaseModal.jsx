import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Database, Plus, Check, Server } from 'lucide-react';

export default function CreateDatabaseModal({ isOpen, onClose, onCreate, theme = 'dark' }) {
  const [dbName, setDbName] = useState('');
  const [engine, setEngine] = useState('sqlite');
  const [charset, setCharset] = useState('utf8mb4');
  const [host, setHost] = useState('127.0.0.1');
  const [port, setPort] = useState(3306);
  const [created, setCreated] = useState(false);

  const isDark = theme === 'dark';

  if (!isOpen) return null;

  const handleEngineChange = (newEngine) => {
    setEngine(newEngine);
    if (newEngine === 'mysql') setPort(3306);
    else if (newEngine === 'postgres') setPort(5432);
    else if (newEngine === 'redis') setPort(6379);
    else setPort(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!dbName.trim()) return;

    onCreate({
      name: dbName.trim().toLowerCase().replace(/\s+/g, '_'),
      engine,
      charset,
      host,
      port: port || (engine === 'mysql' ? 3306 : engine === 'postgres' ? 5432 : engine === 'redis' ? 6379 : null)
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
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden ${
            isDark ? 'bg-[#0D0E15] border-white/[0.08] text-[#F3F4F6]' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Header */}
          <div className={`px-6 py-4 border-b flex items-center justify-between ${
            isDark ? 'bg-[#090A0F] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/20">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h3 className={`font-extrabold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Conectar o Crear Base de Datos
                </h3>
                <p className="text-xs text-slate-400">SQLite, MySQL, PostgreSQL o Redis</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-[#1E2235]' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
              }`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            <div>
              <label className={`font-bold block mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Motor de Base de Datos:
              </label>
              <select
                value={engine}
                onChange={(e) => handleEngineChange(e.target.value)}
                className={`w-full rounded-xl p-2.5 font-bold border focus:outline-none focus:border-blue-500 transition-all ${
                  isDark ? 'bg-[#12141F] border-white/[0.08] text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <option value="sqlite" className="bg-[#12141F] text-white">SQLite (archivo local .sqlite en Documentos)</option>
                <option value="mysql" className="bg-[#12141F] text-white">MySQL / MariaDB (Puerto estándar :3306)</option>
                <option value="postgres" className="bg-[#12141F] text-white">PostgreSQL (Puerto estándar :5432)</option>
                <option value="redis" className="bg-[#12141F] text-white">Redis Key-Value Cache (Puerto :6379)</option>
              </select>
            </div>

            <div>
              <label className={`font-bold block mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Nombre o Identificador:
              </label>
              <input
                type="text"
                required
                placeholder="ej: mi_tienda_db, cache_redis, users_db"
                value={dbName}
                onChange={(e) => setDbName(e.target.value)}
                className={`w-full rounded-xl p-2.5 font-mono font-bold border focus:outline-none focus:border-blue-500 transition-all ${
                  isDark ? 'bg-[#12141F] border-white/[0.08] text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>

            {engine !== 'sqlite' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`font-bold block mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Host:
                  </label>
                  <input
                    type="text"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="127.0.0.1"
                    className={`w-full rounded-xl p-2.5 font-mono border focus:outline-none transition-all ${
                      isDark ? 'bg-[#12141F] border-white/[0.08] text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`font-bold block mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Puerto:
                  </label>
                  <input
                    type="number"
                    value={port || ''}
                    onChange={(e) => setPort(Number(e.target.value))}
                    placeholder={engine === 'mysql' ? '3306' : engine === 'postgres' ? '5432' : '6379'}
                    className={`w-full rounded-xl p-2.5 font-mono border focus:outline-none transition-all ${
                      isDark ? 'bg-[#12141F] border-white/[0.08] text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>
            )}

            <div className="pt-3 flex justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2.5 rounded-xl border font-bold transition-all cursor-pointer ${
                  isDark
                    ? 'border-white/[0.08] bg-[#181B28] text-slate-300 hover:bg-[#1E2235] hover:text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Cancelar
              </button>

              <motion.button
                whileTap={{ scale: 0.96 }}
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md shadow-blue-600/20 hover:shadow-[0_0_15px_rgba(37,99,235,0.35)] transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                {created ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                <span>{created ? '¡Conectada con Éxito!' : 'Crear / Conectar'}</span>
              </motion.button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
