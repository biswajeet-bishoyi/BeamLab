import React, { useEffect, useRef } from 'react';
import { Terminal, Brain, Check, AlertTriangle, Info, ChevronRight } from 'lucide-react';
import type { ReasoningLogEntry } from './types';

interface ReasoningStreamProps {
  logs: ReasoningLogEntry[];
}

export const ReasoningStream: React.FC<ReasoningStreamProps> = ({ logs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs.length]);

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
        <Terminal className="w-10 h-10 mb-2 opacity-40 text-violet-400" />
        <p className="text-sm font-medium">Reasoning Stream Idle</p>
        <p className="text-xs text-slate-500 mt-1">
          Agent deduction steps, structural computations, and compliance audits will stream here in real time.
        </p>
      </div>
    );
  }

  const getSeverityIcon = (severity: ReasoningLogEntry['severity']) => {
    switch (severity) {
      case 'success':
        return <Check className="w-3.5 h-3.5 text-emerald-400" />;
      case 'warning':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
      case 'error':
        return <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />;
      case 'info':
      default:
        return <Info className="w-3.5 h-3.5 text-sky-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full space-y-2 font-mono text-xs">
      <div className="flex items-center justify-between px-1 pb-1">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-sans">
          <Brain className="w-3.5 h-3.5 text-indigo-400" />
          Autonomous Reasoning Stream
        </h4>
        <span className="text-[11px] text-slate-500 font-mono">{logs.length} Events</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[440px]">
        {logs.map((log) => {
          const timeString = new Date(log.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });

          return (
            <div
              key={log.id}
              className="p-3 rounded-lg bg-slate-900/70 border border-slate-800/80 hover:border-slate-700/80 transition-colors shadow-sm"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5 font-sans">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span
                    className="text-[11px] font-bold px-2 py-0.5 rounded-full border text-white"
                    style={{
                      backgroundColor: `${log.agentColor}20`,
                      borderColor: `${log.agentColor}60`,
                      color: log.agentColor,
                    }}
                  >
                    {log.agentName}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">{timeString}</span>
                </div>
                <div className="flex items-center gap-1">{getSeverityIcon(log.severity)}</div>
              </div>

              <p className="text-slate-200 text-xs font-sans leading-relaxed">{log.message}</p>

              {log.equations && log.equations.length > 0 && (
                <div className="mt-2 p-2 rounded bg-slate-950/80 border border-slate-800 text-[11px] text-sky-300 font-mono space-y-1">
                  {log.equations.map((eq, eqIdx) => (
                    <div key={eqIdx} className="flex items-center gap-1.5">
                      <ChevronRight className="w-3 h-3 text-sky-500 shrink-0" />
                      <span>{eq}</span>
                    </div>
                  ))}
                </div>
              )}

              {log.details && (
                <div className="mt-2 text-[11px] text-slate-400 font-mono bg-slate-950/50 p-2 rounded border border-slate-900 leading-normal">
                  {log.details}
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
