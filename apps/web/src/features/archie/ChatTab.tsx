
import React, { useState, useRef, useEffect } from 'react';
import { useArchie } from '@beamlab/archie-client';
import { ChatBubble, PromptComposer } from '@beamworks/design-system';
import { Bot, Zap, TerminalSquare } from 'lucide-react';

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
          {messages.map((msg) => (
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
