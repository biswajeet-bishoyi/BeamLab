
import React from 'react';
import { Database } from 'lucide-react';
import { useArchie } from '@beamlab/archie-client';

export const ContextTab: React.FC = () => {
  const { contextData } = useArchie();

  if (!contextData) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-sm text-muted p-6 text-center">
        <Database className="w-8 h-8 mb-4 opacity-50" />
        <p className="font-medium text-primary mb-1">Context Engine Ready</p>
        <p className="text-xs">Context will be loaded when a conversation starts.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-app p-4 overflow-y-auto">
      <h3 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
        <Database className="w-4 h-4 text-accent" />
        Workspace Context
      </h3>
      <div className="bg-panel border border-subtle rounded-xl p-3 text-xs font-mono text-muted whitespace-pre-wrap">
        {typeof contextData === 'string' ? contextData : JSON.stringify(contextData, null, 2)}
      </div>
    </div>
  );
};
