
import React from 'react';
import { FolderTree, Component, Box, Activity, FileText, Bookmark, PanelLeftClose } from 'lucide-react';
import { useWorkspaceStore } from '../store/workspace';

export const ProjectExplorer: React.FC = () => {
  const setLeftPanelCollapsed = useWorkspaceStore(state => state.setLeftPanelCollapsed);
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
      <div className="flex items-center justify-between mb-2 px-2 pt-2">
        <div className="text-xs font-semibold text-muted uppercase tracking-wider">Project Explorer</div>
        <button
          onClick={() => setLeftPanelCollapsed(true)}
          className="p-1 rounded-md hover:bg-panel text-muted hover:text-primary transition-colors"
          title="Collapse Explorer ( [ )"
        >
          <PanelLeftClose className="w-3.5 h-3.5" />
        </button>
      </div>
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
