import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Boxes, 
  Play, 
  Square, 
  RotateCw, 
  Terminal, 
  Check, 
  AlertCircle, 
  Download, 
  Database, 
  Plus, 
  Layers, 
  Radio, 
  Server, 
  Cpu, 
  HardDrive,
  RefreshCw,
  FileCode,
  ExternalLink,
  ShieldCheck,
  Zap
} from 'lucide-react';

const SERVICE_TEMPLATES = [
  {
    id: 'postgres',
    name: 'PostgreSQL 16',
    category: 'Base de Datos Relacional',
    desc: 'Motor relacional avanzado con soporte para JSONB y extensiones.',
    icon: 'postgres',
    defaultPort: 5432,
    badge: 'SQL'
  },
  {
    id: 'mysql',
    name: 'MySQL 8.0',
    category: 'Base de Datos Relacional',
    desc: 'Servidor MySQL clásico con volumen persistente y usuario configurable.',
    icon: 'mysql',
    defaultPort: 3306,
    badge: 'SQL'
  },
  {
    id: 'redis',
    name: 'Redis 7 (In-Memory)',
    category: 'Caché & Key-Value',
    desc: 'Caché ultra-rápida en memoria con persistencia en disco AOF.',
    icon: 'redis',
    defaultPort: 6379,
    badge: 'NoSQL'
  },
  {
    id: 'mongodb',
    name: 'MongoDB 7.0',
    category: 'Document Store',
    desc: 'Base de datos NoSQL basada en documentos JSON/BSON.',
    icon: 'mongodb',
    defaultPort: 27017,
    badge: 'NoSQL'
  },
  {
    id: 'mailpit',
    name: 'Mailpit (Email Sandbox)',
    category: 'Herramienta de Correo',
    desc: 'Servidor SMTP local para capturar y previsualizar emails en desarrollo.',
    icon: 'mail',
    defaultPort: 8025,
    badge: 'SMTP'
  },
  {
    id: 'rabbitmq',
    name: 'RabbitMQ 3 (Management)',
    category: 'Message Broker',
    desc: 'Sistema de colas y mensajería asíncrona con panel web de administración.',
    icon: 'rabbit',
    defaultPort: 15672,
    badge: 'Queues'
  },
  {
    id: 'minio',
    name: 'MinIO (S3 Local Storage)',
    category: 'Object Storage',
    desc: 'Almacenamiento de archivos y buckets 100% compatible con AWS S3.',
    icon: 'minio',
    defaultPort: 9001,
    badge: 'Storage'
  }
];

export default function DockerComposeModal({
  isOpen,
  onClose,
  project,
  theme = 'dark'
}) {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'generator' | 'logs'
  const [dockerAvailable, setDockerAvailable] = useState({ installed: true, dockerVersion: null, composeVersion: null });
  const [composeStatus, setComposeStatus] = useState({ hasCompose: false, services: [], composeFile: null });
  const [isLoading, setIsLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [logs, setLogs] = useState([]);
  const [selectedServiceLog, setSelectedServiceLog] = useState('');

  // Generator State
  const [selectedServices, setSelectedServices] = useState(['postgres', 'redis']);
  const [customConfig, setCustomConfig] = useState({
    postgresPort: 5432,
    postgresUser: 'postgres',
    postgresPassword: 'postgrespassword',
    postgresDb: 'app_db',
    mysqlPort: 3306,
    mysqlUser: 'user',
    mysqlPassword: 'userpassword',
    mysqlRootPassword: 'rootpassword',
    mysqlDb: 'app_db',
    redisPort: 6379,
    mongoPort: 27017,
    mongoUser: 'root',
    mongoPassword: 'rootpassword',
    mailpitHttpPort: 8025,
    mailpitSmtpPort: 1025,
    rabbitPort: 5672,
    rabbitMgmtPort: 15672,
    minioPort: 9000,
    minioConsolePort: 9001
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const isDark = theme === 'dark';

  // Check Docker on mount
  useEffect(() => {
    if (!isOpen) return;

    const checkSystemDocker = async () => {
      if (window.electronAPI?.docker?.checkAvailable) {
        const res = await window.electronAPI.docker.checkAvailable();
        setDockerAvailable(res);
      }
    };

    checkSystemDocker();
    refreshComposeStatus();
  }, [isOpen, project?.path]);

  const refreshComposeStatus = async () => {
    if (!project?.path) return;
    setIsLoading(true);

    if (window.electronAPI?.docker?.getStatus) {
      const res = await window.electronAPI.docker.getStatus(project.path);
      if (res && res.success) {
        setComposeStatus({
          hasCompose: true,
          composeFile: res.composeFile,
          services: res.services || []
        });
      } else {
        setComposeStatus({
          hasCompose: false,
          composeFile: null,
          services: [],
          error: res?.error
        });
      }
    } else {
      // Fallback demo simulation
      setComposeStatus({
        hasCompose: true,
        composeFile: 'docker-compose.yml',
        services: [
          { name: 'app_postgres', service: 'postgres', state: 'running', status: 'Up 2 hours', ports: '5432:5432', image: 'postgres:16-alpine' },
          { name: 'app_redis', service: 'redis', state: 'running', status: 'Up 2 hours', ports: '6379:6379', image: 'redis:7-alpine' }
        ]
      });
    }

    setIsLoading(false);
  };

  const handleRunAction = async (action, serviceName = '') => {
    if (!project?.path) return;
    setActionMessage(`Ejecutando "${action}" en Docker Compose...`);

    if (window.electronAPI?.docker?.runAction) {
      const res = await window.electronAPI.docker.runAction(project.path, action, serviceName);
      if (res.success) {
        setActionMessage(`¡Acción "${action}" completada con éxito!`);
        refreshComposeStatus();
      } else {
        setActionMessage(`Error: ${res.error}`);
      }
    } else {
      setTimeout(() => {
        setActionMessage(`¡Acción "${action}" simulada con éxito!`);
        refreshComposeStatus();
      }, 1000);
    }

    setTimeout(() => setActionMessage(''), 4000);
  };

  const handleFetchLogs = async (serviceName = '') => {
    setSelectedServiceLog(serviceName);
    setActiveTab('logs');

    if (window.electronAPI?.docker?.getLogs && project?.path) {
      const res = await window.electronAPI.docker.getLogs(project.path, serviceName, 100);
      if (res && res.logs) {
        setLogs(res.logs);
      }
    } else {
      setLogs([
        `[Docker Compose Logs - ${serviceName || 'Todos los servicios'}]`,
        `[postgres] Database system is ready to accept connections`,
        `[redis] Ready to accept connections tcp`,
        `[redis] Running mode=standalone, port=6379.`
      ]);
    }
  };

  const toggleServiceSelection = (svcId) => {
    setSelectedServices(prev => 
      prev.includes(svcId) ? prev.filter(s => s !== svcId) : [...prev, svcId]
    );
  };

  const handleGenerateCompose = async () => {
    if (!project?.path || selectedServices.length === 0) return;
    setIsGenerating(true);

    if (window.electronAPI?.docker?.generateCompose) {
      const res = await window.electronAPI.docker.generateCompose(project.path, selectedServices, customConfig);
      if (res.success) {
        setActionMessage('¡docker-compose.yml generado exitosamente!');
        // Automatically start compose
        if (window.electronAPI?.docker?.runAction) {
          await window.electronAPI.docker.runAction(project.path, 'up');
        }
        refreshComposeStatus();
        setActiveTab('dashboard');
      } else {
        setActionMessage(`Error: ${res.error}`);
      }
    } else {
      setTimeout(() => {
        setActionMessage('¡docker-compose.yml generado con éxito!');
        refreshComposeStatus();
        setActiveTab('dashboard');
      }, 1200);
    }

    setIsGenerating(false);
    setTimeout(() => setActionMessage(''), 4000);
  };

  if (!isOpen || !project) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className={`w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden ${
            isDark ? 'bg-[#0D0E15] border-white/[0.08] text-[#F3F4F6]' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Header */}
          <div className={`px-6 py-4 border-b flex items-center justify-between ${
            isDark ? 'border-white/[0.08] bg-[#090A0F]' : 'border-slate-100 bg-slate-50'
          }`}>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shadow-md shadow-blue-500/10">
                <Boxes className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base font-extrabold tracking-tight">
                    Gestor de Docker Compose & Contenedores
                  </h2>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                    dockerAvailable.installed 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.3)]' 
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${dockerAvailable.installed ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                    {dockerAvailable.installed ? 'Docker Activo' : 'Docker no detectado'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Controla servicios, puertos y genera arquitecturas de contenedores para {project.name}.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isDark ? 'hover:bg-[#1E2235] text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500'
              }`}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className={`px-6 pt-3 pb-2 border-b flex items-center justify-between gap-4 ${
            isDark ? 'border-white/[0.08] bg-[#090A0F]' : 'border-slate-200 bg-slate-100/50'
          }`}>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                    : isDark ? 'text-slate-400 hover:text-white hover:bg-[#181B28]' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Boxes className="h-3.5 w-3.5" />
                <span>Servicios Activos ({composeStatus.services.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('generator')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === 'generator'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                    : isDark ? 'text-slate-400 hover:text-white hover:bg-[#181B28]' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Generador de Contenedores</span>
              </button>

              <button
                onClick={() => handleFetchLogs('')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === 'logs'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                    : isDark ? 'text-slate-400 hover:text-white hover:bg-[#181B28]' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Terminal className="h-3.5 w-3.5" />
                <span>Logs de Contenedores</span>
              </button>
            </div>

            <button
              onClick={refreshComposeStatus}
              disabled={isLoading}
              className="p-1.5 text-slate-400 hover:text-blue-400 transition-colors cursor-pointer"
              title="Refrescar estado de Docker"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Action Notification */}
          {actionMessage && (
            <div className="mx-6 mt-4 p-3 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 text-xs font-mono font-bold flex items-center space-x-2">
              <Check className="h-4 w-4" />
              <span>{actionMessage}</span>
            </div>
          )}

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

            {/* TAB 1: DASHBOARD */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Global Controls Row */}
                <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${
                  isDark ? 'bg-[#12141F] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                      Archivo: <span className="font-mono text-blue-400">{composeStatus.composeFile || 'docker-compose.yml'}</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {composeStatus.services.length > 0 
                        ? `${composeStatus.services.length} contenedores orquestados para este proyecto.`
                        : 'No se detectan servicios en ejecución.'}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleRunAction('up')}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 hover:shadow-[0_0_15px_rgba(37,99,235,0.35)] transition-all flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Play className="h-3.5 w-3.5 fill-white" />
                      <span>Arrancar Todo (Up)</span>
                    </button>

                    <button
                      onClick={() => handleRunAction('down')}
                      className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/20 transition-all flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Square className="h-3.5 w-3.5 fill-white" />
                      <span>Detener Todo (Down)</span>
                    </button>

                    <button
                      onClick={() => handleRunAction('restart')}
                      className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                        isDark ? 'bg-[#181B28] border-white/[0.08] text-slate-300 hover:text-white hover:bg-[#1E2235]' : 'bg-white border-slate-200'
                      }`}
                      title="Reiniciar todos los contenedores"
                    >
                      <RotateCw className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Services List */}
                <div className="space-y-3">
                  <span className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider">
                    Servicios Declarados
                  </span>

                  {composeStatus.services.length === 0 ? (
                    <div className={`p-10 text-center rounded-2xl border space-y-3 ${
                      isDark ? 'bg-[#12141F] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <Boxes className="h-10 w-10 text-slate-500 mx-auto" />
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-slate-200">No hay contenedores corriendo</h4>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                          Haz clic en "Arrancar Todo" para iniciar los contenedores existentes o usa el "Generador" para crear tu arquitectura de base de datos.
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveTab('generator')}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Configurar Nuevos Servicios</span>
                      </button>
                    </div>
                  ) : (
                    composeStatus.services.map((svc, idx) => {
                      const isRunning = svc.state === 'running';

                      return (
                        <div
                          key={idx}
                          className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                            isRunning 
                              ? isDark ? 'bg-[#12141F] border-blue-500/40 ring-1 ring-blue-500/20' : 'bg-blue-50/50 border-blue-200'
                              : isDark ? 'bg-[#12141F] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          {/* Service Details */}
                          <div className="flex items-center space-x-3.5 min-w-0">
                            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold shrink-0 ${
                              isRunning 
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                                : isDark ? 'bg-[#181B28] border-white/[0.08] text-slate-400' : 'bg-slate-800 border-slate-700 text-slate-400'
                            }`}>
                              <Server className="h-5 w-5" />
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center space-x-2">
                                <h4 className="font-extrabold text-sm text-white truncate">{svc.service}</h4>
                                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                                  isRunning 
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.3)]' 
                                    : isDark ? 'bg-[#181B28] text-slate-400 border-white/[0.08]' : 'bg-slate-800 text-slate-400 border-slate-700'
                                }`}>
                                  {svc.status || svc.state}
                                </span>
                              </div>
                              <div className="flex items-center space-x-3 text-[11px] font-mono text-slate-400 mt-0.5">
                                <span className="truncate">Img: {svc.image || 'personalizada'}</span>
                                {svc.ports && (
                                  <>
                                    <span>•</span>
                                    <span className="text-blue-400 font-bold">Puertos: {svc.ports}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center space-x-2 shrink-0">
                            <button
                              onClick={() => handleRunAction(isRunning ? 'stop' : 'up', svc.service)}
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1 transition-all cursor-pointer ${
                                isRunning
                                  ? 'bg-rose-600/10 border border-rose-500/30 text-rose-400 hover:bg-rose-600/20'
                                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
                              }`}
                            >
                              {isRunning ? <Square className="h-3 w-3 fill-current" /> : <Play className="h-3 w-3 fill-current" />}
                              <span>{isRunning ? 'Detener' : 'Iniciar'}</span>
                            </button>

                            <button
                              onClick={() => handleRunAction('restart', svc.service)}
                              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                                isDark ? 'bg-[#181B28] border-white/[0.08] text-slate-300 hover:text-white hover:bg-[#1E2235]' : 'bg-white border-slate-200 text-slate-700'
                              }`}
                              title="Reiniciar contenedor"
                            >
                              <RotateCw className="h-3.5 w-3.5" />
                            </button>

                            <button
                              onClick={() => handleFetchLogs(svc.service)}
                              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-colors flex items-center space-x-1 cursor-pointer ${
                                isDark ? 'bg-[#181B28] border-white/[0.08] text-slate-300 hover:text-white hover:bg-[#1E2235]' : 'bg-white border-slate-200 text-slate-700'
                              }`}
                              title="Ver logs de este contenedor"
                            >
                              <Terminal className="h-3.5 w-3.5 text-blue-400" />
                              <span>Logs</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: GENERATOR */}
            {activeTab === 'generator' && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h3 className="text-sm font-extrabold text-white flex items-center space-x-2">
                    <Zap className="h-4 w-4 text-blue-400" />
                    <span>Selecciona los servicios que deseas incluir en tu docker-compose.yml</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Se generará una configuración lista para desarrollo con volúmenes persistentes y credenciales preconfiguradas.
                  </p>
                </div>

                {/* Service Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {SERVICE_TEMPLATES.map((tmpl) => {
                    const isSelected = selectedServices.includes(tmpl.id);

                    return (
                      <div
                        key={tmpl.id}
                        onClick={() => toggleServiceSelection(tmpl.id)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? isDark 
                              ? 'bg-blue-600/10 border-blue-500 shadow-md shadow-blue-500/10 ring-1 ring-blue-500' 
                              : 'bg-blue-50 border-blue-500 shadow-md'
                            : isDark ? 'bg-[#12141F] border-white/[0.08] hover:border-blue-500/40 hover:bg-[#181B28]' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              {tmpl.badge}
                            </span>
                            <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                              isSelected ? 'bg-blue-600 border-blue-500 text-white' : isDark ? 'border-white/[0.15]' : 'border-slate-600'
                            }`}>
                              {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                            </div>
                          </div>

                          <h4 className="text-sm font-bold text-slate-100">{tmpl.name}</h4>
                          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{tmpl.desc}</p>
                        </div>

                        <div className={`mt-3 pt-2 border-t text-[10px] font-mono flex items-center justify-between ${
                          isDark ? 'border-white/[0.06] text-slate-400' : 'border-slate-200 text-slate-500'
                        }`}>
                          <span>Puerto: :{tmpl.defaultPort}</span>
                          <span>{tmpl.category}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Configuration Options Drawer */}
                {selectedServices.length > 0 && (
                  <div className={`p-5 rounded-2xl border space-y-4 ${
                    isDark ? 'bg-[#12141F] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                      <Terminal className="h-3.5 w-3.5 text-blue-400" />
                      <span>Configuración Rápida de Credenciales & Puertos</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      {selectedServices.includes('postgres') && (
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-300">Puerto PostgreSQL</label>
                          <input
                            type="number"
                            value={customConfig.postgresPort}
                            onChange={(e) => setCustomConfig({ ...customConfig, postgresPort: Number(e.target.value) })}
                            className={`w-full p-2 rounded-xl border font-mono transition-all ${
                              isDark ? 'bg-[#090A0F] border-white/[0.08] text-white focus:border-blue-500' : 'bg-white border-slate-300 text-slate-900'
                            }`}
                          />
                        </div>
                      )}

                      {selectedServices.includes('mysql') && (
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-300">Puerto MySQL</label>
                          <input
                            type="number"
                            value={customConfig.mysqlPort}
                            onChange={(e) => setCustomConfig({ ...customConfig, mysqlPort: Number(e.target.value) })}
                            className={`w-full p-2 rounded-xl border font-mono transition-all ${
                              isDark ? 'bg-[#090A0F] border-white/[0.08] text-white focus:border-blue-500' : 'bg-white border-slate-300 text-slate-900'
                            }`}
                          />
                        </div>
                      )}

                      {selectedServices.includes('redis') && (
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-300">Puerto Redis</label>
                          <input
                            type="number"
                            value={customConfig.redisPort}
                            onChange={(e) => setCustomConfig({ ...customConfig, redisPort: Number(e.target.value) })}
                            className={`w-full p-2 rounded-xl border font-mono transition-all ${
                              isDark ? 'bg-[#090A0F] border-white/[0.08] text-white focus:border-blue-500' : 'bg-white border-slate-300 text-slate-900'
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: LOGS */}
            {activeTab === 'logs' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-400 uppercase">
                    Logs: {selectedServiceLog ? `Servicio "${selectedServiceLog}"` : 'Todos los contenedores'}
                  </span>
                  <button
                    onClick={() => handleFetchLogs(selectedServiceLog)}
                    className="p-1.5 text-blue-400 hover:text-blue-300 transition-colors flex items-center space-x-1 text-xs font-mono cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Actualizar Logs</span>
                  </button>
                </div>

                <div className={`h-80 text-emerald-400 font-mono text-[11px] p-4 rounded-2xl border overflow-y-auto custom-scrollbar whitespace-pre-wrap leading-relaxed ${
                  isDark ? 'bg-[#090A0F] border-white/[0.08]' : 'bg-black/90 border-slate-800'
                }`}>
                  {logs.length === 0 ? (
                    <div className="text-slate-500 text-center py-20">No hay logs registrados para este contenedor.</div>
                  ) : (
                    logs.map((l, idx) => <div key={idx}>{l}</div>)
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Footer Actions */}
          <div className={`px-6 py-4 border-t flex items-center justify-between ${
            isDark ? 'border-white/[0.08] bg-[#090A0F]' : 'border-slate-100 bg-slate-50'
          }`}>
            <button
              onClick={onClose}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-[#181B28]' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cerrar
            </button>

            {activeTab === 'generator' ? (
              <button
                onClick={handleGenerateCompose}
                disabled={isGenerating || selectedServices.length === 0}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 hover:shadow-[0_0_15px_rgba(37,99,235,0.35)] transition-all flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Generando docker-compose.yml...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Generar e Iniciar Contenedores ({selectedServices.length})</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={() => handleRunAction('up')}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 hover:shadow-[0_0_15px_rgba(37,99,235,0.35)] transition-all flex items-center space-x-2 cursor-pointer"
              >
                <Play className="h-3.5 w-3.5 fill-white" />
                <span>Ejecutar docker compose up</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
