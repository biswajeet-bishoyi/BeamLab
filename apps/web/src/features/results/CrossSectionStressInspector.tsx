/**
 * BeamLab Sprint B3.3 — Cross-Section Stress & Strain State Inspector
 * High-fidelity 2D fiber stress field renderer with interactive station scrubbing,
 * Normal/Shear/Von-Mises/Strain heatmaps, dynamic neutral axis visualization,
 * and fiber probe inspection.
 */

import React, { useState, useMemo, useRef } from 'react';
import {
  StressRecoveryEngine,
  type CrossSectionStressState,
  type FiberPoint,
} from './StressRecoveryEngine';
import type { MemberEvaluationResult } from './MemberForceEvaluator';
import {
  Sliders,
  Crosshair,
  AlertCircle,
  CheckCircle2,
  Info,
  Layers,
  Compass,
} from 'lucide-react';

export type StressFieldMetric = 'sigmaX' | 'tau' | 'vonMises' | 'strainX';

interface CrossSectionStressInspectorProps {
  memberEvaluation: MemberEvaluationResult;
  initialStationX?: number;
  className?: string;
}

export const CrossSectionStressInspector: React.FC<CrossSectionStressInspectorProps> = ({
  memberEvaluation,
  initialStationX,
  className = '',
}) => {
  const { length: L, stations, sectionDesignation, materialGrade, memberName } = memberEvaluation;

  // Station scrubber state (default to midspan or initialStationX)
  const [stationX, setStationX] = useState<number>(() => {
    if (initialStationX !== undefined && initialStationX >= 0 && initialStationX <= L) {
      return initialStationX;
    }
    return Number((L / 2).toFixed(2));
  });

  // Active stress metric
  const [metric, setMetric] = useState<StressFieldMetric>('vonMises');

  // Interactive probed fiber
  const [hoveredFiber, setHoveredFiber] = useState<FiberPoint | null>(null);
  const [probeCoords, setProbeCoords] = useState<{ y: number; z: number } | null>(null);

  // SVG dimensions
  const svgRef = useRef<SVGSVGElement>(null);
  const svgWidth = 380;
  const svgHeight = 360;
  const cx = svgWidth / 2;
  const cy = svgHeight / 2;

  // Find forces at current stationX via interpolation
  const currentForces = useMemo(() => {
    if (stations.length === 0) return { N: 0, Vy: 0, Mz: 0 };
    let closest = stations[0]!;
    let minDiff = Math.abs(closest.x - stationX);
    for (const st of stations) {
      const diff = Math.abs(st.x - stationX);
      if (diff < minDiff) {
        minDiff = diff;
        closest = st;
      }
    }
    return {
      N: closest.N,
      Vy: closest.Vy,
      Mz: closest.Mz,
      Vz: 0,
      My: 0,
      T: 0,
    };
  }, [stations, stationX]);

  // Compute recovered stress state
  const stressState: CrossSectionStressState = useMemo(() => {
    const stationRatio = L > 0 ? stationX / L : 0;
    return StressRecoveryEngine.recoverStressState(
      memberEvaluation.memberId,
      stationX,
      stationRatio,
      sectionDesignation,
      materialGrade,
      currentForces,
      355, // fy = 355 MPa (S355)
      210e3, // E = 210,000 MPa
    );
  }, [memberEvaluation.memberId, stationX, L, sectionDesignation, materialGrade, currentForces]);

  const dims = useMemo(() => {
    return StressRecoveryEngine.getSectionDimensions(sectionDesignation);
  }, [sectionDesignation]);

  // Scale factors for rendering [m] to [px]
  // Dimensions are in meters; SVG viewBox is centered at (cx, cy)
  const maxDim = Math.max(dims.depth, dims.width) * 1000; // in mm
  const scalePxPerMm = (svgHeight * 0.72) / (maxDim || 350);

  // Color mapping logic for fibers
  const getColor = (fiber: FiberPoint): string => {
    if (metric === 'sigmaX') {
      // Normal stress: Red (Tension > 0) to Slate (0) to Blue (Compression < 0)
      const s = fiber.sigmaX;
      const limit = Math.max(
        Math.abs(stressState.extremes.maxTension),
        Math.abs(stressState.extremes.maxCompression),
        10,
      );
      const ratio = Math.max(-1, Math.min(1, s / limit));
      if (ratio > 0) {
        // Tension: Slate (100, 116, 139) -> Rose/Red (244, 63, 94)
        const t = ratio;
        const r = Math.round(100 + (244 - 100) * t);
        const g = Math.round(116 + (63 - 116) * t);
        const b = Math.round(139 + (94 - 139) * t);
        return `rgb(${r}, ${g}, ${b})`;
      } else {
        // Compression: Slate (100, 116, 139) -> Sky/Cyan (14, 165, 233)
        const c = -ratio;
        const r = Math.round(100 + (14 - 100) * c);
        const g = Math.round(116 + (165 - 116) * c);
        const b = Math.round(139 + (233 - 139) * c);
        return `rgb(${r}, ${g}, ${b})`;
      }
    } else if (metric === 'tau') {
      // Shear stress: Slate -> Emerald -> Amber
      const t = fiber.tau;
      const limit = Math.max(stressState.extremes.maxShear, 10);
      const ratio = Math.max(0, Math.min(1, t / limit));
      // Slate (71, 85, 105) -> Emerald (16, 185, 129)
      const r = Math.round(71 + (16 - 71) * ratio);
      const g = Math.round(85 + (185 - 85) * ratio);
      const b = Math.round(105 + (129 - 105) * ratio);
      return `rgb(${r}, ${g}, ${b})`;
    } else if (metric === 'strainX') {
      // Strain: similar to normal stress
      const eps = fiber.strainX;
      const limit = Math.max(Math.abs(eps), 500);
      const ratio = Math.max(-1, Math.min(1, eps / limit));
      if (ratio > 0) {
        return `rgb(244, ${Math.round(120 - ratio * 50)}, ${Math.round(160 - ratio * 60)})`;
      } else {
        return `rgb(${Math.round(80 - Math.abs(ratio) * 40)}, 180, 240)`;
      }
    } else {
      // Von Mises: Slate -> Green -> Amber -> Rose (Yield)
      const vm = fiber.vonMises;
      const fy = stressState.yieldStrength;
      const ratio = Math.min(1.2, vm / fy);

      if (ratio < 0.3) {
        // Low: Slate-Cyan
        return '#0284c7';
      } else if (ratio < 0.6) {
        // Moderate: Emerald
        return '#10b981';
      } else if (ratio < 0.85) {
        // High: Amber
        return '#f59e0b';
      } else if (ratio < 1.0) {
        // Near yield: Orange-Red
        return '#f97316';
      } else {
        // Yielding: Magenta/Rose
        return '#f43f5e';
      }
    }
  };

  // SVG mouse move handler for probe
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Convert to mm coordinates in section (y is depth, z is width)
    // In SVG: X is along z (width), Y is inverted along y (depth)
    const z_mm = (mouseX - cx) / scalePxPerMm;
    const y_mm = -(mouseY - cy) / scalePxPerMm;

    setProbeCoords({ y: Number(y_mm.toFixed(1)), z: Number(z_mm.toFixed(1)) });

    // Find nearest fiber
    let closest: FiberPoint | null = null;
    let minDist = 30; // mm search radius
    for (const f of stressState.fibers) {
      const dist = Math.hypot(f.y - y_mm, f.z - z_mm);
      if (dist < minDist) {
        minDist = dist;
        closest = f;
      }
    }
    setHoveredFiber(closest);
  };

  const handleMouseLeave = () => {
    setHoveredFiber(null);
    setProbeCoords(null);
  };

  // Section profile outline path (I-beam or CHS)
  const sectionOutline = useMemo(() => {
    if (dims.type === 'I') {
      const d_mm = dims.depth * 1000;
      const b_mm = dims.width * 1000;
      const tf_mm = (dims.tf ?? 0.012) * 1000;
      const tw_mm = (dims.tw ?? 0.008) * 1000;

      const halfD = (d_mm / 2) * scalePxPerMm;
      const halfB = (b_mm / 2) * scalePxPerMm;
      const tfPx = tf_mm * scalePxPerMm;
      const halfTw = (tw_mm / 2) * scalePxPerMm;

      // Draw standard symmetrical I-beam contour centered at (cx, cy)
      return `
        M ${cx - halfB} ${cy - halfD}
        L ${cx + halfB} ${cy - halfD}
        L ${cx + halfB} ${cy - halfD + tfPx}
        L ${cx + halfTw} ${cy - halfD + tfPx}
        L ${cx + halfTw} ${cy + halfD - tfPx}
        L ${cx + halfB} ${cy + halfD - tfPx}
        L ${cx + halfB} ${cy + halfD}
        L ${cx - halfB} ${cy + halfD}
        L ${cx - halfB} ${cy + halfD - tfPx}
        L ${cx - halfTw} ${cy + halfD - tfPx}
        L ${cx - halfTw} ${cy - halfD + tfPx}
        L ${cx - halfB} ${cy - halfD + tfPx}
        Z
      `;
    }
    return null;
  }, [dims, scalePxPerMm, cx, cy]);

  // Neutral Axis Line
  const naLine = useMemo(() => {
    const { angleDeg, offsetY } = stressState.neutralAxis;
    const offsetPx = -offsetY * scalePxPerMm; // inverted for SVG
    const span = svgWidth * 0.45;
    const rad = (angleDeg * Math.PI) / 180;

    const dx = span * Math.cos(rad);
    const dy = span * Math.sin(rad);

    return {
      x1: cx - dx,
      y1: cy + offsetPx + dy,
      x2: cx + dx,
      y2: cy + offsetPx - dy,
    };
  }, [stressState.neutralAxis, scalePxPerMm, cx, cy, svgWidth]);

  return (
    <div
      className={`flex flex-col bg-slate-950 rounded-2xl border border-slate-800 text-slate-100 overflow-hidden shadow-2xl ${className}`}
    >
      {/* 1. TOP HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-slate-800 bg-slate-900/60">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-white">Cross-Section Stress Inspector</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono">
                Sprint B3.3
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {memberName} · {sectionDesignation} ({materialGrade}, f<sub>y</sub> = {stressState.yieldStrength} MPa)
            </p>
          </div>
        </div>

        {/* Metric Selector Tabs */}
        <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-lg text-xs">
          <button
            onClick={() => setMetric('vonMises')}
            className={`px-3 py-1 rounded font-medium transition-all ${
              metric === 'vonMises'
                ? 'bg-purple-600 text-white shadow font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Von Mises (&sigma;<sub>vm</sub>)
          </button>
          <button
            onClick={() => setMetric('sigmaX')}
            className={`px-3 py-1 rounded font-medium transition-all ${
              metric === 'sigmaX'
                ? 'bg-blue-600 text-white shadow font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Normal (&sigma;<sub>x</sub>)
          </button>
          <button
            onClick={() => setMetric('tau')}
            className={`px-3 py-1 rounded font-medium transition-all ${
              metric === 'tau'
                ? 'bg-emerald-600 text-white shadow font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Shear (&tau;)
          </button>
          <button
            onClick={() => setMetric('strainX')}
            className={`px-3 py-1 rounded font-medium transition-all ${
              metric === 'strainX'
                ? 'bg-amber-600 text-white shadow font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Strain (&epsilon;)
          </button>
        </div>
      </div>

      {/* 2. STATION SCRUBBER & INTERNAL FORCES BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-3 border-b border-slate-800 bg-slate-900/30 text-xs">
        {/* Scrubber Slider */}
        <div className="flex items-center gap-3 w-full sm:w-1/2">
          <Sliders className="w-4 h-4 text-purple-400 shrink-0" />
          <div className="flex flex-col gap-1 w-full">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>Station x = {stationX.toFixed(2)} m ({((stationX / L) * 100).toFixed(0)}% span)</span>
              <span>L = {L.toFixed(2)} m</span>
            </div>
            <input
              type="range"
              min="0"
              max={L}
              step="0.05"
              value={stationX}
              onChange={(e) => setStationX(parseFloat(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>

          {/* Quick jump presets */}
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <button
              onClick={() => setStationX(0)}
              className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-[10px] text-slate-300"
            >
              Start
            </button>
            <button
              onClick={() => setStationX(Number((L / 2).toFixed(2)))}
              className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-[10px] text-slate-300 font-semibold text-purple-400"
            >
              Mid
            </button>
            <button
              onClick={() => setStationX(L)}
              className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-[10px] text-slate-300"
            >
              End
            </button>
          </div>
        </div>

        {/* Recovered Forces Readout */}
        <div className="flex items-center gap-4 text-slate-300 font-mono text-xs shrink-0">
          <div>
            <span className="text-slate-500">M<sub>z</sub>: </span>
            <span className="font-bold text-sky-400">{currentForces.Mz > 0 ? `+${currentForces.Mz}` : currentForces.Mz} kNm</span>
          </div>
          <div>
            <span className="text-slate-500">V<sub>y</sub>: </span>
            <span className="font-bold text-emerald-400">{currentForces.Vy} kN</span>
          </div>
          <div>
            <span className="text-slate-500">N: </span>
            <span className={`font-bold ${currentForces.N < 0 ? 'text-amber-400' : 'text-blue-400'}`}>
              {currentForces.N < 0 ? `${currentForces.N} kN (C)` : `+${currentForces.N} kN (T)`}
            </span>
          </div>
        </div>
      </div>

      {/* 3. MAIN INSPECTOR BODY: 2D VISUALIZATION + METRICS PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
        {/* Left Column: 2D Section Slice with Heatmap & Probing */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center bg-slate-900/40 rounded-xl border border-slate-800/80 p-4 relative">
          <svg
            ref={svgRef}
            width={svgWidth}
            height={svgHeight}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="cursor-crosshair select-none"
          >
            {/* Background Grid Lines */}
            <line x1={cx} y1={20} x2={cx} y2={svgHeight - 20} stroke="#1e293b" strokeDasharray="3 3" />
            <line x1={20} y1={cy} x2={svgWidth - 20} y2={cy} stroke="#1e293b" strokeDasharray="3 3" />

            {/* Coordinate Axis Labels */}
            <text x={cx + 6} y={30} fill="#475569" fontSize="10" fontFamily="monospace">
              +y (Depth)
            </text>
            <text x={svgWidth - 45} y={cy - 6} fill="#475569" fontSize="10" fontFamily="monospace">
              +z (Width)
            </text>

            {/* Section Outer Boundary */}
            {sectionOutline && (
              <path
                d={sectionOutline}
                fill="#0f172a"
                stroke="#334155"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            )}

            {/* CHS Tube Circles */}
            {dims.type === 'CHS' && (
              <g>
                <circle
                  cx={cx}
                  cy={cy}
                  r={((dims.depth * 1000) / 2) * scalePxPerMm}
                  fill="#0f172a"
                  stroke="#334155"
                  strokeWidth="2"
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r={(((dims.depth * 1000) / 2 - (dims.t ?? 0.008) * 1000)) * scalePxPerMm}
                  fill="#020617"
                  stroke="#334155"
                  strokeWidth="1.5"
                />
              </g>
            )}

            {/* Discretized Fiber Cells / Dots */}
            {stressState.fibers.map((f, idx) => {
              const fx = cx + f.z * scalePxPerMm;
              const fy = cy - f.y * scalePxPerMm;
              const fillColor = getColor(f);
              const isHovered = hoveredFiber === f;

              return (
                <circle
                  key={idx}
                  cx={fx}
                  cy={fy}
                  r={isHovered ? 4.5 : 2.5}
                  fill={fillColor}
                  stroke={isHovered ? '#ffffff' : 'none'}
                  strokeWidth={isHovered ? 1.5 : 0}
                  className="transition-all duration-75"
                />
              );
            })}

            {/* Neutral Axis (N.A.) Line */}
            {stressState.neutralAxis.isWithinSection && (
              <g>
                <line
                  x1={naLine.x1}
                  y1={naLine.y1}
                  x2={naLine.x2}
                  y2={naLine.y2}
                  stroke="#ec4899"
                  strokeWidth="2"
                  strokeDasharray="5 3"
                />
                <text
                  x={naLine.x2 + 4}
                  y={naLine.y2 + 3}
                  fill="#ec4899"
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  N.A.
                </text>
              </g>
            )}

            {/* Centroid Cross Marker */}
            <circle cx={cx} cy={cy} r="3" fill="#ffffff" stroke="#000000" strokeWidth="1" />

            {/* Probe Crosshair & Readout */}
            {probeCoords && (
              <g>
                <line
                  x1={cx + probeCoords.z * scalePxPerMm - 10}
                  y1={cy - probeCoords.y * scalePxPerMm}
                  x2={cx + probeCoords.z * scalePxPerMm + 10}
                  y2={cy - probeCoords.y * scalePxPerMm}
                  stroke="#38bdf8"
                  strokeWidth="1"
                />
                <line
                  x1={cx + probeCoords.z * scalePxPerMm}
                  y1={cy - probeCoords.y * scalePxPerMm - 10}
                  x2={cx + probeCoords.z * scalePxPerMm}
                  y2={cy - probeCoords.y * scalePxPerMm + 10}
                  stroke="#38bdf8"
                  strokeWidth="1"
                />
              </g>
            )}
          </svg>

          {/* Neutral Axis Status Capsule */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-[11px] font-mono text-pink-400">
            <Compass className="w-3 h-3" />
            <span>
              N.A. &alpha; = {stressState.neutralAxis.angleDeg}&deg; | y<sub>NA</sub> = {stressState.neutralAxis.offsetY > 0 ? `+${stressState.neutralAxis.offsetY}` : stressState.neutralAxis.offsetY} mm
            </span>
          </div>

          {/* Interactive Fiber Probe Tooltip */}
          {hoveredFiber && (
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/90 border border-blue-500/40 text-xs font-mono backdrop-blur-md shadow-lg">
              <div className="flex items-center gap-2">
                <Crosshair className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-slate-400">
                  Fiber (y={hoveredFiber.y}mm, z={hoveredFiber.z}mm):
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sky-400 font-bold">&sigma;<sub>x</sub>: {hoveredFiber.sigmaX} MPa</span>
                <span className="text-emerald-400 font-bold">&tau;: {hoveredFiber.tau} MPa</span>
                <span className="text-purple-400 font-bold">&sigma;<sub>vm</sub>: {hoveredFiber.vonMises} MPa</span>
                <span className="text-amber-400 font-bold">&epsilon;: {hoveredFiber.strainX} &mu;&epsilon;</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Stress Extrema & Engineering Verification */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Yield Status Banner */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              stressState.extremes.isYielding
                ? 'bg-rose-950/30 border-rose-500/50 text-rose-300'
                : stressState.extremes.yieldRatio > 0.85
                ? 'bg-amber-950/30 border-amber-500/50 text-amber-300'
                : 'bg-emerald-950/30 border-emerald-500/50 text-emerald-300'
            }`}
          >
            <div className="flex items-center gap-3">
              {stressState.extremes.isYielding ? (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              )}
              <div>
                <div className="font-semibold text-xs uppercase tracking-wider">
                  {stressState.extremes.isYielding
                    ? 'Cross-Section Yielding Detected'
                    : 'Elastic Cross-Section State'}
                </div>
                <div className="text-xs opacity-80 mt-0.5">
                  Peak &sigma;<sub>vm</sub> = {stressState.extremes.maxVonMises} MPa ({(stressState.extremes.yieldRatio * 100).toFixed(1)}% of f<sub>y</sub>)
                </div>
              </div>
            </div>
            <div className="text-right font-mono">
              <span className="text-lg font-bold">
                {(stressState.extremes.yieldRatio * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Section Extreme Stress Quantities */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-slate-400 font-medium">Max Tensile Stress</div>
              <div className="text-sm font-bold font-mono text-rose-400 mt-1">
                +{stressState.extremes.maxTension} MPa
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Bottom extreme fiber</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-slate-400 font-medium">Max Compressive Stress</div>
              <div className="text-sm font-bold font-mono text-sky-400 mt-1">
                {stressState.extremes.maxCompression} MPa
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Top extreme fiber</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-slate-400 font-medium">Max Shear Stress (&tau;)</div>
              <div className="text-sm font-bold font-mono text-emerald-400 mt-1">
                {stressState.extremes.maxShear} MPa
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Neutral axis web center</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-slate-400 font-medium">Peak Von Mises (&sigma;<sub>vm</sub>)</div>
              <div className="text-sm font-bold font-mono text-purple-400 mt-1">
                {stressState.extremes.maxVonMises} MPa
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Combined state</div>
            </div>
          </div>

          {/* Landmark Fibers Table */}
          <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 text-xs">
            <div className="flex items-center gap-2 mb-2 font-medium text-slate-300">
              <Info className="w-3.5 h-3.5 text-blue-400" />
              <span>Key Fiber Landmarks</span>
            </div>

            <div className="space-y-1.5 font-mono text-[11px]">
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Top Flange Center</span>
                <span className="text-sky-400">{stressState.criticalFibers.topCenter.sigmaX} MPa</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Bottom Flange Center</span>
                <span className="text-rose-400">+{stressState.criticalFibers.bottomCenter.sigmaX} MPa</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Web Mid-Height (&tau; peak)</span>
                <span className="text-emerald-400">{stressState.criticalFibers.webCenter.tau} MPa</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">Flange Tip (Biaxial corner)</span>
                <span className="text-purple-400">{stressState.criticalFibers.flangeTipLeft.vonMises} MPa</span>
              </div>
            </div>
          </div>

          {/* Heatmap Legend Bar */}
          <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 text-xs">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
              <span>{metric === 'sigmaX' ? 'Compression (-)' : 'Low (0 MPa)'}</span>
              <span className="font-semibold text-slate-300 uppercase">{metric} Field</span>
              <span>{metric === 'sigmaX' ? 'Tension (+)' : 'Yield Limit (355 MPa)'}</span>
            </div>
            <div
              className="h-2.5 rounded-full w-full"
              style={{
                background:
                  metric === 'sigmaX'
                    ? 'linear-gradient(to right, #0ea5e9, #64748b, #f43f5e)'
                    : metric === 'tau'
                    ? 'linear-gradient(to right, #475569, #10b981, #f59e0b)'
                    : 'linear-gradient(to right, #0284c7, #10b981, #f59e0b, #f97316, #f43f5e)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
