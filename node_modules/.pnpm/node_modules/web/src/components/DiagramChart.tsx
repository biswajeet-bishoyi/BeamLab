import { useMemo, useState } from 'react';
import { useStore } from '../store';
import type { InternalForcePoint } from '@beamworks/core-engine/solver/internalForces';
import { Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DiagramChartProps {
  data: InternalForcePoint[];
  type: 'shear' | 'moment' | 'deflection';
  span: number;
  width: number;
  height: number;
  drawProgress?: number;
  isPlaybackMode?: boolean;
  highlightCritical?: boolean;
  ghostData?: InternalForcePoint[];
}

export function DiagramChart({ data, type, span, width, height, drawProgress = 1, isPlaybackMode = false, highlightCritical = false, ghostData }: DiagramChartProps) {
  const hoveredX = useStore(state => state.hoveredX);
  const setHoveredX = useStore(state => state.setHoveredX);
  const setAiPrompt = useStore(state => state.setAiPrompt);
  const [isHovered, setIsHovered] = useState(false);
  const marginY = 30; // extra margin for peaks
  const drawHeight = height - marginY * 2;
  const scaleX = width / span;

  // Find max absolute value to scale the Y axis dynamically
  const maxAbs = useMemo(() => {
    let allData = [...data];
    if (ghostData) allData = allData.concat(ghostData);
    
    if (allData.length === 0) return 1;
    const max = Math.max(...allData.map(p => Math.abs(type === 'shear' ? p.v : type === 'moment' ? p.m : p.deflection)));
    return max === 0 ? 1 : max;
  }, [data, ghostData, type]);

  const scaleY = (drawHeight / 2) / maxAbs;
  const centerY = height / 2;

  const pathData = useMemo(() => {
    if (data.length === 0) return '';
    let d = `M 0 ${centerY}`;
    for (const point of data) {
      const x = point.x * scaleX;
      const val = type === 'shear' ? point.v : type === 'moment' ? point.m : point.deflection;
      const ySign = type === 'shear' ? -1 : 1; 
      const y = centerY + (val * scaleY * ySign);
      d += ` L ${x} ${y}`;
    }
    d += ` L ${span * scaleX} ${centerY} Z`;
    return d;
  }, [data, type, scaleX, scaleY, centerY, span]);

  const ghostPathData = useMemo(() => {
    if (!ghostData || ghostData.length === 0) return null;
    let d = `M 0 ${centerY}`;
    for (const point of ghostData) {
      const x = point.x * scaleX;
      const val = type === 'shear' ? point.v : type === 'moment' ? point.m : point.deflection;
      const ySign = type === 'shear' ? -1 : 1; 
      const y = centerY + (val * scaleY * ySign);
      d += ` L ${x} ${y}`;
    }
    d += ` L ${span * scaleX} ${centerY} Z`;
    return d;
  }, [ghostData, type, scaleX, scaleY, centerY, span]);

  // Color mappings
  const colors = {
    shear: { stroke: '#EF4444', fill: 'url(#grad-shear)', label: 'Shear Force (N)' },
    moment: { stroke: '#3B82F6', fill: 'url(#grad-moment)', label: 'Bending Moment (N·m)' },
    deflection: { stroke: '#10B981', fill: 'url(#grad-deflection)', label: 'Deflection (m)' }
  };
  
  const currentStyle = colors[type];

  // Critical Points Detection
  const criticalPoint = useMemo(() => {
    if (data.length === 0) return null;
    let maxVal = -Infinity;
    let pt = data[0];
    for (const p of data) {
      const v = Math.abs(type === 'shear' ? p.v : type === 'moment' ? p.m : p.deflection);
      if (v > maxVal) { maxVal = v; pt = p; }
    }
    const val = type === 'shear' ? pt.v : type === 'moment' ? pt.m : pt.deflection;
    const ySign = type === 'shear' ? -1 : 1;
    return { x: pt.x * scaleX, y: centerY + (val * scaleY * ySign), raw: val };
  }, [data, type, scaleX, scaleY, centerY]);

  return (
    <div 
      className="relative group rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => { setIsHovered(false); setHoveredX(null); }}
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        if (mx >= 0 && mx <= width) {
          setHoveredX(mx / scaleX, e.clientX, e.clientY);
        } else {
          setHoveredX(null);
        }
      }}
    >
      {/* Top Bar for Chart */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 pointer-events-none">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{currentStyle.label}</h4>
      </div>
      
      {/* Explain with AI Button */}
      <AnimatePresence>
        {isHovered && (
          <motion.button 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg transition-colors cursor-pointer pointer-events-auto"
            onClick={() => {
              if (criticalPoint) {
                setAiPrompt(`Explain the structural behavior at the peak ${type} of ${criticalPoint.raw.toFixed(2)} occurring at ${criticalPoint.x / scaleX}m. Keep it under 3 sentences.`);
              } else {
                setAiPrompt(`Explain the general ${type} diagram behavior for this beam. Keep it under 3 sentences.`);
              }
            }}
          >
            <Bot size={14} /> Explain with AI
          </motion.button>
        )}
      </AnimatePresence>

      <svg width={width} height={height} className="block relative z-0">
        <defs>
          <linearGradient id="grad-shear" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#EF4444" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="grad-moment" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="grad-deflection" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Zero Axis */}
        <line x1={0} y1={centerY} x2={width} y2={centerY} className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="1" strokeDasharray="4 4" />
        
        {/* The Actual Area Fill */}
        <path 
          d={pathData} 
          fill={currentStyle.fill}
          className="transition-all duration-300"
          style={{ opacity: ghostData ? 0.1 : 0.4 }}
        />

        {/* The Actual Stroke */}
        <path 
          d={pathData} 
          fill="none" 
          stroke={currentStyle.stroke} 
          strokeWidth="2" 
          strokeLinejoin="round"
          className="transition-all duration-300"
          style={{ opacity: ghostData ? 0.3 : 1 }}
        />

        {/* Ghost Stroke */}
        {ghostPathData && (
          <path 
            d={ghostPathData} 
            fill="none" 
            stroke="#06b6d4" 
            strokeWidth="2" 
            strokeLinejoin="round"
            strokeDasharray="6 4"
            className="drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]"
          />
        )}

        {/* Critical Point Highlight */}
        {criticalPoint && (!isPlaybackMode || drawProgress > 0.95 || highlightCritical) && (
          <g transform={`translate(${criticalPoint.x}, ${criticalPoint.y})`}>
            <motion.g 
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: highlightCritical ? 1.5 : 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            >
              <circle r={highlightCritical ? 12 : 6} fill={currentStyle.stroke} filter="url(#glow)" opacity={highlightCritical ? 0.3 : 1} />
              <circle r={highlightCritical ? 6 : 3} fill="#FFF" />
              
              {/* Extended Label for Scene 9 */}
              {highlightCritical && (() => {
                const labelWidth = 120;
                let labelOffsetX = -labelWidth / 2;
                
                // Prevent overflow on left edge
                if (criticalPoint.x + labelOffsetX < 10) {
                  labelOffsetX = 10 - criticalPoint.x;
                }
                // Prevent overflow on right edge
                if (criticalPoint.x + labelOffsetX + labelWidth > width - 10) {
                  labelOffsetX = width - 10 - criticalPoint.x - labelWidth;
                }

                return (
                  <motion.g initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <rect x={labelOffsetX} y={-45} width={labelWidth} height={26} rx={13} fill={currentStyle.stroke} />
                    <text x={labelOffsetX + labelWidth / 2} y={-32} fill="#FFF" fontSize={11} fontWeight="bold" textAnchor="middle" dominantBaseline="middle" style={{ pointerEvents: 'none' }}>
                      MAX {type.toUpperCase()}
                    </text>
                  </motion.g>
                );
              })()}
            </motion.g>
          </g>
        )}

        {/* Synchronized Hover Crosshair */}
        {hoveredX !== null && hoveredX <= span && (
          <g transform={`translate(${hoveredX * scaleX}, 0)`}>
            <line 
              x1={0} y1={0} x2={0} y2={height} 
              className="stroke-indigo-500 dark:stroke-indigo-400" 
              strokeWidth="2" 
              opacity="0.7" 
            />
            {/* Value Dot at curve intersection */}
            {(() => {
              // Interpolate precise Y position for the hover dot
              for (let i = 0; i < data.length - 1; i++) {
                if (hoveredX >= data[i].x && hoveredX <= data[i+1].x) {
                  const t = (hoveredX - data[i].x) / (data[i+1].x - data[i].x || 1);
                  const p1 = data[i]; const p2 = data[i+1];
                  const v1 = type === 'shear' ? p1.v : type === 'moment' ? p1.m : p1.deflection;
                  const v2 = type === 'shear' ? p2.v : type === 'moment' ? p2.m : p2.deflection;
                  const interpolated = v1 + t * (v2 - v1);
                  const ySign = type === 'shear' ? -1 : 1;
                  return (
                    <circle 
                      cy={centerY + (interpolated * scaleY * ySign)} 
                      r={4} 
                      className="fill-indigo-500 stroke-white stroke-2" 
                    />
                  );
                }
              }
              return null;
            })()}
          </g>
        )}
      </svg>
    </div>
  );
}
