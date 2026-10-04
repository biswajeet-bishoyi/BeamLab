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

      {/* When canvasMode === '2D', render a simple clean top switcher */}
      {canvasMode === '2D' && (
        <div className="absolute top-3 left-16 z-20 flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/95 backdrop-blur-xl border border-slate-800 text-xs shadow-2xl">
            <button
              onClick={() => setCanvasMode('3D')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-all"
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D Spatial</span>
            </button>
            <button
              onClick={() => setCanvasMode('2D')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium bg-blue-600 text-white shadow-sm transition-all"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>2D Beam</span>
            </button>
          </div>
        </div>
      )}

      {/* FULL-VIEWPORT CANVAS AREA */}
      <div className="flex-1 w-full h-full relative overflow-hidden bg-[#070a10]">
        {canvasMode === '3D' ? (
          <EngineeringCanvas3D
            className="w-full h-full"
            onSelectMember={handleSelectMember}
            canvasMode={canvasMode}
            onSetCanvasMode={setCanvasMode}
          />
        ) : (
          <div className="w-full h-full relative flex items-center justify-center">
            <EnvironmentLayer environmentId={activeEnvironment} />
            <BeamCanvas />
          </div>
        )}
      </div>

      {/* COLLAPSIBLE RESULTS DRAWER (Bottom) */}
      <div className={`transition-all duration-300 ease-in-out border-t border-slate-800/80 bg-slate-950/98 backdrop-blur-2xl z-30 flex flex-col ${
        resultsExpanded ? 'h-[320px]' : 'h-7'
      }`}>
        {/* Drawer Header Bar */}
        <div
          onClick={() => setResultsExpanded(!resultsExpanded)}
          className="h-7 px-3 flex items-center justify-between cursor-pointer hover:bg-slate-900/80 transition-colors shrink-0 select-none"
        >
          <div className="flex items-center gap-2 text-xs">
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-semibold text-slate-300 text-[11px]">Results Studio</span>
            <span className="text-slate-500 text-[11px] hidden sm:inline">— Multi-Case Enveloping & Diagram Peaks</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="text-[10px] text-slate-500">
              {resultsExpanded ? 'Minimize drawer' : 'View envelopes'}
            </span>
            {resultsExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
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
