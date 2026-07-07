const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const WEB_DIR = path.join(ROOT_DIR, 'apps', 'web', 'src');
const ARCHIE_DIR = path.join(WEB_DIR, 'features', 'archie');

if (!fs.existsSync(ARCHIE_DIR)) fs.mkdirSync(ARCHIE_DIR, { recursive: true });

// 1. ChatTab.tsx
fs.writeFileSync(path.join(ARCHIE_DIR, 'ChatTab.tsx'), `
import React, { useState, useRef, useEffect } from 'react';
import { useArchie } from '@beamlab/archie-client';
import { ChatBubble, PromptComposer } from '@beamworks/design-system';
import { Bot, Zap, Clock, Star, TerminalSquare } from 'lucide-react';

export const ChatTab: React.FC = () => {
  const { messages, state, client } = useArchie();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, state]);

  const handleSubmit = () => {
    if (!input.trim()) return;
    client.sendMessage(input);
    setInput('');
  };

  const isSubmitting = state === 'submitting' || state === 'streaming' || state === 'planning' || state === 'executing';

  return (
    <div className="flex flex-col h-full bg-app relative">
      {messages.length === 0 ? (
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center">
          <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center mb-6 border border-accent/20">
            <Bot className="w-6 h-6 text-accent" />
          </div>
          <h2 className="text-xl font-semibold text-primary mb-2">Good Morning!</h2>
          <p className="text-sm text-muted mb-8 text-center max-w-sm">I'm Archie, your engineering intelligence assistant. How can I help you design today?</p>
          
          <div className="grid grid-cols-2 gap-3 w-full max-w-md">
            <button onClick={() => setInput('/analyze current selection')} className="flex flex-col items-start p-3 bg-panel border border-subtle rounded-xl hover:border-accent hover:bg-subtle transition-colors text-left">
              <Zap className="w-4 h-4 text-accent mb-2" />
              <span className="text-sm font-medium text-primary">Analyze Selection</span>
              <span className="text-xs text-muted mt-1">Run structural checks</span>
            </button>
            <button onClick={() => setInput('/report generate')} className="flex flex-col items-start p-3 bg-panel border border-subtle rounded-xl hover:border-accent hover:bg-subtle transition-colors text-left">
              <TerminalSquare className="w-4 h-4 text-muted mb-2" />
              <span className="text-sm font-medium text-primary">Generate Report</span>
              <span className="text-xs text-muted mt-1">Export PDF calc package</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {messages.map((msg, i) => (
            <ChatBubble 
              key={msg.id} 
              role={msg.role} 
              content={msg.content} 
              isStreaming={msg.status === 'streaming'} 
            />
          ))}
          {state === 'planning' && (
            <div className="flex items-center gap-2 text-xs text-muted my-4 justify-center">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Archie is planning...
            </div>
          )}
          <div ref={bottomRef} className="h-4" />
        </div>
      )}

      <div className="p-4 bg-app border-t border-subtle shrink-0">
        <PromptComposer
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          onCancel={() => client.cancel()}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
};
`);

// 2. PlanTab.tsx
fs.writeFileSync(path.join(ARCHIE_DIR, 'PlanTab.tsx'), `
import React from 'react';
import { useArchie } from '@beamlab/archie-client';
import { CheckCircle2, Circle, Clock, Loader2, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

export const PlanTab: React.FC = () => {
  const { plan, state } = useArchie();

  if (plan.length === 0) {
    return <div className="flex items-center justify-center h-full text-sm text-muted">No active plan.</div>;
  }

  return (
    <div className="flex flex-col h-full bg-app p-4 overflow-y-auto">
      <h3 className="text-sm font-semibold text-primary mb-4">Execution Plan</h3>
      <div className="relative border-l-2 border-subtle ml-3 space-y-6">
        {plan.map((step, idx) => (
          <div key={step.id} className="relative pl-6">
            <div className={clsx(
              "absolute -left-[11px] top-0.5 w-5 h-5 rounded-full flex items-center justify-center bg-app",
              step.status === 'completed' && "text-green-500",
              step.status === 'active' && "text-accent",
              step.status === 'pending' && "text-muted border-2 border-subtle",
              step.status === 'failed' && "text-red-500"
            )}>
              {step.status === 'completed' && <CheckCircle2 className="w-5 h-5 fill-current bg-app rounded-full" />}
              {step.status === 'active' && <Loader2 className="w-4 h-4 animate-spin" />}
              {step.status === 'pending' && <Circle className="w-3 h-3 fill-current" />}
              {step.status === 'failed' && <AlertCircle className="w-5 h-5 fill-current bg-app rounded-full" />}
            </div>
            
            <div className="flex flex-col">
              <span className={clsx("text-sm font-medium", step.status === 'active' ? "text-primary" : "text-primary/80")}>
                {step.title}
              </span>
              <span className="text-xs text-muted mt-1">{step.description}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
`);

// 3. ExecutionTab.tsx
fs.writeFileSync(path.join(ARCHIE_DIR, 'ExecutionTab.tsx'), `
import React from 'react';
import { useArchie } from '@beamlab/archie-client';
import { PlayCircle } from 'lucide-react';

export const ExecutionTab: React.FC = () => {
  const { execution, state } = useArchie();

  if (execution.length === 0) {
    return <div className="flex flex-col items-center justify-center h-full text-sm text-muted"><PlayCircle className="w-8 h-8 mb-2 opacity-50"/>No tasks executing.</div>;
  }

  return (
    <div className="flex flex-col h-full bg-app p-4 overflow-y-auto">
      <h3 className="text-sm font-semibold text-primary mb-4">Execution Queue</h3>
      <div className="space-y-3">
        {execution.map(task => (
          <div key={task.id} className="bg-panel border border-subtle rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-primary font-medium">{task.name}</span>
              <span className="text-xs text-muted">{task.status}</span>
            </div>
            <div className="w-full bg-subtle rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-accent h-1.5 transition-all duration-300 ease-out" 
                style={{ width: \`\${task.progress}%\` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
`);

// 4. ContextTab.tsx
fs.writeFileSync(path.join(ARCHIE_DIR, 'ContextTab.tsx'), `
import React from 'react';
import { Database } from 'lucide-react';

export const ContextTab: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-sm text-muted p-6 text-center">
      <Database className="w-8 h-8 mb-4 opacity-50" />
      <p className="font-medium text-primary mb-1">Context Engine Ready</p>
      <p className="text-xs">Selected structural members, materials, and loads will appear here once connected to the Runtime Gateway.</p>
    </div>
  );
};
`);

// 5. HistoryTab.tsx
fs.writeFileSync(path.join(ARCHIE_DIR, 'HistoryTab.tsx'), `
import React from 'react';
import { History } from 'lucide-react';

export const HistoryTab: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-sm text-muted p-6 text-center">
      <History className="w-8 h-8 mb-4 opacity-50" />
      <p className="font-medium text-primary mb-1">No Recent History</p>
      <p className="text-xs">Your past conversations and execution logs will be saved here.</p>
    </div>
  );
};
`);

console.log('Archie Web Features scaffolded.');
