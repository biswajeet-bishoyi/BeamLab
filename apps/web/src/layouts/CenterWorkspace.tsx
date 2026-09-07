import React, { useState } from 'react';
import { useStore } from '../store';
import { EngineeringInspector } from '../components/EngineeringInspector';
import { EnvironmentLayer } from '../components/environments/EnvironmentLayer';
import { BeamCanvas } from '../components/BeamCanvas';
import { EngineeringCanvas3D } from '../features/canvas/EngineeringCanvas3D';
import { ResultsStudio } from '../components/ResultsStudio';
import { LeftToolbox } from '../components/LeftToolbox';
import { Box, Layers } from 'lucide-react';

export const CenterWorkspace: React.FC = () => {
  const activeEnvironment = useStore(state => state.activeEnvironment);
  const [canvasMode, setCanvasMode] = useState<'2D' | '3D'>('3D');

  return (
    <div className="flex flex-col h-full bg-[#111111] relative overflow-hidden custom-scrollbar">
      {/* LEFT TOOLBOX (Floating) */}
      <LeftToolbox />

      {/* CENTER CANVAS */}
      <div className="absolute inset-0 pt-24 pb-8 pl-24 pr-8 flex flex-col pointer-events-none z-10 custom-scrollbar overflow-y-auto">
        <EngineeringInspector />

        {/* 2D / 3D Canvas Mode Switcher Bar */}
        <div className="w-full flex items-center justify-between pb-2 pointer-events-auto">
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-900/80 border border-slate-800/80 text-xs">
            <button
              onClick={() => setCanvasMode('3D')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-all ${
                canvasMode === '3D'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D Spatial Canvas</span>
            </button>
            <button
              onClick={() => setCanvasMode('2D')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-all ${
                canvasMode === '2D'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>2D Beam Schematic</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-slate-500">
            {canvasMode === '3D' ? 'WebGL 2.0 · Three.js Kernel · Z-up' : 'SVG Vector Schematic'}
          </div>
        </div>
        
        {/* Main Canvas Viewport Area */}
        <div className="w-full h-[450px] shrink-0 flex items-center justify-center pointer-events-auto relative rounded-xl overflow-hidden border border-slate-800 shadow-2xl bg-[#090d16]">
          {canvasMode === '3D' ? (
            <EngineeringCanvas3D className="w-full h-full" />
          ) : (
            <div className="w-full h-full relative flex items-center justify-center">
              <EnvironmentLayer environmentId={activeEnvironment} />
              <BeamCanvas />
            </div>
          )}
        </div>
        
        {/* Interactive Diagram System */}
        <div className="w-full flex-1 pointer-events-auto flex justify-center pb-32 pt-4">
          <ResultsStudio />
        </div>
      </div>
    </div>
  );
};
