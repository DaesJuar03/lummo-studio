import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FolderKanban, Plus, Database, Table, ChevronRight } from 'lucide-react';
import { getTranslations } from '../../locales';

export default function NewTabActionModal({
  isOpen,
  onClose,
  onOpenProjects,
  onOpenDatabases,
  onAddProject,
  onOpenSQLiteWorkbench,
  theme,
  language = 'es'
}) {
  if (!isOpen) return null;

  const isDark = theme === 'dark';
  const t = getTranslations(language);

  const actions = [
    {
      id: 'projects',
      title: language === 'es' ? 'Abrir Pestaña de Proyectos' : 'Open Projects Tab',
      subtitle: language === 'es' ? 'Ver y gestionar todos tus repositorios locales' : 'View and manage all your local repositories',
      icon: FolderKanban,
      action: () => {
        onOpenProjects();
        onClose();
      }
    },
    {
      id: 'import',
      title: language === 'es' ? 'Importar Nueva Carpeta de Proyecto' : 'Import New Project Folder',
      subtitle: language === 'es' ? 'Seleccionar carpeta local de Vite, React, Node o PHP' : 'Select local folder of Vite, React, Node or PHP',
      icon: Plus,
      action: () => {
        onAddProject();
        onClose();
      }
    },
    {
      id: 'databases',
      title: language === 'es' ? 'Abrir Pestaña de Bases de Datos' : 'Open Databases Tab',
      subtitle: language === 'es' ? 'Gestor completo de instancias SQLite, MySQL, Postgres y MongoDB' : 'Complete manager for SQLite, MySQL, Postgres and Redis',
      icon: Database,
      action: () => {
        onOpenDatabases();
        onClose();
      }
    },
    {
      id: 'sqlite-workbench',
      title: language === 'es' ? 'Ver Base de Datos SQLite (Workbench SQL)' : 'View SQLite Database (SQL Workbench)',
      subtitle: language === 'es' ? 'Explorar tablas y ejecutar consultas SQL en tiempo real' : 'Explore tables and run SQL queries in real-time',
      icon: Table,
      action: () => {
        onOpenSQLiteWorkbench();
        onClose();
      }
    }
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden ${
            isDark ? 'bg-[#141414] border-white/[0.08] text-[#E5E5E5]' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Header */}
          <div className={`px-6 py-4 border-b flex items-center justify-between ${
            isDark ? 'bg-[#141414] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
          }`}>
            <div>
              <h3 className={`font-extrabold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {language === 'es' ? 'Nueva Pestaña o Acción' : 'New Tab or Action'}
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'es' ? '¿Qué te gustaría hacer a continuación?' : 'What would you like to do next?'}
              </p>
            </div>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-[#303030]' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
              }`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Action List */}
          <div className="p-5 space-y-2.5">
            {actions.map((act) => {
              const Icon = act.icon;
              return (
                <motion.button
                  key={act.id}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={act.action}
                  className={`w-full p-4 rounded-2xl border flex items-center justify-between text-left transition-all group cursor-pointer ${
                    isDark 
                      ? 'bg-[#1E1E1E] border-white/[0.08] hover:border-blue-500/40 hover:bg-[#252525]' 
                      : 'bg-slate-50/70 border-slate-200 hover:border-blue-400 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold shrink-0 ${
                      isDark ? 'bg-[#252525] border-white/[0.08] text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className={`font-bold text-xs ${isDark ? 'text-white group-hover:text-blue-400' : 'text-slate-900 group-hover:text-blue-600'} transition-colors`}>
                        {act.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{act.subtitle}</p>
                    </div>
                  </div>

                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
