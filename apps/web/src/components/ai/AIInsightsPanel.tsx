import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertTriangle, CheckCircle2, Ruler, Layers } from 'lucide-react';
import { useStore } from '../../store';

function calculateIntelligence(model: any, analysisResult: any) {
  const warnings: string[] = [];
  const recommendations: string[] = [];
  
  let completeness = 0;
  if (model.material) completeness += 25;
  if (model.section) completeness += 25;
  if (model.supports.length > 0) completeness += 25;
  if (model.loads.length > 0) completeness += 25;

  let stabilityState = 'Under-Constrained';
  let solverConfidence = 0;

  const hasFixed = model.supports.some((s: any) => s.type === 'fixed');
  const hasPin = model.supports.some((s: any) => s.type === 'pin');
  const rollerCount = model.supports.filter((s: any) => s.type === 'roller').length;

  if (hasFixed) {
    stabilityState = 'Stable';
  } else if (hasPin && rollerCount >= 1) {
    stabilityState = 'Stable';
  } else if (model.supports.length === 0) {
    stabilityState = 'Floating';
    warnings.push('Beam is floating — no supports defined.');
    recommendations.push('Add a Pin + Roller support.');
  } else if (!hasPin && !hasFixed && rollerCount > 0) {
    stabilityState = 'Horizontal Mechanism';
    warnings.push('Beam can slide horizontally.');
    recommendations.push('Change one Roller to a Pin support.');
  } else if (hasPin && rollerCount === 0) {
    stabilityState = 'Rotational Mechanism';
    warnings.push('Beam can rotate freely around pin.');
    recommendations.push('Add a Roller support.');
  }

  if (model.loads.length === 0) {
    warnings.push('No loads applied.');
    recommendations.push('Add at least one Point Load or UDL.');
  }

  if (completeness === 100 && stabilityState === 'Stable') {
    solverConfidence = 99.8;
  } else if (stabilityState === 'Stable') {
    solverConfidence = 75;
  } else {
    solverConfidence = 10;
  }

  const healthScore = Math.round((completeness * 0.4) + (solverConfidence * 0.6));
  
  let deflectionWarning: string | null = null;
  let stressWarning: string | null = null;
  
  if (analysisResult) {
    const forces = analysisResult.internalForces;
    const maxDeflection = Math.max(...forces.map((f: any) => Math.abs(f.deflection)));
    const deflectionRatio = maxDeflection > 0 ? model.span / maxDeflection : Infinity;
    if (deflectionRatio < 250) deflectionWarning = `Deflection L/${Math.floor(deflectionRatio)} exceeds L/250 serviceability limit.`;

    const maxStress = Math.max(...forces.map((f: any) => Math.abs(f.stress)));
    if (maxStress > 250e6) stressWarning = `Bending stress ${(maxStress / 1e6).toFixed(0)} MPa exceeds steel yield (250 MPa).`;
  }

  return { healthScore, stabilityState, warnings, recommendations, completeness, solverConfidence, deflectionWarning, stressWarning };
}

export function AIInsightsPanel() {
  const model = useStore(s => s.model);
  const analysisResult = useStore(s => s.analysisResult);
  const intelligence = useMemo(() => calculateIntelligence(model, analysisResult), [model, analysisResult]);

  const healthColor = intelligence.healthScore > 80
    ? 'text-emerald-400' : intelligence.healthScore > 50
    ? 'text-yellow-400' : 'text-red-400';

  const ringColor = intelligence.healthScore > 80
    ? 'stroke-emerald-500' : intelligence.healthScore > 50
    ? 'stroke-yellow-500' : 'stroke-red-500';

  const circumference = 2 * Math.PI * 28;
  const dashOffset = circumference * (1 - intelligence.healthScore / 100);

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto custom-scrollbar">
      
      {/* Health Score Ring */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Activity size={12} /> Model Health
        </h3>
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 shrink-0">
            <svg width="64" height="64" className="rotate-[-90deg]">
              <circle cx="32" cy="32" r="28" fill="none" className="stroke-slate-700" strokeWidth="5" />
              <motion.circle
                cx="32" cy="32" r="28" fill="none"
                className={ringColor}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: dashOffset }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-sm font-black ${healthColor}`}>{intelligence.healthScore}</span>
            </div>
          </div>
          <div>
            <p className={`font-bold text-sm ${healthColor}`}>{intelligence.stabilityState}</p>
            <p className="text-xs text-slate-400">{intelligence.completeness}% complete</p>
          </div>
        </div>
      </div>

      {/* Model Snapshot */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Ruler size={12} /> Current Model
        </h3>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-400">Span</span>
            <span className="text-white font-mono">{model.span.toFixed(1)} m</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Supports</span>
            <span className="text-white font-mono">{model.supports.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Loads</span>
            <span className="text-white font-mono">{model.loads.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Material</span>
            <span className="text-white font-mono truncate max-w-[100px]">{model.material?.name ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Section</span>
            <span className="text-white font-mono">{model.section?.name ?? '—'}</span>
          </div>
        </div>
      </div>

      {/* Live Results */}
      {analysisResult && (
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Layers size={12} /> Key Results
          </h3>
          <div className="space-y-2 text-xs">
            {(() => {
              const f = analysisResult.internalForces;
              const maxShear = Math.max(...f.map((p: any) => Math.abs(p.v)));
              const maxMoment = Math.max(...f.map((p: any) => Math.abs(p.m)));
              const maxDeflect = Math.max(...f.map((p: any) => Math.abs(p.deflection)));
              const maxStress = Math.max(...f.map((p: any) => Math.abs(p.stress)));
              return (
                <>
                  <div className="flex justify-between"><span className="text-slate-400">Max Shear</span><span className="text-red-400 font-mono">{(maxShear/1000).toFixed(2)} kN</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Max Moment</span><span className="text-blue-400 font-mono">{(maxMoment/1000).toFixed(2)} kN·m</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Max Deflection</span><span className="text-emerald-400 font-mono">{(maxDeflect*1000).toFixed(2)} mm</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Max Stress</span><span className={`font-mono ${maxStress > 250e6 ? 'text-red-400' : 'text-slate-300'}`}>{(maxStress/1e6).toFixed(1)} MPa</span></div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Warnings */}
      {(intelligence.warnings.length > 0 || intelligence.deflectionWarning || intelligence.stressWarning) && (
        <div className="bg-amber-900/20 border border-amber-700/40 rounded-2xl p-4">
          <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <AlertTriangle size={12} /> Insights
          </h3>
          <div className="space-y-2">
            {[...intelligence.warnings, intelligence.deflectionWarning, intelligence.stressWarning].filter(Boolean).map((w, i) => (
              <p key={i} className="text-xs text-amber-200">{w}</p>
            ))}
          </div>
        </div>
      )}

      {/* All clear */}
      {intelligence.warnings.length === 0 && !intelligence.deflectionWarning && !intelligence.stressWarning && intelligence.healthScore > 80 && (
        <div className="bg-emerald-900/20 border border-emerald-700/40 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <p className="text-xs text-emerald-200">Design looks good! No issues detected.</p>
        </div>
      )}
    </div>
  );
}
