import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { engineInstance } from '../engine/AnalysisEngine';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, X, Cpu } from 'lucide-react';

export function PerformanceOverlay() {
  const isOpen = useStore(state => state.performanceMonitorOpen);
  const setOpen = useStore(state => state.setPerformanceMonitorOpen);
  
  const [metrics, setMetrics] = useState<{ calcTime: number, totalReqs: number, type: string }>({
    calcTime: 0,
    totalReqs: 0,
    type: 'IDLE'
  });

  useEffect(() => {
    let reqCount = 0;
    const unsub = engineInstance.on('analysis:complete', (data) => {
      reqCount++;
      setMetrics({
        calcTime: data.metrics.calculationTimeMs,
        totalReqs: reqCount,
        type: data.type
      });
    });
    return unsub;
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 left-6 z-50 w-72 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-800 overflow-hidden font-mono"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-800/50">
            <div className="flex items-center gap-2 text-indigo-400">
              <Activity size={16} />
              <span className="text-sm font-semibold tracking-wider">ENGINE DIAGNOSTICS</span>
            </div>
            <button 
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          
          <div className="p-4 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-xs">SOLVER THREAD</span>
              <span className="text-emerald-400 text-xs flex items-center gap-1"><Cpu size={12}/> Worker Active</span>
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Last Calc Time</span>
                <span className="font-semibold">{metrics.calcTime.toFixed(2)} ms</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
                <div 
                  className="bg-indigo-500 h-full rounded-full transition-all duration-75"
                  style={{ width: `${Math.min(100, (metrics.calcTime / 16) * 100)}%` }} // 16ms budget
                />
              </div>
            </div>

            <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-800">
              <span className="text-slate-400">Analysis Type</span>
              <span className={metrics.type === 'PREVIEW' ? 'text-amber-400' : 'text-blue-400'}>
                {metrics.type}
              </span>
            </div>
            
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Total Calculations</span>
              <span className="text-slate-200">{metrics.totalReqs}</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
