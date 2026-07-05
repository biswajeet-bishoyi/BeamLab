import { motion } from 'framer-motion';
import type { PresentationTheme } from '../presentationThemes';
import { useStore } from '../../../store';

interface Props { theme: PresentationTheme; }

export function TitleSlide({ theme }: Props) {
  const model = useStore(s => s.model);
  const analysisResult = useStore(s => s.analysisResult);

  const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const beamType = (() => {
    const hasFixed = model.supports.some(s => s.type === 'fixed');
    const hasPin   = model.supports.some(s => s.type === 'pin');
    const rollers  = model.supports.filter(s => s.type === 'roller').length;
    if (hasFixed && rollers === 0) return 'Cantilever Beam';
    if (hasFixed && rollers >= 1) return 'Propped Cantilever Beam';
    if (hasPin && rollers === 1) return 'Simply Supported Beam';
    if (hasPin && rollers > 1) return 'Continuous Beam';
    return 'Structural Beam';
  })();

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-24 relative">
      {/* Decorative background rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        {[1, 2, 3].map(i => (
          <motion.div key={i}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 0.04 + i * 0.02, scale: 1 }}
            transition={{ delay: i * 0.15, duration: 1 }}
            className="absolute rounded-full border"
            style={{ width: i * 320, height: i * 320, borderColor: theme.accent }}
          />
        ))}
      </div>

      {/* Slide number badge */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="mb-10 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase"
        style={{ background: theme.accentGlow, color: theme.accentText, border: `1px solid ${theme.border}` }}
      >
        Structural Engineering Analysis
      </motion.div>

      {/* Beam type icon */}
      <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="text-7xl mb-8">🏗️
      </motion.div>

      {/* Title */}
      <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }}
        className="text-6xl font-black mb-4 leading-tight"
        style={{ color: theme.text }}
      >
        {beamType}
      </motion.h1>

      {/* Subtitle */}
      <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
        className="text-2xl font-light mb-3"
        style={{ color: theme.accentText }}
      >
        {model.span.toFixed(1)} m Span · {model.material?.name ?? 'Unknown Material'} · {model.section?.name ?? 'Unknown Section'}
      </motion.p>

      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
        className="text-base" style={{ color: theme.textMuted }}
      >
        {analysisResult ? '✅ Analysis complete' : '⚠️ Model not yet solved'} · {model.supports.length} supports · {model.loads.length} loads applied
      </motion.p>

      {/* Divider */}
      <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.7, duration: 0.6 }}
        className="my-10 w-32 h-0.5" style={{ background: theme.accent }}
      />

      {/* Date */}
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
        className="text-sm tracking-widest uppercase" style={{ color: theme.textMuted }}
      >
        Beam Analysis Studio · {now}
      </motion.p>
    </div>
  );
}
