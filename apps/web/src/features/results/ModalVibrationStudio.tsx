/**
 * BeamLab Sprint B3.5 — Dynamic Mode Shape & Vibration Studio
 * High-performance interactive modal vibration analyzer featuring:
 * 1. 60 FPS harmonic phase oscillator wireframe rendering u(t) = phi * sin(omega * t)
 * 2. Directional modal mass participation spectrum bars and seismic code compliance check (>= 90%)
 * 3. Interactive mode shape selector, speed/amplitude multipliers, and CSV export
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ModalAnalysisEngine,
  type ModalAnalysisSummary,
  type ModalMassParticipation,
} from './ModalAnalysisEngine';
import {
  Activity,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Download,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Zap,
} from 'lucide-react';

interface ModalVibrationStudioProps {
  onClose?: () => void;
  className?: string;
}

export const ModalVibrationStudio: React.FC<ModalVibrationStudioProps> = ({
  onClose,
  className = '',
}) => {
  const modalSummary: ModalAnalysisSummary = useMemo(() => {
    return ModalAnalysisEngine.getDemoModalSolution('portal_frame');
  }, []);

  const [activeModeIndex, setActiveModeIndex] = useState<number>(0);
  const activeMode: ModalMassParticipation = modalSummary.modes[activeModeIndex] || modalSummary.modes[0]!;

  // Animation controls
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1.0);
  const [amplitudeScale, setAmplitudeScale] = useState<number>(20.0); // Magnification multiplier
  const [showUndeformedGhost, setShowUndeformedGhost] = useState<boolean>(true);

  // Time harmonic phase (in radians)
  const [phase, setPhase] = useState<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    const animate = (currentTime: number) => {
      const dt = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      if (isPlaying) {
        // omega = 2 * PI * f
        const omega = 2 * Math.PI * activeMode.frequencyHz * speedMultiplier;
        setPhase((prev) => (prev + omega * dt) % (2 * Math.PI));
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, activeMode.frequencyHz, speedMultiplier]);

  // SVG Geometry definition for portal frame
  // Nodes in model: Base L (0, 0), Eaves L (0, 4.5), Apex (6, 6.5), Eaves R (12, 4.5), Base R (12, 0)
  const svgWidth = 460;
  const svgHeight = 280;

  // Base coordinates in SVG px
  const baseL = { x: 70, y: 240 };
  const eavesL = { x: 70, y: 110 };
  const apex = { x: 230, y: 50 };
  const eavesR = { x: 390, y: 110 };
  const baseR = { x: 390, y: 240 };

  // Calculate deformed node positions based on active mode eigenvector and phase
  const harmonicFactor = Math.sin(phase);

  const deformedNodes = useMemo(() => {
    // Mode-specific relative displacement shapes
    let dxEavesL = 0;
    let dzEavesL = 0;
    let dxApex = 0;
    let dzApex = 0;
    let dxEavesR = 0;
    let dzEavesR = 0;

    const amp = amplitudeScale * harmonicFactor;

    if (activeMode.modeNumber === 1) {
      // Lateral sway X: all top nodes move right
      dxEavesL = amp * 1.0;
      dxApex = amp * 1.15;
      dxEavesR = amp * 1.0;
      dzApex = -amp * 0.1;
    } else if (activeMode.modeNumber === 2) {
      // Symmetrical roof vertical bouncing
      dzApex = amp * 1.4;
      dzEavesL = -amp * 0.2;
      dzEavesR = -amp * 0.2;
      dxEavesL = amp * 0.3;
      dxEavesR = -amp * 0.3;
    } else if (activeMode.modeNumber === 3) {
      // Out of plane / slight skew
      dxEavesL = -amp * 0.6;
      dxEavesR = amp * 0.6;
      dzApex = amp * 0.2;
    } else if (activeMode.modeNumber === 4) {
      // Asymmetrical rafter flexure (S-shape)
      dxApex = amp * 0.7;
      dzApex = amp * 0.8;
      dzEavesL = -amp * 0.6;
      dzEavesR = amp * 0.6;
    } else if (activeMode.modeNumber === 5) {
      // Torsion / opposing columns
      dxEavesL = -amp * 0.9;
      dxEavesR = amp * 0.9;
    } else {
      // Higher column flexure
      dxEavesL = amp * 0.4;
      dxEavesR = -amp * 0.4;
      dzApex = -amp * 1.0;
    }

    return {
      baseL,
      eavesL: { x: eavesL.x + dxEavesL, y: eavesL.y - dzEavesL },
      apex: { x: apex.x + dxApex, y: apex.y - dzApex },
      eavesR: { x: eavesR.x + dxEavesR, y: eavesR.y - dzEavesR },
      baseR,
    };
  }, [activeMode.modeNumber, amplitudeScale, harmonicFactor, eavesL, apex, eavesR, baseL, baseR]);

  // Export CSV
  const handleExportCSV = () => {
    let csv = 'Mode Number,Frequency [Hz],Period [s],Omega [rad/s],Description,Dominant Type,Ux [%],Uy [%],Uz [%],Cum Ux [%],Cum Uy [%],Cum Uz [%],Gen Mass [kg]\n';
    for (const m of modalSummary.modes) {
      csv += `${m.modeNumber},${m.frequencyHz},${m.periodSec},${m.omegaRadSec},"${m.description}",${m.dominantType},${m.massParticipation.uxPercent},${m.massParticipation.uyPercent},${m.massParticipation.uzPercent},${m.massParticipation.cumulativeUx},${m.massParticipation.cumulativeUy},${m.massParticipation.cumulativeUz},${m.generalizedMassKg}\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Modal_Analysis_${modalSummary.modelName.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy Summary
  const [copied, setCopied] = useState<boolean>(false);
  const handleCopySummary = () => {
    const c = modalSummary.codeCompliance;
    const text = `BEAMLAB DYNAMIC MODAL ANALYSIS SUMMARY
Model: ${modalSummary.modelName}
Total Mass: ${modalSummary.totalMassKg.toLocaleString()} kg
Fundamental Period T1: ${modalSummary.fundamentalPeriodSec} s (f1 = ${modalSummary.fundamentalFrequencyHz} Hz)

CODE COMPLIANCE (Eurocode 8 / ASCE 7-22 >= 90% Mass):
• Ux Participation: ${modalSummary.modes[modalSummary.modes.length - 1]?.massParticipation.cumulativeUx}% [${c.isUxCompliant ? 'PASS' : 'FAIL'}] (Required Modes: ${c.requiredModesFor90PercentX})
• Uy Participation: ${modalSummary.modes[modalSummary.modes.length - 1]?.massParticipation.cumulativeUy}% [${c.isUyCompliant ? 'PASS' : 'FAIL'}] (Required Modes: ${c.requiredModesFor90PercentY})

MODAL EIGENVALUES:
${modalSummary.modes
  .map(
    (m) =>
      `• Mode ${m.modeNumber}: f = ${m.frequencyHz} Hz (T = ${m.periodSec} s) | Ux = ${m.massParticipation.uxPercent}%, Uy = ${m.massParticipation.uyPercent}%, Uz = ${m.massParticipation.uzPercent}% | ${m.description}`,
  )
  .join('\n')}
`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`flex flex-col bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden ${className}`}
    >
      {/* 1. HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-slate-800 bg-slate-900/60">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-white">Dynamic Mode Shape & Vibration Studio</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                Sprint B3.5
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {modalSummary.modelName} · Eigenvalues, Mass Participation & Harmonic Vibration
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          <button
            onClick={handleCopySummary}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Report'}</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {/* 2. MODE SELECTOR PILL CAROUSEL */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-800 bg-slate-900/30 overflow-x-auto custom-scrollbar text-xs">
        {modalSummary.modes.map((m, idx) => (
          <button
            key={m.modeNumber}
            onClick={() => setActiveModeIndex(idx)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all shrink-0 ${
              activeModeIndex === idx
                ? 'bg-cyan-600/20 border-cyan-500/60 text-white font-semibold shadow-lg shadow-cyan-950/50'
                : 'bg-slate-900 border-slate-800 hover:bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-slate-800 text-[11px] font-mono flex items-center justify-center font-bold">
              {m.modeNumber}
            </span>
            <div className="flex flex-col text-left">
              <span className="font-mono font-bold text-cyan-400">
                {m.frequencyHz.toFixed(2)} Hz
              </span>
              <span className="text-[10px] text-slate-400 font-sans">
                T = {m.periodSec.toFixed(2)}s
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* 3. MAIN STUDIO VIEW: 2D HARMONIC VISUALIZER + MODAL MASS PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
        {/* Left Column: 60 FPS Harmonic Phase Wireframe */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center bg-slate-900/40 rounded-xl border border-slate-800/80 p-4 relative">
          <svg
            width={svgWidth}
            height={svgHeight}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="select-none"
          >
            {/* Ground line */}
            <line x1={40} y1={baseL.y + 10} x2={420} y2={baseL.y + 10} stroke="#334155" strokeWidth="2" />
            <line x1={40} y1={baseL.y + 10} x2={30} y2={baseL.y + 20} stroke="#334155" strokeWidth="1" />
            <line x1={420} y1={baseL.y + 10} x2={410} y2={baseL.y + 20} stroke="#334155" strokeWidth="1" />

            {/* Undeformed Ghost Wireframe */}
            {showUndeformedGhost && (
              <g stroke="#334155" strokeWidth="1.5" strokeDasharray="4 3" fill="none">
                <line x1={baseL.x} y1={baseL.y} x2={eavesL.x} y2={eavesL.y} />
                <line x1={eavesL.x} y1={eavesL.y} x2={apex.x} y2={apex.y} />
                <line x1={apex.x} y1={apex.y} x2={eavesR.x} y2={eavesR.y} />
                <line x1={eavesR.x} y1={eavesR.y} x2={baseR.x} y2={baseR.y} />

                {/* Ghost Nodes */}
                <circle cx={eavesL.x} cy={eavesL.y} r="3" fill="#475569" />
                <circle cx={apex.x} cy={apex.y} r="3" fill="#475569" />
                <circle cx={eavesR.x} cy={eavesR.y} r="3" fill="#475569" />
              </g>
            )}

            {/* Dynamic Deformed Shape (Harmonic Oscillation) */}
            <g stroke="#06b6d4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
              {/* Left Column */}
              <line
                x1={deformedNodes.baseL.x}
                y1={deformedNodes.baseL.y}
                x2={deformedNodes.eavesL.x}
                y2={deformedNodes.eavesL.y}
              />
              {/* Left Rafter */}
              <line
                x1={deformedNodes.eavesL.x}
                y1={deformedNodes.eavesL.y}
                x2={deformedNodes.apex.x}
                y2={deformedNodes.apex.y}
              />
              {/* Right Rafter */}
              <line
                x1={deformedNodes.apex.x}
                y1={deformedNodes.apex.y}
                x2={deformedNodes.eavesR.x}
                y2={deformedNodes.eavesR.y}
              />
              {/* Right Column */}
              <line
                x1={deformedNodes.eavesR.x}
                y1={deformedNodes.eavesR.y}
                x2={deformedNodes.baseR.x}
                y2={deformedNodes.baseR.y}
              />
            </g>

            {/* Support Pin Triangles */}
            <polygon
              points={`${baseL.x},${baseL.y} ${baseL.x - 8},${baseL.y + 10} ${baseL.x + 8},${baseL.y + 10}`}
              fill="#0ea5e9"
            />
            <polygon
              points={`${baseR.x},${baseR.y} ${baseR.x - 8},${baseR.y + 10} ${baseR.x + 8},${baseR.y + 10}`}
              fill="#0ea5e9"
            />

            {/* Glowing Deformed Node Dots */}
            <circle cx={deformedNodes.eavesL.x} cy={deformedNodes.eavesL.y} r="5" fill="#ffffff" stroke="#06b6d4" strokeWidth="2" />
            <circle cx={deformedNodes.apex.x} cy={deformedNodes.apex.y} r="6" fill="#ffffff" stroke="#06b6d4" strokeWidth="2" />
            <circle cx={deformedNodes.eavesR.x} cy={deformedNodes.eavesR.y} r="5" fill="#ffffff" stroke="#06b6d4" strokeWidth="2" />
          </svg>

          {/* Top Description Capsule */}
          <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs font-mono backdrop-blur-md">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-bold text-white">Mode {activeMode.modeNumber}:</span>
            <span className="text-slate-300 font-sans">{activeMode.description}</span>
          </div>

          {/* Bottom Floating Animation Controls */}
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs backdrop-blur-md">
            {/* Play/Pause & Reset */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
                title={isPlaying ? 'Pause vibration' : 'Play vibration'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>

              <button
                onClick={() => setPhase(0)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Reset phase to 0"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <span className="font-mono text-[11px] text-slate-400 ml-1">
                &omega;t = {((phase * 180) / Math.PI).toFixed(0)}&deg;
              </span>
            </div>

            {/* Amplitude Scale Slider */}
            <div className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] text-slate-400">Scale:</span>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={amplitudeScale}
                onChange={(e) => setAmplitudeScale(parseFloat(e.target.value))}
                className="w-20 accent-cyan-500 cursor-pointer h-1 bg-slate-800 rounded-lg"
              />
              <span className="font-mono text-[11px] text-white w-6">{amplitudeScale}x</span>
            </div>

            {/* Speed Multiplier */}
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5">
              {[0.2, 0.5, 1.0, 2.0].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeedMultiplier(s)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    speedMultiplier === s ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Ghost wireframe toggle */}
            <button
              onClick={() => setShowUndeformedGhost(!showUndeformedGhost)}
              className={`px-2 py-1 rounded text-[11px] border transition-colors ${
                showUndeformedGhost
                  ? 'bg-slate-800 text-slate-200 border-slate-700 font-semibold'
                  : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              Ghost
            </button>
          </div>
        </div>

        {/* Right Column: Modal Properties & Mass Participation */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Seismic Code Mass Participation Compliance Banner */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              modalSummary.codeCompliance.status === 'COMPLIANT'
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-950/30 border-amber-500/40 text-amber-300'
            }`}
          >
            <div className="flex items-center gap-3">
              {modalSummary.codeCompliance.status === 'COMPLIANT' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
              )}
              <div>
                <div className="font-semibold text-xs uppercase tracking-wider">
                  {modalSummary.codeCompliance.status === 'COMPLIANT'
                    ? 'Eurocode 8 / ASCE 7-22 Compliant'
                    : 'Additional Modes Required'}
                </div>
                <div className="text-xs opacity-80 mt-0.5">
                  &sum;U<sub>X</sub> = {modalSummary.modes[modalSummary.modes.length - 1]?.massParticipation.cumulativeUx}% | &sum;U<sub>Y</sub> = {modalSummary.modes[modalSummary.modes.length - 1]?.massParticipation.cumulativeUy}% (&ge; 90% target)
                </div>
              </div>
            </div>
            <div className="text-right font-mono font-bold text-sm">
              6 Modes
            </div>
          </div>

          {/* Active Mode Properties Card */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-slate-400">Natural Frequency (f<sub>n</sub>)</div>
              <div className="text-lg font-bold font-mono text-cyan-400 mt-1">
                {activeMode.frequencyHz} Hz
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                &omega; = {activeMode.omegaRadSec} rad/s
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-slate-400">Natural Period (T<sub>n</sub>)</div>
              <div className="text-lg font-bold font-mono text-emerald-400 mt-1">
                {activeMode.periodSec} s
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Harmonic cycle time
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-slate-400">Effective Mass U<sub>X</sub></div>
              <div className="text-lg font-bold font-mono text-purple-400 mt-1">
                {activeMode.massParticipation.uxPercent}%
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Cum: {activeMode.massParticipation.cumulativeUx}%
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-slate-400">Generalized Mass (M<sub>n</sub>)</div>
              <div className="text-lg font-bold font-mono text-amber-400 mt-1">
                {activeMode.generalizedMassKg.toLocaleString()} kg
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Modal inertia</div>
            </div>
          </div>

          {/* Directional Mass Participation Progress Bars */}
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-xs">
            <div className="font-semibold text-slate-300 mb-3">
              Cumulative Directional Mass Participation
            </div>

            <div className="space-y-3">
              {/* X Direction */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                  <span>Translational X (&sum;U<sub>X</sub>)</span>
                  <span className="font-bold text-white">
                    {modalSummary.modes[modalSummary.modes.length - 1]?.massParticipation.cumulativeUx}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden relative">
                  <div
                    className="h-full bg-cyan-500 rounded-full transition-all duration-300"
                    style={{ width: `${modalSummary.modes[modalSummary.modes.length - 1]?.massParticipation.cumulativeUx}%` }}
                  />
                  <div className="absolute top-0 bottom-0 left-[90%] w-0.5 bg-rose-500" title="90% threshold" />
                </div>
              </div>

              {/* Y Direction */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                  <span>Translational Y (&sum;U<sub>Y</sub>)</span>
                  <span className="font-bold text-white">
                    {modalSummary.modes[modalSummary.modes.length - 1]?.massParticipation.cumulativeUy}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden relative">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${modalSummary.modes[modalSummary.modes.length - 1]?.massParticipation.cumulativeUy}%` }}
                  />
                  <div className="absolute top-0 bottom-0 left-[90%] w-0.5 bg-rose-500" title="90% threshold" />
                </div>
              </div>

              {/* Z Direction */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                  <span>Vertical Z (&sum;U<sub>Z</sub>)</span>
                  <span className="font-bold text-white">
                    {modalSummary.modes[modalSummary.modes.length - 1]?.massParticipation.cumulativeUz}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden relative">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all duration-300"
                    style={{ width: `${modalSummary.modes[modalSummary.modes.length - 1]?.massParticipation.cumulativeUz}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. DETAILED MODAL EIGENVALUE SPECTRUM TABLE */}
      <div className="px-6 pb-6">
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
          <table className="w-full text-xs text-left">
            <thead className="border-b border-slate-800 bg-slate-900/70 text-slate-400 text-[11px] font-mono uppercase">
              <tr>
                <th className="py-2.5 px-4">Mode</th>
                <th className="py-2.5 px-3 text-right">f<sub>n</sub> [Hz]</th>
                <th className="py-2.5 px-3 text-right">T<sub>n</sub> [s]</th>
                <th className="py-2.5 px-3 text-right">U<sub>X</sub> [%]</th>
                <th className="py-2.5 px-3 text-right">U<sub>Y</sub> [%]</th>
                <th className="py-2.5 px-3 text-right">U<sub>Z</sub> [%]</th>
                <th className="py-2.5 px-4">Motion Classification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {modalSummary.modes.map((m, idx) => (
                <tr
                  key={m.modeNumber}
                  onClick={() => setActiveModeIndex(idx)}
                  className={`cursor-pointer transition-colors ${
                    activeModeIndex === idx ? 'bg-cyan-950/30 text-white font-semibold' : 'hover:bg-slate-800/30 text-slate-300'
                  }`}
                >
                  <td className="py-2.5 px-4 font-bold flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-[11px] flex items-center justify-center">
                      {m.modeNumber}
                    </span>
                    <span className="font-sans font-normal text-slate-400">{m.description}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-cyan-400">{m.frequencyHz.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right text-emerald-400">{m.periodSec.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right text-purple-400">{m.massParticipation.uxPercent}%</td>
                  <td className="py-2.5 px-3 text-right text-amber-400">{m.massParticipation.uyPercent}%</td>
                  <td className="py-2.5 px-3 text-right text-sky-400">{m.massParticipation.uzPercent}%</td>
                  <td className="py-2.5 px-4 font-sans text-slate-400">
                    <span className="px-2 py-0.5 rounded bg-slate-800/80 text-[11px] font-mono">
                      {m.dominantType}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
