import React, { useEffect } from 'react';
import { useArchie } from '@beamlab/archie-client';
import { useTimelineStore } from '../store/useTimelineStore';
import { ChevronDown, ChevronUp, Pause, Play, Activity } from 'lucide-react';
import { clsx } from 'clsx';
import { TimelineLayout } from './TimelineLayout';

export const TimelinePanel: React.FC = () => {
  const { client } = useArchie();
  const { 
    isExpanded, 
    toggleExpanded, 
    isPaused, 
    setPaused, 
    addEvent, 
    panelHeight, 
    stages 
  } = useTimelineStore();

  useEffect(() => {
    const unsubscribe = client.subscribe((event: any) => {
      if (event && event.type) {
        addEvent(event.type, event.payload);
      }
    });
    return () => unsubscribe();
  }, [client, addEvent]);

  const activeStage = stages.find(s => s.status === 'active');
  const isRunning = stages.some(s => s.status === 'active') && !stages.some(s => s.status === 'failed');

  return (
    <div 
      className={clsx(
        "absolute bottom-0 left-0 right-0 bg-panel border-t border-subtle transition-all duration-300 flex flex-col z-20 shadow-2xl",
        isExpanded ? "shadow-[0_-10px_40px_rgba(0,0,0,0.15)]" : ""
      )}
      style={{ height: isExpanded ? panelHeight : '48px' }}
    >
      {/* Header Bar */}
      <div 
        className="h-12 border-b border-subtle flex items-center justify-between px-4 cursor-pointer hover:bg-subtle/30 transition-colors shrink-0"
        onClick={toggleExpanded}
      >
        <div className="flex items-center gap-3">
          <Activity className={clsx("w-4 h-4", isRunning ? "text-accent animate-pulse" : "text-muted")} />
          <span className="font-semibold text-sm text-primary">Engineering Intelligence Timeline</span>
          {activeStage && !isExpanded && (
            <span className="text-xs px-2 py-0.5 bg-accent/10 text-accent rounded-full font-medium ml-2 border border-accent/20">
              {activeStage.title}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {isExpanded && (
            <button 
              className={clsx("p-1.5 rounded-md hover:bg-subtle transition-colors", isPaused && "text-amber-500 bg-amber-500/10")}
              onClick={(e) => { e.stopPropagation(); setPaused(!isPaused); }}
              title={isPaused ? "Resume Updates" : "Pause Updates"}
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4 text-muted hover:text-primary" />}
            </button>
          )}
          <div className="w-px h-4 bg-subtle mx-1" />
          <button className="p-1 text-muted hover:text-primary transition-colors">
            {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Content Area */}
      {isExpanded && (
        <div className="flex-1 overflow-hidden">
          <TimelineLayout />
        </div>
      )}
    </div>
  );
};
