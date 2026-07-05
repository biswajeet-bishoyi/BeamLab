import { motion } from 'framer-motion';
import type { PresentationTheme } from '../presentationThemes';
import { useStore } from '../../../store';

interface Props { theme: PresentationTheme; }

function StatCard({ label, value, unit, emoji, theme, delay }: {
  label: string; value: string; unit: string; emoji: string;
  theme: PresentationTheme; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 200 }}
      className="flex flex-col items-center gap-3 p-8 rounded-3xl border"
      style={{ background: theme.cardBg, borderColor: theme.border }}
    >
      <span className="text-4xl">{emoji}</span>
      <span className="text-4xl font-black" style={{ color: theme.accent }}>{value}</span>
      <span className="text-base font-medium" style={{ color: theme.textMuted }}>{unit}</span>
      <span className="text-sm tracking-widest uppercase font-semibold" style={{ color: theme.textMuted }}>{label}</span>
    </motion.div>
  );
}

export function OverviewSlide({ theme }: Props) {
  const model = useStore(s => s.model);
  const analysisResult = useStore(s => s.analysisResult);

  const maxShear    = analysisResult ? Math.max(...analysisResult.internalForces.map(f => Math.abs(f.v)))    : 0;
  const maxMoment   = analysisResult ? Math.max(...analysisResult.internalForces.map(f => Math.abs(f.m)))    : 0;
  const maxDeflect  = analysisResult ? Math.max(...analysisResult.internalForces.map(f => Math.abs(f.deflection))) : 0;

  const cards = [
    { label: 'Span',      value: model.span.toFixed(1), unit: 'metres',  emoji: '📏' },
    { label: 'Supports',  value: `${model.supports.length}`,  unit: 'nodes',   emoji: '🔺' },
    { label: 'Loads',     value: `${model.loads.length}`,     unit: 'applied', emoji: '⬇️' },
    { label: 'Max Shear', value: (maxShear/1000).toFixed(1),  unit: 'kN',      emoji: '↕️' },
    { label: 'Max Moment',value: (maxMoment/1000).toFixed(1), unit: 'kN·m',    emoji: '↩️' },
    { label: 'Max Deflection', value: (maxDeflect*1000).toFixed(2), unit: 'mm', emoji: '📉' },
  ];

  return (
    <div className="flex flex-col h-full px-16 py-12">
      <motion.h2 initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
        className="text-5xl font-black mb-3" style={{ color: theme.text }}>
        Project Overview
      </motion.h2>
      <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.15, duration: 0.5 }}
        className="h-1 w-24 rounded mb-10" style={{ background: theme.accent }} />

      <div className="grid grid-cols-3 gap-6 flex-1">
        {cards.map((c, i) => (
          <StatCard key={c.label} {...c} theme={theme} delay={0.1 + i * 0.08} />
        ))}
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
        className="mt-8 p-5 rounded-2xl border text-sm" style={{ borderColor: theme.border, color: theme.textMuted, background: theme.surface }}>
        Material: <strong style={{ color: theme.text }}>{model.material?.name ?? 'Not set'}</strong>
        &nbsp;·&nbsp; E = <strong style={{ color: theme.text }}>{model.material ? (model.material.E / 1e9).toFixed(0) : '—'} GPa</strong>
        &nbsp;·&nbsp; Section: <strong style={{ color: theme.text }}>{model.section?.name ?? 'Not set'}</strong>
        &nbsp;·&nbsp; I = <strong style={{ color: theme.text }}>{model.section ? model.section.momentOfInertia.toExponential(2) : '—'} m⁴</strong>
      </motion.div>
    </div>
  );
}
