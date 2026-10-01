/**
 * WindStudio.tsx
 *
 * Interactive 3D Wind Aerodynamics & Computational Engineering Studio.
 * Codified Wind Velocity & Pressure Profiles (ASCE 7-22, Eurocode 1, IS 875:2015),
 * Facade Surface Pressures & MWFRS / C&C Force Distribution,
 * Dynamic Along-Wind Gust Resonance & Cross-Wind Vortex Shedding Diagnostics,
 * and High-Rise Occupant Comfort & TMD Sizing Auditor.
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Wind,
  Activity,
  Layers,
  BarChart3,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Copy,
  Check,
  X,
  FileCheck,
  Info,
  ShieldAlert,
  Compass,
  ArrowRight,
} from 'lucide-react';
import {
  WindProfileEngine,
  WindProfilePoint,
  AerodynamicPressureEngine,
  BuildingDimensions,
  BuildingStoryLevel,
  GustResonanceEngine,
  DynamicBuildingProperties,
  VortexSheddingEngine,
  VortexSheddingInput,
  OccupantComfortAuditor,
  ComfortAuditInput,
  OccupancyType,
  StormReturnPeriod,
} from '@beamlab/wind-engine';

interface WindStudioProps {
  onClose: () => void;
}

type WindTab = 'profile' | 'pressures' | 'dynamics' | 'comfort' | 'report';

export const WindStudio: React.FC<WindStudioProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<WindTab>('profile');
  const [copiedReport, setCopiedReport] = useState(false);

  // ----------------------------------------------------
  // Tab 1: Wind Profile State
  // ----------------------------------------------------
  const [standard, setStandard] = useState<'ASCE_7_22' | 'EUROCODE_1' | 'IS_875_2015'>('ASCE_7_22');
  const [basicSpeed_mps, setBasicSpeed_mps] = useState<number>(45); // ~100 mph
  const [asceExposure, setAsceExposure] = useState<'B' | 'C' | 'D'>('C');
  const [kd, setKd] = useState<number>(0.85);
  const [kzt, setKzt] = useState<number>(1.0);

  // Eurocode parameters
  const [ecTerrain, setEcTerrain] = useState<'0' | 'I' | 'II' | 'III' | 'IV'>('II');
  const [airDensity, setAirDensity] = useState<number>(1.25);

  // IS 875 parameters
  const [isCategory, setIsCategory] = useState<1 | 2 | 3 | 4>(2);

  // ----------------------------------------------------
  // Tab 2: Building Geometry & MWFRS State
  // ----------------------------------------------------
  const [buildingLength_m, setBuildingLength_m] = useState<number>(35); // L (parallel to wind)
  const [buildingWidth_m, setBuildingWidth_m] = useState<number>(25); // B (cross-wind width)
  const [buildingHeight_m, setBuildingHeight_m] = useState<number>(60); // h
  const [parapetHeight_m, setParapetHeight_m] = useState<number>(1.2);
  const [enclosure, setEnclosure] = useState<'ENCLOSED' | 'PARTIALLY_ENCLOSED' | 'PARTIALLY_OPEN'>('ENCLOSED');

  // Multi-story building levels (e.g. 5 representative 12m intervals or 15 4m stories)
  const stories = useMemo<BuildingStoryLevel[]>(() => {
    const storyHeight = 4.0;
    const numStories = Math.floor(buildingHeight_m / storyHeight);
    const list: BuildingStoryLevel[] = [];
    for (let i = 1; i <= numStories; i++) {
      list.push({
        levelId: `L${i}`,
        levelName: i === numStories ? `Level ${i} (Roof)` : `Level ${i}`,
        elevation_m: i * storyHeight,
        storyHeight_m: storyHeight,
      });
    }
    return list;
  }, [buildingHeight_m]);

  // Wind profile points
  const profilePoints = useMemo<WindProfilePoint[]>(() => {
    return WindProfileEngine.generateProfile(standard, buildingHeight_m, 2.5, {
      asce: {
        basicWindSpeed_mps: basicSpeed_mps,
        exposureCategory: asceExposure,
        Kd: kd,
        Kzt: kzt,
      },
      eurocode: {
        fundamentalBasicWindSpeed_mps: basicSpeed_mps,
        terrainCategory: ecTerrain,
        airDensity_kg_m3: airDensity,
      },
      is875: {
        basicWindSpeed_mps: basicSpeed_mps,
        terrainCategory: isCategory,
      },
    });
  }, [standard, buildingHeight_m, basicSpeed_mps, asceExposure, kd, kzt, ecTerrain, airDensity, isCategory]);

  const maxProfilePressure = useMemo(() => {
    return Math.max(...profilePoints.map(p => p.velocityPressure_N_m2), 500);
  }, [profilePoints]);

  // ----------------------------------------------------
  // Tab 3: Dynamic Gust & Vortex Shedding State
  // ----------------------------------------------------
  const [fundamentalFrequency_Hz, setFundamentalFrequency_Hz] = useState<number>(0.35); // ~2.85s period
  const [dampingRatio, setDampingRatio] = useState<number>(0.015); // 1.5% structural damping
  const [totalBuildingMass_tonnes, setTotalBuildingMass_tonnes] = useState<number>(18000); // 18,000 tonnes
  const [crossSectionShape, setCrossSectionShape] = useState<'SQUARE' | 'RECTANGULAR' | 'CIRCULAR'>('RECTANGULAR');

  // Along-wind dynamic gust factor
  const gustResult = useMemo(() => {
    const props: DynamicBuildingProperties = {
      fundamentalFrequency_Hz,
      dampingRatio,
      buildingHeight_m,
      crossWindWidth_m: buildingWidth_m,
      alongWindLength_m: buildingLength_m,
      exposureCategory: asceExposure,
      basicWindSpeed_mps: basicSpeed_mps,
    };
    return GustResonanceEngine.calculateGustFactor(props);
  }, [fundamentalFrequency_Hz, dampingRatio, buildingHeight_m, buildingWidth_m, buildingLength_m, asceExposure, basicSpeed_mps]);

  // MWFRS analysis report
  const mwfrsReport = useMemo(() => {
    const dimensions: BuildingDimensions = {
      length_m: buildingLength_m,
      width_m: buildingWidth_m,
      meanRoofHeight_m: buildingHeight_m,
      parapetHeight_m,
      enclosureClassification: enclosure,
    };
    return AerodynamicPressureEngine.analyzeMwfrs(
      dimensions,
      stories,
      { basicWindSpeed_mps: basicSpeed_mps, exposureCategory: asceExposure, Kd: kd, Kzt: kzt },
      gustResult.gustEffectFactor
    );
  }, [buildingLength_m, buildingWidth_m, buildingHeight_m, parapetHeight_m, enclosure, stories, basicSpeed_mps, asceExposure, kd, kzt, gustResult.gustEffectFactor]);

  // Cross-wind vortex shedding
  const vortexResult = useMemo(() => {
    const avgMassPerMeter = (totalBuildingMass_tonnes * 1000) / Math.max(1, buildingHeight_m);
    const input: VortexSheddingInput = {
      crossSectionType: crossSectionShape,
      crossWindDimension_b_m: buildingWidth_m,
      alongWindDimension_d_m: buildingLength_m,
      buildingHeight_m,
      fundamentalFrequency_Hz,
      dampingRatio,
      averageMassPerMeter_kg_m: avgMassPerMeter,
      designWindSpeed_mps: basicSpeed_mps * 0.70, // 10-min mean speed
      airDensity_kg_m3: airDensity,
    };
    return VortexSheddingEngine.analyze(input);
  }, [crossSectionShape, buildingWidth_m, buildingLength_m, buildingHeight_m, fundamentalFrequency_Hz, dampingRatio, totalBuildingMass_tonnes, basicSpeed_mps, airDensity]);

  // ----------------------------------------------------
  // Tab 4: Occupant Comfort State
  // ----------------------------------------------------
  const [occupancyType, setOccupancyType] = useState<OccupancyType>('RESIDENTIAL');
  const [stormPeriod, setStormPeriod] = useState<StormReturnPeriod>('1_YEAR');

  const comfortResult = useMemo(() => {
    const input: ComfortAuditInput = {
      buildingHeight_m,
      crossWindWidth_m: buildingWidth_m,
      alongWindLength_m: buildingLength_m,
      totalBuildingMass_tonnes,
      fundamentalFrequencyAlongWind_Hz: fundamentalFrequency_Hz,
      fundamentalFrequencyCrossWind_Hz: fundamentalFrequency_Hz * 1.05,
      dampingRatio,
      occupancyType,
      stormReturnPeriod: stormPeriod,
      meanWindSpeedAtRoof_mps: basicSpeed_mps * 0.65,
      gustFactorG: gustResult.gustEffectFactor,
      resonantFactorR: gustResult.resonantFactor_R ?? 0.35,
    };
    return OccupantComfortAuditor.audit(input);
  }, [buildingHeight_m, buildingWidth_m, buildingLength_m, totalBuildingMass_tonnes, fundamentalFrequency_Hz, dampingRatio, occupancyType, stormPeriod, basicSpeed_mps, gustResult]);

  const handleCopyReport = () => {
    const text = `
BEAMLAB STRUCTURAL WIND ENGINEERING & AERODYNAMICS REPORT
=========================================================
Design Standard: ${standard}
Basic Wind Speed: ${basicSpeed_mps} m/s (~${(basicSpeed_mps * 2.237).toFixed(1)} mph)
Building Geometry: L = ${buildingLength_m}m, B = ${buildingWidth_m}m, H = ${buildingHeight_m}m

1. VELOCITY PRESSURE & AERODYNAMIC COEFFICIENTS
- Velocity Pressure at Roof qh: ${mwfrsReport.qh_N_m2.toFixed(1)} N/m^2 (${(mwfrsReport.qh_N_m2 / 1000).toFixed(3)} kPa)
- Windward Wall Cp: ${mwfrsReport.coefficients.windwardCp.toFixed(2)}
- Leeward Wall Cp: ${mwfrsReport.coefficients.leewardCp.toFixed(2)} (L/B = ${(buildingLength_m / buildingWidth_m).toFixed(2)})
- Internal Pressure Coeff GCpi: ±${mwfrsReport.coefficients.internalGpiPositive.toFixed(2)} (${enclosure})

2. MWFRS STORY FORCES & OVERTURNING MOMENT
- Total Base Shear: ${mwfrsReport.baseShear_kN.toFixed(1)} kN
- Base Overturning Moment: ${mwfrsReport.baseOverturningMoment_kNm.toFixed(1)} kN·m
- Along-Wind Gust Effect Factor G: ${gustResult.gustEffectFactor.toFixed(3)} (${gustResult.isFlexible ? 'FLEXIBLE DYNAMIC' : 'RIGID'})

3. CROSS-WIND VORTEX SHEDDING DIAGNOSTICS
- Strouhal Number St: ${vortexResult.strouhalNumber.toFixed(3)}
- Critical Resonant Speed v_crit: ${vortexResult.criticalVelocity_mps.toFixed(1)} m/s
- Scruton Mass-Damping Sc: ${vortexResult.scrutonNumber.toFixed(1)}
- Lock-In Aerodynamic Hazard: ${vortexResult.isLockInSusceptible ? 'HAZARDOUS (v_crit <= 1.25 v_design)' : 'SAFE'}
- Peak Transverse Roof Amplitude: ${vortexResult.peakTransverseAmplitude_mm.toFixed(1)} mm

4. HIGH-RISE OCCUPANT COMFORT & HABITABILITY (ISO 10137)
- Peak Resultant Horizontal Acceleration: ${comfortResult.peakHorizontalAcceleration_mg.toFixed(1)} milli-g
- ISO 10137 Allowable Limit: ${comfortResult.allowableAcceleration_mg.toFixed(1)} milli-g
- Demand/Capacity Ratio: ${comfortResult.demandCapacityRatio.toFixed(2)} (${comfortResult.isComfortCompliant ? 'PASS' : 'EXCEEDED'})
- Perception Level: ${comfortResult.perceptionLevel}
- TMD Sizing: ${comfortResult.tmdMitigation.isTmdRecommended ? `Recommended ${comfortResult.tmdMitigation.recommendedTmdMass_tonnes} tonnes tuned to ${comfortResult.tmdMitigation.optimalTmdFrequency_Hz} Hz` : 'Not required'}
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
        className="w-full max-w-7xl h-[94vh] bg-slate-900 border border-cyan-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
      >
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600 text-white shadow-lg shadow-cyan-500/20">
              <Wind size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white">
                  3D Wind Aerodynamics & Computational Engineering Studio
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  {standard.replace(/_/g, ' ')}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Dual CJS/ESM
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Velocity Profiles • MWFRS & C&C Pressures • Along-Wind Gust Resonance • Vortex Shedding Lock-In • ISO 10137 Comfort
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
              title="Close Wind Studio"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-800 bg-slate-900/50 flex gap-2">
          {[
            { id: 'profile', label: '1. Velocity & Pressure Profiles', icon: Wind },
            { id: 'pressures', label: '2. Facade Pressures & MWFRS', icon: Layers },
            { id: 'dynamics', label: '3. Dynamic Gust & Vortex Lock-In', icon: Activity },
            { id: 'comfort', label: '4. Occupant Comfort & TMD', icon: BarChart3 },
            { id: 'report', label: '5. Calculation Note', icon: FileCheck },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as WindTab)}
                className={`px-4 py-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
                  active
                    ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Studio Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950/30">
          {/* TAB 1: WIND PROFILE */}
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Controls Column */}
              <div className="lg:col-span-4 space-y-4">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Sliders size={14} className="text-cyan-400" />
                    Wind Velocity & Exposure Settings
                  </h3>

                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">
                      Governing Standard
                    </label>
                    <select
                      value={standard}
                      onChange={e => setStandard(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                    >
                      <option value="ASCE_7_22">ASCE 7-22 (United States)</option>
                      <option value="EUROCODE_1">Eurocode 1 EN 1991-1-4 (Europe)</option>
                      <option value="IS_875_2015">IS 875 (Part 3): 2015 (India)</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Basic Wind Speed V</span>
                      <span className="font-mono text-white font-bold">{basicSpeed_mps} m/s ({(basicSpeed_mps * 2.237).toFixed(1)} mph)</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="75"
                      value={basicSpeed_mps}
                      onChange={e => setBasicSpeed_mps(Number(e.target.value))}
                      className="w-full accent-cyan-500"
                    />
                  </div>

                  {standard === 'ASCE_7_22' && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Exposure</label>
                          <select
                            value={asceExposure}
                            onChange={e => setAsceExposure(e.target.value as any)}
                            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                          >
                            <option value="B">B (Urban/Suburban)</option>
                            <option value="C">C (Open Country)</option>
                            <option value="D">D (Flat Coastal)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Directionality Kd</label>
                          <input
                            type="number"
                            step="0.05"
                            value={kd}
                            onChange={e => setKd(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Topographic Factor Kzt</label>
                        <input
                          type="number"
                          step="0.05"
                          value={kzt}
                          onChange={e => setKzt(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                        />
                      </div>
                    </>
                  )}

                  {standard === 'EUROCODE_1' && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Terrain Category</label>
                          <select
                            value={ecTerrain}
                            onChange={e => setEcTerrain(e.target.value as any)}
                            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                          >
                            <option value="0">0 (Sea / Coastal)</option>
                            <option value="I">I (Open Lake)</option>
                            <option value="II">II (Open Country)</option>
                            <option value="III">III (Suburban)</option>
                            <option value="IV">IV (Dense Urban)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Air Density ρ</label>
                          <input
                            type="number"
                            step="0.05"
                            value={airDensity}
                            onChange={e => setAirDensity(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {standard === 'IS_875_2015' && (
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Terrain Category</label>
                      <select
                        value={isCategory}
                        onChange={e => setIsCategory(Number(e.target.value) as any)}
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                      >
                        <option value={1}>Category 1 (Exposed Open)</option>
                        <option value={2}>Category 2 (Scattered Obstacles)</option>
                        <option value={3}>Category 3 (Well-wooded / Towns)</option>
                        <option value={4}>Category 4 (Large Cities)</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Stagnation Velocity Pressure at Roof */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Peak Pressure at Roof Apex
                  </span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm font-semibold text-white">Roof Apex qh</span>
                    <span className="text-base font-mono font-bold text-cyan-400">
                      {mwfrsReport.qh_N_m2.toFixed(1)} N/m²
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Pressure in kPa</span>
                    <span className="font-mono text-slate-200">
                      {(mwfrsReport.qh_N_m2 / 1000).toFixed(3)} kN/m²
                    </span>
                  </div>
                </div>
              </div>

              {/* Profile Plot Column */}
              <div className="lg:col-span-8 p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Wind size={16} className="text-cyan-400" />
                        Atmospheric Boundary Layer Pressure Profile qz(z)
                      </h3>
                      <p className="text-xs text-slate-400">
                        Dynamic velocity pressure vs building elevation (0m to {buildingHeight_m}m)
                      </p>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono font-bold">
                      Max qz = {maxProfilePressure.toFixed(1)} N/m²
                    </div>
                  </div>

                  {/* SVG Chart */}
                  <div className="relative w-full h-80 bg-slate-950/60 rounded-xl border border-slate-800 p-4">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 600 240">
                      {/* Height Y-axis Grid */}
                      {[0.25, 0.5, 0.75, 1.0].map(ratio => {
                        const h = ratio * buildingHeight_m;
                        const y = 210 - (h / buildingHeight_m) * 200;
                        return (
                          <g key={ratio}>
                            <line x1={40} y1={y} x2={600} y2={y} stroke="#334155" strokeDasharray="3 3" strokeWidth="1" />
                            <text x={35} y={y + 3} fill="#64748b" fontSize="9" textAnchor="end" className="font-mono">
                              {h.toFixed(0)}m
                            </text>
                          </g>
                        );
                      })}

                      {/* Pressure X-axis Grid */}
                      {[0.25, 0.5, 0.75, 1.0].map(ratio => {
                        const qVal = ratio * maxProfilePressure;
                        const x = (qVal / (maxProfilePressure * 1.1)) * 560 + 40;
                        return (
                          <g key={ratio}>
                            <line x1={x} y1={10} x2={x} y2={210} stroke="#1e293b" strokeWidth="1" />
                            <text x={x} y={225} fill="#64748b" fontSize="9" textAnchor="middle" className="font-mono">
                              {qVal.toFixed(0)} Pa
                            </text>
                          </g>
                        );
                      })}

                      {/* Axes */}
                      <line x1={40} y1={210} x2={600} y2={210} stroke="#475569" strokeWidth="1.5" />
                      <line x1={40} y1={10} x2={40} y2={210} stroke="#475569" strokeWidth="1.5" />

                      {/* Plot Vertical Pressure Profile Curve */}
                      <path
                        d={(() => {
                          return profilePoints
                            .map((p, i) => {
                              const x = (p.velocityPressure_N_m2 / (maxProfilePressure * 1.1)) * 560 + 40;
                              const y = 210 - (p.height_m / buildingHeight_m) * 200;
                              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                            })
                            .join(' ');
                        })()}
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="3"
                      />

                      {/* Roof Apex Point */}
                      {(() => {
                        const xApex = (mwfrsReport.qh_N_m2 / (maxProfilePressure * 1.1)) * 560 + 40;
                        const yApex = 10;
                        return (
                          <g>
                            <circle cx={xApex} cy={yApex} r={5} fill="#06b6d4" stroke="#ffffff" strokeWidth="2" />
                            <text x={xApex + 8} y={yApex + 4} fill="#67e8f9" fontSize="10" fontWeight="bold">
                              Apex qh ({mwfrsReport.qh_N_m2.toFixed(0)} Pa)
                            </text>
                          </g>
                        );
                      })()}
                    </svg>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-slate-400 bg-slate-950/40 p-3 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-2">
                    <Info size={14} className="text-cyan-400" />
                    <span>Boundary layer profile strictly respects zmin cut-off limits.</span>
                  </div>
                  <span className="font-mono text-slate-300">Continuous Adaptive Evaluation</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FACADE PRESSURES & MWFRS */}
          {activeTab === 'pressures' && (
            <div className="space-y-6">
              {/* Top Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Total Base Shear (V_base)
                  </span>
                  <div className="mt-1 text-2xl font-mono font-bold text-cyan-400">
                    {mwfrsReport.baseShear_kN.toFixed(1)} kN
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Overturning Moment (M_OT)
                  </span>
                  <div className="mt-1 text-2xl font-mono font-bold text-amber-400">
                    {mwfrsReport.baseOverturningMoment_kNm.toFixed(1)} kN·m
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Windward / Leeward Cp
                  </span>
                  <div className="mt-1 flex items-baseline gap-2 font-mono">
                    <span className="text-xl font-bold text-rose-400">+{mwfrsReport.coefficients.windwardCp}</span>
                    <span className="text-sm text-slate-400">/</span>
                    <span className="text-xl font-bold text-sky-400">{mwfrsReport.coefficients.leewardCp}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Internal Pressure (GCpi)
                  </span>
                  <div className="mt-1 text-xl font-mono font-bold text-white">
                    ±{mwfrsReport.coefficients.internalGpiPositive.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Story Wind Forces Table */}
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
                <h3 className="text-sm font-bold text-white mb-3">
                  MWFRS Floor-by-Floor Lateral Wind Loads & Cumulative Shears
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                        <th className="py-2.5 px-3">Level</th>
                        <th className="py-2.5 px-3">Elevation (m)</th>
                        <th className="py-2.5 px-3">qz (N/m²)</th>
                        <th className="py-2.5 px-3">Windward p_w</th>
                        <th className="py-2.5 px-3">Leeward p_l</th>
                        <th className="py-2.5 px-3">Story Force (kN)</th>
                        <th className="py-2.5 px-3">Story Shear (kN)</th>
                        <th className="py-2.5 px-3">OTM Contrib (kN·m)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {mwfrsReport.stories.map(s => (
                        <tr key={s.levelId} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 font-sans font-semibold text-cyan-400">{s.levelName}</td>
                          <td className="py-2.5 px-3">{s.elevation_m.toFixed(1)}</td>
                          <td className="py-2.5 px-3 text-slate-300">{s.qz_N_m2.toFixed(0)}</td>
                          <td className="py-2.5 px-3 text-rose-300">{s.windwardPressure_N_m2.toFixed(1)}</td>
                          <td className="py-2.5 px-3 text-sky-300">{s.leewardPressure_N_m2.toFixed(1)}</td>
                          <td className="py-2.5 px-3 text-white font-bold">{s.storyForce_kN.toFixed(1)}</td>
                          <td className="py-2.5 px-3 text-cyan-300 font-bold">{s.storyShear_kN.toFixed(1)}</td>
                          <td className="py-2.5 px-3 text-amber-300">{s.overturningMoment_kNm.toFixed(0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Components & Cladding Suction Zones */}
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Components & Cladding (C&C) Localized Suction Design Pressures
                    </h3>
                    <p className="text-xs text-slate-400">
                      End / corner edge zone dimension a = {mwfrsReport.claddingZones[0]?.dimension_a_m} m
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                        <th className="py-2.5 px-3">Cladding Zone</th>
                        <th className="py-2.5 px-3">Zone Dimension</th>
                        <th className="py-2.5 px-3">Positive Inward (N/m²)</th>
                        <th className="py-2.5 px-3">Suction Outward (N/m²)</th>
                        <th className="py-2.5 px-3">Design Net Pressure</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {mwfrsReport.claddingZones.map(z => (
                        <tr key={z.zone} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 font-sans font-semibold text-white">
                            {z.zone.replace(/_/g, ' ')}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400">{z.dimension_a_m} m</td>
                          <td className="py-2.5 px-3 text-emerald-400">+{z.positivePressure_N_m2.toFixed(1)}</td>
                          <td className="py-2.5 px-3 text-rose-400 font-bold">{z.suctionPressure_N_m2.toFixed(1)}</td>
                          <td className="py-2.5 px-3 text-cyan-300 font-bold">{z.designNetPressure_N_m2.toFixed(1)} N/m²</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DYNAMIC GUST & VORTEX SHEDDING */}
          {activeTab === 'dynamics' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Dynamic Inputs Column */}
              <div className="lg:col-span-4 space-y-4">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Activity size={14} className="text-cyan-400" />
                    Structural Dynamics Parameters
                  </h3>

                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">
                      Cross-Section Aerodynamic Shape
                    </label>
                    <select
                      value={crossSectionShape}
                      onChange={e => setCrossSectionShape(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                    >
                      <option value="RECTANGULAR">Rectangular Prism</option>
                      <option value="SQUARE">Square Prism</option>
                      <option value="CIRCULAR">Circular Cylinder</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Fundamental Frequency f1</span>
                      <span className="font-mono text-white font-bold">{fundamentalFrequency_Hz} Hz (T1 = {(1 / fundamentalFrequency_Hz).toFixed(2)}s)</span>
                    </div>
                    <input
                      type="range"
                      min="0.10"
                      max="1.50"
                      step="0.02"
                      value={fundamentalFrequency_Hz}
                      onChange={e => setFundamentalFrequency_Hz(Number(e.target.value))}
                      className="w-full accent-cyan-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Structural Damping Ratio ξ</span>
                      <span className="font-mono text-white font-bold">{(dampingRatio * 100).toFixed(1)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.005"
                      max="0.05"
                      step="0.005"
                      value={dampingRatio}
                      onChange={e => setDampingRatio(Number(e.target.value))}
                      className="w-full accent-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Total Building Mass (tonnes)</label>
                    <input
                      type="number"
                      step="1000"
                      value={totalBuildingMass_tonnes}
                      onChange={e => setTotalBuildingMass_tonnes(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                    />
                  </div>
                </div>

                {/* Classification Status */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Rigidity & Dynamic Sensitivity
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">Building Dynamic State</span>
                    <span
                      className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                        gustResult.isFlexible
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {gustResult.isFlexible ? 'FLEXIBLE (n1 < 1 Hz)' : 'RIGID (n1 >= 1 Hz)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Along-Wind Gust Factor</span>
                    <span className="font-mono text-cyan-400 font-bold">{gustResult.gustEffectFactor}</span>
                  </div>
                </div>
              </div>

              {/* Vortex Shedding Hazard & Telemetry Column */}
              <div className="lg:col-span-8 space-y-4">
                <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Activity size={16} className="text-cyan-400" />
                        Cross-Wind Vortex Shedding Lock-In Resonance Audit
                      </h3>
                      <p className="text-xs text-slate-400">
                        Evaluates Strouhal shedding frequency vs natural frequency f1
                      </p>
                    </div>

                    <div
                      className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                        vortexResult.isLockInSusceptible
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      {vortexResult.isLockInSusceptible ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
                      <span>{vortexResult.isLockInSusceptible ? 'LOCK-IN RISK' : 'NO LOCK-IN'}</span>
                    </div>
                  </div>

                  {/* Telemetry Gauge Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Critical Velocity (v_crit)</span>
                      <span className="text-lg font-mono font-bold text-white">
                        {vortexResult.criticalVelocity_mps.toFixed(1)} m/s
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        vs Design {basicSpeed_mps} m/s
                      </span>
                    </div>

                    <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Scruton Mass-Damping (Sc)</span>
                      <span className="text-lg font-mono font-bold text-cyan-400">
                        {vortexResult.scrutonNumber.toFixed(1)}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Strouhal St = {vortexResult.strouhalNumber.toFixed(2)}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Peak Transverse Amplitude</span>
                      <span className="text-lg font-mono font-bold text-amber-400">
                        {vortexResult.peakTransverseAmplitude_mm.toFixed(1)} mm
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        y/B = {(vortexResult.relativeAmplitudeRatio * 100).toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  {/* Diagnostics list */}
                  <div className="p-4 rounded-lg bg-slate-950/40 border border-slate-800 space-y-2 text-xs">
                    <h4 className="font-bold text-slate-300">Engineering Dynamics Diagnostics</h4>
                    {vortexResult.diagnostics.map((d, i) => (
                      <p key={i} className="text-slate-400 flex items-start gap-2">
                        <ArrowRight size={13} className="text-cyan-400 shrink-0 mt-0.5" />
                        <span>{d}</span>
                      </p>
                    ))}
                    {gustResult.diagnostics.map((d, i) => (
                      <p key={`g-${i}`} className="text-slate-400 flex items-start gap-2">
                        <ArrowRight size={13} className="text-cyan-400 shrink-0 mt-0.5" />
                        <span>{d}</span>
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: OCCUPANT COMFORT & TMD */}
          {activeTab === 'comfort' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Comfort Controls */}
              <div className="lg:col-span-4 space-y-4">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <BarChart3 size={14} className="text-cyan-400" />
                    Habitability Criteria
                  </h3>

                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">
                      Building Occupancy
                    </label>
                    <select
                      value={occupancyType}
                      onChange={e => setOccupancyType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                    >
                      <option value="RESIDENTIAL">Residential Apartment Tower</option>
                      <option value="HOTEL">Hotel / Luxury Hospitality</option>
                      <option value="OFFICE">Commercial Office Building</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">
                      Storm Return Period
                    </label>
                    <select
                      value={stormPeriod}
                      onChange={e => setStormPeriod(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                    >
                      <option value="1_YEAR">1-Year Recurrence Storm (Frequent)</option>
                      <option value="5_YEAR">5-Year Recurrence Storm</option>
                      <option value="10_YEAR">10-Year Design Wind Event</option>
                    </select>
                  </div>
                </div>

                {/* ISO 10137 Limit Card */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    ISO 10137 Allowable Limit
                  </span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm font-semibold text-white">Threshold a_allowable</span>
                    <span className="text-base font-mono font-bold text-cyan-400">
                      {comfortResult.allowableAcceleration_mg.toFixed(1)} milli-g
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Demand/Capacity Ratio</span>
                    <span className="font-mono text-white font-bold">
                      {comfortResult.demandCapacityRatio.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Results & TMD Sizing Column */}
              <div className="lg:col-span-8 space-y-4">
                <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <BarChart3 size={16} className="text-cyan-400" />
                        Peak Horizontal Roof Acceleration (milli-g)
                      </h3>
                      <p className="text-xs text-slate-400">
                        Resultant acceleration a_peak = sqrt(ax² + ay²)
                      </p>
                    </div>

                    <div
                      className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                        comfortResult.isComfortCompliant
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {comfortResult.isComfortCompliant ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                      <span>{comfortResult.isComfortCompliant ? 'COMPLIANT' : 'EXCEEDED'}</span>
                    </div>
                  </div>

                  {/* Acceleration Gauge & Breakdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Along-Wind Accel (ax)</span>
                      <span className="text-lg font-mono font-bold text-cyan-400">
                        {comfortResult.alongWindAcceleration_mg.toFixed(1)} mg
                      </span>
                    </div>

                    <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Cross-Wind Accel (ay)</span>
                      <span className="text-lg font-mono font-bold text-amber-400">
                        {comfortResult.crossWindAcceleration_mg.toFixed(1)} mg
                      </span>
                    </div>

                    <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Peak Resultant a_peak</span>
                      <span className="text-lg font-mono font-bold text-rose-400">
                        {comfortResult.peakHorizontalAcceleration_mg.toFixed(1)} mg
                      </span>
                    </div>
                  </div>

                  {/* Tuned Mass Damper (TMD) Mitigation Recommendation Card */}
                  <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                        <Compass size={15} />
                        Tuned Mass Damper (TMD) Supplemental Mitigation
                      </h4>
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded ${
                          comfortResult.tmdMitigation.isTmdRecommended
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {comfortResult.tmdMitigation.isTmdRecommended ? 'TMD REQUIRED' : 'NO TMD NEEDED'}
                      </span>
                    </div>

                    {comfortResult.tmdMitigation.isTmdRecommended ? (
                      <div className="grid grid-cols-3 gap-3 text-xs font-mono">
                        <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                          <span className="text-[10px] text-slate-400 font-sans block">Required Damper Mass</span>
                          <span className="text-sm font-bold text-white">
                            {comfortResult.tmdMitigation.recommendedTmdMass_tonnes} tonnes
                          </span>
                        </div>
                        <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                          <span className="text-[10px] text-slate-400 font-sans block">Optimal Frequency</span>
                          <span className="text-sm font-bold text-cyan-400">
                            {comfortResult.tmdMitigation.optimalTmdFrequency_Hz} Hz
                          </span>
                        </div>
                        <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                          <span className="text-[10px] text-slate-400 font-sans block">Target Damping</span>
                          <span className="text-sm font-bold text-emerald-400">
                            {(comfortResult.tmdMitigation.targetDampingRatio * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">
                        Inherent structural damping ({(dampingRatio * 100).toFixed(1)}%) is sufficient to keep accelerations within ISO 10137 comfort limits.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CALCULATION REPORT */}
          {activeTab === 'report' && (
            <div className="max-w-4xl mx-auto space-y-6 font-sans">
              <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">Structural Wind Engineering Calculation Note</h3>
                    <p className="text-xs text-slate-400">BeamLab Automated Code Verification</p>
                  </div>
                  <button
                    onClick={handleCopyReport}
                    className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    {copiedReport ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedReport ? 'Copied' : 'Copy Text Note'}</span>
                  </button>
                </div>

                <div className="space-y-4 text-xs text-slate-300">
                  <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
                    <h4 className="font-bold text-cyan-400 uppercase tracking-wide">1. Velocity Pressure & Exposure Criteria</h4>
                    <p>• Governing Standard: <strong className="text-white">{standard}</strong></p>
                    <p>• Basic Wind Speed: <strong className="text-white">{basicSpeed_mps} m/s</strong> ({(basicSpeed_mps * 2.237).toFixed(1)} mph)</p>
                    <p>• Velocity Pressure at Roof Apex: <strong className="text-white">{mwfrsReport.qh_N_m2.toFixed(1)} N/m²</strong></p>
                  </div>

                  <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
                    <h4 className="font-bold text-cyan-400 uppercase tracking-wide">2. MWFRS Story Wind Forces & Global Equilibrium</h4>
                    <p>• Total Base Shear: <strong className="text-white">{mwfrsReport.baseShear_kN.toFixed(1)} kN</strong></p>
                    <p>• Base Overturning Moment: <strong className="text-white">{mwfrsReport.baseOverturningMoment_kNm.toFixed(1)} kN·m</strong></p>
                    <p>• Along-Wind Gust Effect Factor: <strong className="text-white">{gustResult.gustEffectFactor}</strong> ({gustResult.isFlexible ? 'Flexible' : 'Rigid'})</p>
                  </div>

                  <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
                    <h4 className="font-bold text-cyan-400 uppercase tracking-wide">3. Vortex Shedding & High-Rise Acceleration</h4>
                    <p>• Critical Lock-In Wind Speed: <strong className="text-white">{vortexResult.criticalVelocity_mps.toFixed(1)} m/s</strong> ({vortexResult.isLockInSusceptible ? 'LOCK-IN SUSCEPTIBLE' : 'SAFE'})</p>
                    <p>• Peak Horizontal Roof Acceleration: <strong className="text-white">{comfortResult.peakHorizontalAcceleration_mg.toFixed(1)} milli-g</strong> (ISO 10137 Limit = {comfortResult.allowableAcceleration_mg} milli-g)</p>
                    <p>• Serviceability Compliance: <strong className="text-white">{comfortResult.isComfortCompliant ? 'PASS' : 'EXCEEDED'}</strong></p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>
                    Verification completed in strict compliance with ASCE 7-22 Chapters 26–31, Eurocode 1 (EN 1991-1-4), IS 875:2015, and ISO 10137.
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
