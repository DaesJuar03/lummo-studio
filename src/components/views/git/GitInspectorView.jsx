import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GitBranch, 
  GitCommit, 
  GitPullRequest, 
  ArrowUp, 
  ArrowDown, 
  RefreshCw, 
  Check, 
  Copy, 
  FileText, 
  Plus, 
  Trash2, 
  Edit3, 
  FilePlus, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  ChevronDown,
  FileCode,
  FolderGit2,
  Clock,
  User
} from 'lucide-react';

export default function GitInspectorView({
  folderPath,
  theme,
  language = 'es',
  t
}) {
  const isDark = theme === 'dark';

  const [isLoading, setIsLoading] = useState(true);
  const [gitStatus, setGitStatus] = useState(null);
  const [commits, setCommits] = useState([]);
  const [branches, setBranches] = useState([]);
  const [commitMessage, setCommitMessage] = useState('');
  const [isCommitting, setIsCommitting] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);
  const [copiedHash, setCopiedHash] = useState(null);
  const [showBranchMenu, setShowBranchMenu] = useState(false);

  const showFeedback = (msg, type = 'success') => {
    setActionNotice({ msg, type });
    setTimeout(() => setActionNotice(null), 3500);
  };

  const loadGitData = useCallback(async () => {
    if (!folderPath || !window.electronAPI?.git) return;
    setIsLoading(true);

    try {
      // 1. Get status
      const status = await window.electronAPI.git.getStatus(folderPath);
      setGitStatus(status);

      if (status?.hasGit) {
        // 2. Get history & branches in parallel
        const [historyRes, branchesRes] = await Promise.all([
          window.electronAPI.git.getHistory(folderPath, 60),
          window.electronAPI.git.getBranches(folderPath)
        ]);

        setCommits(historyRes?.commits || []);
        setBranches(branchesRes?.branches || []);
      }
    } catch (err) {
      console.error('[GitInspector] Error al cargar datos:', err);
    } finally {
      setIsLoading(false);
    }
  }, [folderPath]);

  useEffect(() => {
    loadGitData();
  }, [loadGitData]);

  const handleCommit = async (e) => {
    e?.preventDefault();
    if (!commitMessage.trim() || isCommitting) return;

    setIsCommitting(true);
    try {
      const res = await window.electronAPI.git.commit(folderPath, commitMessage.trim());
      if (res?.success) {
        setCommitMessage('');
        showFeedback(language === 'es' ? '¡Commit realizado con éxito!' : 'Commit created successfully!');
        await loadGitData();
      } else {
        showFeedback(res?.error || 'Error al crear commit', 'error');
      }
    } catch (err) {
      showFeedback(err.message || 'Error inesperado', 'error');
    } finally {
      setIsCommitting(false);
    }
  };

  const handlePush = async () => {
    if (isPushing) return;
    setIsPushing(true);
    try {
      const res = await window.electronAPI.git.push(folderPath);
      if (res?.success) {
        showFeedback(language === 'es' ? '¡Cambios subidos al remoto (Push)!' : 'Changes pushed to remote!');
        await loadGitData();
      } else {
        showFeedback(res?.error || 'Error en git push', 'error');
      }
    } catch (err) {
      showFeedback(err.message || 'Error inesperado en push', 'error');
    } finally {
      setIsPushing(false);
    }
  };

  const handlePull = async () => {
    if (isPulling) return;
    setIsPulling(true);
    try {
      const res = await window.electronAPI.git.pull(folderPath);
      if (res?.success) {
        showFeedback(language === 'es' ? '¡Repositorio actualizado (Pull)!' : 'Repository updated with remote (Pull)!');
        await loadGitData();
      } else {
        showFeedback(res?.error || 'Error en git pull', 'error');
      }
    } catch (err) {
      showFeedback(err.message || 'Error inesperado en pull', 'error');
    } finally {
      setIsPulling(false);
    }
  };

  const handleCheckoutBranch = async (branchName) => {
    setShowBranchMenu(false);
    if (!branchName || branchName === gitStatus?.currentBranch) return;

    setIsLoading(true);
    try {
      const res = await window.electronAPI.git.checkoutBranch(folderPath, branchName);
      if (res?.success) {
        showFeedback(language === 'es' ? `Cambiado a rama "${branchName}"` : `Switched to branch "${branchName}"`);
        await loadGitData();
      } else {
        showFeedback(res?.error || 'Error al cambiar de rama', 'error');
      }
    } catch (err) {
      showFeedback(err.message || 'Error inesperado', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyHash = (hash) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  if (isLoading && !gitStatus) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3 select-none">
        <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
        <span className="font-mono text-xs text-slate-400">
          {language === 'es' ? 'Leyendo historial y estado de Git...' : 'Reading Git status & history...'}
        </span>
      </div>
    );
  }

  if (!gitStatus?.hasGit) {
    return (
      <div className={`p-8 rounded-2xl border text-center space-y-4 max-w-lg mx-auto select-none ${
        isDark ? 'bg-[#141416] border-white/[0.08] text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
      }`}>
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(245,158,11,0.15)]">
          <FolderGit2 className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-base">
            {language === 'es' ? 'No es un repositorio Git' : 'Not a Git Repository'}
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            {language === 'es' 
              ? 'Esta carpeta no contiene un repositorio Git inicializado (.git).' 
              : 'This folder does not contain an initialized Git repository (.git).'}
          </p>
        </div>
      </div>
    );
  }

  const files = gitStatus?.files || [];

  return (
    <div className="space-y-5 select-none font-sans">
      {/* Top Bar: Active Branch, Sync Status, Push/Pull Actions */}
      <div className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        isDark ? 'bg-[#18181b] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
      }`}>
        {/* Left: Branch Switcher & Sync Counters */}
        <div className="flex items-center space-x-3 min-w-0">
          {/* Branch Switcher Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowBranchMenu(!showBranchMenu)}
              className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold font-mono flex items-center space-x-2 transition-all cursor-pointer ${
                isDark 
                  ? 'bg-[#222226] border-emerald-500/30 text-emerald-300 hover:border-emerald-500/60 hover:bg-[#28282e]' 
                  : 'bg-white border-emerald-300 text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
              <span className="truncate max-w-[160px]">{gitStatus.currentBranch}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {/* Branch Selector Dropdown */}
            <AnimatePresence>
              {showBranchMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.95 }}
                  className={`absolute left-0 top-full mt-2 w-64 rounded-2xl border z-30 p-2 space-y-1 max-h-60 overflow-y-auto custom-scrollbar ${
                    isDark ? 'bg-[#202024] border-white/[0.12] text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}
                >
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase font-mono text-slate-400">
                    {t?.gitBranches || 'Ramas disponibles'}
                  </div>
                  {branches.map((b) => (
                    <button
                      key={b.name}
                      type="button"
                      onClick={() => handleCheckoutBranch(b.name)}
                      className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-mono text-left flex items-center justify-between transition-colors cursor-pointer ${
                        b.isCurrent
                          ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                          : isDark ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span className="truncate">{b.name}</span>
                      {b.isCurrent && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sync Stats: Ahead / Behind */}
          <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-xl border text-xs font-mono font-bold ${
            isDark ? 'bg-[#191a20] border-white/[0.06]' : 'bg-slate-100 border-slate-200'
          }`}>
            <span className={`flex items-center space-x-1 ${
              gitStatus.ahead > 0 ? 'text-blue-400' : 'text-slate-500'
            }`} title={`${gitStatus.ahead} commits ahead`}>
              <ArrowUp className="w-3 h-3" />
              <span>{gitStatus.ahead}</span>
            </span>
            <span className="text-slate-600">/</span>
            <span className={`flex items-center space-x-1 ${
              gitStatus.behind > 0 ? 'text-amber-400' : 'text-slate-500'
            }`} title={`${gitStatus.behind} commits behind`}>
              <ArrowDown className="w-3 h-3" />
              <span>{gitStatus.behind}</span>
            </span>
          </div>
        </div>

        {/* Right: Actions (Pull, Push, Refresh) */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={handlePull}
            disabled={isPulling}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
              isDark 
                ? 'bg-[#1c1d22] border-white/[0.08] text-slate-300 hover:bg-[#25262c] hover:text-white' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            } ${isPulling ? 'opacity-60 cursor-wait' : ''}`}
          >
            <ArrowDown className={`w-3.5 h-3.5 text-slate-400 ${isPulling ? 'animate-bounce' : ''}`} />
            <span>{isPulling ? 'Pull...' : 'Pull'}</span>
          </button>

          <button
            type="button"
            onClick={handlePush}
            disabled={isPushing}
            className={`px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold flex items-center space-x-1.5 transition-all shadow-[0_0_12px_rgba(37,99,235,0.25)] cursor-pointer ${
              isPushing ? 'opacity-60 cursor-wait' : ''
            }`}
          >
            <ArrowUp className={`w-3.5 h-3.5 ${isPushing ? 'animate-bounce' : ''}`} />
            <span>{isPushing ? 'Push...' : 'Push'}</span>
          </button>

          <button
            type="button"
            onClick={loadGitData}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isDark ? 'bg-[#1c1d22] border-white/[0.08] text-slate-400 hover:text-white hover:bg-[#25262c]' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
            title="Recargar Git"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      <AnimatePresence>
        {actionNotice && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className={`p-3 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-md ${
              actionNotice.type === 'success'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
            }`}
          >
            {actionNotice.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
            <span>{actionNotice.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Grid: Pending Changes (Left) & Commit Timeline (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Column (5 cols): Pending Changes & Commit Box */}
        <div className={`p-4 rounded-2xl border space-y-4 lg:col-span-5 flex flex-col justify-between ${
          isDark ? 'bg-[#18181b] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-2.5 border-white/[0.08]">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <h5 className="font-extrabold text-xs tracking-tight text-white">
                  {language === 'es' ? 'Cambios Pendientes' : 'Pending Changes'}
                </h5>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                {files.length}
              </span>
            </div>

            {/* Files List */}
            <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
              {files.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 font-mono">
                  {language === 'es' ? '✨ Árbol de trabajo limpio' : '✨ Working tree clean'}
                </div>
              ) : (
                files.map((file) => {
                  let badgeColor = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
                  let statusTag = 'MODIFICADO';
                  let letter = 'M';

                  if (file.status === 'ADDED' || file.status === 'UNTRACKED') {
                    badgeColor = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
                    statusTag = file.status === 'ADDED' ? 'NUEVO' : 'SIN RASTREO';
                    letter = file.status === 'ADDED' ? 'A' : '+';
                  } else if (file.status === 'DELETED') {
                    badgeColor = 'bg-rose-500/15 text-rose-300 border-rose-500/30';
                    statusTag = 'ELIMINADO';
                    letter = 'D';
                  }

                  return (
                    <div
                      key={file.path}
                      className={`px-3 py-2 rounded-xl border text-xs font-mono flex items-center justify-between gap-2 transition-colors ${
                        isDark ? 'bg-[#202024] border-white/[0.04] hover:bg-[#25252b]' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <FileCode className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate text-slate-200 font-medium" title={file.path}>
                          {file.path}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-md border shrink-0 ${badgeColor}`}>
                        {letter}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick Commit Box */}
          <form onSubmit={handleCommit} className="space-y-2 pt-3 border-t border-white/[0.08]">
            <input
              type="text"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder={language === 'es' ? 'Mensaje del commit...' : 'Commit message...'}
              disabled={files.length === 0 || isCommitting}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none transition-all ${
                isDark 
                  ? 'bg-[#202024] border-white/[0.08] text-white focus:border-emerald-500 placeholder:text-slate-500' 
                  : 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500 placeholder:text-slate-400'
              } disabled:opacity-50`}
            />
            <button
              type="submit"
              disabled={files.length === 0 || !commitMessage.trim() || isCommitting}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <GitCommit className={`w-3.5 h-3.5 ${isCommitting ? 'animate-spin' : ''}`} />
              <span>{isCommitting ? (language === 'es' ? 'Guardando Commit...' : 'Saving Commit...') : (language === 'es' ? 'Hacer Commit' : 'Commit Changes')}</span>
            </button>
          </form>
        </div>

        {/* Right Column (7 cols): Visual Commit Graph & Log Timeline */}
        <div className={`p-4 rounded-2xl border space-y-3 lg:col-span-7 ${
          isDark ? 'bg-[#18181b] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
        }`}>
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-2.5 border-white/[0.08]">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                <GitCommit className="w-3.5 h-3.5" />
              </div>
              <h5 className="font-extrabold text-xs tracking-tight text-white">
                {language === 'es' ? 'Historial de Commits' : 'Commits History'}
              </h5>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
              {commits.length}
            </span>
          </div>

          {/* Commits Timeline */}
          <div className="space-y-2 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
            {commits.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 font-mono">
                {language === 'es' ? 'No hay commits registrados aún.' : 'No commits recorded yet.'}
              </div>
            ) : (
              commits.map((c, idx) => {
                const isHead = idx === 0;
                return (
                  <div
                    key={c.hash}
                    className={`p-3 rounded-xl border flex items-start justify-between gap-3 transition-all ${
                      isHead 
                        ? 'bg-blue-500/10 border-blue-500/30 shadow-xs' 
                        : isDark ? 'bg-[#191a20] border-white/[0.04] hover:bg-[#1f2029] hover:border-white/[0.1]' : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start space-x-2.5 min-w-0">
                      {/* Timeline Node Dot */}
                      <div className="mt-1 flex flex-col items-center shrink-0">
                        <div className={`w-2.5 h-2.5 rounded-full ${
                          isHead ? 'bg-blue-400 ring-4 ring-blue-500/20' : 'bg-slate-500'
                        }`} />
                      </div>

                      {/* Commit Details */}
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="font-bold text-xs text-slate-100 tracking-tight">
                            {c.message}
                          </span>
                          {c.refs && c.refs.map((ref) => (
                            <span key={ref} className="text-[9px] font-mono px-1.5 py-0.2 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30 font-bold">
                              {ref}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-mono">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-500" />
                            {c.author}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {c.date}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Hash & Copy Button */}
                    <button
                      type="button"
                      onClick={() => handleCopyHash(c.hash)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center space-x-1.5 shrink-0 transition-all cursor-pointer border ${
                        copiedHash === c.hash
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : isDark ? 'bg-[#22232a] border-white/[0.06] text-slate-400 hover:text-white hover:border-white/[0.12]' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                      }`}
                      title="Copiar hash SHA"
                    >
                      {copiedHash === c.hash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{c.shortHash}</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
