
import { Handle, Position } from '@xyflow/react';
import { ListTodo, CheckCircle2, Circle, Loader2 } from 'lucide-react';

export const PlanningNode = ({ data }: any) => {
  const isCompleted = data.status === 'completed';
  const isActive = data.status === 'active';

  return (
    <div className="bg-panel border-2 border-purple-500/30 rounded-lg p-3 min-w-[200px] shadow-sm">
      <Handle type="target" position={Position.Top} className="!bg-purple-500" />
      
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-purple-400 font-medium text-xs">
          <ListTodo className="w-4 h-4" />
          <span>Planning Node</span>
        </div>
        <div>
          {isCompleted && <CheckCircle2 className="w-4 h-4 text-green-500" />}
          {isActive && <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />}
          {!isCompleted && !isActive && <Circle className="w-4 h-4 text-muted" />}
        </div>
      </div>
      
      <div className="text-sm font-semibold text-primary">{data.label}</div>
      {data.description && <div className="text-xs text-muted mt-1">{data.description}</div>}
      
      <Handle type="source" position={Position.Bottom} className="!bg-purple-500" />
    </div>
  );
};
