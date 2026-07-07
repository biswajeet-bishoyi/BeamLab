
import React from 'react';
import { FolderTree, Component, Box, Activity, FileText, Bookmark } from 'lucide-react';

export const ProjectExplorer: React.FC = () => {
  const items = [
    { icon: FolderTree, label: 'Overview' },
    { icon: Component, label: 'Materials' },
    { icon: Box, label: 'Sections' },
    { icon: Activity, label: 'Loads & Supports' },
    { icon: FileText, label: 'Results' },
    { icon: Bookmark, label: 'Reports' },
  ];

  return (
    <div className="flex flex-col h-full bg-app border-r border-subtle overflow-y-auto overflow-x-hidden p-2">
      <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 px-2 pt-2">Project Explorer</div>
      <div className="space-y-0.5">
        {items.map((item, idx) => (
          <button 
            key={idx}
            className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-primary hover:bg-panel rounded-md transition-colors text-left focus:outline-none focus:bg-panel"
          >
            <item.icon className="w-4 h-4 text-muted" />
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
