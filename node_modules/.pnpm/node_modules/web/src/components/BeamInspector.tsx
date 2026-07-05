import { useStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';

export function BeamInspector() {
  const analysisResult = useStore(state => state.analysisResult);
  const hoveredX = useStore(state => state.hoveredX);
  const mouseX = useStore(state => state.mouseX);
  const mouseY = useStore(state => state.mouseY);

  if (hoveredX === null || mouseX === null || mouseY === null || !analysisResult || !analysisResult.internalForces.length) {
    return null;
  }

  const closest = analysisResult.internalForces.reduce((prev, curr) => 
    Math.abs(curr.x - hoveredX) < Math.abs(prev.x - hoveredX) ? curr : prev
  );

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        style={{ left: mouseX + 24, top: mouseY + 24 }}
        className="fixed z-[100] glass-panel rounded-xl p-4 shadow-2xl w-64 text-sm border border-slate-200 dark:border-slate-700 pointer-events-none"
      >
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2 mb-3">
          <span className="font-semibold text-slate-800 dark:text-slate-100">Inspector</span>
          <span className="font-mono bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-0.5 rounded text-xs">
            x = {closest.x.toFixed(2)}m
          </span>
        </div>
        
        <div className="flex flex-col gap-2">
          <InspectorRow label="Shear (V)" value={closest.v.toFixed(1)} unit="N" />
          <InspectorRow label="Moment (M)" value={closest.m.toFixed(1)} unit="N·m" />
          <InspectorRow label="Deflection" value={(closest.deflection * 1000).toFixed(2)} unit="mm" />
          <InspectorRow label="Stress" value={(closest.stress / 1e6).toFixed(2)} unit="MPa" />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function InspectorRow({ label, value, unit }: { label: string, value: string, unit: string }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-slate-500 dark:text-slate-400 text-xs">{label}</span>
      <div className="flex gap-1 items-baseline font-mono text-slate-800 dark:text-slate-200">
        <span className="font-semibold">{value}</span>
        <span className="text-xs text-slate-400">{unit}</span>
      </div>
    </div>
  );
}
