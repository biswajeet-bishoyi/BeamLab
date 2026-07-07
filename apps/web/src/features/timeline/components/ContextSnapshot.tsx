import React from 'react';
import { useTimelineStore } from '../store/useTimelineStore';
import { Database, FileJson, Info } from 'lucide-react';

export const ContextSnapshot: React.FC = () => {
  const { contextSnapshot } = useTimelineStore();

  if (!contextSnapshot) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-muted p-8">
        <Info className="w-8 h-8 mb-3 opacity-50" />
        <h4 className="text-sm font-medium text-primary mb-1">No Context Snapshot</h4>
        <p className="text-xs">Context will be captured during the intent phase of a request.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
        <Database className="w-4 h-4 text-accent" />
        Engineering Context Snapshot
      </h3>
      <div className="flex-1 bg-app border border-subtle rounded-xl p-4 overflow-y-auto">
        <div className="flex items-center gap-2 mb-3 text-xs text-muted border-b border-subtle pb-2">
          <FileJson className="w-3.5 h-3.5" />
          <span>Captured at runtime</span>
        </div>
        <pre className="text-xs font-mono text-primary/80 whitespace-pre-wrap">
          {typeof contextSnapshot === 'string' ? contextSnapshot : JSON.stringify(contextSnapshot, null, 2)}
        </pre>
      </div>
    </div>
  );
};
