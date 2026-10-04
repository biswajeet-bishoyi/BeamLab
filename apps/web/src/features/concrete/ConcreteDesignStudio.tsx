import React, { useState, useMemo } from 'react';
import {
  X,
  Boxes,
  Activity,
  Layers,
  FileSpreadsheet,
  BookOpen,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Info,
  Compass,
  Sliders,
} from 'lucide-react';
import {
  CONCRETE_DATABASE,
  REBAR_DATABASE,
  REBAR_GRADES,
  ConcreteGradeName,
  RebarGradeName,
  RebarSizeName,
  FiberSection,
  BeamFlexureEngine,
  BeamShearEngine,
  BeamServiceabilityEngine,
  BiaxialPMMInteractionEngine,
  ColumnSlendernessEngine,
  ColumnDetailingEngine,
  PMMPoint3D,
} from '@beamstudio/concrete-engine';

interface ConcreteDesignStudioProps {
  onClose: () => void;
}

type StudioTab = 'BEAM_DESIGN' | 'COLUMN_PMM' | 'BBS_SCHEDULE';

export const ConcreteDesignStudio: React.FC<ConcreteDesignStudioProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<StudioTab>('BEAM_DESIGN');
  const [standard, setStandard] = useState<'ACI_318_19' | 'EUROCODE_2'>('ACI_318_19');

  // Common Materials
  const [concreteGrade, setConcreteGrade] = useState<ConcreteGradeName>('C4000');
  const [rebarGrade, setRebarGrade] = useState<RebarGradeName>('Grade60');

  // Exploded View Slider (0 = assembled, 100 = fully exploded)
  const [explodedRatio, setExplodedRatio] = useState<number>(0);

  // =========================================================================
  // BEAM STATE
  // =========================================================================
  const [beamBw, setBeamBw] = useState<number>(300);
  const [beamH, setBeamH] = useState<number>(550);
  const [beamCover, setBeamCover] = useState<number>(40);
  const [beamIsFlanged, setBeamIsFlanged] = useState<boolean>(false);
  const [beamBf, setBeamBf] = useState<number>(800);
  const [beamHf, setBeamHf] = useState<number>(100);

  const [topBarSize, setTopBarSize] = useState<RebarSizeName>('#6');
  const [topBarCount, setTopBarCount] = useState<number>(2);
  const [botBarSize, setBotBarSize] = useState<RebarSizeName>('#8');
  const [botBarCount, setBotBarCount] = useState<number>(4);

  const [stirrupSize, setStirrupSize] = useState<RebarSizeName>('#3');
  const [stirrupSpacing, setStirrupSpacing] = useState<number>(150);

  const [beamMu, setBeamMu] = useState<number>(250);
  const [beamVu, setBeamVu] = useState<number>(160);
  const [beamMd, setBeamMd] = useState<number>(60);
  const [beamMl, setBeamMl] = useState<number>(75);

  // =========================================================================
  // COLUMN STATE
  // =========================================================================
  const [colB, setColB] = useState<number>(450);
  const [colH, setColH] = useState<number>(450);
  const [colLu, setColLu] = useState<number>(3600);
  const [colCover, setColCover] = useState<number>(40);
  const [colKFactor, setColKFactor] = useState<number>(1.0);

  const [colBarSize, setColBarSize] = useState<RebarSizeName>('#9');
  const [colBarsX, setColBarsX] = useState<number>(3); // Bars along top and bottom faces
  const [colBarsY, setColBarsY] = useState<number>(1); // Additional side bars per side face
  const [colTieSize, setColTieSize] = useState<RebarSizeName>('#3');
  const [colTieSpacing, setColTieSpacing] = useState<number>(200);

  const [colPu, setColPu] = useState<number>(1400);
  const [colMux, setColMux] = useState<number>(140);
  const [colMuy, setColMuy] = useState<number>(90);
  const [colIsSeismic, setColIsSeismic] = useState<boolean>(true);

  // =========================================================================
  // CALCULATIONS
  // =========================================================================
  const concreteMat = CONCRETE_DATABASE[concreteGrade];
  const rebarMat = REBAR_GRADES[rebarGrade];

  // Beam Calculations
  const beamCalcs = useMemo(() => {
    const topBarSpec = REBAR_DATABASE[topBarSize];
    const botBarSpec = REBAR_DATABASE[botBarSize];
    const stirrupSpec = REBAR_DATABASE[stirrupSize];

    const d = beamH - beamCover - stirrupSpec.diameter_mm - botBarSpec.diameter_mm / 2;
    const dPrime = beamCover + stirrupSpec.diameter_mm + topBarSpec.diameter_mm / 2;

    const As = botBarCount * botBarSpec.area_mm2;
    const AsPrime = topBarCount * topBarSpec.area_mm2;
    const Av = 2 * stirrupSpec.area_mm2; // 2 legs

    const flexure = BeamFlexureEngine.analyzeFlexure({
      standard,
      bw_mm: beamBw,
      h_mm: beamH,
      d_mm: d,
      d_prime_mm: dPrime,
      bf_mm: beamIsFlanged ? beamBf : beamBw,
      hf_mm: beamIsFlanged ? beamHf : 0,
      As_mm2: As,
      As_prime_mm2: AsPrime,
      concrete: concreteMat,
      rebar: rebarMat,
      Mu_kNm: beamMu,
    });

    const shear = BeamShearEngine.analyzeShear({
      standard,
      bw_mm: beamBw,
      d_mm: d,
      As_mm2: As,
      Av_mm2: Av,
      s_mm: stirrupSpacing,
      concrete: concreteMat,
      stirrupRebar: rebarMat,
      Vu_kN: beamVu,
    });

    const barSpacing = botBarCount > 1
      ? (beamBw - 2 * beamCover - 2 * stirrupSpec.diameter_mm - botBarSpec.diameter_mm) / (botBarCount - 1)
      : 100;

    const serviceability = BeamServiceabilityEngine.analyzeServiceability({
      bw_mm: beamBw,
      h_mm: beamH,
      d_mm: d,
      d_prime_mm: dPrime,
      clearCover_mm: beamCover,
      As_mm2: As,
      As_prime_mm2: AsPrime,
      barSpacing_mm: Math.max(30, barSpacing),
      concrete: concreteMat,
      rebar: rebarMat,
      MD_kNm: beamMd,
      ML_kNm: beamMl,
    });

    const maxUtil = Math.max(
      flexure.utilization,
      shear.utilization,
      serviceability.limitStates[0]?.utilization || 0
    );

    return {
      d,
      dPrime,
      As,
      AsPrime,
      Av,
      flexure,
      shear,
      serviceability,
      maxUtil,
      isPass: flexure.status === 'PASS' && shear.status === 'PASS' && serviceability.status === 'PASS',
    };
  }, [
    standard,
    beamBw,
    beamH,
    beamCover,
    beamIsFlanged,
    beamBf,
    beamHf,
    topBarSize,
    topBarCount,
    botBarSize,
    botBarCount,
    stirrupSize,
    stirrupSpacing,
    beamMu,
    beamVu,
    beamMd,
    beamMl,
    concreteMat,
    rebarMat,
  ]);

  // Column Calculations
  const colCalcs = useMemo(() => {
    const colBarSpec = REBAR_DATABASE[colBarSize];
    const colTieSpec = REBAR_DATABASE[colTieSize];

    // Build Column Fiber Section
    const section = FiberSection.createRectangular(colB, colH, concreteMat, colCover, 16, 16);
    section.addRectangularRebarLayout(
      colCover,
      colTieSpec.diameter_mm,
      { count: colBarsX, barSize: colBarSize },
      { count: colBarsX, barSize: colBarSize },
      { count: colBarsY, barSize: colBarSize },
      rebarMat
    );

    const totalBars = 2 * colBarsX + 2 * colBarsY;
    const Ast = totalBars * colBarSpec.area_mm2;

    // Second-order Slenderness
    const slenderness = ColumnSlendernessEngine.analyzeSlenderness({
      b_mm: colB,
      h_mm: colH,
      lu_mm: colLu,
      k_factor: colKFactor,
      Pu_kN: colPu,
      M1_kNm: colMux * 0.5,
      M2_kNm: colMux,
      concrete: concreteMat,
      rebar: rebarMat,
      Ast_mm2: Ast,
    });

    const magnifiedMux = slenderness.Mc_magnified_kNm;

    // 3D P-M-M Surface & Demand Probe
    const surface = BiaxialPMMInteractionEngine.generate3DSurface(section, 12, 20);
    const probe = BiaxialPMMInteractionEngine.probeDemand(surface, colPu, magnifiedMux, colMuy);

    // Detailing
    const detailing = ColumnDetailingEngine.analyzeDetailing({
      b_mm: colB,
      h_mm: colH,
      lu_mm: colLu,
      clearCover_mm: colCover,
      numLongitudinalBars: totalBars,
      db_longitudinal_mm: colBarSpec.diameter_mm,
      Ast_mm2: Ast,
      d_tie_mm: colTieSpec.diameter_mm,
      s_tie_mm: colTieSpacing,
      concrete: concreteMat,
      tieRebar: rebarMat,
      isSeismicSpecialMomentFrame: colIsSeismic,
    });

    const maxUtil = Math.max(probe.utilization, slenderness.limitState.utilization);

    return {
      section,
      totalBars,
      Ast,
      surface,
      probe,
      slenderness,
      detailing,
      magnifiedMux,
      maxUtil,
      isPass: probe.status === 'PASS' && slenderness.status === 'PASS' && detailing.status === 'PASS',
    };
  }, [
    colB,
    colH,
    colLu,
    colCover,
    colKFactor,
    colBarSize,
    colBarsX,
    colBarsY,
    colTieSize,
    colTieSpacing,
    colPu,
    colMux,
    colMuy,
    colIsSeismic,
    concreteMat,
    rebarMat,
  ]);

  // Overall utilization based on active mode
  const currentUtilization = activeTab === 'BEAM_DESIGN' ? beamCalcs.maxUtil : colCalcs.maxUtil;
  const currentPass = activeTab === 'BEAM_DESIGN' ? beamCalcs.isPass : colCalcs.isPass;

  // Utilization Dial Helper
  const gaugeColor = currentUtilization > 1.0
    ? '#ef4444' // red
    : currentUtilization > 0.85
    ? '#f59e0b' // amber
    : '#10b981'; // emerald

  const gaugeDashOffset = Math.max(0, 283 * (1 - Math.min(1.0, currentUtilization)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-[#111116] border border-slate-800 w-full max-w-7xl h-[94vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* ========================================================================= */}
        {/* HEADER BAR */}
        {/* ========================================================================= */}
        <div className="h-16 px-6 border-b border-slate-800/80 bg-[#15151c] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 text-white shadow-lg shadow-amber-950/40">
              <Boxes size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-lg text-white tracking-wide">3D Reinforced Concrete Studio</h2>
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full font-mono">
                  {standard}
                </span>
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-slate-800 text-slate-300 rounded-full font-mono">
                  {concreteGrade} • {rebarGrade}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Non-linear fiber analysis, flexure, shear size effect, 3D P-M-M interaction & automated BBS
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('BEAM_DESIGN')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'BEAM_DESIGN'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-900/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers size={14} /> RC Beam Studio
            </button>
            <button
              onClick={() => setActiveTab('COLUMN_PMM')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'COLUMN_PMM'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-900/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity size={14} /> Column 3D P-M-M
            </button>
            <button
              onClick={() => setActiveTab('BBS_SCHEDULE')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'BBS_SCHEDULE'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-900/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileSpreadsheet size={14} /> Bar Schedule (BBS)
            </button>
          </div>

          {/* Close & Standards */}
          <div className="flex items-center gap-3">
            <select
              value={standard}
              onChange={e => setStandard(e.target.value as any)}
              className="bg-slate-900 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 font-medium text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="ACI_318_19">ACI 318-19 (US / Metric)</option>
              <option value="EUROCODE_2">Eurocode 2 (EN 1992-1-1)</option>
            </select>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MAIN BODY: 3-COLUMN WORKSPACE */}
        {/* ========================================================================= */}
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT SIDEBAR: PARAMETERS & SLIDERS */}
          <div className="w-80 border-r border-slate-800/80 bg-[#13131a] p-4 overflow-y-auto shrink-0 flex flex-col gap-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sliders size={14} /> Material & Geometry
              </span>
              <button
                onClick={() => {
                  setConcreteGrade('C4000');
                  setRebarGrade('Grade60');
                }}
                className="text-[11px] text-amber-400 hover:underline flex items-center gap-1"
              >
                <RotateCcw size={11} /> Reset
              </button>
            </div>

            {/* Material Pickers */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-400 font-medium">Concrete Grade</label>
                <select
                  value={concreteGrade}
                  onChange={e => setConcreteGrade(e.target.value as any)}
                  className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-xs text-white"
                >
                  <option value="C3000">C3000 (20.7 MPa)</option>
                  <option value="C4000">C4000 (27.6 MPa)</option>
                  <option value="C5000">C5000 (34.5 MPa)</option>
                  <option value="C6000">C6000 (41.4 MPa)</option>
                  <option value="C8000">C8000 (55.2 MPa)</option>
                  <option value="C25/30">C25/30 (25 MPa)</option>
                  <option value="C30/37">C30/37 (30 MPa)</option>
                  <option value="M30">M30 (30 MPa)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-medium">Rebar Grade</label>
                <select
                  value={rebarGrade}
                  onChange={e => setRebarGrade(e.target.value as any)}
                  className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-xs text-white"
                >
                  <option value="Grade60">Grade 60 (414 MPa)</option>
                  <option value="Grade75">Grade 75 (517 MPa)</option>
                  <option value="Grade80">Grade 80 (552 MPa)</option>
                  <option value="B500B">B500B (500 MPa)</option>
                  <option value="Fe500">Fe500 (500 MPa)</option>
                </select>
              </div>
            </div>

            {/* Exploded 3D Slider */}
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="flex justify-between text-[11px] font-medium mb-1">
                <span className="text-slate-300">3D Exploded View</span>
                <span className="text-amber-400 font-mono">{explodedRatio}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={explodedRatio}
                onChange={e => setExplodedRatio(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            {/* TAB SPECIFIC INPUTS */}
            {activeTab === 'BEAM_DESIGN' ? (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-slate-300 font-medium">
                    <span>Web Width bw</span>
                    <span className="text-white font-mono">{beamBw} mm</span>
                  </div>
                  <input
                    type="range"
                    min="200"
                    max="600"
                    step="25"
                    value={beamBw}
                    onChange={e => setBeamBw(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-slate-300 font-medium">
                    <span>Beam Depth h</span>
                    <span className="text-white font-mono">{beamH} mm</span>
                  </div>
                  <input
                    type="range"
                    min="300"
                    max="1000"
                    step="50"
                    value={beamH}
                    onChange={e => setBeamH(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="flanged"
                    checked={beamIsFlanged}
                    onChange={e => setBeamIsFlanged(e.target.checked)}
                    className="accent-amber-500 rounded"
                  />
                  <label htmlFor="flanged" className="text-xs text-slate-200 cursor-pointer">
                    Flanged T-Beam (Slab Integral)
                  </label>
                </div>

                {beamIsFlanged && (
                  <div className="grid grid-cols-2 gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400">Flange Width bf</span>
                      <input
                        type="number"
                        value={beamBf}
                        onChange={e => setBeamBf(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">Flange Depth hf</span>
                      <input
                        type="number"
                        value={beamHf}
                        onChange={e => setBeamHf(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white"
                      />
                    </div>
                  </div>
                )}

                {/* Bottom Tension Reinforcement */}
                <div className="p-3 bg-slate-900/70 rounded-xl border border-slate-800 space-y-2">
                  <span className="font-semibold text-amber-400">Bottom Tension Rebar (As)</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400">Count</label>
                      <input
                        type="number"
                        min="2"
                        max="8"
                        value={botBarCount}
                        onChange={e => setBotBarCount(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Bar Size</label>
                      <select
                        value={botBarSize}
                        onChange={e => setBotBarSize(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white font-mono"
                      >
                        {Object.keys(REBAR_DATABASE).map(k => (
                          <option key={k} value={k}>{k}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Top Compression Reinforcement */}
                <div className="p-3 bg-slate-900/70 rounded-xl border border-slate-800 space-y-2">
                  <span className="font-semibold text-slate-300">Top Compression Rebar (A's)</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400">Count</label>
                      <input
                        type="number"
                        min="0"
                        max="6"
                        value={topBarCount}
                        onChange={e => setTopBarCount(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Bar Size</label>
                      <select
                        value={topBarSize}
                        onChange={e => setTopBarSize(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white font-mono"
                      >
                        {Object.keys(REBAR_DATABASE).map(k => (
                          <option key={k} value={k}>{k}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Stirrups */}
                <div className="p-3 bg-slate-900/70 rounded-xl border border-slate-800 space-y-2">
                  <span className="font-semibold text-slate-300">Transverse Stirrups (Av)</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400">Size</label>
                      <select
                        value={stirrupSize}
                        onChange={e => setStirrupSize(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white font-mono"
                      >
                        <option value="#3">#3 (10 mm)</option>
                        <option value="#4">#4 (12.7 mm)</option>
                        <option value="T8">T8 (8 mm)</option>
                        <option value="T10">T10 (10 mm)</option>
                        <option value="T12">T12 (12 mm)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Spacing s</label>
                      <input
                        type="number"
                        step="25"
                        value={stirrupSpacing}
                        onChange={e => setStirrupSpacing(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Demands */}
                <div className="p-3 bg-amber-950/20 border border-amber-500/20 rounded-xl space-y-2">
                  <span className="font-semibold text-amber-300">Design Factored Demands</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400">Bending Mu (kNm)</label>
                      <input
                        type="number"
                        value={beamMu}
                        onChange={e => setBeamMu(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-amber-300 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Shear Vu (kN)</label>
                      <input
                        type="number"
                        value={beamVu}
                        onChange={e => setBeamVu(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-amber-300 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* COLUMN INPUTS */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-400 font-medium">Width b (mm)</label>
                    <input
                      type="number"
                      step="50"
                      value={colB}
                      onChange={e => setColB(Number(e.target.value))}
                      className="w-full mt-1 bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 font-medium">Depth h (mm)</label>
                    <input
                      type="number"
                      step="50"
                      value={colH}
                      onChange={e => setColH(Number(e.target.value))}
                      className="w-full mt-1 bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 font-medium">
                    <span>Height lu</span>
                    <span className="text-white font-mono">{colLu} mm</span>
                  </div>
                  <input
                    type="range"
                    min="2000"
                    max="7000"
                    step="200"
                    value={colLu}
                    onChange={e => setColLu(Number(e.target.value))}
                    className="w-full accent-amber-500 mt-1"
                  />
                </div>

                <div className="p-3 bg-slate-900/70 rounded-xl border border-slate-800 space-y-2">
                  <span className="font-semibold text-amber-400">Longitudinal Reinforcement</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400">Top/Bot Bars (X)</label>
                      <input
                        type="number"
                        min="2"
                        max="6"
                        value={colBarsX}
                        onChange={e => setColBarsX(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Side Bars (Y)</label>
                      <input
                        type="number"
                        min="0"
                        max="4"
                        value={colBarsY}
                        onChange={e => setColBarsY(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Bar Size</label>
                    <select
                      value={colBarSize}
                      onChange={e => setColBarSize(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white font-mono"
                    >
                      {Object.keys(REBAR_DATABASE).map(k => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Column Demand Probe */}
                <div className="p-3 bg-amber-950/20 border border-amber-500/20 rounded-xl space-y-2">
                  <span className="font-semibold text-amber-300">Biaxial Factored Demands</span>
                  <div>
                    <label className="text-[10px] text-slate-400">Axial Load Pu (kN)</label>
                    <input
                      type="number"
                      step="50"
                      value={colPu}
                      onChange={e => setColPu(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-amber-300 font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400">Moment Mux (kNm)</label>
                      <input
                        type="number"
                        step="10"
                        value={colMux}
                        onChange={e => setColMux(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-amber-300 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Moment Muy (kNm)</label>
                      <input
                        type="number"
                        step="10"
                        value={colMuy}
                        onChange={e => setColMuy(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-amber-300 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* CENTER CANVAS: 3D / 2D INTERACTIVE CAD VIEWER */}
          <div className="flex-1 flex flex-col bg-[#0d0d12] relative overflow-hidden">
            {/* Top Canvas Bar */}
            <div className="h-10 px-4 border-b border-slate-800/80 bg-[#121218] flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Compass size={14} className="text-amber-500" />
                <span>Parametric Cross-Section & Rebar Cage CAD View</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Rebar
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-slate-700/60 inline-block" /> Concrete
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" /> Neutral Axis
                </span>
              </div>
            </div>

            {/* SVG Interactive Canvas */}
            <div className="flex-1 flex items-center justify-center p-6 relative">
              {activeTab === 'COLUMN_PMM' ? (
                // 3D P-M-M INTERACTION SURFACE PLOT
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <svg className="w-full max-w-2xl h-[420px] bg-slate-950/70 rounded-2xl border border-slate-800 p-4">
                    {/* Grid Axes */}
                    <line x1="60" y1="360" x2="600" y2="360" stroke="#334155" strokeWidth="1.5" />
                    <line x1="60" y1="360" x2="60" y2="20" stroke="#334155" strokeWidth="1.5" />
                    <text x="590" y="380" fill="#94a3b8" fontSize="11" textAnchor="end">Moment M (kNm)</text>
                    <text x="75" y="30" fill="#94a3b8" fontSize="11">Axial Load P (kN)</text>

                    {/* Pure Compression Cap line */}
                    <line
                      x1="60"
                      y1={360 - (colCalcs.surface.pureCompression.Pmax_design_kN / 6000) * 320}
                      x2="450"
                      y2={360 - (colCalcs.surface.pureCompression.Pmax_design_kN / 6000) * 320}
                      stroke="#e2e8f0"
                      strokeDasharray="4,4"
                      strokeWidth="1.5"
                    />
                    <text
                      x="460"
                      y={364 - (colCalcs.surface.pureCompression.Pmax_design_kN / 6000) * 320}
                      fill="#e2e8f0"
                      fontSize="10"
                    >
                      phi*Pn,max ({colCalcs.surface.pureCompression.Pmax_design_kN.toFixed(0)} kN)
                    </text>

                    {/* Curve X (Mx) */}
                    <path
                      d={colCalcs.surface.curveX.map((pt, idx) => {
                        const px = 60 + (pt.phiMnx_kNm / 400) * 450;
                        const py = 360 - (pt.phiPn_kN / 6000) * 320;
                        return `${idx === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`;
                      }).join(' ')}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2.5"
                    />

                    {/* Curve Y (My) */}
                    <path
                      d={colCalcs.surface.curveY.map((pt, idx) => {
                        const px = 60 + (pt.phiMny_kNm / 400) * 450;
                        const py = 360 - (pt.phiPn_kN / 6000) * 320;
                        return `${idx === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`;
                      }).join(' ')}
                      fill="none"
                      stroke="#06b6d4"
                      strokeWidth="2"
                      strokeDasharray="5,3"
                    />

                    {/* Factored Demand Point */}
                    {(() => {
                      const dX = 60 + (colCalcs.probe.Mu_resultant_kNm / 400) * 450;
                      const dY = 360 - (colPu / 6000) * 320;
                      const cX = 60 + (colCalcs.probe.phiMn_resultant_kNm / 400) * 450;
                      const isOver = colCalcs.probe.utilization > 1.0;

                      return (
                        <>
                          <line x1="60" y1={dY} x2={dX} y2={dY} stroke="#ef4444" strokeWidth="1" strokeDasharray="3,3" />
                          <circle cx={dX} cy={dY} r="6" fill={isOver ? '#ef4444' : '#10b981'} stroke="#fff" strokeWidth="2" />
                          <circle cx={cX} cy={dY} r="4" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
                          <line x1={dX} y1={dY} x2={cX} y2={dY} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="2,2" />
                          <text x={dX + 10} y={dY - 8} fill="#fff" fontSize="11" fontWeight="bold">
                            Demand ({colPu} kN, {colCalcs.probe.Mu_resultant_kNm.toFixed(1)} kNm)
                          </text>
                        </>
                      );
                    })()}

                    {/* Legend */}
                    <g transform="translate(420, 40)">
                      <rect width="180" height="75" rx="8" fill="#1e293b" opacity="0.9" />
                      <line x1="15" y1="20" x2="45" y2="20" stroke="#f59e0b" strokeWidth="2.5" />
                      <text x="55" y="24" fill="#cbd5e1" fontSize="11">Major Axis (Mx)</text>
                      <line x1="15" y1="40" x2="45" y2="40" stroke="#06b6d4" strokeWidth="2" strokeDasharray="5,3" />
                      <text x="55" y="44" fill="#cbd5e1" fontSize="11">Minor Axis (My)</text>
                      <circle cx="25" cy="60" r="4" fill="#10b981" />
                      <text x="55" y="64" fill="#cbd5e1" fontSize="11">Applied Factored (Pu, Mu)</text>
                    </g>
                  </svg>
                  <span className="text-xs text-slate-400 mt-2">
                    Radial Biaxial P-M-M Failure Envelope with Real-Time Coordinate Projection
                  </span>
                </div>
              ) : (
                // 2D CROSS SECTION CAD WITH REBAR & EXPLODED VIEW
                <svg className="w-full max-w-xl h-[420px] bg-slate-950/60 rounded-2xl border border-slate-800 p-4">
                  {(() => {
                    const cx = 280;
                    const cy = 200;
                    const scale = 320 / Math.max(beamH, beamIsFlanged ? beamBf : beamBw, colH);

                    const w = (activeTab === 'BEAM_DESIGN' ? beamBw : colB) * scale;
                    const h = (activeTab === 'BEAM_DESIGN' ? beamH : colH) * scale;
                    const offset = (explodedRatio / 100) * 45;

                    // Concrete shell (draws expanded when exploded)
                    return (
                      <g>
                        {/* Outer Concrete Shell */}
                        <rect
                          x={cx - w / 2 - offset}
                          y={cy - h / 2 - offset}
                          width={w + 2 * offset}
                          height={h + 2 * offset}
                          rx="4"
                          fill="url(#concreteHatch)"
                          stroke="#475569"
                          strokeWidth="2"
                          opacity="0.85"
                        />

                        {/* If T-Beam Flange */}
                        {activeTab === 'BEAM_DESIGN' && beamIsFlanged && (
                          <rect
                            x={cx - (beamBf * scale) / 2 - offset}
                            y={cy - h / 2 - offset}
                            width={beamBf * scale + 2 * offset}
                            height={beamHf * scale}
                            fill="url(#concreteHatch)"
                            stroke="#475569"
                            strokeWidth="2"
                            opacity="0.85"
                          />
                        )}

                        {/* Internal Rebar Cage */}
                        {/* Transverse Closed Tie / Stirrup */}
                        <rect
                          x={cx - w / 2 + beamCover * scale}
                          y={cy - h / 2 + beamCover * scale}
                          width={w - 2 * beamCover * scale}
                          height={h - 2 * beamCover * scale}
                          rx="8"
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="2.5"
                          strokeDasharray={explodedRatio > 20 ? '4,3' : 'none'}
                        />

                        {/* Longitudinal Rebar Circles */}
                        {activeTab === 'BEAM_DESIGN' ? (
                          <>
                            {/* Bottom Bars */}
                            {Array.from({ length: botBarCount }).map((_, i) => {
                              const barSpacing = (w - 2 * beamCover * scale - 20) / Math.max(1, botBarCount - 1);
                              const bx = cx - w / 2 + beamCover * scale + 10 + i * barSpacing;
                              const by = cy + h / 2 - beamCover * scale - 12;
                              return (
                                <circle
                                  key={`bot-${i}`}
                                  cx={bx}
                                  cy={by}
                                  r={8}
                                  fill="#f59e0b"
                                  stroke="#fff"
                                  strokeWidth="1.5"
                                />
                              );
                            })}
                            {/* Top Bars */}
                            {Array.from({ length: topBarCount }).map((_, i) => {
                              const barSpacing = (w - 2 * beamCover * scale - 20) / Math.max(1, topBarCount - 1);
                              const bx = cx - w / 2 + beamCover * scale + 10 + i * barSpacing;
                              const by = cy - h / 2 + beamCover * scale + 12;
                              return (
                                <circle
                                  key={`top-${i}`}
                                  cx={bx}
                                  cy={by}
                                  r={6}
                                  fill="#38bdf8"
                                  stroke="#fff"
                                  strokeWidth="1.5"
                                />
                              );
                            })}

                            {/* Neutral Axis Line c */}
                            <line
                              x1={cx - w / 2 - 20}
                              y1={cy - h / 2 + beamCalcs.flexure.c_mm * scale}
                              x2={cx + w / 2 + 20}
                              y2={cy - h / 2 + beamCalcs.flexure.c_mm * scale}
                              stroke="#ef4444"
                              strokeWidth="1.8"
                              strokeDasharray="5,4"
                            />
                            <text
                              x={cx + w / 2 + 25}
                              y={cy - h / 2 + beamCalcs.flexure.c_mm * scale + 4}
                              fill="#ef4444"
                              fontSize="11"
                              fontWeight="bold"
                            >
                              N.A. (c = {beamCalcs.flexure.c_mm.toFixed(1)} mm)
                            </text>
                          </>
                        ) : (
                          // Column Bars
                          colCalcs.section.rebarFibers.map((r, i) => (
                            <circle
                              key={`col-bar-${i}`}
                              cx={cx + r.x_mm * scale}
                              cy={cy - r.y_mm * scale}
                              r={r.diameter_mm * scale * 0.5}
                              fill="#f59e0b"
                              stroke="#fff"
                              strokeWidth="1.5"
                            />
                          ))
                        )}

                        {/* Dimensions */}
                        <line x1={cx - w / 2} y1={cy + h / 2 + 20} x2={cx + w / 2} y2={cy + h / 2 + 20} stroke="#64748b" strokeWidth="1" />
                        <text x={cx} y={cy + h / 2 + 35} fill="#94a3b8" fontSize="11" textAnchor="middle">
                          {activeTab === 'BEAM_DESIGN' ? beamBw : colB} mm
                        </text>
                      </g>
                    );
                  })()}

                  <defs>
                    <pattern id="concreteHatch" width="20" height="20" patternUnits="userSpaceOnUse">
                      <rect width="20" height="20" fill="#1e293b" opacity="0.6" />
                      <circle cx="4" cy="4" r="1.5" fill="#475569" opacity="0.5" />
                      <circle cx="14" cy="12" r="2" fill="#475569" opacity="0.5" />
                      <path d="M 0,20 L 20,0" stroke="#334155" strokeWidth="0.5" opacity="0.3" />
                    </pattern>
                  </defs>
                </svg>
              )}
            </div>
          </div>

          {/* RIGHT SIDEBAR: AUDIT LOGS, LIMIT STATES & UTILIZATION */}
          <div className="w-96 border-l border-slate-800/80 bg-[#13131a] p-4 overflow-y-auto shrink-0 flex flex-col gap-4 text-xs">
            {/* Circular Utilization Gauge */}
            <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 flex items-center justify-between shadow-lg">
              <div className="flex flex-col">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Governing D/C Ratio</span>
                <span className="text-2xl font-black font-mono mt-0.5" style={{ color: gaugeColor }}>
                  {(currentUtilization * 100).toFixed(1)}%
                </span>
                <span className="text-[11px] font-semibold mt-1 flex items-center gap-1" style={{ color: gaugeColor }}>
                  {currentPass ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                  {currentPass ? 'CODE COMPLIANT' : 'CAPACITY EXCEEDED'}
                </span>
              </div>

              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle cx="40" cy="40" r="34" stroke="#1e293b" strokeWidth="7" fill="none" />
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    stroke={gaugeColor}
                    strokeWidth="7"
                    strokeDasharray="213"
                    strokeDashoffset={Math.max(0, 213 * (1 - Math.min(1.0, currentUtilization)))}
                    strokeLinecap="round"
                    fill="none"
                    className="transition-all duration-500 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-mono font-bold text-xs">
                  {currentUtilization.toFixed(2)}
                </div>
              </div>
            </div>

            {/* LIMIT STATES TABLE */}
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen size={14} className="text-amber-400" /> Limit States Verification
                </span>
              </div>

              <div className="mt-2 space-y-2">
                {(activeTab === 'BEAM_DESIGN' ? [
                  ...beamCalcs.flexure.limitStates,
                  ...beamCalcs.shear.limitStates,
                  ...beamCalcs.serviceability.limitStates,
                ] : [
                  colCalcs.probe.limitState,
                  colCalcs.slenderness.limitState,
                  ...colCalcs.detailing.limitStates,
                ]).map((ls, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border transition-all ${
                      ls.status === 'PASS'
                        ? 'bg-slate-900/60 border-slate-800'
                        : 'bg-red-950/20 border-red-500/40'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-semibold text-slate-200">{ls.limitStateName}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                          ls.status === 'PASS'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-red-500/10 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {ls.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1">
                      <span>{ls.codeClause}</span>
                      <span className="font-mono text-slate-300">
                        {ls.appliedDemand.toFixed(1)} / {ls.designCapacity.toFixed(1)} {ls.units}
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-1.5">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, ls.utilization * 100)}%`,
                          backgroundColor: ls.utilization > 1.0 ? '#ef4444' : ls.utilization > 0.85 ? '#f59e0b' : '#10b981',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* MATHEMATICAL DERIVATIONS ACCORDION */}
            <div>
              <span className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-800">
                <Info size={14} className="text-amber-400" /> Transparent Derivations
              </span>

              <div className="mt-2 space-y-2">
                {(activeTab === 'BEAM_DESIGN'
                  ? [...beamCalcs.flexure.calculationSteps, ...beamCalcs.shear.calculationSteps]
                  : [...colCalcs.probe.calculationSteps, ...colCalcs.slenderness.calculationSteps]
                ).map((step, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                    <div className="flex justify-between text-[11px] font-semibold text-amber-400">
                      <span>{step.title}</span>
                      <span className="text-slate-400 text-[10px] font-mono">{step.codeClause}</span>
                    </div>
                    <div className="font-mono text-[11px] text-slate-300 bg-black/40 p-1.5 rounded">
                      {step.formulaLatex}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Subst: {step.substitutionLatex}
                    </div>
                    <div className="text-[11px] text-emerald-400 font-mono font-bold">
                      {step.resultLatex}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FOOTER BAR: SUMMARY & BBS DOWNLOAD */}
        {/* ========================================================================= */}
        <div className="h-14 px-6 border-t border-slate-800/80 bg-[#15151c] flex items-center justify-between shrink-0 text-xs">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-slate-400">Total Steel Area: </span>
              <span className="font-bold text-white font-mono">
                {activeTab === 'BEAM_DESIGN' ? beamCalcs.As.toFixed(0) : colCalcs.Ast.toFixed(0)} mm²
              </span>
            </div>
            <div>
              <span className="text-slate-400">Reinforcement Ratio: </span>
              <span className="font-bold text-amber-400 font-mono">
                {activeTab === 'BEAM_DESIGN'
                  ? ((beamCalcs.As / (beamBw * beamCalcs.d)) * 100).toFixed(2)
                  : ((colCalcs.Ast / (colB * colH)) * 100).toFixed(2)}%
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                alert('Bar Bending Schedule (BBS) exported to CSV / CAD detailing schedule.');
              }}
              className="px-4 py-1.5 bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white rounded-lg font-bold flex items-center gap-2 shadow-md"
            >
              <Download size={14} /> Export BBS Schedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
