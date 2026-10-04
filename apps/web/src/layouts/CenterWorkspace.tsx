import React, { useState, useCallback } from 'react';
import { useStore } from '../store';
import { EnvironmentLayer } from '../components/environments/EnvironmentLayer';
import { BeamCanvas } from '../components/BeamCanvas';
import { EngineeringCanvas3D } from '../features/canvas/EngineeringCanvas3D';
import { ResultsStudio } from '../components/ResultsStudio';
import { LeftToolbox } from '../components/LeftToolbox';
import { Box, Layers, Activity, ChevronUp, ChevronDown, Sparkles } from 'lucide-react';

export const CenterWorkspace: React.FC = () => {
  const activeEnvironment = useStore(state => state.activeEnvironment);
  const [canvasMode, setCanvasMode] = useState<'2D' | '3D'>('3D');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [resultsExpanded, setResultsExpanded] = useState<boolean>(false);

  const handleSelectMember = useCallback((id: string) => {
    setSelectedMemberId(id);
  }, []);

  return (
    <div className="flex flex-col h-full w-full bg-[#080c14] relative overflow-hidden select-none">
      {/* LEFT TOOLBOX (Floating) */}
      <LeftToolbox />

      {/* TOP FLOATING CONTROLS: Mode Switcher & Engine Info */}
      <div className="absolute top-3 left-16 right-4 flex items-center justify-between pointer-events-none z-20">
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* 2D / 3D Canvas Switcher */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-800 text-xs shadow-lg">
            <button
              onClick={() => setCanvasMode('3D')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                canvasMode === '3D'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D Spatial</span>
            </button>
            <button
              onClick={() => setCanvasMode('2D')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                canvasMode === '2D'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>2D Beam</span>
            </button>
          </div>

          {/* Quick Drawer Toggle */}
          <button
            onClick={() => setResultsExpanded(!resultsExpanded)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium backdrop-blur-md transition-all shadow-lg ${
              resultsExpanded
                ? 'bg-blue-600/20 text-blue-300 border-blue-500/40'
                : 'bg-slate-900/90 text-slate-400 hover:text-slate-200 border-slate-800 hover:bg-slate-800'
            }`}
            title="Toggle Results Analysis Drawer"
          >
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <span>Diagrams</span>
            {resultsExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2 pointer-events-auto">
          <div className="px-2.5 py-1 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-800/80 text-[10px] font-mono text-slate-400">
            {canvasMode === '3D' ? 'WebGL 2.0 · Three.js · Z-up' : 'SVG Vector Schematic'}
          </div>
        </div>
      </div>

      {/* FULL-VIEWPORT CANVAS AREA */}
      <div className="flex-1 w-full h-full relative overflow-hidden bg-[#070a10]">
        {canvasMode === '3D' ? (
          <EngineeringCanvas3D
            className="w-full h-full"
            onSelectMember={handleSelectMember}
          />
        ) : (
          <div className="w-full h-full relative flex items-center justify-center">
            <EnvironmentLayer environmentId={activeEnvironment} />
            <BeamCanvas />
          </div>
        )}
      </div>

      {/* COLLAPSIBLE RESULTS DRAWER (Bottom) */}
      <div className={`transition-all duration-300 ease-in-out border-t border-slate-800 bg-slate-950/98 backdrop-blur-2xl z-30 flex flex-col ${
        resultsExpanded ? 'h-[320px]' : 'h-8'
      }`}>
        {/* Drawer Header Bar */}
        <div
          onClick={() => setResultsExpanded(!resultsExpanded)}
          className="h-8 px-4 flex items-center justify-between cursor-pointer hover:bg-slate-900/80 transition-colors shrink-0"
        >
          <div className="flex items-center gap-2 text-xs">
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-semibold text-slate-200">Results Studio</span>
            <span className="text-slate-500 hidden sm:inline">· Multi-Case Enveloping & Critical Station Hunter</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Sprint B3.2
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="text-[11px] text-slate-500">
              {resultsExpanded ? 'Click to minimize canvas drawer' : 'Click to view diagram envelopes'}
            </span>
            {resultsExpanded ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </div>

        {/* Drawer Content */}
        {resultsExpanded && (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 flex justify-center">
            <div className="w-full max-w-5xl">
              <ResultsStudio selectedMemberId={selectedMemberId} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
