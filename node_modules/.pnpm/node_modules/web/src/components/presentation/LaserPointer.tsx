import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type PointerMode = 'none' | 'laser' | 'crosshair' | 'spotlight';

export function LaserPointer({ mode }: { mode: PointerMode }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
      if (!isActive) setIsActive(true);
    };
    
    // Hide pointer when cursor leaves window
    const handleLeave = () => setIsActive(false);
    
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseleave', handleLeave);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseleave', handleLeave);
    };
  }, [isActive]);

  if (mode === 'none') return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
      <AnimatePresence>
        {isActive && mode === 'laser' && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute rounded-full bg-red-500 w-3 h-3"
            style={{ 
              left: pos.x - 6, top: pos.y - 6, 
              boxShadow: '0 0 10px 2px rgba(239, 68, 68, 0.8), 0 0 20px 4px rgba(239, 68, 68, 0.4)' 
            }}
          />
        )}
        
        {isActive && mode === 'crosshair' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
          >
            <div className="absolute top-0 bottom-0 border-l border-red-500/50 w-px border-dashed" style={{ left: pos.x }} />
            <div className="absolute left-0 right-0 border-t border-red-500/50 h-px border-dashed" style={{ top: pos.y }} />
            <div className="absolute w-4 h-4 border-2 border-red-500 rounded-full" style={{ left: pos.x - 8, top: pos.y - 8 }} />
            {/* Coordinate readout */}
            <div className="absolute px-2 py-1 bg-slate-900/80 text-red-400 text-xs font-mono rounded ml-4 mb-4 border border-red-900/50"
                 style={{ left: pos.x, bottom: window.innerHeight - pos.y }}>
              {pos.x}, {pos.y}
            </div>
          </motion.div>
        )}

        {isActive && mode === 'spotlight' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle 120px at ${pos.x}px ${pos.y}px, transparent 0%, rgba(0,0,0,0.85) 100%)`
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
