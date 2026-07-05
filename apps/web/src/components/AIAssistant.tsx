import { useStore } from '../store';
import { Bot } from 'lucide-react';
import { motion } from 'framer-motion';

export function AIAssistant() {
  const analysisResult = useStore((state) => state.analysisResult);
  const model = useStore((state) => state.model);

  const generateReview = () => {
    if (!analysisResult) return [{ type: 'error', text: "Model is unstable or incomplete. Please check your supports." }];
    
    let review = [];
    
    // Safety Factor / Stress Check
    const maxStress = Math.max(...analysisResult.internalForces.map(f => Math.abs(f.stress)));
    const maxStressMPa = (maxStress / 1e6).toFixed(1);
    
    if (maxStress > 250e6) { 
      review.push({ type: 'warning', text: `Critical: Max bending stress is ${maxStressMPa} MPa, exceeding typical yield strength of steel (250 MPa). Increase section size.` });
    } else {
      review.push({ type: 'success', text: `Stress Check: Max bending stress is ${maxStressMPa} MPa, safely below yield strength.` });
    }

    // Deflection Check
    const maxDeflection = Math.max(...analysisResult.internalForces.map(f => Math.abs(f.deflection)));
    const deflectionRatio = model.span / maxDeflection;
    
    if (deflectionRatio < 250) {
      review.push({ type: 'warning', text: `Serviceability: Deflection is L/${Math.floor(deflectionRatio)} (> L/250). Consider a stiffer material.` });
    } else {
      review.push({ type: 'success', text: `Deflection: Deflection is L/${Math.floor(deflectionRatio)}, well within limits.` });
    }
    
    return review;
  };

  const reviewLines = generateReview();

  return (
    <div className="flex flex-col gap-3">
      {/* Archie the Mascot Header */}
      <div className="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
        <div className="bg-indigo-500 text-white p-2 rounded-lg shadow-inner">
          <Bot size={20} />
        </div>
        <div>
          <h4 className="font-semibold text-sm text-indigo-900 dark:text-indigo-200">Archie</h4>
          <p className="text-xs text-indigo-700 dark:text-indigo-400">AI Reviewer</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {reviewLines.map((line, i) => (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            key={i} 
            className={`p-3 rounded-xl border text-sm shadow-sm ${
              line.type === 'error' ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-200' :
              line.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-900/50 dark:text-amber-200' :
              'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-900/50 dark:text-emerald-200'
            }`}
          >
            {line.text}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
