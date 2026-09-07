/**
 * BeamLab Sprint B3.1 — 2D Member Station Diagram Studio
 * Synchronized multi-curve interactive station inspector for SFD, BMD, Axial Force, and Deflection.
 * Features crosshair station tracking, critical point markers, and configurable sign conventions.
 */

import React, { useState, useMemo, useRef } from 'react';
import {
  type MemberEvaluationResult,
  type StationResult,
  MemberForceEvaluator,
} from './MemberForceEvaluator';
import {
  Activity,
  Download,
  Copy,
  Check,
  ChevronDown,
} from 'lucide-react';

interface MemberDiagramStudioProps {
  evaluations?: Map<string, MemberEvaluationResult>;
  selectedMemberId?: string | null;
  onSelectMember?: (memberId: string) => void;
  className?: string;
}

export const MemberDiagramStudio: React.FC<MemberDiagramStudioProps> = ({
  evaluations: propEvaluations,
  selectedMemberId,
  onSelectMember,
  className = '',
}) => {
  // Fallback demo evaluations if none passed from parent
  const evaluations = useMemo(() => {
    if (propEvaluations && propEvaluations.size > 0) return propEvaluations;
    return MemberForceEvaluator.getDemoModelEvaluations('portal_frame');
  }, [propEvaluations]);

  const memberList = useMemo(() => Array.from(evaluations.values()), [evaluations]);

  // Active member selection
  const [activeId, setActiveId] = useState<string>(() => {
    if (selectedMemberId && evaluations.has(selectedMemberId)) return selectedMemberId;
    return memberList[0]?.memberId || 'm_rafter1';
  });

  // Sync with prop if changed
  React.useEffect(() => {
    if (selectedMemberId && evaluations.has(selectedMemberId)) {
      setActiveId(selectedMemberId);
    }
  }, [selectedMemberId, evaluations]);

  const activeResult = evaluations.get(activeId) || memberList[0];

  // Studio state
  const [signConvention, setSignConvention] = useState<'tension_face' | 'cartesian'>('tension_face');
  const [hoveredX, setHoveredX] = useState<number | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  if (!activeResult) {
    return (
      <div className="p-8 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800">
        No member analysis results available.
      </div>
    );
  }

  const { length: L, stations, criticalPoints, extremes } = activeResult;

  // Find nearest station to hoveredX
  const hoveredStation: StationResult | null = useMemo(() => {
    if (hoveredX === null) return null;
    let closest = stations[0]!;
    let minDiff = Math.abs(closest.x - hoveredX);
    for (const st of stations) {
      const diff = Math.abs(st.x - hoveredX);
      if (diff < minDiff) {
        minDiff = diff;
        closest = st;
      }
    }
    return closest;
  }, [hoveredX, stations]);

  // Export to CSV
  const handleExportCSV = () => {
    let csv = 'Distance [m],Position [t],Axial [kN],Shear Vy [kN],Moment Mz [kNm],Deflection [mm]\n';
    for (const st of stations) {
      csv += `${st.x},${st.t},${st.N},${st.Vy},${st.Mz},${st.deflection}\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${activeResult.memberId}_station_forces.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy max summary
  const handleCopySummary = () => {
    const text = `Member ${activeResult.memberName} (${activeResult.sectionDesignation}):\n• Max Bending: ${extremes.maxMz} kNm / ${extremes.minMz} kNm\n• Max Shear: ${extremes.maxVy} kN\n• Max Axial: ${extremes.maxN} kN\n• Max Deflection: ${extremes.maxDeflection} mm (L/${Math.round((L * 1000) / (extremes.maxDeflection || 1))})`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-slate-950/90 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl backdrop-blur-xl overflow-hidden ${className}`}
    >
      {/* 1. TOP HEADER & MEMBER SELECTOR */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Activity className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white">Results Studio</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                Sprint B3.1
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Interactive Member Internal Force & Station Inspector
            </p>
          </div>

          {/* Member Switcher Dropdown */}
          <div className="relative ml-2">
            <select
              value={activeId}
              onChange={(e) => {
                const newId = e.target.value;
                setActiveId(newId);
                onSelectMember?.(newId);
              }}
              className="appearance-none bg-slate-900 border border-slate-700 hover:border-slate-600 text-xs font-medium text-slate-200 pl-3 pr-8 py-2 rounded-lg cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
            >
              {memberList.map((m) => (
                <option key={m.memberId} value={m.memberId}>
                  {m.memberName} · {m.sectionDesignation} (L={m.length.toFixed(2)}m)
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Action Controls & Sign Convention */}
        <div className="flex items-center gap-2 text-xs">
          {/* Sign Convention Toggle */}
          <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setSignConvention('tension_face')}
              className={`px-2.5 py-1 rounded font-medium transition-all ${
                signConvention === 'tension_face'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Moment plotted on tension fiber side (Civil/Structural Engineering Standard)"
            >
              Tension Face
            </button>
            <button
              onClick={() => setSignConvention('cartesian')}
              className={`px-2.5 py-1 rounded font-medium transition-all ${
                signConvention === 'cartesian'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Mechanics / Cartesian coordinates"
            >
              Cartesian
            </button>
          </div>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors"
            title="Export station forces to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          {/* Copy Summary */}
          <button
            onClick={handleCopySummary}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors"
            title="Copy extrema summary"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* 2. MEMBER SUMMARY KPI BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-3.5 border-b border-slate-800/80 bg-slate-900/30 text-xs">
        <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
          <div className="text-slate-400 font-medium">Bending Moment ($M_z$)</div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-sm font-bold font-mono text-sky-400">
              {extremes.maxMz > 0 ? `+${extremes.maxMz}` : extremes.maxMz}
            </span>
            <span className="text-[10px] text-slate-500">/ {extremes.minMz} kNm</span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
          <div className="text-slate-400 font-medium">Shear Force ($V_y$)</div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-sm font-bold font-mono text-emerald-400">
              {Math.max(Math.abs(extremes.maxVy), Math.abs(extremes.minVy)).toFixed(1)}
            </span>
            <span className="text-[10px] text-slate-500">kN peak</span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
          <div className="text-slate-400 font-medium">Axial Force ($N$)</div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span
              className={`text-sm font-bold font-mono ${
                extremes.minN < 0 ? 'text-amber-400' : 'text-blue-400'
              }`}
            >
              {extremes.minN < 0 ? `${extremes.minN} kN` : `+${extremes.maxN} kN`}
            </span>
            <span className="text-[10px] text-slate-500">
              {extremes.minN < 0 ? '(Comp)' : '(Tens)'}
            </span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
          <div className="text-slate-400 font-medium">Deflection ($\delta$)</div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-sm font-bold font-mono text-purple-400">
              {extremes.maxDeflection.toFixed(1)} mm
            </span>
            <span className="text-[10px] text-slate-500">
              (L/{Math.round((L * 1000) / (extremes.maxDeflection || 1))})
            </span>
          </div>
        </div>
      </div>

      {/* 3. SYNCHRONIZED DIAGRAM PLOTS */}
      <div className="flex flex-col gap-5 p-6 overflow-y-auto max-h-[550px] custom-scrollbar">
        {/* BMD Plot */}
        <DiagramPlotCard
          title="Bending Moment Diagram (BMD · Mz)"
          unit="kNm"
          color="#0ea5e9"
          gradientId="grad-bmd"
          length={L}
          stations={stations}
          getValue={(st) => (signConvention === 'tension_face' ? -st.Mz : st.Mz)}
          hoveredX={hoveredX}
          onHoverX={setHoveredX}
          criticalPoints={criticalPoints.filter(
            (p) => p.type === 'max_moment' || p.type === 'min_moment' || p.type === 'inflection_point',
          )}
        />

        {/* SFD Plot */}
        <DiagramPlotCard
          title="Shear Force Diagram (SFD · Vy)"
          unit="kN"
          color="#10b981"
          gradientId="grad-sfd"
          length={L}
          stations={stations}
          getValue={(st) => st.Vy}
          hoveredX={hoveredX}
          onHoverX={setHoveredX}
          criticalPoints={criticalPoints.filter((p) => p.type === 'zero_shear' || p.type === 'max_shear')}
        />

        {/* Axial Plot */}
        <DiagramPlotCard
          title="Axial Force Diagram (AFD · N)"
          unit="kN"
          color="#f59e0b"
          gradientId="grad-afd"
          length={L}
          stations={stations}
          getValue={(st) => st.N}
          hoveredX={hoveredX}
          onHoverX={setHoveredX}
          criticalPoints={criticalPoints.filter((p) => p.type === 'max_axial')}
        />

        {/* Deflection Plot */}
        <DiagramPlotCard
          title="Elastic Deflection Curve (\u03B4)"
          unit="mm"
          color="#a855f7"
          gradientId="grad-defl"
          length={L}
          stations={stations}
          getValue={(st) => -st.deflection}
          hoveredX={hoveredX}
          onHoverX={setHoveredX}
          criticalPoints={criticalPoints.filter((p) => p.type === 'max_deflection')}
        />
      </div>

      {/* 4. BOTTOM HOVER READOUT BAR */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-900/60 text-xs font-mono">
        <div className="flex items-center gap-6">
          <div className="text-slate-400">
            Station:{' '}
            <span className="text-white font-bold">
              {hoveredStation ? `${hoveredStation.x.toFixed(2)} m` : 'Hover to inspect'}
            </span>{' '}
            {hoveredStation && (
              <span className="text-slate-500 font-normal">
                ({(hoveredStation.t * 100).toFixed(0)}% L)
              </span>
            )}
          </div>

          {hoveredStation && (
            <>
              <div className="text-sky-400">
                Mz: <span className="font-bold">{hoveredStation.Mz} kNm</span>
              </div>
              <div className="text-emerald-400">
                Vy: <span className="font-bold">{hoveredStation.Vy} kN</span>
              </div>
              <div className="text-amber-400">
                N: <span className="font-bold">{hoveredStation.N} kN</span>
              </div>
              <div className="text-purple-400">
                \u03B4: <span className="font-bold">{hoveredStation.deflection} mm</span>
              </div>
            </>
          )}
        </div>

        <div className="text-[11px] text-slate-500">
          Cubic Hermite Continuous Interpolation · 51 Stations
        </div>
      </div>
    </div>
  );
};

// ─── HIGH-PRECISION SVG DIAGRAM PLOT COMPONENT ─────────────────────────────

interface DiagramPlotCardProps {
  title: string;
  unit: string;
  color: string;
  gradientId: string;
  length: number;
  stations: StationResult[];
  getValue: (st: StationResult) => number;
  hoveredX: number | null;
  onHoverX: (x: number | null) => void;
  criticalPoints: Array<{ label: string; x: number; value: number; unit: string }>;
}

const DiagramPlotCard: React.FC<DiagramPlotCardProps> = ({
  title,
  unit,
  color,
  gradientId,
  length,
  stations,
  getValue,
  hoveredX,
  onHoverX,
  criticalPoints,
}) => {
  const width = 820;
  const height = 120;
  const marginX = 40;
  const plotWidth = width - marginX * 2;
  const centerY = height / 2;

  // Max absolute value for vertical scaling
  const maxAbs = useMemo(() => {
    let max = 0;
    for (const st of stations) {
      const v = Math.abs(getValue(st));
      if (v > max) max = v;
    }
    return max === 0 ? 1.0 : max;
  }, [stations, getValue]);

  const scaleY = (height * 0.42) / maxAbs;
  const scaleX = plotWidth / length;

  // Generate SVG path for filled ribbon
  const { pathD, lineD } = useMemo(() => {
    if (stations.length === 0) return { pathD: '', lineD: '' };

    let poly = `M ${marginX} ${centerY}`;
    let line = '';

    for (let i = 0; i < stations.length; i++) {
      const st = stations[i]!;
      const x = marginX + st.x * scaleX;
      const y = centerY - getValue(st) * scaleY;

      poly += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
      if (i === 0) {
        line = `M ${x.toFixed(1)} ${y.toFixed(1)}`;
      } else {
        line += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
      }
    }

    poly += ` L ${(marginX + length * scaleX).toFixed(1)} ${centerY} Z`;
    return { pathD: poly, lineD: line };
  }, [stations, length, scaleX, scaleY, centerY, getValue]);

  return (
    <div className="flex flex-col bg-slate-900/60 rounded-xl border border-slate-800/80 p-3.5">
      {/* Title & peak value header */}
      <div className="flex items-center justify-between mb-1.5 px-1">
        <span className="text-xs font-semibold text-slate-300">{title}</span>
        <span className="text-[11px] font-mono text-slate-400">
          Peak: \u00B1{maxAbs.toFixed(1)} {unit}
        </span>
      </div>

      {/* SVG Container */}
      <div
        className="relative w-full h-[120px] cursor-crosshair select-none"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const mouseRelX = e.clientX - rect.left - (marginX / width) * rect.width;
          const currentPlotWidth = (plotWidth / width) * rect.width;
          const xPos = Math.max(0, Math.min(length, (mouseRelX / currentPlotWidth) * length));
          onHoverX(xPos);
        }}
        onMouseLeave={() => onHoverX(null)}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.4" />
              <stop offset="100%" stopColor={color} stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Datum / Baseline */}
          <line
            x1={marginX}
            y1={centerY}
            x2={marginX + plotWidth}
            y2={centerY}
            stroke="#334155"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />

          {/* Filled Ribbon */}
          <path d={pathD} fill={`url(#${gradientId})`} />

          {/* Curve Peak Border Line */}
          <path d={lineD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />

          {/* Critical Point Dots & Labels */}
          {criticalPoints.map((cp, idx) => {
            const cx = marginX + cp.x * scaleX;
            // find value at cp.x
            let yVal = 0;
            for (const st of stations) {
              if (Math.abs(st.x - cp.x) < 0.1) {
                yVal = getValue(st);
                break;
              }
            }
            const cy = centerY - yVal * scaleY;

            return (
              <g key={idx}>
                <circle cx={cx} cy={cy} r="4" fill="#ffffff" stroke={color} strokeWidth="2" />
                <text
                  x={cx}
                  y={cy < centerY ? cy - 8 : cy + 14}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {cp.label} ({cp.value.toFixed(1)})
                </text>
              </g>
            );
          })}

          {/* Synchronized Hover Hairline */}
          {hoveredX !== null && (
            <g>
              <line
                x1={marginX + hoveredX * scaleX}
                y1={4}
                x2={marginX + hoveredX * scaleX}
                y2={height - 4}
                stroke="#38bdf8"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              <circle
                cx={marginX + hoveredX * scaleX}
                cy={centerY}
                r="3"
                fill="#38bdf8"
              />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};
