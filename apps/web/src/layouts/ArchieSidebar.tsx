import React, { useMemo } from 'react';
import { useWorkspaceStore } from '../store/workspace';
import { MessageSquare, ListTodo, PlayCircle, Database, History, PanelRightClose, Sparkles } from 'lucide-react';
import { ArchieProvider, ArchieClient, LocalRuntimeTransport } from '@beamstudio/archie-client';
import { ChatTab } from '../features/archie/ChatTab';
import { PlanTab } from '../features/archie/PlanTab';
import { ExecutionGraphTab } from '../features/execution-graph/components/ExecutionGraphTab';
import { ContextTab } from '../features/archie/ContextTab';
import { HistoryTab } from '../features/archie/HistoryTab';
import { TimelinePanel } from '../features/timeline/components/TimelinePanel';

export const ArchieSidebar: React.FC = () => {
  const { activeArchieTab, setActiveArchieTab, setRightPanelCollapsed } = useWorkspaceStore();
  
  // Instantiate the client once per session
  const client = useMemo(() => {
    const transport = new LocalRuntimeTransport();
    return new ArchieClient(transport);
  }, []);

  const tabs = [
    { id: 'chat', icon: MessageSquare, label: 'Chat' },
    { id: 'plan', icon: ListTodo, label: 'Plan' },
    { id: 'exec', icon: PlayCircle, label: 'Execution' },
    { id: 'ctx', icon: Database, label: 'Context' },
    { id: 'hist', icon: History, label: 'History' },
  ];

  return (
    <ArchieProvider client={client}>
      <div className="flex flex-col h-full bg-app border-l border-subtle overflow-hidden relative pb-[48px]">
        {/* Archie Header: Title & Collapse Button */}
        <div className="h-9 px-3 border-b border-subtle bg-panel flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-xs font-semibold text-primary">Archie Assistant</span>
          </div>
          <button
            onClick={() => setRightPanelCollapsed(true)}
            className="p-1 rounded-md hover:bg-slate-800 text-muted hover:text-primary transition-colors"
            title="Collapse Assistant ( ] )"
          >
            <PanelRightClose className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Archie Tabs Row */}
        <div className="flex items-center px-2 py-1.5 border-b border-subtle bg-panel/40 overflow-x-auto no-scrollbar gap-1 shrink-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveArchieTab(tab.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
                activeArchieTab === tab.id 
                  ? 'bg-purple-600/20 text-purple-300 font-semibold border border-purple-500/30' 
                  : 'text-muted hover:text-primary hover:bg-panel border border-transparent'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Archie Content Router */}
        <div className="flex-1 overflow-hidden relative">
          {activeArchieTab === 'chat' && <ChatTab />}
          {activeArchieTab === 'plan' && <PlanTab />}
          {activeArchieTab === 'exec' && <ExecutionGraphTab />}
          {activeArchieTab === 'ctx' && <ContextTab />}
          {activeArchieTab === 'hist' && <HistoryTab />}
        </div>
        
        {/* Persistent Timeline Panel */}
        <TimelinePanel />
      </div>
    </ArchieProvider>
  );
};
