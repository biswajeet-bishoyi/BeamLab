import React from 'react';
import type { ToolExecutionRecord } from '../types';
import { Wrench, Check, AlertTriangle, Loader2 } from 'lucide-react';

export const ToolExecutionCard: React.FC<{ tool: ToolExecutionRecord }> = ({ tool }) => {
  const isFailed = tool.status === 'failed';
  const isCompleted = tool.status === 'completed';
  const isActive = tool.status === 'active';

  return (
    <div className="bg-app border border-subtle rounded-md p-2 flex flex-col gap-1.5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium text-primary">
          <Wrench className="w-3.5 h-3.5 text-muted" />
          <span>{tool.toolName}</span>
        </div>
        <div className="flex items-center">
          {isActive && <Loader2 className="w-3.5 h-3.5 text-accent animate-spin" />}
          {isCompleted && <Check className="w-3.5 h-3.5 text-green-500" />}
          {isFailed && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
        </div>
      </div>
      
      {tool.error && (
        <div className="text-[10px] text-red-400 bg-red-500/10 p-1.5 rounded">
          {tool.error}
        </div>
      )}
      {tool.result && (
        <div className="text-[10px] text-muted font-mono bg-panel p-1.5 rounded whitespace-pre-wrap max-h-24 overflow-y-auto">
          {typeof tool.result === 'object' ? JSON.stringify(tool.result, null, 2) : tool.result}
        </div>
      )}
    </div>
  );
};
