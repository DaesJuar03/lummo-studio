import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Play, 
  Square, 
  ExternalLink, 
  Terminal, 
  Globe, 
  Save, 
  RefreshCw, 
  Trash2, 
  Plus, 
  FileCode2, 
  Settings2, 
  FolderOpen, 
  Activity, 
  Check, 
  Server, 
  HardDrive, 
  Cpu, 
  Share2, 
  Eye, 
  EyeOff, 
  AlertTriangle,
  Zap,
  Boxes,
  Radio,
  GitBranch,
  Copy,
  Pause,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { getTranslations } from '../../locales';

import NetworkTunnelModal from '../modals/NetworkTunnelModal';
import ScriptLauncherModal from '../modals/ScriptLauncherModal';
import ExecutionConfigModal from '../modals/ExecutionConfigModal';
import DockerComposeModal from '../modals/DockerComposeModal';
import GitInspectorModal from '../modals/GitInspectorModal';
import GitInspectorView from './git/GitInspectorView';
import SyntaxGuardBadge from '../common/SyntaxGuardBadge';

export default function ProjectDetailPage({
  project,
  projectLogs = [],
  onClearProjectLogs,
  activeDiagnostic,
  onDismissDiagnostic,
  onBack,
  onToggleProject,
  onOpenBrowser,
  onOpenEditor,
  onOpenLogs,
  onUpdateProject,
  onUpdatePort,
  onUpdateCommand,
  theme,
  language = 'es'
}) {
  const isDark = theme === 'dark';
  const t = getTranslations(language);

  const [portInput, setPortInput] = useState(project?.port || 3000);
  const [commandInput, setCommandInput] = useState(project?.command || 'npm run dev');
  const [isRestarting, setIsRestarting] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  // .env Variables State
  const [selectedEnvFile, setSelectedEnvFile] = useState('.env');
  const [envContent, setEnvContent] = useState('');
  const [envPairs, setEnvPairs] = useState([]);
  const [rawEnvMode, setRawEnvMode] = useState(false);
  const [envSaveStatus, setEnvSaveStatus] = useState('');
  const [maskSecrets, setMaskSecrets] = useState(true);

  // .env.example Diff State
  const [hasEnvExample, setHasEnvExample] = useState(false);
  const [envExampleContent, setEnvExampleContent] = useState('');
  const [missingKeys, setMissingKeys] = useState([]);

  // Telemetry real process state
  const [ramUsage, setRamUsage] = useState(0);
  const [cpuUsage, setCpuUsage] = useState(0);
  const [ramHistory, setRamHistory] = useState([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const [cpuHistory, setCpuHistory] = useState([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const [pathCopied, setPathCopied] = useState(false);

  // Bottom terminal logs panel state
  const [isLogsOpen, setIsLogsOpen] = useState(true);
  const [autoScrollLogs, setAutoScrollLogs] = useState(true);
  const logsContainerRef = useRef(null);
  const logsEndRef = useRef(null);

  const handleCopyPath = () => {
    if (project?.path) {
      navigator.clipboard.writeText(project.path);
      setPathCopied(true);
      setTimeout(() => setPathCopied(false), 2000);
    }
  };

  const handleClearCurrentLogs = () => {
    if (onClearProjectLogs) {
      onClearProjectLogs();
    }
  };

  // Sparkline SVG path generators
  const generateSparkline = useCallback((data, width = 64, height = 20) => {
    if (!data || data.length === 0) return '';
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    const stepX = width / (data.length - 1);
    const points = data.map((val, i) => {
      const x = i * stepX;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return `M ${points.join(' L ')}`;
  }, []);

  const generateSparklineArea = useCallback((data, width = 64, height = 20) => {
    if (!data || data.length === 0) return '';
    const line = generateSparkline(data, width, height);
    if (!line) return '';
    return `${line} L ${width},${height} L 0,${height} Z`;
  }, [generateSparkline]);

  // Sub-modals state
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [showDockerModal, setShowDockerModal] = useState(false);
  const [showGitModal, setShowGitModal] = useState(false);

  const [isGitExpEnabled, setIsGitExpEnabled] = useState(
    () => typeof localStorage !== 'undefined' && localStorage.getItem('lummo-exp-git') === 'true'
  );
  const [hasGitRepo, setHasGitRepo] = useState(false);
  const [gitBranchName, setGitBranchName] = useState('');
  const [activeRightTab, setActiveRightTab] = useState('env'); // 'env' | 'git'

  useEffect(() => {
    const syncExp = () => {
      try {
        setIsGitExpEnabled(localStorage.getItem('lummo-exp-git') === 'true');
      } catch {}
    };
    window.addEventListener('lummo-exp-updated', syncExp);
    window.addEventListener('storage', syncExp);
    return () => {
      window.removeEventListener('lummo-exp-updated', syncExp);
      window.removeEventListener('storage', syncExp);
    };
  }, []);

  useEffect(() => {
    if (project?.path && window.electronAPI?.git?.getStatus) {
      window.electronAPI.git.getStatus(project.path).then((res) => {
        if (res?.hasGit) {
          setHasGitRepo(true);
          setGitBranchName(res.currentBranch || 'main');
        } else {
          setHasGitRepo(false);
        }
      }).catch(() => {});
    }
  }, [project?.path]);

  // Cloudflare / Localtunnel State
  const [tunnelUrl, setTunnelUrl] = useState('');
  const [isStartingTunnel, setIsStartingTunnel] = useState(false);
  const [tunnelCopied, setTunnelCopied] = useState(false);

  // Local Domains .test State
  const [localDomainInput, setLocalDomainInput] = useState('');
  const [domainSaveMsg, setDomainSaveMsg] = useState(null);

  // Script Runner State
  const [isExecutingScript, setIsExecutingScript] = useState(false);
  const [scriptMsg, setScriptMsg] = useState('');

  // Port Conflict Resolution State
  const [portConflict, setPortConflict] = useState(null);
  const [isResolvingPort, setIsResolvingPort] = useState(false);

  // Docker Compose detection state
  const [hasDockerCompose, setHasDockerCompose] = useState(false);

  const isRunning = project?.status === 'RUNNING';

  const parseEnvPairs = useCallback((content) => {
    if (!content) {
      setEnvPairs([]);
      return;
    }
    const lines = content.split('\n');
    const pairs = [];
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [k, ...v] = trimmed.split('=');
        pairs.push({ key: k.trim(), value: v.join('=').trim() });
      }
    });
    setEnvPairs(pairs);
  }, []);

  const detectMissingEnvKeys = useCallback((actualEnvContent, exampleContent) => {
    if (!exampleContent) {
      setMissingKeys([]);
      return;
    }
    const exampleLines = exampleContent.split('\n');
    const exampleKeys = [];
    exampleLines.forEach(l => {
      const trimmed = l.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        exampleKeys.push(trimmed.split('=')[0].trim());
      }
    });

    const actualLines = (actualEnvContent || '').split('\n');
    const actualKeys = new Set();
    actualLines.forEach(l => {
      const trimmed = l.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        actualKeys.add(trimmed.split('=')[0].trim());
      }
    });

    const missing = exampleKeys.filter(k => !actualKeys.has(k));
    setMissingKeys(missing);
  }, []);

  useEffect(() => {
    if (project) {
      setPortInput(project.port || 3000);
      setCommandInput(project.command || 'npm run dev');
      setLocalDomainInput(project.customDomain || `${project.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.test`);
    }
  }, [project]);

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

  useEffect(() => {
    if (!isRunning || !project?.id) {
      setRamUsage(0);
      setCpuUsage(0);
      setRamHistory([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      setCpuHistory([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      return;
    }

    const fetchRealMetrics = async () => {
      if (window.electronAPI?.getProcessMetrics) {
        const stats = await window.electronAPI.getProcessMetrics({ projectId: project.id });
        if (stats && stats.success) {
          const m = stats.memoryMb || 0;
          const c = stats.cpu || 0;
          setRamUsage(m);
          setCpuUsage(c);
          setRamHistory(prev => [...prev.slice(1), m]);
          setCpuHistory(prev => [...prev.slice(1), c]);
          return;
        } else {
          setRamUsage(0);
          setCpuUsage(0);
          return;
        }
      }
      setRamUsage(0);
      setCpuUsage(0);
    };

    fetchRealMetrics();
    const interval = setInterval(fetchRealMetrics, 2500);
    return () => clearInterval(interval);
  }, [isRunning, project?.id]);

  // Terminal logs auto-scroll
  useEffect(() => {
    if (autoScrollLogs && isLogsOpen) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [projectLogs, autoScrollLogs, isLogsOpen]);

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
  }, [project?.path, parseEnvPairs, detectMissingEnvKeys]);

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
    setEnvSaveStatus(language === 'es' ? '¡Claves de .env.example añadidas!' : 'Keys from .env.example added!');
    setTimeout(() => setEnvSaveStatus(''), 3000);
  };

  const generateEnvText = (pairs) => {
    return pairs.map(p => `${p.key}=${p.value}`).join('\n');
  };

  const handleSaveEnv = async () => {
    const textToSave = rawEnvMode ? envContent : generateEnvText(envPairs);
    if (window.electronAPI?.writeEnvFile && project?.path) {
      const res = await window.electronAPI.writeEnvFile(project.path, textToSave, selectedEnvFile);
      if (res.success) {
        setEnvSaveStatus(language === 'es' ? `¡${selectedEnvFile} guardado con éxito!` : `${selectedEnvFile} saved successfully!`);
        setTimeout(() => setEnvSaveStatus(''), 3000);
      }
    } else {
      setEnvSaveStatus(language === 'es' ? `¡${selectedEnvFile} guardado!` : `${selectedEnvFile} saved!`);
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

  const handleSmartToggleProject = async () => {
    if (isRunning) {
      onToggleProject(project);
      return;
    }

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
          text: language === 'es' ? 'Dominio seguro vinculado con éxito' : 'Secure domain linked successfully',
          url: res.httpsUrl || `https://${domain}:8443`,
          httpUrl: res.httpUrl || `http://${domain}:3838`,
          sslActive: res.sslActive
        });
      } else {
        setDomainSaveMsg({ type: 'error', text: res.error || (language === 'es' ? 'Error al configurar dominio' : 'Error configuring domain') });
      }
    }
  };

  const handleRunScript = async (scriptCmd) => {
    if (!scriptCmd) return;
    setIsExecutingScript(true);
    setScriptMsg(language === 'es' ? `Ejecutando "${scriptCmd}"...` : `Executing "${scriptCmd}"...`);

    if (window.electronAPI?.runProjectScript) {
      const res = await window.electronAPI.runProjectScript(project.id, project.path, scriptCmd);
      if (res.success) {
        setScriptMsg(language === 'es' ? `¡Comando "${scriptCmd}" ejecutado con éxito!` : `Command "${scriptCmd}" executed successfully!`);
      } else {
        setScriptMsg(`Error: ${res.error}`);
      }
    }
    setTimeout(() => {
      setIsExecutingScript(false);
      setTimeout(() => setScriptMsg(''), 4000);
    }, 1500);
  };

  const handleOpenApiWebhookHub = () => {
    if (window.electronAPI?.openApiHubWindow) {
      window.electronAPI.openApiHubWindow(project);
    }
  };

  const handleOpenGitWindow = () => {
    if (window.electronAPI?.openGitWindow && project) {
      window.electronAPI.openGitWindow({
        projectId: project.id,
        projectName: project.name,
        projectPath: project.path
      });
    } else {
      setShowGitModal(true);
    }
  };

  if (!project) return null;

  const projectUrl = `http://localhost:${project.port}`;

  const handleSaveConfig = async () => {
    const newPort = parseInt(portInput, 10) || 3000;
    const cleanCmd = (commandInput || '').trim() || 'npm run dev';

    // 1. Non-destructively sync .env port
    if (envPairs && envPairs.length > 0) {
      const updatedPairs = envPairs.map(p => {
        if (p.key.toUpperCase() === 'PORT' || p.key.toUpperCase() === 'VITE_PORT' || p.key.toUpperCase() === 'APP_PORT' || p.key.toUpperCase() === 'SERVER_PORT') {
          return { ...p, value: String(newPort) };
        }
        return p;
      });

      if (!updatedPairs.some(p => p.key.toUpperCase() === 'PORT')) {
        updatedPairs.unshift({ key: 'PORT', value: String(newPort) });
      }
      setEnvPairs(updatedPairs);

      if (window.electronAPI?.syncEnvPort && project?.path) {
        await window.electronAPI.syncEnvPort(project.path, newPort);
      } else if (window.electronAPI?.writeEnvFile && project?.path) {
        const textToSave = generateEnvText(updatedPairs);
        await window.electronAPI.writeEnvFile(project.path, textToSave, selectedEnvFile);
      }
    } else if (window.electronAPI?.syncEnvPort && project?.path) {
      await window.electronAPI.syncEnvPort(project.path, newPort);
    }

    // 2. Perform atomic update in unified state
    if (onUpdateProject) {
      onUpdateProject(project.id, { port: newPort, command: cleanCmd });
    } else {
      if (onUpdatePort) onUpdatePort(project.id, newPort);
      if (onUpdateCommand) onUpdateCommand(project.id, cleanCmd);
    }

    // 3. Restart server on new port if currently running
    if (isRunning) {
      setIsRestarting(true);
      setSavedMessage(language === 'es' ? 'Reiniciando servidor en nuevo puerto...' : 'Restarting server on new port...');
      await onToggleProject(project);

      setTimeout(async () => {
        const updatedProj = { ...project, port: newPort, command: cleanCmd, status: 'STOPPED' };
        await onToggleProject(updatedProj);
        setIsRestarting(false);
        setSavedMessage(language === 'es' ? `¡Servidor activo en puerto :${newPort}!` : `Server active on port :${newPort}!`);
        setTimeout(() => setSavedMessage(''), 3000);
      }, 700);
    } else {
      setSavedMessage(language === 'es' ? '¡Configuración guardada!' : 'Configuration saved!');
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
      <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-4 ${
        isDark ? 'border-white/[0.08]' : 'border-slate-200'
      }`}>
        <div className="flex items-start sm:items-center space-x-3.5 min-w-0 flex-1">
          <button
            onClick={onBack}
            className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer shrink-0 ${
              isDark ? 'bg-[#252525] border-white/[0.08] text-[#E5E5E5] hover:bg-[#303030] hover:border-white/[0.16]' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t.back || 'Back'}</span>
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {project.name}
              </h2>
              <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                isRunning 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                  : isDark ? 'bg-[#252525] text-slate-400 border-white/[0.08]' : 'bg-slate-200 text-slate-600 border-slate-300'
              }`}>
                :{project.port} ({isRunning ? (language === 'es' ? 'Activo' : 'Active') : (language === 'es' ? 'Detenido' : 'Stopped')})
              </span>
              {activeDiagnostic && (
                <SyntaxGuardBadge
                  diagnostic={activeDiagnostic}
                  onOpenEditor={onOpenEditor}
                  onDismiss={onDismissDiagnostic}
                  projectPath={project.path}
                  theme={theme}
                  language={language}
                />
              )}
            </div>

            {/* WSL / Project Path Subtitle & Clickable URL */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono mt-1">
              <span className="truncate max-w-xl text-[11px]" title={project.path}>
                {project.path}
              </span>
              <button
                type="button"
                onClick={handleCopyPath}
                className="p-1 hover:text-white transition-colors cursor-pointer text-slate-500"
                title={language === 'es' ? 'Copiar ruta' : 'Copy path'}
              >
                {pathCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              <span className="text-slate-600 font-mono hidden sm:inline">•</span>

              <a
                href={projectUrl}
                onClick={(e) => {
                  e.preventDefault();
                  onOpenBrowser(projectUrl);
                }}
                className="inline-flex items-center gap-1 text-[11px] font-mono text-blue-400 hover:text-blue-300 font-bold hover:underline transition-colors cursor-pointer"
                title={language === 'es' ? 'Abrir en navegador' : 'Open in browser'}
              >
                <span>{projectUrl}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Header Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Main Server Toggle Button - MAXIMUM HIERARCHY */}
          <button
            onClick={handleSmartToggleProject}
            disabled={isRestarting}
            className={`px-5 py-2.5 rounded-xl font-extrabold text-xs flex items-center space-x-2 text-white shadow-lg transition-all cursor-pointer disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] ${
              isRunning 
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30' 
                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30 hover:shadow-[0_0_20px_rgba(37,99,235,0.4)]'
            }`}
          >
            {isRestarting ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : isRunning ? (
              <Square className="h-4 w-4 fill-white" />
            ) : (
              <Play className="h-4 w-4 fill-white" />
            )}
            <span>{isRestarting ? (language === 'es' ? 'Reiniciando...' : 'Restarting...') : isRunning ? (t.detener || 'Stop Server') : (t.arrancar || 'Start Server')}</span>
          </button>

          {/* Quick Hub: API & Git */}
          <div className={`flex items-center gap-1.5 p-1 rounded-2xl border ${
            isDark ? 'bg-[#1E1E1E] border-white/[0.08]' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={handleOpenApiWebhookHub}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer relative ${
                isDark 
                  ? 'bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 border border-purple-500/30' 
                  : 'bg-purple-100 text-purple-800 hover:bg-purple-200 border border-purple-200'
              }`}
              title={language === 'es' ? 'Abrir Ventana Independiente de API Client & Webhooks' : 'Open Standalone API Client & Webhook Inspector'}
            >
              <Radio className="h-3.5 w-3.5 text-purple-400" />
              <span>API & Webhooks</span>
              {tunnelUrl && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              )}
            </button>

            {(isGitExpEnabled || hasGitRepo) && (
              <button
                onClick={handleOpenGitWindow}
                disabled={!hasGitRepo}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                  hasGitRepo
                    ? isDark 
                      ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30 cursor-pointer shadow-xs' 
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 cursor-pointer'
                    : isDark
                      ? 'bg-[#1e1e24] text-slate-500 border border-white/[0.04] opacity-50 cursor-not-allowed'
                      : 'bg-slate-100 text-slate-400 border border-slate-200 opacity-60 cursor-not-allowed'
                }`}
                title={
                  hasGitRepo
                    ? (language === 'es' ? `Abrir Ventana Independiente de Git (${gitBranchName || 'main'})` : `Open Standalone Git Inspector (${gitBranchName || 'main'})`)
                    : (language === 'es' ? 'No se detectó repositorio Git en este proyecto' : 'No Git repository detected in this project')
                }
              >
                <GitBranch className={`h-3.5 w-3.5 ${hasGitRepo ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>{hasGitRepo ? (gitBranchName ? `Git: ${gitBranchName}` : 'Git') : 'Git (No repo)'}</span>
              </button>
            )}
          </div>

          {/* Compact Button-Group for Secondary Tools */}
          <div className={`flex items-center gap-0.5 p-1 rounded-2xl border ${
            isDark ? 'bg-[#1E1E1E] border-white/[0.08]' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => onOpenBrowser(projectUrl)}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                isDark ? 'text-[#888888] hover:bg-[#303030] hover:text-white' : 'text-slate-700 hover:bg-white hover:shadow-xs'
              }`}
              title={language === 'es' ? 'Abrir en Navegador Web' : 'Open in Web Browser'}
            >
              <Globe className="h-4 w-4" />
            </button>

            <button
              onClick={() => onOpenEditor(project.path)}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                isDark ? 'text-[#888888] hover:bg-[#303030] hover:text-white' : 'text-slate-700 hover:bg-white hover:shadow-xs'
              }`}
              title={language === 'es' ? 'Abrir Carpeta en VS Code / Explorador' : 'Open Folder in VS Code / Explorer'}
            >
              <FolderOpen className="h-4 w-4" />
            </button>

            <button
              onClick={() => onOpenLogs(project)}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                isDark ? 'text-[#888888] hover:bg-[#303030] hover:text-white' : 'text-slate-700 hover:bg-white hover:shadow-xs'
              }`}
              title={language === 'es' ? 'Abrir Consola de Logs Independiente' : 'Open Standalone Log Console'}
            >
              <Terminal className="h-4 w-4" />
            </button>

            <div className={`w-[1px] h-4 mx-0.5 ${isDark ? 'bg-white/10' : 'bg-slate-300'}`} />

            <button
              onClick={() => setShowScriptModal(true)}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                isDark ? 'text-amber-400 hover:bg-[#303030]' : 'text-amber-600 hover:bg-white hover:shadow-xs'
              }`}
              title={language === 'es' ? 'Lanzador de Scripts & Comandos CLI' : 'Script & CLI Command Launcher'}
            >
              <Zap className="h-4 w-4" />
            </button>

            <button
              onClick={() => setShowDockerModal(true)}
              className={`p-2 rounded-xl transition-all cursor-pointer relative ${
                hasDockerCompose 
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/25' 
                  : isDark ? 'text-[#888888] hover:bg-[#303030] hover:text-white' : 'text-slate-700 hover:bg-white hover:shadow-xs'
              }`}
              title={language === 'es' ? 'Gestor Visual de Docker Compose & Contenedores' : 'Docker Compose & Container Manager'}
            >
              <Boxes className="h-4 w-4" />
              {hasDockerCompose && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan-400"></span>
              )}
            </button>

            <button
              onClick={() => setShowNetworkModal(true)}
              className={`p-2 rounded-xl transition-all relative cursor-pointer ${
                tunnelUrl 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : isDark ? 'text-[#888888] hover:bg-[#303030] hover:text-white' : 'text-slate-700 hover:bg-white hover:shadow-xs'
              }`}
              title={language === 'es' ? 'Red & Acceso Externo (Túneles Cloudflare & Localtunnel)' : 'Network & External Access (Cloudflare & Localtunnel)'}
            >
              <Share2 className="h-4 w-4" />
              {tunnelUrl && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              )}
            </button>

            <button
              onClick={() => setShowConfigModal(true)}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                isDark ? 'text-blue-400 hover:bg-[#303030]' : 'text-blue-600 hover:bg-white hover:shadow-xs'
              }`}
              title={language === 'es' ? 'Configuración de Ejecución (Puerto y Comando de Inicio)' : 'Execution Configuration (Port & Start Command)'}
            >
              <Settings2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: Horizontal Info & Telemetry Sparklines */}
      <div className={`p-4 rounded-2xl border transition-all ${
        isDark ? 'bg-[#141518] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          
          {/* Left 7 Columns: Compact Horizontal Project Information Strip */}
          <div className="lg:col-span-7 flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex items-center space-x-2.5 min-w-[130px]">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                <Server className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block tracking-wider">
                  {language === 'es' ? 'BACKEND / STACK' : 'BACKEND / STACK'}
                </span>
                <span className={`font-mono text-xs font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  {project.backend?.techStack || project.techStack || 'Node.js'}
                </span>
              </div>
            </div>

            <div className={`w-[1px] h-8 hidden sm:block ${isDark ? 'bg-white/[0.08]' : 'bg-slate-200'}`} />

            <div className="min-w-[90px]">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block tracking-wider">
                {language === 'es' ? 'PUERTO' : 'PORT'}
              </span>
              <span className="font-mono text-xs font-bold text-blue-400">
                :{project.port || 3000}
              </span>
            </div>

            <div className={`w-[1px] h-8 hidden sm:block ${isDark ? 'bg-white/[0.08]' : 'bg-slate-200'}`} />

            <div className="min-w-[120px]">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block tracking-wider">
                {language === 'es' ? 'COMANDO' : 'COMMAND'}
              </span>
              <span className={`font-mono text-xs px-2 py-0.5 rounded border ${
                isDark ? 'bg-black/30 border-white/[0.06] text-slate-300' : 'bg-white border-slate-200 text-slate-700'
              }`}>
                {project.command || 'npm run dev'}
              </span>
            </div>

            {project.hasBackend && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border bg-purple-500/10 text-purple-300 border-purple-500/30">
                {language === 'es' ? 'Dual Backend' : 'Dual Backend'}
              </span>
            )}
          </div>

          {/* Right 5 Columns: Horizontal Metrics Widget with Active Sparklines */}
          <div className={`lg:col-span-5 lg:border-l pl-0 lg:pl-6 grid grid-cols-3 gap-3 items-center ${
            isDark ? 'border-white/[0.08]' : 'border-slate-200'
          }`}>
            {/* Status */}
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400 flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                <span>{language === 'es' ? 'ESTADO' : 'STATUS'}</span>
              </span>
              <span className={`text-sm font-black font-mono block tracking-tight ${isRunning ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.35)]' : 'text-slate-500'}`}>
                {isRunning ? 'RUNNING' : 'STOPPED'}
              </span>
            </div>

            {/* RAM + Sparkline */}
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block tracking-wider">
                RAM ({isRunning ? `${ramUsage}MB` : '0MB'})
              </span>
              <div className="flex items-center gap-2">
                <svg width="68" height="22" className="overflow-hidden rounded">
                  <defs>
                    <linearGradient id="ramGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {isRunning && (
                    <path
                      d={generateSparklineArea(ramHistory, 68, 22)}
                      fill="url(#ramGrad)"
                    />
                  )}
                  <path
                    d={generateSparkline(ramHistory, 68, 22)}
                    fill="none"
                    stroke={isRunning ? '#10b981' : '#475569'}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            {/* CPU + Sparkline */}
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block tracking-wider">
                CPU ({isRunning ? `${cpuUsage}%` : '0%'})
              </span>
              <div className="flex items-center gap-2">
                <svg width="68" height="22" className="overflow-hidden rounded">
                  <defs>
                    <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {isRunning && (
                    <path
                      d={generateSparklineArea(cpuHistory, 68, 22)}
                      fill="url(#cpuGrad)"
                    />
                  )}
                  <path
                    d={generateSparkline(cpuHistory, 68, 22)}
                    fill="none"
                    stroke={isRunning ? '#3b82f6' : '#475569'}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
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
            <a
              href={projectUrl}
              onClick={(e) => {
                e.preventDefault();
                onOpenBrowser(projectUrl);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-blue-400 hover:text-blue-300 font-bold hover:underline transition-colors group cursor-pointer"
              title={language === 'es' ? 'Abrir en navegador' : 'Open in browser'}
            >
              <span>{projectUrl}</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          </div>

          <div className={`relative w-full h-80 rounded-2xl border overflow-hidden flex flex-col items-center justify-center text-center group shadow-sm ${
            isDark ? 'bg-[#141414] border-white/[0.08]' : 'bg-slate-900 border-slate-800'
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
                    <span>{language === 'es' ? `Abrir (${projectUrl})` : `Open (${projectUrl})`}</span>
                  </button>
                  <span className="text-[11px] text-slate-300 font-mono">
                    {language === 'es' ? `Servidor en línea escuchando en puerto ${project.port}` : `Server online listening on port ${project.port}`}
                  </span>
                </div>
              </>
            ) : (
              <div className="p-6 space-y-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto ${
                  isDark ? 'bg-[#1E1E1E] border border-white/[0.08] text-slate-400' : 'bg-slate-800 text-slate-400'
                }`}>
                  <Globe className="h-6 w-6" />
                </div>
                <h4 className="text-slate-300 font-bold text-sm">{language === 'es' ? 'Servidor Detenido' : 'Server Stopped'}</h4>
                <p className="text-slate-400 text-xs max-w-xs mx-auto">
                  {language === 'es' ? 'Haz clic en "Arrancar Servidor" para activar el entorno y cargar la vista previa.' : 'Click "Start Server" to launch the environment and load live preview.'}
                </p>
                <button
                  type="button"
                  onClick={handleSmartToggleProject}
                  disabled={isRestarting}
                  className="mt-3 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-extrabold text-xs shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 hover:scale-105 active:scale-95 transition-all flex items-center space-x-2 mx-auto cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5 fill-white" />
                  <span>{language === 'es' ? 'Iniciar Servidor' : 'Start Server'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right 6: Structured .env Manager */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center space-x-2">
              <FileCode2 className="h-4 w-4 text-blue-400" />
              <h3 className={`font-bold text-xs tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {language === 'es' ? `Variables de Entorno (${selectedEnvFile})` : `Environment Variables (${selectedEnvFile})`}
              </h3>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setMaskSecrets(!maskSecrets)}
                className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                  isDark ? 'bg-[#252525] border-white/[0.08] text-slate-400 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-600'
                }`}
                title={maskSecrets ? (language === 'es' ? 'Revelar valores secretos' : 'Reveal secret values') : (language === 'es' ? 'Ocultar valores secretos' : 'Hide secret values')}
              >
                {maskSecrets ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>

              <button
                onClick={() => setRawEnvMode(!rawEnvMode)}
                className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                  isDark ? 'bg-[#252525] border-white/[0.08] text-[#E5E5E5] hover:bg-[#303030]' : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                {rawEnvMode ? (language === 'es' ? 'Formulario' : 'Form Mode') : (language === 'es' ? 'Texto Plano' : 'Raw Text')}
              </button>
            </div>
          </div>

          {/* Missing Keys from .env.example Alert */}
          {hasEnvExample && missingKeys.length > 0 && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {language === 'es' ? `Faltan ${missingKeys.length} variables en .env.example` : `Missing ${missingKeys.length} variables from .env.example`}
                </span>
              </div>
              <button
                type="button"
                onClick={handleImportMissingKeys}
                className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-black font-bold text-[10px] rounded-lg transition-all cursor-pointer shrink-0"
              >
                {language === 'es' ? 'Importar' : 'Import'}
              </button>
            </div>
          )}

          {/* Structured Container Matching Live Preview Height */}
          <div className={`h-80 rounded-2xl border flex flex-col overflow-hidden shadow-sm ${
            isDark ? 'bg-[#141414] border-white/[0.08]' : 'bg-white border-slate-200'
          }`}>
            {!rawEnvMode ? (
              <>
                {/* Table Header Bar */}
                <div className={`px-3 py-2 border-b flex items-center text-[10px] font-mono font-bold uppercase tracking-wider ${
                  isDark ? 'bg-black/30 border-white/[0.06] text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                  <span className="w-2/5">{language === 'es' ? 'CLAVE (KEY)' : 'KEY'}</span>
                  <span className="w-4 text-center">=</span>
                  <span className="flex-1 pl-2">{language === 'es' ? 'VALOR (VALUE)' : 'VALUE'}</span>
                  <span className="w-8 text-right">{language === 'es' ? 'ACCIÓN' : 'ACTION'}</span>
                </div>

                {/* Table Rows Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                  {envPairs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500">
                      <FileCode2 className="w-8 h-8 mb-2 opacity-40 text-blue-400" />
                      <p className="text-xs font-medium">
                        {language === 'es' ? 'No hay variables configuradas en .env' : 'No variables defined in .env'}
                      </p>
                      <button
                        type="button"
                        onClick={handleAddEnvPair}
                        className="mt-2 text-xs font-mono font-bold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                      >
                        + {language === 'es' ? 'Agregar primera variable' : 'Add first variable'}
                      </button>
                    </div>
                  ) : (
                    envPairs.map((pair, idx) => {
                      const isSecret = isSecretKey(pair.key);
                      return (
                        <div key={idx} className="flex items-center space-x-2">
                          <input
                            type="text"
                            placeholder="KEY"
                            value={pair.key}
                            onChange={(e) => handleEnvPairChange(idx, 'key', e.target.value)}
                            className={`w-2/5 border rounded-xl p-2 text-xs font-mono font-bold transition-all ${
                              isDark ? 'bg-[#1E1E1E] border-white/[0.08] text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200'
                            }`}
                          />
                          <span className="text-slate-400 font-mono font-bold">=</span>
                          <input
                            type={maskSecrets && isSecret ? 'password' : 'text'}
                            placeholder="VALUE"
                            value={pair.value}
                            onChange={(e) => handleEnvPairChange(idx, 'value', e.target.value)}
                            className={`flex-1 border rounded-xl p-2 text-xs font-mono transition-all ${
                              isDark ? 'bg-[#1E1E1E] border-white/[0.08] text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveEnvPair(idx)}
                            className="p-2 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer shrink-0"
                            title={language === 'es' ? 'Eliminar variable' : 'Delete variable'}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Table Footer Toolbar */}
                <div className={`p-3 border-t flex items-center justify-between ${
                  isDark ? 'bg-black/20 border-white/[0.06]' : 'bg-slate-50 border-slate-200'
                }`}>
                  <button
                    type="button"
                    onClick={handleAddEnvPair}
                    className="text-xs font-mono font-bold text-blue-400 hover:text-blue-300 flex items-center space-x-1 transition-colors cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>{language === 'es' ? 'Agregar Variable' : 'Add Variable'}</span>
                  </button>

                  <div className="flex items-center space-x-2">
                    {envSaveStatus && (
                      <span className="text-xs text-emerald-400 font-mono font-bold flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" /> {envSaveStatus}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleSaveEnv}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl flex items-center space-x-1.5 shadow-md shadow-blue-600/20 hover:shadow-[0_0_15px_rgba(37,99,235,0.35)] transition-all cursor-pointer"
                    >
                      <Save className="h-3.5 w-3.5" />
                      <span>{language === 'es' ? 'Guardar' : 'Save'}</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col p-3 space-y-2">
                <textarea
                  value={envContent}
                  onChange={(e) => setEnvContent(e.target.value)}
                  placeholder="PORT=3000&#10;NODE_ENV=development"
                  className={`flex-1 w-full border rounded-xl p-3 text-xs font-mono font-semibold focus:outline-none transition-all resize-none ${
                    isDark ? 'bg-[#1E1E1E] border-white/[0.08] text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
                <div className="flex items-center justify-between pt-1">
                  {envSaveStatus && (
                    <span className="text-xs text-emerald-400 font-mono font-bold flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" /> {envSaveStatus}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveEnv}
                    className="ml-auto bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-1.5 rounded-xl flex items-center space-x-1.5 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{language === 'es' ? `Guardar ${selectedEnvFile}` : `Save ${selectedEnvFile}`}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 3: Collapsible Real-Time Terminal Logs / Output */}
      <div className={`rounded-2xl border overflow-hidden transition-all shadow-sm ${
        isDark ? 'bg-[#0f1115] border-white/[0.08]' : 'bg-slate-900 border-slate-800'
      }`}>
        {/* Terminal Header Bar */}
        <div 
          onClick={() => setIsLogsOpen(!isLogsOpen)}
          className={`px-4 py-2.5 flex items-center justify-between cursor-pointer select-none border-b transition-colors ${
            isDark ? 'bg-[#15171e] hover:bg-[#1a1d26] border-white/[0.06]' : 'bg-slate-950 hover:bg-slate-900 border-slate-800'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            <Terminal className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold font-mono text-slate-200">
              {language === 'es' ? 'Terminal Logs / Salida en Tiempo Real' : 'Terminal Logs / Real-Time Output'}
            </span>
            <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-slate-400">
              {project.command || 'npm run dev'}
            </span>
            <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
              {projectLogs.length} {language === 'es' ? 'líneas' : 'lines'}
            </span>
          </div>

          <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
            {/* Auto-scroll toggle */}
            <button
              type="button"
              onClick={() => setAutoScrollLogs(!autoScrollLogs)}
              className={`px-2 py-1 rounded-lg text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer ${
                autoScrollLogs 
                  ? 'bg-white/[0.08] text-slate-300 hover:text-white' 
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
              title={autoScrollLogs ? 'Auto-scroll activo' : 'Auto-scroll pausado'}
            >
              {autoScrollLogs ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <span>{autoScrollLogs ? 'Auto' : 'Pausado'}</span>
            </button>

            {/* Clear logs */}
            <button
              type="button"
              onClick={handleClearCurrentLogs}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/[0.04] transition-colors cursor-pointer"
              title={language === 'es' ? 'Limpiar consola' : 'Clear console'}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* Toggle Collapse */}
            <button
              type="button"
              onClick={() => setIsLogsOpen(!isLogsOpen)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
            >
              {isLogsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Terminal Content Body */}
        <AnimatePresence>
          {isLogsOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="p-3 font-mono text-xs leading-relaxed max-h-64 overflow-y-auto custom-scrollbar select-text bg-[#090a0d] text-slate-300"
              ref={logsContainerRef}
            >
              {projectLogs.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs font-mono">
                  {isRunning 
                    ? (language === 'es' ? 'Esperando registros de salida del servidor...' : 'Waiting for server output logs...')
                    : (language === 'es' ? 'Servidor detenido. Inicia el proceso para ver los logs en tiempo real.' : 'Server stopped. Start the process to stream real-time logs.')}
                </div>
              ) : (
                projectLogs.map((line, idx) => (
                  <div key={idx} className="hover:bg-white/[0.03] px-1 py-0.5 rounded break-all whitespace-pre-wrap">
                    <span className="text-slate-600 select-none mr-2.5 text-[10px] inline-block w-8 text-right font-mono">
                      {idx + 1}
                    </span>
                    {line}
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </motion.div>
          )}
        </AnimatePresence>
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
                isDark ? 'bg-[#141414] border-white/[0.08] text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center space-x-3 text-amber-400">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm">
                    {language === 'es' ? `Puerto en Conflicto (:${portConflict.port})` : `Port Conflict (:${portConflict.port})`}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {language === 'es' ? 'El puerto ya está siendo utilizado por otro proceso.' : 'Port is already occupied by another process.'}
                  </p>
                </div>
              </div>

              <div className={`p-3.5 rounded-xl border text-xs font-mono space-y-1 ${
                isDark ? 'bg-[#1E1E1E] border-white/[0.08]' : 'bg-slate-100 border-slate-200'
              }`}>
                <div>{language === 'es' ? 'Proceso:' : 'Process:'} <span className="text-indigo-400 font-bold">{portConflict.processName}</span></div>
                <div>PID: <span className="text-amber-400 font-bold">{portConflict.pid}</span></div>
                <div>{language === 'es' ? 'Puerto:' : 'Port:'} <span className="text-slate-300 font-bold">:{portConflict.port}</span></div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleKillConflictAndStart}
                  disabled={isResolvingPort}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Square className="h-3.5 w-3.5 fill-white" />
                  <span>{language === 'es' ? `Liberar Puerto (Finalizar PID ${portConflict.pid}) y Arrancar` : `Kill PID ${portConflict.pid} & Start`}</span>
                </button>

                <button
                  type="button"
                  onClick={handleUseFreePortAndStart}
                  disabled={isResolvingPort}
                  className={`w-full py-2.5 px-4 rounded-xl border font-bold text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                    isDark ? 'bg-[#252525] border-white/[0.08] text-[#E5E5E5] hover:bg-[#303030]' : 'bg-slate-100 border-slate-200 text-slate-800'
                  }`}
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>{language === 'es' ? 'Asignar Siguiente Puerto Libre y Arrancar' : 'Assign Next Free Port & Start'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPortConflict(null)}
                  className="w-full py-1.5 text-xs text-slate-500 hover:text-slate-300 text-center cursor-pointer"
                >
                  {t.cancel || 'Cancel'}
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
        language={language}
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
        language={language}
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
        language={language}
      />

      {/* Docker Compose & Containers Dashboard Modal */}
      <DockerComposeModal
        isOpen={showDockerModal}
        onClose={() => setShowDockerModal(false)}
        project={project}
        theme={theme}
        language={language}
      />

      {/* Git Inspector Modal */}
      <GitInspectorModal
        isOpen={showGitModal}
        onClose={() => setShowGitModal(false)}
        project={project}
        theme={theme}
        language={language}
      />

    </motion.div>
  );
}
