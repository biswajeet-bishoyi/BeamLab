import { motion } from 'framer-motion';
import { useStore } from '../../store';

interface Props {
  onSend: (prompt: string) => void;
}

export function AIQuickActions({ onSend }: Props) {
  const model = useStore(s => s.model);
  const analysisResult = useStore(s => s.analysisResult);

  const getSuggestions = () => {
    const suggestions: { icon: string; label: string; prompt: string }[] = [];

    if (model.supports.length === 0) {
      suggestions.push({ icon: '⚠️', label: 'Add Supports', prompt: 'My beam has no supports. What should I add for a standard simply supported beam?' });
    }
    if (model.loads.length === 0) {
      suggestions.push({ icon: '➕', label: 'Add Loads', prompt: 'What kind of loads should I add for a typical floor beam application?' });
    }
    if (analysisResult) {
      const forces = analysisResult.internalForces;
      const maxDeflection = Math.max(...forces.map((f: any) => Math.abs(f.deflection)));
      const deflectionRatio = maxDeflection > 0 ? model.span / maxDeflection : Infinity;
      if (deflectionRatio < 250) {
        suggestions.push({ icon: '📉', label: 'Fix Deflection', prompt: `My deflection is L/${Math.floor(deflectionRatio)}, which exceeds the L/250 limit. How do I fix this?` });
      }
      const maxStress = Math.max(...forces.map((f: any) => Math.abs(f.stress)));
      if (maxStress > 250e6) {
        suggestions.push({ icon: '🚨', label: 'Reduce Stress', prompt: `My bending stress is ${(maxStress/1e6).toFixed(0)} MPa, exceeding 250 MPa yield. What section should I use?` });
      }
    }
    if (!model.material) {
      suggestions.push({ icon: '🧱', label: 'Set Material', prompt: 'I have not set a material. What are the common options for a structural beam?' });
    }
    if (!model.section) {
      suggestions.push({ icon: '📐', label: 'Set Section', prompt: 'I have not set a cross section. What is a good starting point for my span and loads?' });
    }

    // Always-available actions
    suggestions.push({ icon: '🔍', label: 'Explain Model', prompt: 'Give me a full explanation of my current structural model and all its results.' });
    suggestions.push({ icon: '📊', label: 'Compare Sections', prompt: 'Compare different steel section options for my current span and loading.' });
    suggestions.push({ icon: '📑', label: 'Write Report', prompt: 'Generate a professional engineering summary report for my current beam design.' });

    return suggestions.slice(0, 7); // max 7
  };

  const suggestions = getSuggestions();

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest px-1">Suggestions</p>
      {suggestions.map((s, i) => (
        <motion.button
          key={s.label}
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04 }}
          whileHover={{ x: 4 }}
          onClick={() => onSend(s.prompt)}
          className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:border-indigo-500/60 hover:bg-indigo-900/20 transition-all text-left group"
        >
          <span className="text-base shrink-0">{s.icon}</span>
          <span className="text-xs text-slate-300 group-hover:text-white transition-colors font-medium leading-tight">{s.label}</span>
        </motion.button>
      ))}
    </div>
  );
}
