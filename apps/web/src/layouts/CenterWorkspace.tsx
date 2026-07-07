
import React, { useEffect, useState } from 'react';
import { MousePointer2, Maximize, ScanSearch } from 'lucide-react';
import { workspace } from '@beamlab/workspace-runtime';
import { clsx } from 'clsx';

export const CenterWorkspace: React.FC = () => {
  const [isHighlighting, setIsHighlighting] = useState(false);
  const [highlightEntities, setHighlightEntities] = useState<string[]>([]);

  useEffect(() => {
    return workspace.on('HighlightRequested', (event: any) => {
      setIsHighlighting(true);
      setHighlightEntities(event.payload.entities || []);
      
      setTimeout(() => {
        setIsHighlighting(false);
        setHighlightEntities([]);
      }, 2000);
    });
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#111111] relative overflow-hidden">
      {/* Mock Viewport Tools */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
        <button className="w-8 h-8 bg-panel border border-subtle rounded flex items-center justify-center text-primary shadow-sm hover:bg-subtle transition-colors">
          <MousePointer2 className="w-4 h-4" />
        </button>
        <button className="w-8 h-8 bg-panel border border-subtle rounded flex items-center justify-center text-muted hover:text-primary shadow-sm hover:bg-subtle transition-colors">
          <Maximize className="w-4 h-4" />
        </button>
      </div>

      {/* Mock Canvas Content */}
      <div className={clsx(
        "flex-1 flex items-center justify-center transition-all duration-500",
        isHighlighting ? "bg-accent/10 scale-105" : "scale-100"
      )}>
        <div className="text-center text-muted select-none">
          {isHighlighting ? (
            <div className="flex flex-col items-center animate-pulse text-accent">
              <ScanSearch className="w-12 h-12 mb-4" />
              <p className="text-lg font-medium mb-1">Highlighting Objects in Canvas</p>
              <p className="text-sm font-mono">{highlightEntities.join(', ')}</p>
            </div>
          ) : (
            <>
              <p className="text-lg font-medium mb-2 text-primary">Engineering Canvas</p>
              <p className="text-sm max-w-xs mx-auto">This area will host the 3D viewer and 2D diagramming canvas.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
