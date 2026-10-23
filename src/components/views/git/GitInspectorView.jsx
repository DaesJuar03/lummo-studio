import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GitBranch, 
  GitCommit, 
  ArrowUp, 
  ArrowDown, 
  RefreshCw, 
  Check, 
  Copy, 
  FileText, 
  Plus, 
  Minus, 
  Trash2, 
  RotateCcw,
  FileCode, 
  FolderGit2, 
  Clock, 
  User, 
  MoreVertical, 
  ChevronDown, 
  CheckCircle2, 
  AlertCircle, 
  Filter, 
  Network, 
  List, 
  ChevronRight,
  Info,
  X
} from 'lucide-react';
import GitGraphRenderer, { computeGraphTopology } from './GitGraphRenderer';
import GitDiffModal from './GitDiffModal';
import GitContextMenu from './GitContextMenu';
import GitBranchCreateModal from './GitBranchCreateModal';
import GitCommitHoverCard from './GitCommitHoverCard';

export default function GitInspectorView({
  folderPath,
  theme,
  language = 'es',
  t
}) {
  const isDark = theme === 'dark';

  // Core Git state
  const [isLoading, setIsLoading] = useState(true);
  const [gitStatus, setGitStatus] = useState(null);
  const [commits, setCommits] = useState([]);
  const [totalCommitsCount, setTotalCommitsCount] = useState(0);
  const [branches, setBranches] = useState([]);
  const [branchFilter, setBranchFilter] = useState('all'); // 'all' | 'current'
  const [viewMode, setViewMode] = useState('graph'); // 'graph' | 'compact'
  const [commitsLimit, setCommitsLimit] = useState(40);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Branch isolation / focus mode
  const [focusedLane, setFocusedLane] = useState(null);

  // Commit Hover Card
  const [hoverCardInfo, setHoverCardInfo] = useState(null);

  // Commit form state
  const [commitTitle, setCommitTitle] = useState('');
  const [commitBody, setCommitBody] = useState('');
  const [showBodyField, setShowBodyField] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  // Sync state
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);
  const [copiedHash, setCopiedHash] = useState(null);
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // Interactive Diff & Context Menu Modals
  const [selectedDiffFile, setSelectedDiffFile] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [branchCreateCommit, setBranchCreateCommit] = useState(null);

  const historyScrollRef = useRef(null);

  const showFeedback = (msg, type = 'success') => {
    setActionNotice({ msg, type });
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Compute node topology map to correlate row index with lane
  const { nodeCoords } = React.useMemo(() => {
    return computeGraphTopology(commits);
  }, [commits]);

  const commitToLaneMap = React.useMemo(() => {
    const map = new Map();
    nodeCoords.forEach((node) => {
      map.set(node.hash, node.lane);
    });
    return map;
  }, [nodeCoords]);

  // Load Git status & history
  const loadGitData = useCallback(async (limit = commitsLimit, filter = branchFilter) => {
    if (!folderPath || !window.electronAPI?.git) return;
    setIsLoading(true);

    try {
      const status = await window.electronAPI.git.getStatus(folderPath);
      setGitStatus(status);

      if (status?.hasGit) {
        const [historyRes, branchesRes] = await Promise.all([
          window.electronAPI.git.getHistory({
            folderPath,
            limit,
            skip: 0,
            branchFilter: filter
          }),
          window.electronAPI.git.getBranches(folderPath)
        ]);

        setCommits(historyRes?.commits || []);
        setTotalCommitsCount(historyRes?.totalCount || historyRes?.commits?.length || 0);
        setBranches(branchesRes?.branches || []);
      }
    } catch (err) {
      console.error('[GitInspector] Error al cargar datos:', err);
    } finally {
      setIsLoading(false);
    }
  }, [folderPath, commitsLimit, branchFilter]);

  useEffect(() => {
    loadGitData(commitsLimit, branchFilter);
  }, [folderPath, branchFilter]);

  // Load more commits (pagination)
  const handleLoadMore = async () => {
    if (isLoadingMore || !window.electronAPI?.git) return;
    setIsLoadingMore(true);
    const newLimit = commitsLimit + 40;
    try {
      const historyRes = await window.electronAPI.git.getHistory({
        folderPath,
        limit: newLimit,
        skip: 0,
        branchFilter
      });
      setCommits(historyRes?.commits || []);
      setTotalCommitsCount(historyRes?.totalCount || historyRes?.commits?.length || 0);
      setCommitsLimit(newLimit);
    } catch (err) {
      console.error('Error loading more commits:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Branch Switch
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

  // Push & Pull
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

  // Staging operations
  const handleStageFile = async (filePath) => {
    try {
      if (window.electronAPI?.git?.stageFile) {
        await window.electronAPI.git.stageFile(folderPath, filePath);
      } else {
        await window.electronAPI.git.stageAll(folderPath);
      }
      await loadGitData();
    } catch (err) {
      showFeedback(err.message || 'Error al preparar archivo', 'error');
    }
  };

  const handleUnstageFile = async (filePath) => {
    try {
      if (window.electronAPI?.git?.unstageFile) {
        await window.electronAPI.git.unstageFile(folderPath, filePath);
      }
      await loadGitData();
    } catch (err) {
      showFeedback(err.message || 'Error al desmarcar archivo', 'error');
    }
  };

  const handleStageAll = async () => {
    try {
      await window.electronAPI.git.stageAll(folderPath);
      showFeedback(language === 'es' ? 'Todos los cambios preparados (Stage All)' : 'All changes staged');
      await loadGitData();
    } catch (err) {
      showFeedback(err.message || 'Error en Stage All', 'error');
    }
  };

  const handleUnstageAll = async () => {
    try {
      if (window.electronAPI?.git?.unstageAll) {
        await window.electronAPI.git.unstageAll(folderPath);
        showFeedback(language === 'es' ? 'Todos los cambios desmarcados' : 'All changes unstaged');
        await loadGitData();
      }
    } catch (err) {
      showFeedback(err.message || 'Error en Unstage All', 'error');
    }
  };

  const handleDiscardFile = async (filePath, isUntracked) => {
    const confirmMsg = language === 'es'
      ? `¿Descartar los cambios en "${filePath}"? Esta acción no se puede deshacer.`
      : `Discard changes in "${filePath}"? This cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      if (window.electronAPI?.git?.discardFile) {
        const res = await window.electronAPI.git.discardFile(folderPath, filePath, isUntracked);
        if (res?.success) {
          showFeedback(language === 'es' ? 'Cambios descartados' : 'Changes discarded');
          await loadGitData();
        } else {
          showFeedback(res?.error || 'Error al descartar', 'error');
        }
      }
    } catch (err) {
      showFeedback(err.message || 'Error al descartar cambios', 'error');
    }
  };

  const handleDiscardAll = async () => {
    const confirmMsg = language === 'es'
      ? '¿Descartar todos los cambios sin preparar? Los archivos modificados volverán al estado del último commit.'
      : 'Discard all unstaged changes? Modified files will revert to the last commit.';
    if (!window.confirm(confirmMsg)) return;

    try {
      if (window.electronAPI?.git?.discardAll) {
        await window.electronAPI.git.discardAll(folderPath);
        showFeedback(language === 'es' ? 'Cambios descartados' : 'All unstaged changes discarded');
        await loadGitData();
      }
    } catch (err) {
      showFeedback(err.message || 'Error al descartar', 'error');
    }
  };

  // Commit Creation
  const stagedFiles = gitStatus?.stagedFiles || [];
  const unstagedFiles = gitStatus?.unstagedFiles || [];
  const canCommit = stagedFiles.length > 0 && commitTitle.trim().length > 0 && !isCommitting;

  const handleCommit = async (e) => {
    e?.preventDefault();
    if (!canCommit) return;

    setIsCommitting(true);
    try {
      const res = await window.electronAPI.git.commit(
        folderPath, 
        commitTitle.trim(), 
        showBodyField ? commitBody.trim() : undefined
      );

      if (res?.success) {
        setCommitTitle('');
        setCommitBody('');
        setShowBodyField(false);
        showFeedback(language === 'es' ? '¡Commit realizado con éxito!' : 'Commit created successfully!');
        await loadGitData();
      } else {
        showFeedback(res?.error || 'Error al crear commit', 'error');
      }
    } catch (err) {
      showFeedback(err.message || 'Error inesperado al hacer commit', 'error');
    } finally {
      setIsCommitting(false);
    }
  };

  // Context Menu Actions
  const handleContextCheckout = async (commit) => {
    try {
      const res = await (window.electronAPI?.git?.checkout 
        ? window.electronAPI.git.checkout(folderPath, commit.hash)
        : window.electronAPI.git.checkoutBranch(folderPath, commit.hash));
      if (res?.success) {
        showFeedback(language === 'es' ? `HEAD movido a commit ${commit.shortHash}` : `Switched to commit ${commit.shortHash}`);
        await loadGitData();
      } else {
        showFeedback(res?.error || 'Error al cambiar a commit', 'error');
      }
    } catch (err) {
      showFeedback(err.message || 'Error en checkout', 'error');
    }
  };

  const handleCreateBranchSubmit = async (branchName, startPoint) => {
    if (window.electronAPI?.git?.createBranch) {
      const res = await window.electronAPI.git.createBranch(folderPath, branchName, startPoint);
      if (res?.success) {
        showFeedback(language === 'es' ? `Rama "${branchName}" creada y activa` : `Branch "${branchName}" created & active`);
        await loadGitData();
      } else {
        throw new Error(res?.error || 'Error al crear la rama');
      }
    }
  };

  const handleRevertCommit = async (commit) => {
    const confirmMsg = language === 'es'
      ? `¿Revertir el commit "${commit.message}" (${commit.shortHash})? Se creará un commit inverso.`
      : `Revert commit "${commit.message}" (${commit.shortHash})? An inverse commit will be created.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      if (window.electronAPI?.git?.revertCommit) {
        const res = await window.electronAPI.git.revertCommit(folderPath, commit.hash);
        if (res?.success) {
          showFeedback(language === 'es' ? `Commit ${commit.shortHash} revertido con éxito` : `Commit ${commit.shortHash} reverted`);
          await loadGitData();
        } else {
          showFeedback(res?.error || 'Error al revertir commit', 'error');
        }
      }
    } catch (err) {
      showFeedback(err.message || 'Error al revertir', 'error');
    }
  };

  const handleCopyHash = (hash) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    showFeedback(language === 'es' ? `SHA copiado: ${hash.substring(0, 7)}` : `Copied SHA: ${hash.substring(0, 7)}`);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  // Node Hover Handlers
  const handleHoverNode = (e, commit, lane) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverCardInfo({
      commit,
      lane,
      x: rect.right + 4,
      y: rect.top
    });
  };

  const handleLeaveNode = () => {
    setHoverCardInfo(null);
  };

  const handleSelectLane = (lane) => {
    setFocusedLane((prev) => (prev === lane ? null : lane));
  };

  if (isLoading && !gitStatus) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3 select-none">
        <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
        <span className="font-mono text-xs text-slate-400">
          {language === 'es' ? 'Leyendo historial, ramas y estado de Git...' : 'Reading Git status, branches & graph...'}
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

  return (
    <div className="h-full w-full flex flex-col min-h-0 overflow-hidden space-y-3 select-none font-sans">
      {/* Top Bar: Active Branch, Sync Status, Push/Pull Actions (Borderless & Clean) */}
      <div className={`p-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 ${
        isDark ? 'bg-[#18181b]/70 border-white/[0.06]' : 'bg-slate-50 border-slate-200'
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
                  className={`absolute left-0 top-full mt-2 w-64 rounded-2xl border z-30 p-2 space-y-1 max-h-60 overflow-y-auto custom-scrollbar shadow-2xl ${
                    isDark ? 'bg-[#202024] border-white/[0.12] text-white shadow-black/60' : 'bg-white border-slate-200 text-slate-900 shadow-slate-400/30'
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

          {/* Branch Focus Mode Indicator */}
          {focusedLane !== null && (
            <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span>{language === 'es' ? `Rama aislada (Carril ${focusedLane + 1})` : `Focused Lane ${focusedLane + 1}`}</span>
              <button
                type="button"
                onClick={() => setFocusedLane(null)}
                className="ml-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Quitar aislamiento de rama"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
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
            onClick={() => loadGitData()}
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
            className={`p-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-md ${
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

      {/* Main 2-Column Split: Borderless Containers with 1px Subtle Vertical Divider */}
      <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch gap-0 flex-1 min-h-0 overflow-hidden pt-1">
        
        {/* ========================================================= */}
        {/* COLUMNA IZQUIERDA (62% - 66% ancho): Historial de Commits / Grafo */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 xl:col-span-8 pr-0 lg:pr-5 lg:border-r lg:border-white/[0.08] flex flex-col h-full min-h-0 overflow-hidden space-y-2.5">
          
          {/* Header Controls: Branch Filter, View Mode, Total Commit Count */}
          <div className="flex flex-wrap items-center justify-between border-b pb-2.5 border-white/[0.08] gap-2 shrink-0">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                <GitCommit className="w-3.5 h-3.5" />
              </div>
              <h5 className="font-extrabold text-xs tracking-tight text-white">
                {language === 'es' ? 'Historial de Commits' : 'Commits History'}
              </h5>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
                {totalCommitsCount || commits.length}
              </span>

              {focusedLane !== null && (
                <button
                  type="button"
                  onClick={() => setFocusedLane(null)}
                  className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/30 transition-colors flex items-center space-x-1 cursor-pointer"
                >
                  <span>Reset focus</span>
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>

            {/* Controls: Branch Filter & Graph/Compact View Toggle */}
            <div className="flex items-center space-x-2">
              {/* Branch Filter Selector */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowFilterMenu(!showFilterMenu)}
                  className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold font-mono flex items-center space-x-1.5 transition-colors cursor-pointer ${
                    isDark 
                      ? 'bg-[#1f2026] border-white/[0.08] text-slate-300 hover:text-white' 
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                  title="Filtrar historial"
                >
                  <Filter className="w-3 h-3 text-blue-400" />
                  <span>
                    {branchFilter === 'all' 
                      ? (language === 'es' ? 'Todas las ramas' : 'All branches') 
                      : (language === 'es' ? 'Rama actual' : 'Current branch')}
                  </span>
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </button>

                <AnimatePresence>
                  {showFilterMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.95 }}
                      className={`absolute right-0 top-full mt-1.5 w-48 rounded-xl border z-30 p-1 space-y-0.5 shadow-2xl backdrop-blur-md ${
                        isDark ? 'bg-[#202026] border-white/[0.12] text-white shadow-black/80' : 'bg-white border-slate-200 text-slate-900 shadow-slate-400/30'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setBranchFilter('all');
                          setShowFilterMenu(false);
                        }}
                        className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-mono text-left flex items-center justify-between cursor-pointer ${
                          branchFilter === 'all'
                            ? 'bg-blue-500/20 text-blue-300 font-bold'
                            : isDark ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <span>{language === 'es' ? 'Todas las ramas (Grafo)' : 'All branches (Full graph)'}</span>
                        {branchFilter === 'all' && <Check className="w-3 h-3 text-blue-400" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setBranchFilter('current');
                          setShowFilterMenu(false);
                        }}
                        className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-mono text-left flex items-center justify-between cursor-pointer ${
                          branchFilter === 'current'
                            ? 'bg-blue-500/20 text-blue-300 font-bold'
                            : isDark ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <span>{language === 'es' ? 'Rama actual' : 'Current branch only'}</span>
                        {branchFilter === 'current' && <Check className="w-3 h-3 text-blue-400" />}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* View Switch: Graph vs Compact List */}
              <div className={`p-0.5 rounded-xl border flex items-center ${
                isDark ? 'bg-[#1f2026] border-white/[0.08]' : 'bg-slate-200/70 border-slate-300'
              }`}>
                <button
                  type="button"
                  onClick={() => setViewMode('graph')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'graph' 
                      ? 'bg-blue-600 text-white shadow-xs' 
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Vista de Grafo Visual"
                >
                  <Network className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('compact')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'compact' 
                      ? 'bg-blue-600 text-white shadow-xs' 
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Vista de Lista Compacta"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Commits List with Integrated Interactive SVG Graph */}
          <div 
            ref={historyScrollRef}
            className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 space-y-1.5"
          >
            {commits.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-500 font-mono">
                {language === 'es' ? 'No hay commits registrados aún.' : 'No commits recorded yet.'}
              </div>
            ) : viewMode === 'graph' ? (
              /* Graph View: SVG lanes on left + synchronous commit rows on right */
              <div className="flex items-start">
                {/* SVG Git Graph Column */}
                <GitGraphRenderer
                  commits={commits}
                  rowHeight={58}
                  laneWidth={18}
                  offsetX={14}
                  focusedLane={focusedLane}
                  onSelectLane={handleSelectLane}
                  onHoverNode={handleHoverNode}
                  onLeaveNode={handleLeaveNode}
                  theme={theme}
                  onNodeContextMenu={(e, commit) => {
                    setContextMenu({ x: e.clientX, y: e.clientY, commit });
                  }}
                />

                {/* Commits Rows */}
                <div className="flex-1 space-y-1.5 min-w-0">
                  {commits.map((c, idx) => {
                    const isHead = idx === 0;
                    const commitLane = commitToLaneMap.get(c.hash) ?? 0;
                    const isLaneFocused = focusedLane === null || focusedLane === commitLane;

                    return (
                      <div
                        key={c.hash}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setContextMenu({ x: e.clientX, y: e.clientY, commit: c });
                        }}
                        style={{ height: '58px' }}
                        className={`px-3 py-1.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                          isLaneFocused ? 'opacity-100' : 'opacity-25 hover:opacity-100'
                        } ${
                          isHead 
                            ? 'bg-blue-500/10 border-blue-500/30 shadow-xs' 
                            : isDark ? 'bg-[#181920]/60 border-white/[0.04] hover:bg-[#1f2029] hover:border-white/[0.1]' : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {/* Commit Details */}
                        <div className="min-w-0 space-y-0.5 flex-1">
                          <div className="flex items-center space-x-2 flex-wrap gap-y-0.5">
                            <span 
                              className="font-bold text-xs text-slate-100 tracking-tight truncate max-w-[280px] sm:max-w-md cursor-pointer hover:text-blue-300 transition-colors"
                              title={c.message}
                              onMouseEnter={(e) => handleHoverNode(e, c, commitLane)}
                              onMouseLeave={handleLeaveNode}
                            >
                              {c.message}
                            </span>
                            {c.refs && c.refs.map((ref) => (
                              <span 
                                key={ref} 
                                onMouseEnter={(e) => handleHoverNode(e, c, commitLane)}
                                onMouseLeave={handleLeaveNode}
                                className="text-[9px] font-mono px-1.5 py-0.2 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30 font-bold cursor-pointer"
                              >
                                {ref}
                              </span>
                            ))}
                          </div>

                          <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-mono">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-500" />
                              <span className="truncate max-w-[140px]">{c.author}</span>
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-500" />
                              <span>{c.date}</span>
                            </span>
                          </div>
                        </div>

                        {/* Right: Short SHA & Context 3-dots */}
                        <div className="flex items-center space-x-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopyHash(c.hash)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center space-x-1 shrink-0 transition-all cursor-pointer border ${
                              copiedHash === c.hash
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : isDark ? 'bg-[#22232a] border-white/[0.06] text-slate-400 hover:text-white hover:border-white/[0.12]' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                            }`}
                            title="Copiar hash SHA"
                          >
                            {copiedHash === c.hash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{c.shortHash}</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setContextMenu({ x: rect.right, y: rect.bottom, commit: c });
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                            title="Acciones de commit"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Compact List View */
              <div className="space-y-1.5">
                {commits.map((c, idx) => {
                  const isHead = idx === 0;
                  return (
                    <div
                      key={c.hash}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setContextMenu({ x: e.clientX, y: e.clientY, commit: c });
                      }}
                      className={`px-3 py-2 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                        isHead 
                          ? 'bg-blue-500/10 border-blue-500/30 shadow-xs' 
                          : isDark ? 'bg-[#181920]/60 border-white/[0.04] hover:bg-[#1f2029] hover:border-white/[0.1]' : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="min-w-0 space-y-0.5 flex-1">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-0.5">
                          <span className="font-bold text-xs text-slate-100 tracking-tight truncate max-w-md" title={c.message}>
                            {c.message}
                          </span>
                          {c.refs && c.refs.map((ref) => (
                            <span key={ref} className="text-[9px] font-mono px-1.5 py-0.2 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30 font-bold">
                              {ref}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-mono">
                          <span>{c.author}</span>
                          <span>•</span>
                          <span>{c.date}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopyHash(c.hash)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center space-x-1 shrink-0 transition-all cursor-pointer border ${
                            copiedHash === c.hash
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : isDark ? 'bg-[#22232a] border-white/[0.06] text-slate-400 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-600'
                          }`}
                        >
                          {copiedHash === c.hash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{c.shortHash}</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setContextMenu({ x: rect.right, y: rect.bottom, commit: c });
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination / Progressive Loading Button */}
            {commits.length < totalCommitsCount && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className={`px-4 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer inline-flex items-center space-x-2 ${
                    isDark 
                      ? 'bg-[#1f2026] border-white/[0.08] text-slate-300 hover:bg-[#252630] hover:text-white' 
                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  } ${isLoadingMore ? 'opacity-60 cursor-wait' : ''}`}
                >
                  {isLoadingMore ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-blue-400" />
                  )}
                  <span>
                    {isLoadingMore 
                      ? (language === 'es' ? 'Cargando commits...' : 'Loading commits...') 
                      : (language === 'es' ? `Cargar más commits (${commits.length} de ${totalCommitsCount})` : `Load more commits (${commits.length} of ${totalCommitsCount})`)}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* COLUMNA DERECHA (34% - 38% ancho): Cambios Pendientes & Commit */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 xl:col-span-4 pl-0 lg:pl-5 flex flex-col h-full min-h-0 overflow-hidden space-y-3 pt-4 lg:pt-0 border-t lg:border-t-0 border-white/[0.08]">
          <div className="space-y-3 flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Header with Global Actions */}
            <div className="flex items-center justify-between border-b pb-2.5 border-white/[0.08] shrink-0">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <h5 className="font-extrabold text-xs tracking-tight text-white">
                  {language === 'es' ? 'Cambios Pendientes' : 'Pending Changes'}
                </h5>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {stagedFiles.length + unstagedFiles.length}
                </span>
              </div>

              {/* Global Staging Action Buttons */}
              <div className="flex items-center space-x-1.5">
                {unstagedFiles.length > 0 && (
                  <button
                    type="button"
                    onClick={handleStageAll}
                    className="px-2 py-1 rounded-lg text-[10px] font-bold font-mono bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30 transition-colors flex items-center space-x-1 cursor-pointer"
                    title="Preparar todos los cambios (git add .)"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Stage All</span>
                  </button>
                )}

                {stagedFiles.length > 0 && (
                  <button
                    type="button"
                    onClick={handleUnstageAll}
                    className="px-2 py-1 rounded-lg text-[10px] font-bold font-mono bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 transition-colors flex items-center space-x-1 cursor-pointer"
                    title="Desmarcar todos del área de preparación"
                  >
                    <Minus className="w-3 h-3" />
                    <span>Unstage All</span>
                  </button>
                )}

                {unstagedFiles.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDiscardAll}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/15 transition-colors cursor-pointer"
                    title="Descartar todos los cambios sin preparar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Split List: Staged vs Unstaged */}
            <div className="space-y-3 flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
              {stagedFiles.length === 0 && unstagedFiles.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 font-mono">
                  {language === 'es' ? 'Árbol de trabajo limpio' : 'Working tree clean'}
                </div>
              ) : (
                <>
                  {/* Block 1: Staged Changes */}
                  {stagedFiles.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-bold uppercase font-mono tracking-wider text-emerald-400 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                          <span>{language === 'es' ? 'Preparados para Commit' : 'Staged Changes'}</span>
                          <span>({stagedFiles.length})</span>
                        </span>
                      </div>

                      <div className="space-y-1">
                        {stagedFiles.map((file) => {
                          let badgeColor = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
                          if (file.status === 'ADDED' || file.status === 'UNTRACKED') {
                            badgeColor = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
                          } else if (file.status === 'DELETED') {
                            badgeColor = 'bg-rose-500/15 text-rose-300 border-rose-500/30';
                          } else if (file.status === 'RENAMED') {
                            badgeColor = 'bg-blue-500/15 text-blue-300 border-blue-500/30';
                          }

                          return (
                            <div
                              key={`staged-${file.path}`}
                              onClick={() => setSelectedDiffFile(file)}
                              className={`group px-2.5 py-1.5 rounded-xl border text-xs font-mono flex items-center justify-between gap-2 transition-all cursor-pointer ${
                                isDark 
                                  ? 'bg-[#181920]/60 border-white/[0.04] hover:bg-[#20222a] hover:border-emerald-500/40' 
                                  : 'bg-white border-slate-200 hover:border-emerald-400'
                              }`}
                            >
                              <div className="flex items-center space-x-2 min-w-0">
                                <FileCode className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate text-slate-200 font-medium" title={file.path}>
                                  {file.path}
                                </span>
                              </div>

                              <div className="flex items-center space-x-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <span className={`text-[10px] font-bold font-mono px-1.5 py-0.2 rounded-md border ${badgeColor}`}>
                                  {file.letter || 'M'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUnstageFile(file.path)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-amber-500/20 transition-colors cursor-pointer"
                                  title="Unstage (Quitar de preparados)"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Block 2: Unstaged Changes */}
                  {unstagedFiles.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-bold uppercase font-mono tracking-wider text-amber-400 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                          <span>{language === 'es' ? 'Cambios Sin Preparar' : 'Changes'}</span>
                          <span>({unstagedFiles.length})</span>
                        </span>
                      </div>

                      <div className="space-y-1">
                        {unstagedFiles.map((file) => {
                          let badgeColor = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
                          if (file.status === 'ADDED' || file.status === 'UNTRACKED') {
                            badgeColor = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
                          } else if (file.status === 'DELETED') {
                            badgeColor = 'bg-rose-500/15 text-rose-300 border-rose-500/30';
                          } else if (file.status === 'RENAMED') {
                            badgeColor = 'bg-blue-500/15 text-blue-300 border-blue-500/30';
                          }

                          const isUntracked = file.status === 'UNTRACKED';

                          return (
                            <div
                              key={`unstaged-${file.path}`}
                              onClick={() => setSelectedDiffFile(file)}
                              className={`group px-2.5 py-1.5 rounded-xl border text-xs font-mono flex items-center justify-between gap-2 transition-all cursor-pointer ${
                                isDark 
                                  ? 'bg-[#181920]/60 border-white/[0.04] hover:bg-[#20222a] hover:border-amber-500/40' 
                                  : 'bg-white border-slate-200 hover:border-amber-400'
                              }`}
                            >
                              <div className="flex items-center space-x-2 min-w-0">
                                <FileCode className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate text-slate-300 font-medium" title={file.path}>
                                  {file.path}
                                </span>
                              </div>

                              <div className="flex items-center space-x-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <span className={`text-[10px] font-bold font-mono px-1.5 py-0.2 rounded-md border ${badgeColor}`}>
                                  {file.letter || (isUntracked ? '?' : 'M')}
                                </span>

                                {/* Stage Button */}
                                <button
                                  type="button"
                                  onClick={() => handleStageFile(file.path)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-emerald-300 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                                  title="Stage (Preparar archivo)"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>

                                {/* Discard Button */}
                                <button
                                  type="button"
                                  onClick={() => handleDiscardFile(file.path, isUntracked)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
                                  title="Descartar cambios en este archivo"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Flexible Commit Form */}
          <form onSubmit={handleCommit} className="space-y-2 pt-2.5 border-t border-white/[0.08] shrink-0">
            <div className="space-y-1">
              {/* Title Input & Char Count */}
              <div className="relative">
                <input
                  type="text"
                  value={commitTitle}
                  onChange={(e) => setCommitTitle(e.target.value)}
                  placeholder={language === 'es' ? 'Título del commit (50-72 caracteres)...' : 'Commit title (50-72 chars)...'}
                  disabled={isCommitting}
                  className={`w-full pl-3.5 pr-14 py-2 rounded-xl border text-xs outline-none transition-all ${
                    isDark 
                      ? 'bg-[#181920]/80 border-white/[0.08] text-white focus:border-emerald-500 placeholder:text-slate-500' 
                      : 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500 placeholder:text-slate-400'
                  }`}
                />
                <span className={`absolute right-3 top-2.5 text-[10px] font-mono select-none ${
                  commitTitle.length > 72 
                    ? 'text-rose-400 font-bold' 
                    : commitTitle.length > 50 
                    ? 'text-amber-400 font-bold' 
                    : 'text-slate-500'
                }`}>
                  {commitTitle.length}/72
                </span>
              </div>

              {/* Toggle Description Body Button */}
              <div className="flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={() => setShowBodyField(!showBodyField)}
                  className="text-[11px] text-slate-400 hover:text-emerald-400 flex items-center space-x-1 transition-colors cursor-pointer"
                >
                  <ChevronRight className={`w-3 h-3 transition-transform ${showBodyField ? 'rotate-90 text-emerald-400' : ''}`} />
                  <span>{showBodyField ? (language === 'es' ? 'Ocultar descripción' : 'Hide description') : (language === 'es' ? '+ Añadir descripción detallada' : '+ Add detailed description')}</span>
                </button>
              </div>

              {/* Expandable Body Textarea */}
              <AnimatePresence>
                {showBodyField && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <textarea
                      rows={3}
                      value={commitBody}
                      onChange={(e) => setCommitBody(e.target.value)}
                      placeholder={language === 'es' ? 'Descripción detallada opcional (justificación, notas de release)...' : 'Optional detailed description (context, notes)...'}
                      disabled={isCommitting}
                      className={`w-full px-3 py-2 rounded-xl border text-xs outline-none transition-all resize-none custom-scrollbar ${
                        isDark 
                          ? 'bg-[#14151a] border-white/[0.06] text-white focus:border-emerald-500 placeholder:text-slate-500' 
                          : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500 placeholder:text-slate-400'
                      }`}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Validation Notice when Disabled */}
            {!canCommit && (
              <div className="flex items-center space-x-1.5 px-1 text-[11px] text-slate-500 font-medium">
                <Info className="w-3.5 h-3.5 shrink-0 opacity-70" />
                <span className="truncate">
                  {stagedFiles.length === 0 
                    ? (language === 'es' ? 'Prepara archivos (Stage) para poder hacer commit.' : 'Stage files to enable commit.') 
                    : (language === 'es' ? 'Escribe un título para el commit.' : 'Write a title to enable commit.')}
                </span>
              </div>
            )}

            {/* Submit Commit Button */}
            <button
              type="submit"
              disabled={!canCommit}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-35 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-sm"
            >
              <GitCommit className={`w-3.5 h-3.5 ${isCommitting ? 'animate-spin' : ''}`} />
              <span>
                {isCommitting 
                  ? (language === 'es' ? 'Guardando Commit...' : 'Saving Commit...') 
                  : (language === 'es' ? `Hacer Commit (${stagedFiles.length})` : `Commit Changes (${stagedFiles.length})`)}
              </span>
            </button>
          </form>
        </div>
      </div>

      {/* 1. Diff Preview Modal */}
      <GitDiffModal
        isOpen={Boolean(selectedDiffFile)}
        onClose={() => setSelectedDiffFile(null)}
        file={selectedDiffFile}
        folderPath={folderPath}
        theme={theme}
        language={language}
        onStageChange={loadGitData}
      />

      {/* 2. Context Menu on Commits */}
      <GitContextMenu
        menu={contextMenu}
        onClose={() => setContextMenu(null)}
        onCheckout={handleContextCheckout}
        onCreateBranch={(commit) => setBranchCreateCommit(commit)}
        onCopySha={handleCopyHash}
        onRevert={handleRevertCommit}
        theme={theme}
        language={language}
      />

      {/* 3. Create Branch Modal */}
      <GitBranchCreateModal
        isOpen={Boolean(branchCreateCommit)}
        onClose={() => setBranchCreateCommit(null)}
        commit={branchCreateCommit}
        onSubmit={handleCreateBranchSubmit}
        theme={theme}
        language={language}
      />

      {/* 4. Contextual Commit Hover Card */}
      <GitCommitHoverCard
        hoverInfo={hoverCardInfo}
        theme={theme}
        onCopySha={handleCopyHash}
      />
    </div>
  );
}
