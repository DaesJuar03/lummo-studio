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
import { getTranslations } from '../../../locales';

export default function RedisWorkbenchTab({
  db,
  theme,
  language = 'es',
  onNotice
}) {
  const isDark = theme === 'dark';
  const t = getTranslations(language);

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
      setRedisKeyDetail({ key: keyName, type: 'string', ttl: 3600, value: 'demo value' });
      setRedisEditVal('demo value');
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
        if (onNotice) onNotice(language === 'es' ? '¡Clave Redis actualizada!' : 'Redis key updated!');
        fetchRedisKeys(redisPattern);
      }
    }
  };

  const handleDeleteRedisKey = async (kName) => {
    if (!kName) return;
    if (window.electronAPI?.db?.redis?.deleteKey) {
      await window.electronAPI.db.redis.deleteKey(db, kName);
      if (onNotice) onNotice(language === 'es' ? `Clave ${kName} eliminada.` : `Key ${kName} deleted.`);
      setSelectedRedisKey(null);
      setRedisKeyDetail(null);
      fetchRedisKeys(redisPattern);
    }
  };

  const handleCreateNewKey = async (e) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    if (window.electronAPI?.db?.redis?.setValue) {
      await window.electronAPI.db.redis.setValue(db, {
        key: newKeyName.trim(),
        value: newKeyVal,
        type: newKeyType,
        ttl: parseInt(newKeyTtl, 10) || -1
      });
      setShowAddModal(false);
      setNewKeyName('');
      setNewKeyVal('');
      fetchRedisKeys(redisPattern);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Search & Filter Bar */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-3 ${
        isDark ? 'bg-[#1E1E1E] border-white/[0.08]' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center space-x-2 w-full md:w-auto flex-1">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={redisPattern}
              onChange={(e) => setRedisPattern(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchRedisKeys(redisPattern)}
              placeholder={language === 'es' ? "Filtrar por patrón (ej: session:*, cache:*, *)..." : "Filter by pattern (e.g. session:*, cache:*, *)..."}
              className={`w-full pl-9 pr-4 py-2 text-xs font-mono rounded-xl border focus:outline-none focus:border-red-500 ${
                isDark ? 'bg-[#141414] border-white/[0.08] text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            />
          </div>
          <button
            onClick={() => fetchRedisKeys(redisPattern)}
            className="p-2 rounded-xl bg-red-600 hover:bg-red-500 text-white transition-colors cursor-pointer"
            title={language === 'es' ? 'Recargar claves' : 'Reload keys'}
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingRedis ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="w-full md:w-auto px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-red-600/20 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>{language === 'es' ? 'Nueva Clave' : 'New Key'}</span>
        </button>
      </div>

      {/* Main Grid: Keys List + Detail Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Keys Sidebar */}
        <div className={`lg:col-span-4 border rounded-2xl p-2 max-h-[550px] overflow-y-auto space-y-1.5 custom-scrollbar ${
          isDark ? 'bg-[#1E1E1E] border-white/[0.08]' : 'bg-white border-slate-200'
        }`}>
          <div className="p-2 flex items-center justify-between text-xs font-mono font-bold text-slate-400 border-b border-white/[0.06] mb-1">
            <span>{language === 'es' ? 'Claves Redis' : 'Redis Keys'} ({redisKeys.length})</span>
            <span>Type / TTL</span>
          </div>

          {redisKeys.map((k) => (
            <div
              key={k.key}
              onClick={() => handleSelectKey(k.key)}
              className={`p-3 rounded-xl border text-xs font-mono font-bold cursor-pointer transition-all flex items-center justify-between ${
                selectedRedisKey === k.key
                  ? 'bg-red-600/15 border-red-500 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.15)]'
                  : isDark ? 'bg-[#252525] border-white/[0.06] text-[#E5E5E5] hover:bg-[#303030]' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <div className="flex items-center space-x-2 truncate">
                <Key className="h-3.5 w-3.5 shrink-0 opacity-70" />
                <span className="truncate">{k.key}</span>
              </div>
              <div className="flex items-center space-x-1.5 shrink-0 text-[10px]">
                <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-extrabold uppercase">{k.type || 'str'}</span>
                <span className="text-slate-400">{k.ttl === -1 ? '∞' : `${k.ttl}s`}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Key Detail Inspector */}
        <div className={`lg:col-span-8 border rounded-2xl overflow-hidden shadow-sm ${
          isDark ? 'bg-[#1E1E1E] border-white/[0.08]' : 'bg-white border-slate-200'
        }`}>
          {selectedRedisKey && redisKeyDetail ? (
            <div className="p-6 space-y-4 text-xs font-mono">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center space-x-2">
                    <Key className="h-4 w-4 text-red-400" />
                    <span>{selectedRedisKey}</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Type: <span className="text-red-400 font-bold uppercase">{redisKeyDetail.type}</span> | TTL: <span className="text-amber-400 font-bold">{redisKeyDetail.ttl === -1 ? 'Persistente (No expira)' : `${redisKeyDetail.ttl} segundos`}</span>
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleDeleteRedisKey(selectedRedisKey)}
                    className="p-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                    title={language === 'es' ? 'Eliminar clave' : 'Delete key'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleSaveRedisVal}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl flex items-center space-x-1.5 shadow-md shadow-red-600/20 cursor-pointer"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{language === 'es' ? 'Guardar Cambios' : 'Save Changes'}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 font-bold uppercase text-[10px]">
                  {language === 'es' ? 'Valor almacenado (Payload):' : 'Stored Value (Payload):'}
                </label>
                <textarea
                  rows={10}
                  value={redisEditVal}
                  onChange={(e) => setRedisEditVal(e.target.value)}
                  className={`w-full p-3.5 font-mono text-xs rounded-xl border focus:outline-none focus:border-red-500 custom-scrollbar ${
                    isDark ? 'bg-[#141414] border-white/[0.08] text-emerald-400' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>
            </div>
          ) : (
            <div className="py-32 text-center text-xs font-mono text-slate-400">
              <Key className="h-8 w-8 mx-auto mb-2 text-slate-600" />
              <span>{language === 'es' ? 'Selecciona una clave de la lista para inspeccionar y editar su contenido' : 'Select a key from the list to inspect and edit its content'}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
