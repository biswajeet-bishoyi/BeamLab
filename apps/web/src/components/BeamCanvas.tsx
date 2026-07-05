import { useRef, useState, useEffect } from 'react';
import { useStore } from '../store';
import { SupportGlyph, LoadGlyph, DistributedLoadGlyph } from './Glyphs';
import { toLength } from '@beamworks/core-engine/units/brands';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Trash2, Lock } from 'lucide-react';

import { PlaybackScene } from './replay/PlaybackEngine';

interface BeamCanvasProps {
  isPlaybackMode?: boolean;
  sceneId?: PlaybackScene;
  localProgress?: number;
}

export function BeamCanvas({ isPlaybackMode = false, sceneId, localProgress = 1 }: BeamCanvasProps) {
  const model = useStore(state => state.model);
  const dispatchCommand = useStore(state => state.dispatchCommand);
  const previewCommand = useStore(state => state.previewCommand);
  const selectedObjectId = useStore(state => state.selectedObjectId);
  const selectObject = useStore(state => state.selectObject);
  const hoveredX = useStore(state => state.hoveredX);
  const setHoveredX = useStore(state => state.setHoveredX);
  const analysisResult = useStore(state => state.analysisResult);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  
  useEffect(() => {
    if (containerRef.current) {
      setWidth(containerRef.current.clientWidth);
    }
    
    const handleResize = () => {
      if (containerRef.current) setWidth(containerRef.current.clientWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const margin = 40;
  const drawWidth = width - margin * 2;
  const scale = drawWidth / model.span;
  const beamY = 150;

  return (
    <div ref={containerRef} style={{ width: '100%', height: '300px', overflow: 'hidden', padding: '0 0 20px 0', position: 'relative' }}>
      
      <svg 
        className="beam-canvas-svg"
        width={width} 
        height={300} 
        viewBox={`0 0 ${width} 300`}
        style={{ display: 'block', pointerEvents: isPlaybackMode ? 'none' : 'auto' }}
        onPointerDown={() => selectObject(null)}
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const mx = e.clientX - rect.left;
          if (mx >= margin && mx <= margin + drawWidth) {
            setHoveredX((mx - margin) / scale, e.clientX, e.clientY);
          } else {
            setHoveredX(null);
          }
        }}
        onPointerLeave={() => setHoveredX(null)}
      >
        {/* Grid / axis labels */}
        <text x={margin} y={280} fontFamily="var(--font-mono)" fontSize="12" fill="currentColor" className="text-slate-500 dark:text-slate-400">0m</text>
        <text x={margin + drawWidth} y={280} fontFamily="var(--font-mono)" fontSize="12" textAnchor="end" fill="currentColor" className="text-slate-500 dark:text-slate-400">{model.span}m</text>

        {/* Interactive Dimensions */}
        <line x1={margin} y1={beamY + 60} x2={margin + drawWidth} y2={beamY + 60} stroke="#cbd5e1" strokeDasharray="4 4" />
        <text x={margin + drawWidth / 2} y={beamY + 75} textAnchor="middle" fontSize="12" fill="#64748b">
          L = {model.span}m
        </text>
        
        {/* Synchronized Hover Crosshair */}
        {hoveredX !== null && hoveredX <= model.span && (
          <g transform={`translate(${margin + hoveredX * scale}, 0)`}>
            <line 
              x1={0} y1={50} x2={0} y2={300} 
              className="stroke-indigo-500/50 dark:stroke-indigo-400/50" 
              strokeWidth="2" 
              strokeDasharray="4 4"
            />
            {/* Pulsing indicator on the beam */}
            <circle cy={beamY} r={6} className="fill-indigo-500" />
            <circle cy={beamY} r={12} className="fill-indigo-500/30 animate-ping" />
          </g>
        )}

        {/* Beam Axis */}
        <line
          x1={margin}
          y1={beamY}
          x2={margin + drawWidth}
          y2={beamY}
          stroke="currentColor"
          className="text-slate-800 dark:text-slate-300"
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* Supports */}
        {model.supports.map(support => {
          let opacity = 1;
          if (isPlaybackMode && sceneId !== undefined) {
            if (sceneId < PlaybackScene.Supports) opacity = 0;
            else if (sceneId === PlaybackScene.Supports) opacity = localProgress;
          }
          return (
          <g key={support.id} className="support-glyph" style={{ opacity, transition: 'opacity 0.1s linear' }}>
            <SupportGlyph
              x={margin + support.position * scale}
              y={beamY}
              scale={scale}
              span={model.span}
              isSelected={selectedObjectId === support.id}
              onSelect={() => selectObject(support.id)}
              onPositionPreview={(newPos) => {
                previewCommand({
                  type: 'MOVE_SUPPORT',
                  timestamp: Date.now(),
                  payload: { id: support.id, newPosition: toLength(newPos) }
                });
              }}
              onPositionCommit={(newPos) => {
                dispatchCommand({
                  type: 'MOVE_SUPPORT',
                  timestamp: Date.now(),
                  payload: { id: support.id, newPosition: toLength(newPos) }
                });
              }}
            />
          </g>
        );
      })}

        {/* Loads */}
        {model.loads.map(load => {
          let opacity = 1;
          if (isPlaybackMode && sceneId !== undefined) {
            if (sceneId < PlaybackScene.Loads) opacity = 0;
            else if (sceneId === PlaybackScene.Loads) opacity = localProgress;
          }
          if (load.type === 'distributed') {
            return (
              <g key={load.id} className="load-glyph" style={{ opacity, transition: 'opacity 0.1s linear' }}>
                <DistributedLoadGlyph
                  startX={margin + load.startPosition! * scale}
                  endX={margin + load.endPosition! * scale}
                  y={beamY}
                  isSelected={selectedObjectId === load.id}
                  onSelect={() => selectObject(load.id)}
                />
              </g>
            );
          }

          if (load.type === 'point') {
            return (
              <g key={load.id} className="load-glyph" style={{ opacity, transition: 'opacity 0.1s linear' }}>
                <LoadGlyph
                  key={load.id}
                  x={margin + load.position * scale}
                  y={beamY}
                  scale={scale}
                  span={model.span}
                  isSelected={selectedObjectId === load.id}
                  onSelect={() => selectObject(load.id)}
                  onPositionPreview={(newPos) => {
                    previewCommand({
                      type: 'MOVE_LOAD',
                      timestamp: Date.now(),
                      payload: { id: load.id, newPosition: toLength(newPos) }
                    });
                  }}
                  onPositionCommit={(newPos) => {
                    dispatchCommand({
                      type: 'MOVE_LOAD',
                      timestamp: Date.now(),
                      payload: { id: load.id, newPosition: toLength(newPos) }
                    });
                  }}
                />
              </g>
            );
          }
          return null;
        })}

        {/* Reactions */}
        {analysisResult && model.supports.map(support => {
          const r = analysisResult.reactions.find(react => react.supportId === support.id);
          if (r && Math.abs(r.fy) > 1e-3) {
            const isUpward = r.fy > 0;
            return (
              <g key={r.supportId} className="support-reaction">
                <line 
                  x1={margin + support.position * scale} 
                  y1={beamY + (isUpward ? 35 : -35)} 
                  x2={margin + support.position * scale} 
                  y2={beamY + (isUpward ? 70 : -70)} 
                  stroke="#3B82F6" 
                  strokeWidth="3" 
                  markerEnd="url(#arrowhead)" 
                />
                <text 
                  x={margin + support.position * scale + 10} 
                  y={beamY + (isUpward ? 60 : -60)} 
                  fill="#3B82F6"
                  fontSize="12"
                  fontFamily="var(--font-mono)"
                >
                  {Math.abs(r.fy).toFixed(1)} N
                </text>
              </g>
            );
          }
          return null;
        })}

        {/* Deflected Shape Overlay */}
        {analysisResult && (
          <path
            className="beam-deflection"
            d={`M ${margin} ${beamY} ` + analysisResult.internalForces.map(p => {
              const dx = margin + p.x * scale;
              const dy = beamY - p.deflection * 1000; // Multiplied for visual exaggeration
              return `L ${dx} ${dy}`;
            }).join(' ')}
            fill="none"
            stroke="#10B981"
            strokeWidth="3"
            strokeDasharray="5,5"
          />
        )}
      </svg>

      {/* HTML OVERLAY FOR FLOATING CONTEXT MENU */}
      <AnimatePresence>
        {selectedObjectId && !isPlaybackMode && (
          <FloatingContextMenu 
            id={selectedObjectId} 
            model={model} 
            margin={margin} 
            scale={scale} 
            beamY={beamY} 
          />
        )}
      </AnimatePresence>

    </div>
  );
}

// Subcomponent for Floating Context Menu
function FloatingContextMenu({ id, model, margin, scale, beamY }: any) {
  const dispatchCommand = useStore(state => state.dispatchCommand);
  const selectObject = useStore(state => state.selectObject);

  const support = model.supports.find((s: any) => s.id === id);
  const load = model.loads.find((l: any) => l.id === id);
  
  if (!support && !load) return null;

  const pos = support 
    ? support.position 
    : load.type === 'distributed' 
      ? (load.startPosition + load.endPosition) / 2 
      : load.position;

  const pixelX = margin + pos * scale;
  const pixelY = beamY - 60; // Offset above the beam

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      style={{ left: pixelX, top: pixelY, transform: 'translateX(-50%)' }}
      className="absolute z-[100] flex items-center gap-1 p-1 glass-panel rounded-lg shadow-lg border border-slate-200 dark:border-slate-700"
    >
      <button 
        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-600 dark:text-slate-300 transition-colors"
        title="Duplicate"
      >
        <Copy size={14} />
      </button>
      <div className="w-px h-4 bg-slate-200 dark:bg-slate-700"></div>
      <button 
        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-600 dark:text-slate-300 transition-colors"
        title="Lock"
      >
        <Lock size={14} />
      </button>
      <div className="w-px h-4 bg-slate-200 dark:bg-slate-700"></div>
      <button 
        onClick={() => {
          dispatchCommand({ type: 'REMOVE_OBJECT', timestamp: Date.now(), payload: { id } });
          selectObject(null);
        }}
        className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md text-red-500 transition-colors"
        title="Delete"
      >
        <Trash2 size={14} />
      </button>
    </motion.div>
  );
}
