import { motion } from 'framer-motion';
import type { PresentationTheme } from '../presentationThemes';
import { useStore } from '../../../store';

interface Props { theme: PresentationTheme; }

export function CriticalValuesSlide({ theme }: Props) {
  const analysisResult = useStore(s => s.analysisResult);
  const model = useStore(s => s.model);

  if (!analysisResult) {
    return (
      <div className="flex-1 flex items-center justify-center text-2xl font-light italic" style={{ color: theme.textMuted }}>
        Analysis required to view critical values
      </div>
    );
  }

  const forces = analysisResult.internalForces;
  const maxShearPt   = forces.reduce((max, p) => Math.abs(p.v) > Math.abs(max.v) ? p : max, forces[0]);
  const maxMomentPt  = forces.reduce((max, p) => Math.abs(p.m) > Math.abs(max.m) ? p : max, forces[0]);
  const maxDeflectPt = forces.reduce((max, p) => Math.abs(p.deflection) > Math.abs(max.deflection) ? p : max, forces[0]);
  const maxStressPt  = forces.reduce((max, p) => Math.abs(p.stress) > Math.abs(max.stress) ? p : max, forces[0]);

  const yieldStress = 250e6; // standard steel yield
  const deflectRatio = maxDeflectPt.deflection === 0 ? Infinity : model.span / Math.abs(maxDeflectPt.deflection);

  return (
    <div className="flex flex-col h-full px-16 py-12">
      <motion.h2 initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
        className="text-5xl font-black mb-3" style={{ color: theme.text }}>
        Critical Results Summary
      </motion.h2>
      <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.15, duration: 0.5 }}
        className="h-1 w-24 rounded mb-10" style={{ background: theme.accent }} />

      <div className="grid grid-cols-2 gap-8 flex-1 pb-12">
        {/* Shear */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-3xl border p-8 shadow-lg relative overflow-hidden" style={{ background: theme.cardBg, borderColor: theme.border }}>
          <div className="absolute top-0 left-0 w-2 h-full bg-red-500" />
          <h3 className="text-2xl font-bold mb-6 pl-4" style={{ color: theme.text }}>Maximum Shear Force</h3>
          <p className="text-5xl font-mono text-red-500 font-black pl-4">{(Math.abs(maxShearPt.v) / 1000).toFixed(2)} kN</p>
          <p className="mt-4 text-lg pl-4" style={{ color: theme.textMuted }}>Located at x = {maxShearPt.x.toFixed(2)}m</p>
        </motion.div>

        {/* Moment */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="rounded-3xl border p-8 shadow-lg relative overflow-hidden" style={{ background: theme.cardBg, borderColor: theme.border }}>
          <div className="absolute top-0 left-0 w-2 h-full bg-blue-500" />
          <h3 className="text-2xl font-bold mb-6 pl-4" style={{ color: theme.text }}>Maximum Bending Moment</h3>
          <p className="text-5xl font-mono text-blue-500 font-black pl-4">{(Math.abs(maxMomentPt.m) / 1000).toFixed(2)} kN·m</p>
          <p className="mt-4 text-lg pl-4" style={{ color: theme.textMuted }}>Located at x = {maxMomentPt.x.toFixed(2)}m</p>
        </motion.div>

        {/* Deflection */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="rounded-3xl border p-8 shadow-lg relative overflow-hidden" style={{ background: theme.cardBg, borderColor: theme.border }}>
          <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500" />
          <h3 className="text-2xl font-bold mb-6 pl-4" style={{ color: theme.text }}>Maximum Deflection</h3>
          <div className="pl-4 flex items-baseline gap-4">
            <p className="text-5xl font-mono text-emerald-500 font-black">{(Math.abs(maxDeflectPt.deflection) * 1000).toFixed(2)} mm</p>
            <p className="text-xl font-bold opacity-60 text-emerald-600">(L/{Math.floor(deflectRatio)})</p>
          </div>
          <p className="mt-4 text-lg pl-4" style={{ color: theme.textMuted }}>Located at x = {maxDeflectPt.x.toFixed(2)}m</p>
        </motion.div>

        {/* Stress */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="rounded-3xl border p-8 shadow-lg relative overflow-hidden" style={{ background: theme.cardBg, borderColor: theme.border }}>
          <div className="absolute top-0 left-0 w-2 h-full" style={{ background: Math.abs(maxStressPt.stress) > yieldStress ? '#ef4444' : '#f59e0b' }} />
          <h3 className="text-2xl font-bold mb-6 pl-4" style={{ color: theme.text }}>Maximum Bending Stress</h3>
          <div className="pl-4 flex items-baseline gap-4">
            <p className="text-5xl font-mono font-black" style={{ color: Math.abs(maxStressPt.stress) > yieldStress ? '#ef4444' : '#f59e0b' }}>
              {(Math.abs(maxStressPt.stress) / 1e6).toFixed(1)} MPa
            </p>
            {Math.abs(maxStressPt.stress) > yieldStress && (
              <span className="text-sm font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded">EXCEEDS YIELD</span>
            )}
          </div>
          <p className="mt-4 text-lg pl-4" style={{ color: theme.textMuted }}>Located at x = {maxStressPt.x.toFixed(2)}m</p>
        </motion.div>
      </div>
    </div>
  );
}
