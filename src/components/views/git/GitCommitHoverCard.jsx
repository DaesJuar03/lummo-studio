import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitCommit, User, Clock, Copy, Check, Tag, GitBranch } from 'lucide-react';
import { getLaneColor } from './GitGraphRenderer';

export default function GitCommitHoverCard({
  hoverInfo,
  theme = 'dark',
  onCopySha
}) {
  const [copied, setCopied] = useState(false);

  if (!hoverInfo || !hoverInfo.commit) return null;

  const { commit, x, y, lane } = hoverInfo;
  const isDark = theme === 'dark';
  const color = getLaneColor(lane ?? 0);

  // Smart placement to prevent overflow
  const cardWidth = 320;
  const cardHeight = 220;
  
  let posX = x + 18;
  if (posX + cardWidth > window.innerWidth - 12) {
    posX = Math.max(12, x - cardWidth - 18);
  }

  let posY = y - 30;
  if (posY + cardHeight > window.innerHeight - 12) {
    posY = Math.max(12, window.innerHeight - cardHeight - 12);
  }
  if (posY < 12) posY = 12;

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(commit.hash);
    setCopied(true);
    onCopySha?.(commit.hash);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 4 }}
        transition={{ duration: 0.12, ease: 'easeOut' }}
        style={{ left: `${posX}px`, top: `${posY}px` }}
        className={`fixed z-50 w-80 rounded-2xl border shadow-2xl p-3.5 space-y-2.5 font-sans text-xs select-none pointer-events-auto backdrop-blur-xl ${
          isDark 
            ? 'bg-[#15161b]/95 border-white/[0.12] text-white shadow-black/80' 
            : 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-400/40'
        }`}
      >
        {/* Header: Branch Color Pill, Short Hash & Copy Button */}
        <div className="flex items-center justify-between border-b pb-2 border-white/[0.08]">
          <div className="flex items-center space-x-2 min-w-0">
            <span 
              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" 
              style={{ backgroundColor: color.stroke }} 
            />
            <span className="font-mono text-xs font-bold text-slate-200">
              {commit.shortHash}
            </span>
            {commit.refs && commit.refs.length > 0 && (
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30 truncate max-w-[120px]">
                {commit.refs[0]}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className={`p-1 rounded-lg border text-[10px] font-mono transition-colors cursor-pointer flex items-center space-x-1 ${
              copied
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : isDark ? 'bg-white/5 border-white/[0.08] text-slate-400 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-600'
            }`}
            title="Copiar Hash SHA"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>SHA</span>
          </button>
        </div>

        {/* Commit Message Title & Body */}
        <div className="space-y-1">
          <h5 className="font-bold text-xs text-slate-100 leading-snug">
            {commit.message}
          </h5>
          {commit.refs && commit.refs.length > 1 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {commit.refs.slice(1).map((ref) => (
                <span 
                  key={ref} 
                  className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 font-bold"
                >
                  {ref}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Metadata Details */}
        <div className="space-y-1 text-[11px] font-mono text-slate-400 pt-1 border-t border-white/[0.06]">
          <div className="flex items-center space-x-2">
            <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate text-slate-300">{commit.author}</span>
            {commit.email && (
              <span className="text-slate-500 truncate text-[10px]">&lt;{commit.email}&gt;</span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="text-slate-300">{commit.date}</span>
          </div>
        </div>

        {/* Footer Interaction Tips */}
        <div className="pt-1 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span>Click: aislar rama</span>
          <span>•</span>
          <span>Clic derecho: opciones</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
