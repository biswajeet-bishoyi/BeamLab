import React from 'react';
import { useTimelineStore } from '../store/useTimelineStore';

export const ProgressVisualization: React.FC = () => {
  const { stages } = useTimelineStore();
  
  const completedCount = stages.filter(s => s.status === 'completed').length;
  const totalCount = stages.length;
  const percentage = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center text-xs font-medium">
        <span className="text-muted">Pipeline Progress</span>
        <span className="text-accent">{percentage}%</span>
      </div>
      <div className="w-full h-1.5 bg-panel rounded-full overflow-hidden border border-subtle shadow-inner">
        <div 
          className="h-full bg-gradient-to-r from-accent/50 to-accent transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
