import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Radio,
  AlertTriangle,
  Eye,
  EyeOff,
  Copy,
  Layers,
  X
} from 'lucide-react';
import NetworkTunnelModal from '../modals/NetworkTunnelModal';
import ScriptLauncherModal from '../modals/ScriptLauncherModal';
import ExecutionConfigModal from '../modals/ExecutionConfigModal';
import ApiAndWebhookModal from '../modals/ApiAndWebhookModal';
import DockerComposeModal from '../modals/DockerComposeModal';

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
  const [showDockerModal, setShowDockerModal] = useState(false);
  const [hasDockerCompose, setHasDockerCompose] = useState(false);

  // Port Conflict Modal State
  const [portConflict, setPortConflict] = useState(null); // { port, pid, processName }
  const [isResolvingPort, setIsResolvingPort] = useState(false);

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

  // .env Variables & Example Comparison State
  const [envContent, setEnvContent] = useState('');
  const [envExampleContent, setEnvExampleContent] = useState('');
  const [hasEnvExample, setHasEnvExample] = useState(false);
  const [missingKeys, setMissingKeys] = useState([]);
  const [maskSecrets, setMaskSecrets] = useState(true);
  const [selectedEnvFile, setSelectedEnvFile] = useState('.env');
  const [envPairs, setEnvPairs] = useState([
    { key: 'PORT', value: String(project?.port || 3000) },
    { key: 'NODE_ENV', value: 'development' },
    { key: 'VITE_API_URL', value: 'http://localhost:3000/api' }
  ]);
  const [rawEnvMode, setRawEnvMode] = useState(false);
  const [envSaveStatus, setEnvSaveStatus] = useState('');

  // Real Telemetry Metrics (PID from OS)
  const [ramUsage, setRamUsage] = useState(0);
  const [cpuUsage, setCpuUsage] = useState(0);

  const isDark = theme === 'dark';
  const isRunning = project?.status === 'RUNNING';

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

  // Real-time Process Telemetry querying via IPC
  useEffect(() => {
    if (!isRunning || !project?.id) {
      setRamUsage(0);
      setCpuUsage(0);
      return;
    }

    const fetchRealMetrics = async () => {
      if (window.electronAPI?.getProcessMetrics) {
        const stats = await window.electronAPI.getProcessMetrics({ projectId: project.id });
        if (stats && stats.success) {
          setRamUsage(stats.memoryMb || 0);
          setCpuUsage(stats.cpu || 0);
          return;
        } else {
          setRamUsage(0);
          setCpuUsage(0);
          return;
        }
      }
      // Demo fallback when running outside Electron in static browser
      setRamUsage(0);
      setCpuUsage(0);
    };

    fetchRealMetrics();
    const interval = setInterval(fetchRealMetrics, 2500);
    return () => clearInterval(interval);
  }, [isRunning, project?.id]);

  // Load .env and .env.example files
  useEffect(() => {
    if (window.electronAPI?.readEnvFile && project?.path) {
      window.electronAPI.readEnvFile(project.path).then((res) => {
        if (res.exists && res.content) {
          setEnvContent(res.content);
          parseEnvPairs(res.content);
        }
        if (res.exampleExists && res.exampleContent) {
          setHasEnvExample(true);
          setEnvExampleContent(res.exampleContent);
          detectMissingEnvKeys(res.content || '', res.exampleContent);
        } else {
          setHasEnvExample(false);
        }
      });
    }

    if (window.electronAPI?.docker?.detectFiles && project?.path) {
      window.electronAPI.docker.detectFiles(project.path).then((res) => {
        setHasDockerCompose(Boolean(res && res.hasDocker));
      });
    }
  }, [project?.path]);

  const detectMissingEnvKeys = (currentEnv, exampleEnv) => {
    const extractKeys = (txt) => {
      return txt
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#') && l.includes('='))
        .map(l => l.split('=')[0].trim());
    };
    const curKeys = new Set(extractKeys(currentEnv));
    const exKeys = extractKeys(exampleEnv);
    const missing = exKeys.filter(k => !curKeys.has(k));
    setMissingKeys(missing);
  };

  const handleImportMissingKeys = () => {
    if (!envExampleContent) return;
    const exampleLines = envExampleContent.split('\n');
    const newPairsToAdd = [];
    exampleLines.forEach(l => {
      const trimmed = l.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [k, ...v] = trimmed.split('=');
        const key = k.trim();
        if (missingKeys.includes(key)) {
          newPairsToAdd.push({ key, value: v.join('=').trim() });
        }
      }
    });

    const updated = [...envPairs, ...newPairsToAdd];
    setEnvPairs(updated);
    setMissingKeys([]);
    setEnvSaveStatus('¡Claves de .env.example añadidas!');
    setTimeout(() => setEnvSaveStatus(''), 3000);
  };

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
      const res = await window.electronAPI.writeEnvFile(project.path, textToSave, selectedEnvFile);
      if (res.success) {
        setEnvSaveStatus(`¡${selectedEnvFile} guardado con éxito!`);
        setTimeout(() => setEnvSaveStatus(''), 3000);
      }
    } else {
      setEnvSaveStatus(`¡${selectedEnvFile} guardado!`);
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

  // Smart Server Start with Port Conflict Resolution
  const handleSmartToggleProject = async () => {
    if (isRunning) {
      onToggleProject(project);
      return;
    }

    // Check if port is already occupied before starting
    if (window.electronAPI?.identifyPortProcess) {
      const portInfo = await window.electronAPI.identifyPortProcess(project.port || 3000);
      if (portInfo && portInfo.busy && portInfo.pid) {
        setPortConflict(portInfo);
        return;
      }
    }

    onToggleProject(project);
  };

  const handleKillConflictAndStart = async () => {
    if (!portConflict || !portConflict.port) return;
    setIsResolvingPort(true);

    if (window.electronAPI?.killPortProcess) {
      await window.electronAPI.killPortProcess(portConflict.port);
    }

    setTimeout(() => {
      setIsResolvingPort(false);
      setPortConflict(null);
      onToggleProject(project);
    }, 600);
  };

  const handleUseFreePortAndStart = async () => {
    setIsResolvingPort(true);
    let nextPort = (project.port || 3000) + 1;
    if (window.electronAPI?.findFreePort) {
      nextPort = await window.electronAPI.findFreePort(project.port || 3000);
    }

    if (onUpdatePort) onUpdatePort(project.id, nextPort);
    setPortInput(nextPort);

    setTimeout(() => {
      setIsResolvingPort(false);
      setPortConflict(null);
      const updatedProj = { ...project, port: nextPort };
      onToggleProject(updatedProj);
    }, 400);
  };

  const handleToggleTunnel = async (provider = 'cloudflare') => {
    if (tunnelUrl) {
      if (window.electronAPI?.stopTunnel) {
        await window.electronAPI.stopTunnel(project.id);
      }
      setTunnelUrl('');
    } else {
      setIsStartingTunnel(true);
      if (window.electronAPI?.startTunnel) {
        const res = await window.electronAPI.startTunnel(project.id, project.port, provider);
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
        setTimeout(() => {
          setTunnelUrl(`https://lummo-preview-${project.port}.trycloudflare.com`);
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
      const res = await window.electronAPI.setLocalDomain(domain, project.port, true);
      if (res.success) {
        setDomainSaveMsg({
          type: 'success',
          text: `Dominio seguro vinculado con éxito`,
          url: res.httpsUrl || `https://${domain}:8443`,
          httpUrl: res.httpUrl || `http://${domain}:3838`,
          sslActive: res.sslActive
        });
      } else {
        setDomainSaveMsg({ type: 'error', text: res.error || 'Error al configurar dominio' });
      }
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
      await window.electronAPI.writeEnvFile(project.path, textToSave, selectedEnvFile);
    }

    if (onUpdatePort) onUpdatePort(project.id, newPort);
    if (onUpdateCommand) onUpdateCommand(project.id, commandInput);

    if (isRunning) {
      setIsRestarting(true);
      setSavedMessage('Reiniciando servidor en nuevo puerto...');
      await onToggleProject(project);

      setTimeout(async () => {
        const updatedProj = { ...project, port: newPort, command: commandInput, status: 'STOPPED' };
        await onToggleProject(updatedProj);
        setIsRestarting(false);
        setSavedMessage(`¡Servidor activo en puerto :${newPort}!`);
        setTimeout(() => setSavedMessage(''), 3000);
      }, 700);
    } else {
      setSavedMessage('¡Configuración guardada!');
      setTimeout(() => setSavedMessage(''), 2500);
    }
  };

  const isSecretKey = (k) => {
    const s = k.toUpperCase();
    return s.includes('SECRET') || s.includes('KEY') || s.includes('PASSWORD') || s.includes('TOKEN') || s.includes('AUTH') || s.includes('PRIVATE');
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
        isDark ? 'border-white/[0.08]' : 'border-slate-200'
      }`}>
        <div className="flex items-center space-x-3.5 min-w-0">
          <button
            onClick={onBack}
            className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer ${
              isDark ? 'bg-[#181B28] border-white/[0.08] text-[#F3F4F6] hover:bg-[#1E2235] hover:border-white/[0.16]' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
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
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                  : isDark ? 'bg-[#181B28] text-slate-400 border-white/[0.08]' : 'bg-slate-200 text-slate-600 border-slate-300'
              }`}>
                :{project.port} ({isRunning ? 'Activo' : 'Detenido'})
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">{project.path}</p>
          </div>
        </div>

        {/* Header Action Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Main Server Toggle Button */}
          <button
            onClick={handleSmartToggleProject}
            disabled={isRestarting}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 text-white shadow-md transition-all cursor-pointer disabled:opacity-50 ${
              isRunning 
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20' 
                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20 hover:shadow-[0_0_20px_rgba(37,99,235,0.35)]'
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

          {/* Group 1: Core Target Explorers */}
          <div className={`flex items-center gap-0.5 p-1 rounded-2xl border ${
            isDark ? 'bg-[#12141F] border-white/[0.08]' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => onOpenBrowser(projectUrl)}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                isDark ? 'text-[#94A3B8] hover:bg-[#1E2235] hover:text-white' : 'text-slate-700 hover:bg-white hover:shadow-xs'
              }`}
              title="Abrir en Navegador Web"
            >
              <Globe className="h-4 w-4" />
            </button>

            <button
              onClick={() => onOpenEditor(project.path)}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                isDark ? 'text-[#94A3B8] hover:bg-[#1E2235] hover:text-white' : 'text-slate-700 hover:bg-white hover:shadow-xs'
              }`}
              title="Abrir Carpeta en VS Code / Explorador"
            >
              <FolderOpen className="h-4 w-4" />
            </button>

            <button
              onClick={() => onOpenLogs(project)}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                isDark ? 'text-[#94A3B8] hover:bg-[#1E2235] hover:text-white' : 'text-slate-700 hover:bg-white hover:shadow-xs'
              }`}
              title="Abrir Consola de Logs Independiente"
            >
              <Terminal className="h-4 w-4" />
            </button>
          </div>

          {/* Group 2: Dev Tools & Services */}
          <div className={`flex items-center gap-1.5 p-1 rounded-2xl border ${
            isDark ? 'bg-[#12141F] border-white/[0.08]' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setShowApiWebhookModal(true)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer relative ${
                isDark 
                  ? 'bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 border border-purple-500/30' 
                  : 'bg-purple-100 text-purple-800 hover:bg-purple-200 border border-purple-200'
              }`}
              title="API Client & Live Webhook Inspector"
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
                  : isDark ? 'text-[#94A3B8] hover:bg-[#1E2235] hover:text-white' : 'text-slate-700 hover:bg-white hover:shadow-xs'
              }`}
              title="Red & Acceso Externo (Túneles Cloudflare & Localtunnel)"
            >
              <Share2 className="h-4 w-4" />
              {tunnelUrl && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              )}
            </button>

            <button
              onClick={() => setShowDockerModal(true)}
              className={`p-2 rounded-xl transition-all cursor-pointer relative ${
                hasDockerCompose 
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/25' 
                  : isDark ? 'text-[#94A3B8] hover:bg-[#1E2235] hover:text-white' : 'text-slate-700 hover:bg-white hover:shadow-xs'
              }`}
              title="Gestor Visual de Docker Compose & Contenedores"
            >
              <Boxes className="h-4 w-4" />
              {hasDockerCompose && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan-400"></span>
              )}
            </button>
          </div>

          {/* Group 3: Automation & Configuration */}
          <div className={`flex items-center gap-0.5 p-1 rounded-2xl border ${
            isDark ? 'bg-[#12141F] border-white/[0.08]' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setShowScriptModal(true)}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                isDark ? 'text-amber-400 hover:bg-[#1E2235]' : 'text-amber-600 hover:bg-white hover:shadow-xs'
              }`}
              title="Lanzador de Scripts & Comandos CLI"
            >
              <Zap className="h-4 w-4" />
            </button>

            <button
              onClick={() => setShowConfigModal(true)}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                isDark ? 'text-blue-400 hover:bg-[#1E2235]' : 'text-blue-600 hover:bg-white hover:shadow-xs'
              }`}
              title="Configuración de Ejecución (Puerto y Comando de Inicio)"
            >
              <Settings2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: Top Hero Section (Info & Real Telemetry Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start py-2">
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
                Puerto Asignado
              </span>
              <p className={`font-mono font-semibold text-xs ${isDark ? 'text-white' : 'text-slate-800'}`}>
                Puerto :{project.port || 3000}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-mono text-[10px] uppercase font-bold tracking-wider block">
                Ubicación / Carpeta
              </span>
              <p className="font-mono text-[11px] text-slate-400 truncate" title={project.path}>
                {project.path}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-mono text-[10px] uppercase font-bold tracking-wider block">
                Comando de Inicio
              </span>
              <p className="font-mono text-[11px] text-slate-400">
                {project.command || 'npm run dev'}
              </p>
            </div>
          </div>
        </div>

        {/* Right 3 Columns: Real Telemetry Metrics */}
        <div className={`lg:col-span-3 lg:border-l pl-0 lg:pl-6 space-y-3 ${isDark ? 'border-white/[0.08]' : 'border-slate-200'}`}>
          <div className="space-y-1">
            <div className="flex items-center space-x-1.5 text-slate-400 font-mono text-[10px] font-bold uppercase tracking-wider">
              <Activity className="h-3.5 w-3.5 text-blue-400" />
              <span>ESTADO</span>
            </div>
            <span className={`text-2xl font-black tracking-tight block ${isRunning ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'text-slate-500'}`}>
              {isRunning ? 'RUNNING' : 'STOPPED'}
            </span>
          </div>

          <div className={`border-t ${isDark ? 'border-white/[0.08]' : 'border-slate-200/60'}`}></div>

          {/* Real RAM Metric */}
          <div className="space-y-1">
            <div className="flex items-center space-x-1.5 text-slate-400 font-mono text-[10px] font-bold uppercase tracking-wider">
              <HardDrive className="h-3.5 w-3.5 text-blue-400" />
              <span>MEMORIA RAM REAL</span>
            </div>
            <div className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {isRunning ? `${ramUsage} MB` : '0 MB'} <span className="text-xs font-normal text-slate-400 font-mono">RSS</span>
            </div>
          </div>

          <div className={`border-t ${isDark ? 'border-white/[0.08]' : 'border-slate-200/60'}`}></div>

          {/* Real CPU Metric */}
          <div className="space-y-1">
            <div className="flex items-center space-x-1.5 text-slate-400 font-mono text-[10px] font-bold uppercase tracking-wider">
              <Cpu className="h-3.5 w-3.5 text-blue-400" />
              <span>CPU REAL</span>
            </div>
            <div className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {isRunning ? `${cpuUsage}%` : '0%'} <span className="text-xs font-normal text-slate-400 font-mono">PROCESO</span>
            </div>
          </div>
        </div>
      </div>

      <div className={`border-t ${isDark ? 'border-white/[0.08]' : 'border-slate-200/80'}`}></div>

      {/* SECTION 2: Middle Grid - Live Preview (Left 6) & Advanced .env Editor (Right 6) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left 6: Live Preview */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
              Live Preview
            </span>
            <span className="text-xs font-mono text-blue-400 font-bold">
              {projectUrl}
            </span>
          </div>

          <div className={`relative w-full h-80 rounded-2xl border overflow-hidden flex flex-col items-center justify-center text-center group shadow-sm ${
            isDark ? 'bg-[#090A0F] border-white/[0.08]' : 'bg-slate-900 border-slate-800'
          }`}>
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
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2.5 px-5 rounded-xl shadow-lg hover:shadow-[0_0_20px_rgba(37,99,235,0.35)] flex items-center space-x-2 transition-transform hover:scale-105 cursor-pointer"
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
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto ${
                  isDark ? 'bg-[#12141F] border border-white/[0.08] text-slate-400' : 'bg-slate-800 text-slate-400'
                }`}>
                  <Globe className="h-6 w-6" />
                </div>
                <h4 className="text-slate-300 font-bold text-sm">Servidor Detenido</h4>
                <p className="text-slate-400 text-xs max-w-xs mx-auto">
                  Haz clic en "Arrancar Servidor" para activar el entorno y cargar la vista previa.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right 6: Advanced .env Manager (with .env.example diff & secret masking) */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center space-x-2">
              <FileCode2 className="h-4 w-4 text-blue-400" />
              <h3 className={`font-bold text-xs tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Variables de Entorno ({selectedEnvFile})
              </h3>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setMaskSecrets(!maskSecrets)}
                className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                  isDark ? 'bg-[#181B28] border-white/[0.08] text-slate-400 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-600'
                }`}
                title={maskSecrets ? 'Revelar valores secretos' : 'Ocultar valores secretos'}
              >
                {maskSecrets ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>

              <button
                onClick={() => setRawEnvMode(!rawEnvMode)}
                className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                  isDark ? 'bg-[#181B28] border-white/[0.08] text-[#F3F4F6] hover:bg-[#1E2235]' : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                {rawEnvMode ? 'Formulario' : 'Texto Plano'}
              </button>
            </div>
          </div>

          {/* Missing Keys from .env.example Alert */}
          {hasEnvExample && missingKeys.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  Faltan <strong>{missingKeys.length}</strong> variables declaradas en <code>.env.example</code>
                </span>
              </div>
              <button
                type="button"
                onClick={handleImportMissingKeys}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-black font-bold text-[10px] rounded-lg transition-all cursor-pointer"
              >
                Importar Claves
              </button>
            </div>
          )}

          {!rawEnvMode ? (
            <div className="space-y-2.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
              {envPairs.map((pair, idx) => {
                const isSecret = isSecretKey(pair.key);
                return (
                  <div key={idx} className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="CLAVE (ej: PORT)"
                      value={pair.key}
                      onChange={(e) => handleEnvPairChange(idx, 'key', e.target.value)}
                      className={`w-2/5 border rounded-xl p-2 text-xs font-mono font-bold transition-all ${
                        isDark ? 'bg-[#12141F] border-white/[0.08] text-white focus:border-blue-500' : 'bg-white border-slate-200'
                      }`}
                    />
                    <span className="text-slate-400 font-mono font-bold">=</span>
                    <input
                      type={maskSecrets && isSecret ? 'password' : 'text'}
                      placeholder="VALOR"
                      value={pair.value}
                      onChange={(e) => handleEnvPairChange(idx, 'value', e.target.value)}
                      className={`flex-1 border rounded-xl p-2 text-xs font-mono transition-all ${
                        isDark ? 'bg-[#12141F] border-white/[0.08] text-white focus:border-blue-500' : 'bg-white border-slate-200'
                      }`}
                    />
                    <button
                      onClick={() => handleRemoveEnvPair(idx)}
                      className="p-2 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Eliminar variable"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}

              <button
                onClick={handleAddEnvPair}
                className="text-xs text-blue-400 font-bold hover:text-blue-300 flex items-center space-x-1 pt-1 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Agregar Variable</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <textarea
                rows={7}
                value={envContent}
                onChange={(e) => setEnvContent(e.target.value)}
                placeholder="PORT=3000&#10;NODE_ENV=development"
                className={`w-full border rounded-2xl p-3 text-xs font-mono font-semibold focus:outline-none transition-all ${
                  isDark ? 'bg-[#12141F] border-white/[0.08] text-white focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900'
                }`}
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleSaveEnv}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center space-x-1.5 shadow-md shadow-blue-600/20 hover:shadow-[0_0_15px_rgba(37,99,235,0.35)] transition-all cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Guardar {selectedEnvFile}</span>
            </button>

            {envSaveStatus && (
              <span className="text-xs text-emerald-400 font-mono font-bold flex items-center gap-1">
                <Check className="h-3.5 w-3.5" /> {envSaveStatus}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Port Conflict Modal */}
      <AnimatePresence>
        {portConflict && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden p-6 space-y-4 ${
                isDark ? 'bg-[#0D0E15] border-white/[0.08] text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center space-x-3 text-amber-400">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm">Puerto en Conflicto (:{portConflict.port})</h3>
                  <p className="text-xs text-slate-400">El puerto ya está siendo utilizado por otro proceso.</p>
                </div>
              </div>

              <div className={`p-3.5 rounded-xl border text-xs font-mono space-y-1 ${
                isDark ? 'bg-[#12141F] border-white/[0.08]' : 'bg-slate-100 border-slate-200'
              }`}>
                <div>Proceso: <span className="text-indigo-400 font-bold">{portConflict.processName}</span></div>
                <div>PID: <span className="text-amber-400 font-bold">{portConflict.pid}</span></div>
                <div>Puerto: <span className="text-slate-300 font-bold">:{portConflict.port}</span></div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleKillConflictAndStart}
                  disabled={isResolvingPort}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Square className="h-3.5 w-3.5 fill-white" />
                  <span>Liberar Puerto (Finalizar PID {portConflict.pid}) y Arrancar</span>
                </button>

                <button
                  type="button"
                  onClick={handleUseFreePortAndStart}
                  disabled={isResolvingPort}
                  className={`w-full py-2.5 px-4 rounded-xl border font-bold text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                    isDark ? 'bg-[#181B28] border-white/[0.08] text-[#F3F4F6] hover:bg-[#1E2235]' : 'bg-slate-100 border-slate-200 text-slate-800'
                  }`}
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>Asignar Siguiente Puerto Libre y Arrancar</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPortConflict(null)}
                  className="w-full py-1.5 text-xs text-slate-500 hover:text-slate-300 text-center cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

      {/* Docker Compose & Containers Dashboard Modal */}
      <DockerComposeModal
        isOpen={showDockerModal}
        onClose={() => setShowDockerModal(false)}
        project={project}
        theme={theme}
      />

    </motion.div>
  );
}
