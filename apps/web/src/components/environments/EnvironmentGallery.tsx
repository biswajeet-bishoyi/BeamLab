import { motion } from 'framer-motion';
import { X, CheckCircle2 } from 'lucide-react';
import { useStore, type EnvironmentId } from '../../store';
import { BlueprintScene } from './scenes/BlueprintScene';
import { ResidentialScene } from './scenes/ResidentialScene';
import { BridgeScene } from './scenes/BridgeScene';
import { IndustrialScene } from './scenes/IndustrialScene';
import { CommercialScene } from './scenes/CommercialScene';
import { ConstructionScene } from './scenes/ConstructionScene';
import { ResearchScene } from './scenes/ResearchScene';

interface EnvCard {
  id: EnvironmentId;
  label: string;
  emoji: string;
  desc: string;
  tags: string[];
  Scene: React.FC<{ width: number; height: number }>;
}

const ENVIRONMENTS: EnvCard[] = [
  {
    id: 'none',
    label: 'No Environment',
    emoji: '◻️',
    desc: 'Clean analytical workspace with dot-grid background.',
    tags: ['Default'],
    Scene: () => (
      <svg width={240} height={120}>
        <rect width={240} height={120} fill="#f8fafc" />
        <pattern id="ng" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx={10} cy={10} r={1} fill="#cbd5e1" />
        </pattern>
        <rect width={240} height={120} fill="url(#ng)" />
      </svg>
    ),
  },
  { id: 'blueprint',    label: 'Blueprint Studio',    emoji: '📐', desc: 'Engineering drafting room. Perfect for reports and presentations.',  tags: ['Drafting', 'Report'],      Scene: BlueprintScene },
  { id: 'residential',  label: 'Residential House',   emoji: '🏠', desc: 'Floor beams, roof beams and lintels in a domestic structure.',       tags: ['Housing', 'Floor Beam'],   Scene: ResidentialScene },
  { id: 'bridge',       label: 'Bridge Engineering',  emoji: '🌉', desc: 'Highway bridge girder over a river valley. Cinematic perspective.',   tags: ['Bridge', 'Girder'],        Scene: BridgeScene },
  { id: 'industrial',   label: 'Industrial Facility', emoji: '🏭', desc: 'Warehouse overhead crane beam. Heavy industrial framing.',            tags: ['Warehouse', 'Crane'],      Scene: IndustrialScene },
  { id: 'commercial',   label: 'Commercial Building', emoji: '🏢', desc: 'Multi-storey office building with transfer beam at night.',           tags: ['High-Rise', 'Transfer'],   Scene: CommercialScene },
  { id: 'construction', label: 'Construction Site',   emoji: '🚧', desc: 'Active site with tower crane, scaffolding, and earthworks.',          tags: ['Site', 'Temporary'],       Scene: ConstructionScene },
  { id: 'research',     label: 'Research Laboratory', emoji: '🧪', desc: 'Clean scientific environment for academic and research use.',          tags: ['Academic', 'Lab'],         Scene: ResearchScene },
];

interface Props {
  onClose: () => void;
}

export function EnvironmentGallery({ onClose }: Props) {
  const activeEnvironment = useStore(s => s.activeEnvironment);
  const setEnvironment    = useStore(s => s.setEnvironment);
  const model             = useStore(s => s.model);

  // Smart suggestion based on model context (simple heuristic)
  const getSuggested = (): EnvironmentId => {
    const span = model.span;
    if (span > 20) return 'bridge';
    if (model.loads.some((l: any) => Math.abs(l.magnitude) > 500000)) return 'industrial';
    if (span > 10) return 'commercial';
    return 'residential';
  };
  const suggested = getSuggested();

  const handleSelect = (id: EnvironmentId) => {
    setEnvironment(id);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[140] bg-slate-950/90 backdrop-blur-xl flex flex-col font-sans"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="flex flex-col h-full max-w-6xl mx-auto w-full p-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              🌍 Engineering Context Mode
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Place your structural model in a real-world environment. Calculations are unaffected.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-red-600 hover:border-red-600 text-slate-300 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Suggested banner */}
        <div className="mb-4 px-4 py-3 rounded-xl bg-indigo-900/40 border border-indigo-700/50 flex items-center gap-3">
          <span className="text-indigo-300 text-sm">✨ <strong>Suggested for your model:</strong></span>
          <button
            onClick={() => handleSelect(suggested)}
            className="text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 px-3 py-1 rounded-lg transition-colors"
          >
            {ENVIRONMENTS.find(e => e.id === suggested)?.emoji} {ENVIRONMENTS.find(e => e.id === suggested)?.label}
          </button>
          <span className="text-slate-500 text-xs">Based on span = {model.span.toFixed(1)}m and loads</span>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-6">
            {ENVIRONMENTS.map((env, i) => {
              const isActive = activeEnvironment === env.id;
              const isSuggested = suggested === env.id;
              return (
                <motion.button
                  key={env.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  whileHover={{ scale: 1.03, y: -3 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleSelect(env.id)}
                  className={`flex flex-col rounded-2xl overflow-hidden border-2 transition-all text-left shadow-lg ${
                    isActive
                      ? 'border-indigo-500 ring-2 ring-indigo-500/30'
                      : isSuggested
                      ? 'border-yellow-500/60 hover:border-yellow-400'
                      : 'border-slate-700 hover:border-slate-500'
                  } bg-slate-900`}
                >
                  {/* Preview thumbnail */}
                  <div className="w-full h-28 overflow-hidden relative shrink-0">
                    <div style={{ transform: 'scale(0.6)', transformOrigin: 'top left', width: '166%', height: '166%', pointerEvents: 'none' }}>
                      <env.Scene width={400} height={200} />
                    </div>
                    {isActive && (
                      <div className="absolute inset-0 bg-indigo-500/10 flex items-center justify-center">
                        <CheckCircle2 size={32} className="text-indigo-400" />
                      </div>
                    )}
                    {isSuggested && !isActive && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-yellow-500 text-black text-xs font-bold">
                        Suggested
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{env.emoji}</span>
                      <span className="font-semibold text-white text-sm">{env.label}</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed mb-2">{env.desc}</p>
                    <div className="flex flex-wrap gap-1">
                      {env.tags.map(t => (
                        <span key={t} className="px-1.5 py-0.5 rounded text-xs bg-slate-800 text-slate-400 border border-slate-700">{t}</span>
                      ))}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
