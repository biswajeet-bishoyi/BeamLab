import { motion } from 'framer-motion';
import type { PresentationTheme } from '../presentationThemes';
import { useStore } from '../../../store';

interface Props { theme: PresentationTheme; }

export function MaterialSlide({ theme }: Props) {
  const model = useStore(s => s.model);

  return (
    <div className="flex flex-col h-full px-16 py-12">
      <motion.h2 initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
        className="text-5xl font-black mb-3" style={{ color: theme.text }}>
        Material & Section Properties
      </motion.h2>
      <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.15, duration: 0.5 }}
        className="h-1 w-24 rounded mb-10" style={{ background: theme.accent }} />

      <div className="flex gap-8 flex-1">
        {/* Material */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="flex-1 rounded-3xl border p-10 flex flex-col"
          style={{ background: theme.cardBg, borderColor: theme.border }}
        >
          <div className="text-6xl mb-6">🧱</div>
          <h3 className="text-3xl font-bold mb-8" style={{ color: theme.text }}>Material</h3>
          
          {model.material ? (
            <div className="space-y-6">
              <div>
                <p className="text-sm tracking-widest uppercase mb-1" style={{ color: theme.textMuted }}>Name</p>
                <p className="text-4xl font-black" style={{ color: theme.accent }}>{model.material.name}</p>
              </div>
              <div>
                <p className="text-sm tracking-widest uppercase mb-1" style={{ color: theme.textMuted }}>Young's Modulus (E)</p>
                <p className="text-3xl font-mono" style={{ color: theme.text }}>{(model.material.E / 1e9).toFixed(1)} <span className="text-xl" style={{ color: theme.textMuted }}>GPa</span></p>
              </div>
              <div>
                <p className="text-sm tracking-widest uppercase mb-1" style={{ color: theme.textMuted }}>Density (ρ)</p>
                <p className="text-3xl font-mono" style={{ color: theme.text }}>{model.material.density.toFixed(0)} <span className="text-xl" style={{ color: theme.textMuted }}>kg/m³</span></p>
              </div>
            </div>
          ) : (
            <div className="text-2xl font-light italic opacity-50" style={{ color: theme.textMuted }}>Not configured</div>
          )}
        </motion.div>

        {/* Section */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="flex-1 rounded-3xl border p-10 flex flex-col"
          style={{ background: theme.cardBg, borderColor: theme.border }}
        >
          <div className="text-6xl mb-6">📐</div>
          <h3 className="text-3xl font-bold mb-8" style={{ color: theme.text }}>Cross Section</h3>
          
          {model.section ? (
            <div className="space-y-6">
              <div>
                <p className="text-sm tracking-widest uppercase mb-1" style={{ color: theme.textMuted }}>Designation</p>
                <p className="text-4xl font-black" style={{ color: theme.accent }}>{model.section.name}</p>
              </div>
              <div>
                <p className="text-sm tracking-widest uppercase mb-1" style={{ color: theme.textMuted }}>Moment of Inertia (I)</p>
                <p className="text-3xl font-mono" style={{ color: theme.text }}>{model.section.momentOfInertia.toExponential(3)} <span className="text-xl" style={{ color: theme.textMuted }}>m⁴</span></p>
              </div>
              <div>
                <p className="text-sm tracking-widest uppercase mb-1" style={{ color: theme.textMuted }}>Cross-Sectional Area (A)</p>
                <p className="text-3xl font-mono" style={{ color: theme.text }}>{model.section.area.toExponential(3)} <span className="text-xl" style={{ color: theme.textMuted }}>m²</span></p>
              </div>
            </div>
          ) : (
            <div className="text-2xl font-light italic opacity-50" style={{ color: theme.textMuted }}>Not configured</div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
