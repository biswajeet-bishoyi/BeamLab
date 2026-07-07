import React from 'react';
import { useTimelineStore } from '../store/useTimelineStore';
import { StageCard } from './StageCard';
import { ProgressVisualization } from './ProgressVisualization';
import { ContextSnapshot } from './ContextSnapshot';

export const TimelineLayout: React.FC = () => {
  const { stages } = useTimelineStore();

  return (
    <div className="flex h-full w-full bg-app">
      {/* Left side: Timeline Steps */}
      <div className="w-1/2 border-r border-subtle overflow-y-auto p-6 scrollbar-hide">
        <ProgressVisualization />
        
        <div className="mt-8 relative border-l-2 border-subtle/50 ml-4 space-y-6">
          {stages.map((stage, index) => (
            <StageCard key={stage.id} stage={stage} index={index} />
          ))}
        </div>
      </div>

      {/* Right side: Active details / Snapshot */}
      <div className="w-1/2 bg-panel overflow-y-auto p-6">
        <ContextSnapshot />
      </div>
    </div>
  );
};
