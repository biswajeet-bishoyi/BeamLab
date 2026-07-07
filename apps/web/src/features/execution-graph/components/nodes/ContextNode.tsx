
import { Handle, Position } from '@xyflow/react';
import { Database, CheckCircle2 } from 'lucide-react';

export const ContextNode = ({ data }: any) => {
  return (
    <div className="bg-panel border-2 border-blue-500/30 rounded-lg p-3 min-w-[200px] shadow-sm">
      <Handle type="target" position={Position.Top} className="!bg-blue-500" />
      
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-blue-400 font-medium text-xs">
          <Database className="w-4 h-4" />
          <span>Context Sync</span>
        </div>
        <div>
          <CheckCircle2 className="w-4 h-4 text-green-500" />
        </div>
      </div>
      
      <div className="text-sm font-semibold text-primary">{data.label}</div>
      
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500" />
    </div>
  );
};
