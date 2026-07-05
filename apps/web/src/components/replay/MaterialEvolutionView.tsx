import { PlaybackScene } from './PlaybackEngine';

interface Props {
  sceneId: PlaybackScene;
  localProgress: number;
}

export function MaterialEvolutionView({ sceneId, localProgress }: Props) {
  // We conceptualize the state based on the timeline.
  // Up to Deflection: elastic. 
  // Stress / Critical: we push localProgress to visualize extreme stress (conceptually approaching yield).

  const isStressPhase = sceneId >= PlaybackScene.Stress;
  const stressProgress = sceneId === PlaybackScene.Stress ? localProgress : (sceneId > PlaybackScene.Stress ? 1 : 0);

  // We'll draw a conceptual I-beam cross section and its strain/stress diagram
  const w = 200;
  const h = 240;
  
  // Rotation of the strain diagram (conceptual bending)
  const maxStrainAngle = 15 * stressProgress; 

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-3xl border border-slate-700 p-6 overflow-hidden relative shadow-2xl">
      <div className="absolute top-0 right-0 p-4">
        <span className="text-xs font-mono tracking-widest text-indigo-400 uppercase border border-indigo-500/30 bg-indigo-500/10 px-2 py-1 rounded">
          {isStressPhase ? 'Stress Evolution' : 'Material State'}
        </span>
      </div>

      <h3 className="text-white font-bold text-lg mb-2">Cross-Section Behaviour</h3>
      <p className="text-sm text-slate-400 mb-8 max-w-[200px] leading-relaxed">
        Conceptual view of internal strain and stress distribution.
      </p>

      <div className="flex-1 flex items-center justify-center gap-12 relative">
        
        {/* Conceptual I-Beam Section */}
        <svg width={w} height={h} viewBox="0 0 100 120" className="drop-shadow-2xl">
          <defs>
            <linearGradient id="compression-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={stressProgress * 0.8} />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="tension-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={stressProgress * 0.8} />
            </linearGradient>
          </defs>

          {/* Neutral axis dashed line */}
          <line x1="-20" y1="60" x2="120" y2="60" stroke="#64748b" strokeWidth="1" strokeDasharray="4 4" />
          <text x="115" y="58" fill="#64748b" fontSize="6" fontFamily="monospace">N.A.</text>

          {/* I-Beam Shape */}
          <path d="M 20 10 L 80 10 L 80 20 L 55 20 L 55 100 L 80 100 L 80 110 L 20 110 L 20 100 L 45 100 L 45 20 L 20 20 Z" 
                fill="#1e293b" stroke="#475569" strokeWidth="1" />

          {/* Stress Heatmap Overlays */}
          {isStressPhase && (
            <>
              {/* Compression top */}
              <path d="M 20 10 L 80 10 L 80 20 L 55 20 L 55 60 L 45 60 L 45 20 L 20 20 Z" fill="url(#compression-grad)" />
              {/* Tension bottom */}
              <path d="M 45 60 L 55 60 L 55 100 L 80 100 L 80 110 L 20 110 L 20 100 L 45 100 Z" fill="url(#tension-grad)" />
            </>
          )}
        </svg>

        {/* Conceptual Strain/Stress Graph */}
        <div className="w-32 h-[240px] relative border-l border-slate-700 flex flex-col justify-between py-6">
          <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-px bg-slate-700 border-dashed" />
          
          {isStressPhase && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
              {/* Strain profile line */}
              <g style={{ transform: `rotate(${maxStrainAngle}deg)`, transformOrigin: '0% 50%', transition: 'transform 0.1s linear' }}>
                <line x1="0" y1="-100" x2="0" y2="100" stroke="#cbd5e1" strokeWidth="2" y="120" />
                {/* Horizontal tie lines */}
                <line x1="0" y1="-90" x2="-25" y2="-90" stroke="#ef4444" strokeWidth="1.5" y="120" />
                <line x1="0" y1="-45" x2="-12.5" y2="-45" stroke="#ef4444" strokeWidth="1.5" y="120" />
                <line x1="0" y1="45" x2="12.5" y2="45" stroke="#3b82f6" strokeWidth="1.5" y="120" />
                <line x1="0" y1="90" x2="25" y2="90" stroke="#3b82f6" strokeWidth="1.5" y="120" />
                
                {/* Envelope */}
                <polygon points="0,120 -25,30 0,30" fill="#ef4444" opacity="0.2" />
                <polygon points="0,120 25,210 0,210" fill="#3b82f6" opacity="0.2" />
              </g>
            </svg>
          )}

          {isStressPhase && (
            <>
              <div className="absolute top-4 left-4 text-red-400 font-mono text-xs">σ_c</div>
              <div className="absolute bottom-4 left-4 text-blue-400 font-mono text-xs">σ_t</div>
            </>
          )}
        </div>

      </div>
      
      {/* Narrative Footer */}
      <div className="mt-4 pt-4 border-t border-slate-800 text-slate-400 text-xs">
        {sceneId < PlaybackScene.BMD ? 'Awaiting internal bending moments.' : 
         sceneId < PlaybackScene.Stress ? 'Strain profile developing linearly.' : 
         'Bending stresses: Max compression at top, max tension at bottom.'}
      </div>
    </div>
  );
}
