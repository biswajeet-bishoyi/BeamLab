import React from 'react';
import { useStore } from '../store';
import { EngineeringInspector } from '../components/EngineeringInspector';
import { EnvironmentLayer } from '../components/environments/EnvironmentLayer';
import { BeamCanvas } from '../components/BeamCanvas';
import { ResultsStudio } from '../components/ResultsStudio';
import { LeftToolbox } from '../components/LeftToolbox';

export const CenterWorkspace: React.FC = () => {
  const activeEnvironment = useStore(state => state.activeEnvironment);

  return (
    <div className="flex flex-col h-full bg-[#111111] relative overflow-hidden custom-scrollbar">
      {/* LEFT TOOLBOX (Floating) */}
      <LeftToolbox />

      {/* CENTER CANVAS */}
      <div className="absolute inset-0 pt-24 pb-8 pl-24 pr-8 flex flex-col pointer-events-none z-10 custom-scrollbar overflow-y-auto">
        <EngineeringInspector />
        
        {/* Beam Preview Area — environment layer sits behind canvas */}
        <div className="w-full h-[400px] shrink-0 flex items-center justify-center pointer-events-auto relative">
          <EnvironmentLayer environmentId={activeEnvironment} />
          <BeamCanvas />
        </div>
        
        {/* Interactive Diagram System */}
        <div className="w-full flex-1 pointer-events-auto flex justify-center pb-32">
          <ResultsStudio />
        </div>
      </div>
    </div>
  );
};
