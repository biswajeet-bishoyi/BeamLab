
import React from 'react';
import { MousePointer2, Maximize } from 'lucide-react';

export const CenterWorkspace: React.FC = () => {
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
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-muted select-none">
          <p className="text-lg font-medium mb-2 text-primary">Engineering Canvas</p>
          <p className="text-sm max-w-xs mx-auto">This area will host the 3D viewer and 2D diagramming canvas.</p>
        </div>
      </div>
    </div>
  );
};
