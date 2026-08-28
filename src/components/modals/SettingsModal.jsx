import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Settings as SettingsIcon, 
  Cpu, 
  Hash, 
  Code, 
  Sliders, 
  FolderKanban, 
  ShieldCheck 
} from 'lucide-react';
import { getTranslations } from '../../locales';

import ServicesTab from './settings/ServicesTab';
import PortsTab from './settings/PortsTab';
import EditorTab from './settings/EditorTab';
import ProjectsManagerTab from './settings/ProjectsManagerTab';
import SslTab from './settings/SslTab';
import GeneralTab from './settings/GeneralTab';

export default function SettingsModal({ 
  onClose, 
  envStatus, 
  onScanEnv, 
  isScanning, 
  theme, 
  onToggleTheme,
  language = 'es',
  onSelectLanguage,
  onClearAllLogs,
  projects = [],
  onSaveProjects,
  onRemoveProject,
  onOpenFolder
}) {
  const [activeCategory, setActiveCategory] = useState('services');
  const [detectedEditors, setDetectedEditors] = useState([]);
  const [isScanningEditors, setIsScanningEditors] = useState(false);
  const [selectedEditorCmd, setSelectedEditorCmd] = useState(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem('lummo-preferred-editor') || 'code';
      }
    } catch {
      // Ignored for environments without localStorage
    }
    return 'code';
  });

  const handleScanEditors = async () => {
    if (window.electronAPI?.getDetectedEditors) {
      setIsScanningEditors(true);
      try {
        const editors = await window.electronAPI.getDetectedEditors();
        setDetectedEditors(editors);
      } catch (err) {
        console.error('Error al detectar editores:', err);
      } finally {
        setIsScanningEditors(false);
      }
    }
  };

  useEffect(() => {
    if (activeCategory === 'editor') {
      handleScanEditors();
    }
  }, [activeCategory]);

  const handleSelectEditorCmd = (val) => {
    setSelectedEditorCmd(val);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('lummo-preferred-editor', val);
      }
    } catch {
      // Ignored
    }
  };

  const t = getTranslations(language);
  const isDark = theme === 'dark';
  const archivedCount = (projects || []).filter(p => p.isArchived).length;

  const categories = [
    { id: 'services', label: t.systemServices, icon: Cpu },
    { id: 'ports', label: t.defaultPorts, icon: Hash },
    { id: 'editor', label: t.codeEditorTab, icon: Code },
    { 
      id: 'projects', 
      label: t.projectsManagerTab || 'Gestión de Proyectos', 
      icon: FolderKanban, 
      badge: archivedCount > 0 ? `${archivedCount}` : null 
    },
    { id: 'ssl', label: t.sslTab || 'Certificados SSL & HTTPS', icon: ShieldCheck },
    { id: 'general', label: t.generalTab, icon: Sliders },
  ];

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none"
        onClick={onClose}
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-5xl lg:max-w-6xl h-[720px] max-h-[92vh] rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${
            isDark ? 'bg-[#141414] border-white/[0.08] text-[#E5E5E5]' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Modal Header */}
          <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
            isDark ? 'bg-[#141414] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/20">
                <SettingsIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className={`font-extrabold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.settingsTitle}</h3>
                <p className="text-xs text-slate-400">{t.settingsDesc}</p>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-[#303030]' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
              }`}
            >
              <X className="h-5 w-5" />
            </motion.button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar Categories */}
            <div className={`w-64 border-r p-4 space-y-1 shrink-0 overflow-y-auto no-scrollbar ${
              isDark ? 'bg-[#141414] border-white/[0.08]' : 'bg-slate-50/80 border-slate-200'
            }`}>
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left cursor-pointer ${
                      isActive
                        ? isDark 
                          ? 'bg-[#252525] border border-white/[0.08] text-white shadow-[0_0_12px_rgba(59,130,246,0.15)]' 
                          : 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                        : isDark
                          ? 'text-slate-400 hover:bg-[#1E1E1E] hover:text-white'
                          : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`h-4 w-4 ${isActive ? (isDark ? 'text-blue-400' : 'text-white') : 'text-slate-400'}`} />
                      <span>{cat.label}</span>
                    </div>
                    {cat.badge && (
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                        isActive 
                          ? isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-white/20 text-white' 
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {cat.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right Category Details View */}
            <div className={`flex-1 p-6 overflow-y-auto no-scrollbar space-y-6 ${isDark ? 'bg-[#141414]' : 'bg-white'}`}>
              {activeCategory === 'services' && (
                <ServicesTab
                  envStatus={envStatus}
                  onScanEnv={onScanEnv}
                  isScanning={isScanning}
                  theme={theme}
                  t={t}
                />
              )}

              {activeCategory === 'ports' && (
                <PortsTab theme={theme} t={t} />
              )}

              {activeCategory === 'editor' && (
                <EditorTab
                  detectedEditors={detectedEditors}
                  isScanningEditors={isScanningEditors}
                  onScanEditors={handleScanEditors}
                  selectedEditorCmd={selectedEditorCmd}
                  onSelectEditorCmd={handleSelectEditorCmd}
                  theme={theme}
                  t={t}
                />
              )}

              {activeCategory === 'projects' && (
                <ProjectsManagerTab
                  projects={projects}
                  onSaveProjects={onSaveProjects}
                  onRemoveProject={onRemoveProject}
                  onOpenFolder={onOpenFolder}
                  theme={theme}
                  t={t}
                />
              )}

              {activeCategory === 'ssl' && (
                <SslTab theme={theme} />
              )}

              {activeCategory === 'general' && (
                <GeneralTab
                  language={language}
                  onSelectLanguage={onSelectLanguage}
                  theme={theme}
                  onToggleTheme={onToggleTheme}
                  onClearAllLogs={onClearAllLogs}
                  t={t}
                />
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
