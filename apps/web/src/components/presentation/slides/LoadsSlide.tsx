import { motion } from 'framer-motion';
import type { PresentationTheme } from '../presentationThemes';
import { useStore } from '../../../store';

interface Props { theme: PresentationTheme; }

export function LoadsSlide({ theme }: Props) {
  const model = useStore(s => s.model);

  return (
    <div className="flex flex-col h-full px-16 py-12">
      <motion.h2 initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
        className="text-5xl font-black mb-3" style={{ color: theme.text }}>
        Applied Loads
      </motion.h2>
      <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.15, duration: 0.5 }}
        className="h-1 w-24 rounded mb-10" style={{ background: theme.accent }} />

      <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="text-xl mb-12 max-w-3xl leading-relaxed" style={{ color: theme.textMuted }}>
        External forces acting upon the structural system.
      </motion.p>

      {model.loads.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-2xl font-light italic" style={{ color: theme.textMuted }}>
          No loads applied (Zero state)
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-6 flex-1 overflow-y-auto custom-scrollbar pr-4 pb-12">
          {model.loads.map((l: any, i) => (
            <motion.div
              key={l.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="flex flex-col p-8 rounded-3xl border relative overflow-hidden group"
              style={{ background: theme.cardBg, borderColor: theme.border }}
            >
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-10 transition-opacity group-hover:opacity-30" 
                style={{ background: theme.accent }} />
                
              <span className="text-sm tracking-widest uppercase font-bold mb-4" style={{ color: theme.textMuted }}>
                Load {i + 1}
              </span>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg border"
                  style={{ background: theme.surface, borderColor: theme.border, color: theme.text }}>
                  {l.type === 'point' ? '⬇️' : '⏬'}
                </div>
                <div>
                  <h3 className="text-3xl font-black capitalize" style={{ color: theme.text }}>
                    {l.type === 'distributed' ? 'UDL' : 'Point'}
                  </h3>
                  <p className="text-lg" style={{ color: theme.accent }}>
                    {(Math.abs(l.magnitude) / (l.type === 'distributed' ? 1 : 1000)).toFixed(1)} {l.type === 'distributed' ? 'N/m' : 'kN'}
                    {l.magnitude > 0 ? ' ↑' : ' ↓'}
                  </p>
                </div>
              </div>
              <div className="mt-auto pt-4 border-t" style={{ borderColor: theme.divider }}>
                <span className="text-sm tracking-widest uppercase mb-1 block" style={{ color: theme.textMuted }}>Range / Location</span>
                <span className="text-2xl font-mono" style={{ color: theme.text }}>
                  {l.type === 'point' 
                    ? `x = ${l.position.toFixed(2)}m` 
                    : `x = ${l.startPosition?.toFixed(2)}m → ${l.endPosition?.toFixed(2)}m`}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
