import React from 'react';
import { motion } from 'framer-motion';

export default function PortsTab({ theme, t }) {
  const isDark = theme === 'dark';

  return (
    <motion.div initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }} className="space-y-6">
      <div className={`border-b pb-4 ${isDark ? 'border-white/[0.08]' : 'border-slate-100'}`}>
        <h4 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.defaultPorts}</h4>
        <p className="text-xs text-slate-400">{t.defaultPortsDesc || 'Default port mapping to prevent local conflicts'}</p>
      </div>

      <div className="space-y-3 font-mono text-xs">
        <div className={`flex items-center justify-between p-3.5 rounded-xl border ${
          isDark ? 'bg-[#1E1E1E] border-white/[0.08] text-[#E5E5E5]' : 'bg-slate-50 border-slate-200'
        }`}>
          <span>Vite / React Dev Server</span>
          <span className="font-bold text-blue-400">:5173</span>
        </div>
        <div className={`flex items-center justify-between p-3.5 rounded-xl border ${
          isDark ? 'bg-[#1E1E1E] border-white/[0.08] text-[#E5E5E5]' : 'bg-slate-50 border-slate-200'
        }`}>
          <span>Next.js App Router</span>
          <span className="font-bold text-blue-400">:3000</span>
        </div>
        <div className={`flex items-center justify-between p-3.5 rounded-xl border ${
          isDark ? 'bg-[#1E1E1E] border-white/[0.08] text-[#E5E5E5]' : 'bg-slate-50 border-slate-200'
        }`}>
          <span>Express / Node API</span>
          <span className="font-bold text-blue-400">:8080</span>
        </div>
        <div className={`flex items-center justify-between p-3.5 rounded-xl border ${
          isDark ? 'bg-[#1E1E1E] border-white/[0.08] text-[#E5E5E5]' : 'bg-slate-50 border-slate-200'
        }`}>
          <span>PHP Artisan Serve</span>
          <span className="font-bold text-blue-400">:8000</span>
        </div>
      </div>
    </motion.div>
  );
}
