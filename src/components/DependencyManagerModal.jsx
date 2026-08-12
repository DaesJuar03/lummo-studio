import React, { useState } from 'react';
import { Package, Download, Terminal, CheckCircle2, AlertCircle, X, Loader2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function DependencyManagerModal({ isOpen, onClose, project }) {
  const [selectedManager, setSelectedManager] = useState('npm');
  const [isInstalling, setIsInstalling] = useState(false);
  const [installLog, setInstallLog] = useState('');
  const toast = useToast();

  if (!isOpen || !project) return null;

  const handleInstall = async () => {
    setIsInstalling(true);
    setInstallLog(`Iniciando instalación de dependencias en ${project.name} usando ${selectedManager}...\n`);

    try {
      if (window.electronAPI && window.electronAPI.installDependencies) {
        const res = await window.electronAPI.installDependencies(project.id, project.path, selectedManager);
        if (res && res.success) {
          toast.showSuccess('Dependencias Instaladas', `Se instalaron correctamente en ${project.name}`);
        } else {
          toast.showError('Error de Instalación', res?.error || 'Falló la instalación de dependencias');
        }
      } else {
        toast.showInfo('Modo Demostración', 'Instalador simulado en entorno de navegador.');
      }
    } catch (err) {
      toast.showError('Error inesperado', err.message);
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100">Gestor de Dependencias</h3>
              <p className="text-xs text-slate-400 font-mono truncate max-w-xs">{project.name} ({project.path})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Seleccionar Gestor de Paquetes
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {['npm', 'pnpm', 'yarn', 'bun', 'pip', 'composer'].map((mgr) => (
                <button
                  key={mgr}
                  onClick={() => setSelectedManager(mgr)}
                  disabled={isInstalling}
                  className={`px-3 py-2 text-xs font-medium rounded-xl border transition-all ${
                    selectedManager === mgr
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-lg shadow-cyan-500/10'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {mgr}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 h-40 overflow-y-auto space-y-1">
            <div className="flex items-center gap-2 text-slate-500 border-b border-slate-800/60 pb-2 mb-2">
              <Terminal className="w-3.5 h-3.5" />
              <span>Consola de Ejecución ({selectedManager})</span>
            </div>
            {installLog ? (
              <pre className="whitespace-pre-wrap font-mono text-slate-300">{installLog}</pre>
            ) : (
              <p className="text-slate-500 italic">Presiona 'Instalar Paquetes' para iniciar la instalación...</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isInstalling}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={handleInstall}
            disabled={isInstalling}
            className="px-5 py-2 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
          >
            {isInstalling ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Instalando...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Instalar Paquetes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
