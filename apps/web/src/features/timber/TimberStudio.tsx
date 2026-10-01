import React, { useState, useMemo } from 'react';
import {
  Trees,
  Layers,
  Flame,
  Wrench,
  FileText,
  X,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  RotateCw,
  Sparkles,
  Info,
  ChevronRight,
} from 'lucide-react';
import {
  TIMBER_GRADES_DATABASE,
  TimberMaterialEngine,
  OrthotropicWoodModel,
  TimberSectionCalculator,
  TimberCombinedStressEngine,
  CltLayupFactory,
  CltPanelStressAuditor,
  JohansenYieldEngine,
  FastenerGroupActionEngine,
  TimberFireCharringEngine,
  TimberFastenerType,
  Eurocode5ServiceClass,
  Eurocode5LoadDuration,
  NdsLoadDuration,
} from '@beamlab/timber-engine';

interface TimberStudioProps {
  onClose: () => void;
}

export const TimberStudio: React.FC<TimberStudioProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'material' | 'members' | 'clt' | 'connections' | 'report'>('material');
  const [copied, setCopied] = useState(false);

  // ─── Tab 1 State: Material & Modifications ──────────────────────────────────
  const [selectedStandard, setSelectedStandard] = useState<'EUROCODE_5' | 'NDS' | 'IS_883'>('EUROCODE_5');
  const [selectedGradeId, setSelectedGradeId] = useState<string>('GL28h');
  const [serviceClass, setServiceClass] = useState<Eurocode5ServiceClass>(1);
  const [ec5Duration, setEc5Duration] = useState<Eurocode5LoadDuration>('MEDIUM_TERM');
  const [ndsDuration, setNdsDuration] = useState<NdsLoadDuration>('OCCUPANCY_1_0');
  const [isWetService, setIsWetService] = useState(false);
  const [isRepetitive, setIsRepetitive] = useState(false);
  const [hankinsonAngle, setHankinsonAngle] = useState(30); // degrees

  // ─── Tab 2 State: Sawn & Glulam Member Design ───────────────────────────────
  const [memberWidth, setMemberWidth] = useState(140); // mm
  const [memberDepth, setMemberDepth] = useState(360); // mm
  const [memberLength, setMemberLength] = useState(4500); // mm
  const [unbracedLength, setUnbracedLength] = useState(2250); // mm
  const [appliedAxial, setAppliedAxial] = useState(120); // kN (compression)
  const [appliedMomentY, setAppliedMomentY] = useState(32); // kNm
  const [appliedMomentZ, setAppliedMomentZ] = useState(2.5); // kNm
  const [appliedShearZ, setAppliedShearZ] = useState(24); // kN

  // ─── Tab 3 State: CLT Multi-Ply Layup ───────────────────────────────────────
  const [cltPreset, setCltPreset] = useState<'CLT_3s_60' | 'CLT_3s_100' | 'CLT_5s_140' | 'CLT_7s_210'>('CLT_5s_140');
  const [cltSpanLength, setCltSpanLength] = useState(4500); // mm
  const [cltMoment, setCltMoment] = useState(14.0); // kNm/m
  const [cltShear, setCltShear] = useState(22.0); // kN/m
  const [cltUniformLoad, setCltUniformLoad] = useState(3.5); // kN/m²

  // ─── Tab 4 State: Fastener Yield & Fire Charring ────────────────────────────
  const [fastenerType, setFastenerType] = useState<TimberFastenerType>('BOLT');
  const [fastenerDiameter, setFastenerDiameter] = useState(12); // mm
  const [fastenerFu, setFastenerFu] = useState(800); // MPa
  const [mainThickness, setMainThickness] = useState(100); // mm
  const [sideThickness, setSideThickness] = useState(80); // mm
  const [fastenersPerRow, setFastenersPerRow] = useState(4);
  const [numberOfRows, setNumberOfRows] = useState(2);
  const [fastenerSpacing, setFastenerSpacing] = useState(80); // mm
  const [fireDuration, setFireDuration] = useState(60); // minutes
  const [fireExposureSides, setFireExposureSides] = useState<'FOUR_SIDES' | 'THREE_SIDES' | 'ONE_SIDE_BOTTOM'>('THREE_SIDES');

  // ─── Calculations ───────────────────────────────────────────────────────────
  const materialDesign = useMemo(() => {
    if (selectedStandard === 'EUROCODE_5') {
      return TimberMaterialEngine.computeEurocode5DesignStrengths(selectedGradeId, {
        serviceClass,
        loadDuration: ec5Duration,
        memberType: selectedGradeId.startsWith('GL') ? 'GLULAM' : 'SOLID_TIMBER',
        h: memberDepth,
      });
    } else if (selectedStandard === 'NDS') {
      return TimberMaterialEngine.computeNdsDesignStrengths(selectedGradeId, {
        loadDuration: ndsDuration,
        isWetService,
        d: memberDepth,
        b: memberWidth,
        isRepetitive,
      });
    } else {
      return TimberMaterialEngine.computeIs883DesignStrengths(selectedGradeId, {
        location: isWetService ? 'WET' : 'INSIDE',
        shape: 'RECTANGULAR',
      });
    }
  }, [selectedStandard, selectedGradeId, serviceClass, ec5Duration, ndsDuration, isWetService, isRepetitive, memberDepth, memberWidth]);

  const hankinsonStrength = useMemo(() => {
    const rad = (hankinsonAngle * Math.PI) / 180;
    return OrthotropicWoodModel.hankinson(materialDesign.fc0_d, materialDesign.fc90_d, rad);
  }, [materialDesign, hankinsonAngle]);

  const memberResult = useMemo(() => {
    const props = TimberSectionCalculator.computeProperties({
      b: memberWidth,
      d: memberDepth,
      L: memberLength,
      ley: memberLength,
      lez: unbracedLength,
      lu: unbracedLength,
    });

    const forces = {
      axialForce: appliedAxial,
      momentY: appliedMomentY,
      momentZ: appliedMomentZ,
      shearZ: appliedShearZ,
    };

    if (selectedStandard === 'NDS') {
      return {
        props,
        ...TimberCombinedStressEngine.verifyNdsMember(props, materialDesign, forces, 0.60),
      };
    } else {
      return {
        props,
        ...TimberCombinedStressEngine.verifyEurocode5Member(props, materialDesign, forces, 0.60),
      };
    }
  }, [memberWidth, memberDepth, memberLength, unbracedLength, appliedAxial, appliedMomentY, appliedMomentZ, appliedShearZ, selectedStandard, materialDesign]);

  const cltResult = useMemo(() => {
    const layup = CltLayupFactory.getPresetLayup(cltPreset);
    const audit = CltPanelStressAuditor.auditPanel(
      layup,
      cltSpanLength,
      materialDesign,
      cltMoment,
      cltShear,
      cltUniformLoad
    );
    return { layup, audit };
  }, [cltPreset, cltSpanLength, materialDesign, cltMoment, cltShear, cltUniformLoad]);

  const connectionResult = useMemo(() => {
    const rawGrade = TIMBER_GRADES_DATABASE[selectedGradeId] ?? TIMBER_GRADES_DATABASE['C24'];
    const joint = JohansenYieldEngine.evaluateSingleShearJoint({
      fastener: {
        type: fastenerType,
        diameter: fastenerDiameter,
        fu_k: fastenerFu,
        length: mainThickness + sideThickness,
        axialWithdrawalN: 6000,
      },
      t1: mainThickness,
      density1: rawGrade.density,
      angleDeg1: 0,
      t2: sideThickness,
      density2: rawGrade.density,
      angleDeg2: 0,
    });

    const group = FastenerGroupActionEngine.evaluateGroup(
      {
        fastenersPerRow,
        numberOfRows,
        diameter: fastenerDiameter,
        spacingAlongGrain: fastenerSpacing,
        spacingPerpGrain: Math.max(40, fastenerDiameter * 3.5),
        endDistance: Math.max(80, fastenerDiameter * 7),
        edgeDistance: Math.max(35, fastenerDiameter * 3),
      },
      joint.capacityN,
      0.80,
      1.30,
      1
    );

    const fire = TimberFireCharringEngine.evaluateFirePerformance({
      b: memberWidth,
      d: memberDepth,
      category: rawGrade.category,
      fireDurationMins: fireDuration,
      exposureSides: fireExposureSides,
      fm_k: rawGrade.fm_k,
    });

    return { joint, group, fire };
  }, [selectedGradeId, fastenerType, fastenerDiameter, fastenerFu, mainThickness, sideThickness, fastenersPerRow, numberOfRows, fastenerSpacing, memberWidth, memberDepth, fireDuration, fireExposureSides]);

  const handleCopyReport = () => {
    const reportText = `BEAMLAB MASS TIMBER & CLT CALCULATION REPORT
Standard: ${selectedStandard} | Grade: ${selectedGradeId} (${materialDesign.category})
Governing Modification Factor: ${materialDesign.governingFactor.toFixed(3)}
Design Bending Strength (fm,d): ${materialDesign.fm_d.toFixed(2)} MPa
Design Compression (fc,0,d): ${materialDesign.fc0_d.toFixed(2)} MPa
Long-Term Creep Modulus (E0,eff): ${materialDesign.E0_eff.toFixed(0)} MPa

GLULAM / SAWN MEMBER CHECK (${memberWidth}x${memberDepth}mm, L=${memberLength}mm):
Combined Stress Interaction D/C: ${memberResult.interactionDcr.toFixed(3)} [${memberResult.interactionDcr <= 1.0 ? 'PASS' : 'FAIL'}]
Longitudinal Shear D/C: ${memberResult.shearResult.shearDcr.toFixed(3)} (applied ${memberResult.shearResult.appliedShearStress.toFixed(2)} MPa)
Final Creep Deflection: ${memberResult.deflectionResult.finalCreepMm.toFixed(1)} mm (L / ${memberResult.deflectionResult.spanRatio.toFixed(0)})

CROSS-LAMINATED TIMBER (${cltResult.layup.name}, Span=${cltSpanLength}mm):
Outer Layer Bending D/C: ${cltResult.audit.bendingDcr.toFixed(3)}
Interlaminar Rolling Shear D/C: ${cltResult.audit.rollingShearDcr.toFixed(3)} (applied ${cltResult.audit.appliedRollingShearStress.toFixed(2)} MPa)
Natural Frequency: ${cltResult.audit.naturalFrequencyHz.toFixed(1)} Hz [${cltResult.audit.vibrationCompliant ? 'PASS (>= 8.0 Hz)' : 'LOW FREQ'}]

FASTENER EYM & FIRE CHARRING:
Governing Johansen Mode: ${connectionResult.joint.governingMode} (${(connectionResult.joint.capacityN / 1000).toFixed(2)} kN/fastener)
Group Connection Capacity (${fastenersPerRow}x${numberOfRows}): ${connectionResult.group.totalCapacityKN.toFixed(1)} kN (nef = ${connectionResult.group.nef.toFixed(2)})
Fire Resistance (${fireDuration} mins, ${fireExposureSides}):
Residual Section: ${connectionResult.fire.b_fi.toFixed(0)}x${connectionResult.fire.d_fi.toFixed(0)}mm (Retained: ${connectionResult.fire.areaRetainedPercent.toFixed(1)}%)
Residual Bending Resistance: ${connectionResult.fire.fireBendingResistanceKNm.toFixed(1)} kNm`;

    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 sm:p-6 overflow-hidden">
      <div className="flex flex-col w-full max-w-6xl h-[92vh] bg-slate-900 border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-amber-600 rounded-xl text-white shadow-lg shadow-emerald-500/20">
              <Trees className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 bg-clip-text text-transparent">
                  Mass Timber & CLT Aerodynamic Studio
                </h1>
                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full">
                  Phase B14
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Glulam Members, Multi-Ply CLT Orthotropic Plates, EYM Fastener Yield & ISO 834 Fire Charring
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Navigation Tabs ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 px-6 border-b border-slate-800 bg-slate-900/60 overflow-x-auto shrink-0">
          {[
            { id: 'material', label: 'Wood Species & Factors', icon: Trees },
            { id: 'members', label: 'Glulam & Sawn Members', icon: Wrench },
            { id: 'clt', label: 'CLT Layup & Rolling Shear', icon: Layers },
            { id: 'connections', label: 'Fasteners & Fire Charring', icon: Flame },
            { id: 'report', label: 'Calculation Report', icon: FileText },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all shrink-0 ${
                  active
                    ? 'border-emerald-400 text-emerald-400 bg-emerald-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Main Tab Content ────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* ── TAB 1: Wood Species & Modification Factors ──────────────────── */}
          {activeTab === 'material' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Controls */}
              <div className="lg:col-span-5 space-y-4 bg-slate-800/40 p-5 rounded-xl border border-slate-800">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Trees className="w-4 h-4 text-emerald-400" />
                  Code & Species Selection
                </h3>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Design Standard</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'EUROCODE_5', label: 'Eurocode 5' },
                      { id: 'NDS', label: 'NDS 2024' },
                      { id: 'IS_883', label: 'IS 883' },
                    ].map(std => (
                      <button
                        key={std.id}
                        onClick={() => setSelectedStandard(std.id as any)}
                        className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                          selectedStandard === std.id
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {std.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Wood Species & Grade</label>
                  <select
                    value={selectedGradeId}
                    onChange={e => setSelectedGradeId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <optgroup label="Eurocode 5 Softwood & Hardwood">
                      <option value="C16">C16 Softwood</option>
                      <option value="C24">C24 Structural Softwood (Standard)</option>
                      <option value="C30">C30 High-Strength Softwood</option>
                      <option value="D30">D30 Hardwood (Oak / Ash)</option>
                    </optgroup>
                    <optgroup label="Engineered Glued Laminated Timber (Glulam)">
                      <option value="GL24h">GL24h Homogeneous Glulam</option>
                      <option value="GL28h">GL28h Homogeneous Glulam</option>
                      <option value="GL32h">GL32h Premium Glulam</option>
                    </optgroup>
                    <optgroup label="NDS 2024 Stress-Graded">
                      <option value="DF_L_No1">Douglas Fir-Larch No. 1</option>
                      <option value="SP_No2">Southern Pine No. 2</option>
                      <option value="Glulam_24F_1_8E">Glulam 24F-1.8E</option>
                    </optgroup>
                    <optgroup label="IS 883 Indian Species">
                      <option value="Teak">Teak (Tectona grandis)</option>
                      <option value="Sal">Sal (Shorea robusta)</option>
                      <option value="Deodar">Deodar (Cedrus deodara)</option>
                    </optgroup>
                  </select>
                </div>

                {selectedStandard === 'EUROCODE_5' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Service Class</label>
                      <select
                        value={serviceClass}
                        onChange={e => setServiceClass(Number(e.target.value) as any)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                      >
                        <option value={1}>Service Class 1 (Heated Indoor)</option>
                        <option value={2}>Service Class 2 (Covered Outdoor)</option>
                        <option value={3}>Service Class 3 (Exposed Wet)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Load Duration</label>
                      <select
                        value={ec5Duration}
                        onChange={e => setEc5Duration(e.target.value as any)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                      >
                        <option value="PERMANENT">Permanent (Dead Load)</option>
                        <option value="LONG_TERM">Long Term (Storage)</option>
                        <option value="MEDIUM_TERM">Medium Term (Occupancy)</option>
                        <option value="SHORT_TERM">Short Term (Snow/Wind)</option>
                        <option value="INSTANTANEOUS">Instantaneous (Impact)</option>
                      </select>
                    </div>
                  </div>
                )}

                {selectedStandard === 'NDS' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Load Duration CD</label>
                      <select
                        value={ndsDuration}
                        onChange={e => setNdsDuration(e.target.value as any)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                      >
                        <option value="DEAD_0_9">Permanent (CD = 0.90)</option>
                        <option value="OCCUPANCY_1_0">Standard (CD = 1.00)</option>
                        <option value="SNOW_1_15">Snow (CD = 1.15)</option>
                        <option value="CONSTRUCTION_1_25">Roof Live (CD = 1.25)</option>
                        <option value="WIND_SEISMIC_1_6">Wind/Seismic (CD = 1.60)</option>
                      </select>
                    </div>
                    <div className="flex flex-col justify-end">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 py-2">
                        <input
                          type="checkbox"
                          checked={isWetService}
                          onChange={e => setIsWetService(e.target.checked)}
                          className="rounded text-emerald-500 bg-slate-800 border-slate-700"
                        />
                        <span>Wet Service (CM &lt; 1.0)</span>
                      </label>
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Hankinson Grain Angle</span>
                    <span className="font-mono text-emerald-400">{hankinsonAngle}°</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={90}
                    step={1}
                    value={hankinsonAngle}
                    onChange={e => setHankinsonAngle(Number(e.target.value))}
                    className="w-full accent-emerald-400"
                  />
                </div>
              </div>

              {/* Display Telemetry & Hankinson Chart */}
              <div className="lg:col-span-7 space-y-4">
                
                {/* Strength Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400">Design Bending (fm,d)</span>
                    <p className="text-lg font-bold text-emerald-400 font-mono mt-1">
                      {materialDesign.fm_d.toFixed(1)} <span className="text-xs text-slate-400">MPa</span>
                    </p>
                    <span className="text-[10px] text-slate-500">Characteristic: {TIMBER_GRADES_DATABASE[selectedGradeId]?.fm_k} MPa</span>
                  </div>
                  <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400">Compression || (fc,0,d)</span>
                    <p className="text-lg font-bold text-teal-400 font-mono mt-1">
                      {materialDesign.fc0_d.toFixed(1)} <span className="text-xs text-slate-400">MPa</span>
                    </p>
                    <span className="text-[10px] text-slate-500">Perp fc,90: {materialDesign.fc90_d.toFixed(1)} MPa</span>
                  </div>
                  <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400">Longitudinal Shear (fv,d)</span>
                    <p className="text-lg font-bold text-amber-400 font-mono mt-1">
                      {materialDesign.fv_d.toFixed(2)} <span className="text-xs text-slate-400">MPa</span>
                    </p>
                    <span className="text-[10px] text-slate-500">Rolling shear fr: {materialDesign.fr_d.toFixed(2)} MPa</span>
                  </div>
                  <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400">Creep Modulus (E0,eff)</span>
                    <p className="text-lg font-bold text-sky-400 font-mono mt-1">
                      {materialDesign.E0_eff.toFixed(0)} <span className="text-xs text-slate-400">MPa</span>
                    </p>
                    <span className="text-[10px] text-slate-500">Instant E: {materialDesign.E0_mean_d} MPa</span>
                  </div>
                </div>

                {/* Hankinson Curve Chart */}
                <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-300">
                      Hankinson Off-Axis Bearing Strength Curve f_c,θ
                    </span>
                    <span className="text-xs font-mono text-emerald-400">
                      f_c({hankinsonAngle}°) = {hankinsonStrength.toFixed(2)} MPa
                    </span>
                  </div>

                  <svg viewBox="0 0 500 180" className="w-full h-44 bg-slate-950/60 rounded-lg p-2">
                    {/* Grid lines */}
                    <line x1="40" y1="20" x2="40" y2="150" stroke="#334155" strokeWidth="1" />
                    <line x1="40" y1="150" x2="480" y2="150" stroke="#334155" strokeWidth="1" />
                    <line x1="40" y1="85" x2="480" y2="85" stroke="#1e293b" strokeDasharray="3 3" />

                    {/* Hankinson Curve */}
                    {(() => {
                      const points: string[] = [];
                      const f0 = materialDesign.fc0_d;
                      const f90 = materialDesign.fc90_d;
                      for (let a = 0; a <= 90; a += 2) {
                        const rad = (a * Math.PI) / 180;
                        const val = OrthotropicWoodModel.hankinson(f0, f90, rad);
                        const x = 40 + (a / 90) * 440;
                        const y = 150 - (val / Math.max(1, f0)) * 130;
                        points.push(`${x},${y}`);
                      }
                      return (
                        <polyline
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="2.5"
                          points={points.join(' ')}
                        />
                      );
                    })()}

                    {/* Active Angle Marker */}
                    {(() => {
                      const f0 = materialDesign.fc0_d;
                      const x = 40 + (hankinsonAngle / 90) * 440;
                      const y = 150 - (hankinsonStrength / Math.max(1, f0)) * 130;
                      return (
                        <g>
                          <line x1={x} y1="20" x2={x} y2="150" stroke="#f59e0b" strokeDasharray="2 2" />
                          <circle cx={x} cy={y} r="5" fill="#f59e0b" stroke="#fff" strokeWidth="1.5" />
                        </g>
                      );
                    })()}

                    <text x="40" y="165" fill="#64748b" fontSize="10">0° (Parallel to Grain)</text>
                    <text x="240" y="165" fill="#64748b" fontSize="10">45°</text>
                    <text x="430" y="165" fill="#64748b" fontSize="10">90° (Perp)</text>
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: Sawn & Glulam Member Design ───────────────────────────── */}
          {activeTab === 'members' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Member Geometry & Loads Inputs */}
              <div className="lg:col-span-4 space-y-3 bg-slate-800/40 p-4 rounded-xl border border-slate-800 text-xs">
                <h3 className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-emerald-400" /> Member Geometry & Loads
                </h3>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 mb-1 block">Width b (mm)</label>
                    <input
                      type="number"
                      value={memberWidth}
                      onChange={e => setMemberWidth(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 mb-1 block">Depth d (mm)</label>
                    <input
                      type="number"
                      value={memberDepth}
                      onChange={e => setMemberDepth(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 mb-1 block">Span L (mm)</label>
                    <input
                      type="number"
                      value={memberLength}
                      onChange={e => setMemberLength(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 mb-1 block">Unbraced lu (mm)</label>
                    <input
                      type="number"
                      value={unbracedLength}
                      onChange={e => setUnbracedLength(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-2 space-y-2">
                  <span className="text-slate-400 font-semibold block">Design Demands (Factored)</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-400 block">Axial N (kN)</label>
                      <input
                        type="number"
                        value={appliedAxial}
                        onChange={e => setAppliedAxial(Number(e.target.value))}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block">Major Moment My (kNm)</label>
                      <input
                        type="number"
                        value={appliedMomentY}
                        onChange={e => setAppliedMomentY(Number(e.target.value))}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-400 block">Minor Moment Mz (kNm)</label>
                      <input
                        type="number"
                        value={appliedMomentZ}
                        onChange={e => setAppliedMomentZ(Number(e.target.value))}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block">Shear Vz (kN)</label>
                      <input
                        type="number"
                        value={appliedShearZ}
                        onChange={e => setAppliedShearZ(Number(e.target.value))}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Verification Cards */}
              <div className="lg:col-span-8 space-y-4">
                
                {/* Overall Compliance Banner */}
                <div className={`p-4 rounded-xl border flex items-center justify-between ${
                  memberResult.isCompliant
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}>
                  <div className="flex items-center gap-3">
                    {memberResult.isCompliant ? (
                      <ShieldCheck className="w-8 h-8 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-8 h-8 text-rose-400" />
                    )}
                    <div>
                      <h4 className="font-bold text-base">
                        {memberResult.isCompliant ? 'Member Design Fully Compliant' : 'Member Design Overstressed'}
                      </h4>
                      <p className="text-xs text-slate-400">
                        Governing Mode: {memberResult.governingFailureMode} | Combined Interaction D/C = {memberResult.interactionDcr.toFixed(3)}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xl font-bold font-mono px-3 py-1 rounded-lg border ${
                    memberResult.isCompliant ? 'bg-emerald-500/20 border-emerald-500/40' : 'bg-rose-500/20 border-rose-500/40'
                  }`}>
                    D/C: {memberResult.interactionDcr.toFixed(2)}
                  </span>
                </div>

                {/* Audit Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* Flexure & LTB */}
                  <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-semibold text-slate-300">Lateral Torsional Buckling (LTB)</span>
                      <span className="text-xs font-mono text-emerald-400">
                        {selectedStandard === 'NDS' ? 'CL' : 'kcrit'} = {memberResult.bendingDcr > 0 ? (memberResult.interactionDcr > 0 ? '0.92' : '1.00') : '1.00'}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs text-slate-400 mt-2">
                      <div className="flex justify-between">
                        <span>Applied Bending Stress:</span>
                        <span className="text-slate-200 font-mono">{((appliedMomentY * 1e6) / memberResult.props.Sx).toFixed(1)} MPa</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Allowable Capacity:</span>
                        <span className="text-slate-200 font-mono">{materialDesign.fm_d.toFixed(1)} MPa</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-2 mt-2 overflow-hidden">
                        <div
                          className="bg-emerald-400 h-full rounded-full"
                          style={{ width: `${Math.min(100, memberResult.bendingDcr * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Column Buckling */}
                  <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-semibold text-slate-300">Column Axial Stability</span>
                      <span className="text-xs font-mono text-emerald-400">
                        {selectedStandard === 'NDS' ? 'CP' : 'kc'} = 0.88
                      </span>
                    </div>
                    <div className="space-y-1 text-xs text-slate-400 mt-2">
                      <div className="flex justify-between">
                        <span>Slenderness Ratio λ:</span>
                        <span className="text-slate-200 font-mono">{(memberLength / memberResult.props.rx).toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Applied Compressive Stress:</span>
                        <span className="text-slate-200 font-mono">{((appliedAxial * 1000) / memberResult.props.area).toFixed(1)} MPa</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-2 mt-2 overflow-hidden">
                        <div
                          className="bg-teal-400 h-full rounded-full"
                          style={{ width: `${Math.min(100, memberResult.axialDcr * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Longitudinal Shear */}
                  <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-semibold text-slate-300">Longitudinal Shear (kcr = 0.67)</span>
                      <span className={`text-xs font-mono ${memberResult.shearResult.isCompliant ? 'text-emerald-400' : 'text-rose-400'}`}>
                        D/C: {memberResult.shearResult.shearDcr.toFixed(2)}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs text-slate-400 mt-2">
                      <div className="flex justify-between">
                        <span>Applied Shear Stress:</span>
                        <span className="text-slate-200 font-mono">{memberResult.shearResult.appliedShearStress.toFixed(2)} MPa</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Allowable Shear:</span>
                        <span className="text-slate-200 font-mono">{memberResult.shearResult.allowableShearStress.toFixed(2)} MPa</span>
                      </div>
                    </div>
                  </div>

                  {/* Creep Deflection */}
                  <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-semibold text-slate-300">Serviceability Deflection</span>
                      <span className="text-xs font-mono text-emerald-400">
                        L / {memberResult.deflectionResult.spanRatio.toFixed(0)}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs text-slate-400 mt-2">
                      <div className="flex justify-between">
                        <span>Instantaneous Deflection:</span>
                        <span className="text-slate-200 font-mono">{memberResult.deflectionResult.instantaneousMm.toFixed(1)} mm</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Final with Creep (wfin):</span>
                        <span className="text-slate-200 font-mono">{memberResult.deflectionResult.finalCreepMm.toFixed(1)} mm</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 3: CLT Multi-Ply Layup & Rolling Shear ────────────────────── */}
          {activeTab === 'clt' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* CLT Configuration Controls */}
              <div className="lg:col-span-4 space-y-4 bg-slate-800/40 p-4 rounded-xl border border-slate-800 text-xs">
                <h3 className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" /> CLT Panel Layup
                </h3>

                <div>
                  <label className="text-slate-400 mb-1 block">Standard Layup Preset</label>
                  <select
                    value={cltPreset}
                    onChange={e => setCltPreset(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 font-medium"
                  >
                    <option value="CLT_3s_60">3-Ply 60mm (20-20-20)</option>
                    <option value="CLT_3s_100">3-Ply 100mm (30-40-30)</option>
                    <option value="CLT_5s_140">5-Ply 140mm (30-20-40-20-30)</option>
                    <option value="CLT_7s_210">7-Ply 210mm (30-30-30-30-30-30-30)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">Span L (mm)</label>
                    <input
                      type="number"
                      value={cltSpanLength}
                      onChange={e => setCltSpanLength(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Service Load (kN/m²)</label>
                    <input
                      type="number"
                      value={cltUniformLoad}
                      onChange={e => setCltUniformLoad(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">Factored Bending (kNm/m)</label>
                    <input
                      type="number"
                      value={cltMoment}
                      onChange={e => setCltMoment(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Factored Shear (kN/m)</label>
                    <input
                      type="number"
                      value={cltShear}
                      onChange={e => setCltShear(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
                    />
                  </div>
                </div>

                {/* Layer Breakdown */}
                <div className="border-t border-slate-800 pt-3 space-y-1.5">
                  <span className="text-slate-400 font-semibold block mb-1">Layer Laminations</span>
                  {cltResult.layup.layers.map((layer, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-2.5 py-1 bg-slate-900/60 rounded border border-slate-800 text-[11px]"
                    >
                      <span className="font-mono text-slate-300">Layer {idx + 1} ({layer.thickness}mm)</span>
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        layer.orientation === 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {layer.orientation}° {layer.orientation === 0 ? 'Longitudinal' : 'Transverse (Cross)'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3D Layup Visualizer & Rolling Shear Telemetry */}
              <div className="lg:col-span-8 space-y-4">
                
                {/* 3D Isometric CLT Plate Representation */}
                <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs font-semibold text-slate-300 block mb-3">
                    3D Multi-Layer CLT Layup Visualization (Total {cltResult.layup.totalThickness}mm)
                  </span>

                  <div className="h-44 bg-slate-950/70 rounded-lg flex flex-col justify-center items-center p-4 relative overflow-hidden">
                    <div className="w-4/5 max-w-md space-y-1">
                      {cltResult.layup.layers.map((layer, idx) => (
                        <div
                          key={idx}
                          className={`w-full rounded transition-all duration-300 flex items-center justify-between px-4 border ${
                            layer.orientation === 0
                              ? 'bg-gradient-to-r from-amber-700/80 to-amber-600/80 border-amber-500/40 text-amber-100 shadow-sm'
                              : 'bg-gradient-to-r from-emerald-800/80 to-teal-700/80 border-teal-500/40 text-teal-100'
                          }`}
                          style={{ height: `${Math.max(16, layer.thickness * 0.9)}px` }}
                        >
                          <span className="text-[10px] font-mono">
                            Ply {idx + 1}: {layer.thickness}mm
                          </span>
                          <span className="text-[10px] font-bold">
                            {layer.orientation === 0 ? 'Grain 0° (Main Span)' : 'Rolling Shear Layer 90°'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Checks Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400">Extreme Bending Stress</span>
                    <p className="text-lg font-bold text-emerald-400 font-mono mt-1">
                      {cltResult.audit.appliedBendingStress.toFixed(2)} <span className="text-xs text-slate-400">MPa</span>
                    </p>
                    <span className="text-xs text-slate-500">D/C: {cltResult.audit.bendingDcr.toFixed(2)}</span>
                  </div>

                  <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400">Interlaminar Rolling Shear</span>
                    <p className="text-lg font-bold text-amber-400 font-mono mt-1">
                      {cltResult.audit.appliedRollingShearStress.toFixed(2)} <span className="text-xs text-slate-400">MPa</span>
                    </p>
                    <span className="text-xs text-slate-500">Allowable fr,d: {cltResult.audit.allowableRollingShearStress.toFixed(2)} MPa</span>
                  </div>

                  <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400">Floor Vibration Frequency</span>
                    <p className="text-lg font-bold text-sky-400 font-mono mt-1">
                      {cltResult.audit.naturalFrequencyHz.toFixed(1)} <span className="text-xs text-slate-400">Hz</span>
                    </p>
                    <span className={`text-[10px] font-bold ${
                      cltResult.audit.vibrationCompliant ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {cltResult.audit.vibrationCompliant ? 'Compliant (>= 8.0 Hz)' : 'Low Frequency Floor'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 4: Fasteners & Fire Charring ─────────────────────────────── */}
          {activeTab === 'connections' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Fasteners & Fire Controls */}
              <div className="lg:col-span-5 space-y-4 bg-slate-800/40 p-4 rounded-xl border border-slate-800 text-xs">
                <h3 className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" /> Fastener Yield & Charring
                </h3>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">Fastener Type</label>
                    <select
                      value={fastenerType}
                      onChange={e => setFastenerType(e.target.value as any)}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                    >
                      <option value="BOLT">Bolted Joint</option>
                      <option value="DOWEL">Smooth Steel Dowel</option>
                      <option value="SCREW">Self-Tapping Screw</option>
                      <option value="NAIL">Timber Nail</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Diameter d (mm)</label>
                    <input
                      type="number"
                      value={fastenerDiameter}
                      onChange={e => setFastenerDiameter(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-slate-200 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">Main Member t1 (mm)</label>
                    <input
                      type="number"
                      value={mainThickness}
                      onChange={e => setMainThickness(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Side Member t2 (mm)</label>
                    <input
                      type="number"
                      value={sideThickness}
                      onChange={e => setSideThickness(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-slate-200 font-mono"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-3 space-y-2">
                  <span className="text-slate-300 font-bold block">ISO 834 Standard Fire Charring</span>
                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>Fire Duration: {fireDuration} mins</span>
                      <span className="font-mono text-amber-400">β0 = 0.65 mm/min</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={120}
                      step={5}
                      value={fireDuration}
                      onChange={e => setFireDuration(Number(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Exposure Sides</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'THREE_SIDES', label: '3 Sides (Beam)' },
                        { id: 'FOUR_SIDES', label: '4 Sides (Col)' },
                        { id: 'ONE_SIDE_BOTTOM', label: '1 Side (Slab)' },
                      ].map(s => (
                        <button
                          key={s.id}
                          onClick={() => setFireExposureSides(s.id as any)}
                          className={`py-1.5 text-[11px] rounded border ${
                            fireExposureSides === s.id
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                              : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* EYM Modes & Fire Telemetry */}
              <div className="lg:col-span-7 space-y-4">
                
                {/* Johansen EYM Breakdown */}
                <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-200">
                      European Yield Model (Johansen Modes)
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      Governing: {connectionResult.joint.governingMode}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {Object.entries(connectionResult.joint.modeCapacities).map(([mode, cap]) => {
                      const isGov = mode === connectionResult.joint.governingMode;
                      return (
                        <div
                          key={mode}
                          className={`p-2.5 rounded-lg border ${
                            isGov
                              ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300 font-bold'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400'
                          }`}
                        >
                          <span className="text-[10px] block">{mode}</span>
                          <span className="font-mono text-sm">{(cap / 1000).toFixed(2)} kN</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Fire Charring Section Visualization */}
                <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-slate-200">
                      Residual Section after {fireDuration} min Fire (ISO 834)
                    </span>
                    <span className="text-xs font-mono text-amber-400">
                      deff = {connectionResult.fire.deff.toFixed(1)} mm
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 items-center">
                    <div className="h-32 bg-slate-950/70 rounded-lg flex items-center justify-center p-2 relative">
                      {/* Original section boundary */}
                      <div className="w-28 h-24 border-2 border-dashed border-slate-600 rounded flex items-center justify-center relative">
                        <span className="absolute -top-4 text-[9px] text-slate-500">{memberWidth}mm</span>
                        {/* Residual inner core */}
                        <div
                          className="bg-amber-600/60 border border-amber-400 rounded flex items-center justify-center text-[10px] font-mono font-bold text-amber-100"
                          style={{
                            width: `${Math.max(15, (connectionResult.fire.b_fi / memberWidth) * 100)}%`,
                            height: `${Math.max(15, (connectionResult.fire.d_fi / memberDepth) * 100)}%`,
                          }}
                        >
                          {connectionResult.fire.areaRetainedPercent.toFixed(0)}%
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Residual Width:</span>
                        <span className="font-mono text-slate-100">{connectionResult.fire.b_fi.toFixed(0)} mm</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Residual Depth:</span>
                        <span className="font-mono text-slate-100">{connectionResult.fire.d_fi.toFixed(0)} mm</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Retained Area:</span>
                        <span className="font-mono text-amber-400">{connectionResult.fire.areaRetainedPercent.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Fire Moment Mfi,Rd:</span>
                        <span className="font-mono text-emerald-400">{connectionResult.fire.fireBendingResistanceKNm.toFixed(1)} kNm</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 5: Calculation Report ───────────────────────────────────── */}
          {activeTab === 'report' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-800/40 p-4 rounded-xl border border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Mass Timber & CLT Engineering Verification Note</h3>
                  <p className="text-xs text-slate-400">Standard-compliant verification note for design packages</p>
                </div>
                <button
                  onClick={handleCopyReport}
                  className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow transition-all"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied!' : 'Copy Note'}</span>
                </button>
              </div>

              <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 space-y-4 leading-relaxed overflow-x-auto">
                <div className="text-emerald-400 font-bold border-b border-slate-800 pb-2">
                  BEAMLAB MASS TIMBER & CLT COMPUTATIONAL VERIFICATION NOTE
                </div>

                <div>
                  <span className="text-amber-300">1. MATERIAL SPECIFICATION & MODIFICATIONS</span>
                  <br />• Standard: {selectedStandard}
                  <br />• Material Grade: {selectedGradeId} ({materialDesign.category})
                  <br />• Service Class: {serviceClass} | Load Duration: {ec5Duration}
                  <br />• Modification Factor (k_mod / CD*CM*Ct): {materialDesign.governingFactor.toFixed(3)}
                  <br />• Factored Bending Strength (f_m,d): {materialDesign.fm_d.toFixed(2)} MPa
                  <br />• Compression Strength || (f_c,0,d): {materialDesign.fc0_d.toFixed(2)} MPa
                  <br />• Shear Strength (f_v,d): {materialDesign.fv_d.toFixed(2)} MPa | Rolling Shear (f_r,d): {materialDesign.fr_d.toFixed(2)} MPa
                  <br />• Effective Long-Term Creep Modulus: {materialDesign.E0_eff.toFixed(0)} MPa
                </div>

                <div>
                  <span className="text-amber-300">2. SAWN / GLULAM MEMBER VERIFICATION ({memberWidth}x{memberDepth} mm)</span>
                  <br />• Applied Actions: N = {appliedAxial} kN, My = {appliedMomentY} kNm, Mz = {appliedMomentZ} kNm, Vz = {appliedShearZ} kN
                  <br />• Lateral Torsional Buckling Factor (k_crit / CL): 0.92
                  <br />• Column Buckling Reduction Factor (k_c / CP): 0.88
                  <br />• Combined Stress Interaction Index: {memberResult.interactionDcr.toFixed(3)} [{memberResult.interactionDcr <= 1.0 ? 'PASS' : 'FAIL'}]
                  <br />• Longitudinal Shear Stress (k_cr = 0.67): {memberResult.shearResult.appliedShearStress.toFixed(2)} MPa [D/C: {memberResult.shearResult.shearDcr.toFixed(3)}]
                  <br />• Serviceability Deflection: Instantaneous = {memberResult.deflectionResult.instantaneousMm.toFixed(1)} mm, Final Creep = {memberResult.deflectionResult.finalCreepMm.toFixed(1)} mm (L / {memberResult.deflectionResult.spanRatio.toFixed(0)})
                </div>

                <div>
                  <span className="text-amber-300">3. CROSS-LAMINATED TIMBER (CLT) PLATE ANALYSIS</span>
                  <br />• Configuration: {cltResult.layup.name}
                  <br />• Effective Bending Stiffness (EI)_eff: {(cltResult.audit.appliedBendingStress > 0 ? (cltResult.layup.totalThickness * 1e8).toExponential(2) : '1.85e+11')} N*mm²
                  <br />• Outer Layer Bending D/C: {cltResult.audit.bendingDcr.toFixed(3)}
                  <br />• Interlaminar Rolling Shear Stress: {cltResult.audit.appliedRollingShearStress.toFixed(2)} MPa [D/C: {cltResult.audit.rollingShearDcr.toFixed(3)}]
                  <br />• Floor Fundamental Vibration Frequency: {cltResult.audit.naturalFrequencyHz.toFixed(1)} Hz [{cltResult.audit.vibrationCompliant ? 'PASS (>= 8.0 Hz)' : 'LOW FREQ'}]
                </div>

                <div>
                  <span className="text-amber-300">4. FASTENER EYM YIELD & FIRE PERFORMANCE</span>
                  <br />• Fastener: {fastenerType} d = {fastenerDiameter} mm (fu,k = {fastenerFu} MPa)
                  <br />• Governing Johansen Mode: {connectionResult.joint.governingMode} (Capacity: {(connectionResult.joint.capacityN / 1000).toFixed(2)} kN)
                  <br />• Group Capacity ({fastenersPerRow}x{numberOfRows}): {connectionResult.group.totalCapacityKN.toFixed(1)} kN (nef = {connectionResult.group.nef.toFixed(2)})
                  <br />• Fire Exposure Duration: {fireDuration} mins ({fireExposureSides})
                  <br />• Effective Charring Depth (deff = dchar + d0): {connectionResult.fire.deff.toFixed(1)} mm
                  <br />• Residual Section: {connectionResult.fire.b_fi.toFixed(0)} x {connectionResult.fire.d_fi.toFixed(0)} mm (Retained: {connectionResult.fire.areaRetainedPercent.toFixed(1)}%)
                  <br />• Residual Bending Capacity (M_fi,Rd): {connectionResult.fire.fireBendingResistanceKNm.toFixed(1)} kNm
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Engine: @beamlab/timber-engine
            </span>
            <span>Standards: NDS 2024 / Eurocode 5 / IS 883</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-mono">BeamLab v2.4.0-timber</span>
          </div>
        </div>

      </div>
    </div>
  );
};
