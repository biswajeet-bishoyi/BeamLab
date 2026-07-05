import { motion } from 'framer-motion';
import type { PresentationTheme } from '../presentationThemes';
import { BeamCanvas } from '../../BeamCanvas';

interface Props { theme: PresentationTheme; }

export function BeamConfigSlide({ theme }: Props) {
  return (
    <div className="flex flex-col h-full px-16 py-12">
      <motion.h2 initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
        className="text-5xl font-black mb-3" style={{ color: theme.text }}>
        Structural Configuration
      </motion.h2>
      <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.15, duration: 0.5 }}
        className="h-1 w-24 rounded mb-10" style={{ background: theme.accent }} />

      <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="text-xl mb-12 max-w-3xl leading-relaxed" style={{ color: theme.textMuted }}>
        The primary structural element, modeled in its un-deformed state.
      </motion.p>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        transition={{ delay: 0.4, type: 'spring', stiffness: 100 }}
        className="flex-1 rounded-3xl border flex items-center justify-center p-8 overflow-hidden relative shadow-2xl"
        style={{ background: theme.diagramBg, borderColor: theme.border }}
      >
        <div className="absolute inset-0 pointer-events-none opacity-20"
          style={{ background: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.4) 100%)' }} />
        <div className="w-full transform scale-125" style={{ transformOrigin: 'center center' }}>
          <BeamCanvas isPlaybackMode={true} />
        </div>
      </motion.div>
    </div>
  );
}
