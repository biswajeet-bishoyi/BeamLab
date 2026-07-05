import { motion } from 'framer-motion';
import { useStore } from '../store';
import { Info, Maximize, Activity } from 'lucide-react';
import { useEffect, useState } from 'react';
import { engineInstance } from '../engine/AnalysisEngine';

export function StatusBar() {
  const model = useStore(state => state.model);
  const analysisError = useStore(state => state.analysisError);
  const hoveredX = useStore(state => state.hoveredX);
  const perfOpen = useStore(state => state.performanceMonitorOpen);
  const setPerfOpen = useStore(state => state.setPerformanceMonitorOpen);
  
  const [lastTime, setLastTime] = useState(0);

  useEffect(() => {
    return engineInstance.on('analysis:complete', (data) => {
      setLastTime(data.metrics.calculationTimeMs);
    });
  }, []);
  
  const solverStatus = analysisError 
    ? <span className="text-red-500 font-medium">Solver Failed: {analysisError.message}</span> 
    : <span className="text-emerald-500 font-medium flex items-center gap-1"><Activity size={12}/> Engine Active ({lastTime.toFixed(1)}ms)</span>;

  return (
    <motion.div 
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="absolute bottom-0 left-0 right-0 h-8 glass-panel border-t border-slate-200 dark:border-slate-800 z-50 flex items-center justify-between px-4 text-xs font-mono text-slate-500 dark:text-slate-400"
    >
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Info size={14} /> BeamLab Workspace
        </div>
        <div>
          Span: {model.span}m
        </div>
        <div>
          Cursor X: {hoveredX !== null ? `${hoveredX.toFixed(2)}m` : '-'}
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <button 
          onClick={() => setPerfOpen(!perfOpen)}
          className="hover:bg-slate-200/50 dark:hover:bg-slate-800/50 px-2 py-0.5 rounded transition-colors"
        >
          {solverStatus}
        </button>
        <div className="flex items-center gap-2">
          <Maximize size={14} /> 100%
        </div>
      </div>
    </motion.div>
  );
}
