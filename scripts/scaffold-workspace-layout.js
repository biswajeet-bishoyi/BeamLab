const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const WEB_SRC = path.join(ROOT_DIR, 'apps/web/src');

const DIRS = [
  'store',
  'hooks',
  'layouts'
];

DIRS.forEach(dir => {
  const fullPath = path.join(WEB_SRC, dir);
  if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
});

// 1. Workspace Store (Zustand with Persist)
fs.writeFileSync(path.join(WEB_SRC, 'store/workspace.ts'), `
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WorkspaceState {
  leftPanelCollapsed: boolean;
  leftPanelSize: number;
  rightPanelCollapsed: boolean;
  rightPanelSize: number;
  activeArchieTab: string;
  theme: 'light' | 'dark' | 'system';
  setLeftPanelCollapsed: (collapsed: boolean) => void;
  setLeftPanelSize: (size: number) => void;
  setRightPanelCollapsed: (collapsed: boolean) => void;
  setRightPanelSize: (size: number) => void;
  setActiveArchieTab: (tab: string) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      leftPanelCollapsed: false,
      leftPanelSize: 20,
      rightPanelCollapsed: false,
      rightPanelSize: 25,
      activeArchieTab: 'chat',
      theme: 'system',
      setLeftPanelCollapsed: (collapsed) => set({ leftPanelCollapsed: collapsed }),
      setLeftPanelSize: (size) => set({ leftPanelSize: size }),
      setRightPanelCollapsed: (collapsed) => set({ rightPanelCollapsed: collapsed }),
      setRightPanelSize: (size) => set({ rightPanelSize: size }),
      setActiveArchieTab: (tab) => set({ activeArchieTab: tab }),
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'beamlab-workspace-storage' }
  )
);
`);

// 2. Keyboard Shortcuts Hook
fs.writeFileSync(path.join(WEB_SRC, 'hooks/useKeyboardShortcuts.ts'), `
import { useEffect } from 'react';
import { useWorkspaceStore } from '../store/workspace';

export function useKeyboardShortcuts() {
  const { 
    leftPanelCollapsed, setLeftPanelCollapsed, 
    rightPanelCollapsed, setRightPanelCollapsed 
  } = useWorkspaceStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+B or Cmd+B: Toggle Left Panel
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setLeftPanelCollapsed(!leftPanelCollapsed);
      }
      // Ctrl+J or Cmd+J: Toggle Right Panel (Archie)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setRightPanelCollapsed(!rightPanelCollapsed);
      }
      // Ctrl+K or Cmd+K: Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        console.log('Command Palette triggered');
        // TODO: Open Command Palette Dialog
      }
      // Ctrl+/ or Cmd+/: Search
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        console.log('Global Search triggered');
        // TODO: Focus search input
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [leftPanelCollapsed, rightPanelCollapsed, setLeftPanelCollapsed, setRightPanelCollapsed]);
}
`);

// 3. Top Navigation
fs.writeFileSync(path.join(WEB_SRC, 'layouts/TopNav.tsx'), `
import React from 'react';
import { Layers, Search, Bell, Settings, User } from 'lucide-react';
import { Button } from '@beamworks/design-system';

export const TopNav: React.FC = () => {
  return (
    <header className="h-14 border-b border-subtle bg-panel flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-accent font-bold text-lg">
          <Layers className="w-6 h-6" />
          <span>BeamLab</span>
        </div>
        <div className="h-6 w-px bg-subtle mx-2" />
        <span className="text-sm text-primary font-medium">New Project</span>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="relative group hidden md:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input 
            type="text" 
            placeholder="Search (Ctrl+/)" 
            className="h-8 bg-app border border-subtle rounded-md pl-9 pr-3 text-sm text-primary w-64 focus:outline-none focus:border-accent"
          />
        </div>
        <Button variant="ghost" size="icon" className="text-muted hover:text-primary"><Bell className="w-4 h-4" /></Button>
        <Button variant="ghost" size="icon" className="text-muted hover:text-primary"><Settings className="w-4 h-4" /></Button>
        <Button variant="ghost" size="icon" className="text-muted hover:text-primary"><User className="w-4 h-4" /></Button>
      </div>
    </header>
  );
};
`);

// 4. Status Bar
fs.writeFileSync(path.join(WEB_SRC, 'layouts/StatusBar.tsx'), `
import React from 'react';
import { CheckCircle2, Cpu, GitBranch, Share2 } from 'lucide-react';

export const StatusBar: React.FC = () => {
  return (
    <footer className="h-8 border-t border-subtle bg-panel flex items-center justify-between px-3 text-xs text-muted shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 hover:text-primary cursor-pointer transition-colors">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
          <span>Ready</span>
        </div>
        <div className="flex items-center gap-1.5 hover:text-primary cursor-pointer transition-colors">
          <GitBranch className="w-3.5 h-3.5" />
          <span>main</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5" />
          <span>124 MB</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Share2 className="w-3.5 h-3.5" />
          <span>Runtime: Connected</span>
        </div>
        <div>
          <span>Metric (m, kN, MPa)</span>
        </div>
      </div>
    </footer>
  );
};
`);

// 5. Project Explorer
fs.writeFileSync(path.join(WEB_SRC, 'layouts/ProjectExplorer.tsx'), `
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
`);

// 6. Archie Sidebar
fs.writeFileSync(path.join(WEB_SRC, 'layouts/ArchieSidebar.tsx'), `
import React from 'react';
import { useWorkspaceStore } from '../store/workspace';
import { MessageSquare, ListTodo, PlayCircle, Database, History } from 'lucide-react';
import { ChatBubble } from '@beamworks/design-system';

export const ArchieSidebar: React.FC = () => {
  const { activeArchieTab, setActiveArchieTab } = useWorkspaceStore();

  const tabs = [
    { id: 'chat', icon: MessageSquare, label: 'Chat' },
    { id: 'plan', icon: ListTodo, label: 'Plan' },
    { id: 'exec', icon: PlayCircle, label: 'Execution' },
    { id: 'ctx', icon: Database, label: 'Context' },
    { id: 'hist', icon: History, label: 'History' },
  ];

  return (
    <div className="flex flex-col h-full bg-app border-l border-subtle overflow-hidden">
      {/* Archie Tabs */}
      <div className="flex items-center border-b border-subtle bg-panel overflow-x-auto shrink-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveArchieTab(tab.id)}
            className={\`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap \${
              activeArchieTab === tab.id 
                ? 'border-accent text-accent' 
                : 'border-transparent text-muted hover:text-primary'
            }\`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Archie Content Placeholder */}
      <div className="flex-1 p-4 overflow-y-auto">
        {activeArchieTab === 'chat' && (
          <div className="flex flex-col h-full">
            <div className="flex-1">
              <ChatBubble role="assistant" content="Hello! I'm Archie. How can I help you design this structure today?" />
              <ChatBubble role="user" content="I need to verify the steel beams on the second floor." />
              <ChatBubble role="assistant" content="I can help with that. Are we using Metric or Imperial sections for this project?" />
            </div>
            <div className="mt-4">
              <input 
                type="text" 
                placeholder="Ask Archie... (Press Enter)" 
                className="w-full bg-panel border border-subtle rounded-md px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent"
              />
            </div>
          </div>
        )}
        {activeArchieTab !== 'chat' && (
          <div className="flex items-center justify-center h-full text-sm text-muted">
            Placeholder for {tabs.find(t => t.id === activeArchieTab)?.label}
          </div>
        )}
      </div>
    </div>
  );
};
`);

// 7. Center Workspace
fs.writeFileSync(path.join(WEB_SRC, 'layouts/CenterWorkspace.tsx'), `
import React from 'react';
import { MousePointer2, Maximize } from 'lucide-react';

export const CenterWorkspace: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-[#111111] relative overflow-hidden">
      {/* Mock Viewport Tools */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
        <button className="w-8 h-8 bg-panel border border-subtle rounded flex items-center justify-center text-primary shadow-sm hover:bg-subtle transition-colors">
          <MousePointer2 className="w-4 h-4" />
        </button>
        <button className="w-8 h-8 bg-panel border border-subtle rounded flex items-center justify-center text-muted hover:text-primary shadow-sm hover:bg-subtle transition-colors">
          <Maximize className="w-4 h-4" />
        </button>
      </div>

      {/* Mock Canvas Content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-muted select-none">
          <p className="text-lg font-medium mb-2 text-primary">Engineering Canvas</p>
          <p className="text-sm max-w-xs mx-auto">This area will host the 3D viewer and 2D diagramming canvas.</p>
        </div>
      </div>
    </div>
  );
};
`);

// 8. Main Workspace Layout
fs.writeFileSync(path.join(WEB_SRC, 'layouts/WorkspaceLayout.tsx'), `
import React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useWorkspaceStore } from '../store/workspace';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { TopNav } from './TopNav';
import { StatusBar } from './StatusBar';
import { ProjectExplorer } from './ProjectExplorer';
import { ArchieSidebar } from './ArchieSidebar';
import { CenterWorkspace } from './CenterWorkspace';

export const WorkspaceLayout: React.FC = () => {
  useKeyboardShortcuts();

  const { 
    leftPanelCollapsed, leftPanelSize, setLeftPanelSize, setLeftPanelCollapsed,
    rightPanelCollapsed, rightPanelSize, setRightPanelSize, setRightPanelCollapsed
  } = useWorkspaceStore();

  return (
    <div className="flex flex-col h-screen w-screen bg-app text-primary overflow-hidden">
      <TopNav />
      
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal">
          
          {/* Left Panel: Project Explorer */}
          {!leftPanelCollapsed && (
            <>
              <Panel 
                defaultSize={leftPanelSize} 
                minSize={15} 
                maxSize={40}
                onResize={setLeftPanelSize}
                onCollapse={() => setLeftPanelCollapsed(true)}
                collapsible={true}
                className="transition-all duration-200 ease-in-out"
              >
                <ProjectExplorer />
              </Panel>
              <PanelResizeHandle className="w-1 bg-subtle hover:bg-accent hover:w-1.5 transition-all active:bg-accent cursor-col-resize z-10" />
            </>
          )}

          {/* Center: Engineering Workspace */}
          <Panel minSize={30}>
            <CenterWorkspace />
          </Panel>

          {/* Right Panel: Archie Workspace */}
          {!rightPanelCollapsed && (
            <>
              <PanelResizeHandle className="w-1 bg-subtle hover:bg-accent hover:w-1.5 transition-all active:bg-accent cursor-col-resize z-10" />
              <Panel 
                defaultSize={rightPanelSize} 
                minSize={20} 
                maxSize={50}
                onResize={setRightPanelSize}
                onCollapse={() => setRightPanelCollapsed(true)}
                collapsible={true}
                className="transition-all duration-200 ease-in-out"
              >
                <ArchieSidebar />
              </Panel>
            </>
          )}

        </PanelGroup>
      </div>

      <StatusBar />
    </div>
  );
};
`);

// 9. App.tsx with Router setup
fs.writeFileSync(path.join(WEB_SRC, 'App.tsx'), `
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WorkspaceLayout } from './layouts/WorkspaceLayout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/workspace" replace />} />
        <Route path="/workspace" element={<WorkspaceLayout />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
`);

console.log('Workspace Layout scaffolded successfully!');
