
import React from 'react';
import { useArchie } from '@beamlab/archie-client';
import { PlayCircle } from 'lucide-react';

export const ExecutionTab: React.FC = () => {
  const { execution } = useArchie();

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
                style={{ width: `${task.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
