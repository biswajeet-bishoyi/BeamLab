import { motion } from 'framer-motion';
import type { PresentationTheme } from '../presentationThemes';
import { useStore } from '../../../store';
import { DiagramChart } from '../../DiagramChart';

interface Props { 
  theme: PresentationTheme; 
  type: 'shear' | 'moment' | 'deflection';
  title: string;
  description: string;
}

export function DiagramSlide({ theme, type, title, description }: Props) {
  const model = useStore(s => s.model);
  const analysisResult = useStore(s => s.analysisResult);

  return (
    <div className="flex flex-col h-full px-16 py-12">
      <motion.h2 initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
        className="text-5xl font-black mb-3" style={{ color: theme.text }}>
        {title}
      </motion.h2>
      <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.15, duration: 0.5 }}
        className="h-1 w-24 rounded mb-10" style={{ background: theme.accent }} />

      <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="text-xl mb-12 max-w-3xl leading-relaxed" style={{ color: theme.textMuted }}>
        {description}
      </motion.p>

      {analysisResult ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ delay: 0.4, type: 'spring', stiffness: 100 }}
          className="flex-1 rounded-3xl border p-12 overflow-hidden shadow-2xl relative"
          style={{ background: theme.diagramBg, borderColor: theme.border }}
        >
          {/* Subtle glow behind the diagram */}
          <div className="absolute inset-0 pointer-events-none opacity-20 blur-3xl"
            style={{ 
              background: `radial-gradient(circle at center, ${type === 'shear' ? '#ef4444' : type === 'moment' ? '#3b82f6' : '#10b981'}, transparent 70%)` 
            }} />
            
          <div className="w-full h-full relative z-10" style={{ transform: 'scale(1.2)', transformOrigin: 'top center' }}>
            <DiagramChart 
              data={analysisResult.internalForces}
              type={type}
              span={model.span}
              width={1000}
              height={350}
              drawProgress={1}
              isPlaybackMode={true}
              highlightCritical={true}
            />
          </div>
        </motion.div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-2xl font-light italic opacity-50 border rounded-3xl"
          style={{ borderColor: theme.border, color: theme.textMuted }}>
          Analysis required to view diagrams
        </div>
      )}
    </div>
  );
}
