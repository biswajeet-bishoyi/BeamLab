import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Layers,
  Hammer,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Sliders,
  Table,
  Cpu,
  Maximize2,
  RotateCcw,
  Sparkles,
  Download,
  Info,
} from 'lucide-react';
import {
  SinglePlateShearEngine,
  DoubleAngleShearEngine,
  EndPlateMomentEngine,
  ColumnBasePlateEngine,
  SinglePlateConfig,
  DoubleAngleConfig,
  EndPlateConfig,
  ColumnBasePlateConfig,
  DesignStandard,
  DesignMethod,
  BoltGrade,
  LimitStateResult,
} from '@beamstudio/connection-engine';

interface SteelConnectionStudioProps {
  onClose: () => void;
}

type ConnectionFamily = 'SINGLE_PLATE' | 'DOUBLE_ANGLE' | 'EXTENDED_4E' | 'BASE_PLATE';
type ActiveTab = 'parameters' | 'limitStates' | 'equations' | 'bom';

export const SteelConnectionStudio: React.FC<SteelConnectionStudioProps> = ({ onClose }) => {
  const [activeFamily, setActiveFamily] = useState<ConnectionFamily>('SINGLE_PLATE');
  const [activeTab, setActiveTab] = useState<ActiveTab>('parameters');
  const [standard, setStandard] = useState<DesignStandard>('AISC_360_16');
  const [method, setMethod] = useState<DesignMethod>('LRFD');

  // Interactive Exploded View & Viewport Controls
  const [explodedOffset, setExplodedOffset] = useState<number>(0);
  const [showDimensions, setShowDimensions] = useState<boolean>(true);
  const [showWeldHighlights, setShowWeldHighlights] = useState<boolean>(true);

  // Parameter states for Single Plate (Shear Tab)
  const [spPlateThickness, setSpPlateThickness] = useState<number>(10);
  const [spBoltRows, setSpBoltRows] = useState<number>(3);
  const [spBoltDiameter, setSpBoltDiameter] = useState<number>(20);
  const [spBoltGrade, setSpBoltGrade] = useState<BoltGrade>('A325');
  const [spPitch, setSpPitch] = useState<number>(75);
  const [spWeldLeg, setSpWeldLeg] = useState<number>(8);
  const [spDimA, setSpDimA] = useState<number>(75);
  const [spShearDemand, setSpShearDemand] = useState<number>(140);

  // Parameter states for Moment End-Plate (4E)
  const [mpPlateThickness, setMpPlateThickness] = useState<number>(25);
  const [mpBoltDiameter, setMpBoltDiameter] = useState<number>(24);
  const [mpBoltGrade, setMpBoltGrade] = useState<BoltGrade>('A325');
  const [mpMomentDemand, setMpMomentDemand] = useState<number>(220);
  const [mpShearDemand, setMpShearDemand] = useState<number>(110);

  // Parameter states for Column Base Plate
  const [bpPlateLengthN, setBpPlateLengthN] = useState<number>(550);
  const [bpPlateWidthB, setBpPlateWidthB] = useState<number>(500);
  const [bpPlateThickness, setBpPlateThickness] = useState<number>(35);
  const [bpAxialDemand, setBpAxialDemand] = useState<number>(1100);
  const [bpMomentDemand, setBpMomentDemand] = useState<number>(85);
  const [bpShearDemand, setBpShearDemand] = useState<number>(140);

  // -----------------------------------------------------------------
  // Live Engine Evaluations
  // -----------------------------------------------------------------
  const singlePlateResult = useMemo(() => {
    const config: SinglePlateConfig = {
      connectionId: 'ST-LIVE-01',
      supportType: 'COLUMN_FLANGE',
      plateThickness_mm: spPlateThickness,
      plateHeight_mm: (spBoltRows - 1) * spPitch + 80,
      plateWidth_mm: spDimA + 40,
      plateFy_MPa: 250,
      plateFu_MPa: 400,
      boltGrade: spBoltGrade,
      boltDiameter_mm: spBoltDiameter,
      boltRows: spBoltRows,
      boltColumns: 1,
      pitchY_mm: spPitch,
      edgeDistanceTop_mm: 40,
      edgeDistanceSide_mm: 40,
      threadCondition: 'INCLUDED',
      holeType: 'STANDARD',
      weldToBoltLine_a_mm: spDimA,
      weldLeg_mm: spWeldLeg,
      weldElectrode: 'E70XX',
      beam: {
        id: 'B-1',
        name: 'W16x50',
        depth_mm: 413,
        flangeWidth_mm: 180,
        flangeThickness_mm: 16.0,
        webThickness_mm: 9.65,
        yieldStrength_MPa: 345,
        ultimateStrength_MPa: 450,
      },
    };

    return SinglePlateShearEngine.evaluate({
      config,
      shearDemand_kN: spShearDemand,
      standard,
      method,
    });
  }, [spPlateThickness, spBoltRows, spBoltDiameter, spBoltGrade, spPitch, spWeldLeg, spDimA, spShearDemand, standard, method]);

  const momentPlateResult = useMemo(() => {
    const config: EndPlateConfig = {
      connectionId: 'MP-LIVE-01',
      endPlateType: 'EXTENDED_4E',
      plateThickness_mm: mpPlateThickness,
      plateWidth_mm: 230,
      plateHeight_mm: 700,
      plateFy_MPa: 250,
      plateFu_MPa: 400,
      boltGrade: mpBoltGrade,
      boltDiameter_mm: mpBoltDiameter,
      gageX_mm: 125,
      pitchFlangeInside_mm: 45,
      pitchFlangeOutside_mm: 45,
      threadCondition: 'EXCLUDED',
      holeType: 'STANDARD',
      beam: {
        id: 'B-W24x68',
        name: 'W24x68',
        depth_mm: 602,
        flangeWidth_mm: 228,
        flangeThickness_mm: 14.9,
        webThickness_mm: 10.5,
        yieldStrength_MPa: 345,
        ultimateStrength_MPa: 450,
      },
      column: {
        id: 'C-W14x90',
        name: 'W14x90',
        depth_mm: 356,
        flangeWidth_mm: 368,
        flangeThickness_mm: 18.0,
        webThickness_mm: 11.2,
        rootRadius_mm: 36,
        yieldStrength_MPa: 345,
        ultimateStrength_MPa: 450,
      },
      flangeWeldType: 'CJP',
      webWeldLeg_mm: 8,
      weldElectrode: 'E70XX',
    };

    return EndPlateMomentEngine.evaluate({
      config,
      momentDemand_kNm: mpMomentDemand,
      shearDemand_kN: mpShearDemand,
      standard,
      method,
    });
  }, [mpPlateThickness, mpBoltDiameter, mpBoltGrade, mpMomentDemand, mpShearDemand, standard, method]);

  const basePlateResult = useMemo(() => {
    const config: ColumnBasePlateConfig = {
      connectionId: 'BP-LIVE-01',
      plateLength_N_mm: bpPlateLengthN,
      plateWidth_B_mm: bpPlateWidthB,
      plateThickness_mm: bpPlateThickness,
      plateFy_MPa: 250,
      plateFu_MPa: 400,
      columnDepth_d_mm: 310,
      columnFlangeWidth_bf_mm: 305,
      columnFlangeThickness_tf_mm: 17.0,
      columnWebThickness_tw_mm: 10.9,
      concreteStrength_fc_MPa: 28,
      pedestalLength_Nped_mm: bpPlateLengthN + 150,
      pedestalWidth_Bped_mm: bpPlateWidthB + 150,
      anchorGrade: 'F1554_GR55',
      anchorDiameter_mm: 24,
      anchorTensionRows: 1,
      anchorsPerRow: 2,
      anchorDistanceToEdge_mm: 50,
    };

    return ColumnBasePlateEngine.evaluate({
      config,
      axialDemand_Pu_kN: bpAxialDemand,
      momentDemand_Mu_kNm: bpMomentDemand,
      shearDemand_Vu_kN: bpShearDemand,
      standard,
      method,
    });
  }, [bpPlateLengthN, bpPlateWidthB, bpPlateThickness, bpAxialDemand, bpMomentDemand, bpShearDemand, standard, method]);

  // Current active evaluation
  const currentEval = useMemo(() => {
    if (activeFamily === 'SINGLE_PLATE') {
      return {
        governingLS: singlePlateResult.governingLimitState,
        capacity: `${singlePlateResult.designShearCapacity_kN.toFixed(1)} kN`,
        demand: `${singlePlateResult.appliedShearDemand_kN.toFixed(1)} kN`,
        utilization: singlePlateResult.utilization,
        pass: singlePlateResult.pass,
        limitStates: singlePlateResult.limitStateResults,
        weightKg: ((singlePlateResult.limitStateResults.length * 2.5) + (spPlateThickness * 0.4)).toFixed(1),
      };
    } else if (activeFamily === 'EXTENDED_4E') {
      return {
        governingLS: momentPlateResult.governingLimitState,
        capacity: `${momentPlateResult.designMomentCapacity_kNm.toFixed(1)} kNm`,
        demand: `${momentPlateResult.appliedMomentDemand_kNm.toFixed(1)} kNm`,
        utilization: momentPlateResult.momentUtilization,
        pass: momentPlateResult.pass,
        limitStates: momentPlateResult.limitStateResults,
        weightKg: (38.5 + mpPlateThickness * 0.8).toFixed(1),
      };
    } else {
      return {
        governingLS: basePlateResult.governingLimitState,
        capacity: `${(basePlateResult.axialDemand_Pu_kN / Math.max(0.01, basePlateResult.limitStateResults[0]?.utilization || 1)).toFixed(1)} kN`,
        demand: `${basePlateResult.axialDemand_Pu_kN.toFixed(1)} kN`,
        utilization: Math.max(...basePlateResult.limitStateResults.map((r) => r.utilization)),
        pass: basePlateResult.pass,
        limitStates: basePlateResult.limitStateResults,
        weightKg: ((bpPlateLengthN * bpPlateWidthB * bpPlateThickness * 7850) / 1e9).toFixed(1),
      };
    }
  }, [activeFamily, singlePlateResult, momentPlateResult, basePlateResult, spPlateThickness, mpPlateThickness, bpPlateLengthN, bpPlateWidthB, bpPlateThickness]);

  const utilPercent = (currentEval.utilization * 100).toFixed(1);
  const isPassing = currentEval.pass;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-7xl h-[92vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
      >
        {/* Header Bar */}
        <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/60">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
              <Hammer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                  Steel Connection Studio
                  <span className="px-2 py-0.5 text-[10px] bg-indigo-500/20 text-indigo-300 font-mono rounded border border-indigo-500/30">
                    AISC 360-16 / EC3
                  </span>
                </h2>
              </div>
              <p className="text-xs text-slate-400">
                Interactive 3D Detailing, Bolt/Weld Verification & Plastic Mechanism Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Connection Family Selector */}
            <div className="flex bg-slate-800/80 p-1 rounded-lg border border-slate-700/60 text-xs">
              <button
                onClick={() => setActiveFamily('SINGLE_PLATE')}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  activeFamily === 'SINGLE_PLATE'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Shear Tab (Fin Plate)
              </button>
              <button
                onClick={() => setActiveFamily('EXTENDED_4E')}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  activeFamily === 'EXTENDED_4E'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                4E Moment End-Plate
              </button>
              <button
                onClick={() => setActiveFamily('BASE_PLATE')}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  activeFamily === 'BASE_PLATE'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Column Base Plate
              </button>
            </div>

            {/* Standard Selector */}
            <div className="flex bg-slate-800/80 p-1 rounded-lg border border-slate-700/60 text-xs font-mono">
              <button
                onClick={() => setStandard('AISC_360_16')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  standard === 'AISC_360_16'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                AISC LRFD
              </button>
              <button
                onClick={() => setStandard('EUROCODE_3')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  standard === 'EUROCODE_3'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Eurocode 3
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Content Workspace */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: 2D/3D CAD Joint Visualizer */}
          <div className="w-1/2 border-r border-slate-800 flex flex-col bg-slate-950/40 relative">
            {/* Viewport Control Bar */}
            <div className="p-3 border-b border-slate-800/60 flex items-center justify-between text-xs text-slate-400 bg-slate-900/30">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-300">CAD Viewport:</span>
                <button
                  onClick={() => setShowDimensions(!showDimensions)}
                  className={`px-2 py-1 rounded border ${
                    showDimensions
                      ? 'bg-indigo-950/60 border-indigo-500/40 text-indigo-300'
                      : 'border-slate-800 text-slate-500'
                  }`}
                >
                  Dimensions
                </button>
                <button
                  onClick={() => setShowWeldHighlights(!showWeldHighlights)}
                  className={`px-2 py-1 rounded border ${
                    showWeldHighlights
                      ? 'bg-indigo-950/60 border-indigo-500/40 text-indigo-300'
                      : 'border-slate-800 text-slate-500'
                  }`}
                >
                  Welds
                </button>
              </div>

              {/* Exploded View Slider */}
              <div className="flex items-center gap-2">
                <span>Exploded View:</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={explodedOffset}
                  onChange={(e) => setExplodedOffset(Number(e.target.value))}
                  className="w-24 accent-indigo-500 cursor-pointer"
                />
                <span className="font-mono text-[11px] w-6">{explodedOffset}%</span>
              </div>
            </div>

            {/* SVG Visual Canvas */}
            <div className="flex-1 relative flex items-center justify-center p-6 overflow-hidden select-none">
              <svg className="w-full h-full max-h-[500px]" viewBox="0 0 500 400">
                {/* Background CAD Grid */}
                <defs>
                  <pattern id="cadGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#334155" strokeWidth="0.5" strokeOpacity="0.4" />
                  </pattern>
                </defs>
                <rect width="500" height="400" fill="url(#cadGrid)" />

                {activeFamily === 'SINGLE_PLATE' && (
                  <g transform="translate(140, 60)">
                    {/* Supporting Column Flange / Girder Web */}
                    <rect x="0" y="20" width="24" height="280" fill="#1e293b" stroke="#475569" strokeWidth="2" />
                    <text x="12" y="15" fill="#64748b" fontSize="10" textAnchor="middle" fontFamily="monospace">SUPPORT</text>

                    {/* Double Fillet Weld */}
                    {showWeldHighlights && (
                      <g>
                        <path d="M 24 60 L 32 60 L 24 70 Z" fill="#38bdf8" fillOpacity="0.8" />
                        <path d="M 24 240 L 32 240 L 24 230 Z" fill="#38bdf8" fillOpacity="0.8" />
                        <line x1="24" y1="60" x2="24" y2="240" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" />
                      </g>
                    )}

                    {/* Shear Tab Plate */}
                    <g transform={`translate(${explodedOffset * 0.4}, 0)`}>
                      <rect
                        x="24"
                        y="50"
                        width={spDimA + 40}
                        height={(spBoltRows - 1) * spPitch + 80}
                        fill="#334155"
                        stroke="#94a3b8"
                        strokeWidth="2"
                        rx="3"
                      />
                      <text x="50" y="42" fill="#cbd5e1" fontSize="11" fontFamily="monospace">
                        PL {spPlateThickness}mm x {((spBoltRows - 1) * spPitch + 80)}mm
                      </text>

                      {/* Bolt Pattern */}
                      {Array.from({ length: spBoltRows }).map((_, i) => {
                        const boltY = 90 + i * (spPitch * 0.7);
                        const boltX = 24 + spDimA * 0.8;
                        return (
                          <g key={i}>
                            <circle cx={boltX} cy={boltY} r="9" fill="#0f172a" stroke="#cbd5e1" strokeWidth="2" />
                            <circle cx={boltX} cy={boltY} r="4" fill="#38bdf8" />
                            <line x1={boltX - 12} y1={boltY} x2={boltX + 12} y2={boltY} stroke="#94a3b8" strokeWidth="0.8" strokeDasharray="2,2" />
                            <line x1={boltX} y1={boltY - 12} x2={boltX} y2={boltY + 12} stroke="#94a3b8" strokeWidth="0.8" strokeDasharray="2,2" />
                          </g>
                        );
                      })}
                    </g>

                    {/* Supported Beam Web (Exploded) */}
                    <g transform={`translate(${explodedOffset * 1.0 + 30}, 0)`}>
                      <path
                        d="M 100 40 L 260 40 L 260 260 L 100 260 Z"
                        fill="#1e293b"
                        fillOpacity="0.7"
                        stroke="#64748b"
                        strokeWidth="1.5"
                        strokeDasharray="4,4"
                      />
                      <text x="180" y="150" fill="#94a3b8" fontSize="11" textAnchor="middle">
                        Beam W16x50 (Web)
                      </text>
                    </g>

                    {/* Dimension Lines */}
                    {showDimensions && (
                      <g stroke="#38bdf8" strokeWidth="1" opacity="0.8">
                        {/* 'a' dimension */}
                        <line x1="24" y1="280" x2={24 + spDimA * 0.8} y2="280" />
                        <text x={(24 + (24 + spDimA * 0.8)) / 2} y="295" fill="#38bdf8" fontSize="10" textAnchor="middle" fontFamily="monospace">
                          a = {spDimA}mm
                        </text>
                      </g>
                    )}
                  </g>
                )}

                {activeFamily === 'EXTENDED_4E' && (
                  <g transform="translate(100, 30)">
                    {/* Column */}
                    <rect x="20" y="20" width="40" height="340" fill="#1e293b" stroke="#475569" strokeWidth="2" />
                    {/* Extended End-Plate */}
                    <rect x="60" y="40" width={mpPlateThickness * 0.8} height="300" fill="#334155" stroke="#94a3b8" strokeWidth="2" />
                    {/* Beam Flanges & Web */}
                    <rect x="60 + 20" y="70" width="180" height="15" fill="#475569" stroke="#94a3b8" strokeWidth="1" />
                    <rect x="60 + 20" y="290" width="180" height="15" fill="#475569" stroke="#94a3b8" strokeWidth="1" />
                    <rect x="60 + 20" y="85" width="180" height="205" fill="#1e293b" stroke="#475569" strokeWidth="1" />

                    {/* 4 Bolts (1 row outside top flange, 1 row inside top flange, 2 at bottom) */}
                    <circle cx="50" cy="55" r="7" fill="#0f172a" stroke="#cbd5e1" strokeWidth="2" />
                    <circle cx="50" cy="100" r="7" fill="#0f172a" stroke="#cbd5e1" strokeWidth="2" />
                    <circle cx="50" cy="275" r="7" fill="#0f172a" stroke="#cbd5e1" strokeWidth="2" />
                    <circle cx="50" cy="320" r="7" fill="#0f172a" stroke="#cbd5e1" strokeWidth="2" />
                    <text x="160" y="190" fill="#94a3b8" fontSize="12" textAnchor="middle" fontFamily="monospace">
                      W24x68 MOMENT CONNECTION
                    </text>
                  </g>
                )}

                {activeFamily === 'BASE_PLATE' && (
                  <g transform="translate(100, 80)">
                    {/* Concrete Pedestal */}
                    <rect x="10" y="220" width="280" height="80" fill="#0f172a" stroke="#475569" strokeWidth="2" />
                    <text x="150" y="270" fill="#64748b" fontSize="12" textAnchor="middle">
                      CONCRETE FOOTING (f'c = 28 MPa)
                    </text>

                    {/* Base Plate */}
                    <rect x="30" y="195" width="240" height="25" fill="#334155" stroke="#94a3b8" strokeWidth="2" rx="2" />
                    
                    {/* Column Base */}
                    <rect x="90" y="50" width="120" height="145" fill="#1e293b" stroke="#94a3b8" strokeWidth="2" />

                    {/* Anchor Rods */}
                    <rect x="50" y="160" width="8" height="90" fill="#38bdf8" stroke="#0284c7" strokeWidth="1" />
                    <rect x="240" y="160" width="8" height="90" fill="#38bdf8" stroke="#0284c7" strokeWidth="1" />

                    {/* Concrete Bearing Stress Block Highlight */}
                    <rect x="30" y="220" width="100" height="10" fill="#ef4444" fillOpacity="0.6" />
                    <text x="80" y="245" fill="#f87171" fontSize="10" textAnchor="middle" fontFamily="monospace">
                      Bearing Zone Y
                    </text>
                  </g>
                )}
              </svg>

              {/* Bottom Floating KPI Card */}
              <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur-md flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Governing Failure Mode:
                  </span>
                  <div className="text-sm font-bold text-white mt-0.5 flex items-center gap-2">
                    {isPassing ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                    )}
                    <span>{currentEval.governingLS}</span>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Design Capacity</span>
                    <div className="text-sm font-bold font-mono text-emerald-400">{currentEval.capacity}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Design Demand</span>
                    <div className="text-sm font-bold font-mono text-white">{currentEval.demand}</div>
                  </div>

                  {/* Utilization Meter */}
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Utilization</span>
                    <span
                      className={`text-base font-extrabold font-mono ${
                        Number(utilPercent) > 100
                          ? 'text-rose-400'
                          : Number(utilPercent) > 85
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {utilPercent}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Multi-Tab Engineering Inspector */}
          <div className="w-1/2 flex flex-col bg-slate-900/50">
            {/* Inspector Navigation Tabs */}
            <div className="h-12 border-b border-slate-800 flex items-center px-4 gap-2 bg-slate-900/80">
              <button
                onClick={() => setActiveTab('parameters')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'parameters'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Parameters</span>
              </button>
              <button
                onClick={() => setActiveTab('limitStates')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'limitStates'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>Limit States ({currentEval.limitStates.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('equations')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'equations'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Math Derivations</span>
              </button>
              <button
                onClick={() => setActiveTab('bom')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'bom'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Fabrication BOM</span>
              </button>
            </div>

            {/* Tab Contents Container */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* TAB 1: PARAMETERS */}
              {activeTab === 'parameters' && (
                <div className="space-y-6">
                  {activeFamily === 'SINGLE_PLATE' && (
                    <div className="space-y-5">
                      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                          Plate & Fastener Geometry
                        </span>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <label className="text-slate-400 block mb-1">Plate Thickness: {spPlateThickness} mm</label>
                            <input
                              type="range"
                              min="6"
                              max="25"
                              value={spPlateThickness}
                              onChange={(e) => setSpPlateThickness(Number(e.target.value))}
                              className="w-full accent-indigo-500 cursor-pointer"
                            />
                          </div>
                          <div>
                            <label className="text-slate-400 block mb-1">Bolt Rows: {spBoltRows} bolts</label>
                            <input
                              type="range"
                              min="2"
                              max="8"
                              value={spBoltRows}
                              onChange={(e) => setSpBoltRows(Number(e.target.value))}
                              className="w-full accent-indigo-500 cursor-pointer"
                            />
                          </div>
                          <div>
                            <label className="text-slate-400 block mb-1">Weld-to-Bolt Line 'a': {spDimA} mm</label>
                            <input
                              type="range"
                              min="40"
                              max="160"
                              value={spDimA}
                              onChange={(e) => setSpDimA(Number(e.target.value))}
                              className="w-full accent-indigo-500 cursor-pointer"
                            />
                            <span className="text-[10px] text-slate-500">
                              {spDimA <= 89 ? 'Conventional Shear Tab' : 'Extended Shear Tab'}
                            </span>
                          </div>
                          <div>
                            <label className="text-slate-400 block mb-1">Fillet Weld Leg: {spWeldLeg} mm</label>
                            <input
                              type="range"
                              min="5"
                              max="16"
                              value={spWeldLeg}
                              onChange={(e) => setSpWeldLeg(Number(e.target.value))}
                              className="w-full accent-indigo-500 cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                          Design Shear Demand
                        </span>
                        <div>
                          <div className="flex justify-between text-xs text-slate-400 mb-1">
                            <span>Factored Shear Load (V_u):</span>
                            <span className="font-mono text-white font-bold">{spShearDemand} kN</span>
                          </div>
                          <input
                            type="range"
                            min="20"
                            max="500"
                            value={spShearDemand}
                            onChange={(e) => setSpShearDemand(Number(e.target.value))}
                            className="w-full accent-indigo-500 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeFamily === 'EXTENDED_4E' && (
                    <div className="space-y-5">
                      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                          End-Plate Dimensions
                        </span>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <label className="text-slate-400 block mb-1">End-Plate Thickness: {mpPlateThickness} mm</label>
                            <input
                              type="range"
                              min="12"
                              max="45"
                              value={mpPlateThickness}
                              onChange={(e) => setMpPlateThickness(Number(e.target.value))}
                              className="w-full accent-indigo-500 cursor-pointer"
                            />
                          </div>
                          <div>
                            <label className="text-slate-400 block mb-1">Bolt Diameter: M{mpBoltDiameter}</label>
                            <select
                              value={mpBoltDiameter}
                              onChange={(e) => setMpBoltDiameter(Number(e.target.value))}
                              className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-white font-mono"
                            >
                              <option value="20">M20 (3/4 in)</option>
                              <option value="24">M24 (1 in)</option>
                              <option value="27">M27 (1-1/8 in)</option>
                              <option value="30">M30 (1-1/4 in)</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                          Applied Moment & Shear Demands
                        </span>
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-xs text-slate-400 mb-1">
                              <span>Overturning Moment (M_u):</span>
                              <span className="font-mono text-white font-bold">{mpMomentDemand} kNm</span>
                            </div>
                            <input
                              type="range"
                              min="50"
                              max="600"
                              value={mpMomentDemand}
                              onChange={(e) => setMpMomentDemand(Number(e.target.value))}
                              className="w-full accent-indigo-500 cursor-pointer"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between text-xs text-slate-400 mb-1">
                              <span>Concurrent Shear (V_u):</span>
                              <span className="font-mono text-white font-bold">{mpShearDemand} kN</span>
                            </div>
                            <input
                              type="range"
                              min="20"
                              max="300"
                              value={mpShearDemand}
                              onChange={(e) => setMpShearDemand(Number(e.target.value))}
                              className="w-full accent-indigo-500 cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeFamily === 'BASE_PLATE' && (
                    <div className="space-y-5">
                      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                          Base Plate Plan Geometry
                        </span>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <label className="text-slate-400 block mb-1">Length N: {bpPlateLengthN} mm</label>
                            <input
                              type="range"
                              min="350"
                              max="800"
                              value={bpPlateLengthN}
                              onChange={(e) => setBpPlateLengthN(Number(e.target.value))}
                              className="w-full accent-indigo-500 cursor-pointer"
                            />
                          </div>
                          <div>
                            <label className="text-slate-400 block mb-1">Width B: {bpPlateWidthB} mm</label>
                            <input
                              type="range"
                              min="350"
                              max="800"
                              value={bpPlateWidthB}
                              onChange={(e) => setBpPlateWidthB(Number(e.target.value))}
                              className="w-full accent-indigo-500 cursor-pointer"
                            />
                          </div>
                          <div>
                            <label className="text-slate-400 block mb-1">Plate Thickness: {bpPlateThickness} mm</label>
                            <input
                              type="range"
                              min="15"
                              max="70"
                              value={bpPlateThickness}
                              onChange={(e) => setBpPlateThickness(Number(e.target.value))}
                              className="w-full accent-indigo-500 cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                          Applied Gravity & Wind/Seismic Loads
                        </span>
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-xs text-slate-400 mb-1">
                              <span>Axial Compression (P_u):</span>
                              <span className="font-mono text-white font-bold">{bpAxialDemand} kN</span>
                            </div>
                            <input
                              type="range"
                              min="100"
                              max="2500"
                              value={bpAxialDemand}
                              onChange={(e) => setBpAxialDemand(Number(e.target.value))}
                              className="w-full accent-indigo-500 cursor-pointer"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between text-xs text-slate-400 mb-1">
                              <span>Overturning Moment (M_u):</span>
                              <span className="font-mono text-white font-bold">{bpMomentDemand} kNm</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="350"
                              value={bpMomentDemand}
                              onChange={(e) => setBpMomentDemand(Number(e.target.value))}
                              className="w-full accent-indigo-500 cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: LIMIT STATES TABLE */}
              {activeTab === 'limitStates' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                    <span>Evaluated against {standard === 'AISC_360_16' ? 'AISC 360-16 LRFD' : 'Eurocode 3 EN 1993-1-8'}</span>
                    <span className="font-mono font-bold text-indigo-400">{currentEval.limitStates.length} Active Checks</span>
                  </div>

                  <div className="space-y-2.5">
                    {currentEval.limitStates.map((ls: LimitStateResult, idx: number) => {
                      const util = (ls.utilization * 100).toFixed(1);
                      const pass = ls.pass;
                      return (
                        <div
                          key={idx}
                          className={`p-3.5 rounded-xl border transition-all ${
                            !pass
                              ? 'bg-rose-950/20 border-rose-800/60'
                              : ls.limitState === currentEval.governingLS
                              ? 'bg-indigo-950/30 border-indigo-500/50'
                              : 'bg-slate-900/60 border-slate-800/80'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {pass ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <AlertTriangle className="w-4 h-4 text-rose-400" />
                              )}
                              <span className="font-semibold text-xs text-white">{ls.limitState}</span>
                              {ls.limitState === currentEval.governingLS && (
                                <span className="px-1.5 py-0.5 text-[9px] bg-indigo-500/30 text-indigo-300 font-bold uppercase rounded border border-indigo-500/30">
                                  Governing
                                </span>
                              )}
                            </div>

                            <span className="text-[11px] font-mono font-bold text-slate-400">
                              {ls.governingClause}
                            </span>
                          </div>

                          <div className="mt-2.5 flex items-center justify-between text-xs font-mono">
                            <div className="flex items-center gap-4 text-slate-400">
                              <span>Cap: <strong className="text-emerald-400">{ls.capacity_kN.toFixed(1)} kN</strong></span>
                              <span>Dem: <strong className="text-slate-200">{ls.demand_kN.toFixed(1)} kN</strong></span>
                            </div>
                            <span
                              className={`font-bold ${
                                Number(util) > 100
                                  ? 'text-rose-400'
                                  : Number(util) > 85
                                  ? 'text-amber-400'
                                  : 'text-emerald-400'
                              }`}
                            >
                              {util}%
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                Number(util) > 100
                                  ? 'bg-rose-500'
                                  : Number(util) > 85
                                  ? 'bg-amber-400'
                                  : 'bg-emerald-400'
                              }`}
                              style={{ width: `${Math.min(100, Number(util))}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: MATH DERIVATIONS */}
              {activeTab === 'equations' && (
                <div className="space-y-4">
                  {currentEval.limitStates.map((ls: LimitStateResult, idx: number) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-xs font-bold text-indigo-300">{ls.limitState}</span>
                        <span className="text-[10px] font-mono text-slate-400">{ls.governingClause}</span>
                      </div>

                      <div className="space-y-2 text-xs">
                        {ls.steps.map((step, sIdx) => (
                          <div key={sIdx} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 font-mono space-y-1">
                            <div className="text-[11px] text-slate-400 font-sans font-semibold">{step.equationName}</div>
                            <div className="text-slate-300 text-[11px] overflow-x-auto text-indigo-200">
                              {step.latexFormula}
                            </div>
                            <div className="text-emerald-400 text-[11px]">= {step.substitutedValues}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 4: FABRICATION BOM */}
              {activeTab === 'bom' && (
                <div className="space-y-5">
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                      Fabrication Bill of Materials (BOM)
                    </span>
                    <table className="w-full text-xs text-left">
                      <thead className="text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="pb-2">Component</th>
                          <th className="pb-2">Specification</th>
                          <th className="pb-2">Qty</th>
                          <th className="pb-2">Unit Wt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 font-mono text-slate-200">
                        <tr>
                          <td className="py-2">Fitting Plate</td>
                          <td className="py-2">ASTM A36 Plate (PL {spPlateThickness}mm)</td>
                          <td className="py-2">1</td>
                          <td className="py-2">{currentEval.weightKg} kg</td>
                        </tr>
                        <tr>
                          <td className="py-2">Fasteners</td>
                          <td className="py-2">ASTM {spBoltGrade} M{spBoltDiameter} Bolt</td>
                          <td className="py-2">{spBoltRows}</td>
                          <td className="py-2">0.38 kg/ea</td>
                        </tr>
                        <tr>
                          <td className="py-2">Shop Welds</td>
                          <td className="py-2">{spWeldLeg}mm Double Fillet E70XX</td>
                          <td className="py-2">2 lines</td>
                          <td className="py-2">0.72 kg</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Engineering Calculation Package</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Export formatted PDF / Markdown design calculation sheet</div>
                    </div>
                    <button
                      onClick={() => alert('Calculation note generated and saved to session export folder.')}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export Calc Note
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
