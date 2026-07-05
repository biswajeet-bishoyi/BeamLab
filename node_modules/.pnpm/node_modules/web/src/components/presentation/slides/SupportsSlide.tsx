import { motion } from 'framer-motion';
import type { PresentationTheme } from '../presentationThemes';
import { useStore } from '../../../store';

interface Props { theme: PresentationTheme; }

export function SupportsSlide({ theme }: Props) {
  const model = useStore(s => s.model);

  return (
    <div className="flex flex-col h-full px-16 py-12">
      <motion.h2 initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
        className="text-5xl font-black mb-3" style={{ color: theme.text }}>
        Support Conditions
      </motion.h2>
      <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.15, duration: 0.5 }}
        className="h-1 w-24 rounded mb-10" style={{ background: theme.accent }} />

      <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="text-xl mb-12 max-w-3xl leading-relaxed" style={{ color: theme.textMuted }}>
        Boundary conditions defining how the structure interacts with its environment.
      </motion.p>

      {model.supports.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-2xl font-light italic" style={{ color: theme.textMuted }}>
          No supports defined (Free body)
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-6 flex-1">
          {model.supports.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="flex flex-col p-8 rounded-3xl border relative overflow-hidden group"
              style={{ background: theme.cardBg, borderColor: theme.border }}
            >
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-20 transition-opacity group-hover:opacity-40" 
                style={{ background: theme.accent }} />
                
              <span className="text-sm tracking-widest uppercase font-bold mb-4" style={{ color: theme.textMuted }}>
                Support {i + 1}
              </span>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg border"
                  style={{ background: theme.surface, borderColor: theme.border, color: theme.text }}>
                  {s.type === 'pin' ? '🔺' : s.type === 'roller' ? '⚪' : '🧱'}
                </div>
                <div>
                  <h3 className="text-3xl font-black capitalize" style={{ color: theme.text }}>{s.type}</h3>
                  <p className="text-lg" style={{ color: theme.textMuted }}>Restraints: {s.type === 'fixed' ? 'X, Y, M' : s.type === 'pin' ? 'X, Y' : 'Y'}</p>
                </div>
              </div>
              <div className="mt-auto">
                <span className="text-sm tracking-widest uppercase mb-1 block" style={{ color: theme.textMuted }}>Location</span>
                <span className="text-4xl font-mono" style={{ color: theme.accent }}>x = {s.position.toFixed(2)}m</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
