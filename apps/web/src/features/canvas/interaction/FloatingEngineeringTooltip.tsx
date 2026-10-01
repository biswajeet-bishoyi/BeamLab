import React from 'react';
import type { RaycastHit } from './SpatialRaycaster';

interface FloatingEngineeringTooltipProps {
  hit: RaycastHit | null;
  cursorScreenPos: { x: number; y: number } | null;
  containerRect: DOMRect | null;
}

export const FloatingEngineeringTooltip: React.FC<FloatingEngineeringTooltipProps> = ({
  hit,
  cursorScreenPos,
  containerRect,
}) => {
  if (!hit || !cursorScreenPos || !containerRect) return null;

  const d = hit.details;

  // Calculate screen position relative to container, preventing overflow
  const tooltipWidth = 220;
  const tooltipHeight = 140;

  let posX = cursorScreenPos.x - containerRect.left + 14;
  let posY = cursorScreenPos.y - containerRect.top + 14;

  if (posX + tooltipWidth > containerRect.width) {
    posX = posX - tooltipWidth - 28;
  }
  if (posY + tooltipHeight > containerRect.height) {
    posY = posY - tooltipHeight - 28;
  }

  const badgeColor =
    hit.entityType === 'node'
      ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      : hit.entityType === 'member'
      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      : hit.entityType === 'support'
      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
      : 'bg-purple-500/20 text-purple-400 border-purple-500/30';

  return (
    <div
      style={{ left: `${posX}px`, top: `${posY}px` }}
      className="pointer-events-none absolute z-40 w-56 rounded-lg bg-slate-900/95 p-2.5 text-xs text-slate-200 shadow-2xl backdrop-blur-md border border-slate-700/80 transition-opacity duration-150 animate-in fade-in"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-1.5 pb-1.5 mb-1.5 border-b border-slate-800">
        <span className="font-semibold text-slate-100 truncate text-[11px]">{d.name}</span>
        <span
          className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-bold border ${badgeColor}`}
        >
          {hit.entityType}
        </span>
      </div>

      {/* Body: Attribute Grid */}
      <div className="flex flex-col gap-1 text-[10px] font-mono">
        {hit.entityType === 'node' && (
          <>
            {d.coordinates && (
              <div className="flex justify-between">
                <span className="text-slate-400">Position:</span>
                <span className="text-slate-200">
                  ({d.coordinates.x.toFixed(2)}, {d.coordinates.y.toFixed(2)}, {d.coordinates.z.toFixed(2)}) m
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-400">Connected:</span>
              <span className="text-blue-400 font-semibold">{d.connectedMembersCount ?? 0} members</span>
            </div>
            {d.supportPreset && (
              <div className="flex justify-between">
                <span className="text-slate-400">Boundary:</span>
                <span className="text-amber-400 font-semibold">{d.supportPreset}</span>
              </div>
            )}
          </>
        )}

        {hit.entityType === 'member' && (
          <>
            {d.designation && (
              <div className="flex justify-between">
                <span className="text-slate-400">Profile:</span>
                <span className="text-emerald-400 font-semibold">{d.designation}</span>
              </div>
            )}
            {d.memberType && (
              <div className="flex justify-between">
                <span className="text-slate-400">Class:</span>
                <span className="text-slate-200">{d.memberType}</span>
              </div>
            )}
            {d.length !== undefined && (
              <div className="flex justify-between">
                <span className="text-slate-400">Span Length:</span>
                <span className="text-slate-200">{d.length.toFixed(2)} m</span>
              </div>
            )}
            {d.material && (
              <div className="flex justify-between">
                <span className="text-slate-400">Material:</span>
                <span className="text-slate-200">{d.material}</span>
              </div>
            )}
            {d.rollAngle !== undefined && d.rollAngle !== 0 && (
              <div className="flex justify-between">
                <span className="text-slate-400">Roll (β):</span>
                <span className="text-slate-200">{d.rollAngle}°</span>
              </div>
            )}
          </>
        )}

        {hit.entityType === 'support' && (
          <>
            {d.preset && (
              <div className="flex justify-between">
                <span className="text-slate-400">Support Type:</span>
                <span className="text-amber-400 font-semibold">{d.preset}</span>
              </div>
            )}
            {d.hostNodeId && (
              <div className="flex justify-between">
                <span className="text-slate-400">Target Node:</span>
                <span className="text-slate-200">{d.hostNodeId}</span>
              </div>
            )}
          </>
        )}

        {hit.entityType === 'plate' && (
          <>
            {d.thickness !== undefined && (
              <div className="flex justify-between">
                <span className="text-slate-400">Thickness:</span>
                <span className="text-purple-400 font-semibold">{d.thickness} mm</span>
              </div>
            )}
            {d.area !== undefined && (
              <div className="flex justify-between">
                <span className="text-slate-400">Surface Area:</span>
                <span className="text-slate-200">{d.area} m²</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
