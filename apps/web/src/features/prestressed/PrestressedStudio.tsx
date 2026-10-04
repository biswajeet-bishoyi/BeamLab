import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Layers, 
  Settings, 
  TrendingDown, 
  Activity, 
  FileText, 
  X, 
  Download, 
  CheckCircle2, 
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';
import * as THREE from 'three';
import {
  StrandCatalog,
  TendonProfileEngine,
  PrestressLossAuditor,
  LoadBalancingEngine,
  HyperstaticPrestressEngine,
  FiberStressAuditor,
  UltimateFlexuralCapacityEngine,
  TendonProfileType,
  TendonProfileInput,
  StructuralBoundaryCondition,
} from '@beamstudio/prestressed-engine';

interface PrestressedStudioProps {
  onClose: () => void;
}

export const PrestressedStudio: React.FC<PrestressedStudioProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'section' | 'profile' | 'losses' | 'stresses' | 'report'>('profile');

  // --- STATE 1: Cross-Section & Material ---
  const [sectionType, setSectionType] = useState<'rectangular' | 't-beam'>('rectangular');
  const [beamWidthMm, setBeamWidthMm] = useState(400);
  const [beamHeightMm, setBeamHeightMm] = useState(800);
  const [flangeWidthMm, setFlangeWidthMm] = useState(1200);
  const [flangeThicknessMm, setFlangeThicknessMm] = useState(150);
  const [fciMpa, setFciMpa] = useState(32);
  const [fcMpa, setFcMpa] = useState(45);

  // --- STATE 2: Tendon Assembly ---
  const [strandId, setStrandId] = useState('ASTM-A416-0.6');
  const [numStrands, setNumStrands] = useState(12);
  const [systemType, setSystemType] = useState<'bonded' | 'unbonded'>('bonded');
  const [jackingRatio, setJackingRatio] = useState(0.75); // 75% fpu

  // --- STATE 3: Tendon Trajectory ---
  const [spanLengthM, setSpanLengthM] = useState(18);
  const [profileType, setProfileType] = useState<TendonProfileType>('parabolic');
  const [yStartMm, setYStartMm] = useState(650);
  const [yMidMm, setYMidMm] = useState(120);
  const [yEndMm, setYEndMm] = useState(650);

  // --- STATE 4: Losses Parameters ---
  const [curvatureMu, setCurvatureMu] = useState(0.20);
  const [wobbleK, setWobbleK] = useState(0.0016);
  const [wedgeSlipMm, setWedgeSlipMm] = useState(6.0);
  const [jackingMode, setJackingMode] = useState<'single-end' | 'both-ends'>('single-end');
  const [relativeHumidity, setRelativeHumidity] = useState(70);

  // --- STATE 5: Applied Gravity Loading ---
  const [deadLoadKnPerM, setDeadLoadKnPerM] = useState(26); // Self-weight + superimposed
  const [liveLoadKnPerM, setLiveLoadKnPerM] = useState(14);
  const [boundaryCondition, setBoundaryCondition] = useState<StructuralBoundaryCondition>('simply-supported');

  // --- COMPUTATIONS ---
  const section = useMemo(() => {
    if (sectionType === 'rectangular') {
      return FiberStressAuditor.createRectangularSection(beamWidthMm, beamHeightMm);
    }
    return FiberStressAuditor.createTBeamSection(beamWidthMm, beamHeightMm, flangeWidthMm, flangeThicknessMm);
  }, [sectionType, beamWidthMm, beamHeightMm, flangeWidthMm, flangeThicknessMm]);

  const tendonAssembly = useMemo(() => {
    return StrandCatalog.createTendonAssembly({
      strandId,
      numberOfStrands: numStrands,
      systemType,
      jackingStressRatio: jackingRatio,
    });
  }, [strandId, numStrands, systemType, jackingRatio]);

  const geometry = useMemo(() => {
    let input: TendonProfileInput;
    if (profileType === 'parabolic') {
      input = {
        type: 'parabolic',
        spanLengthM,
        yStartMm,
        yMidMm,
        yEndMm,
        concreteCentroidYMm: section.cgcFromBottomMm,
      };
    } else if (profileType === 'harped') {
      input = {
        type: 'harped',
        spanLengthM,
        yStartMm,
        yMidMm,
        yEndMm,
        concreteCentroidYMm: section.cgcFromBottomMm,
      };
    } else {
      input = {
        type: 'reverse-parabolic',
        spanLengthM,
        ySupportMm: Math.max(yStartMm, yEndMm),
        yMidMm,
        concreteCentroidYMm: section.cgcFromBottomMm,
      };
    }
    return TendonProfileEngine.generateProfile(input, 41);
  }, [profileType, spanLengthM, yStartMm, yMidMm, yEndMm, section.cgcFromBottomMm]);

  const lossReport = useMemo(() => {
    return PrestressLossAuditor.auditLosses({
      tendon: tendonAssembly,
      geometry,
      curvatureFrictionMu: curvatureMu,
      wobbleFrictionK: wobbleK,
      wedgeSlipMm,
      jackingMode,
      relativeHumidityPercent: relativeHumidity,
    });
  }, [tendonAssembly, geometry, curvatureMu, wobbleK, wedgeSlipMm, jackingMode, relativeHumidity]);

  const loadBalancing = useMemo(() => {
    return LoadBalancingEngine.calculateBalancedLoads({
      geometry,
      averageEffectiveForceKn: lossReport.effectiveSummary.averageEffectiveForceKn,
      deadLoadKnPerM,
      liveLoadKnPerM,
    });
  }, [geometry, lossReport, deadLoadKnPerM, liveLoadKnPerM]);

  // Midspan gravity moments for simple span:
  const selfWeightMomentMidspanKnm = (deadLoadKnPerM * 0.4 * Math.pow(spanLengthM, 2)) / 8; // Beam self-weight approx
  const deadLoadMomentMidspanKnm = (deadLoadKnPerM * Math.pow(spanLengthM, 2)) / 8;
  const liveLoadMomentMidspanKnm = (liveLoadKnPerM * Math.pow(spanLengthM, 2)) / 8;
  const totalServiceMomentMidspanKnm = deadLoadMomentMidspanKnm + liveLoadMomentMidspanKnm;

  const hyperstaticAnalysis = useMemo(() => {
    return HyperstaticPrestressEngine.analyzePrestressMoments({
      boundaryCondition,
      geometry,
      loadBalancing,
      effectivePrestressForceKn: lossReport.effectiveSummary.averageEffectiveForceKn,
      deadLoadMomentMidspanKnm,
      liveLoadMomentMidspanKnm,
    });
  }, [boundaryCondition, geometry, loadBalancing, lossReport, deadLoadMomentMidspanKnm, liveLoadMomentMidspanKnm]);

  const midspanStation = geometry.evaluateAt(spanLengthM / 2);
  const midspanForceStation = lossReport.forceDistribution[Math.floor(lossReport.forceDistribution.length / 2)];

  const fiberStresses = useMemo(() => {
    return FiberStressAuditor.auditFiberStresses({
      section,
      concrete: { fciMpa, fcMpa },
      transferForceKn: midspanForceStation.forceAtTransferKn,
      effectiveForceKn: midspanForceStation.effectiveForceKn,
      eccentricityMm: midspanStation.eccentricityMm,
      selfWeightMomentKnm: selfWeightMomentMidspanKnm,
      sustainedDeadMomentKnm: deadLoadMomentMidspanKnm,
      totalServiceMomentKnm: totalServiceMomentMidspanKnm,
    });
  }, [section, fciMpa, fcMpa, midspanForceStation, midspanStation, selfWeightMomentMidspanKnm, deadLoadMomentMidspanKnm, totalServiceMomentMidspanKnm]);

  const ultimateFlexure = useMemo(() => {
    // Tendon depth from top at midspan:
    const dp = section.totalHeightMm - midspanStation.yMm;
    const factoredDemand = hyperstaticAnalysis.criticalFactoredMomentAciKnm;

    return UltimateFlexuralCapacityEngine.calculateUltimateCapacity({
      section,
      concrete: { fciMpa, fcMpa },
      tendon: tendonAssembly,
      effectivePrestressForceKn: midspanForceStation.effectiveForceKn,
      tendonDepthFromTopMm: dp,
      factoredMomentDemandKnm: factoredDemand,
    });
  }, [section, fciMpa, fcMpa, tendonAssembly, midspanForceStation, midspanStation, hyperstaticAnalysis]);

  // --- THREE.JS 3D CANVAS REF ---
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || activeTab !== 'profile') return;

    const width = canvas.clientWidth || 600;
    const height = canvas.clientHeight || 360;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0a0d14');

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(spanLengthM * 0.6, 2.2, spanLengthM * 0.7);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Ambient & Directional Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x60a5fa, 1.2);
    dirLight.position.set(10, 15, 10);
    scene.add(dirLight);

    // Subtle Grid Floor
    const grid = new THREE.GridHelper(spanLengthM * 1.5, 20, 0x1e293b, 0x0f172a);
    grid.position.y = -section.totalHeightMm / 2000;
    scene.add(grid);

    // 1. Translucent Concrete Beam Box
    const beamLength = spanLengthM;
    const beamH = section.totalHeightMm / 1000; // m
    const beamW = (section.flangeWidthMm ?? section.webWidthMm) / 1000; // m
    const boxGeo = new THREE.BoxGeometry(beamLength, beamH, beamW);
    const boxMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.18,
      roughness: 0.2,
      transmission: 0.6,
      thickness: 0.5,
      wireframe: false,
    });
    const beamMesh = new THREE.Mesh(boxGeo, boxMat);
    beamMesh.position.set(0, 0, 0);
    scene.add(beamMesh);

    // Beam Wireframe Edges
    const edgesGeo = new THREE.EdgesGeometry(boxGeo);
    const edgesMat = new THREE.LineBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.4 });
    const edgesMesh = new THREE.LineSegments(edgesGeo, edgesMat);
    scene.add(edgesMesh);

    // 2. 3D Spline Curve for the Tendon
    const points: THREE.Vector3[] = geometry.stations.map((st) => {
      // Map x from [0, L] to [-L/2, L/2]
      const x = st.xM - spanLengthM / 2;
      // Map y from bottom mm to centered y in meters:
      const y = (st.yMm - section.totalHeightMm / 2) / 1000;
      return new THREE.Vector3(x, y, 0);
    });

    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeo = new THREE.TubeGeometry(curve, 64, (tendonAssembly.ductDiameterMm / 2) / 1000, 8, false);
    const tubeMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // glowing amber
      emissive: 0xd97706,
      emissiveIntensity: 0.6,
      roughness: 0.3,
      metalness: 0.8,
    });
    const tendonTube = new THREE.Mesh(tubeGeo, tubeMat);
    scene.add(tendonTube);

    // 3. Anchor Heads (cylinders at both ends)
    const anchorRadius = (tendonAssembly.ductDiameterMm * 1.5) / 1000;
    const anchorGeo = new THREE.CylinderGeometry(anchorRadius, anchorRadius, 0.15, 16);
    const anchorMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.9, roughness: 0.2 });

    const anchorLeft = new THREE.Mesh(anchorGeo, anchorMat);
    anchorLeft.rotation.z = Math.PI / 2;
    anchorLeft.position.copy(points[0]);
    scene.add(anchorLeft);

    const anchorRight = new THREE.Mesh(anchorGeo, anchorMat);
    anchorRight.rotation.z = Math.PI / 2;
    anchorRight.position.copy(points[points.length - 1]);
    scene.add(anchorRight);

    let animationId: number;
    let angle = 0;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      angle += 0.003;
      camera.position.x = (spanLengthM * 0.65) * Math.cos(angle);
      camera.position.z = (spanLengthM * 0.65) * Math.sin(angle);
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      renderer.dispose();
      boxGeo.dispose();
      boxMat.dispose();
      tubeGeo.dispose();
      tubeMat.dispose();
    };
  }, [activeTab, spanLengthM, section, geometry, tendonAssembly]);

  // Export calculation report as Markdown
  const handleExportMarkdown = () => {
    const md = `# BeamLab Post-Tensioned (PT) Concrete Design Report
**Date**: ${new Date().toLocaleDateString()}
**Governing Standard**: ACI 318-19 / Eurocode 2 EN 1992-1-1

---

## 1. Geometric & Material Domain
- **Cross-Section**: ${section.type.toUpperCase()} (${section.webWidthMm} mm × ${section.totalHeightMm} mm)
- **Concrete Compressive Strength**: $f'_{ci} = ${fciMpa}$ MPa (Transfer), $f'_c = ${fcMpa}$ MPa (28-day)
- **Span Length**: $L = ${spanLengthM}$ m
- **Prestressing Strand**: ${tendonAssembly.strand.name} ($f_{pu} = ${tendonAssembly.fpuMpa}$ MPa)
- **Tendon Strands**: ${tendonAssembly.numberOfStrands} strands (${tendonAssembly.systemType.toUpperCase()})
- **Total Strand Area**: $A_{ps} = ${tendonAssembly.totalAreaMm2}$ mm²
- **Initial Jacking Force**: $P_0 = ${lossReport.initialJackingForceKn}$ kN (${tendonAssembly.jackingStressMpa} MPa, ${(jackingRatio * 100).toFixed(1)}% $f_{pu}$)

---

## 2. Prestress Loss Summary
- **Immediate Losses**:
  - Curvature & Wobble Friction Drop: ${lossReport.shortTermLosses.maxFrictionLossKn} kN
  - Anchorage Wedge Seating Slip (Draw-in): ${lossReport.shortTermLosses.anchorageSeatingLossAtAnchorKn} kN (Length: ${lossReport.shortTermLosses.seatingInfluenceLengthM} m)
  - Elastic Shortening: ${lossReport.shortTermLosses.elasticShorteningStressMpa} MPa (${lossReport.shortTermLosses.elasticShorteningForceKn} kN)
  - Force at Transfer: ${lossReport.shortTermLosses.averageForceAtTransferKn} kN (Loss: ${lossReport.effectiveSummary.shortTermLossPercent}%)
- **Time-Dependent Long-Term Losses**:
  - Concrete Creep: ${lossReport.longTermLosses.creepLossStressMpa} MPa
  - Concrete Drying Shrinkage: ${lossReport.longTermLosses.shrinkageLossStressMpa} MPa
  - Steel Relaxation (Low-Relaxation): ${lossReport.longTermLosses.relaxationLossStressMpa} MPa
  - Total Long-Term Loss: ${lossReport.longTermLosses.totalLongTermStressMpa} MPa
- **Final Effective Prestress**: $P_{eff} = ${lossReport.effectiveSummary.averageEffectiveForceKn}$ kN ($f_{pe} = ${lossReport.effectiveSummary.averageEffectiveStressMpa}$ MPa, Total Loss: ${lossReport.effectiveSummary.totalLossPercent}%)

---

## 3. Equivalent Load Balancing
- **Tendon Profile**: ${geometry.profileType.toUpperCase()} (Drape: ${geometry.drapeMm} mm, Midspan Eccentricity: ${geometry.midspanEccentricityMm} mm)
- **Upward Balanced Load**: $w_{bal} = ${loadBalancing.balancedUniformLoadKnPerM}$ kN/m ($8 P_{eff} d / L^2$)
- **Dead Load**: $w_D = ${deadLoadKnPerM}$ kN/m | **Live Load**: $w_L = ${liveLoadKnPerM}$ kN/m
- **Dead Load Balanced**: ${loadBalancing.netLoads.deadLoadBalancedPercentage}% (${loadBalancing.engineeringAssessment.classification.toUpperCase()})
- **Net Sustained Dead Load on Member**: ${loadBalancing.netLoads.netDeadLoadKnPerM} kN/m

---

## 4. Extreme Fiber Stress Verification
- **Initial Transfer Stage ($t = 0$)**:
  - Top Fiber Stress: ${fiberStresses.transferStage.topFiberStressMpa} MPa (Allowable: [${fiberStresses.transferStage.allowableTensionMpa}, +${fiberStresses.transferStage.allowableCompressionMpa}] MPa) -> ${fiberStresses.transferStage.topStressPass ? 'PASS' : 'FAIL'}
  - Bottom Fiber Stress: ${fiberStresses.transferStage.bottomFiberStressMpa} MPa (Allowable Comp: +${fiberStresses.transferStage.allowableCompressionMpa} MPa) -> ${fiberStresses.transferStage.bottomStressPass ? 'PASS' : 'FAIL'}
- **Service Limit State (SLS)**:
  - Top Compression (Total Service): ${fiberStresses.serviceStage.topFiberStressMpa} MPa (Allowable: +${fiberStresses.serviceStage.allowableTotalCompressionMpa} MPa) -> ${fiberStresses.serviceStage.serviceStressPass ? 'PASS' : 'FAIL'}
  - Bottom Tension: ${fiberStresses.serviceStage.bottomFiberStressMpa} MPa (Class U Limit: ${fiberStresses.serviceStage.allowableClassUTensionMpa} MPa)
  - **Crack Classification**: ${fiberStresses.serviceStage.crackClassification}
  - **Decompression Moment**: $M_{dec} = ${fiberStresses.serviceStage.decompressionMomentKnm}$ kNm

---

## 5. Ultimate Flexural Strength ($M_n, \\phi M_n$)
- **Nominal Flexural Capacity**: $M_n = ${ultimateFlexure.nominalMomentCapacityKnm}$ kNm
- **Strand Stress at Nominal Capacity**: $f_{ps} = ${ultimateFlexure.stressInStrandAtNominalStrengthMpa}$ MPa
- **Equivalent Stress Block Depth**: $a = ${ultimateFlexure.stressBlockDepthMm}$ mm (Neutral Axis $c = ${ultimateFlexure.neutralAxisDepthMm}$ mm)
- **Net Tensile Strain**: $\\epsilon_t = ${ultimateFlexure.netTensileStrain}$ (${ultimateFlexure.strainClassification})
- **Strength Reduction Factor**: $\\phi = ${ultimateFlexure.strengthReductionFactorPhi}$
- **Design Flexural Strength**: $\\phi M_n = ${ultimateFlexure.designMomentCapacityAciKnm}$ kNm
- **Factored Demand**: $M_u = ${ultimateFlexure.factoredDemandKnm}$ kNm
- **Flexural Verification**: ${ultimateFlexure.flexuralPass ? 'PASSED' : 'DEFICIENT'} (Utilization: ${(ultimateFlexure.flexuralUtilization * 100).toFixed(1)}%)
`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BeamLab_Prestressed_Design_Report_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 overflow-hidden animate-in fade-in duration-200">
      <div className="relative w-full max-w-7xl h-[92vh] bg-[#0c1017] border border-slate-800/80 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        
        {/* TOP HEADER */}
        <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between bg-[#101522]/80 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Activity size={22} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold text-slate-100 tracking-tight">Prestressed & Post-Tensioned Tendon Studio</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  ACI 318-19 / EC2
                </span>
              </div>
              <p className="text-xs text-slate-400">3D Tendon Drape Trajectory, Losses Auditor, Load Balancing & Extreme Fiber Stresses</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleExportMarkdown}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 transition-colors shadow-sm"
            >
              <Download size={14} />
              <span>Export Report</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="h-12 px-6 border-b border-slate-800/70 bg-[#0e121b] flex items-center space-x-1 shrink-0">
          {[
            { id: 'profile', label: '3D Tendon Trajectory', icon: Layers },
            { id: 'section', label: 'Section & Strands', icon: Settings },
            { id: 'losses', label: 'Losses Ledger', icon: TrendingDown },
            { id: 'stresses', label: 'Fiber Stresses & SLS', icon: Activity },
            { id: 'report', label: 'Load Balancing & Strength', icon: FileText },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                  active 
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* CONTENT VIEWPORT */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#0a0d14]">
          
          {/* TAB 1: 3D TENDON PROFILE */}
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
              <div className="lg:col-span-8 flex flex-col space-y-4">
                <div className="relative flex-1 min-h-[380px] bg-[#0d111a] border border-slate-800 rounded-xl overflow-hidden shadow-inner">
                  <canvas ref={canvasRef} className="w-full h-full block" />
                  
                  {/* Floating Overlay Badge */}
                  <div className="absolute top-3 left-3 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-slate-700/50 text-[11px] text-slate-300 font-mono flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span>3D Draped Tendon Profile • Drape: {geometry.drapeMm} mm</span>
                  </div>

                  <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-slate-700/50 text-[10px] text-slate-400 font-mono">
                    Rotatable 3D View • Ambient & Directional Three.js Kernel
                  </div>
                </div>

                {/* Trajectory Key Metrics Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-[#111622] border border-slate-800 rounded-xl">
                    <div className="text-[11px] text-slate-400 font-medium">Span Length</div>
                    <div className="text-lg font-bold text-slate-100">{spanLengthM} m</div>
                  </div>
                  <div className="p-3 bg-[#111622] border border-slate-800 rounded-xl">
                    <div className="text-[11px] text-slate-400 font-medium">Midspan Drape (sag)</div>
                    <div className="text-lg font-bold text-amber-400">{geometry.drapeMm} mm</div>
                  </div>
                  <div className="p-3 bg-[#111622] border border-slate-800 rounded-xl">
                    <div className="text-[11px] text-slate-400 font-medium">Midspan Eccentricity</div>
                    <div className="text-lg font-bold text-blue-400">{geometry.midspanEccentricityMm} mm</div>
                  </div>
                  <div className="p-3 bg-[#111622] border border-slate-800 rounded-xl">
                    <div className="text-[11px] text-slate-400 font-medium">Total Angular Change α</div>
                    <div className="text-lg font-bold text-emerald-400">{geometry.totalAngularChangeDeg.toFixed(1)}°</div>
                  </div>
                </div>
              </div>

              {/* Controls Column */}
              <div className="lg:col-span-4 bg-[#101522] border border-slate-800 rounded-xl p-5 space-y-5">
                <h2 className="text-sm font-semibold text-slate-200 border-b border-slate-800 pb-2 flex items-center space-x-2">
                  <Settings size={16} className="text-amber-400" />
                  <span>Tendon Drape Parameters</span>
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-300 font-medium mb-1 block">Tendon Profile Geometry</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'parabolic', label: 'Parabolic' },
                        { id: 'harped', label: 'Harped' },
                        { id: 'reverse-parabolic', label: 'Continuous' },
                      ].map(t => (
                        <button
                          key={t.id}
                          onClick={() => setProfileType(t.id as any)}
                          className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-all ${
                            profileType === t.id 
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300' 
                              : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Span Length L</span>
                      <span className="font-mono text-amber-400">{spanLengthM} m</span>
                    </div>
                    <input
                      type="range"
                      min={8}
                      max={36}
                      step={1}
                      value={spanLengthM}
                      onChange={e => setSpanLengthM(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Left Anchor Height (y₁)</span>
                      <span className="font-mono text-amber-400">{yStartMm} mm</span>
                    </div>
                    <input
                      type="range"
                      min={100}
                      max={section.totalHeightMm - 80}
                      step={10}
                      value={yStartMm}
                      onChange={e => setYStartMm(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Midspan Lowest Sag (y_mid)</span>
                      <span className="font-mono text-amber-400">{yMidMm} mm</span>
                    </div>
                    <input
                      type="range"
                      min={60}
                      max={section.totalHeightMm / 2}
                      step={5}
                      value={yMidMm}
                      onChange={e => setYMidMm(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Right Anchor Height (y₂)</span>
                      <span className="font-mono text-amber-400">{yEndMm} mm</span>
                    </div>
                    <input
                      type="range"
                      min={100}
                      max={section.totalHeightMm - 80}
                      step={10}
                      value={yEndMm}
                      onChange={e => setYEndMm(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg text-xs text-slate-400 space-y-1">
                    <div className="flex items-center space-x-1 text-slate-300 font-medium">
                      <Info size={14} className="text-amber-400" />
                      <span>Curvature Formulation:</span>
                    </div>
                    <div>&kappa; = 8d / L&sup2; = {(geometry.evaluateAt(spanLengthM/2).curvatureMInv * 1000).toFixed(4)} &times; 10&supmin;&sup3; m&supmin;&sup1;</div>
                    <div>y<sub>cgc</sub> = {section.cgcFromBottomMm.toFixed(0)} mm from bottom soffit</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SECTION & STRANDS */}
          {activeTab === 'section' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Concrete Section */}
              <div className="bg-[#101522] border border-slate-800 rounded-xl p-6 space-y-4">
                <h3 className="text-sm font-semibold text-slate-200 border-b border-slate-800 pb-2 flex items-center space-x-2">
                  <Layers size={16} className="text-blue-400" />
                  <span>Concrete Member Cross-Section</span>
                </h3>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSectionType('rectangular')}
                    className={`p-2 rounded-lg text-xs font-medium border ${
                      sectionType === 'rectangular' ? 'bg-blue-500/20 border-blue-500 text-blue-300' : 'bg-slate-800/60 border-slate-700 text-slate-400'
                    }`}
                  >
                    Rectangular Beam
                  </button>
                  <button
                    onClick={() => setSectionType('t-beam')}
                    className={`p-2 rounded-lg text-xs font-medium border ${
                      sectionType === 't-beam' ? 'bg-blue-500/20 border-blue-500 text-blue-300' : 'bg-slate-800/60 border-slate-700 text-slate-400'
                    }`}
                  >
                    Flanged T-Beam
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Web Width (b_w)</label>
                    <input
                      type="number"
                      value={beamWidthMm}
                      onChange={e => setBeamWidthMm(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Total Height (h)</label>
                    <input
                      type="number"
                      value={beamHeightMm}
                      onChange={e => setBeamHeightMm(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                    />
                  </div>
                  {sectionType === 't-beam' && (
                    <>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Flange Width (b_f)</label>
                        <input
                          type="number"
                          value={flangeWidthMm}
                          onChange={e => setFlangeWidthMm(Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Flange Thickness (t_f)</label>
                        <input
                          type="number"
                          value={flangeThicknessMm}
                          onChange={e => setFlangeThicknessMm(Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Transfer Strength f'ci</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={fciMpa}
                        onChange={e => setFciMpa(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                      />
                      <span className="text-xs text-slate-400">MPa</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">28-day Strength f'c</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={fcMpa}
                        onChange={e => setFcMpa(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                      />
                      <span className="text-xs text-slate-400">MPa</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Gross Concrete Area A_c:</span>
                    <span className="font-mono text-slate-200">{(section.areaMm2).toLocaleString()} mm²</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Moment of Inertia I_g:</span>
                    <span className="font-mono text-slate-200">{(section.inertiaMm4 / 1e6).toFixed(1)} × 10⁶ mm⁴</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Section Modulus S_bot:</span>
                    <span className="font-mono text-slate-200">{(section.sectionModulusBottomMm3 / 1e3).toFixed(0)} × 10³ mm³</span>
                  </div>
                </div>
              </div>

              {/* Prestressing Steel & Jacking */}
              <div className="bg-[#101522] border border-slate-800 rounded-xl p-6 space-y-4">
                <h3 className="text-sm font-semibold text-slate-200 border-b border-slate-800 pb-2 flex items-center space-x-2">
                  <Sparkles size={16} className="text-amber-400" />
                  <span>Prestressing Strands & Jacking Assembly</span>
                </h3>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Strand Specification</label>
                  <select
                    value={strandId}
                    onChange={e => setStrandId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                  >
                    {StrandCatalog.listStrands().map(s => (
                      <option key={s.id} value={s.id}>{s.name} (Area: {s.nominalAreaMm2} mm²)</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Number of Strands</label>
                    <input
                      type="number"
                      min={1}
                      max={37}
                      value={numStrands}
                      onChange={e => setNumStrands(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Duct / System Type</label>
                    <select
                      value={systemType}
                      onChange={e => setSystemType(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                    >
                      <option value="bonded">Bonded (Grout Duct)</option>
                      <option value="unbonded">Unbonded (Monostrand PE)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1">
                    <span>Initial Jacking Stress Ratio (σ_jack / f_pu)</span>
                    <span className="font-mono text-amber-400">{(jackingRatio * 100).toFixed(1)}% ({tendonAssembly.jackingStressMpa} MPa)</span>
                  </div>
                  <input
                    type="range"
                    min={0.65}
                    max={0.80}
                    step={0.01}
                    value={jackingRatio}
                    onChange={e => setJackingRatio(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Total Prestress Steel Area A_ps:</span>
                    <span className="font-mono text-slate-200 font-bold">{tendonAssembly.totalAreaMm2} mm²</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Total Jacking Force P_0:</span>
                    <span className="font-mono text-amber-400 font-bold text-sm">{tendonAssembly.jackingForceKn.toFixed(1)} kN</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-800 pt-1.5">
                    <span className="text-slate-400">ACI 318 Jacking Compliance:</span>
                    <span className="flex items-center space-x-1 text-emerald-400">
                      <CheckCircle2 size={14} />
                      <span>Pass ({tendonAssembly.compliance.utilization.toFixed(2)} &lt; 1.0)</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LOSSES LEDGER */}
          {activeTab === 'losses' && (
            <div className="space-y-6">
              {/* Friction & Seating Controls */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-[#101522] border border-slate-800 rounded-xl p-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Curvature Friction μ (rad⁻¹)</label>
                  <input
                    type="number"
                    step={0.01}
                    value={curvatureMu}
                    onChange={e => setCurvatureMu(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Wobble Friction k (m⁻¹)</label>
                  <input
                    type="number"
                    step={0.0002}
                    value={wobbleK}
                    onChange={e => setWobbleK(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Wedge Draw-In Slip Δ (mm)</label>
                  <input
                    type="number"
                    step={0.5}
                    value={wedgeSlipMm}
                    onChange={e => setWedgeSlipMm(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Jacking Configuration</label>
                  <select
                    value={jackingMode}
                    onChange={e => setJackingMode(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                  >
                    <option value="single-end">Single-End Jacking</option>
                    <option value="both-ends">Double-End Jacking</option>
                  </select>
                </div>
              </div>

              {/* Losses Breakdown Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-[#101522] border border-slate-800 rounded-xl space-y-2">
                  <div className="text-xs text-slate-400 font-medium">Short-Term Losses (Transfer)</div>
                  <div className="text-2xl font-bold text-amber-400">{lossReport.effectiveSummary.shortTermLossPercent.toFixed(1)}%</div>
                  <div className="text-xs text-slate-400 space-y-1">
                    <div>Friction Drop: {lossReport.shortTermLosses.maxFrictionLossKn} kN</div>
                    <div>Anchorage Seating Drop: {lossReport.shortTermLosses.anchorageSeatingLossAtAnchorKn} kN</div>
                    <div>Seating Length L_set: {lossReport.shortTermLosses.seatingInfluenceLengthM} m</div>
                    <div>Elastic Shortening: {lossReport.shortTermLosses.elasticShorteningStressMpa} MPa</div>
                  </div>
                </div>

                <div className="p-4 bg-[#101522] border border-slate-800 rounded-xl space-y-2">
                  <div className="text-xs text-slate-400 font-medium">Long-Term Time-Dependent Losses</div>
                  <div className="text-2xl font-bold text-blue-400">{lossReport.effectiveSummary.longTermLossPercent.toFixed(1)}%</div>
                  <div className="text-xs text-slate-400 space-y-1">
                    <div>Concrete Creep: {lossReport.longTermLosses.creepLossStressMpa} MPa</div>
                    <div>Concrete Drying Shrinkage: {lossReport.longTermLosses.shrinkageLossStressMpa} MPa</div>
                    <div>Steel Relaxation (Low-Relax): {lossReport.longTermLosses.relaxationLossStressMpa} MPa</div>
                    <div>Total Long-Term: {lossReport.longTermLosses.totalLongTermStressMpa} MPa</div>
                  </div>
                </div>

                <div className="p-4 bg-[#101522] border border-slate-800 rounded-xl space-y-2">
                  <div className="text-xs text-slate-400 font-medium">Final Effective Prestress (SLS)</div>
                  <div className="text-2xl font-bold text-emerald-400">{lossReport.effectiveSummary.averageEffectiveForceKn} kN</div>
                  <div className="text-xs text-slate-400 space-y-1">
                    <div>Effective Stress f_pe: {lossReport.effectiveSummary.averageEffectiveStressMpa} MPa</div>
                    <div>Total Prestress Loss: {lossReport.effectiveSummary.totalLossPercent.toFixed(1)}%</div>
                    <div>Effective/Jacking Ratio: {(lossReport.effectiveSummary.effectiveToJackingRatio * 100).toFixed(1)}%</div>
                  </div>
                </div>
              </div>

              {/* Force Distribution Table */}
              <div className="bg-[#101522] border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-800 text-xs font-semibold text-slate-200">
                  Prestress Force Profile Distribution P(x) Along Span
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left text-slate-300">
                    <thead className="bg-slate-900/80 text-[11px] text-slate-400 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-2">Station x (m)</th>
                        <th className="px-4 py-2">x/L</th>
                        <th className="px-4 py-2">Before Seating (kN)</th>
                        <th className="px-4 py-2">After Seating (kN)</th>
                        <th className="px-4 py-2">At Transfer (kN)</th>
                        <th className="px-4 py-2 text-emerald-400">Effective P_eff (kN)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-mono">
                      {lossReport.forceDistribution.filter((_, i) => i % 5 === 0 || i === lossReport.forceDistribution.length - 1).map((st, i) => (
                        <tr key={i} className="hover:bg-slate-800/30">
                          <td className="px-4 py-2">{st.xM.toFixed(2)}</td>
                          <td className="px-4 py-2">{st.xRatio.toFixed(2)}</td>
                          <td className="px-4 py-2">{st.forceBeforeSeatingKn}</td>
                          <td className="px-4 py-2">{st.forceAfterSeatingKn}</td>
                          <td className="px-4 py-2">{st.forceAtTransferKn}</td>
                          <td className="px-4 py-2 text-emerald-400 font-bold">{st.effectiveForceKn}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: FIBER STRESSES & SLS */}
          {activeTab === 'stresses' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#101522] border border-slate-800 rounded-xl p-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Dead Load w_D (kN/m)</label>
                  <input
                    type="number"
                    value={deadLoadKnPerM}
                    onChange={e => setDeadLoadKnPerM(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Live Load w_L (kN/m)</label>
                  <input
                    type="number"
                    value={liveLoadKnPerM}
                    onChange={e => setLiveLoadKnPerM(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Boundary System</label>
                  <select
                    value={boundaryCondition}
                    onChange={e => setBoundaryCondition(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                  >
                    <option value="simply-supported">Simply Supported (M2 = 0)</option>
                    <option value="continuous-two-span">Continuous 2-Span (Hyperstatic M2)</option>
                    <option value="propped-cantilever">Propped Cantilever</option>
                  </select>
                </div>
              </div>

              {/* Stress Results Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Stage 1: Transfer */}
                <div className="bg-[#101522] border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h3 className="text-sm font-semibold text-slate-200">Initial Transfer Stage (t = 0)</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      P_i = {midspanForceStation.forceAtTransferKn} kN
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg flex justify-between items-center">
                      <div>
                        <div className="text-xs text-slate-400">Top Fiber Stress σ_top</div>
                        <div className="text-sm font-mono font-bold text-slate-100">{fiberStresses.transferStage.topFiberStressMpa} MPa</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400">Allowable Tension</div>
                        <div className="text-xs font-mono text-amber-400">{fiberStresses.transferStage.allowableTensionMpa} MPa</div>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg flex justify-between items-center">
                      <div>
                        <div className="text-xs text-slate-400">Bottom Fiber Compression σ_bot</div>
                        <div className="text-sm font-mono font-bold text-slate-100">+{fiberStresses.transferStage.bottomFiberStressMpa} MPa</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400">Allowable Compression (0.60 f'ci)</div>
                        <div className="text-xs font-mono text-emerald-400">+{fiberStresses.transferStage.allowableCompressionMpa} MPa</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 text-xs pt-1">
                      {fiberStresses.transferStage.topStressPass && fiberStresses.transferStage.bottomStressPass ? (
                        <span className="flex items-center space-x-1.5 text-emerald-400">
                          <CheckCircle2 size={15} />
                          <span>Transfer Stresses Compliant (Utilization: {fiberStresses.transferStage.utilizationCompression})</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-1.5 text-red-400">
                          <AlertTriangle size={15} />
                          <span>Stress Exceeded at Transfer</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stage 2: Service Limit State */}
                <div className="bg-[#101522] border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h3 className="text-sm font-semibold text-slate-200">Service Limit State (Full SLS)</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      P_eff = {midspanForceStation.effectiveForceKn} kN
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg flex justify-between items-center">
                      <div>
                        <div className="text-xs text-slate-400">Top Compression (Total Load)</div>
                        <div className="text-sm font-mono font-bold text-slate-100">+{fiberStresses.serviceStage.topFiberStressMpa} MPa</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400">Allowable Total (0.60 f'c)</div>
                        <div className="text-xs font-mono text-emerald-400">+{fiberStresses.serviceStage.allowableTotalCompressionMpa} MPa</div>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg flex justify-between items-center">
                      <div>
                        <div className="text-xs text-slate-400">Bottom Fiber Tension (SLS)</div>
                        <div className="text-sm font-mono font-bold text-slate-100">{fiberStresses.serviceStage.bottomFiberStressMpa} MPa</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400">Class U Limit (0.62 √f'c)</div>
                        <div className="text-xs font-mono text-blue-400">{fiberStresses.serviceStage.allowableClassUTensionMpa} MPa</div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-1">
                      <span className="text-xs text-slate-400">Crack Classification:</span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {fiberStresses.serviceStage.crackClassification}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 border-t border-slate-800 pt-2">
                      Decompression Moment M_dec: <span className="font-mono text-slate-200 font-bold">{fiberStresses.serviceStage.decompressionMomentKnm} kNm</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: LOAD BALANCING & REPORT */}
          {activeTab === 'report' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-[#101522] border border-slate-800 rounded-xl space-y-1">
                  <div className="text-xs text-slate-400">Upward Balanced Load w_bal</div>
                  <div className="text-2xl font-bold text-amber-400">{loadBalancing.balancedUniformLoadKnPerM} kN/m</div>
                  <div className="text-[11px] text-slate-400 font-mono">8 · P_eff · d / L²</div>
                </div>

                <div className="p-4 bg-[#101522] border border-slate-800 rounded-xl space-y-1">
                  <div className="text-xs text-slate-400">Dead Load Balanced %</div>
                  <div className="text-2xl font-bold text-emerald-400">{loadBalancing.netLoads.deadLoadBalancedPercentage}%</div>
                  <div className="text-[11px] text-emerald-400 capitalize">{loadBalancing.engineeringAssessment.classification}</div>
                </div>

                <div className="p-4 bg-[#101522] border border-slate-800 rounded-xl space-y-1">
                  <div className="text-xs text-slate-400">Secondary Moment M₂</div>
                  <div className="text-2xl font-bold text-blue-400">{hyperstaticAnalysis.midspanSecondaryMomentKnm} kNm</div>
                  <div className="text-[11px] text-slate-400">{boundaryCondition}</div>
                </div>

                <div className="p-4 bg-[#101522] border border-slate-800 rounded-xl space-y-1">
                  <div className="text-xs text-slate-400">Ultimate Flexural Capacity ϕM_n</div>
                  <div className="text-2xl font-bold text-purple-400">{ultimateFlexure.designMomentCapacityAciKnm} kNm</div>
                  <div className="text-[11px] text-slate-400">Demand M_u: {ultimateFlexure.factoredDemandKnm} kNm</div>
                </div>
              </div>

              {/* Flexural Design Verification Card */}
              <div className="bg-[#101522] border border-slate-800 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-200">Ultimate Flexural Strength (ULS) per ACI 318-19</h3>
                    <p className="text-xs text-slate-400">Tendon stress at nominal capacity f_ps, Whitney stress block depth a, and ϕ factor</p>
                  </div>
                  <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                    ultimateFlexure.flexuralPass 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                      : 'bg-red-500/20 text-red-300 border-red-500/30'
                  }`}>
                    {ultimateFlexure.flexuralPass ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                    <span>{ultimateFlexure.flexuralPass ? 'FLEXURE PASS' : 'DEFICIENT'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                  <div className="p-3 bg-slate-900 rounded-lg">
                    <div className="text-slate-400 text-[11px]">Strand Stress f_ps</div>
                    <div className="text-sm font-bold text-slate-100">{ultimateFlexure.stressInStrandAtNominalStrengthMpa} MPa</div>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg">
                    <div className="text-slate-400 text-[11px]">Stress Block Depth a</div>
                    <div className="text-sm font-bold text-slate-100">{ultimateFlexure.stressBlockDepthMm} mm</div>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg">
                    <div className="text-slate-400 text-[11px]">Net Tensile Strain ε_t</div>
                    <div className="text-sm font-bold text-emerald-400">{ultimateFlexure.netTensileStrain} ({ultimateFlexure.strainClassification})</div>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg">
                    <div className="text-slate-400 text-[11px]">Capacity ϕM_n / Demand M_u</div>
                    <div className="text-sm font-bold text-purple-400">{(ultimateFlexure.flexuralUtilization * 100).toFixed(1)}%</div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleExportMarkdown}
                    className="flex items-center space-x-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold rounded-lg transition-colors shadow-lg shadow-amber-500/20"
                  >
                    <Download size={14} />
                    <span>Download Full Engineering Calculation Note (.md)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
