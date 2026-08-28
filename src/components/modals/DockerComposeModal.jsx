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
  Plus, 
  Server, 
  RefreshCw,
  Zap
} from 'lucide-react';
import { getTranslations } from '../../locales';

export default function DockerComposeModal({
  isOpen,
  onClose,
  project,
  theme = 'dark',
  language = 'es'
}) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dockerAvailable, setDockerAvailable] = useState({ installed: true, dockerVersion: null, composeVersion: null });
  const [composeStatus, setComposeStatus] = useState({ hasCompose: false, services: [], composeFile: null });
  const [isLoading, setIsLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [logs, setLogs] = useState([]);
  const [selectedServiceLog, setSelectedServiceLog] = useState('');

  const isDark = theme === 'dark';
  const t = getTranslations(language);

  const serviceTemplates = [
    {
      id: 'postgres',
      name: 'PostgreSQL 16',
      category: language === 'es' ? 'Base de Datos Relacional' : 'Relational Database',
      desc: language === 'es' ? 'Motor relacional avanzado con soporte para JSONB y extensiones.' : 'Advanced relational engine with JSONB and extensions support.',
      icon: 'postgres',
      defaultPort: 5432,
      badge: 'SQL'
    },
    {
      id: 'mysql',
      name: 'MySQL 8.0',
      category: language === 'es' ? 'Base de Datos Relacional' : 'Relational Database',
      desc: language === 'es' ? 'Servidor MySQL clásico con volumen persistente y usuario configurable.' : 'Classic MySQL server with persistent volume and configurable user.',
      icon: 'mysql',
      defaultPort: 3306,
      badge: 'SQL'
    },
    {
      id: 'redis',
      name: 'Redis 7 (In-Memory)',
      category: language === 'es' ? 'Caché & Key-Value' : 'Cache & Key-Value',
      desc: language === 'es' ? 'Caché ultra-rápida en memoria con persistencia en disco AOF.' : 'Ultra-fast in-memory cache with AOF disk persistence.',
      icon: 'redis',
      defaultPort: 6379,
      badge: 'NoSQL'
    },
    {
      id: 'mongodb',
      name: 'MongoDB 7.0',
      category: language === 'es' ? 'Document Store' : 'Document Store',
      desc: language === 'es' ? 'Base de datos NoSQL basada en documentos JSON/BSON.' : 'NoSQL document database based on JSON/BSON.',
      icon: 'mongodb',
      defaultPort: 27017,
      badge: 'NoSQL'
    },
    {
      id: 'mailpit',
      name: 'Mailpit (Email Sandbox)',
      category: language === 'es' ? 'Herramienta de Correo' : 'Email Tool',
      desc: language === 'es' ? 'Servidor SMTP local para capturar y previsualizar emails en desarrollo.' : 'Local SMTP server to catch and preview dev emails.',
      icon: 'mail',
      defaultPort: 8025,
      badge: 'SMTP'
    }
  ];

  if (!isOpen || !project) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className={`w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden ${
          isDark ? 'bg-[#18181b] border-[#27272a] text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDark ? 'border-[#27272a] bg-[#202024]' : 'border-slate-100 bg-slate-50'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-600/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">
                {language === 'es' ? 'Gestor de Docker Compose' : 'Docker Compose Manager'}
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'es' ? `Orquestación de microservicios y contenedores para ${project.name}` : `Container and microservice orchestration for ${project.name}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isDark ? 'hover:bg-[#27272a] text-slate-400' : 'hover:bg-slate-200 text-slate-500'
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-xs font-mono">
          <div className="space-y-3">
            <span className="text-slate-400 font-bold uppercase text-[10px]">
              {language === 'es' ? 'Servicios Disponibles en el Catálogo:' : 'Available Catalog Services:'}
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {serviceTemplates.map((svc) => (
                <div
                  key={svc.id}
                  className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 ${
                    isDark ? 'bg-[#202024] border-[#27272a]' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        {svc.badge}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">:{svc.defaultPort}</span>
                    </div>
                    <h4 className="font-bold text-white text-sm">{svc.name}</h4>
                    <p className="text-[11px] text-slate-400 mt-1 font-sans leading-relaxed">{svc.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t flex items-center justify-end ${
          isDark ? 'border-[#27272a] bg-[#202024]' : 'border-slate-100 bg-slate-50'
        }`}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            {t.cancel || 'Close'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
