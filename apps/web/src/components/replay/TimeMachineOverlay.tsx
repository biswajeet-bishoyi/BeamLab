import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Clock, Layers } from 'lucide-react';
import { useStore } from '../../store';
import { usePlaybackEngine } from './PlaybackEngine';
import { BeamCanvas } from '../BeamCanvas';
import { ResultsStudio } from '../ResultsStudio';
import { TimeMachineTrack } from './TimeMachineTrack';
import { TimeMachineNarrator } from './TimeMachineNarrator';
import { MaterialEvolutionView } from './MaterialEvolutionView';

interface Props {
  onClose: () => void;
}

export function TimeMachineOverlay({ onClose }: Props) {
  const engine = usePlaybackEngine();
  const setHoveredX = useStore(s => s.setHoveredX);

  useEffect(() => {
    setHoveredX(null);
    return () => setHoveredX(null);
  }, [setHoveredX]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
          e.preventDefault();
          engine.togglePlay();
          break;
        case 'ArrowRight':
          engine.stepForward();
          break;
        case 'ArrowLeft':
          engine.stepBackward();
          break;
        case 'Escape':
          onClose();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [engine, onClose]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-slate-950 flex flex-col overflow-hidden font-sans"
    >
      {/* Top Header */}
      <div className="flex-none px-6 py-4 flex items-center justify-between border-b border-slate-800 bg-slate-900 shadow-lg relative z-20">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
            <Clock size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white leading-tight">Engineering Time Machine</h2>
            <p className="text-slate-400 text-sm font-medium">Evolution of Structural Behaviour</p>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-slate-700 hover:border-red-500/50 transition-colors flex items-center gap-2 font-bold"
        >
          Exit Time Machine <X size={20} />
        </button>
      </div>

      {/* Main Content Workspace */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Side: Visualization (Beam + Diagrams) */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-950/50">
          
          <div className="flex-none h-[300px] flex items-center justify-center relative p-6 border-b border-slate-800/50">
            <div className="absolute top-4 left-6 flex items-center gap-2 text-slate-500 text-xs font-bold tracking-widest uppercase">
              <Layers size={14} /> Structural Model
            </div>
            
            <div className="w-full max-w-5xl transition-opacity duration-300">
              <BeamCanvas 
                isPlaybackMode={true} 
                sceneId={engine.currentScene.id}
                localProgress={engine.localProgress}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-950/80">
             <ResultsStudio 
               isPlaybackMode={true} 
               sceneId={engine.currentScene.id} 
               localProgress={engine.localProgress} 
             />
          </div>
        </div>

        {/* Right Side: Educational Overlays */}
        <div className="w-[380px] flex-none bg-slate-900 border-l border-slate-800 flex flex-col p-6 gap-6 shadow-[-10px_0_30px_rgba(0,0,0,0.5)] z-10">
          
          <div className="flex-1">
            <MaterialEvolutionView 
              sceneId={engine.currentScene.id} 
              localProgress={engine.localProgress} 
            />
          </div>

          <div className="flex-1">
            <TimeMachineNarrator 
              currentScene={engine.currentScene} 
            />
          </div>

        </div>

      </div>

      {/* Bottom Track (Timeline Scrubber) */}
      <TimeMachineTrack {...engine} />

    </motion.div>
  );
}
