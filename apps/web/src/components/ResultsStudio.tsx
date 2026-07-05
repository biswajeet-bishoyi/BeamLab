import { useStore } from '../store';
import { DiagramChart } from './DiagramChart';
import { PlaybackScene } from './replay/PlaybackEngine';
import { motion } from 'framer-motion';

interface ResultsStudioProps {
  isPlaybackMode?: boolean;
  sceneId?: PlaybackScene;
  localProgress?: number;
}

export function ResultsStudio({ isPlaybackMode = false, sceneId, localProgress = 1 }: ResultsStudioProps) {
  const analysisResult = useStore(state => state.analysisResult);
  const ghostAnalysisResult = useStore(state => state.ghostAnalysisResult);
  const model = useStore(state => state.model);

  if (!analysisResult || analysisResult.internalForces.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500 dark:text-slate-400 italic bg-white/50 dark:bg-slate-900/30 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-sm mx-4 mb-4 shadow-inner">
        Solve the model to view interactive diagrams.
      </div>
    );
  }

  const forces = analysisResult.internalForces;
  
  // Calculate draw progress for diagrams based on scene
  const getDrawProgress = (targetScene: PlaybackScene) => {
    if (!isPlaybackMode) return 1;
    if (sceneId! > targetScene) return 1;
    if (sceneId! < targetScene) return 0;
    return localProgress;
  };

  return (
    <div className="flex flex-col gap-6 p-4">
      <motion.div 
        id="replay-sfd"
        className="diagram-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <DiagramChart 
          data={forces} 
          type="shear" 
          span={model.span} 
          width={800} 
          height={200} 
          drawProgress={getDrawProgress(PlaybackScene.SFD)}
          isPlaybackMode={isPlaybackMode}
          highlightCritical={sceneId === PlaybackScene.CriticalLocations}
          ghostData={ghostAnalysisResult?.internalForces}
        />
      </motion.div>

      <motion.div 
        id="replay-bmd"
        className="diagram-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <DiagramChart 
          data={forces} 
          type="moment" 
          span={model.span} 
          width={800} 
          height={200} 
          drawProgress={getDrawProgress(PlaybackScene.BMD)}
          isPlaybackMode={isPlaybackMode}
          highlightCritical={sceneId === PlaybackScene.CriticalLocations}
          ghostData={ghostAnalysisResult?.internalForces}
        />
      </motion.div>

      <motion.div 
        id="replay-deflection"
        className="diagram-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <DiagramChart 
          data={forces} 
          type="deflection" 
          span={model.span} 
          width={800} 
          height={200} 
          drawProgress={getDrawProgress(PlaybackScene.Deflection)}
          isPlaybackMode={isPlaybackMode}
          highlightCritical={sceneId === PlaybackScene.CriticalLocations}
          ghostData={ghostAnalysisResult?.internalForces}
        />
      </motion.div>
    </div>
  );
}
