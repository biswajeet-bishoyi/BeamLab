import { motion } from 'framer-motion';
import type { AIUserLevel } from '../../store';

const LEVELS: { id: AIUserLevel; label: string; desc: string; emoji: string }[] = [
  { id: 'beginner',     label: 'Beginner',     desc: 'No engineering background. Simple language only.',           emoji: '🌱' },
  { id: 'student',      label: 'Student',       desc: '2nd or 3rd year structural engineering student.',            emoji: '📚' },
  { id: 'intermediate', label: 'Intermediate',  desc: 'Practicing engineer with a few years of experience.',        emoji: '🔧' },
  { id: 'professional', label: 'Professional',  desc: 'Licensed structural engineer (PE/SE). Full technical depth.', emoji: '🏗️' },
  { id: 'researcher',   label: 'Researcher',    desc: 'Academic with deep theoretical knowledge.',                  emoji: '🔬' },
];

interface Props {
  onSelect: (level: AIUserLevel) => void;
}

export function UserLevelModal({ onSelect }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xl"
    >
      <motion.div
        initial={{ scale: 0.85, y: 40, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-8"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="text-3xl">🧠</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Welcome to AI Studio</h2>
          <p className="text-slate-400 text-sm">Tell Archie your experience level so he can tailor every explanation perfectly.</p>
        </div>

        {/* Level Cards */}
        <div className="flex flex-col gap-3">
          {LEVELS.map((level, i) => (
            <motion.button
              key={level.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => onSelect(level.id)}
              className="flex items-center gap-4 p-4 rounded-2xl border border-slate-700 bg-slate-800/60 hover:border-indigo-500 hover:bg-indigo-900/20 transition-all group text-left"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform">{level.emoji}</span>
              <div>
                <p className="font-semibold text-white text-sm">{level.label}</p>
                <p className="text-xs text-slate-400">{level.desc}</p>
              </div>
              <div className="ml-auto w-6 h-6 rounded-full border border-slate-600 group-hover:border-indigo-500 group-hover:bg-indigo-500 transition-all flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-transparent group-hover:bg-white transition-all" />
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
