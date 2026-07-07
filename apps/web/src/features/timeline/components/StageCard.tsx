import React from 'react';
import type { TimelineStage } from '../types';
import { useTimelineStore } from '../store/useTimelineStore';
import { CheckCircle2, Circle, Loader2, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { ToolExecutionCard } from './ToolExecutionCard';

interface StageCardProps {
  stage: TimelineStage;
  index: number;
}

export const StageCard: React.FC<StageCardProps> = ({ stage }) => {
  const { tools } = useTimelineStore();
  
  const isPending = stage.status === 'pending';
  const isActive = stage.status === 'active';
  const isCompleted = stage.status === 'completed';
  const isFailed = stage.status === 'failed';

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
  };

  return (
    <div className="relative pl-8">
      {/* Node Icon */}
      <div className={clsx(
        "absolute -left-[13px] top-1 w-6 h-6 rounded-full flex items-center justify-center bg-app",
        isCompleted && "text-green-500",
        isActive && "text-accent",
        isPending && "text-muted border-2 border-subtle",
        isFailed && "text-red-500"
      )}>
        {isCompleted && <CheckCircle2 className="w-6 h-6 fill-current bg-app rounded-full" />}
        {isActive && <Loader2 className="w-5 h-5 animate-spin" />}
        {isPending && <Circle className="w-3 h-3 fill-current" />}
        {isFailed && <AlertCircle className="w-6 h-6 fill-current bg-app rounded-full" />}
      </div>
      
      {/* Card Content */}
      <div className={clsx(
        "bg-panel border rounded-xl p-4 transition-all",
        isActive ? "border-accent/40 shadow-[0_0_15px_rgba(var(--accent-rgb),0.1)]" : "border-subtle",
        isPending && "opacity-50"
      )}>
        <div className="flex justify-between items-start mb-2">
          <div>
            <h4 className={clsx("text-sm font-semibold", isActive ? "text-primary" : "text-primary/80")}>
              {stage.title}
            </h4>
            <p className="text-xs text-muted mt-0.5">{stage.description}</p>
          </div>
          
          {(stage.startTime || stage.endTime) && (
            <div className="flex flex-col items-end text-[10px] text-muted font-mono gap-1">
              {stage.startTime && <span>{formatTime(stage.startTime)}</span>}
              {stage.endTime && <span>{formatTime(stage.endTime)}</span>}
            </div>
          )}
        </div>

        {/* Progress Bar (if active or partial) */}
        {(isActive || stage.progress > 0) && (
          <div className="w-full bg-subtle rounded-full h-1 mt-3 overflow-hidden">
            <div 
              className={clsx(
                "h-full transition-all duration-300 ease-out",
                isFailed ? "bg-red-500" : "bg-accent"
              )}
              style={{ width: `${stage.progress}%` }}
            />
          </div>
        )}

        {/* Errors */}
        {isFailed && stage.error && (
          <div className="mt-3 text-xs text-red-400 bg-red-500/10 p-2 rounded border border-red-500/20 whitespace-pre-wrap">
            {stage.error}
          </div>
        )}

        {/* Tool Executions inside the Tool Execution Stage */}
        {stage.id === 'tool_execution' && tools.length > 0 && (
          <div className="mt-4 space-y-2 border-t border-subtle/50 pt-3">
            {tools.map(tool => (
              <ToolExecutionCard key={tool.id} tool={tool} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
