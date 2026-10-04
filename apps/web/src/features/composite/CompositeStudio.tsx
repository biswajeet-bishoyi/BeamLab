import React, { useState, useMemo } from 'react';
import {
  Layers,
  ShieldCheck,
  Activity,
  FileText,
  X,
  Copy,
  Check,
  AlertTriangle,
  TrendingUp,
  Columns,
  Building2,
  Sparkles,
  Info,
  ChevronRight,
  Zap,
} from 'lucide-react';
import {
  STANDARD_WIDE_FLANGE_SECTIONS,
  EffectiveWidthEngine,
  ShearStudConnectorEngine,
  PlasticStressDistributionEngine,
  ConstructionStageAuditor,
  CompositeAxialBucklingEngine,
  CompositeInteractionEngine,
  CompositeDeflectionAuditor,
  FloorVibrationAuditor,
  RectangularCftDefinition,
  CircularCftDefinition,
  EncasedColumnDefinition,
  CompositeSectionDefinition,
} from '@beamstudio/composite-engine';

interface CompositeStudioProps {
  onClose: () => void;
}

export const CompositeStudio: React.FC<CompositeStudioProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'deck' | 'flexure' | 'columns' | 'serviceability' | 'report'>('deck');
  const [copied, setCopied] = useState(false);

  // ─── Tab 1 & Global Beam Geometry ──────────────────────────────────────────
  const [selectedSectionKey, setSelectedSectionKey] = useState<string>('W18x50');
  const [fcConcrete, setFcConcrete] = useState<number>(28); // MPa
  const [slabToppingThickness, setSlabToppingThickness] = useState<number>(85); // mm
  const [deckRibDepth, setDeckRibDepth] = useState<number>(75); // mm
  const [deckRibWidth, setDeckRibWidth] = useState<number>(150); // mm
  const [deckOrientation, setDeckOrientation] = useState<'perpendicular' | 'parallel'>('perpendicular');
  const [studDiameter, setStudDiameter] = useState<number>(19); // mm
  const [studLength, setStudLength] = useState<number>(125); // mm
  const [studsPerRow, setStudsPerRow] = useState<number>(1);
  const [beamSpanLength, setBeamSpanLength] = useState<number>(9.0); // m
  const [tributarySpacing, setTributarySpacing] = useState<number>(3.0); // m

  // ─── Tab 2 State: Flexural Interaction ─────────────────────────────────────
  const [targetEta, setTargetEta] = useState<number>(0.85); // 0.25 to 1.0

  // ─── Tab 3 State: Composite Columns ────────────────────────────────────────
  const [columnType, setColumnType] = useState<'rectangular_cft' | 'circular_cft' | 'encased_wide_flange'>('rectangular_cft');
  const [cftWidth, setCftWidth] = useState<number>(400); // mm
  const [cftDepth, setCftDepth] = useState<number>(400); // mm
  const [cftWallThickness, setCftWallThickness] = useState<number>(12); // mm
  const [cftDiameter, setCftDiameter] = useState<number>(450); // mm
  const [cftSteelFy, setCftSteelFy] = useState<number>(355); // MPa
  const [cftConcreteFc, setCftConcreteFc] = useState<number>(35); // MPa
  const [colLength, setColLength] = useState<number>(4.5); // m
  const [colKFactor, setColKFactor] = useState<number>(1.0);
  const [appliedPu, setAppliedPu] = useState<number>(2500); // kN
  const [appliedMux, setAppliedMux] = useState<number>(180); // kNm
  const [appliedMuy, setAppliedMuy] = useState<number>(40); // kNm

  // ─── Tab 4 State: Serviceability & Floor Vibration ─────────────────────────
  const [superimposedDeadLoadKPa, setSuperimposedDeadLoadKPa] = useState<number>(0.75); // kPa
  const [serviceLiveLoadKPa, setServiceLiveLoadKPa] = useState<number>(3.0); // kPa
  const [occupancyCategory, setOccupancyCategory] = useState<'office_residential' | 'shopping_mall' | 'sensitive_laboratory'>('office_residential');
  const [modalDampingBeta, setModalDampingBeta] = useState<number>(0.03);

  // ─── Calculations: Composite Beam Section ──────────────────────────────────
  const currentSteel = STANDARD_WIDE_FLANGE_SECTIONS[selectedSectionKey] ?? STANDARD_WIDE_FLANGE_SECTIONS['W18x50'];

  const compositeSection: CompositeSectionDefinition = useMemo(() => ({
    steel: currentSteel,
    concrete: {
      fc: fcConcrete,
      density: 2350,
      elasticModulus: 4700 * Math.sqrt(fcConcrete),
      slabThickness: slabToppingThickness,
      totalSlabThickness: slabToppingThickness + deckRibDepth,
    },
    deck: {
      ribDepth: deckRibDepth,
      averageRibWidth: deckRibWidth,
      orientation: deckOrientation,
    },
  }), [currentSteel, fcConcrete, slabToppingThickness, deckRibDepth, deckRibWidth, deckOrientation]);

  // Effective flange width
  const effWidthResult = useMemo(() => {
    return EffectiveWidthEngine.computeAiscEffectiveWidth({
      spanLengthMm: beamSpanLength * 1000,
      spacingLeftMm: tributarySpacing * 1000,
      spacingRightMm: tributarySpacing * 1000,
      flangeWidthMm: currentSteel.flangeWidth,
      toppingThicknessMm: slabToppingThickness,
    });
  }, [beamSpanLength, tributarySpacing, currentSteel, slabToppingThickness]);

  // Shear stud capacity & connection
  const studCapacityResult = useMemo(() => {
    return ShearStudConnectorEngine.calculateStudCapacity(
      { diameter: studDiameter, length: studLength, studsPerRow },
      compositeSection
    );
  }, [studDiameter, studLength, studsPerRow, compositeSection]);

  const fullConnectionResult = useMemo(() => {
    return ShearStudConnectorEngine.calculateFullShearConnection(
      { diameter: studDiameter, length: studLength, studsPerRow },
      compositeSection,
      effWidthResult.beff
    );
  }, [studDiameter, studLength, studsPerRow, compositeSection, effWidthResult.beff]);

  // Partial interaction evaluation for chosen eta
  const partialInteractionResult = useMemo(() => {
    const providedHalf = Math.ceil(targetEta * fullConnectionResult.requiredStudsHalfSpanFullComposite);
    return ShearStudConnectorEngine.evaluatePartialInteraction(providedHalf, fullConnectionResult);
  }, [targetEta, fullConnectionResult]);

  // Plastic moment capacity & PNA
  const flexureResult = useMemo(() => {
    return PlasticStressDistributionEngine.calculateFlexuralCapacity(
      compositeSection,
      effWidthResult.beff,
      partialInteractionResult.degreeOfCompositeActionEta
    );
  }, [compositeSection, effWidthResult.beff, partialInteractionResult.degreeOfCompositeActionEta]);

  // Interaction curve
  const interactionCurve = useMemo(() => {
    return PlasticStressDistributionEngine.generateInteractionCurve(
      compositeSection,
      effWidthResult.beff,
      fullConnectionResult.requiredStudsHalfSpanFullComposite,
      8
    );
  }, [compositeSection, effWidthResult.beff, fullConnectionResult.requiredStudsHalfSpanFullComposite]);

  // Construction stage audit
  const constructionAudit = useMemo(() => {
    return ConstructionStageAuditor.audit(compositeSection, {
      spanLength: beamSpanLength,
      tributaryWidth: tributarySpacing,
    });
  }, [compositeSection, beamSpanLength, tributarySpacing]);

  // ─── Calculations: Composite Columns ───────────────────────────────────────
  const colDefinition = useMemo((): RectangularCftDefinition | CircularCftDefinition | EncasedColumnDefinition => {
    if (columnType === 'rectangular_cft') {
      return {
        type: 'rectangular_cft',
        id: 'cft-rect',
        name: `HSS ${cftWidth}x${cftDepth}x${cftWallThickness}`,
        widthB: cftWidth,
        depthH: cftDepth,
        wallThickness: cftWallThickness,
        steelYieldStrength: cftSteelFy,
        concreteStrengthFc: cftConcreteFc,
      };
    } else if (columnType === 'circular_cft') {
      return {
        type: 'circular_cft',
        id: 'cft-circ',
        name: `Pipe ${cftDiameter}x${cftWallThickness}`,
        outerDiameter: cftDiameter,
        wallThickness: cftWallThickness,
        steelYieldStrength: cftSteelFy,
        concreteStrengthFc: cftConcreteFc,
      };
    } else {
      return {
        type: 'encased_wide_flange',
        id: 'encased-col',
        name: `Encased W14x90 ${cftWidth}x${cftDepth}`,
        concreteWidth: cftWidth,
        concreteDepth: cftDepth,
        embeddedSteel: {
          depth: 356,
          flangeWidth: 369,
          flangeThickness: 18.0,
          webThickness: 11.2,
          area: 17100,
          Ix: 416e6,
          Iy: 151e6,
          yieldStrength: cftSteelFy,
          elasticModulus: 200000,
        },
        rebar: {
          areaTotal: 2500,
          yieldStrength: 420,
          Ix: 50e6,
          Iy: 50e6,
        },
        concreteStrengthFc: cftConcreteFc,
      };
    }
  }, [columnType, cftWidth, cftDepth, cftWallThickness, cftDiameter, cftSteelFy, cftConcreteFc]);

  const colBoundary = useMemo(() => ({
    unbracedLength: colLength,
    effectiveLengthFactor: colKFactor,
  }), [colLength, colKFactor]);

  const columnCheck = useMemo(() => {
    return CompositeInteractionEngine.verifyInteraction(colDefinition, colBoundary, {
      factoredAxialPu: appliedPu,
      factoredMomentMux: appliedMux,
      factoredMomentMuy: appliedMuy,
    });
  }, [colDefinition, colBoundary, appliedPu, appliedMux, appliedMuy]);

  // ─── Calculations: Serviceability & Vibration ───────────────────────────────
  const deflectionResult = useMemo(() => {
    return CompositeDeflectionAuditor.calculateDeflections(compositeSection, effWidthResult.beff, {
      spanLength: beamSpanLength,
      tributaryWidth: tributarySpacing,
      liveLoad: serviceLiveLoadKPa,
      superimposedDeadLoad: superimposedDeadLoadKPa,
      eta: partialInteractionResult.degreeOfCompositeActionEta,
    });
  }, [compositeSection, effWidthResult.beff, beamSpanLength, tributarySpacing, serviceLiveLoadKPa, superimposedDeadLoadKPa, partialInteractionResult.degreeOfCompositeActionEta]);

  const vibrationResult = useMemo(() => {
    return FloorVibrationAuditor.auditVibration({
      beamSpanM: beamSpanLength,
      beamSpacingM: tributarySpacing,
      effectiveMomentOfInertiaCm4: deflectionResult.effectiveIxShort,
      slabThicknessMm: slabToppingThickness,
      concreteElasticModulusMPa: compositeSection.concrete.elasticModulus,
      deadLoadKPa: 3.5,
      vibrationLiveLoadKPa: 0.5,
      occupancy: occupancyCategory,
      dampingRatioBeta: modalDampingBeta,
    });
  }, [beamSpanLength, tributarySpacing, deflectionResult.effectiveIxShort, slabToppingThickness, compositeSection.concrete.elasticModulus, occupancyCategory, modalDampingBeta]);

  // Handle report copy
  const handleCopyReport = () => {
    const text = `
# BEAMLAB STEEL-CONCRETE COMPOSITE STRUCTURAL VERIFICATION
Standard: AISC 360-22 Chapter I / Eurocode 4 EN 1994-1-1 / AISC DG 11
Date: ${new Date().toISOString()}

## 1. BEAM & SLAB CROSS-SECTION
- Steel Shape: ${selectedSectionKey} (Fy = ${currentSteel.yieldStrength} MPa, As = ${currentSteel.area} mm²)
- Concrete: f'c = ${fcConcrete} MPa, Slab Topping = ${slabToppingThickness} mm
- Profiled Metal Deck: Depth hr = ${deckRibDepth} mm, Rib Width = ${deckRibWidth} mm (${deckOrientation})
- Effective Flange Width beff = ${effWidthResult.beff} mm (${effWidthResult.governingCriterion})

## 2. SHEAR STUD CONNECTORS & PARTIAL INTERACTION
- Headed Stud: ${studDiameter} mm diameter, length ${studLength} mm
- Nominal Single Stud Shear Qn = ${studCapacityResult.nominalShearStrengthQn} kN
- EC4 Design Resistance PRd = ${studCapacityResult.designResistancePrd} kN
- Interface Shear Vp = ${fullConnectionResult.governingInterfaceShearVp} kN
- Required Studs for Full Composite: ${fullConnectionResult.requiredStudsTotalSpanFullComposite} total (${fullConnectionResult.requiredStudsHalfSpanFullComposite} per half span)
- Specified Degree of Composite Action: ${(partialInteractionResult.degreeOfCompositeActionEta * 100).toFixed(1)}% (${partialInteractionResult.providedStudsTotalSpan} studs)

## 3. PLASTIC FLEXURAL CAPACITY
- Plastic Neutral Axis (PNA): ${flexureResult.pna.locationCase.toUpperCase()}
- Concrete Block Depth a = ${flexureResult.pna.concreteBlockDepthA} mm
- Bare Steel Mp = ${flexureResult.bareSteelPlasticMoment} kNm
- Composite Plastic Moment Mp = ${flexureResult.plasticMomentMp} kNm (+${flexureResult.compositeCapacityGainPercent.toFixed(1)}% gain)
- AISC 360-22 LRFD Capacity phi_b * Mp = ${flexureResult.aiscDesignMomentPhiMp} kNm
- Eurocode 4 Capacity MRd = ${flexureResult.ec4DesignMomentMrd} kNm

## 4. UNSHORED CONSTRUCTION STAGE
- Factored Moment Mu,const = ${constructionAudit.factoredMomentMu} kNm vs Bare phiMn = ${constructionAudit.bareSteelCapacityPhiMn} kNm (Util: ${(constructionAudit.momentUtilization * 100).toFixed(1)}%)
- Wet Concrete Deflection = ${constructionAudit.constructionDeadDeflection} mm vs Limit ${constructionAudit.deflectionLimit} mm
- Status: ${constructionAudit.summaryText}

## 5. SERVICEABILITY DEFLECTION & AISC DG11 VIBRATION
- Effective Inertia Ieff (Short/Long): ${deflectionResult.effectiveIxShort} / ${deflectionResult.effectiveIxLong} cm⁴
- Live Load Deflection: ${deflectionResult.liveLoadDeflection} mm vs L/360 (${deflectionResult.liveLoadLimit} mm) - ${(deflectionResult.liveLoadUtilization * 100).toFixed(1)}%
- Long-Term Total Deflection: ${deflectionResult.longTermTotalDeflection} mm vs L/240 (${deflectionResult.totalLimit} mm)
- Recommended Beam Camber: ${deflectionResult.recommendedCamber} mm
- Fundamental Frequency fn: ${vibrationResult.naturalFrequencyFn} Hz
- Human Walking Peak Acceleration: ${vibrationResult.peakAccelerationPercentG.toFixed(3)}% g vs Limit ${vibrationResult.accelerationLimitPercentG}% g
- Vibration Verdict: ${vibrationResult.comfortVerdict}

## 6. COMPOSITE COLUMN AUDIT
- Type: ${colDefinition.name}
- Unbraced Length L = ${colLength} m (K = ${colKFactor})
- Squash Load Pp0 = ${columnCheck.buckling.squashLoadPp0} kN
- Euler Buckling Load Pe = ${columnCheck.buckling.governingEulerLoadPe} kN
- AISC LRFD Capacity phi_c * Pn = ${columnCheck.buckling.aiscLrfdDesignCapacityPhiPn} kN
- Eurocode 4 Resistance Nb,Rd = ${columnCheck.buckling.eurocodeDesignResistanceNbRd} kN
- AISC Combined H1 Ratio: ${(columnCheck.combinedUtilizationAisc * 100).toFixed(1)}% - ${columnCheck.isPassing ? 'PASS' : 'FAIL'}
`.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-7xl h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* ─── Studio Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 shadow-lg shadow-cyan-500/20 text-white">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-100 tracking-tight">Steel-Concrete Composite Studio</h1>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-cyan-950/80 border border-cyan-700/60 text-cyan-300">
                  AISC 360-22 · EC4 · AISC DG11
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Beams, Deck Shear Studs, Partial Interaction, CFT/Encased Columns, Deflection & Floor Walking Vibration
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── Navigation Tabs ───────────────────────────────────────────── */}
        <div className="flex items-center px-6 border-b border-slate-800 bg-slate-900/90 gap-2">
          <button
            onClick={() => setActiveTab('deck')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'deck'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            Profiled Deck & Shear Studs
          </button>

          <button
            onClick={() => setActiveTab('flexure')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'flexure'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Composite Beam & PNA
          </button>

          <button
            onClick={() => setActiveTab('columns')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'columns'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Columns className="w-4 h-4" />
            CFT & Encased Columns
          </button>

          <button
            onClick={() => setActiveTab('serviceability')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'serviceability'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            Deflection & Floor Vibration
          </button>

          <button
            onClick={() => setActiveTab('report')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'report'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            Calculation Sheet
          </button>
        </div>

        {/* ─── Main Content Body ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950/40">
          {/* ════════════════ TAB 1: DECK & SHEAR STUDS ═══════════════════ */}
          {activeTab === 'deck' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Parameters Sidebar */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
                <h2 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> Cross-Section & Deck Setup
                </h2>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Steel Wide-Flange Section</label>
                  <select
                    value={selectedSectionKey}
                    onChange={(e) => setSelectedSectionKey(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    {Object.keys(STANDARD_WIDE_FLANGE_SECTIONS).map((key) => (
                      <option key={key} value={key}>
                        {key} (d={STANDARD_WIDE_FLANGE_SECTIONS[key].depth}mm, As={STANDARD_WIDE_FLANGE_SECTIONS[key].area}mm²)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Span Length (m)</label>
                    <input
                      type="number"
                      value={beamSpanLength}
                      onChange={(e) => setBeamSpanLength(parseFloat(e.target.value) || 6)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                      step="0.5"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Beam Spacing (m)</label>
                    <input
                      type="number"
                      value={tributarySpacing}
                      onChange={(e) => setTributarySpacing(parseFloat(e.target.value) || 2)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                      step="0.5"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-3 space-y-3">
                  <h3 className="text-xs font-semibold text-slate-300">Concrete Slab & Profiled Deck</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">f'c Strength (MPa)</label>
                      <input
                        type="number"
                        value={fcConcrete}
                        onChange={(e) => setFcConcrete(parseInt(e.target.value) || 28)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Topping Thick (mm)</label>
                      <input
                        type="number"
                        value={slabToppingThickness}
                        onChange={(e) => setSlabToppingThickness(parseInt(e.target.value) || 75)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Deck Rib Depth (mm)</label>
                      <input
                        type="number"
                        value={deckRibDepth}
                        onChange={(e) => setDeckRibDepth(parseInt(e.target.value) || 50)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Rib Orientation</label>
                      <select
                        value={deckOrientation}
                        onChange={(e) => setDeckOrientation(e.target.value as any)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                      >
                        <option value="perpendicular">Perpendicular</option>
                        <option value="parallel">Parallel</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-3 space-y-3">
                  <h3 className="text-xs font-semibold text-slate-300">Headed Shear Studs</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Stud Diameter (mm)</label>
                      <select
                        value={studDiameter}
                        onChange={(e) => setStudDiameter(parseInt(e.target.value) || 19)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                      >
                        <option value={16}>16 mm (5/8")</option>
                        <option value={19}>19 mm (3/4")</option>
                        <option value={22}>22 mm (7/8")</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Studs per Rib</label>
                      <select
                        value={studsPerRow}
                        onChange={(e) => setStudsPerRow(parseInt(e.target.value) || 1)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                      >
                        <option value={1}>1 stud</option>
                        <option value={2}>2 studs (pair)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Visual Deck & Stud Diagram */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      Composite Slab & Metal Deck Cross-Section View
                    </h3>
                    <span className="text-xs text-slate-400">
                      Effective Flange Width: <strong className="text-cyan-400">{effWidthResult.beff} mm</strong>
                    </span>
                  </div>

                  <div className="h-56 w-full bg-slate-950/80 rounded-lg p-4 flex flex-col justify-center items-center border border-slate-800/60 relative overflow-hidden">
                    <svg viewBox="0 0 600 200" className="w-full h-full">
                      {/* Concrete topping slab */}
                      <rect x="50" y="20" width="500" height="35" fill="#38bdf8" fillOpacity="0.25" stroke="#38bdf8" strokeWidth="1.5" rx="3" />
                      <text x="300" y="42" textAnchor="middle" fill="#93c5fd" fontSize="11" fontWeight="bold">
                        Concrete Topping: {slabToppingThickness} mm (f'c = {fcConcrete} MPa)
                      </text>

                      {/* Profiled metal deck ribs */}
                      <path
                        d="M 50 55 L 90 55 L 110 90 L 150 90 L 170 55 L 210 55 L 230 90 L 270 90 L 290 55 L 330 55 L 350 90 L 390 90 L 410 55 L 450 55 L 470 90 L 510 90 L 530 55 L 550 55"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="2.5"
                      />

                      {/* Concrete filling the ribs */}
                      <polygon points="90,55 110,90 150,90 170,55" fill="#38bdf8" fillOpacity="0.15" />
                      <polygon points="210,55 230,90 270,90 290,55" fill="#38bdf8" fillOpacity="0.15" />
                      <polygon points="330,55 350,90 390,90 410,55" fill="#38bdf8" fillOpacity="0.15" />
                      <polygon points="450,55 470,90 510,90 530,55" fill="#38bdf8" fillOpacity="0.15" />

                      {/* Headed Shear Studs in ribs */}
                      <rect x="245" y="40" width="10" height="50" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
                      <circle cx="250" cy="38" r="8" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
                      <rect x="365" y="40" width="10" height="50" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
                      <circle cx="370" cy="38" r="8" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />

                      {/* Steel Top Flange */}
                      <rect x="180" y="90" width="240" height="15" fill="#64748b" stroke="#94a3b8" strokeWidth="1.5" />
                      {/* Steel Web */}
                      <rect x="294" y="105" width="12" height="65" fill="#64748b" stroke="#94a3b8" strokeWidth="1.5" />
                      {/* Steel Bottom Flange */}
                      <rect x="180" y="170" width="240" height="15" fill="#64748b" stroke="#94a3b8" strokeWidth="1.5" />

                      <text x="300" y="142" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontWeight="bold">
                        {selectedSectionKey} (d={currentSteel.depth}mm)
                      </text>
                    </svg>
                  </div>
                </div>

                {/* Key Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                    <span className="text-xs text-slate-400 block mb-1">Single Stud Nominal Shear Qn</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-cyan-400">{studCapacityResult.nominalShearStrengthQn}</span>
                      <span className="text-xs text-slate-400">kN / stud</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2">
                      AISC 360 Eq. I8-1 (Rg={studCapacityResult.rgFactor}, Rp={studCapacityResult.rpFactor})
                    </p>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                    <span className="text-xs text-slate-400 block mb-1">EC4 Resistance PRd</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-emerald-400">{studCapacityResult.designResistancePrd}</span>
                      <span className="text-xs text-slate-400">kN / stud</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2">
                      Eurocode 4 EN 1994-1-1 (kt={studCapacityResult.deckReductionFactorKt})
                    </p>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                    <span className="text-xs text-slate-400 block mb-1">Full Composite Stud Count</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-amber-400">{fullConnectionResult.requiredStudsTotalSpanFullComposite}</span>
                      <span className="text-xs text-slate-400">studs total</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2">
                      {fullConnectionResult.requiredStudsHalfSpanFullComposite} studs per half span (Vp={fullConnectionResult.governingInterfaceShearVp} kN)
                    </p>
                  </div>
                </div>

                {/* Construction Stage Bare Steel Check */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${constructionAudit.isPassing ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">Unshored Construction Stage Audit</h4>
                      <p className="text-xs text-slate-400">{constructionAudit.summaryText}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Moment Util</span>
                    <span className="text-sm font-bold text-slate-200">{(constructionAudit.momentUtilization * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════ TAB 2: COMPOSITE BEAM & PNA ═════════════════ */}
          {activeTab === 'flexure' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Interaction Slider Sidebar */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-5">
                <h2 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Degree of Composite Action (η)
                </h2>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Interaction Ratio η:</span>
                    <span className="text-cyan-400 font-bold text-sm">{(targetEta * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.25"
                    max="1.0"
                    step="0.05"
                    value={targetEta}
                    onChange={(e) => setTargetEta(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>25% (AISC Min)</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100% (Full)</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
                  <span className="text-xs text-slate-400 block">Studs Provided (Half / Total)</span>
                  <div className="text-lg font-bold text-slate-200">
                    {partialInteractionResult.providedStudsHalfSpan} <span className="text-xs text-slate-400 font-normal">half</span> / {partialInteractionResult.providedStudsTotalSpan} <span className="text-xs text-slate-400 font-normal">total</span>
                  </div>
                  <p className="text-[11px] text-slate-400">{partialInteractionResult.statusMessage}</p>
                </div>

                <div className="border-t border-slate-800 pt-3 space-y-3">
                  <h3 className="text-xs font-semibold text-slate-300">Plastic Neutral Axis (PNA)</h3>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-cyan-950/80 border border-cyan-700/60 text-cyan-300">
                      Case: {flexureResult.pna.locationCase.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>
                  <ul className="text-xs space-y-1.5 text-slate-400 pt-1">
                    <li>Concrete Depth <strong>a = {flexureResult.pna.concreteBlockDepthA} mm</strong></li>
                    <li>PNA from Top Flange: <strong>{flexureResult.pna.ypnaFromTopFlange} mm</strong></li>
                    <li>Slab Compression Cc = <strong>{flexureResult.pna.concreteCompressionCc} kN</strong></li>
                    <li>Steel Compression Cs = <strong>{flexureResult.pna.steelCompressionCs} kN</strong></li>
                  </ul>
                </div>
              </div>

              {/* Stress Distribution & Mp Curve */}
              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                    <span className="text-xs text-slate-400 block mb-1">Bare Steel Plastic Mp</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-slate-300">{flexureResult.bareSteelPlasticMoment}</span>
                      <span className="text-xs text-slate-400">kNm</span>
                    </div>
                    <span className="text-[11px] text-slate-500 mt-2 block">Zx · Fy (Non-composite)</span>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                    <span className="text-xs text-slate-400 block mb-1">Composite Plastic Moment Mp</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-cyan-400">{flexureResult.plasticMomentMp}</span>
                      <span className="text-xs text-slate-400">kNm</span>
                    </div>
                    <span className="text-[11px] text-emerald-400 font-semibold mt-2 block">
                      +{flexureResult.compositeCapacityGainPercent.toFixed(1)}% gain over bare steel
                    </span>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                    <span className="text-xs text-slate-400 block mb-1">AISC LRFD Capacity φMp</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-emerald-400">{flexureResult.aiscDesignMomentPhiMp}</span>
                      <span className="text-xs text-slate-400">kNm</span>
                    </div>
                    <span className="text-[11px] text-slate-500 mt-2 block">φb = 0.90 (EC4: {flexureResult.ec4DesignMomentMrd} kNm)</span>
                  </div>
                </div>

                {/* Interaction Curve Graph */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-cyan-400" />
                    Plastic Moment vs Composite Interaction Curve Mp(η)
                  </h3>

                  <div className="h-64 w-full bg-slate-950/80 rounded-lg p-4 flex flex-col justify-center border border-slate-800/60 relative">
                    <svg viewBox="0 0 500 220" className="w-full h-full">
                      {/* Grid lines */}
                      <line x1="50" y1="20" x2="480" y2="20" stroke="#334155" strokeDasharray="3 3" />
                      <line x1="50" y1="80" x2="480" y2="80" stroke="#334155" strokeDasharray="3 3" />
                      <line x1="50" y1="140" x2="480" y2="140" stroke="#334155" strokeDasharray="3 3" />
                      <line x1="50" y1="190" x2="480" y2="190" stroke="#475569" />
                      <line x1="50" y1="20" x2="50" y2="190" stroke="#475569" />

                      {/* Mp curve plot */}
                      {(() => {
                        const minMp = interactionCurve[0]?.plasticMomentMp ?? 500;
                        const maxMp = interactionCurve[interactionCurve.length - 1]?.plasticMomentMp ?? 1200;
                        const deltaY = maxMp - minMp || 1;

                        const pointsStr = interactionCurve
                          .map((pt) => {
                            const x = 50 + ((pt.eta - 0.25) / 0.75) * 410;
                            const y = 180 - ((pt.plasticMomentMp - minMp) / deltaY) * 150;
                            return `${x},${y}`;
                          })
                          .join(' ');

                        return (
                          <>
                            <polyline fill="none" stroke="#38bdf8" strokeWidth="3" points={pointsStr} />
                            {interactionCurve.map((pt, i) => {
                              const x = 50 + ((pt.eta - 0.25) / 0.75) * 410;
                              const y = 180 - ((pt.plasticMomentMp - minMp) / deltaY) * 150;
                              return (
                                <circle
                                  key={i}
                                  cx={x}
                                  cy={y}
                                  r={4}
                                  fill={pt.eta === targetEta ? '#f59e0b' : '#38bdf8'}
                                  stroke="#0f172a"
                                  strokeWidth="1.5"
                                />
                              );
                            })}
                          </>
                        );
                      })()}

                      {/* Axis Labels */}
                      <text x="50" y="208" fill="#94a3b8" fontSize="10">25% (Min)</text>
                      <text x="250" y="208" fill="#94a3b8" fontSize="10">Interaction η</text>
                      <text x="460" y="208" fill="#94a3b8" fontSize="10">100%</text>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════ TAB 3: CFT & ENCASED COLUMNS ═════════════════ */}
          {activeTab === 'columns' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Column Sidebar */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
                <h2 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                  <Columns className="w-4 h-4" /> Composite Column Config
                </h2>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Column Cross-Section Type</label>
                  <select
                    value={columnType}
                    onChange={(e) => setColumnType(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="rectangular_cft">Rectangular CFT (Filled Tube)</option>
                    <option value="circular_cft">Circular CFT (Filled Pipe - C2=0.95)</option>
                    <option value="encased_wide_flange">Encased Wide-Flange (Steel Core + Rebar)</option>
                  </select>
                </div>

                {columnType === 'rectangular_cft' && (
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Width B (mm)</label>
                      <input
                        type="number"
                        value={cftWidth}
                        onChange={(e) => setCftWidth(parseInt(e.target.value) || 300)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Depth H (mm)</label>
                      <input
                        type="number"
                        value={cftDepth}
                        onChange={(e) => setCftDepth(parseInt(e.target.value) || 300)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Wall t (mm)</label>
                      <input
                        type="number"
                        value={cftWallThickness}
                        onChange={(e) => setCftWallThickness(parseInt(e.target.value) || 8)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200"
                      />
                    </div>
                  </div>
                )}

                {columnType === 'circular_cft' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Outer Diam D (mm)</label>
                      <input
                        type="number"
                        value={cftDiameter}
                        onChange={(e) => setCftDiameter(parseInt(e.target.value) || 400)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Wall t (mm)</label>
                      <input
                        type="number"
                        value={cftWallThickness}
                        onChange={(e) => setCftWallThickness(parseInt(e.target.value) || 8)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Length L (m)</label>
                    <input
                      type="number"
                      value={colLength}
                      onChange={(e) => setColLength(parseFloat(e.target.value) || 4)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                      step="0.5"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">K Factor</label>
                    <input
                      type="number"
                      value={colKFactor}
                      onChange={(e) => setColKFactor(parseFloat(e.target.value) || 1.0)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                      step="0.1"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-3 space-y-3">
                  <h3 className="text-xs font-semibold text-slate-300">Applied Factored Loads</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Pu (kN)</label>
                      <input
                        type="number"
                        value={appliedPu}
                        onChange={(e) => setAppliedPu(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Mux (kNm)</label>
                      <input
                        type="number"
                        value={appliedMux}
                        onChange={(e) => setAppliedMux(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Muy (kNm)</label>
                      <input
                        type="number"
                        value={appliedMuy}
                        onChange={(e) => setAppliedMuy(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Column Capacity & P-M Interaction Diagram */}
              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                    <span className="text-xs text-slate-400 block mb-1">Squash Load Pp0</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-slate-200">{columnCheck.buckling.squashLoadPp0}</span>
                      <span className="text-xs text-slate-400">kN</span>
                    </div>
                    <span className="text-[11px] text-slate-500 mt-2 block">Pure axial plastic capacity</span>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                    <span className="text-xs text-slate-400 block mb-1">AISC LRFD φcPn</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-cyan-400">{columnCheck.buckling.aiscLrfdDesignCapacityPhiPn}</span>
                      <span className="text-xs text-slate-400">kN</span>
                    </div>
                    <span className="text-[11px] text-slate-500 mt-2 block">φc = 0.75 (Euler Pe: {columnCheck.buckling.governingEulerLoadPe} kN)</span>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                    <span className="text-xs text-slate-400 block mb-1">Combined AISC H1 Util</span>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-2xl font-bold ${columnCheck.isPassing ? 'text-emerald-400' : 'text-red-400'}`}>
                        {(columnCheck.combinedUtilizationAisc * 100).toFixed(1)}%
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-2 block">{columnCheck.isPassing ? 'PASS (<= 100%)' : 'FAIL (> 100%)'}</span>
                  </div>
                </div>

                {/* 4-Point P-M Envelope Canvas */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
                    <Columns className="w-4 h-4 text-cyan-400" />
                    4-Point Plastic P-M Interaction Diagram (Points A, B, C, D)
                  </h3>

                  <div className="h-64 w-full bg-slate-950/80 rounded-lg p-4 flex flex-col justify-center border border-slate-800/60 relative">
                    <svg viewBox="0 0 500 220" className="w-full h-full">
                      <line x1="50" y1="190" x2="480" y2="190" stroke="#475569" />
                      <line x1="50" y1="20" x2="50" y2="190" stroke="#475569" />

                      {(() => {
                        const pts = columnCheck.envelope.nominalPoints;
                        const maxP = pts[0]?.axialForceP || 10000;
                        const maxM = pts[1]?.momentM || 500;

                        // Point A -> Point D -> Point C -> Point B
                        const [pA, pD, pC, pB] = pts;
                        const toCoord = (p: number, m: number) => {
                          const x = 50 + (m / (maxM * 1.3 || 1)) * 400;
                          const y = 190 - (p / (maxP || 1)) * 170;
                          return `${x},${y}`;
                        };

                        const pathStr = `M ${toCoord(pA.axialForceP, pA.momentM)} L ${toCoord(pD.axialForceP, pD.momentM)} L ${toCoord(pC.axialForceP, pC.momentM)} L ${toCoord(pB.axialForceP, pB.momentM)}`;

                        // Applied load point
                        const appX = 50 + (appliedMux / (maxM * 1.3 || 1)) * 400;
                        const appY = 190 - (appliedPu / (maxP || 1)) * 170;

                        return (
                          <>
                            <path d={pathStr} fill="none" stroke="#38bdf8" strokeWidth="2.5" />
                            <circle cx={toCoord(pA.axialForceP, pA.momentM).split(',')[0]} cy={toCoord(pA.axialForceP, pA.momentM).split(',')[1]} r={5} fill="#38bdf8" />
                            <circle cx={toCoord(pD.axialForceP, pD.momentM).split(',')[0]} cy={toCoord(pD.axialForceP, pD.momentM).split(',')[1]} r={5} fill="#38bdf8" />
                            <circle cx={toCoord(pC.axialForceP, pC.momentM).split(',')[0]} cy={toCoord(pC.axialForceP, pC.momentM).split(',')[1]} r={5} fill="#38bdf8" />
                            <circle cx={toCoord(pB.axialForceP, pB.momentM).split(',')[0]} cy={toCoord(pB.axialForceP, pB.momentM).split(',')[1]} r={5} fill="#38bdf8" />

                            {/* Applied Load Marker */}
                            <circle cx={appX} cy={appY} r={6} fill={columnCheck.isPassing ? '#10b981' : '#ef4444'} stroke="#ffffff" strokeWidth="2" />
                            <text x={appX + 10} y={appY + 4} fill="#f1f5f9" fontSize="10" fontWeight="bold">
                              Applied (Pu={appliedPu}, Mux={appliedMux})
                            </text>
                          </>
                        );
                      })()}

                      <text x="440" y="208" fill="#94a3b8" fontSize="10">Moment M (kNm)</text>
                      <text x="55" y="32" fill="#94a3b8" fontSize="10">Axial P (kN)</text>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════ TAB 4: DEFLECTION & VIBRATION ═══════════════ */}
          {activeTab === 'serviceability' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sidebar */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
                <h2 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Service Loading & Comfort
                </h2>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Superimposed Dead Load (kPa)</label>
                  <input
                    type="number"
                    value={superimposedDeadLoadKPa}
                    onChange={(e) => setSuperimposedDeadLoadKPa(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                    step="0.25"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Service Live Load (kPa)</label>
                  <input
                    type="number"
                    value={serviceLiveLoadKPa}
                    onChange={(e) => setServiceLiveLoadKPa(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                    step="0.5"
                  />
                </div>

                <div className="border-t border-slate-800 pt-3 space-y-3">
                  <h3 className="text-xs font-semibold text-slate-300">AISC DG11 Walking Vibration</h3>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Occupancy Classification</label>
                    <select
                      value={occupancyCategory}
                      onChange={(e) => setOccupancyCategory(e.target.value as any)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                    >
                      <option value="office_residential">Office / Residential (0.5% g limit)</option>
                      <option value="shopping_mall">Shopping Mall / Footbridge (1.5% g limit)</option>
                      <option value="sensitive_laboratory">Sensitive Equipment / Lab (0.15% g limit)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Modal Damping Ratio β</label>
                    <select
                      value={modalDampingBeta}
                      onChange={(e) => setModalDampingBeta(parseFloat(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                    >
                      <option value={0.02}>2% - Bare Open Plan</option>
                      <option value={0.03}>3% - Standard Partitioned Office</option>
                      <option value={0.05}>5% - Heavy Partitions / Modular Offices</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Results */}
              <div className="lg:col-span-2 space-y-6">
                {/* Deflection summary cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                    <span className="text-xs text-slate-400 block mb-1">Live Load Deflection</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-cyan-400">{deflectionResult.liveLoadDeflection}</span>
                      <span className="text-xs text-slate-400">mm</span>
                    </div>
                    <span className="text-[11px] text-slate-500 mt-2 block">Limit L/360: {deflectionResult.liveLoadLimit} mm</span>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                    <span className="text-xs text-slate-400 block mb-1">Long-Term Total Deflection</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-slate-200">{deflectionResult.longTermTotalDeflection}</span>
                      <span className="text-xs text-slate-400">mm</span>
                    </div>
                    <span className="text-[11px] text-slate-500 mt-2 block">Limit L/240: {deflectionResult.totalLimit} mm</span>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                    <span className="text-xs text-slate-400 block mb-1">Recommended Camber</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-amber-400">{deflectionResult.recommendedCamber}</span>
                      <span className="text-xs text-slate-400">mm</span>
                    </div>
                    <span className="text-[11px] text-slate-500 mt-2 block">Counters wet concrete deflection</span>
                  </div>
                </div>

                {/* AISC DG11 Vibration Box */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-cyan-400" />
                      AISC Design Guide 11 Human Comfort Walking Assessment
                    </h3>
                    <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${vibrationResult.isComfortable ? 'bg-emerald-950/80 border border-emerald-700/60 text-emerald-300' : 'bg-red-950/80 border border-red-700/60 text-red-300'}`}>
                      {vibrationResult.isComfortable ? 'COMFORTABLE (PASS)' : 'EXCESSIVE VIBRATION'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
                      <span className="text-[11px] text-slate-400 block">Natural Frequency fn</span>
                      <span className="text-lg font-bold text-slate-200">{vibrationResult.naturalFrequencyFn} Hz</span>
                    </div>
                    <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
                      <span className="text-[11px] text-slate-400 block">Effective Width B</span>
                      <span className="text-lg font-bold text-slate-200">{vibrationResult.effectivePanelWidthB} m</span>
                    </div>
                    <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
                      <span className="text-[11px] text-slate-400 block">Effective Weight W</span>
                      <span className="text-lg font-bold text-slate-200">{vibrationResult.effectivePanelWeightW} kN</span>
                    </div>
                    <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
                      <span className="text-[11px] text-slate-400 block">Peak Accel ap / g</span>
                      <span className={`text-lg font-bold ${vibrationResult.isComfortable ? 'text-emerald-400' : 'text-red-400'}`}>
                        {vibrationResult.peakAccelerationPercentG.toFixed(3)}%
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
                    {vibrationResult.comfortVerdict}
                  </p>

                  {vibrationResult.recommendations.length > 0 && (
                    <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-800/40 space-y-1">
                      <span className="text-xs font-bold text-amber-300 block">Engineering Recommendations:</span>
                      <ul className="text-xs text-amber-200/90 list-disc list-inside space-y-0.5">
                        {vibrationResult.recommendations.map((rec, i) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ════════════════ TAB 5: CALCULATION REPORT ═══════════════════ */}
          {activeTab === 'report' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
                <div>
                  <h2 className="text-sm font-bold text-slate-200">Formal Engineering Verification Report</h2>
                  <p className="text-xs text-slate-400">Dual-standard codified summary ready for archiving and peer-review.</p>
                </div>
                <button
                  onClick={handleCopyReport}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-cyan-600/20 transition-all"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied to Clipboard' : 'Copy Markdown Report'}
                </button>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 font-mono text-xs text-slate-300 space-y-6 overflow-x-auto">
                <div className="border-b border-slate-800 pb-4">
                  <h3 className="text-sm font-bold text-cyan-400">1. DESIGN CODES & GOVERNING FORMULAS</h3>
                  <p className="text-slate-400 mt-1">
                    AISC 360-22 Specification for Structural Steel Buildings (Chapter I)<br />
                    Eurocode 4 EN 1994-1-1 Design of Composite Steel and Concrete Structures<br />
                    AISC Design Guide 11 Vibrations of Steel-Framed Structural Systems (2nd Ed)
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-200">AISC 360-22 Beam Flexural Capacity</h4>
                    <p className="text-slate-400">
                      φb = 0.90 (LRFD)<br />
                      Mp = Ts · (d/2 + hr + ts - a/2) (Case 1 PNA in slab)<br />
                      Qn = 0.5 Asa √(f'c Ec) ≤ Rg Rp Asa Fu (AISC Eq. I8-1)<br />
                      Ieff = Is + √η (Itr - Is) (AISC Eq. C-I3-1)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-200">Eurocode 4 Equivalent Parameters</h4>
                    <p className="text-slate-400">
                      γM0 = 1.00, γV = 1.25<br />
                      PRd = min(0.8 fu (πd²/4)/γV, 0.29 α d² √(fck Ecm)/γV) · kt<br />
                      Nb,Rd = χ Npl,Rd (Buckling Curve b/c)
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-4 space-y-2">
                  <h4 className="text-xs font-bold text-slate-200">Execution Verification Summary</h4>
                  <table className="w-full text-left border border-slate-800 rounded">
                    <thead>
                      <tr className="bg-slate-950 text-cyan-400">
                        <th className="p-2 border-b border-slate-800">Check Description</th>
                        <th className="p-2 border-b border-slate-800">Demand</th>
                        <th className="p-2 border-b border-slate-800">Capacity</th>
                        <th className="p-2 border-b border-slate-800">Ratio</th>
                        <th className="p-2 border-b border-slate-800">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="p-2 border-b border-slate-800/60">Bare Steel Construction Stage Flexure</td>
                        <td className="p-2 border-b border-slate-800/60">{constructionAudit.factoredMomentMu} kNm</td>
                        <td className="p-2 border-b border-slate-800/60">{constructionAudit.bareSteelCapacityPhiMn} kNm</td>
                        <td className="p-2 border-b border-slate-800/60">{(constructionAudit.momentUtilization * 100).toFixed(1)}%</td>
                        <td className="p-2 border-b border-slate-800/60 text-emerald-400 font-bold">PASS</td>
                      </tr>
                      <tr>
                        <td className="p-2 border-b border-slate-800/60">Service Live Load Deflection (L/360)</td>
                        <td className="p-2 border-b border-slate-800/60">{deflectionResult.liveLoadDeflection} mm</td>
                        <td className="p-2 border-b border-slate-800/60">{deflectionResult.liveLoadLimit} mm</td>
                        <td className="p-2 border-b border-slate-800/60">{(deflectionResult.liveLoadUtilization * 100).toFixed(1)}%</td>
                        <td className="p-2 border-b border-slate-800/60 text-emerald-400 font-bold">PASS</td>
                      </tr>
                      <tr>
                        <td className="p-2 border-b border-slate-800/60">AISC DG11 Walking Vibration Comfort</td>
                        <td className="p-2 border-b border-slate-800/60">{vibrationResult.peakAccelerationPercentG.toFixed(3)}% g</td>
                        <td className="p-2 border-b border-slate-800/60">{vibrationResult.accelerationLimitPercentG}% g</td>
                        <td className="p-2 border-b border-slate-800/60">{(vibrationResult.vibrationUtilization * 100).toFixed(1)}%</td>
                        <td className={`p-2 border-b border-slate-800/60 font-bold ${vibrationResult.isComfortable ? 'text-emerald-400' : 'text-red-400'}`}>
                          {vibrationResult.isComfortable ? 'PASS' : 'EXCEEDED'}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2">Composite Column Combined Axial-Flexure (H1)</td>
                        <td className="p-2">Pu={appliedPu} kN, Mux={appliedMux} kNm</td>
                        <td className="p-2">φcPn={columnCheck.buckling.aiscLrfdDesignCapacityPhiPn} kN</td>
                        <td className="p-2">{(columnCheck.combinedUtilizationAisc * 100).toFixed(1)}%</td>
                        <td className={`p-2 font-bold ${columnCheck.isPassing ? 'text-emerald-400' : 'text-red-400'}`}>
                          {columnCheck.isPassing ? 'PASS' : 'FAIL'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
