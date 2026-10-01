/**
 * FoundationStudio.tsx
 *
 * Interactive 3D Foundation & Geotechnical Soil-Structure Interaction (SSI) Studio.
 * Real-time geotechnical bearing capacity, multi-layer borehole stratigraphy,
 * spread & eccentric isolated footings (ACI 318-19, Eurocode 2/7, IS 456),
 * mat foundations with Winkler subgrade tension cut-off, and deep pile group
 * structural/geotechnical limit state analysis.
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  Activity,
  Box,
  Compass,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Download,
  RefreshCw,
  Sliders,
  Sparkles,
  X,
  FileCheck,
  BarChart3,
  Waves,
  Maximize2,
  Grid,
  ShieldCheck,
  Cpu,
  CornerDownRight,
  Anchor,
  Printer,
  Copy,
  Check,
} from 'lucide-react';
import {
  SoilStratigraphy,
  SoilStratigraphyProfile,
  BearingCapacityEngine,
  FootingGeometry,
  IsolatedFootingEngine,
  PadFootingDimensions,
  ColumnStubDimensions,
  FootingMaterialProperties,
  FootingAppliedLoads,
  IsolatedFootingDesignResult,
  WinklerSubgradeEngine,
  MatGeometry,
  MatColumnLoad,
  MatSsiResult,
  SinglePileEngine,
  PileGeometry,
  PileGroupEngine,
  PileCapDimensions,
  PileCapColumn,
  PileGroupLoads,
} from '@beamlab/foundation-engine';

interface FoundationStudioProps {
  onClose: () => void;
}

type FoundationTab = 'isolated' | 'mat_ssi' | 'pile_group' | 'stratigraphy' | 'report';

export const FoundationStudio: React.FC<FoundationStudioProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<FoundationTab>('isolated');
  const [copiedReport, setCopiedReport] = useState(false);

  // -------------------------------------------------------------
  // SHARED SOIL STRATIGRAPHY STATE
  // -------------------------------------------------------------
  const [waterTableDepth_m, setWaterTableDepth_m] = useState<number>(2.5);
  const [soilProfile, setSoilProfile] = useState<SoilStratigraphyProfile>(() => ({
    name: 'Geotechnical Borehole BH-01',
    waterTableDepth_m: 2.5,
    layers: [
      {
        id: 'L1',
        name: 'Medium Dense Silty Sand',
        depthTop_m: 0,
        depthBottom_m: 3.0,
        dryUnitWeight_kN_m3: 17.5,
        saturatedUnitWeight_kN_m3: 19.0,
        cohesion_kPa: 4.0,
        frictionAngle_deg: 32.0,
        elasticModulus_MPa: 30.0,
        poissonRatio: 0.28,
        soilType: 'SAND',
      },
      {
        id: 'L2',
        name: 'Stiff Silty Clay',
        depthTop_m: 3.0,
        depthBottom_m: 8.0,
        dryUnitWeight_kN_m3: 18.0,
        saturatedUnitWeight_kN_m3: 19.5,
        cohesion_kPa: 55.0,
        frictionAngle_deg: 14.0,
        elasticModulus_MPa: 22.0,
        poissonRatio: 0.35,
        soilType: 'CLAY',
      },
      {
        id: 'L3',
        name: 'Dense Gravelly Sand',
        depthTop_m: 8.0,
        depthBottom_m: 16.0,
        dryUnitWeight_kN_m3: 19.0,
        saturatedUnitWeight_kN_m3: 21.0,
        cohesion_kPa: 0.0,
        frictionAngle_deg: 38.0,
        elasticModulus_MPa: 65.0,
        poissonRatio: 0.25,
        soilType: 'GRAVEL',
      },
    ],
  }));

  // Create active stratigraphy model
  const stratigraphy = useMemo(() => {
    return new SoilStratigraphy({
      ...soilProfile,
      waterTableDepth_m,
    });
  }, [soilProfile, waterTableDepth_m]);

  // -------------------------------------------------------------
  // TAB 1: SPREAD & ECCENTRIC ISOLATED FOOTING STATE & CALC
  // -------------------------------------------------------------
  const [footingB, setFootingB] = useState<number>(2.4);
  const [footingL, setFootingL] = useState<number>(2.8);
  const [footingH, setFootingH] = useState<number>(0.55);
  const [footingDepth, setFootingDepth] = useState<number>(1.5);
  const [colCx, setColCx] = useState<number>(0.45);
  const [colCy, setColCy] = useState<number>(0.45);
  const [loadP, setLoadP] = useState<number>(1100);
  const [loadMx, setLoadMx] = useState<number>(65);
  const [loadMy, setLoadMy] = useState<number>(95);
  const [qAllowable, setQAllowable] = useState<number>(250);
  const [concreteFck, setConcreteFck] = useState<number>(30);
  const [rebarFy, setRebarFy] = useState<number>(500);

  const isolatedEngine = useMemo(() => new IsolatedFootingEngine(), []);

  const isolatedResult = useMemo(() => {
    const dims: PadFootingDimensions = {
      width_m: footingB,
      length_m: footingL,
      thickness_m: footingH,
      cover_m: 0.075,
    };
    const col: ColumnStubDimensions = {
      width_m: colCx,
      length_m: colCy,
    };
    const materials: FootingMaterialProperties = {
      fc_MPa: concreteFck,
      fy_MPa: rebarFy,
    };
    const loads: FootingAppliedLoads = {
      P_kN: loadP,
      Mx_kNm: loadMx,
      My_kNm: loadMy,
    };
    return isolatedEngine.designFooting(dims, col, materials, loads, 'ACI_318_19');
  }, [
    isolatedEngine,
    footingB,
    footingL,
    footingH,
    colCx,
    colCy,
    loadP,
    loadMx,
    loadMy,
    concreteFck,
    rebarFy,
  ]);

  // -------------------------------------------------------------
  // TAB 2: MAT FOUNDATION & WINKLER SUBGRADE SSI STATE & CALC
  // -------------------------------------------------------------
  const [matWidth, setMatWidth] = useState<number>(8.0);
  const [matLength, setMatLength] = useState<number>(8.0);
  const [matThick, setMatThick] = useState<number>(0.75);
  const [matFck, setMatFck] = useState<number>(35);
  const [colP1, setColP1] = useState<number>(1800);
  const [colP2, setColP2] = useState<number>(1600);
  const [colP3, setColP3] = useState<number>(1600);
  const [colP4, setColP4] = useState<number>(2000);
  const [matMethod, setMatMethod] = useState<'BOWLES' | 'VESIC' | 'TERZAGHI_SAND'>('BOWLES');

  const winklerEngine = useMemo(() => new WinklerSubgradeEngine(), []);

  const matResult = useMemo(() => {
    const matGeom: MatGeometry = {
      width_m: matWidth,
      length_m: matLength,
      thickness_m: matThick,
      concreteE_GPa: 30,
    };
    // 4 Column arrangement
    const halfX = (matWidth * 0.55) / 2;
    const halfY = (matLength * 0.55) / 2;
    const cols: MatColumnLoad[] = [
      { id: 'C1', x_m: -halfX, y_m: -halfY, P_kN: colP1 },
      { id: 'C2', x_m: halfX, y_m: -halfY, P_kN: colP2 },
      { id: 'C3', x_m: -halfX, y_m: halfY, P_kN: colP3 },
      { id: 'C4', x_m: halfX, y_m: halfY, P_kN: colP4 },
    ];
    return winklerEngine.analyzeMatFoundation(matGeom, cols, {
      method: matMethod,
      allowableBearingPressure_kPa: qAllowable,
      factorOfSafety: 3.0,
      soilEs_MPa: 35,
      soilPoissonRatio: 0.3,
      gridDivisionsX: 8,
      gridDivisionsY: 8,
    });
  }, [winklerEngine, matWidth, matLength, matThick, colP1, colP2, colP3, colP4, matMethod, qAllowable]);

  // -------------------------------------------------------------
  // TAB 3: DEEP FOUNDATIONS & PILE GROUP STATE & CALC
  // -------------------------------------------------------------
  const [pileGridRows, setPileGridRows] = useState<number>(2);
  const [pileGridCols, setPileGridCols] = useState<number>(2);
  const [pileSpacing, setPileSpacing] = useState<number>(1.8);
  const [pileDia, setPileDia] = useState<number>(0.6);
  const [pileLen, setPileLen] = useState<number>(12.0);
  const [pileCapThick, setPileCapThick] = useState<number>(0.95);
  const [pileCapB, setPileCapB] = useState<number>(3.0);
  const [pileCapL, setPileCapL] = useState<number>(3.0);
  const [pileLoadP, setPileLoadP] = useState<number>(2200);
  const [pileLoadMx, setPileLoadMx] = useState<number>(80);
  const [pileLoadMy, setPileLoadMy] = useState<number>(110);

  const singlePileEngine = useMemo(() => new SinglePileEngine(), []);
  const pileGroupEngine = useMemo(() => new PileGroupEngine(), []);

  const singlePileResult = useMemo(() => {
    const pileGeom: PileGeometry = {
      pileType: 'BORED_CAST_IN_SITU',
      shape: 'CIRCULAR',
      diameter_m: pileDia,
      length_m: pileLen,
      concreteStrength_MPa: 35,
      rebarYield_MPa: 500,
      rebarRatio: 0.015,
    };
    return singlePileEngine.analyzeSinglePile(stratigraphy, pileGeom, {
      factorOfSafetyCompression: 2.5,
      factorOfSafetyUplift: 3.0,
    });
  }, [singlePileEngine, stratigraphy, pileDia, pileLen]);

  const pileGroupResult = useMemo(() => {
    const piles = pileGroupEngine.generateGrid({
      rows: pileGridRows,
      cols: pileGridCols,
      spacingX_m: pileSpacing,
      spacingY_m: pileSpacing,
      pileDiameter_m: pileDia,
      singlePileCapacity_kN: singlePileResult.allowableCompression_kN,
    });
    const cap: PileCapDimensions = {
      length_m: pileCapL,
      width_m: pileCapB,
      thickness_m: pileCapThick,
      concreteStrength_MPa: 35,
      rebarYield_MPa: 500,
    };
    const col: PileCapColumn = {
      cx_m: 0.5,
      cy_m: 0.5,
    };
    const loads: PileGroupLoads = {
      P_kN: pileLoadP,
      Mx_kNm: pileLoadMx,
      My_kNm: pileLoadMy,
    };
    return pileGroupEngine.analyzePileGroup(
      cap,
      col,
      piles,
      loads,
      singlePileResult.allowableCompression_kN,
      pileDia
    );
  }, [
    pileGroupEngine,
    pileGridRows,
    pileGridCols,
    pileSpacing,
    pileDia,
    singlePileResult.allowableCompression_kN,
    pileCapL,
    pileCapB,
    pileCapThick,
    pileLoadP,
    pileLoadMx,
    pileLoadMy,
  ]);

  // -------------------------------------------------------------
  // TAB 4: BEARING CAPACITY ENGINE ON STRATIGRAPHY
  // -------------------------------------------------------------
  const bearingEngine = useMemo(() => new BearingCapacityEngine(), []);
  const bearingResult = useMemo(() => {
    const geom: FootingGeometry = {
      width_m: footingB,
      length_m: footingL,
      embedmentDepth_m: footingDepth,
    };
    return bearingEngine.evaluateBearingCapacity(stratigraphy, geom, {
      method: 'MEYERHOF',
      factorOfSafety: 3.0,
    });
  }, [bearingEngine, stratigraphy, footingB, footingL, footingDepth]);

  const handleCopyReport = () => {
    const reportText = `BEAMLAB GEOTECHNICAL & FOUNDATION ENGINEERING DOSSIER
Code Standards: ACI 318-19, Eurocode 2/7, IS 456:2000, IS 2911
Date: ${new Date().toISOString().split('T')[0]}

1. ISOLATED SPREAD FOOTING
- Dimensions: ${footingB}m (B) x ${footingL}m (L) x ${footingH}m (H)
- Service Load P: ${loadP} kN | Mx: ${loadMx} kNm | My: ${loadMy} kNm
- Kern Check: ${isolatedResult.soilPressures.isFullContact ? 'PASS (Fully Compressed)' : 'PARTIAL UPLIFT'}
- Max Soil Pressure: ${isolatedResult.soilPressures.qMax_kPa} kPa (Allowable: ${qAllowable} kPa) -> DCR: ${(isolatedResult.soilPressures.qMax_kPa / qAllowable).toFixed(2)}
- Beam Shear X DCR: ${isolatedResult.oneWayShearX.utilization.toFixed(2)} (${isolatedResult.oneWayShearX.status})
- Beam Shear Y DCR: ${isolatedResult.oneWayShearY.utilization.toFixed(2)} (${isolatedResult.oneWayShearY.status})
- Punching Shear DCR: ${isolatedResult.twoWayPunching.utilization.toFixed(2)} (${isolatedResult.twoWayPunching.status})
- Provided Rebar X: ${isolatedResult.flexureX.barCount}x T${isolatedResult.flexureX.barDiameter_mm} @ ${isolatedResult.flexureX.barSpacing_mm}mm c/c
- Provided Rebar Y: ${isolatedResult.flexureY.barCount}x T${isolatedResult.flexureY.barDiameter_mm} @ ${isolatedResult.flexureY.barSpacing_mm}mm c/c

2. MAT FOUNDATION & WINKLER SUBGRADE SSI
- Mat Dimensions: ${matWidth}m x ${matLength}m x ${matThick}m
- Subgrade Modulus ks: ${matResult.modulusSubgradeReaction_kN_m3} kN/m3 (${matMethod})
- Max Contact Pressure: ${matResult.maxPressure_kPa} kPa | Min: ${matResult.minPressure_kPa} kPa
- Differential Settlement: ${matResult.differentialSettlement_mm} mm
- Angular Distortion: 1/${Math.round(1 / (matResult.maxAngularDistortion || 1e-6))}
- Separation/Uplift Area: ${matResult.upliftAreaPercentage}%

3. DEEP FOUNDATIONS & PILE GROUP
- Layout: ${pileGridRows}x${pileGridCols} = ${pileGroupResult.pilesCount} Piles (D=${pileDia}m, L=${pileLen}m)
- Converse-Labarre Efficiency: ${pileGroupResult.groupEfficiencyConverseLabarre}
- Single Pile Allowable: ${singlePileResult.allowableCompression_kN} kN (Shaft: ${singlePileResult.totalShaftCapacity_kN} kN, Tip: ${singlePileResult.endBearingCapacity_kN} kN)
- Max Pile Reaction: ${pileGroupResult.maxPileReaction_kN} kN (DCR: ${pileGroupResult.governingPileUtilization})
- Pile Cap Punching DCR: ${pileGroupResult.punchingShearColumn.dcr}
- Overall Status: ${isolatedResult.overallStatus === 'PASS' && pileGroupResult.overallPass ? 'ALL CHECKS PASSED' : 'REVISION REQUIRED'}
`;
    navigator.clipboard.writeText(reportText);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 sm:p-6 overflow-hidden"
    >
      <motion.div
        initial={{ scale: 0.95, y: 15 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 15 }}
        className="relative w-full max-w-7xl h-[92vh] bg-slate-900/95 border border-slate-700/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
      >
        {/* HEADER BAR */}
        <header className="px-6 py-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-orange-600 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-500/20 text-white">
              <Layers size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight bg-gradient-to-r from-amber-300 via-orange-200 to-yellow-100 bg-clip-text text-transparent">
                  Foundation & Geotechnical SSI Studio
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Sprint B11.5
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck size={12} /> ACI 318 / EC2 / IS 456
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Soil Stratigraphy, Bearing Capacity, Spread Footings, Mat SSI & Deep Pile Groups
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyReport}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-colors shadow-sm"
              title="Copy formatted calculation note to clipboard"
            >
              {copiedReport ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copiedReport ? 'Copied Note!' : 'Copy Dossier'}</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors border border-slate-700/50"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* NAVIGATION TABS */}
        <div className="px-6 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between shrink-0">
          <nav className="flex items-center gap-2">
            {[
              { id: 'isolated', label: 'Isolated Spread Footing', icon: Box },
              { id: 'mat_ssi', label: 'Mat SSI (Winkler)', icon: Grid },
              { id: 'pile_group', label: 'Deep Pile Group', icon: Anchor },
              { id: 'stratigraphy', label: 'Soil Borehole Log', icon: Waves },
              { id: 'report', label: 'Calculation Report', icon: FileCheck },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as FoundationTab)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-amber-600/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Interactive Real-time Engine</span>
          </div>
        </div>

        {/* MAIN STUDIO VIEWPORT & CONTROLS */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* LEFT 7 COLS: 3D / GRAPHICAL VISUALIZATION */}
          <div className="lg:col-span-7 bg-slate-950/50 p-6 flex flex-col border-r border-slate-800 overflow-y-auto">
            {/* VIEW HEADER */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Compass size={16} className="text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  {activeTab === 'isolated' && '3D Footing Contact Pressure & Shear Diagram'}
                  {activeTab === 'mat_ssi' && '2D Winkler Spring Contact Heatmap & Separation'}
                  {activeTab === 'pile_group' && '3D Pile Group Layout & Cap Equilibrium'}
                  {activeTab === 'stratigraphy' && 'Soil Stratigraphy & Effective Stress Log'}
                  {activeTab === 'report' && 'Codified Dossier & Calculation Summary'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                  Scale: True Metric
                </span>
              </div>
            </div>

            {/* INTERACTIVE GRAPHIC RENDERING CANVAS */}
            <div className="flex-1 min-h-[360px] bg-slate-900/60 border border-slate-800 rounded-xl relative flex items-center justify-center p-4 overflow-hidden">
              {/* TAB 1: ISOLATED FOOTING 3D VISUALIZATION */}
              {activeTab === 'isolated' && (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <svg viewBox="0 0 600 360" className="w-full h-full max-h-[340px]">
                    <defs>
                      <linearGradient id="footingSlabGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#475569" />
                        <stop offset="100%" stopColor="#1e293b" />
                      </linearGradient>
                      <linearGradient id="pedestalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#64748b" />
                        <stop offset="100%" stopColor="#334155" />
                      </linearGradient>
                      <linearGradient id="soilPressureGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="rgba(245, 158, 11, 0.4)" />
                        <stop offset="100%" stopColor="rgba(239, 68, 68, 0.1)" />
                      </linearGradient>
                    </defs>

                    {/* Ground Level Line */}
                    <line x1="40" y1="90" x2="560" y2="90" stroke="#64748b" strokeWidth="2" strokeDasharray="6,4" />
                    <text x="50" y="82" fill="#94a3b8" fontSize="11" fontFamily="monospace">
                      Ground Surface (EL ±0.00m)
                    </text>

                    {/* Water table line */}
                    {waterTableDepth_m > 0 && (
                      <>
                        <line
                          x1="40"
                          y1={90 + waterTableDepth_m * 30}
                          x2="560"
                          y2={90 + waterTableDepth_m * 30}
                          stroke="#38bdf8"
                          strokeWidth="2"
                          strokeDasharray="4,3"
                        />
                        <text
                          x="420"
                          y={85 + waterTableDepth_m * 30}
                          fill="#38bdf8"
                          fontSize="11"
                          fontFamily="monospace"
                        >
                          ▼ WT = -{waterTableDepth_m}m
                        </text>
                      </>
                    )}

                    {/* Column Pedestal */}
                    <rect
                      x={300 - (colCx * 100) / 2}
                      y="50"
                      width={colCx * 100}
                      height="90"
                      fill="url(#pedestalGrad)"
                      stroke="#94a3b8"
                      strokeWidth="2"
                      rx="4"
                    />

                    {/* Axial Load Force Vector Arrow */}
                    <line x1="300" y1="10" x2="300" y2="45" stroke="#ef4444" strokeWidth="4" />
                    <polygon points="294,42 300,50 306,42" fill="#ef4444" />
                    <text x="312" y="32" fill="#ef4444" fontSize="12" fontWeight="bold" fontFamily="monospace">
                      P = {loadP} kN
                    </text>

                    {/* Biaxial Moment Curve */}
                    {loadMy > 0 && (
                      <path
                        d="M 270 25 A 25 25 0 0 1 330 25"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="3"
                        strokeDasharray="4,2"
                      />
                    )}

                    {/* Footing Slab */}
                    <rect
                      x={300 - (footingB * 100) / 2}
                      y="140"
                      width={footingB * 100}
                      height={footingH * 100}
                      fill="url(#footingSlabGrad)"
                      stroke="#cbd5e1"
                      strokeWidth="2"
                      rx="4"
                    />

                    {/* Critical One-Way Shear Section lines (at distance d from column face) */}
                    {(() => {
                      const d_px = (isolatedResult.effectiveDepth_m || 0.45) * 100;
                      const colFaceRight = 300 + (colCx * 100) / 2;
                      const shearPlaneRight = colFaceRight + d_px;
                      return (
                        shearPlaneRight < 300 + (footingB * 100) / 2 && (
                          <>
                            <line
                              x1={shearPlaneRight}
                              y1="140"
                              x2={shearPlaneRight}
                              y2={140 + footingH * 100}
                              stroke="#ef4444"
                              strokeWidth="2"
                              strokeDasharray="4,3"
                            />
                            <text
                              x={shearPlaneRight - 15}
                              y="132"
                              fill="#ef4444"
                              fontSize="10"
                              fontFamily="monospace"
                            >
                              d
                            </text>
                          </>
                        )
                      );
                    })()}

                    {/* Bottom Rebar Dots */}
                    {Array.from({ length: isolatedResult.flexureX.barCount }).map((_, i) => {
                      const startX = 300 - (footingB * 100) / 2 + 15;
                      const endX = 300 + (footingB * 100) / 2 - 15;
                      const step = (endX - startX) / (isolatedResult.flexureX.barCount - 1 || 1);
                      return (
                        <circle
                          key={i}
                          cx={startX + i * step}
                          cy={140 + footingH * 100 - 12}
                          r="3"
                          fill="#38bdf8"
                        />
                      );
                    })}

                    {/* Trapezoidal / Triangular Soil Pressure Profile */}
                    {(() => {
                      const leftX = 300 - (footingB * 100) / 2;
                      const rightX = 300 + (footingB * 100) / 2;
                      const baseLineY = 140 + footingH * 100;
                      const qLeftHeight = Math.min(
                        70,
                        (isolatedResult.soilPressures.qMin_kPa / qAllowable) * 50
                      );
                      const qRightHeight = Math.min(
                        90,
                        (isolatedResult.soilPressures.qMax_kPa / qAllowable) * 50
                      );

                      const polyPoints = `${leftX},${baseLineY} ${leftX},${baseLineY + qLeftHeight} ${rightX},${baseLineY + qRightHeight} ${rightX},${baseLineY}`;

                      return (
                        <>
                          <polygon points={polyPoints} fill="url(#soilPressureGrad)" stroke="#f59e0b" strokeWidth="2" />
                          {/* Soil Pressure Arrows */}
                          {Array.from({ length: 9 }).map((_, idx) => {
                            const curX = leftX + idx * ((rightX - leftX) / 8);
                            const t = idx / 8;
                            const curH = qLeftHeight + t * (qRightHeight - qLeftHeight);
                            return (
                              <g key={idx}>
                                <line
                                  x1={curX}
                                  y1={baseLineY + curH}
                                  x2={curX}
                                  y2={baseLineY}
                                  stroke="#f59e0b"
                                  strokeWidth="1.5"
                                />
                                <polygon
                                  points={`${curX - 3},${baseLineY + 6} ${curX},${baseLineY} ${curX + 3},${baseLineY + 6}`}
                                  fill="#f59e0b"
                                />
                              </g>
                            );
                          })}
                          <text
                            x={leftX - 10}
                            y={baseLineY + qLeftHeight + 16}
                            fill="#f59e0b"
                            fontSize="11"
                            fontFamily="monospace"
                          >
                            q_min: {isolatedResult.soilPressures.qMin_kPa} kPa
                          </text>
                          <text
                            x={rightX - 60}
                            y={baseLineY + qRightHeight + 16}
                            fill="#f59e0b"
                            fontSize="11"
                            fontWeight="bold"
                            fontFamily="monospace"
                          >
                            q_max: {isolatedResult.soilPressures.qMax_kPa} kPa
                          </text>
                        </>
                      );
                    })()}

                    {/* Dimensions and Callouts */}
                    <text x="300" y="165" fill="#f8fafc" fontSize="11" textAnchor="middle" fontFamily="monospace">
                      {footingB}m x {footingL}m (H = {footingH}m)
                    </text>
                  </svg>
                </div>
              )}

              {/* TAB 2: MAT SSI 2D CONTOUR HEATMAP */}
              {activeTab === 'mat_ssi' && (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <div className="relative p-3 bg-slate-950/80 rounded-xl border border-slate-800 shadow-inner">
                    <div
                      className="grid gap-1.5"
                      style={{
                        gridTemplateColumns: `repeat(9, minmax(0, 1fr))`,
                      }}
                    >
                      {matResult.nodes.map(node => {
                        // Interpolate color from blue (low) to yellow to red (high)
                        const maxP = Math.max(1, matResult.maxPressure_kPa);
                        const ratio = Math.max(0, Math.min(1, node.contactPressure_kPa / maxP));
                        const isUplift = node.isUplifted;

                        return (
                          <div
                            key={node.index}
                            className={`w-7 h-7 rounded flex flex-col items-center justify-center text-[8px] font-mono transition-transform hover:scale-125 cursor-pointer shadow-sm ${
                              isUplift
                                ? 'bg-purple-900/60 border border-purple-500 text-purple-200'
                                : ratio > 0.8
                                ? 'bg-red-600/80 text-white font-bold'
                                : ratio > 0.5
                                ? 'bg-amber-500/80 text-slate-900 font-bold'
                                : 'bg-cyan-700/60 text-cyan-100'
                            }`}
                            title={`Node #${node.index} (x=${node.x_m}m, y=${node.y_m}m): q=${node.contactPressure_kPa} kPa, w=${node.settlement_mm}mm`}
                          >
                            {isUplift ? 'UP' : `${Math.round(node.contactPressure_kPa)}`}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Heatmap Legend */}
                  <div className="mt-4 flex items-center gap-4 text-xs font-mono">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3.5 h-3.5 rounded bg-cyan-700/60 border border-cyan-500/50" />
                      <span className="text-slate-400">Low (0 - {Math.round(matResult.avgPressure_kPa * 0.5)} kPa)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3.5 h-3.5 rounded bg-amber-500/80 border border-amber-400/50" />
                      <span className="text-slate-400">Mid ({Math.round(matResult.avgPressure_kPa)} kPa)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3.5 h-3.5 rounded bg-red-600/80 border border-red-400/50" />
                      <span className="text-slate-400">Peak ({Math.round(matResult.maxPressure_kPa)} kPa)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3.5 h-3.5 rounded bg-purple-900/80 border border-purple-500/50" />
                      <span className="text-purple-300">Uplift ({matResult.upliftAreaPercentage}%)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: DEEP PILE GROUP 3D VISUALIZATION */}
              {activeTab === 'pile_group' && (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <svg viewBox="0 0 600 360" className="w-full h-full max-h-[340px]">
                    <defs>
                      <linearGradient id="pileCapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#475569" />
                        <stop offset="100%" stopColor="#1e293b" />
                      </linearGradient>
                      <linearGradient id="pileShaftGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#1d4ed8" />
                      </linearGradient>
                    </defs>

                    {/* Pile Cap Slab */}
                    <rect
                      x="160"
                      y="70"
                      width="280"
                      height="65"
                      fill="url(#pileCapGrad)"
                      stroke="#cbd5e1"
                      strokeWidth="2"
                      rx="4"
                    />

                    {/* Column Pedestal */}
                    <rect x="270" y="20" width="60" height="50" fill="#64748b" stroke="#94a3b8" strokeWidth="2" rx="3" />
                    <line x1="300" y1="5" x2="300" y2="20" stroke="#ef4444" strokeWidth="3" />
                    <polygon points="296,18 300,23 304,18" fill="#ef4444" />
                    <text x="310" y="15" fill="#ef4444" fontSize="10" fontWeight="bold" fontFamily="monospace">
                      P = {pileLoadP} kN
                    </text>

                    {/* Critical Column Punching Perimeter Line */}
                    <rect
                      x="250"
                      y="70"
                      width="100"
                      height="65"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="1.5"
                      strokeDasharray="4,3"
                    />

                    {/* Individual Piles */}
                    {pileGroupResult.pileReactions.map((p, idx) => {
                      // Project pile coordinate onto SVG canvas
                      const projX = 300 + p.x_m * 70;
                      const pileW = pileDia * 45;
                      const dcr = p.utilizationRatio;
                      const pileColor = p.isTension
                        ? '#c084fc'
                        : dcr > 1.0
                        ? '#ef4444'
                        : dcr > 0.75
                        ? '#f59e0b'
                        : '#38bdf8';

                      return (
                        <g key={p.id}>
                          {/* Pile Shaft Body */}
                          <rect
                            x={projX - pileW / 2}
                            y="135"
                            width={pileW}
                            height="180"
                            fill="url(#pileShaftGrad)"
                            stroke={pileColor}
                            strokeWidth="2"
                            rx="3"
                          />
                          {/* Pile Tip */}
                          <polygon
                            points={`${projX - pileW / 2},315 ${projX},330 ${projX + pileW / 2},315`}
                            fill="#1e3a8a"
                            stroke={pileColor}
                            strokeWidth="2"
                          />
                          {/* Reaction Callout */}
                          <text
                            x={projX}
                            y="230"
                            fill="#ffffff"
                            fontSize="9"
                            fontWeight="bold"
                            textAnchor="middle"
                            fontFamily="monospace"
                          >
                            {p.serviceReaction_kN} kN
                          </text>
                          <text
                            x={projX}
                            y="245"
                            fill={pileColor}
                            fontSize="8"
                            textAnchor="middle"
                            fontFamily="monospace"
                          >
                            ({(dcr * 100).toFixed(0)}%)
                          </text>
                        </g>
                      );
                    })}

                    <text x="300" y="105" fill="#94a3b8" fontSize="11" textAnchor="middle" fontFamily="monospace">
                      Pile Cap {pileCapB}m x {pileCapL}m (H = {pileCapThick}m)
                    </text>
                  </svg>
                </div>
              )}

              {/* TAB 4: SOIL STRATIGRAPHY LOG */}
              {activeTab === 'stratigraphy' && (
                <div className="w-full h-full flex items-center justify-between gap-6 px-4">
                  {/* Left: Stratified Soil Column */}
                  <div className="w-1/2 h-full flex flex-col justify-center">
                    <div className="text-xs font-mono text-slate-400 mb-2 flex items-center justify-between">
                      <span>Borehole Profile</span>
                      <span>Total Depth: 16m</span>
                    </div>
                    <div className="relative w-full h-[260px] rounded-xl overflow-hidden border border-slate-700/80 flex flex-col">
                      {soilProfile.layers.map(l => {
                        const hRatio = (l.depthBottom_m - l.depthTop_m) / 16.0;
                        const isSand = l.soilType === 'SAND';
                        const isClay = l.soilType === 'CLAY';
                        const bgClass = isSand
                          ? 'bg-amber-900/60 border-b border-amber-700/50'
                          : isClay
                          ? 'bg-slate-700/60 border-b border-slate-600/50'
                          : 'bg-stone-800/80 border-b border-stone-600/50';

                        return (
                          <div
                            key={l.id}
                            className={`w-full flex items-center justify-between px-3 text-xs font-mono ${bgClass}`}
                            style={{ height: `${hRatio * 100}%` }}
                          >
                            <div>
                              <span className="font-bold text-slate-100">{l.name}</span>
                              <div className="text-[10px] text-slate-400">
                                c={l.cohesion_kPa}kPa | φ={l.frictionAngle_deg}° | γ={l.dryUnitWeight_kN_m3}kN/m³
                              </div>
                            </div>
                            <span className="text-[10px] text-slate-300 font-bold">
                              {l.depthBottom_m}m
                            </span>
                          </div>
                        );
                      })}

                      {/* Water Table Indicator Overlay */}
                      <div
                        className="absolute left-0 right-0 border-t-2 border-dashed border-cyan-400 flex items-center justify-end pr-2 text-[10px] font-mono font-bold text-cyan-300 bg-cyan-900/20"
                        style={{ top: `${(waterTableDepth_m / 16.0) * 100}%` }}
                      >
                        ▼ Water Table: -{waterTableDepth_m}m
                      </div>
                    </div>
                  </div>

                  {/* Right: Effective Stress & Pore Water Pressure Chart */}
                  <div className="w-1/2 h-full flex flex-col justify-center">
                    <div className="text-xs font-mono text-slate-400 mb-2">
                      Effective Overburden Stress σ'v(z)
                    </div>
                    <div className="h-[260px] bg-slate-950/80 rounded-xl p-4 border border-slate-800 flex flex-col justify-between font-mono text-xs">
                      {[0, 4, 8, 12, 16].map(z => {
                        const totalStress = stratigraphy.getTotalVerticalStress(z);
                        const porePressure = stratigraphy.getPoreWaterPressure(z);
                        const effStress = stratigraphy.getEffectiveVerticalStress(z);
                        return (
                          <div key={z} className="flex items-center justify-between py-1 border-b border-slate-800/60">
                            <span className="text-slate-400 w-16">z = {z}m:</span>
                            <span className="text-slate-300">σv = {totalStress.toFixed(1)} kPa</span>
                            <span className="text-cyan-400">u = {porePressure.toFixed(1)} kPa</span>
                            <span className="text-amber-400 font-bold">σ'v = {effStress.toFixed(1)} kPa</span>
                          </div>
                        );
                      })}
                      <div className="mt-2 text-[10px] text-slate-500 italic">
                        * Hydrostatic condition below WT: u = γw * (z - zw)
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: REPORT SUMMARY */}
              {activeTab === 'report' && (
                <div className="w-full h-full overflow-y-auto p-4 font-mono text-xs text-slate-300 space-y-4">
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-amber-400 font-bold uppercase text-sm">
                        Global Design Audit Summary
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isolatedResult.overallStatus === 'PASS' && pileGroupResult.overallPass
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {isolatedResult.overallStatus === 'PASS' && pileGroupResult.overallPass ? 'ALL CHECKS PASS' : 'WARNINGS FOUND'}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      All limit state verifications conform to ACI 318-19 Chapters 13 & 22, Eurocode 2/7, and IS 456:2000.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                      <span className="text-slate-400 text-[10px]">Bearing Pressure DCR</span>
                      <div className="text-base font-bold text-slate-100 mt-1">
                        {(isolatedResult.soilPressures.qMax_kPa / qAllowable).toFixed(3)}
                      </div>
                      <span className="text-[10px] text-emerald-400">Limit: ≤ 1.000</span>
                    </div>
                    <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                      <span className="text-slate-400 text-[10px]">Two-Way Punching DCR</span>
                      <div className="text-base font-bold text-slate-100 mt-1">
                        {isolatedResult.twoWayPunching.utilization.toFixed(3)}
                      </div>
                      <span className="text-[10px] text-emerald-400">Limit: ≤ 1.000</span>
                    </div>
                    <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                      <span className="text-slate-400 text-[10px]">One-Way Shear X DCR</span>
                      <div className="text-base font-bold text-slate-100 mt-1">
                        {isolatedResult.oneWayShearX.utilization.toFixed(3)}
                      </div>
                      <span className="text-[10px] text-emerald-400">Limit: ≤ 1.000</span>
                    </div>
                    <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                      <span className="text-slate-400 text-[10px]">Pile Utilization (Max)</span>
                      <div className="text-base font-bold text-slate-100 mt-1">
                        {pileGroupResult.governingPileUtilization.toFixed(3)}
                      </div>
                      <span className="text-[10px] text-emerald-400">Limit: ≤ 1.000</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* QUICK STATUS METRICS FOOTER */}
            <div className="mt-4 grid grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-bold">Soil Contact State</span>
                <div className="flex items-center gap-1.5 mt-1 font-bold text-slate-200">
                  {isolatedResult.soilPressures.isFullContact ? (
                    <>
                      <CheckCircle2 size={14} className="text-emerald-400" />
                      <span>Full Compression</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={14} className="text-amber-400" />
                      <span>Partial Uplift</span>
                    </>
                  )}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-bold">Peak Contact Pressure</span>
                <div className="mt-1 font-bold text-amber-400 font-mono">
                  {isolatedResult.soilPressures.qMax_kPa} kPa
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-bold">Punching Shear DCR</span>
                <div className="mt-1 font-bold text-slate-200 font-mono flex items-center justify-between">
                  <span>{isolatedResult.twoWayPunching.utilization.toFixed(2)}</span>
                  <span
                    className={`text-[10px] ${
                      isolatedResult.twoWayPunching.status === 'PASS' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {isolatedResult.twoWayPunching.status}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-bold">Governing Rebar</span>
                <div className="mt-1 font-bold text-cyan-300 font-mono">
                  {isolatedResult.flexureX.barCount}x T{isolatedResult.flexureX.barDiameter_mm}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT 5 COLS: INTERACTIVE PARAMETERS & DESIGN CONTROLS */}
          <div className="lg:col-span-5 bg-slate-900/40 p-6 flex flex-col overflow-y-auto border-l border-slate-800/60 space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Sliders size={16} className="text-amber-400" />
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide">
                Interactive Design Parameters
              </h3>
            </div>

            {/* TAB-SPECIFIC CONTROLS */}
            {activeTab === 'isolated' && (
              <div className="space-y-4">
                {/* Column Service Loads */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                    Superstructure Column Loads
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400">Axial P (kN)</label>
                      <input
                        type="number"
                        value={loadP}
                        onChange={e => setLoadP(Number(e.target.value))}
                        className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Mx (kNm)</label>
                      <input
                        type="number"
                        value={loadMx}
                        onChange={e => setLoadMx(Number(e.target.value))}
                        className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">My (kNm)</label>
                      <input
                        type="number"
                        value={loadMy}
                        onChange={e => setLoadMy(Number(e.target.value))}
                        className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Footing Slab Geometry */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                    Footing Slab Dimensions
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400">Width B (m)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={footingB}
                        onChange={e => setFootingB(Number(e.target.value))}
                        className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Length L (m)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={footingL}
                        onChange={e => setFootingL(Number(e.target.value))}
                        className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Thickness H (m)</label>
                      <input
                        type="number"
                        step="0.05"
                        value={footingH}
                        onChange={e => setFootingH(Number(e.target.value))}
                        className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="text-[10px] text-slate-400">Allowable Bearing (kPa)</label>
                      <input
                        type="number"
                        value={qAllowable}
                        onChange={e => setQAllowable(Number(e.target.value))}
                        className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Concrete f'c (MPa)</label>
                      <input
                        type="number"
                        value={concreteFck}
                        onChange={e => setConcreteFck(Number(e.target.value))}
                        className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Reinforcement Results Display */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wide">
                    Provided Bottom Reinforcement
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400">X-Direction (Short/Long)</span>
                      <div className="text-slate-100 font-bold mt-0.5">
                        {isolatedResult.flexureX.barCount}x T{isolatedResult.flexureX.barDiameter_mm}
                      </div>
                      <span className="text-[10px] text-cyan-400">
                        @ {isolatedResult.flexureX.barSpacing_mm}mm c/c (As={isolatedResult.flexureX.AsRequired_mm2}mm²)
                      </span>
                    </div>
                    <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400">Y-Direction</span>
                      <div className="text-slate-100 font-bold mt-0.5">
                        {isolatedResult.flexureY.barCount}x T{isolatedResult.flexureY.barDiameter_mm}
                      </div>
                      <span className="text-[10px] text-cyan-400">
                        @ {isolatedResult.flexureY.barSpacing_mm}mm c/c (As={isolatedResult.flexureY.AsRequired_mm2}mm²)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2 CONTROLS: MAT FOUNDATION & WINKLER SSI */}
            {activeTab === 'mat_ssi' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                    Mat Slab & Subgrade Parameters
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400">Width B (m)</label>
                      <input
                        type="number"
                        value={matWidth}
                        onChange={e => setMatWidth(Number(e.target.value))}
                        className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Length L (m)</label>
                      <input
                        type="number"
                        value={matLength}
                        onChange={e => setMatLength(Number(e.target.value))}
                        className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Thick H (m)</label>
                      <input
                        type="number"
                        step="0.05"
                        value={matThick}
                        onChange={e => setMatThick(Number(e.target.value))}
                        className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-1">
                    <label className="text-[10px] text-slate-400">Subgrade Reaction Modulus ks Method</label>
                    <div className="grid grid-cols-3 gap-1 mt-1">
                      {(['BOWLES', 'VESIC', 'TERZAGHI_SAND'] as const).map(m => (
                        <button
                          key={m}
                          onClick={() => setMatMethod(m)}
                          className={`py-1 text-[10px] font-mono font-bold rounded ${
                            matMethod === m
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                          }`}
                        >
                          {m === 'TERZAGHI_SAND' ? 'TERZAGHI' : m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 4 Superstructure Columns Loads */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                    Superstructure Column Loads (kN)
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400">Col 1 (SW Corner)</label>
                      <input
                        type="number"
                        value={colP1}
                        onChange={e => setColP1(Number(e.target.value))}
                        className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Col 2 (SE Corner)</label>
                      <input
                        type="number"
                        value={colP2}
                        onChange={e => setColP2(Number(e.target.value))}
                        className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Col 3 (NW Corner)</label>
                      <input
                        type="number"
                        value={colP3}
                        onChange={e => setColP3(Number(e.target.value))}
                        className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Col 4 (NE Corner)</label>
                      <input
                        type="number"
                        value={colP4}
                        onChange={e => setColP4(Number(e.target.value))}
                        className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* SSI Settlement & Distortion Metrics */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                    SSI Settlement & Distortion
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400">Diff. Settlement</span>
                      <div className="text-slate-100 font-bold mt-0.5">
                        {matResult.differentialSettlement_mm} mm
                      </div>
                    </div>
                    <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400">Angular Distortion</span>
                      <div className="text-slate-100 font-bold mt-0.5">
                        1/{Math.round(1 / (matResult.maxAngularDistortion || 1e-6))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3 CONTROLS: DEEP FOUNDATIONS & PILE GROUP */}
            {activeTab === 'pile_group' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                    Pile Layout & Geometry
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400">Grid (Rows)</label>
                      <input
                        type="number"
                        min="1"
                        max="4"
                        value={pileGridRows}
                        onChange={e => setPileGridRows(Math.max(1, Number(e.target.value)))}
                        className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Grid (Cols)</label>
                      <input
                        type="number"
                        min="1"
                        max="4"
                        value={pileGridCols}
                        onChange={e => setPileGridCols(Math.max(1, Number(e.target.value)))}
                        className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Spacing (m)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={pileSpacing}
                        onChange={e => setPileSpacing(Number(e.target.value))}
                        className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="text-[10px] text-slate-400">Pile Dia D (m)</label>
                      <input
                        type="number"
                        step="0.05"
                        value={pileDia}
                        onChange={e => setPileDia(Number(e.target.value))}
                        className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Pile Length L (m)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={pileLen}
                        onChange={e => setPileLen(Number(e.target.value))}
                        className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                    Pile Cap Loads & Thickness
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400">Load P (kN)</label>
                      <input
                        type="number"
                        value={pileLoadP}
                        onChange={e => setPileLoadP(Number(e.target.value))}
                        className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Mx (kNm)</label>
                      <input
                        type="number"
                        value={pileLoadMx}
                        onChange={e => setPileLoadMx(Number(e.target.value))}
                        className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Cap H (m)</label>
                      <input
                        type="number"
                        step="0.05"
                        value={pileCapThick}
                        onChange={e => setPileCapThick(Number(e.target.value))}
                        className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Single Pile Capacity Breakdown */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                  <span className="text-xs font-bold text-sky-400 uppercase tracking-wide">
                    Single Pile Geotechnical Capacity
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                    <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400">Shaft Qs</span>
                      <div className="text-slate-100 font-bold mt-0.5">
                        {singlePileResult.totalShaftCapacity_kN} kN
                      </div>
                    </div>
                    <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400">Tip Qb</span>
                      <div className="text-slate-100 font-bold mt-0.5">
                        {singlePileResult.endBearingCapacity_kN} kN
                      </div>
                    </div>
                    <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400">Allowable Qall</span>
                      <div className="text-amber-400 font-bold mt-0.5">
                        {singlePileResult.allowableCompression_kN} kN
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4 CONTROLS: SOIL STRATIGRAPHY */}
            {activeTab === 'stratigraphy' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-400 uppercase tracking-wide">
                      Groundwater Table Level
                    </span>
                    <span className="text-xs font-mono font-bold text-cyan-300">
                      {waterTableDepth_m} m Below GL
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={waterTableDepth_m}
                    onChange={e => setWaterTableDepth_m(Number(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>GL (0m)</span>
                    <span>5m</span>
                    <span>10m</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                    Bearing Capacity Core Factors (Meyerhof)
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                    <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400">Nc Factor</span>
                      <div className="text-slate-100 font-bold mt-0.5">
                        {bearingResult.factors.Nc.toFixed(2)}
                      </div>
                    </div>
                    <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400">Nq Factor</span>
                      <div className="text-slate-100 font-bold mt-0.5">
                        {bearingResult.factors.Nq.toFixed(2)}
                      </div>
                    </div>
                    <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400">Nγ Factor</span>
                      <div className="text-slate-100 font-bold mt-0.5">
                        {bearingResult.factors.Ngamma.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/30 flex items-center justify-between font-mono text-xs">
                    <span className="text-amber-300">Allowable Bearing Pressure q_all:</span>
                    <span className="text-amber-200 font-bold text-sm">
                      {bearingResult.allowableBearingPressure_kPa.toFixed(1)} kPa
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
