import React from 'react';
import type { DeformationViewMode } from './ModalAnimationController';

interface HeatmapLegendOverlayProps {
  viewMode: DeformationViewMode;
  maxDisplacementMeters: number;
  scaleMultiplier: number;
}

export const HeatmapLegendOverlay: React.FC<HeatmapLegendOverlayProps> = ({
  viewMode,
  maxDisplacementMeters,
  scaleMultiplier,
}) => {
  if (viewMode === 'undeformed') return null;

  const maxValMm = maxDisplacementMeters * 1000;
  const tickValues = [
    maxValMm,
    maxValMm * 0.75,
    maxValMm * 0.5,
    maxValMm * 0.25,
    0,
  ];

  return (
    <div className="pointer-events-none absolute bottom-12 right-3 z-20 flex flex-col gap-1.5 rounded-lg bg-slate-900/90 p-2 text-xs text-slate-200 backdrop-blur-md border border-slate-800 shadow-xl">
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1 font-mono text-[10px]">
        <span className="font-semibold text-slate-300">
          {viewMode === 'static' ? 'Deflection |u|' : 'Mode Shape'}
        </span>
        <span className="text-amber-400 font-bold">{scaleMultiplier}× scale</span>
      </div>

      <div className="flex items-center gap-2">
        {/* Continuous Rainbow Gradient Bar */}
        <div
          className="h-28 w-3.5 rounded-sm border border-slate-700/80 shadow-inner"
          style={{
            background: 'linear-gradient(to bottom, #ef4444, #eab308, #22c55e, #06b6d4, #3b82f6)',
          }}
        />

        {/* Value Ticks */}
        <div className="flex h-28 flex-col justify-between font-mono text-[9px] text-slate-400">
          {tickValues.map((val, idx) => (
            <span key={idx} className={idx === 0 ? 'text-red-400 font-semibold' : ''}>
              {val.toFixed(1)} mm
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
