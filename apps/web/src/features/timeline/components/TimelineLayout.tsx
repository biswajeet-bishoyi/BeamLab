import React from 'react';
import { useTimelineStore } from '../store/useTimelineStore';
import { StageCard } from './StageCard';
import { ProgressVisualization } from './ProgressVisualization';
import { ContextSnapshot } from './ContextSnapshot';

export const TimelineLayout: React.FC = () => {
  const { stages } = useTimelineStore();

  return (
    <div className="flex h-full w-full bg-[#080c14]">
      {/* Left side: Timeline Steps */}
      <div className="w-1/2 border-r border-slate-800 overflow-y-auto p-3.5 custom-scrollbar">
        <ProgressVisualization />
        
        <div className="mt-4 relative border-l-2 border-slate-800 ml-2 space-y-3">
          {stages.map((stage, index) => (
            <StageCard key={stage.id} stage={stage} index={index} />
          ))}
        </div>
      </div>

      {/* Right side: Active details / Snapshot */}
      <div className="w-1/2 bg-[#0d121d] overflow-y-auto p-3.5 custom-scrollbar">
        <ContextSnapshot />
      </div>
    </div>
  );
};
