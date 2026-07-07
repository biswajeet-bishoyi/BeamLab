import React from 'react';
import { Info, Activity, Clock, FileJson } from 'lucide-react';

export const GraphInspector: React.FC = () => {
  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex items-center gap-2 mb-6 text-primary">
        <Info className="w-5 h-5 text-accent" />
        <h3 className="font-semibold">Graph Inspector</h3>
      </div>
      
      <div className="flex-1 text-center text-muted flex flex-col justify-center items-center">
        <Activity className="w-12 h-12 mb-4 opacity-20" />
        <p className="text-sm">Select a node in the graph to view execution details, context snapshots, and tool metadata.</p>
      </div>

      {/* Example static state for now to demonstrate layout */}
      <div className="hidden border border-subtle rounded-xl p-4 bg-app">
        <h4 className="text-sm font-semibold text-primary mb-1">Delete Beam B1</h4>
        <div className="text-xs text-accent font-medium mb-4">Tool Node</div>
        
        <div className="space-y-4">
          <div>
            <div className="text-[10px] text-muted font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Execution Time
            </div>
            <div className="text-xs text-primary font-mono">145ms</div>
          </div>
          
          <div>
            <div className="text-[10px] text-muted font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
              <FileJson className="w-3 h-3" /> Output Payload
            </div>
            <div className="text-[10px] font-mono bg-panel p-2 rounded text-muted">
              {`{\n  "success": true,\n  "deletedEntities": ["B1"]\n}`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
