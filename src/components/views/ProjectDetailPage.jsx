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
  RefreshCw,
  Server,
  Share2,
  Zap,
  Boxes,
  Radio
} from 'lucide-react';
import NetworkTunnelModal from '../modals/NetworkTunnelModal';
import ScriptLauncherModal from '../modals/ScriptLauncherModal';
import ExecutionConfigModal from '../modals/ExecutionConfigModal';
import ApiAndWebhookModal from '../modals/ApiAndWebhookModal';

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

  // Modals Open State
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showApiWebhookModal, setShowApiWebhookModal] = useState(false);

  // Tunnel & Local Domain State
  const [tunnelUrl, setTunnelUrl] = useState('');
  const [isStartingTunnel, setIsStartingTunnel] = useState(false);
  const [tunnelCopied, setTunnelCopied] = useState(false);
  const [localDomainInput, setLocalDomainInput] = useState(`${project?.id || 'app'}.test`);
  const [domainSaveMsg, setDomainSaveMsg] = useState('');

  // Custom Script State
  const [customScriptInput, setCustomScriptInput] = useState('');
  const [isExecutingScript, setIsExecutingScript] = useState(false);
  const [scriptMsg, setScriptMsg] = useState('');

  // Update input state if project changes from props
  useEffect(() => {
    if (project) {
      setPortInput(project.port || 3000);
      setCommandInput(project.command || 'npm run dev');
      setLocalDomainInput(`${project.id || 'app'}.test`);
    }
  }, [project?.port, project?.command, project?.id]);

  useEffect(() => {
    if (!window.electronAPI?.onTunnelUrl || !project?.id) return;
    const unsub = window.electronAPI.onTunnelUrl(({ projectId, tunnelUrl: newUrl }) => {
      if (projectId === project.id) {
        setTunnelUrl(newUrl || '');
        setIsStartingTunnel(false);
      }
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [project?.id]);

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

  const handleToggleTunnel = async () => {
    if (tunnelUrl) {
      // Stop active tunnel
      if (window.electronAPI?.stopTunnel) {
        await window.electronAPI.stopTunnel(project.id);
      }
      setTunnelUrl('');
    } else {
      // Start tunnel
      setIsStartingTunnel(true);
      if (window.electronAPI?.startTunnel) {
        const res = await window.electronAPI.startTunnel(project.id, project.port);
        if (res && res.success) {
          if (res.url) {
            setTunnelUrl(res.url);
            setIsStartingTunnel(false);
          }
        } else {
          setIsStartingTunnel(false);
          alert(`Error iniciando túnel: ${res?.error || 'No se pudo iniciar'}`);
        }
      } else {
        // Fallback simulation
        setTimeout(() => {
          setTunnelUrl(`https://lummo-preview-${project.port}.loca.lt`);
          setIsStartingTunnel(false);
        }, 1000);
      }
    }
  };

  const handleCopyTunnelUrl = () => {
    if (!tunnelUrl) return;
    navigator.clipboard.writeText(tunnelUrl);
    setTunnelCopied(true);
    setTimeout(() => setTunnelCopied(false), 2000);
  };

  const handleSaveLocalDomain = async () => {
    const domain = localDomainInput.trim();
    if (!domain) return;
    if (window.electronAPI?.setLocalDomain) {
      const res = await window.electronAPI.setLocalDomain(domain, project.port);
      if (res.success) {
        if (res.hostsUpdated) {
          setDomainSaveMsg({
            type: 'success',
            text: `Dominio activo: http://${domain}:3838 (o http://localhost:3838/proxy/${project.port})`,
            url: res.localUrl || `http://${domain}:3838`
          });
        } else {
          setDomainSaveMsg({
            type: 'warning',
            text: `Proxy activo: http://localhost:3838/proxy/${project.port} (Nota: Para usar ${domain} directamente, ejecuta Lummo como Administrador).`,
            url: res.proxyUrl || `http://localhost:3838/proxy/${project.port}`
          });
        }
      } else {
        setDomainSaveMsg({ type: 'error', text: res.error || 'Error al configurar dominio' });
      }
    } else {
      setDomainSaveMsg({
        type: 'success',
        text: `¡Dominio http://${domain}:3838 configurado!`,
        url: `http://${domain}:3838`
      });
    }
  };

  const handleRunScript = async (scriptCmd) => {
    if (!scriptCmd) return;
    setIsExecutingScript(true);
    setScriptMsg(`Ejecutando "${scriptCmd}"...`);

    if (window.electronAPI?.runProjectScript) {
      const res = await window.electronAPI.runProjectScript(project.id, project.path, scriptCmd);
      if (res.success) {
        setScriptMsg(`¡Comando "${scriptCmd}" ejecutado con éxito!`);
      } else {
        setScriptMsg(`Error al ejecutar: ${res.error}`);
      }
    } else {
      setTimeout(() => {
        setScriptMsg(`¡Comando "${scriptCmd}" finalizado con código 0!`);
      }, 1500);
    }
    setTimeout(() => {
      setIsExecutingScript(false);
      setTimeout(() => setScriptMsg(''), 4000);
    }, 1500);
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
      className={`p-6 max-w-7xl w-full mx-auto space-y-6 flex-1 ${
        isDark ? 'bg-transparent text-[#f4f4f5]' : 'bg-transparent text-slate-900'
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

        {/* Header Action Controls (Organized & Harmonized) */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Main Server Toggle Button */}
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

          {/* Group 1: Core Target Explorers (Browser, Code, Logs) */}
          <div className={`flex items-center gap-0.5 p-1 rounded-2xl border ${
            isDark ? 'bg-[#12141c] border-[#222634]' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => onOpenBrowser(projectUrl)}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                isDark ? 'text-slate-300 hover:bg-[#1f2330] hover:text-white' : 'text-slate-700 hover:bg-white hover:shadow-xs'
              }`}
              title="Abrir en Navegador Web"
            >
              <Globe className="h-4 w-4" />
            </button>

            <button
              onClick={() => onOpenEditor(project.path)}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                isDark ? 'text-slate-300 hover:bg-[#1f2330] hover:text-white' : 'text-slate-700 hover:bg-white hover:shadow-xs'
              }`}
              title="Abrir Carpeta en VS Code / Explorador"
            >
              <FolderOpen className="h-4 w-4" />
            </button>

            <button
              onClick={() => onOpenLogs(project)}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                isDark ? 'text-slate-300 hover:bg-[#1f2330] hover:text-white' : 'text-slate-700 hover:bg-white hover:shadow-xs'
              }`}
              title="Abrir Consola de Logs Independiente"
            >
              <Terminal className="h-4 w-4" />
            </button>
          </div>

          {/* Group 2: Dev Tools & Services (API Client, Network Tunnel, Docker) */}
          <div className={`flex items-center gap-1.5 p-1 rounded-2xl border ${
            isDark ? 'bg-[#12141c] border-[#222634]' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setShowApiWebhookModal(true)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer relative ${
                isDark 
                  ? 'bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 border border-purple-500/30' 
                  : 'bg-purple-100 text-purple-800 hover:bg-purple-200 border border-purple-200'
              }`}
              title="API Client (REST/GraphQL) & Live Webhook Inspector"
            >
              <Radio className="h-3.5 w-3.5 text-purple-400" />
              <span>API & Webhooks</span>
              {tunnelUrl && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              )}
            </button>

            <button
              onClick={() => setShowNetworkModal(true)}
              className={`p-2 rounded-xl transition-all relative cursor-pointer ${
                tunnelUrl 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : isDark ? 'text-slate-300 hover:bg-[#1f2330]' : 'text-slate-700 hover:bg-white hover:shadow-xs'
              }`}
              title="Red & Acceso Externo (Túnel Público y Dominio Local)"
            >
              <Share2 className="h-4 w-4" />
              {tunnelUrl && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              )}
            </button>

            <button
              onClick={() => {
                if (window.electronAPI?.runProjectScript) {
                  window.electronAPI.runProjectScript(project.id, project.path, 'docker compose up -d');
                }
              }}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                isDark ? 'text-cyan-400 hover:bg-[#1f2330]' : 'text-cyan-700 hover:bg-white hover:shadow-xs'
              }`}
              title="Ejecutar docker compose up"
            >
              <Boxes className="h-4 w-4" />
            </button>
          </div>

          {/* Group 3: Automation & Configuration (Scripts, Settings) */}
          <div className={`flex items-center gap-0.5 p-1 rounded-2xl border ${
            isDark ? 'bg-[#12141c] border-[#222634]' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setShowScriptModal(true)}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                isDark ? 'text-amber-400 hover:bg-[#1f2330]' : 'text-amber-600 hover:bg-white hover:shadow-xs'
              }`}
              title="Lanzador de Scripts & Comandos CLI"
            >
              <Zap className="h-4 w-4" />
            </button>

            <button
              onClick={() => setShowConfigModal(true)}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                isDark ? 'text-blue-400 hover:bg-[#1f2330]' : 'text-blue-600 hover:bg-white hover:shadow-xs'
              }`}
              title="Configuración de Ejecución (Puerto y Comando de Inicio)"
            >
              <Settings2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: Top Hero Section (Seamless & Borderless Info & Telemetry Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start py-2">
        {/* Left/Center 9 Columns: Project Tech & Backend Info */}
        <div className="lg:col-span-9 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                <Server className="h-4 w-4" />
              </div>
              <div>
                <h3 className={`font-bold text-xs tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {project.hasBackend ? 'Entorno Dual - Servidor Backend' : 'Información del Proyecto'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {project.hasBackend ? 'Detectado en el proyecto local' : project.techStack || 'Proyecto Local'}
                </p>
              </div>
            </div>
            {project.hasBackend && (
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border bg-purple-500/10 text-purple-400 border-purple-500/20">
                Backend Vinculado
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
            <div className="space-y-1">
              <span className="text-slate-400 font-mono text-[10px] uppercase font-bold tracking-wider block">
                CONFIGURACIÓN DE BACKEND
              </span>
              <p className={`font-mono font-semibold text-xs ${isDark ? 'text-white' : 'text-slate-800'}`}>
                {project.backend?.techStack || project.techStack || 'Configurado en .env'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-mono text-[10px] uppercase font-bold tracking-wider block">
                Puerto Recomendado
              </span>
              <p className={`font-mono font-semibold text-xs ${isDark ? 'text-white' : 'text-slate-800'}`}>
                Puerto :{project.backend?.defaultPort || project.port || 3000}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-mono text-[10px] uppercase font-bold tracking-wider block">
                Ubicación / Carpeta Backend
              </span>
              <p className="font-mono text-[11px] text-slate-400 truncate" title={project.backend?.path || project.path}>
                {project.backend?.path || project.path}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-mono text-[10px] uppercase font-bold tracking-wider block">
                Comando Backend
              </span>
              <p className="font-mono text-[11px] text-slate-400">
                {project.backend?.command || project.command || 'npm run dev'}
              </p>
            </div>

            <div className="space-y-1 md:col-span-2">
              <span className="text-slate-400 font-mono text-[10px] uppercase font-bold tracking-wider block">
                Puertos & Comandos
              </span>
              <div className="flex flex-wrap gap-2 text-[11px] font-mono text-slate-400">
                <span>{project.command}</span>
                <span>{project.backend?.command || 'npm run dev'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 3 Columns: Vertical Status & Telemetry Panel (Divider Line) */}
        <div className={`lg:col-span-3 lg:border-l pl-0 lg:pl-6 space-y-3 ${isDark ? 'border-[#2a2a2a]' : 'border-slate-200'}`}>
          {/* Status Section */}
          <div className="space-y-1">
            <div className="flex items-center space-x-1.5 text-slate-400 font-mono text-[10px] font-bold uppercase tracking-wider">
              <Activity className="h-3.5 w-3.5 text-blue-500" />
              <span>STATUS</span>
            </div>
            <span className={`text-2xl font-black tracking-tight block ${isRunning ? 'text-emerald-500' : 'text-slate-500'}`}>
              {isRunning ? 'RUNNING' : 'STOPPED'}
            </span>
          </div>

          <div className={`border-t ${isDark ? 'border-[#262626]' : 'border-slate-200/60'}`}></div>

          {/* RAM Usage Section */}
          <div className="space-y-1">
            <div className="flex items-center space-x-1.5 text-slate-400 font-mono text-[10px] font-bold uppercase tracking-wider">
              <HardDrive className="h-3.5 w-3.5 text-blue-500" />
              <span>RAM</span>
            </div>
            <div className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {isRunning ? `${ramUsage} MB` : '0 MB'} <span className="text-xs font-normal text-slate-400 font-mono">RAM</span>
            </div>
          </div>

          <div className={`border-t ${isDark ? 'border-[#262626]' : 'border-slate-200/60'}`}></div>

          {/* CPU Usage Section */}
          <div className="space-y-1">
            <div className="flex items-center space-x-1.5 text-slate-400 font-mono text-[10px] font-bold uppercase tracking-wider">
              <Cpu className="h-3.5 w-3.5 text-blue-500" />
              <span>CPU</span>
            </div>
            <div className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {isRunning ? `${cpuUsage}%` : '0%'} <span className="text-xs font-normal text-slate-400 font-mono">CPU</span>
            </div>
          </div>
        </div>
      </div>

      <div className={`border-t ${isDark ? 'border-[#262626]' : 'border-slate-200/80'}`}></div>

      {/* SECTION 2: Middle Grid - Live Preview (Left 6) & .env Editor (Right 6) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left 6: Live Preview (Clean Canvas Grid) */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">
              Live Preview
            </span>
            <span className="text-xs font-mono text-blue-500 font-bold">
              {projectUrl}
            </span>
          </div>

          {/* Web Preview Canvas Box */}
          <div className="relative w-full h-72 rounded-2xl border overflow-hidden bg-slate-900 border-slate-800 flex flex-col items-center justify-center text-center group shadow-sm">
            {isRunning ? (
              <>
                <iframe
                  src={projectUrl}
                  title="Live Preview"
                  className="w-full h-full border-0 pointer-events-auto"
                />
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

        {/* Right 6: .env Variables Editor (Seamless & Borderless) */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center space-x-2">
              <FileCode2 className="h-4 w-4 text-blue-500" />
              <h3 className={`font-bold text-xs tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Editor de Variables de Entorno (.env)
              </h3>
            </div>

            <button
              onClick={() => setRawEnvMode(!rawEnvMode)}
              className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border transition-colors ${
                isDark ? 'bg-[#181818] border-[#2e2e2e] text-slate-300' : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              {rawEnvMode ? 'Modo Formulario' : 'Modo Texto Plano'}
            </button>
          </div>

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
                      isDark ? 'bg-[#181818] border-[#2e2e2e] text-white' : 'bg-white border-slate-200'
                    }`}
                  />
                  <span className="text-slate-400 font-mono font-bold">=</span>
                  <input
                    type="text"
                    placeholder="VALOR"
                    value={pair.value}
                    onChange={(e) => handleEnvPairChange(idx, 'value', e.target.value)}
                    className={`flex-1 border rounded-xl p-2 text-xs font-mono ${
                      isDark ? 'bg-[#181818] border-[#2e2e2e] text-white' : 'bg-white border-slate-200'
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
                <span>Agregar Variable .env</span>
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
                  isDark ? 'bg-[#181818] border-[#2e2e2e] text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleSaveEnv}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center space-x-1.5 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
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

      {/* Network & Tunnel Modal */}
      <NetworkTunnelModal
        isOpen={showNetworkModal}
        onClose={() => setShowNetworkModal(false)}
        project={project}
        tunnelUrl={tunnelUrl}
        isStartingTunnel={isStartingTunnel}
        onToggleTunnel={handleToggleTunnel}
        onCopyTunnelUrl={handleCopyTunnelUrl}
        tunnelCopied={tunnelCopied}
        localDomainInput={localDomainInput}
        setLocalDomainInput={setLocalDomainInput}
        onSaveLocalDomain={handleSaveLocalDomain}
        domainSaveMsg={domainSaveMsg}
        onOpenBrowser={onOpenBrowser}
        theme={theme}
      />

      {/* Script & Command Launcher Modal */}
      <ScriptLauncherModal
        isOpen={showScriptModal}
        onClose={() => setShowScriptModal(false)}
        project={project}
        onRunScript={handleRunScript}
        isExecutingScript={isExecutingScript}
        scriptMsg={scriptMsg}
        onOpenLogs={onOpenLogs}
        theme={theme}
      />

      {/* Execution Config Modal */}
      <ExecutionConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        project={project}
        portInput={portInput}
        setPortInput={setPortInput}
        commandInput={commandInput}
        setCommandInput={setCommandInput}
        onSaveConfig={handleSaveConfig}
        isRestarting={isRestarting}
        savedMessage={savedMessage}
        theme={theme}
      />

      {/* API Client & Webhook Inspector Modal */}
      <ApiAndWebhookModal
        isOpen={showApiWebhookModal}
        onClose={() => setShowApiWebhookModal(false)}
        project={project}
        tunnelUrl={tunnelUrl}
        onStartTunnel={handleToggleTunnel}
        theme={theme}
      />

    </motion.div>
  );
}
