import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Key, 
  Search, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Clock, 
  HardDrive, 
  Layers, 
  Save, 
  X, 
  AlertTriangle 
} from 'lucide-react';

export default function RedisWorkbenchTab({
  db,
  theme,
  onNotice
}) {
  const isDark = theme === 'dark';

  const [redisPattern, setRedisPattern] = useState('*');
  const [redisKeys, setRedisKeys] = useState([]);
  const [selectedRedisKey, setSelectedRedisKey] = useState(null);
  const [redisKeyDetail, setRedisKeyDetail] = useState(null);
  const [isLoadingRedis, setIsLoadingRedis] = useState(false);
  const [redisEditVal, setRedisEditVal] = useState('');

  // Add Key Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyVal, setNewKeyVal] = useState('');
  const [newKeyTtl, setNewKeyTtl] = useState(-1);
  const [newKeyType, setNewKeyType] = useState('string');

  const fetchRedisKeys = async (pat = '*') => {
    setIsLoadingRedis(true);
    if (window.electronAPI?.db?.redis?.getKeys) {
      const res = await window.electronAPI.db.redis.getKeys(db, pat);
      if (res && res.success) {
        setRedisKeys(res.keys || []);
        if (res.keys.length > 0 && !selectedRedisKey) {
          handleSelectKey(res.keys[0].key);
        }
      }
    } else {
      const demoKeys = [
        { key: 'session:user_891', type: 'hash', ttl: 3600 },
        { key: 'cache:config_theme', type: 'string', ttl: -1 },
        { key: 'queue:emails_pending', type: 'list', ttl: 7200 },
        { key: 'set:active_nodes', type: 'set', ttl: -1 }
      ];
      setRedisKeys(demoKeys);
      if (!selectedRedisKey) handleSelectKey(demoKeys[0].key);
    }
    setIsLoadingRedis(false);
  };

  useEffect(() => {
    fetchRedisKeys(redisPattern);
  }, [db]);

  const handleSelectKey = async (keyName) => {
    setSelectedRedisKey(keyName);
    if (window.electronAPI?.db?.redis?.getValue) {
      const res = await window.electronAPI.db.redis.getValue(db, keyName);
      if (res && res.success) {
        setRedisKeyDetail(res);
        setRedisEditVal(typeof res.value === 'object' ? JSON.stringify(res.value, null, 2) : String(res.value));
      }
    } else {
      setRedisKeyDetail({ key: keyName, type: 'string', ttl: 3600, value: 'valor demo' });
      setRedisEditVal('valor demo');
    }
  };

  const handleSaveRedisVal = async () => {
    if (!selectedRedisKey) return;
    if (window.electronAPI?.db?.redis?.setValue) {
      let valToSave = redisEditVal;
      try {
        if (redisKeyDetail?.type === 'hash' && redisEditVal.startsWith('{')) {
          valToSave = JSON.parse(redisEditVal);
        }
      } catch (e) {}

      const res = await window.electronAPI.db.redis.setValue(db, {
        key: selectedRedisKey,
        value: valToSave,
        type: redisKeyDetail?.type || 'string'
      });
      if (res && res.success) {
        if (onNotice) onNotice('¡Clave Redis actualizada!');
        fetchRedisKeys(redisPattern);
      }
    }
  };

  const handleDeleteRedisKey = async (keyName) => {
    if (!keyName) return;
    if (window.electronAPI?.db?.redis?.deleteKey) {
      await window.electronAPI.db.redis.deleteKey(db, keyName);
      if (onNotice) onNotice(`Clave "${keyName}" eliminada.`);
      setSelectedRedisKey(null);
      setRedisKeyDetail(null);
      fetchRedisKeys(redisPattern);
    }
  };

  const handleFlushDb = async () => {
    if (!confirm('¿Estás seguro de vaciar toda la base de datos Redis (FLUSHDB)?')) return;
    if (window.electronAPI?.db?.redis?.flush) {
      const res = await window.electronAPI.db.redis.flush(db);
      if (res && res.success) {
        if (onNotice) onNotice('Base de datos Redis vaciada.');
        setSelectedRedisKey(null);
        setRedisKeyDetail(null);
        fetchRedisKeys('*');
      }
    }
  };

  const handleCreateNewKey = async () => {
    if (!newKeyName.trim()) return;
    if (window.electronAPI?.db?.redis?.setValue) {
      let valToSave = newKeyVal;
      try {
        if (newKeyType === 'hash' && newKeyVal.startsWith('{')) {
          valToSave = JSON.parse(newKeyVal);
        }
      } catch (e) {}

      await window.electronAPI.db.redis.setValue(db, {
        key: newKeyName.trim(),
        value: valToSave,
        type: newKeyType,
        ttl: Number(newKeyTtl)
      });
      setShowAddModal(false);
      setNewKeyName('');
      setNewKeyVal('');
      fetchRedisKeys(redisPattern);
      handleSelectKey(newKeyName.trim());
      if (onNotice) onNotice(`Clave "${newKeyName}" creada con éxito.`);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Top Controls Bar */}
      <div className={`p-4 border-b flex items-center justify-between gap-3 shrink-0 ${
        isDark ? 'border-white/[0.08] bg-[#0c0d12]' : 'border-slate-200 bg-white'
      }`}>
        <div className="flex items-center space-x-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar patrón (ej: user:* o *)..."
              value={redisPattern}
              onChange={(e) => setRedisPattern(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchRedisKeys(redisPattern)}
              className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs font-mono outline-none ${
                isDark ? 'bg-[#151822] border-white/10 text-white' : 'bg-slate-50 border-slate-200'
              }`}
            />
          </div>
          <button
            onClick={() => fetchRedisKeys(redisPattern)}
            disabled={isLoadingRedis}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isDark ? 'bg-[#151822] border-white/10 text-slate-300 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
            title="Actualizar claves"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingRedis ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Clave</span>
          </button>
          <button
            onClick={handleFlushDb}
            className="px-3 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            title="Vaciar base de datos Redis"
          >
            <Trash2 className="w-4 h-4" />
            <span>FLUSHDB</span>
          </button>
        </div>
      </div>

      {/* Main Split Content: Keys List (Left) & Key Inspector (Right) */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 min-h-0 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-white/[0.08]">
        {/* Left: Keys list */}
        <div className="md:col-span-4 flex flex-col min-h-0 overflow-hidden">
          <div className="p-3 border-b border-white/[0.08] flex items-center justify-between shrink-0">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase">
              Claves ({redisKeys.length})
            </span>
            <span className="text-[10px] font-mono text-slate-500">Patrón: {redisPattern}</span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {redisKeys.map((item) => {
              const isSelected = item.key === selectedRedisKey;
              return (
                <button
                  key={item.key}
                  onClick={() => handleSelectKey(item.key)}
                  className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                    isSelected
                      ? isDark ? 'bg-red-500/15 border-red-500/50 text-white' : 'bg-red-50 border-red-300 text-red-900 font-bold'
                      : isDark ? 'bg-[#12141F] border-white/[0.06] text-slate-300 hover:text-white hover:bg-[#181B28]' : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <span className="block text-xs font-mono truncate font-semibold">{item.key}</span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {item.ttl > 0 ? `TTL: ${item.ttl}s` : 'Sin expiración'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/10 shrink-0 font-bold">
                    {item.type}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Key Inspector */}
        <div className="md:col-span-8 flex flex-col min-h-0 overflow-hidden p-5 space-y-4">
          {redisKeyDetail ? (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3 shrink-0">
                <div>
                  <div className="flex items-center space-x-2">
                    <Key className="w-4 h-4 text-red-400" />
                    <h3 className="font-mono text-sm font-extrabold text-white">{redisKeyDetail.key}</h3>
                  </div>
                  <div className="flex items-center space-x-3 text-[11px] font-mono text-slate-400 pt-1">
                    <span>Tipo: <strong className="uppercase text-slate-200">{redisKeyDetail.type}</strong></span>
                    <span>TTL: <strong className="text-slate-200">{redisKeyDetail.ttl > 0 ? `${redisKeyDetail.ttl} segundos` : 'Permanente (-1)'}</strong></span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleSaveRedisVal}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/20 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Guardar Valor</span>
                  </button>
                  <button
                    onClick={() => handleDeleteRedisKey(redisKeyDetail.key)}
                    className="p-1.5 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 cursor-pointer"
                    title="Eliminar clave"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Value Editor */}
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden space-y-1.5">
                <label className="text-xs font-mono font-bold text-slate-400 uppercase">
                  Contenido / Valor Almacenado:
                </label>
                <textarea
                  value={redisEditVal}
                  onChange={(e) => setRedisEditVal(e.target.value)}
                  className={`flex-1 w-full p-4 rounded-2xl border font-mono text-xs outline-none resize-none ${
                    isDark ? 'bg-[#12141F] border-white/10 text-emerald-400' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <Key className="w-12 h-12 stroke-[1.2] mb-3 text-slate-600" />
              <h4 className="font-bold text-sm text-slate-400">Selecciona una Clave de Redis</h4>
              <p className="text-xs max-w-xs mt-1">
                Explora las claves a la izquierda o utiliza el buscador para inspeccionar y editar sus datos en tiempo real.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Key Modal Dialog */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-4 ${
                isDark ? 'bg-[#151822] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between border-b pb-3 border-white/5">
                <h3 className="font-extrabold text-sm">Nueva Clave en Redis</h3>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold block">Nombre de Clave (Key):</label>
                  <input
                    type="text"
                    placeholder="ej: cache:usuario_100"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border ${
                      isDark ? 'bg-[#12141F] border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-400 font-bold block">Tipo:</label>
                    <select
                      value={newKeyType}
                      onChange={(e) => setNewKeyType(e.target.value)}
                      className={`w-full p-2.5 rounded-xl border ${
                        isDark ? 'bg-[#12141F] border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <option value="string">String</option>
                      <option value="hash">Hash (JSON)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 font-bold block">TTL (segundos):</label>
                    <input
                      type="number"
                      placeholder="-1 (permanente)"
                      value={newKeyTtl}
                      onChange={(e) => setNewKeyTtl(e.target.value)}
                      className={`w-full p-2.5 rounded-xl border ${
                        isDark ? 'bg-[#12141F] border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-bold block">Valor (Value):</label>
                  <textarea
                    rows={4}
                    placeholder="Valor o JSON..."
                    value={newKeyVal}
                    onChange={(e) => setNewKeyVal(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-emerald-400 ${
                      isDark ? 'bg-[#12141F] border-white/10' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateNewKey}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md"
                >
                  Crear Clave
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
