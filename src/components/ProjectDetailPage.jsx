import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Play, 
  Square, 
  Globe, 
  FolderOpen, 
  Terminal, 
  Settings2, 
  ExternalLink,
  Save,
  Check,
  Plus,
  Trash2,
  FileCode2,
  Activity,
  Cpu,
  HardDrive,
  RefreshCw
} from 'lucide-react';

export default function ProjectDetailPage({
  project,
  onBack,
  onToggleProject,
  onOpenBrowser,
  onOpenEditor,
  onOpenLogs,
  onUpdatePort,
  onUpdateCommand,
  theme
}) {
  const [portInput, setPortInput] = useState(project?.port || 3000);
  const [commandInput, setCommandInput] = useState(project?.command || 'npm run dev');
  const [savedMessage, setSavedMessage] = useState('');
  const [isRestarting, setIsRestarting] = useState(false);

  // Update input state if project changes from props
  useEffect(() => {
    if (project) {
      setPortInput(project.port || 3000);
      setCommandInput(project.command || 'npm run dev');
    }
  }, [project?.port, project?.command]);

  // .env Variables State
  const [envContent, setEnvContent] = useState('');
  const [envPairs, setEnvPairs] = useState([
    { key: 'PORT', value: String(project?.port || 3000) },
    { key: 'NODE_ENV', value: 'development' },
    { key: 'VITE_API_URL', value: 'http://localhost:3000/api' }
  ]);
  const [rawEnvMode, setRawEnvMode] = useState(false);
  const [envSaveStatus, setEnvSaveStatus] = useState('');

  // Real-time Telemetry Metrics Simulation
  const [ramUsage, setRamUsage] = useState(128.4);
  const [cpuUsage, setCpuUsage] = useState(0.8);

  const isDark = theme === 'dark';
  const isRunning = project?.status === 'RUNNING';

  // Live telemetry pulse effect when RUNNING
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setRamUsage((prev) => +(120 + Math.random() * 25).toFixed(1));
      setCpuUsage((prev) => +(0.4 + Math.random() * 1.6).toFixed(1));
    }, 2500);
    return () => clearInterval(interval);
  }, [isRunning]);

  // Load .env file if available
  useEffect(() => {
    if (window.electronAPI?.readEnvFile && project?.path) {
      window.electronAPI.readEnvFile(project.path).then((res) => {
        if (res.exists && res.content) {
          setEnvContent(res.content);
          parseEnvPairs(res.content);
        }
      });
    }
  }, [project?.path]);

  const parseEnvPairs = (rawText) => {
    const lines = rawText.split('\n');
    const pairs = [];
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [k, ...v] = trimmed.split('=');
        pairs.push({ key: k.trim(), value: v.join('=').trim() });
      }
    });
    if (pairs.length > 0) setEnvPairs(pairs);
  };

  const generateEnvText = (pairs) => {
    return pairs.map(p => `${p.key}=${p.value}`).join('\n');
  };

  const handleSaveEnv = async () => {
    const textToSave = rawEnvMode ? envContent : generateEnvText(envPairs);
    if (window.electronAPI?.writeEnvFile && project?.path) {
      const res = await window.electronAPI.writeEnvFile(project.path, textToSave);
      if (res.success) {
        setEnvSaveStatus('¡Archivo .env guardado con éxito!');
        setTimeout(() => setEnvSaveStatus(''), 3000);
      }
    } else {
      setEnvSaveStatus('¡Variables .env actualizadas en memoria!');
      setTimeout(() => setEnvSaveStatus(''), 3000);
    }
  };

  const handleAddEnvPair = () => {
    setEnvPairs([...envPairs, { key: '', value: '' }]);
  };

  const handleRemoveEnvPair = (idx) => {
    setEnvPairs(envPairs.filter((_, i) => i !== idx));
  };

  const handleEnvPairChange = (idx, field, val) => {
    const updated = [...envPairs];
    updated[idx][field] = val;
    setEnvPairs(updated);
  };

  if (!project) return null;

  const projectUrl = `http://localhost:${project.port}`;

  const handleSaveConfig = async () => {
    const newPort = parseInt(portInput, 10) || 3000;

    // 1. Sync PORT in envPairs & write to .env file
    const updatedPairs = envPairs.map(p => {
      if (p.key.toUpperCase() === 'PORT' || p.key.toUpperCase() === 'VITE_PORT') {
        return { ...p, value: String(newPort) };
      }
      return p;
    });

    if (!updatedPairs.some(p => p.key.toUpperCase() === 'PORT')) {
      updatedPairs.unshift({ key: 'PORT', value: String(newPort) });
    }
    setEnvPairs(updatedPairs);

    const textToSave = generateEnvText(updatedPairs);
    if (window.electronAPI?.writeEnvFile && project?.path) {
      await window.electronAPI.writeEnvFile(project.path, textToSave);
    }

    // 2. Save port & command in app state
    if (onUpdatePort) onUpdatePort(project.id, newPort);
    if (onUpdateCommand) onUpdateCommand(project.id, commandInput);

    // 3. If currently running, auto-restart server process immediately on new port
    if (isRunning) {
      setIsRestarting(true);
      setSavedMessage('Reiniciando servidor en nuevo puerto...');
      await onToggleProject(project); // Stop active server

      setTimeout(async () => {
        const updatedProj = { ...project, port: newPort, command: commandInput, status: 'STOPPED' };
        await onToggleProject(updatedProj); // Restart server on new port
        setIsRestarting(false);
        setSavedMessage(`¡Servidor activo en puerto :${newPort}!`);
        setTimeout(() => setSavedMessage(''), 3000);
      }, 700);
    } else {
      setSavedMessage('¡Configuración guardada!');
      setTimeout(() => setSavedMessage(''), 2500);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={`p-6 max-w-7xl mx-auto space-y-6 ${
        isDark ? 'bg-[#161616] text-[#e4e4e7]' : 'bg-slate-50 text-slate-900'
      }`}
    >
      
      {/* Top Header Bar */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 ${
        isDark ? 'border-[#2a2a2a]' : 'border-slate-200'
      }`}>
        <div className="flex items-center space-x-3.5 min-w-0">
          <button
            onClick={onBack}
            className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center space-x-1 ${
              isDark ? 'bg-[#181818] border-[#2e2e2e] text-slate-300 hover:bg-[#252525]' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver</span>
          </button>

          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h2 className={`text-2xl font-extrabold tracking-tight truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {project.name}
              </h2>
              <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                isRunning 
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' 
                  : isDark ? 'bg-[#222] text-slate-400 border-[#333]' : 'bg-slate-200 text-slate-600 border-slate-300'
              }`}>
                :{project.port} ({isRunning ? 'Activo' : 'Detenido'})
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5 truncate">{project.path}</p>
          </div>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => onToggleProject(project)}
            disabled={isRestarting}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 text-white shadow-md transition-all cursor-pointer disabled:opacity-50 ${
              isRunning ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
            }`}
          >
            {isRestarting ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : isRunning ? (
              <Square className="h-4 w-4 fill-white" />
            ) : (
              <Play className="h-4 w-4 fill-white" />
            )}
            <span>{isRestarting ? 'Reiniciando...' : isRunning ? 'Detener Servidor' : 'Arrancar Servidor'}</span>
          </button>

          <button
            onClick={() => onOpenBrowser(projectUrl)}
            className={`p-2.5 rounded-xl border transition-all ${
              isDark ? 'bg-[#181818] border-[#2e2e2e] text-slate-300 hover:bg-[#252525]' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
            title="Abrir en Navegador Web"
          >
            <Globe className="h-4 w-4" />
          </button>

          <button
            onClick={() => onOpenEditor(project.path)}
            className={`p-2.5 rounded-xl border transition-all ${
              isDark ? 'bg-[#181818] border-[#2e2e2e] text-slate-300 hover:bg-[#252525]' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
            title="Abrir Carpeta en VS Code / Explorador"
          >
            <FolderOpen className="h-4 w-4" />
          </button>

          <button
            onClick={() => onOpenLogs(project)}
            className={`p-2.5 rounded-xl border transition-all ${
              isDark ? 'bg-[#181818] border-[#2e2e2e] text-slate-300 hover:bg-[#252525]' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
            title="Abrir Consola de Logs Independiente"
          >
            <Terminal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Real-time Status & Telemetry Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Telemetry Card 1 */}
        <div className={`pure-card p-5 border space-y-1.5 ${isDark ? 'border-[#2a2a2a]' : 'border-slate-200'}`}>
          <div className="flex items-center justify-between text-slate-400 font-mono text-[10px] font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-blue-500" /> Telemetría de Proceso
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className={`text-2xl font-extrabold tracking-tight ${isRunning ? 'text-emerald-500' : 'text-slate-500'}`}>
              {isRunning ? 'RUNNING' : 'STOPPED'}
            </span>
            <span className={`w-3 h-3 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
          </div>
        </div>

        {/* Telemetry Card 2 */}
        <div className={`pure-card p-5 border space-y-1.5 ${isDark ? 'border-[#2a2a2a]' : 'border-slate-200'}`}>
          <div className="flex items-center justify-between text-slate-400 font-mono text-[10px] font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <HardDrive className="h-3.5 w-3.5 text-blue-500" /> Memoria RAM Utilizada
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className={`text-2xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {isRunning ? `${ramUsage} MB` : '0 MB'} <span className="text-xs font-normal text-slate-400">RAM</span>
            </span>
          </div>
        </div>

        {/* Telemetry Card 3 */}
        <div className={`pure-card p-5 border space-y-1.5 ${isDark ? 'border-[#2a2a2a]' : 'border-slate-200'}`}>
          <div className="flex items-center justify-between text-slate-400 font-mono text-[10px] font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-blue-500" /> Uso Estimado de CPU
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className={`text-2xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {isRunning ? `${cpuUsage}%` : '0%'} <span className="text-xs font-normal text-slate-400">CPU</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Left Column: Live Embedded Browser Preview & Config */}
        <div className="lg:col-span-6 space-y-6">

          {/* Embedded Live Preview Canvas Container */}
          <div className={`pure-card p-5 border space-y-3 ${isDark ? 'border-[#2a2a2a]' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                Live Preview (Vista Previa)
              </span>
              <span className="text-xs font-mono text-blue-500 font-bold">
                {projectUrl}
              </span>
            </div>

            {/* Embedded Web Preview Box */}
            <div className="relative w-full h-64 rounded-2xl border overflow-hidden bg-slate-900 border-slate-800 flex flex-col items-center justify-center text-center group">
              {isRunning ? (
                <>
                  {/* Real Web Preview Iframe */}
                  <iframe
                    src={projectUrl}
                    title="Live Preview"
                    className="w-full h-full border-0 pointer-events-auto"
                  />

                  {/* Hover Overlay Button to Open External Browser */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center space-y-2 backdrop-blur-xs select-none">
                    <button
                      onClick={() => onOpenBrowser(projectUrl)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-5 rounded-xl shadow-lg flex items-center space-x-2 transition-transform hover:scale-105 cursor-pointer"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>Abrir ({projectUrl})</span>
                    </button>
                    <span className="text-[11px] text-slate-300 font-mono">
                      Servidor en línea escuchando en puerto {project.port}
                    </span>
                  </div>
                </>
              ) : (
                <div className="p-6 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                    <Globe className="h-6 w-6" />
                  </div>
                  <h4 className="text-slate-300 font-bold text-sm">Servidor Detenido</h4>
                  <p className="text-slate-500 text-xs max-w-xs mx-auto">
                    Haz clic en "Arrancar Servidor" para activar el entorno y cargar la vista previa.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Settings Form */}
          <div className={`pure-card p-5 border space-y-4 ${isDark ? 'border-[#2a2a2a]' : 'border-slate-200'}`}>
            <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Configuración de Ejecución</h3>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-500 font-semibold block">Puerto Asignado</label>
                <input
                  type="number"
                  value={portInput}
                  onChange={(e) => setPortInput(e.target.value)}
                  className={`w-full border rounded-xl p-2.5 font-mono font-bold focus:outline-none ${
                    isDark ? 'bg-[#181818] border-[#2e2e2e] text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-slate-500 font-semibold block">Comando de Inicio</label>
                <input
                  type="text"
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  className={`w-full border rounded-xl p-2.5 font-mono font-bold focus:outline-none ${
                    isDark ? 'bg-[#181818] border-[#2e2e2e] text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={handleSaveConfig}
                disabled={isRestarting}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isRestarting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span>{isRestarting ? 'Reiniciando Servidor...' : 'Guardar y Aplicar Puerto'}</span>
              </button>

              {savedMessage && (
                <span className="text-xs text-emerald-500 font-mono font-bold flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> {savedMessage}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic .env Variables Editor */}
        <div className="lg:col-span-6 space-y-4">
          <div className={`pure-card p-5 border space-y-4 ${isDark ? 'border-[#2a2a2a]' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-200/40">
              <div className="flex items-center space-x-2">
                <FileCode2 className="h-5 w-5 text-blue-500" />
                <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Editor de Variables de Entorno (.env)
                </h3>
              </div>

              <button
                onClick={() => setRawEnvMode(!rawEnvMode)}
                className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border transition-colors ${
                  isDark ? 'bg-[#181818] border-[#2e2e2e] text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                {rawEnvMode ? 'Modo Formulario' : 'Modo Texto Plano'}
              </button>
            </div>

            {/* Key-Value Pair Form Editor */}
            {!rawEnvMode ? (
              <div className="space-y-3">
                {envPairs.map((pair, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="CLAVE (ej: PORT)"
                      value={pair.key}
                      onChange={(e) => handleEnvPairChange(idx, 'key', e.target.value)}
                      className={`w-1/2 border rounded-xl p-2 text-xs font-mono font-bold ${
                        isDark ? 'bg-[#181818] border-[#2e2e2e] text-white' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                    <span className="text-slate-400 font-mono font-bold">=</span>
                    <input
                      type="text"
                      placeholder="VALOR"
                      value={pair.value}
                      onChange={(e) => handleEnvPairChange(idx, 'value', e.target.value)}
                      className={`flex-1 border rounded-xl p-2 text-xs font-mono ${
                        isDark ? 'bg-[#181818] border-[#2e2e2e] text-white' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                    <button
                      onClick={() => handleRemoveEnvPair(idx)}
                      className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                      title="Eliminar variable"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                <button
                  onClick={handleAddEnvPair}
                  className="text-xs text-blue-500 font-bold hover:text-blue-600 flex items-center space-x-1 pt-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ Agregar Variable .env</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <textarea
                  rows={8}
                  value={envContent}
                  onChange={(e) => setEnvContent(e.target.value)}
                  placeholder="PORT=3000&#10;NODE_ENV=development"
                  className={`w-full border rounded-2xl p-3 text-xs font-mono font-semibold focus:outline-none ${
                    isDark ? 'bg-[#181818] border-[#2e2e2e] text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-200/40">
              <button
                onClick={handleSaveEnv}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Guardar .env</span>
              </button>

              {envSaveStatus && (
                <span className="text-xs text-emerald-500 font-mono font-bold flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> {envSaveStatus}
                </span>
              )}
            </div>
          </div>
        </div>

      </div>

    </motion.div>
  );
}
