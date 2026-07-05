import { motion } from 'framer-motion';
import type { PresentationTheme } from '../presentationThemes';
import { Play } from 'lucide-react';

interface Props { theme: PresentationTheme; onLaunchCinema: () => void; }

export function CinemaSlide({ theme, onLaunchCinema }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-24">
      <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1, type: 'spring' }}
        className="text-7xl mb-8">🍿</motion.div>
      
      <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="text-5xl font-black mb-6" style={{ color: theme.text }}>
        Engineering Cinema
      </motion.h2>
      
      <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="text-2xl mb-12 max-w-2xl font-light" style={{ color: theme.textMuted }}>
        Experience the structural behavior unfold in real-time. Replay the entire engineering process step-by-step.
      </motion.p>

      <motion.button
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onLaunchCinema}
        className="flex items-center gap-4 px-10 py-5 rounded-full text-2xl font-bold shadow-2xl transition-shadow"
        style={{ background: theme.accent, color: '#fff', boxShadow: `0 10px 30px ${theme.accentGlow}` }}
      >
        <Play size={28} fill="currentColor" />
        Launch Replay
      </motion.button>
    </div>
  );
}
