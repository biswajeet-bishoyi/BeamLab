import React from 'react';
import type { SnapResult } from './SpatialSnappingEngine';

interface SnapGlyphOverlayProps {
  snap: SnapResult | null;
}

export const SnapGlyphOverlay: React.FC<SnapGlyphOverlayProps> = ({ snap }) => {
  if (!snap) return null;

  const { screenPoint, type, label } = snap;

  return (
    <div
      style={{
        left: `${screenPoint.x}px`,
        top: `${screenPoint.y}px`,
      }}
      className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 ease-out"
    >
      {/* CAD Snapping Glyph Icon */}
      {type === 'node' && (
        <svg className="w-5 h-5 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]" viewBox="0 0 20 20">
          <rect x="3" y="3" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" />
        </svg>
      )}

      {type === 'midpoint' && (
        <svg className="w-5 h-5 text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]" viewBox="0 0 20 20">
          <polygon points="10,2 18,17 2,17" fill="none" stroke="currentColor" strokeWidth="2.5" />
        </svg>
      )}

      {type === 'perpendicular' && (
        <svg className="w-5 h-5 text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.8)]" viewBox="0 0 20 20">
          <polyline points="4,4 4,16 16,16" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <polyline points="4,10 10,10 10,16" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      )}

      {type === 'grid' && (
        <svg className="w-5 h-5 text-blue-400 drop-shadow-[0_0_6px_rgba(96,165,250,0.8)]" viewBox="0 0 20 20">
          <line x1="2" y1="10" x2="18" y2="10" stroke="currentColor" strokeWidth="2" />
          <line x1="10" y1="2" x2="10" y2="18" stroke="currentColor" strokeWidth="2" />
          <circle cx="10" cy="10" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      )}

      {/* Snap Coordinate Tag */}
      <div className="absolute left-4 top-4 whitespace-nowrap rounded px-1.5 py-0.5 bg-slate-900/90 text-[10px] font-mono text-slate-200 border border-slate-700 shadow-lg backdrop-blur-sm">
        {label}
      </div>
    </div>
  );
};
