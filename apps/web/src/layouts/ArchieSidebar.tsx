import React, { useMemo } from 'react';
import { useWorkspaceStore } from '../store/workspace';
import { MessageSquare, ListTodo, PlayCircle, Database, History } from 'lucide-react';
import { ArchieProvider, ArchieClient, LocalRuntimeTransport } from '@beamlab/archie-client';
import { ChatTab } from '../features/archie/ChatTab';
import { PlanTab } from '../features/archie/PlanTab';
import { ExecutionGraphTab } from '../features/execution-graph/components/ExecutionGraphTab';
import { ContextTab } from '../features/archie/ContextTab';
import { HistoryTab } from '../features/archie/HistoryTab';
import { TimelinePanel } from '../features/timeline/components/TimelinePanel';

export const ArchieSidebar: React.FC = () => {
  const { activeArchieTab, setActiveArchieTab } = useWorkspaceStore();
  
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
        {/* Archie Tabs */}
        <div className="flex items-center border-b border-subtle bg-panel overflow-x-auto shrink-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveArchieTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeArchieTab === tab.id 
                  ? 'border-accent text-accent' 
                  : 'border-transparent text-muted hover:text-primary'
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
