import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  ArrowDown,
  Layers,
  Cpu,
  FileSpreadsheet,
  CheckCheck,
  FileCode2,
} from 'lucide-react';
import type { CopilotStudioState } from './types';

interface CopilotDAGViewerProps {
  steps: CopilotStudioState['steps'];
  onSelectStep?: (stepId: string) => void;
  selectedStepId?: string | null;
}

export const CopilotDAGViewer: React.FC<CopilotDAGViewerProps> = ({
  steps,
  onSelectStep,
  selectedStepId,
}) => {
  if (steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
        <Layers className="w-10 h-10 mb-2 opacity-40 text-indigo-400" />
        <p className="text-sm font-medium">No Execution Plan Active</p>
        <p className="text-xs text-slate-500 mt-1">
          Enter an engineering objective or select a preset to synthesize a multi-agent plan DAG.
        </p>
      </div>
    );
  }

  const getStepIcon = (action: string) => {
    switch (action) {
      case 'GENERATE_LOAD_COMBINATIONS':
        return <FileSpreadsheet className="w-4 h-4 text-sky-400" />;
      case 'EXECUTE_FEA_SOLVER':
        return <Cpu className="w-4 h-4 text-emerald-400" />;
      case 'AUDIT_CODE_COMPLIANCE':
        return <CheckCheck className="w-4 h-4 text-amber-400" />;
      case 'OPTIMIZE_CROSS_SECTIONS':
        return <Layers className="w-4 h-4 text-violet-400" />;
      case 'VERIFY_OPTIMIZED_MODEL':
        return <Cpu className="w-4 h-4 text-teal-400" />;
      case 'GENERATE_CALCULATION_NOTE':
        return <FileCode2 className="w-4 h-4 text-indigo-400" />;
      default:
        return <Layers className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: CopilotStudioState['steps'][0]['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> Done
          </span>
        );
      case 'active':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-sky-400 bg-sky-950/60 border border-sky-800/60 px-2 py-0.5 rounded-full animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" /> Running
          </span>
        );
      case 'paused':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-300 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded-full">
            <AlertTriangle className="w-3 h-3" /> Approval Gate
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-950/60 border border-rose-800/60 px-2 py-0.5 rounded-full">
            Failed
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full">
            <Clock className="w-3 h-3" /> Queued
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col space-y-3">
      <div className="flex items-center justify-between px-1">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Topological Execution Plan (DAG)
        </h4>
        <span className="text-xs text-slate-400 font-mono">
          {steps.filter((s) => s.status === 'completed').length} / {steps.length} Steps Completed
        </span>
      </div>

      <div className="space-y-2">
        {steps.map((step, idx) => {
          const isSelected = selectedStepId === step.id;
          const isActive = step.status === 'active';

          return (
            <div key={step.id} className="flex flex-col items-center">
              <div
                onClick={() => onSelectStep?.(step.id)}
                className={`w-full p-3.5 rounded-xl border transition-all cursor-pointer text-left ${
                  isActive
                    ? 'bg-slate-900/90 border-sky-500/80 shadow-lg shadow-sky-950/50 ring-1 ring-sky-500/40'
                    : isSelected
                    ? 'bg-slate-900 border-indigo-500 shadow-md ring-1 ring-indigo-500/30'
                    : step.status === 'completed'
                    ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    : step.status === 'paused'
                    ? 'bg-amber-950/20 border-amber-500/60 shadow-lg shadow-amber-950/40 ring-1 ring-amber-500/30'
                    : 'bg-slate-950/50 border-slate-900 text-slate-400'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-center shrink-0">
                      {getStepIcon(step.action)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>{step.title}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                        <span className="text-indigo-400">{step.agent}</span>
                        {step.durationMs !== undefined && (
                          <span className="text-slate-500">({step.durationMs}ms)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">{getStatusBadge(step.status)}</div>
                </div>

                {step.dependencies.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center gap-1.5 text-[10px] text-slate-500">
                    <span>Depends on:</span>
                    {step.dependencies.map((dep) => (
                      <span
                        key={dep}
                        className="px-1.5 py-0.5 rounded bg-slate-800/70 border border-slate-700/50 font-mono text-slate-300"
                      >
                        {dep}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {idx < steps.length - 1 && (
                <div className="my-1 flex items-center justify-center">
                  <ArrowDown className="w-3.5 h-3.5 text-slate-700" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
