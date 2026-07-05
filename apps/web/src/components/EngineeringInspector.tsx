import { useStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { Crosshair } from 'lucide-react';
import type { InternalForcePoint } from '@beamworks/core-engine/solver/internalForces';
import { toForce, toMoment } from '@beamworks/core-engine/units/brands';

export function EngineeringInspector() {
  const hoveredX = useStore(state => state.hoveredX);
  const mouseX = useStore(state => state.mouseX);
  const mouseY = useStore(state => state.mouseY);
  const analysisResult = useStore(state => state.analysisResult);

  if (hoveredX === null || mouseX === null || mouseY === null || !analysisResult || analysisResult.internalForces.length === 0) {
    return null;
  }

  // Interpolate values based on hoveredX
  const forces = analysisResult.internalForces;
  let exactData: InternalForcePoint = forces[0];
  
  // Find closest point or interpolate
  for (let i = 0; i < forces.length - 1; i++) {
    const p1 = forces[i];
    const p2 = forces[i+1];
    if (hoveredX >= p1.x && hoveredX <= p2.x) {
      // Linear interpolation
      const t = (hoveredX - p1.x) / (p2.x - p1.x || 1);
      exactData = {
        x: hoveredX,
        v: toForce(p1.v + t * (p2.v - p1.v)),
        m: toMoment(p1.m + t * (p2.m - p1.m)),
        deflection: p1.deflection + t * (p2.deflection - p1.deflection),
        stress: p1.stress + t * (p2.stress - p1.stress)
      };
      break;
    }
  }

  // Convert to user-friendly units
  const posM = exactData.x.toFixed(2);
  const shearKN = (exactData.v / 1000).toFixed(1);
  const momentKNm = (exactData.m / 1000).toFixed(1);
  const deflMM = (exactData.deflection * 1000).toFixed(2);
  const stressMPa = (exactData.stress / 1000000).toFixed(1);

  // Offset tooltip so it doesn't block the cursor
  const tooltipX = mouseX + 20;
  const tooltipY = mouseY + 20;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1, x: tooltipX, y: tooltipY }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed top-0 left-0 z-50 pointer-events-none"
      >
        <div className="bg-slate-900/90 dark:bg-black/90 backdrop-blur-xl border border-slate-700 dark:border-slate-800 p-4 rounded-2xl shadow-2xl text-white min-w-[200px]">
          <div className="flex items-center gap-2 text-indigo-400 font-bold mb-3 pb-2 border-b border-slate-700/50">
            <Crosshair size={16} /> 
            <span>Position: {posM} m</span>
          </div>
          
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Shear</span>
              <span className="font-mono text-sm font-semibold">{shearKN} <span className="text-slate-500 text-xs">kN</span></span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Moment</span>
              <span className="font-mono text-sm font-semibold">{momentKNm} <span className="text-slate-500 text-xs">kNm</span></span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Deflection</span>
              <span className="font-mono text-sm font-semibold">{deflMM} <span className="text-slate-500 text-xs">mm</span></span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Stress</span>
              <span className="font-mono text-sm font-semibold">{stressMPa} <span className="text-slate-500 text-xs">MPa</span></span>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
