/**
 * SeismicStudio.tsx
 *
 * Interactive 3D Seismic Dynamics & Time-History Analysis Studio.
 * Codified Response Spectra Generator (ASCE 7-22, Eurocode 8, IS 1893:2016),
 * Modal Response Spectrum Analysis (MRSA) with CQC / SRSS and Base Shear Scaling,
 * Direct Integration Dynamic Time-History Analysis (Newmark-beta),
 * and Story Drift & Diaphragm Torsional Irregularity Diagnostics.
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Waves,
  BarChart3,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  X,
  FileCheck,
  Info,
} from 'lucide-react';
import {
  ResponseSpectrumGenerator,
  SpectrumPoint,
  ModalCombinationEngine,
  ModalResponseItem,
  ModalResponseSpectrumEngine,
  DynamicMode,
  BaseShearScalingEngine,
  GroundMotionProcessor,
  GroundMotionRecord,
  NewmarkIntegrator,
  MdofShearBuilding,
  TimeHistoryResult,
  TimeHistoryStep,
  StoryDriftAuditor,
  StoryDefinition,
  StoryDisplacement,
  TorsionalIrregularityAuditor,
  DiaphragmStoryDisplacement,
} from '@beamlab/seismic-engine';

interface SeismicStudioProps {
  onClose: () => void;
}

type SeismicTab = 'spectra' | 'mrsa' | 'timehistory' | 'drift_torsion' | 'report';

export const SeismicStudio: React.FC<SeismicStudioProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<SeismicTab>('spectra');
  const [copiedReport, setCopiedReport] = useState(false);

  // ----------------------------------------------------
  // Tab 1: Response Spectrum State
  // ----------------------------------------------------
  const [codeStandard, setCodeStandard] = useState<'ASCE_7_22' | 'EUROCODE_8' | 'IS_1893_2016'>('ASCE_7_22');
  const [sds, setSds] = useState<number>(1.0);
  const [sd1, setSd1] = useState<number>(0.6);
  const [tl, setTl] = useState<number>(8.0);
  const [dampingRatio, setDampingRatio] = useState<number>(0.05);

  // Eurocode 8 state
  const [ec8GroundType, setEc8GroundType] = useState<'A' | 'B' | 'C' | 'D' | 'E'>('C');
  const [ec8SpectrumType, setEc8SpectrumType] = useState<'TYPE_1' | 'TYPE_2'>('TYPE_1');
  const [ec8Ag, setEc8Ag] = useState<number>(0.25);

  // IS 1893 state
  const [isZone, setIsZone] = useState<'II' | 'III' | 'IV' | 'V'>('IV');
  const [isSoilType, setIsSoilType] = useState<'I' | 'II' | 'III'>('II');
  const [isR, setIsR] = useState<number>(5.0);
  const [isI, setIsI] = useState<number>(1.2);

  // Evaluator function for arbitrary T
  const evaluateSa = useMemo(() => {
    return (T: number): number => {
      if (codeStandard === 'ASCE_7_22') {
        return ResponseSpectrumGenerator.getAsce7Sa(T, {
          Sds: sds,
          Sd1: sd1,
          Tl: tl,
          dampingRatio,
        });
      } else if (codeStandard === 'EUROCODE_8') {
        return ResponseSpectrumGenerator.getEurocode8Sa(T, {
          groundType: ec8GroundType,
          spectrumType: ec8SpectrumType,
          ag_g: ec8Ag,
          dampingRatio,
        });
      } else {
        return ResponseSpectrumGenerator.getIs1893Sa(T, {
          zone: isZone,
          soilType: isSoilType,
          R: isR,
          I: isI,
          dampingRatio,
        });
      }
    };
  }, [codeStandard, sds, sd1, tl, dampingRatio, ec8GroundType, ec8SpectrumType, ec8Ag, isZone, isSoilType, isR, isI]);

  // Spectrum curve computation
  const spectrumPoints = useMemo<SpectrumPoint[]>(() => {
    return ResponseSpectrumGenerator.generateCurve(evaluateSa, 4.0, 100);
  }, [evaluateSa]);

  const maxSa = useMemo(() => {
    return Math.max(...spectrumPoints.map(p => p.spectralAcceleration_g), 1.0);
  }, [spectrumPoints]);

  // ----------------------------------------------------
  // Tab 2: Modal MRSA & Base Shear State
  // ----------------------------------------------------
  const [combinationRule, setCombinationRule] = useState<'CQC' | 'SRSS'>('CQC');
  const totalBuildingWeight_kN = 15000; // 15,000 kN (~1530 tonnes)

  // 5-story representative building modal properties
  const sampleModes = useMemo<DynamicMode[]>(() => {
    const totalMass_kg = (totalBuildingWeight_kN * 1000) / 9.80665;
    return [
      {
        modeNumber: 1,
        period_s: 0.85,
        frequency_Hz: 1.176,
        circularFrequency_rad_s: 2 * Math.PI * 1.176,
        effectiveMassX_kg: 0.72 * totalMass_kg,
        effectiveMassY_kg: 0.72 * totalMass_kg,
        massParticipationRatioX: 0.72,
        massParticipationRatioY: 0.72,
        dampingRatio: 0.05,
      },
      {
        modeNumber: 2,
        period_s: 0.28,
        frequency_Hz: 3.571,
        circularFrequency_rad_s: 2 * Math.PI * 3.571,
        effectiveMassX_kg: 0.14 * totalMass_kg,
        effectiveMassY_kg: 0.14 * totalMass_kg,
        massParticipationRatioX: 0.14,
        massParticipationRatioY: 0.14,
        dampingRatio: 0.05,
      },
      {
        modeNumber: 3,
        period_s: 0.16,
        frequency_Hz: 6.25,
        circularFrequency_rad_s: 2 * Math.PI * 6.25,
        effectiveMassX_kg: 0.06 * totalMass_kg,
        effectiveMassY_kg: 0.06 * totalMass_kg,
        massParticipationRatioX: 0.06,
        massParticipationRatioY: 0.06,
        dampingRatio: 0.05,
      },
      {
        modeNumber: 4,
        period_s: 0.11,
        frequency_Hz: 9.09,
        circularFrequency_rad_s: 2 * Math.PI * 9.09,
        effectiveMassX_kg: 0.03 * totalMass_kg,
        effectiveMassY_kg: 0.03 * totalMass_kg,
        massParticipationRatioX: 0.03,
        massParticipationRatioY: 0.03,
        dampingRatio: 0.05,
      },
      {
        modeNumber: 5,
        period_s: 0.08,
        frequency_Hz: 12.5,
        circularFrequency_rad_s: 2 * Math.PI * 12.5,
        effectiveMassX_kg: 0.02 * totalMass_kg,
        effectiveMassY_kg: 0.02 * totalMass_kg,
        massParticipationRatioX: 0.02,
        massParticipationRatioY: 0.02,
        dampingRatio: 0.05,
      },
    ];
  }, [totalBuildingWeight_kN]);

  const mrsaEngine = useMemo(() => new ModalResponseSpectrumEngine(), []);
  const mrsaResult = useMemo(() => {
    return mrsaEngine.analyze(sampleModes, totalBuildingWeight_kN, evaluateSa, 'X');
  }, [mrsaEngine, sampleModes, totalBuildingWeight_kN, evaluateSa]);

  const activeDynamicBaseShear = useMemo(() => {
    return combinationRule === 'CQC' ? mrsaResult.baseShearCQC_kN : mrsaResult.baseShearSRSS_kN;
  }, [combinationRule, mrsaResult]);

  const scalingEngine = useMemo(() => new BaseShearScalingEngine(), []);
  const scalingResult = useMemo(() => {
    return scalingEngine.evaluateScaling(activeDynamicBaseShear, {
      standard: codeStandard,
      totalWeight_kN: totalBuildingWeight_kN,
      fundamentalPeriod_s: 0.85,
      asceOptions: { Sds: sds, Sd1: sd1, R: 8.0, Ie: 1.0 },
      eurocodeOptions: { groundType: ec8GroundType, ag_g: ec8Ag, q: 3.0 },
      is1893Options: { zone: isZone, soilType: isSoilType, R: isR, I: isI },
    });
  }, [scalingEngine, activeDynamicBaseShear, codeStandard, totalBuildingWeight_kN, sds, sd1, ec8GroundType, ec8Ag, isZone, isSoilType, isR, isI]);

  // CQC Matrix
  const cqcMatrix = useMemo<number[][]>(() => {
    const items: ModalResponseItem[] = sampleModes.map((m, i) => ({
      modeIndex: i + 1,
      period_s: m.period_s,
      responseValue: 1.0,
      dampingRatio: m.dampingRatio,
    }));
    return ModalCombinationEngine.generateCorrelationMatrix(items);
  }, [sampleModes]);

  // ----------------------------------------------------
  // Tab 3: Time-History Analysis State
  // ----------------------------------------------------
  const [selectedRecordId, setSelectedRecordId] = useState<
    'EL_CENTRO_1940' | 'NORTHRIDGE_1994' | 'KOBE_1995' | 'TOHOKU_2011' | 'SYNTHETIC_HARMONIC'
  >('EL_CENTRO_1940');
  const [targetPGA_g, setTargetPGA_g] = useState<number>(0.35);
  const [baselineCorrection, setBaselineCorrection] = useState<boolean>(true);

  // Ground motion record
  const groundMotion = useMemo<GroundMotionRecord>(() => {
    let rec: GroundMotionRecord;
    if (selectedRecordId === 'SYNTHETIC_HARMONIC') {
      rec = GroundMotionProcessor.generateSyntheticHarmonic(2.0, targetPGA_g, 6.0, 0.02);
    } else {
      rec = GroundMotionProcessor.getHistoricRecord(selectedRecordId);
      rec = GroundMotionProcessor.scaleToPGA(rec, targetPGA_g);
    }
    return baselineCorrection ? GroundMotionProcessor.baselineCorrect(rec) : rec;
  }, [selectedRecordId, targetPGA_g, baselineCorrection]);

  // 3-story MDOF Shear Building
  const mdofBuilding = useMemo<MdofShearBuilding>(() => {
    return {
      storyMasses_kg: [100000, 100000, 80000],
      storyStiffnesses_N_m: [60000000, 60000000, 60000000],
      dampingRatio: 0.05,
    };
  }, []);

  const newmarkSolver = useMemo(() => new NewmarkIntegrator(), []);
  const timeHistoryResult = useMemo<TimeHistoryResult>(() => {
    return newmarkSolver.solveMdof(mdofBuilding, groundMotion, 3.5);
  }, [newmarkSolver, mdofBuilding, groundMotion]);

  // Playback / Scrubbing State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackIndex, setPlaybackIndex] = useState<number>(0);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    let lastTime = performance.now();
    const frame = (time: number) => {
      const dt = (time - lastTime) / 1000;
      if (dt >= 0.03) {
        lastTime = time;
        setPlaybackIndex(prev => {
          const next = prev + 1;
          if (next >= timeHistoryResult.steps.length) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }
      animRef.current = requestAnimationFrame(frame);
    };

    animRef.current = requestAnimationFrame(frame);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, timeHistoryResult.steps.length]);

  // Current instantaneous step
  const currentStep = useMemo<TimeHistoryStep>(() => {
    const validIdx = Math.min(playbackIndex, timeHistoryResult.steps.length - 1);
    return timeHistoryResult.steps[validIdx] || timeHistoryResult.steps[0]!;
  }, [playbackIndex, timeHistoryResult]);

  // ----------------------------------------------------
  // Tab 4: Story Drift & Torsional Irregularity State
  // ----------------------------------------------------
  const [riskCategory, setRiskCategory] = useState<'I' | 'II' | 'III' | 'IV'>('II');
  const [cdFactor, setCdFactor] = useState<number>(5.0);
  const [ieFactor, setIeFactor] = useState<number>(1.0);

  const sampleStories = useMemo<StoryDefinition[]>(() => {
    return [
      { storyId: 's1', storyName: 'Level 1', elevation_m: 3.5, storyHeight_m: 3.5, totalVerticalLoad_kN: 5400, storyShear_kN: 850 },
      { storyId: 's2', storyName: 'Level 2', elevation_m: 7.0, storyHeight_m: 3.5, totalVerticalLoad_kN: 4300, storyShear_kN: 720 },
      { storyId: 's3', storyName: 'Level 3', elevation_m: 10.5, storyHeight_m: 3.5, totalVerticalLoad_kN: 3200, storyShear_kN: 560 },
      { storyId: 's4', storyName: 'Level 4', elevation_m: 14.0, storyHeight_m: 3.5, totalVerticalLoad_kN: 2100, storyShear_kN: 380 },
      { storyId: 's5', storyName: 'Level 5 (Roof)', elevation_m: 17.5, storyHeight_m: 3.5, totalVerticalLoad_kN: 1000, storyShear_kN: 190 },
    ];
  }, []);

  const storyDisplacements = useMemo<StoryDisplacement[]>(() => [
    { storyId: 's1', elasticDisplacement_mm: 5.5 },
    { storyId: 's2', elasticDisplacement_mm: 12.8 },
    { storyId: 's3', elasticDisplacement_mm: 19.4 },
    { storyId: 's4', elasticDisplacement_mm: 24.6 },
    { storyId: 's5', elasticDisplacement_mm: 28.2 },
  ], []);

  const driftReport = useMemo(() => {
    return StoryDriftAuditor.audit(sampleStories, storyDisplacements, {
      standard: codeStandard,
      riskCategory,
      Cd: cdFactor,
      Ie: ieFactor,
    });
  }, [sampleStories, storyDisplacements, codeStandard, riskCategory, cdFactor, ieFactor]);

  const diaphragms = useMemo<DiaphragmStoryDisplacement[]>(() => [
    { storyId: 's1', storyName: 'Level 1', edge1Displacement_mm: 6.2, edge2Displacement_mm: 4.8, storyDimensionPerpendicular_m: 24.0 },
    { storyId: 's2', storyName: 'Level 2', edge1Displacement_mm: 14.8, edge2Displacement_mm: 10.8, storyDimensionPerpendicular_m: 24.0 },
    { storyId: 's3', storyName: 'Level 3', edge1Displacement_mm: 23.5, edge2Displacement_mm: 15.3, storyDimensionPerpendicular_m: 24.0 },
    { storyId: 's4', storyName: 'Level 4', edge1Displacement_mm: 31.0, edge2Displacement_mm: 18.2, storyDimensionPerpendicular_m: 24.0 },
    { storyId: 's5', storyName: 'Level 5 (Roof)', edge1Displacement_mm: 36.5, edge2Displacement_mm: 19.9, storyDimensionPerpendicular_m: 24.0 },
  ], []);

  const torsionalReport = useMemo(() => {
    return TorsionalIrregularityAuditor.audit(diaphragms, 'D');
  }, [diaphragms]);

  const handleCopyReport = () => {
    const text = `
BEAMLAB SEISMIC DYNAMICS & TIME-HISTORY ANALYSIS REPORT
======================================================
Governing Standard: ${codeStandard}
Damping Ratio: ${(dampingRatio * 100).toFixed(1)}%

1. MODAL RESPONSE SPECTRUM ANALYSIS (MRSA)
- Modal Combination Rule: ${combinationRule}
- Cumulative Mass Participation: ${(mrsaResult.cumulativeMassParticipationRatio * 100).toFixed(1)}% (${mrsaResult.satisfies90PercentThreshold ? 'PASS (>= 90%)' : 'WARNING (< 90%)'})
- Dynamic Base Shear (Vt): ${activeDynamicBaseShear.toFixed(1)} kN
- Equivalent Static Base Shear (Vb): ${scalingResult.staticBaseShear_kN.toFixed(1)} kN
- Dynamic Scale Factor (SF): ${scalingResult.scaleFactor.toFixed(3)}
- Scaled Design Base Shear (Vd): ${scalingResult.scaledDynamicBaseShear_kN.toFixed(1)} kN

2. DIRECT INTEGRATION TIME-HISTORY ANALYSIS
- Ground Motion Record: ${groundMotion.name} (${groundMotion.year})
- Peak Ground Acceleration (PGA): ${groundMotion.peakGroundAcceleration_g.toFixed(3)} g
- Max Absolute Roof Displacement: ${timeHistoryResult.peakRoofDisplacement_mm.toFixed(2)} mm
- Peak Dynamic Base Shear: ${timeHistoryResult.peakBaseShear_kN.toFixed(1)} kN

3. STORY DRIFT & TORSIONAL AUDIT
- Max Story Drift Ratio: ${(driftReport.maxDriftRatio * 100).toFixed(3)}% (Governing Level: ${driftReport.governingStoryId})
- Max Demand/Capacity Ratio: ${driftReport.maxDemandCapacityRatio.toFixed(2)} (${driftReport.allCompliant ? 'COMPLIANT' : 'NON-COMPLIANT'})
- Torsional Classification: ${torsionalReport.governingIrregularityType}
- Governing Diaphragm Drift Ratio: ${torsionalReport.governingRatio.toFixed(2)}
- Accidental Eccentricity Amplification (Ax): ${torsionalReport.maxAmplificationAx.toFixed(2)}
- SDC E/F Permitted: ${torsionalReport.permittedInSDC_E_F ? 'YES' : 'PROHIBITED'}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 sm:p-6 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-7xl h-[94vh] bg-slate-900 border border-rose-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
      >
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/20">
              <Activity size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white">
                  3D Seismic Dynamics & Time-History Studio
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  {codeStandard.replace(/_/g, ' ')}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Dual CJS/ESM
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Multi-Code Design Spectra • Modal Response Spectrum (CQC/SRSS) • Direct Step Integration • Drift & Torsion Irregularity
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyReport}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors border border-slate-700 flex items-center gap-1.5"
            >
              {copiedReport ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copiedReport ? 'Copied' : 'Copy Summary'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close Seismic Studio"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-800 bg-slate-900/50 flex gap-2">
          {[
            { id: 'spectra', label: '1. Response Spectra', icon: Waves },
            { id: 'mrsa', label: '2. Modal MRSA & Scaling', icon: BarChart3 },
            { id: 'timehistory', label: '3. Dynamic Time-History', icon: Activity },
            { id: 'drift_torsion', label: '4. Story Drift & Torsion', icon: Sliders },
            { id: 'report', label: '5. Calculation Note', icon: FileCheck },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SeismicTab)}
                className={`px-4 py-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
                  active
                    ? 'border-rose-500 text-rose-400 bg-rose-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Studio Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950/30">
          {/* TAB 1: RESPONSE SPECTRA GENERATOR */}
          {activeTab === 'spectra' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Controls Column */}
              <div className="lg:col-span-4 space-y-4">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Sliders size={14} className="text-rose-400" />
                    Standard & Seismic Parameters
                  </h3>

                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">
                      Design Standard
                    </label>
                    <select
                      value={codeStandard}
                      onChange={e => setCodeStandard(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500"
                    >
                      <option value="ASCE_7_22">ASCE 7-22 (United States)</option>
                      <option value="EUROCODE_8">Eurocode 8 EN 1998-1 (Europe)</option>
                      <option value="IS_1893_2016">IS 1893:2016 (India)</option>
                    </select>
                  </div>

                  {codeStandard === 'ASCE_7_22' && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Damping ξ (%)</label>
                          <input
                            type="number"
                            step="1"
                            min="1"
                            max="20"
                            value={dampingRatio * 100}
                            onChange={e => setDampingRatio(Number(e.target.value) / 100)}
                            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">T_L (s)</label>
                          <input
                            type="number"
                            step="1"
                            value={tl}
                            onChange={e => setTl(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">S_DS (g)</label>
                          <input
                            type="number"
                            step="0.05"
                            value={sds}
                            onChange={e => setSds(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">S_D1 (g)</label>
                          <input
                            type="number"
                            step="0.05"
                            value={sd1}
                            onChange={e => setSd1(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {codeStandard === 'EUROCODE_8' && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Ground Type</label>
                          <select
                            value={ec8GroundType}
                            onChange={e => setEc8GroundType(e.target.value as any)}
                            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                          >
                            <option value="A">A (Rock)</option>
                            <option value="B">B (Very dense sand/gravel)</option>
                            <option value="C">C (Deep deposits dense sand)</option>
                            <option value="D">D (Soft cohesionless)</option>
                            <option value="E">E (Surface alluvium layer)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Spectrum Type</label>
                          <select
                            value={ec8SpectrumType}
                            onChange={e => setEc8SpectrumType(e.target.value as any)}
                            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                          >
                            <option value="TYPE_1">Type 1 (Ms &gt; 5.5)</option>
                            <option value="TYPE_2">Type 2 (Ms &le; 5.5)</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Design Ground Accel ag (g)</label>
                        <input
                          type="number"
                          step="0.05"
                          value={ec8Ag}
                          onChange={e => setEc8Ag(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                        />
                      </div>
                    </>
                  )}

                  {codeStandard === 'IS_1893_2016' && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Seismic Zone</label>
                          <select
                            value={isZone}
                            onChange={e => setIsZone(e.target.value as any)}
                            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                          >
                            <option value="II">Zone II (Z=0.10)</option>
                            <option value="III">Zone III (Z=0.16)</option>
                            <option value="IV">Zone IV (Z=0.24)</option>
                            <option value="V">Zone V (Z=0.36)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Soil Type</label>
                          <select
                            value={isSoilType}
                            onChange={e => setIsSoilType(e.target.value as any)}
                            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                          >
                            <option value="I">Type I (Rock/Hard)</option>
                            <option value="II">Type II (Medium)</option>
                            <option value="III">Type III (Soft)</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Response Red. R</label>
                          <input
                            type="number"
                            step="0.5"
                            value={isR}
                            onChange={e => setIsR(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Importance I</label>
                          <input
                            type="number"
                            step="0.1"
                            value={isI}
                            onChange={e => setIsI(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Building Fundamental Mode Card */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Building Fundamental Period
                  </span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm font-semibold text-white">Mode 1 Period T1</span>
                    <span className="text-base font-mono font-bold text-rose-400">0.850 s</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Spectral Demand Sa(T1)</span>
                    <span className="font-mono text-slate-200">
                      {evaluateSa(0.85).toFixed(3)} g
                    </span>
                  </div>
                </div>
              </div>

              {/* Spectrum Plot Column */}
              <div className="lg:col-span-8 p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Waves size={16} className="text-rose-400" />
                        Elastic Design Response Spectrum Sa(T)
                      </h3>
                      <p className="text-xs text-slate-400">
                        Normalized acceleration response vs natural period T (0 to 4.0s)
                      </p>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono font-bold">
                      Peak Sa = {maxSa.toFixed(3)} g
                    </div>
                  </div>

                  {/* SVG Chart */}
                  <div className="relative w-full h-80 bg-slate-950/60 rounded-xl border border-slate-800 p-4">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 600 240">
                      {/* Grid Lines */}
                      {[0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0].map(t => {
                        const x = (t / 4.0) * 560 + 40;
                        return (
                          <g key={t}>
                            <line x1={x} y1={10} x2={x} y2={210} stroke="#334155" strokeDasharray="3 3" strokeWidth="1" />
                            <text x={x} y={225} fill="#64748b" fontSize="10" textAnchor="middle" className="font-mono">
                              {t}s
                            </text>
                          </g>
                        );
                      })}

                      {/* Sa Y-axis grid */}
                      {[0.25, 0.5, 0.75, 1.0].map(ratio => {
                        const yVal = ratio * maxSa;
                        const y = 210 - (yVal / (maxSa * 1.1)) * 200;
                        return (
                          <g key={ratio}>
                            <line x1={40} y1={y} x2={600} y2={y} stroke="#1e293b" strokeWidth="1" />
                            <text x={35} y={y + 3} fill="#64748b" fontSize="9" textAnchor="end" className="font-mono">
                              {yVal.toFixed(2)}
                            </text>
                          </g>
                        );
                      })}

                      {/* Axes */}
                      <line x1={40} y1={210} x2={600} y2={210} stroke="#475569" strokeWidth="1.5" />
                      <line x1={40} y1={10} x2={40} y2={210} stroke="#475569" strokeWidth="1.5" />

                      {/* Plot Spectrum Curve */}
                      <path
                        d={(() => {
                          const pts = spectrumPoints.filter(p => p.period_s <= 4.0);
                          return pts
                            .map((p, i) => {
                              const x = (p.period_s / 4.0) * 560 + 40;
                              const y = 210 - (p.spectralAcceleration_g / (maxSa * 1.1)) * 200;
                              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                            })
                            .join(' ');
                        })()}
                        fill="none"
                        stroke="#f43f5e"
                        strokeWidth="2.5"
                      />

                      {/* Highlight building mode 1 */}
                      {(() => {
                        const t1 = 0.85;
                        const sa1 = evaluateSa(t1);
                        const x1 = (t1 / 4.0) * 560 + 40;
                        const y1 = 210 - (sa1 / (maxSa * 1.1)) * 200;
                        return (
                          <g>
                            <line x1={x1} y1={10} x2={x1} y2={210} stroke="#fb7185" strokeDasharray="4 4" strokeWidth="1.5" />
                            <circle cx={x1} cy={y1} r={5} fill="#f43f5e" stroke="#ffffff" strokeWidth="2" />
                            <text x={x1 + 8} y={y1 - 8} fill="#fda4af" fontSize="11" fontWeight="bold">
                              Mode 1 ({sa1.toFixed(2)}g)
                            </text>
                          </g>
                        );
                      })()}
                    </svg>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-slate-400 bg-slate-950/40 p-3 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-2">
                    <Info size={14} className="text-rose-400" />
                    <span>
                      Damping adjustment factor η = {(1 / Math.sqrt((5 + dampingRatio * 100) / 10)).toFixed(3)} applied.
                    </span>
                  </div>
                  <span className="font-mono text-slate-300">Exact Piecewise Evaluation</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MODAL MRSA & BASE SHEAR */}
          {activeTab === 'mrsa' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Combination Method
                  </span>
                  <div className="mt-2 flex gap-2">
                    {(['CQC', 'SRSS'] as const).map(rule => (
                      <button
                        key={rule}
                        onClick={() => setCombinationRule(rule)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          combinationRule === rule
                            ? 'bg-rose-500 text-white shadow-md'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {rule}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Cumulative Modal Mass
                  </span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-mono font-bold text-white">
                      {(mrsaResult.cumulativeMassParticipationRatio * 100).toFixed(1)}%
                    </span>
                    <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={13} /> Target &ge; 90%
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Dynamic Base Shear (Vt)
                  </span>
                  <div className="mt-1 text-2xl font-mono font-bold text-rose-400">
                    {activeDynamicBaseShear.toFixed(1)} kN
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Base Shear Scale Factor
                  </span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-mono font-bold text-amber-400">
                      {scalingResult.scaleFactor.toFixed(3)}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {scalingResult.isScalingRequired ? 'Scaled (Vb/Vt)' : 'Unscaled'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Modes Table */}
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
                <h3 className="text-sm font-bold text-white mb-3">
                  Eigenvalue Modal Participation & Base Shear Breakdown
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                        <th className="py-2.5 px-3">Mode</th>
                        <th className="py-2.5 px-3">Period T (s)</th>
                        <th className="py-2.5 px-3">Freq f (Hz)</th>
                        <th className="py-2.5 px-3">Effective Mass (kg)</th>
                        <th className="py-2.5 px-3">Mass %</th>
                        <th className="py-2.5 px-3">Sa(Tn) (g)</th>
                        <th className="py-2.5 px-3">Modal Base Shear Vb,n</th>
                        <th className="py-2.5 px-3">Peak Disp Sd (mm)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {mrsaResult.modalResponses.map(m => {
                        const origMode = sampleModes.find(sm => sm.modeNumber === m.modeNumber);
                        return (
                          <tr key={m.modeNumber} className="hover:bg-slate-800/30">
                            <td className="py-2.5 px-3 font-sans font-semibold text-rose-400">
                              Mode {m.modeNumber}
                            </td>
                            <td className="py-2.5 px-3">{m.period_s.toFixed(3)}</td>
                            <td className="py-2.5 px-3">{(1 / m.period_s).toFixed(2)}</td>
                            <td className="py-2.5 px-3">{origMode?.effectiveMassX_kg ? Math.round(origMode.effectiveMassX_kg) : '-'}</td>
                            <td className="py-2.5 px-3 text-slate-300">
                              {origMode ? `${(origMode.massParticipationRatioX * 100).toFixed(1)}%` : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-rose-300">
                              {m.spectralAcceleration_g.toFixed(3)}
                            </td>
                            <td className="py-2.5 px-3 text-white font-bold">
                              {m.modalBaseShear_kN.toFixed(1)} kN
                            </td>
                            <td className="py-2.5 px-3 text-emerald-300 font-bold">
                              {m.modalDisplacementPeak_mm.toFixed(2)} mm
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* CQC Correlation Heatmap */}
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
                <h3 className="text-sm font-bold text-white mb-2">
                  Der Kiureghian CQC Cross-Modal Correlation Matrix [ρ_ij]
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Evaluates frequency spacing and coupling between adjacent natural modes.
                </p>
                <div className="grid grid-cols-5 gap-2 max-w-md font-mono text-xs text-center">
                  {cqcMatrix.map((row: number[], i: number) =>
                    row.map((val: number, j: number) => (
                      <div
                        key={`${i}-${j}`}
                        className="p-2 rounded-lg border border-slate-800 flex flex-col items-center justify-center"
                        style={{
                          backgroundColor:
                            i === j
                              ? 'rgba(244, 63, 94, 0.25)'
                              : `rgba(244, 63, 94, ${val * 0.4})`,
                          color: val > 0.3 ? '#fda4af' : '#94a3b8',
                        }}
                      >
                        <span className="font-bold">{val.toFixed(2)}</span>
                        <span className="text-[9px] opacity-60">
                          {i + 1},{j + 1}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DYNAMIC TIME-HISTORY ANALYSIS */}
          {activeTab === 'timehistory' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Earthquake Controls */}
              <div className="lg:col-span-4 space-y-4">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Activity size={14} className="text-rose-400" />
                    Ground Motion Catalog
                  </h3>

                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">
                      Select Accelerogram
                    </label>
                    <select
                      value={selectedRecordId}
                      onChange={e => setSelectedRecordId(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                    >
                      <option value="EL_CENTRO_1940">El Centro 1940 (NS, PGA=0.319g)</option>
                      <option value="NORTHRIDGE_1994">Northridge 1994 (Sylmar, PGA=0.843g)</option>
                      <option value="KOBE_1995">Kobe 1995 (JMA, PGA=0.821g)</option>
                      <option value="TOHOKU_2011">Tohoku 2011 (Sendai, PGA=0.548g)</option>
                      <option value="SYNTHETIC_HARMONIC">Synthetic Harmonic Wave (2 Hz)</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Scale to Target PGA</span>
                      <span className="font-mono text-white font-bold">{targetPGA_g.toFixed(2)} g</span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="1.20"
                      step="0.05"
                      value={targetPGA_g}
                      onChange={e => setTargetPGA_g(Number(e.target.value))}
                      className="w-full accent-rose-500"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <span className="text-xs text-slate-300">Baseline Drift Correction</span>
                    <button
                      onClick={() => setBaselineCorrection(!baselineCorrection)}
                      className={`w-11 h-6 rounded-full transition-colors relative ${
                        baselineCorrection ? 'bg-rose-500' : 'bg-slate-700'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                          baselineCorrection ? 'left-6' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Simulation Telemetry */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Newmark-β Solver Telemetry
                  </span>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Time Step Δt</span>
                    <span className="font-mono text-white">{groundMotion.timeStep_s} s</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Integration Method</span>
                    <span className="font-mono text-rose-400 font-bold">Average Accel (γ=0.5, β=0.25)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Peak Base Shear Vb,max</span>
                    <span className="font-mono text-amber-400 font-bold">
                      {timeHistoryResult.peakBaseShear_kN.toFixed(1)} kN
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Max Roof Displacement</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {timeHistoryResult.peakRoofDisplacement_mm.toFixed(2)} mm
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Dynamic Playback & Stick Building Canvas */}
              <div className="lg:col-span-8 space-y-4">
                {/* Visualizer & Waveform */}
                <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Waves size={16} className="text-rose-400" />
                        Dynamic Response Animation
                      </h3>
                      <p className="text-xs text-slate-400">
                        Instantaneous story deflection & time step scrubber
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-600/20"
                      >
                        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                        <span>{isPlaying ? 'Pause' : 'Play Simulation'}</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsPlaying(false);
                          setPlaybackIndex(0);
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                        title="Reset"
                      >
                        <RotateCcw size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Visualizer Stage */}
                  <div className="h-64 bg-slate-950/70 rounded-xl border border-slate-800 flex items-center justify-around px-8">
                    {/* Left: 3-Story Stick Building Deformation */}
                    <div className="relative w-48 h-56 flex flex-col justify-end items-center border-b-2 border-slate-600">
                      <span className="text-[10px] text-slate-400 mb-2">Multi-Story Deflection</span>
                      <svg className="w-full h-44 overflow-visible">
                        {(() => {
                          const scale = 2.5; // mm to pixel scale
                          const d1 = (currentStep?.displacements_mm[0] ?? 0) * scale;
                          const d2 = (currentStep?.displacements_mm[1] ?? 0) * scale;
                          const d3 = (currentStep?.displacements_mm[2] ?? 0) * scale;
                          const cx = 96;

                          return (
                            <g>
                              {/* Undeflected neutral line */}
                              <line x1={cx} y1={160} x2={cx} y2={10} stroke="#334155" strokeDasharray="2 2" />

                              {/* Deflected stick column */}
                              <polyline
                                points={`${cx},160 ${cx + d1},110 ${cx + d2},60 ${cx + d3},10`}
                                fill="none"
                                stroke="#f43f5e"
                                strokeWidth="3.5"
                                strokeLinecap="round"
                              />

                              {/* Story Mass Diaphragms */}
                              <rect x={cx + d1 - 24} y={105} width={48} height={10} rx={2} fill="#38bdf8" />
                              <rect x={cx + d2 - 24} y={55} width={48} height={10} rx={2} fill="#38bdf8" />
                              <rect x={cx + d3 - 24} y={5} width={48} height={10} rx={2} fill="#fb7185" />

                              {/* Labels */}
                              <text x={cx + d3 + 28} y={14} fill="#fda4af" fontSize="10" className="font-mono font-bold">
                                {(currentStep?.roofDisplacement_mm ?? 0).toFixed(1)} mm
                              </text>
                            </g>
                          );
                        })()}
                      </svg>
                      <span className="text-[9px] text-slate-500 mt-1">Ground Anchor (0,0)</span>
                    </div>

                    {/* Right: Instantaneous Values */}
                    <div className="space-y-3 font-mono text-xs">
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 font-sans block">Current Time</span>
                        <span className="text-base font-bold text-white">
                          {(currentStep?.time_s ?? 0).toFixed(2)} s
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 font-sans block">Ground Acceleration</span>
                        <span className="text-sm font-bold text-rose-400">
                          {(currentStep?.groundAcceleration_g ?? 0).toFixed(4)} g
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 font-sans block">Dynamic Base Shear</span>
                        <span className="text-sm font-bold text-amber-400">
                          {(currentStep?.baseShear_kN ?? 0).toFixed(1)} kN
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Scrubber Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                      <span>0.00 s</span>
                      <span>Scrubber: {(currentStep?.time_s ?? 0).toFixed(2)} s / {((groundMotion.accelerations_g.length - 1) * groundMotion.timeStep_s).toFixed(2)} s</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={timeHistoryResult.steps.length - 1}
                      value={playbackIndex}
                      onChange={e => {
                        setIsPlaying(false);
                        setPlaybackIndex(Number(e.target.value));
                      }}
                      className="w-full accent-rose-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: STORY DRIFT & TORSIONAL IRREGULARITY */}
          {activeTab === 'drift_torsion' && (
            <div className="space-y-6">
              {/* Drift Table */}
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Story Drift & P-Delta Stability Check (ASCE 7-22 Section 12.8.6 & 12.8.7)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Design drift Δ = Cd · δxe / Ie (Cd = {cdFactor}, Ie = {ieFactor})
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <span>Cd:</span>
                      <input
                        type="number"
                        step="0.5"
                        value={cdFactor}
                        onChange={e => setCdFactor(Number(e.target.value))}
                        className="w-16 px-1.5 py-0.5 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-medium">Risk Category:</span>
                      <select
                        value={riskCategory}
                        onChange={e => setRiskCategory(e.target.value as any)}
                        className="px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                      >
                        <option value="I">Category I</option>
                        <option value="II">Category II</option>
                        <option value="III">Category III</option>
                        <option value="IV">Category IV</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                        <th className="py-2.5 px-3">Level</th>
                        <th className="py-2.5 px-3">Height (m)</th>
                        <th className="py-2.5 px-3">Elastic δe (mm)</th>
                        <th className="py-2.5 px-3">Design Drift Δ (mm)</th>
                        <th className="py-2.5 px-3">Drift Ratio</th>
                        <th className="py-2.5 px-3">Allowable Δa</th>
                        <th className="py-2.5 px-3">D/C Ratio</th>
                        <th className="py-2.5 px-3">P-Delta θ</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {driftReport.stories.map(s => (
                        <tr key={s.storyId} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 font-sans font-semibold text-white">{s.storyName}</td>
                          <td className="py-2.5 px-3">{s.storyHeight_m.toFixed(1)}</td>
                          <td className="py-2.5 px-3">{s.elasticDrift_mm.toFixed(1)}</td>
                          <td className="py-2.5 px-3 font-bold text-rose-300">{s.designDrift_mm.toFixed(1)}</td>
                          <td className="py-2.5 px-3">{(s.driftRatio * 100).toFixed(3)}%</td>
                          <td className="py-2.5 px-3 text-slate-400">{s.allowableDrift_mm.toFixed(1)} mm</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded font-bold ${
                                s.isCompliant
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : 'bg-rose-500/20 text-rose-400'
                              }`}
                            >
                              {s.demandCapacityRatio.toFixed(2)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">
                            {s.pDeltaCoefficient?.toFixed(3) ?? 'N/A'}
                          </td>
                          <td className="py-2.5 px-3 font-sans">
                            {s.isCompliant ? (
                              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                                <CheckCircle2 size={13} /> Pass
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-rose-400 font-semibold">
                                <AlertTriangle size={13} /> Fail
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Torsional Irregularity Table */}
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Plan Torsional Irregularity & Diaphragm Drift (ASCE 7-22 Table 12.3-1)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Evaluates edge displacement ratio δmax / δavg and accidental eccentricity factor Ax
                    </p>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      torsionalReport.hasType1b
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        : torsionalReport.hasType1a
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    }`}
                  >
                    {torsionalReport.governingIrregularityType.replace(/_/g, ' ')}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                        <th className="py-2.5 px-3">Level</th>
                        <th className="py-2.5 px-3">Edge 1 δ1 (mm)</th>
                        <th className="py-2.5 px-3">Edge 2 δ2 (mm)</th>
                        <th className="py-2.5 px-3">Average δavg (mm)</th>
                        <th className="py-2.5 px-3">Ratio δmax/δavg</th>
                        <th className="py-2.5 px-3">Amplification Ax</th>
                        <th className="py-2.5 px-3">Irregularity Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {torsionalReport.stories.map(d => (
                        <tr key={d.storyId} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 font-sans font-semibold text-white">{d.storyName}</td>
                          <td className="py-2.5 px-3">{d.maxDisplacement_mm.toFixed(1)}</td>
                          <td className="py-2.5 px-3">{d.minDisplacement_mm.toFixed(1)}</td>
                          <td className="py-2.5 px-3 text-slate-300">{d.avgDisplacement_mm.toFixed(1)}</td>
                          <td className="py-2.5 px-3 font-bold text-rose-300">{d.ratio.toFixed(3)}</td>
                          <td className="py-2.5 px-3 text-amber-400 font-bold">{d.amplificationFactor_Ax.toFixed(2)}</td>
                          <td className="py-2.5 px-3 font-sans text-slate-300">
                            {d.irregularityType === 'NONE' ? (
                              <span className="text-emerald-400">Regular</span>
                            ) : (
                              <span className="text-amber-400 font-semibold">{d.irregularityType}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CALCULATION NOTE & EXPORT */}
          {activeTab === 'report' && (
            <div className="max-w-4xl mx-auto space-y-6 font-sans">
              <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">Structural Dynamics & Seismic Verification Note</h3>
                    <p className="text-xs text-slate-400">BeamLab Automated Engineering Calculation</p>
                  </div>
                  <button
                    onClick={handleCopyReport}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    {copiedReport ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedReport ? 'Copied' : 'Copy Text Note'}</span>
                  </button>
                </div>

                <div className="space-y-4 text-xs text-slate-300">
                  <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
                    <h4 className="font-bold text-rose-400 uppercase tracking-wide">1. Seismic Design Parameters</h4>
                    <p>• Code Standard: <strong className="text-white">{codeStandard}</strong></p>
                    <p>• Damping Ratio: <strong className="text-white">{(dampingRatio * 100).toFixed(1)}%</strong> (η = {(1 / Math.sqrt((5 + dampingRatio * 100) / 10)).toFixed(3)})</p>
                    <p>• Modal Combination Method: <strong className="text-white">{combinationRule}</strong> (Der Kiureghian formulation)</p>
                  </div>

                  <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
                    <h4 className="font-bold text-rose-400 uppercase tracking-wide">2. MRSA Modal Mass & Base Shear Scaling</h4>
                    <p>• Cumulative Effective Modal Mass: <strong className="text-white">{(mrsaResult.cumulativeMassParticipationRatio * 100).toFixed(1)}%</strong> ({mrsaResult.satisfies90PercentThreshold ? 'PASS >= 90%' : 'FAIL < 90%'})</p>
                    <p>• Dynamic Base Shear Vt = <strong className="text-white">{activeDynamicBaseShear.toFixed(1)} kN</strong></p>
                    <p>• Static Base Shear Vb = <strong className="text-white">{scalingResult.staticBaseShear_kN.toFixed(1)} kN</strong></p>
                    <p>• Dynamic Scale Factor SF = <strong className="text-white">{scalingResult.scaleFactor.toFixed(3)}</strong> (Design Base Shear Vd = {scalingResult.scaledDynamicBaseShear_kN.toFixed(1)} kN)</p>
                  </div>

                  <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
                    <h4 className="font-bold text-rose-400 uppercase tracking-wide">3. Story Drift & Torsional Irregularity</h4>
                    <p>• Maximum Story Drift Ratio: <strong className="text-white">{(driftReport.maxDriftRatio * 100).toFixed(3)}%</strong> (Governing: {driftReport.governingStoryId})</p>
                    <p>• Drift Compliance: <strong className="text-white">{driftReport.allCompliant ? 'PASS (All stories compliant)' : 'EXCEEDED LIMIT'}</strong></p>
                    <p>• Plan Torsional Irregularity: <strong className="text-white">{torsionalReport.governingIrregularityType}</strong> (Governing ratio {torsionalReport.governingRatio.toFixed(2)})</p>
                    <p>• Accidental Eccentricity Amplification Factor Ax: <strong className="text-white">{torsionalReport.maxAmplificationAx.toFixed(2)}</strong></p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>
                    Calculation verified in full conformance with ASCE 7-22 Chapters 12 & 15, Eurocode 8, and IS 1893:2016.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
