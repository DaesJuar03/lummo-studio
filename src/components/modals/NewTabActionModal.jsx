import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FolderKanban, Plus, Database, Table, ChevronRight } from 'lucide-react';

export default function NewTabActionModal({
  isOpen,
  onClose,
  onOpenProjects,
  onOpenDatabases,
  onAddProject,
  onOpenSQLiteWorkbench,
  theme
}) {
  if (!isOpen) return null;

  const isDark = theme === 'dark';

  const actions = [
    {
      id: 'projects',
      title: 'Abrir Pestaña de Proyectos',
      subtitle: 'Ver y gestionar todos tus repositorios locales',
      icon: FolderKanban,
      action: () => {
        onOpenProjects();
        onClose();
      }
    },
    {
      id: 'import',
      title: 'Importar Nueva Carpeta de Proyecto',
      subtitle: 'Seleccionar carpeta local de Vite, React, Node o PHP',
      icon: Plus,
      action: () => {
        onAddProject();
        onClose();
      }
    },
    {
      id: 'databases',
      title: 'Abrir Pestaña de Bases de Datos',
      subtitle: 'Gestor completo de instancias SQLite, MySQL, Postgres y MongoDB',
      icon: Database,
      action: () => {
        onOpenDatabases();
        onClose();
      }
    },
    {
      id: 'sqlite-workbench',
      title: 'Ver Base de Datos SQLite (Workbench SQL)',
      subtitle: 'Explorar tablas y ejecutar consultas SQL en tiempo real',
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
            isDark ? 'bg-[#1e1e1e] border-[#2a2a2a] text-[#e4e4e7]' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Header */}
          <div className={`px-6 py-4 border-b flex items-center justify-between ${
            isDark ? 'bg-[#181818] border-[#2a2a2a]' : 'bg-slate-50 border-slate-200'
          }`}>
            <div>
              <h3 className={`font-extrabold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Nueva Pestaña o Acción
              </h3>
              <p className="text-xs text-slate-500">¿Qué te gustaría hacer a continuación?</p>
            </div>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-xl transition-colors ${
                isDark ? 'text-[#a1a1aa] hover:text-white hover:bg-[#282828]' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
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
                  className={`w-full p-4 rounded-2xl border flex items-center justify-between text-left transition-all group ${
                    isDark 
                      ? 'bg-[#181818] border-[#2a2a2a] hover:border-[#3f3f46] hover:bg-[#222222]' 
                      : 'bg-slate-50/70 border-slate-200 hover:border-blue-400 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold shrink-0 ${
                      isDark ? 'bg-[#282828] border-[#383838] text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className={`font-bold text-xs ${isDark ? 'text-white group-hover:text-blue-400' : 'text-slate-900 group-hover:text-blue-600'} transition-colors`}>
                        {act.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{act.subtitle}</p>
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
