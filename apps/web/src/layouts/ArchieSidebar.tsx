
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
