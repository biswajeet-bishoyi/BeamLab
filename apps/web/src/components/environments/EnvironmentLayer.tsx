import { useRef, useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { EnvironmentId } from '../../store';
import { BlueprintScene } from './scenes/BlueprintScene';
import { ResidentialScene } from './scenes/ResidentialScene';
import { BridgeScene } from './scenes/BridgeScene';
import { IndustrialScene } from './scenes/IndustrialScene';
import { CommercialScene } from './scenes/CommercialScene';
import { ConstructionScene } from './scenes/ConstructionScene';
import { ResearchScene } from './scenes/ResearchScene';

interface Props {
  environmentId: EnvironmentId;
}

function SceneRenderer({ id, width, height }: { id: EnvironmentId; width: number; height: number }) {
  switch (id) {
    case 'blueprint':    return <BlueprintScene    width={width} height={height} />;
    case 'residential':  return <ResidentialScene  width={width} height={height} />;
    case 'bridge':       return <BridgeScene       width={width} height={height} />;
    case 'industrial':   return <IndustrialScene   width={width} height={height} />;
    case 'commercial':   return <CommercialScene   width={width} height={height} />;
    case 'construction': return <ConstructionScene width={width} height={height} />;
    case 'research':     return <ResearchScene     width={width} height={height} />;
    default:             return null;
  }
}

export function EnvironmentLayer({ environmentId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 800, height: 300 });

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setDims({
          width:  containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  if (environmentId === 'none') return null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none"
      style={{ zIndex: 0 }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={environmentId}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
          className="absolute inset-0"
        >
          <SceneRenderer id={environmentId} width={dims.width} height={dims.height} />
          {/* Vignette overlay so beam is always readable */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(0,0,0,0.35) 100%)',
            }}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
