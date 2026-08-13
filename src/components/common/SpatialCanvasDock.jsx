import React, { useState } from 'react';
import { Square, Minus, MoveRight, PlusCircle, Database, LayoutGrid } from 'lucide-react';

export default function SpatialCanvasDock({ onSelectTool, onAddProjectNode, onAddDatabaseNode }) {
  const [activeTool, setActiveTool] = useState('select');

  const tools = [
    { id: 'rectangle', label: 'Rectangle', icon: Square, key: 'R' },
    { id: 'line', label: 'Line', icon: Minus, key: 'L' },
    { id: 'arrow', label: 'Arrow', icon: MoveRight, key: 'Shift+L' },
    { id: 'project-node', label: 'Project Node', icon: PlusCircle, key: 'N' },
    { id: 'db-node', label: 'DB Node', icon: Database, key: 'D' },
  ];

  const handleToolClick = (tool) => {
    setActiveTool(tool.id);
    if (tool.id === 'project-node') onAddProjectNode();
    if (tool.id === 'db-node') onAddDatabaseNode();
    if (onSelectTool) onSelectTool(tool.id);
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 spatial-dock px-4 py-2.5 flex items-center space-x-2">
      <div className="flex items-center space-x-1 border-r border-white/10 pr-2 mr-1">
        <div className="w-7 h-7 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
          <LayoutGrid className="h-4 w-4" />
        </div>
      </div>

      {tools.map((tool) => {
        const Icon = tool.icon;
        const isActive = activeTool === tool.id;
        return (
          <button
            key={tool.id}
            onClick={() => handleToolClick(tool)}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
              isActive
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40 glow-azure'
                : 'text-slate-300 hover:bg-white/[0.08] hover:text-white'
            }`}
            title={`${tool.label} (${tool.key})`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{tool.label}</span>
            <kbd className="hotkey-badge ml-1">{tool.key}</kbd>
          </button>
        );
      })}
    </div>
  );
}
