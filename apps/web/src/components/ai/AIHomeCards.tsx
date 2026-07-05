import { motion } from 'framer-motion';

const CARDS = [
  { icon: '🪄', label: 'Build a Beam',         prompt: 'Build me a standard simply supported steel beam for a 6 meter residential floor application.',      color: 'from-indigo-500 to-violet-500' },
  { icon: '🧠', label: 'Explain Results',       prompt: 'Explain all the results of my current model — shear force, bending moment, deflection, and stress.', color: 'from-blue-500 to-cyan-500' },
  { icon: '⚖️', label: 'Check Stability',       prompt: 'Check if my current beam is structurally stable and tell me if anything needs to change.',           color: 'from-emerald-500 to-teal-500' },
  { icon: '📈', label: 'Optimize This Design',  prompt: 'Analyze my current design and suggest optimizations to reduce weight while keeping it safe.',         color: 'from-yellow-500 to-orange-500' },
  { icon: '🏗️', label: 'Suggest Better Section', prompt: 'Based on my current loads and span, suggest a better structural section for this beam.',             color: 'from-rose-500 to-pink-500' },
  { icon: '📉', label: 'Reduce Deflection',     prompt: 'My deflection might be too high. What are my options for reducing it while keeping the same span?',   color: 'from-violet-500 to-purple-500' },
  { icon: '🛠️', label: 'Troubleshoot Model',    prompt: 'Review my model and identify any issues, errors, or engineering concerns.',                           color: 'from-slate-500 to-slate-600' },
  { icon: '📑', label: 'Generate Report',       prompt: 'Write an engineering summary report for my current beam design including all critical values.',        color: 'from-amber-500 to-yellow-500' },
  { icon: '🌱', label: 'Improve Sustainability', prompt: 'How can I make my beam design more sustainable? Suggest eco-friendly alternatives.',                  color: 'from-green-500 to-emerald-500' },
];

interface Props {
  onSelect: (prompt: string) => void;
}

export function AIHomeCards({ onSelect }: Props) {
  return (
    <div className="h-full overflow-y-auto custom-scrollbar px-2 py-4">
      {/* Welcome Message */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 text-center"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-900/40 border border-indigo-700/50 mb-3">
          <span className="text-indigo-400 text-xs font-semibold tracking-widest uppercase">AI Engineering Studio</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-1">What would you like to explore?</h2>
        <p className="text-slate-400 text-sm">Click a card or type anything below. I understand your current model.</p>
      </motion.div>

      {/* Action Cards Grid */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
        {CARDS.map((card, i) => (
          <motion.button
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect(card.prompt)}
            className="relative flex flex-col items-start gap-3 p-5 rounded-2xl bg-slate-800/70 border border-slate-700/60 hover:border-slate-500 transition-all group text-left overflow-hidden shadow-lg"
          >
            {/* Gradient glow in corner */}
            <div className={`absolute -top-6 -right-6 w-20 h-20 rounded-full bg-gradient-to-br ${card.color} opacity-10 group-hover:opacity-20 transition-opacity blur-xl`} />
            
            <span className="text-3xl group-hover:scale-110 transition-transform duration-200">
              {card.icon}
            </span>
            <span className="font-semibold text-white text-sm leading-tight">{card.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
