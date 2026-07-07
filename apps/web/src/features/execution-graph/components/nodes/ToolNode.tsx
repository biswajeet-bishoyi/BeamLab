
import { Handle, Position } from '@xyflow/react';
import { Wrench, CheckCircle2, Circle, Loader2, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';

export const ToolNode = ({ data }: any) => {
  const isCompleted = data.status === 'completed';
  const isActive = data.status === 'running';
  const isFailed = data.status === 'failed';

  return (
    <div className={clsx(
      "bg-panel border-2 rounded-lg p-3 min-w-[200px] shadow-sm",
      isFailed ? "border-red-500/50" : "border-accent/30"
    )}>
      <Handle type="target" position={Position.Top} className="!bg-accent" />
      
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-accent font-medium text-xs">
          <Wrench className="w-4 h-4" />
          <span>Tool Execution</span>
        </div>
        <div>
          {isCompleted && <CheckCircle2 className="w-4 h-4 text-green-500" />}
          {isActive && <Loader2 className="w-4 h-4 text-accent animate-spin" />}
          {isFailed && <AlertTriangle className="w-4 h-4 text-red-500" />}
          {!isCompleted && !isActive && !isFailed && <Circle className="w-4 h-4 text-muted" />}
        </div>
      </div>
      
      <div className="text-sm font-semibold text-primary">{data.label}</div>
      {data.progress > 0 && !isCompleted && !isFailed && (
        <div className="w-full bg-subtle rounded-full h-1 mt-2 overflow-hidden">
          <div className="bg-accent h-full transition-all duration-300" style={{ width: `${data.progress}%` }} />
        </div>
      )}
      
      <Handle type="source" position={Position.Bottom} className="!bg-accent" />
    </div>
  );
};
