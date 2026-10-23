import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  FileCode, 
  Copy, 
  Check, 
  Columns, 
  AlignJustify, 
  Plus, 
  Minus, 
  RefreshCw,
  ArrowRight,
  Maximize2
} from 'lucide-react';

export function parseUnifiedDiff(diffText) {
  if (!diffText || !diffText.trim()) return [];

  const lines = diffText.split(/\r?\n/);
  const hunks = [];
  let currentHunk = null;
  let oldLine = 0;
  let newLine = 0;

  for (const line of lines) {
    if (line.startsWith('@@')) {
      const match = line.match(/@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@(.*)/);
      if (match) {
        oldLine = parseInt(match[1], 10);
        newLine = parseInt(match[2], 10);
      }
      currentHunk = {
        header: line,
        lines: []
      };
      hunks.push(currentHunk);
    } else if (currentHunk) {
      if (line.startsWith('+')) {
        currentHunk.lines.push({
          type: 'add',
          oldLineNumber: null,
          newLineNumber: newLine++,
          content: line.substring(1)
        });
      } else if (line.startsWith('-')) {
        currentHunk.lines.push({
          type: 'del',
          oldLineNumber: oldLine++,
          newLineNumber: null,
          content: line.substring(1)
        });
      } else if (line.startsWith(' ')) {
        currentHunk.lines.push({
          type: 'normal',
          oldLineNumber: oldLine++,
          newLineNumber: newLine++,
          content: line.substring(1)
        });
      } else if (line.startsWith('\\ No newline')) {
        currentHunk.lines.push({
          type: 'meta',
          oldLineNumber: null,
          newLineNumber: null,
          content: line
        });
      }
    }
  }

  return hunks;
}

export function buildSideBySideLines(hunkLines) {
  const pairs = [];
  let i = 0;
  while (i < hunkLines.length) {
    const item = hunkLines[i];
    if (item.type === 'normal') {
      pairs.push({ left: item, right: item });
      i++;
    } else if (item.type === 'del') {
      const delGroup = [];
      while (i < hunkLines.length && hunkLines[i].type === 'del') {
        delGroup.push(hunkLines[i]);
        i++;
      }
      const addGroup = [];
      while (i < hunkLines.length && hunkLines[i].type === 'add') {
        addGroup.push(hunkLines[i]);
        i++;
      }
      const maxLen = Math.max(delGroup.length, addGroup.length);
      for (let j = 0; j < maxLen; j++) {
        pairs.push({
          left: delGroup[j] || null,
          right: addGroup[j] || null
        });
      }
    } else if (item.type === 'add') {
      pairs.push({ left: null, right: item });
      i++;
    } else {
      pairs.push({ left: item, right: item });
      i++;
    }
  }
  return pairs;
}

export default function GitDiffModal({
  isOpen,
  onClose,
  file,
  folderPath,
  theme = 'dark',
  language = 'es',
  onStageChange
}) {
  const isDark = theme === 'dark';
  const [diffMode, setDiffMode] = useState('inline'); // 'inline' | 'split'
  const [diffData, setDiffData] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isTogglingStage, setIsTogglingStage] = useState(false);

  useEffect(() => {
    if (!isOpen || !file || !folderPath) return;

    let isMounted = true;
    setIsLoading(true);

    const fetchDiff = async () => {
      try {
        if (window.electronAPI?.git?.getDiff) {
          const res = await window.electronAPI.git.getDiff(folderPath, file.path, Boolean(file.isStaged));
          if (isMounted) {
            setDiffData(res?.diff || '');
          }
        }
      } catch (err) {
        console.error('Error fetching git diff:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchDiff();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      isMounted = false;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, file, folderPath]);

  if (!isOpen || !file) return null;

  const hunks = parseUnifiedDiff(diffData);

  const handleCopyDiff = () => {
    navigator.clipboard.writeText(diffData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleStage = async () => {
    if (isTogglingStage || !window.electronAPI?.git) return;
    setIsTogglingStage(true);
    try {
      if (file.isStaged) {
        await window.electronAPI.git.unstageFile?.(folderPath, file.path);
      } else {
        await window.electronAPI.git.stageFile?.(folderPath, file.path);
      }
      if (onStageChange) await onStageChange();
      // Re-fetch diff with new staged state
      const res = await window.electronAPI.git.getDiff(folderPath, file.path, !file.isStaged);
      setDiffData(res?.diff || '');
      file.isStaged = !file.isStaged;
    } catch (err) {
      console.error('Error toggling staging in diff modal:', err);
    } finally {
      setIsTogglingStage(false);
    }
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md select-none font-sans"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-5xl h-[88vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
            isDark ? 'bg-[#131418] border-white/[0.1] text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Header */}
          <div className={`px-5 py-3.5 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${
            isDark ? 'bg-[#181920] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
          }`}>
            {/* File Info */}
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
                <FileCode className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-sm tracking-tight truncate max-w-sm sm:max-w-md">
                    {file.path.split('/').pop() || file.path}
                  </span>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    file.isStaged 
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  }`}>
                    {file.isStaged ? 'STAGED' : 'CHANGES'}
                  </span>
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md border ${
                    file.status === 'ADDED' || file.status === 'UNTRACKED'
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : file.status === 'DELETED'
                      ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                      : file.status === 'RENAMED'
                      ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  }`}>
                    {file.letter || 'M'}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-slate-400 truncate max-w-md">{file.path}</p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center space-x-2">
              {/* Diff Mode Toggle: Inline vs Split */}
              <div className={`p-1 rounded-xl border flex items-center space-x-1 ${
                isDark ? 'bg-[#1f2028] border-white/[0.08]' : 'bg-slate-200/70 border-slate-300'
              }`}>
                <button
                  type="button"
                  onClick={() => setDiffMode('inline')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all cursor-pointer ${
                    diffMode === 'inline'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Vista Unificada (Inline)"
                >
                  <AlignJustify className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Inline</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDiffMode('split')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all cursor-pointer ${
                    diffMode === 'split'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Vista Dividida (Side-by-side)"
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Side-by-side</span>
                </button>
              </div>

              {/* Toggle Stage Button */}
              <button
                type="button"
                onClick={handleToggleStage}
                disabled={isTogglingStage}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold font-mono flex items-center space-x-1.5 transition-all cursor-pointer ${
                  file.isStaged
                    ? isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20' : 'bg-amber-50 border-amber-300 text-amber-800'
                    : isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20' : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                } ${isTogglingStage ? 'opacity-60 cursor-wait' : ''}`}
              >
                {file.isStaged ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                <span>{file.isStaged ? (language === 'es' ? 'Unstage' : 'Unstage') : (language === 'es' ? 'Stage' : 'Stage')}</span>
              </button>

              {/* Copy Raw Diff */}
              <button
                type="button"
                onClick={handleCopyDiff}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  copied
                    ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                    : isDark ? 'bg-[#1f2028] border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/5' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
                title="Copiar diff al portapapeles"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  isDark ? 'bg-[#1f2028] border-white/[0.08] text-slate-400 hover:text-white hover:bg-rose-500/20 hover:border-rose-500/30 hover:text-rose-300' : 'bg-white border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600'
                }`}
                title="Cerrar (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-auto custom-scrollbar p-0 bg-[#0e0f12] font-mono text-xs select-text">
            {isLoading ? (
              <div className="py-24 flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
                <span className="text-slate-400 text-xs">
                  {language === 'es' ? 'Generando vista previa de cambios...' : 'Generating diff preview...'}
                </span>
              </div>
            ) : !diffData.trim() ? (
              <div className="py-24 flex flex-col items-center justify-center space-y-2 text-slate-500">
                <FileCode className="w-8 h-8 opacity-40" />
                <p>{language === 'es' ? 'No se detectaron cambios textuales en este archivo.' : 'No textual changes detected in this file.'}</p>
                <span className="text-[11px] text-slate-600">
                  {language === 'es' ? '(Puede ser un archivo binario o los cambios ya están comprometidos)' : '(Could be a binary file or changes are already committed)'}
                </span>
              </div>
            ) : hunks.length === 0 ? (
              <div className="p-6 text-slate-300 whitespace-pre font-mono">
                {diffData}
              </div>
            ) : diffMode === 'inline' ? (
              /* Inline View */
              <div className="divide-y divide-white/[0.04]">
                {hunks.map((hunk, hIdx) => (
                  <div key={hIdx} className="space-y-0">
                    {/* Hunk Header */}
                    <div className="px-4 py-1.5 bg-[#171a26] text-blue-300/80 font-bold text-[11px] border-y border-blue-500/20 flex items-center space-x-2">
                      <span className="text-blue-400">@@</span>
                      <span>{hunk.header.replace(/^@@\s+/, '').replace(/\s+@@/, '')}</span>
                    </div>

                    {/* Hunk Lines */}
                    {hunk.lines.map((l, lIdx) => {
                      const isAdd = l.type === 'add';
                      const isDel = l.type === 'del';
                      const isMeta = l.type === 'meta';

                      return (
                        <div
                          key={lIdx}
                          className={`flex items-stretch hover:brightness-110 transition-colors leading-relaxed ${
                            isAdd
                              ? 'bg-emerald-950/25 text-emerald-200'
                              : isDel
                              ? 'bg-rose-950/25 text-rose-200'
                              : isMeta
                              ? 'bg-slate-900/50 text-slate-400 italic'
                              : 'text-slate-300 hover:bg-white/[0.02]'
                          }`}
                        >
                          {/* Line numbers */}
                          <div className="w-12 px-2 py-0.5 text-right select-none text-slate-600 border-r border-white/[0.06] shrink-0 text-[11px]">
                            {l.oldLineNumber || ''}
                          </div>
                          <div className="w-12 px-2 py-0.5 text-right select-none text-slate-600 border-r border-white/[0.06] shrink-0 text-[11px]">
                            {l.newLineNumber || ''}
                          </div>

                          {/* Marker (+, -, space) */}
                          <div className={`w-6 px-1.5 py-0.5 select-none font-bold text-center shrink-0 ${
                            isAdd ? 'text-emerald-400' : isDel ? 'text-rose-400' : 'text-slate-600'
                          }`}>
                            {isAdd ? '+' : isDel ? '-' : ' '}
                          </div>

                          {/* Code Content */}
                          <div className="flex-1 px-2 py-0.5 whitespace-pre overflow-x-auto">
                            {l.content}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ) : (
              /* Side-by-side (Split) View */
              <div className="divide-y divide-white/[0.04]">
                {hunks.map((hunk, hIdx) => {
                  const pairs = buildSideBySideLines(hunk.lines);
                  return (
                    <div key={hIdx} className="space-y-0">
                      {/* Hunk Header */}
                      <div className="px-4 py-1.5 bg-[#171a26] text-blue-300/80 font-bold text-[11px] border-y border-blue-500/20 flex items-center space-x-2">
                        <span className="text-blue-400">@@</span>
                        <span>{hunk.header.replace(/^@@\s+/, '').replace(/\s+@@/, '')}</span>
                      </div>

                      {/* Split Rows */}
                      {pairs.map((pair, pIdx) => {
                        const left = pair.left;
                        const right = pair.right;

                        return (
                          <div key={pIdx} className="grid grid-cols-2 divide-x divide-white/[0.08] hover:brightness-110 leading-relaxed">
                            {/* Left Pane (Old / Deletion) */}
                            <div className={`flex items-stretch ${
                              left?.type === 'del' ? 'bg-rose-950/25 text-rose-200' : left?.type === 'normal' ? 'text-slate-300' : 'bg-white/[0.01]'
                            }`}>
                              <div className="w-11 px-2 py-0.5 text-right select-none text-slate-600 border-r border-white/[0.06] shrink-0 text-[11px]">
                                {left?.oldLineNumber || ''}
                              </div>
                              <div className="w-5 px-1 py-0.5 select-none font-bold text-center shrink-0 text-rose-400">
                                {left?.type === 'del' ? '-' : ' '}
                              </div>
                              <div className="flex-1 px-2 py-0.5 whitespace-pre overflow-x-auto">
                                {left?.content || ''}
                              </div>
                            </div>

                            {/* Right Pane (New / Addition) */}
                            <div className={`flex items-stretch ${
                              right?.type === 'add' ? 'bg-emerald-950/25 text-emerald-200' : right?.type === 'normal' ? 'text-slate-300' : 'bg-white/[0.01]'
                            }`}>
                              <div className="w-11 px-2 py-0.5 text-right select-none text-slate-600 border-r border-white/[0.06] shrink-0 text-[11px]">
                                {right?.newLineNumber || ''}
                              </div>
                              <div className="w-5 px-1 py-0.5 select-none font-bold text-center shrink-0 text-emerald-400">
                                {right?.type === 'add' ? '+' : ' '}
                              </div>
                              <div className="flex-1 px-2 py-0.5 whitespace-pre overflow-x-auto">
                                {right?.content || ''}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
