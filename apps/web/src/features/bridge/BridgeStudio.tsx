import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Truck, 
  TrendingUp, 
  Activity, 
  X, 
  Download, 
  Play, 
  Pause, 
  RotateCcw, 
  Sliders, 
  Layers,
  ShieldCheck,
  Info
} from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  VehicularCatalog,
  InfluenceLineEngine,
  MovingLoadAnalyzer,
  GirderDistributionEngine,
  BridgeDynamicForcesEngine,
  BridgeActionType,
  BridgeStandard
} from '@beamstudio/bridge-engine';

interface BridgeStudioProps {
  onClose: () => void;
}

export const BridgeStudio: React.FC<BridgeStudioProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'simulation' | 'vehicles' | 'influence' | 'distribution' | 'envelopes'>('simulation');

  // Superstructure Parameters
  const [spanLengthM, setSpanLengthM] = useState<number>(25.0);
  const [girderSpacingM, setGirderSpacingM] = useState<number>(2.4);
  const [numberOfGirders, setNumberOfGirders] = useState<number>(5);
  const [slabThicknessMm, setSlabThicknessMm] = useState<number>(200.0);
  const [girderDepthMm, setGirderDepthMm] = useState<number>(1600.0);
  const [skewAngleDeg, setSkewAngleDeg] = useState<number>(0.0);
  const [deckConcreteFcMpa, setDeckConcreteFcMpa] = useState<number>(35.0);
  const [girderModulusGpa, setGirderModulusGpa] = useState<number>(35.0);

  // Vehicle Parameters
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('aashto-hl93-truck');
  const [standardFilter, setStandardFilter] = useState<BridgeStandard | 'ALL'>('ALL');
  const [rearSpacingM, setRearSpacingM] = useState<number>(4.3); // For HL-93 truck variable spacing

  // Moving Vehicle Animation State
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [truckSpeedKph, setTruckSpeedKph] = useState<number>(60.0);
  const [truckHeadPositionM, setTruckHeadPositionM] = useState<number>(10.0);

  // Influence Line State
  const [influenceAction, setInfluenceAction] = useState<BridgeActionType>('moment');
  const [influenceStationRatio, setInfluenceStationRatio] = useState<number>(0.5); // x0 / L

  // 3D Canvas Ref
  const mountRef = useRef<HTMLDivElement>(null);
  const truckGroupRef = useRef<THREE.Group | null>(null);

  // Selected vehicle train
  const activeVehicle = useMemo(() => {
    if (selectedVehicleId === 'aashto-hl93-truck') {
      return VehicularCatalog.getAashtoHL93Truck(rearSpacingM);
    }
    const found = VehicularCatalog.getVehicleById(selectedVehicleId);
    return found ?? VehicularCatalog.getAashtoHL93Truck();
  }, [selectedVehicleId, rearSpacingM]);

  // Available vehicles list
  const availableVehicles = useMemo(() => {
    return VehicularCatalog.getAllVehicles(standardFilter === 'ALL' ? undefined : standardFilter);
  }, [standardFilter]);

  // Girder Distribution Factors
  const distributionResult = useMemo(() => {
    const girderAreaM2 = 0.52; // standard bulb-tee or plate girder
    const girderMomentOfInertiaM4 = 0.125;
    return GirderDistributionEngine.calculateDistributionFactors({
      spanLengthM,
      girderSpacingM,
      slabThicknessMm,
      numberOfGirders,
      girderAreaM2,
      girderMomentOfInertiaM4,
      girderDepthMm,
      deckConcreteFcMpa,
      girderModulusGpa,
      overhangWidthM: 1.0,
      skewAngleDeg,
    });
  }, [spanLengthM, girderSpacingM, slabThicknessMm, numberOfGirders, girderDepthMm, deckConcreteFcMpa, girderModulusGpa, skewAngleDeg]);

  // Moving Load Analysis Envelope
  const envelopeResult = useMemo(() => {
    return MovingLoadAnalyzer.analyzeSimpleSpan({
      spanLengthM,
      vehicle: activeVehicle,
      stepSizeM: 0.1,
      numberOfStations: 25,
      sectionModulusM3: 0.028,
    });
  }, [spanLengthM, activeVehicle]);

  // Influence Line at selected station
  const influenceLine = useMemo(() => {
    const x0 = spanLengthM * influenceStationRatio;
    return InfluenceLineEngine.generateSimpleSpanInfluenceLine({
      spanLengthM,
      actionType: influenceAction,
      evaluationStationM: x0,
      samplesCount: 61,
    });
  }, [spanLengthM, influenceAction, influenceStationRatio]);

  // Bridge Dynamic Forces
  const dynamicReport = useMemo(() => {
    const impacts = BridgeDynamicForcesEngine.calculateDynamicImpact({
      spanLengthM,
      bridgeMaterial: 'concrete',
      limitState: 'strength',
    });
    const centrifugal = BridgeDynamicForcesEngine.calculateCentrifugalForce({
      truckWeightKn: activeVehicle.totalWeightKn,
      designSpeedKph: truckSpeedKph,
      curveRadiusM: 500.0,
      girderDepthMm,
      numberOfLoadedLanes: 2,
    });
    const braking = BridgeDynamicForcesEngine.calculateBrakingForce({
      truckWeightKn: activeVehicle.totalWeightKn,
      laneLengthM: spanLengthM,
      numberOfLoadedLanes: 2,
    });
    return {
      impacts,
      centrifugal,
      braking,
    };
  }, [spanLengthM, activeVehicle, truckSpeedKph, girderDepthMm]);

  // Animation loop for moving truck
  useEffect(() => {
    if (!isPlaying) return;

    const truckLength = activeVehicle.overallLengthM;
    const minX = -truckLength;
    const maxX = spanLengthM + truckLength;
    const speedMs = (truckSpeedKph * 1000.0) / 3600.0;

    let lastTime = performance.now();
    let animId: number;

    const tick = (now: number) => {
      const dt = (now - lastTime) / 1000.0;
      lastTime = now;

      setTruckHeadPositionM(prev => {
        const next = prev + speedMs * dt;
        return next > maxX ? minX : next;
      });

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, truckSpeedKph, spanLengthM, activeVehicle.overallLengthM]);

  // Update 3D truck position when truckHeadPositionM changes
  useEffect(() => {
    if (truckGroupRef.current) {
      // Map x from [0, spanLengthM] to Three.js coordinates [-spanLengthM/2, spanLengthM/2]
      const threeX = truckHeadPositionM - spanLengthM / 2;
      truckGroupRef.current.position.x = threeX;
    }
  }, [truckHeadPositionM, spanLengthM]);

  // 3D Three.js Scene Setup
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 450;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1d);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(spanLengthM * 0.8, spanLengthM * 0.5, spanLengthM * 0.9);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0, 0);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(30, 40, 30);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const blueRimLight = new THREE.PointLight(0x38bdf8, 2.5, 80);
    blueRimLight.position.set(-spanLengthM / 2, 5, -10);
    scene.add(blueRimLight);

    const amberRimLight = new THREE.PointLight(0xf59e0b, 2.5, 80);
    amberRimLight.position.set(spanLengthM / 2, 5, 10);
    scene.add(amberRimLight);

    // Water/Terrain surface underneath
    const waterGeo = new THREE.PlaneGeometry(spanLengthM * 3, spanLengthM * 3);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x051329,
      roughness: 0.1,
      metalness: 0.8,
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -6.0;
    scene.add(water);

    // Bridge Group
    const bridgeGroup = new THREE.Group();
    scene.add(bridgeGroup);

    const deckWidthM = (numberOfGirders - 1) * girderSpacingM + 2.0; // deck width with overhangs
    const deckThicknessM = slabThicknessMm / 1000.0;
    const girderDepthM = girderDepthMm / 1000.0;

    // 1. Concrete Deck Slab
    const deckGeo = new THREE.BoxGeometry(spanLengthM, deckThicknessM, deckWidthM);
    const deckMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // asphalt/concrete
      roughness: 0.7,
      metalness: 0.1,
    });
    const deckMesh = new THREE.Mesh(deckGeo, deckMat);
    deckMesh.position.y = girderDepthM / 2 + deckThicknessM / 2;
    deckMesh.receiveShadow = true;
    bridgeGroup.add(deckMesh);

    // 2. Road Markings (Dashed white center line)
    const lineGroup = new THREE.Group();
    const dashLength = 2.0;
    const dashGap = 2.0;
    const numDashes = Math.floor(spanLengthM / (dashLength + dashGap));
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let i = 0; i < numDashes; i++) {
      const dashGeo = new THREE.PlaneGeometry(dashLength, 0.18);
      const dash = new THREE.Mesh(dashGeo, dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(-spanLengthM / 2 + i * (dashLength + dashGap) + dashLength / 2, deckMesh.position.y + deckThicknessM / 2 + 0.01, 0);
      lineGroup.add(dash);
    }
    bridgeGroup.add(lineGroup);

    // 3. Concrete Jersey Safety Barriers
    const barrierMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.6 });
    const barrierGeo = new THREE.BoxGeometry(spanLengthM, 0.8, 0.4);
    const leftBarrier = new THREE.Mesh(barrierGeo, barrierMat);
    leftBarrier.position.set(0, deckMesh.position.y + 0.4, -deckWidthM / 2 + 0.2);
    bridgeGroup.add(leftBarrier);

    const rightBarrier = new THREE.Mesh(barrierGeo, barrierMat);
    rightBarrier.position.set(0, deckMesh.position.y + 0.4, deckWidthM / 2 - 0.2);
    bridgeGroup.add(rightBarrier);

    // 4. Parallel Girders (Steel/Precast I-sections)
    const girderMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.7,
      roughness: 0.3,
    });
    for (let g = 0; g < numberOfGirders; g++) {
      const zPos = -((numberOfGirders - 1) * girderSpacingM) / 2 + g * girderSpacingM;

      // Web
      const webGeo = new THREE.BoxGeometry(spanLengthM, girderDepthM, 0.08);
      const web = new THREE.Mesh(webGeo, girderMat);
      web.position.set(0, 0, zPos);
      bridgeGroup.add(web);

      // Bottom Flange
      const bFlangeGeo = new THREE.BoxGeometry(spanLengthM, 0.08, 0.45);
      const bFlange = new THREE.Mesh(bFlangeGeo, girderMat);
      bFlange.position.set(0, -girderDepthM / 2, zPos);
      bridgeGroup.add(bFlange);
    }

    // 5. Abutments & Piers
    const concretePierMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 });
    // Left Pier / Abutment
    const leftPierGeo = new THREE.BoxGeometry(2.0, 5.0, deckWidthM + 1.0);
    const leftPier = new THREE.Mesh(leftPierGeo, concretePierMat);
    leftPier.position.set(-spanLengthM / 2, -girderDepthM / 2 - 2.5, 0);
    bridgeGroup.add(leftPier);

    // Right Pier / Abutment
    const rightPierGeo = new THREE.BoxGeometry(2.0, 5.0, deckWidthM + 1.0);
    const rightPier = new THREE.Mesh(rightPierGeo, concretePierMat);
    rightPier.position.set(spanLengthM / 2, -girderDepthM / 2 - 2.5, 0);
    bridgeGroup.add(rightPier);

    // 6. 3D Moving Truck Model
    const truckGroup = new THREE.Group();
    truckGroupRef.current = truckGroup;
    scene.add(truckGroup);

    // Truck Cab
    const cabMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.6, roughness: 0.3 });
    const cabGeo = new THREE.BoxGeometry(2.2, 1.8, 1.9);
    const cab = new THREE.Mesh(cabGeo, cabMat);
    cab.position.set(1.0, deckMesh.position.y + deckThicknessM / 2 + 1.2, 0);
    truckGroup.add(cab);

    // Truck Windshield
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, opacity: 0.8, transparent: true });
    const glassGeo = new THREE.BoxGeometry(0.8, 0.7, 1.8);
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.set(1.6, deckMesh.position.y + deckThicknessM / 2 + 1.4, 0);
    truckGroup.add(glass);

    // Truck Trailer / Chassis Bed
    const bedMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.4 });
    const truckLen = activeVehicle.overallLengthM;
    const bedGeo = new THREE.BoxGeometry(Math.max(4.0, truckLen + 1.0), 0.5, 2.0);
    const bed = new THREE.Mesh(bedGeo, bedMat);
    bed.position.set(-truckLen / 2 + 0.5, deckMesh.position.y + deckThicknessM / 2 + 0.5, 0);
    truckGroup.add(bed);

    // Wheel Axles & Contact Force Arrows
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
    const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.3, 16);
    wheelGeo.rotateX(Math.PI / 2);

    const arrowMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    const offsets = VehicularCatalog.getAxleOffsetsFromFront(activeVehicle);
    offsets.forEach((offset) => {
      const axleX = -offset;
      const yWheel = deckMesh.position.y + deckThicknessM / 2 + 0.45;

      // Left wheel
      const leftWheel = new THREE.Mesh(wheelGeo, wheelMat);
      leftWheel.position.set(axleX, yWheel, -0.9);
      truckGroup.add(leftWheel);

      // Right wheel
      const rightWheel = new THREE.Mesh(wheelGeo, wheelMat);
      rightWheel.position.set(axleX, yWheel, 0.9);
      truckGroup.add(rightWheel);

      // Downward load indicator arrow
      const arrowGeo = new THREE.ConeGeometry(0.2, 0.6, 8);
      arrowGeo.rotateX(Math.PI);
      const arrow = new THREE.Mesh(arrowGeo, arrowMat);
      arrow.position.set(axleX, yWheel + 1.5, 0);
      truckGroup.add(arrow);

      const shaftGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8);
      const shaft = new THREE.Mesh(shaftGeo, arrowMat);
      shaft.position.set(axleX, yWheel + 1.9, 0);
      truckGroup.add(shaft);
    });

    let resizeAnimId: number;
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    const animate = () => {
      resizeAnimId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(resizeAnimId);
      controls.dispose();
      renderer.dispose();
    };
  }, [spanLengthM, girderSpacingM, numberOfGirders, slabThicknessMm, girderDepthMm, activeVehicle]);

  // Export calculation report
  const handleExportReport = () => {
    const report = `# BeamLab Bridge Engineering & Moving Load Calculation Note

## Project Information
- **Standard**: ${activeVehicle.standard}
- **Bridge Span**: ${spanLengthM} m (Simply Supported Highway Bridge)
- **Deck Geometry**: ${numberOfGirders} parallel girders @ ${girderSpacingM} m spacing (Total width: ${((numberOfGirders - 1) * girderSpacingM + 2.0).toFixed(2)} m)
- **Deck Slab Thickness**: ${slabThicknessMm} mm | **Girder Depth**: ${girderDepthMm} mm
- **Support Skew Angle**: ${skewAngleDeg}&deg;

---

## 1. Design Vehicular Live Load Model
- **Vehicle Name**: ${activeVehicle.name}
- **Category**: ${activeVehicle.category.toUpperCase()}
- **Total Vehicle Weight**: ${activeVehicle.totalWeightKn} kN (${(activeVehicle.totalWeightKn / 9.81).toFixed(1)} tonnes)
- **Overall Length**: ${activeVehicle.overallLengthM} m across ${activeVehicle.axles.length} axles
- **Design Lane Load**: ${activeVehicle.hasAssociatedLaneLoad ? `${activeVehicle.laneLoadKnPerM} kN/m` : 'None'}
- **Dynamic Load Allowance (IM)**: ${(envelopeResult.dynamicAllowance * 100).toFixed(0)}%

---

## 2. AASHTO LRFD Section 4.6.2.2 Girder Distribution Factors (LLDF)
- **Longitudinal Stiffness**: $K_g = ${distributionResult.longitudinalStiffnessKgM4.toFixed(4)}$ m&sup4;
- **Interior Girder Moment Factor**:
  - One Lane: $g_{m1} = ${distributionResult.momentInteriorOneLane}$
  - Two+ Lanes: $g_{m2} = ${distributionResult.momentInteriorMultiLane}$
  - **Governing Interior $g_m$**: **${distributionResult.governingMomentInterior}**
- **Interior Girder Shear Factor**:
  - One Lane: $g_{v1} = ${distributionResult.shearInteriorOneLane}$
  - Two+ Lanes: $g_{v2} = ${distributionResult.shearInteriorMultiLane}$
  - **Governing Interior $g_v$**: **${distributionResult.governingShearInterior}**
- **Exterior Girder Factors**:
  - Moment: $g_{m,ext} = ${distributionResult.governingMomentExterior}$
  - Shear: $g_{v,ext} = ${distributionResult.governingShearExterior}$
- **Skew Correction Factors**:
  - Moment Skew Factor: ${distributionResult.skewCorrectionFactorMoment}
  - Shear Skew Factor (Obtuse Corner): ${distributionResult.skewCorrectionFactorShear}

---

## 3. Governing Critical Moving Load Envelopes
- **Maximum Bending Moment**: **${envelopeResult.governingMaxMoment.value.toFixed(1)} kNm**
  - Location: Station x = ${envelopeResult.governingMaxMoment.stationM.toFixed(1)} m
  - Truck Component: ${envelopeResult.governingMaxMoment.truckContributionKnOrKNm.toFixed(1)} kNm (&times; 1.${(envelopeResult.dynamicAllowance * 100).toFixed(0)})
  - Lane Component: ${envelopeResult.governingMaxMoment.laneContributionKnOrKNm.toFixed(1)} kNm
- **Maximum Shear Force**: **${envelopeResult.governingMaxShear.value.toFixed(1)} kN**
  - Location: Support Station x = ${envelopeResult.governingMaxShear.stationM.toFixed(1)} m
- **Support Reactions**:
  - Left Abutment $R_A$: ${envelopeResult.governingMaxReactionLeft.value.toFixed(1)} kN
  - Right Abutment $R_B$: ${envelopeResult.governingMaxReactionRight.value.toFixed(1)} kN

---

## 4. Fatigue Limit State & Dynamic Lateral Forces
- **Fatigue Moment Range**: $\\Delta M_{fat} = ${envelopeResult.maxFatigueMomentRangeKNm.toFixed(1)}$ kNm (Single Fatigue Truck, IM = 15%)
- **Centrifugal Lateral Force**: ${dynamicReport.centrifugal.forceKn} kN (Overturning Moment: ${dynamicReport.centrifugal.overturningMomentKNm} kNm)
- **Braking Longitudinal Force**: ${dynamicReport.braking.forceKn} kN (${dynamicReport.braking.governingCriteria})
`;

    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bridge_Live_Load_Report_${spanLengthM}m.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 lg:p-8 animate-in fade-in duration-200">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-7xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <Truck size={22} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Bridge Engineering & Moving Live Load Studio
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {activeVehicle.standard}
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                  {spanLengthM}m Span
                </span>
              </div>
              <p className="text-xs text-slate-400">
                AASHTO LRFD &bull; Eurocode 1 (EN 1991-2) &bull; IRC 6:2017 &bull; M&uuml;ller-Breslau Influence Lines &bull; Girder Distribution (LLDF)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleExportReport}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              <Download size={14} />
              <span>Export Calculation Note</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 px-6 pt-3 border-b border-slate-800/80 bg-slate-900/40 shrink-0">
          <button
            onClick={() => setActiveTab('simulation')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-medium border-b-2 transition ${
              activeTab === 'simulation'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Truck size={15} />
            <span>3D Moving Truck Simulation</span>
          </button>
          <button
            onClick={() => setActiveTab('vehicles')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-medium border-b-2 transition ${
              activeTab === 'vehicles'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers size={15} />
            <span>Vehicular Load Trains & Standards</span>
          </button>
          <button
            onClick={() => setActiveTab('influence')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-medium border-b-2 transition ${
              activeTab === 'influence'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity size={15} />
            <span>Influence Lines (M&uuml;ller-Breslau)</span>
          </button>
          <button
            onClick={() => setActiveTab('distribution')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-medium border-b-2 transition ${
              activeTab === 'distribution'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders size={15} />
            <span>Girder Distribution (LLDF) & Skew</span>
          </button>
          <button
            onClick={() => setActiveTab('envelopes')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-medium border-b-2 transition ${
              activeTab === 'envelopes'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp size={15} />
            <span>Envelopes & Dynamic Forces</span>
          </button>
        </div>

        {/* Studio Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: 3D MOVING VEHICLE SIMULATION */}
          {activeTab === 'simulation' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
              {/* Three.js Viewport */}
              <div className="lg:col-span-2 flex flex-col bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden relative">
                <div ref={mountRef} className="flex-1 w-full h-[460px] min-h-[400px]" />

                {/* HUD Overlay */}
                <div className="absolute top-4 left-4 p-3 bg-slate-950/80 backdrop-blur-md border border-slate-800/80 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="font-semibold text-slate-200">{activeVehicle.name}</span>
                  </div>
                  <div className="text-slate-400 font-mono">
                    Position: <span className="text-amber-300 font-bold">{truckHeadPositionM.toFixed(1)} m</span> / {spanLengthM} m
                  </div>
                  <div className="text-slate-400 font-mono">
                    Weight: <span className="text-slate-200 font-bold">{activeVehicle.totalWeightKn} kN</span> ({activeVehicle.axles.length} Axles)
                  </div>
                  <div className="text-slate-400 font-mono">
                    Impact: <span className="text-cyan-400 font-bold">+{(envelopeResult.dynamicAllowance * 100).toFixed(0)}% IM</span>
                  </div>
                </div>

                {/* Animation Scrub Controls */}
                <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between space-x-4">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className={`p-2.5 rounded-lg font-semibold flex items-center justify-center transition ${
                        isPlaying ? 'bg-amber-500 text-slate-950 hover:bg-amber-400' : 'bg-slate-800 text-white hover:bg-slate-700'
                      }`}
                    >
                      {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                    <button
                      onClick={() => setTruckHeadPositionM(0)}
                      className="p-2.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                      title="Reset Position"
                    >
                      <RotateCcw size={16} />
                    </button>
                  </div>

                  {/* Scrub Bar */}
                  <div className="flex-1 flex items-center space-x-3">
                    <span className="text-xs text-slate-400 font-mono">0m</span>
                    <input
                      type="range"
                      min={-activeVehicle.overallLengthM}
                      max={spanLengthM + activeVehicle.overallLengthM}
                      step={0.1}
                      value={truckHeadPositionM}
                      onChange={e => {
                        setIsPlaying(false);
                        setTruckHeadPositionM(Number(e.target.value));
                      }}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                    <span className="text-xs text-slate-400 font-mono">{spanLengthM}m</span>
                  </div>

                  {/* Speed Controls */}
                  <div className="flex items-center space-x-2 w-44">
                    <span className="text-xs text-slate-400 font-medium">Speed:</span>
                    <input
                      type="range"
                      min={20}
                      max={120}
                      step={5}
                      value={truckSpeedKph}
                      onChange={e => setTruckSpeedKph(Number(e.target.value))}
                      className="w-20 accent-blue-400 cursor-pointer"
                    />
                    <span className="text-xs text-slate-200 font-mono font-bold">{truckSpeedKph} km/h</span>
                  </div>
                </div>
              </div>

              {/* Simulation Metrics Panel */}
              <div className="space-y-4">
                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                    <TrendingUp size={14} className="text-amber-400" />
                    <span>Governing Internal Forces</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg">
                      <div className="text-[11px] text-slate-400">Max Bending Moment</div>
                      <div className="text-lg font-bold text-amber-400 font-mono">
                        {envelopeResult.governingMaxMoment.value.toFixed(0)} <span className="text-xs font-normal text-slate-400">kNm</span>
                      </div>
                      <div className="text-[10px] text-slate-500">at x = {envelopeResult.governingMaxMoment.stationM.toFixed(1)} m</div>
                    </div>
                    <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg">
                      <div className="text-[11px] text-slate-400">Max Shear Force</div>
                      <div className="text-lg font-bold text-rose-400 font-mono">
                        {envelopeResult.governingMaxShear.value.toFixed(0)} <span className="text-xs font-normal text-slate-400">kN</span>
                      </div>
                      <div className="text-[10px] text-slate-500">at x = {envelopeResult.governingMaxShear.stationM.toFixed(1)} m</div>
                    </div>
                    <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg">
                      <div className="text-[11px] text-slate-400">Left Reaction R_A</div>
                      <div className="text-lg font-bold text-emerald-400 font-mono">
                        {envelopeResult.governingMaxReactionLeft.value.toFixed(0)} <span className="text-xs font-normal text-slate-400">kN</span>
                      </div>
                    </div>
                    <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg">
                      <div className="text-[11px] text-slate-400">Right Reaction R_B</div>
                      <div className="text-lg font-bold text-cyan-400 font-mono">
                        {envelopeResult.governingMaxReactionRight.value.toFixed(0)} <span className="text-xs font-normal text-slate-400">kN</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                    <Sliders size={14} className="text-blue-400" />
                    <span>Bridge Span Configuration</span>
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Span Length (L):</span>
                      <span className="text-slate-200 font-bold font-mono">{spanLengthM} m</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={60}
                      step={1}
                      value={spanLengthM}
                      onChange={e => setSpanLengthM(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Girder Spacing (S):</span>
                      <span className="text-slate-200 font-bold font-mono">{girderSpacingM} m</span>
                    </div>
                    <input
                      type="range"
                      min={1.8}
                      max={3.6}
                      step={0.1}
                      value={girderSpacingM}
                      onChange={e => setGirderSpacingM(Number(e.target.value))}
                      className="w-full accent-blue-500 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Number of Girders (N):</span>
                      <span className="text-slate-200 font-bold font-mono">{numberOfGirders}</span>
                    </div>
                    <input
                      type="range"
                      min={3}
                      max={8}
                      step={1}
                      value={numberOfGirders}
                      onChange={e => setNumberOfGirders(Number(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start space-x-2 text-xs text-amber-200">
                  <Info size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Moving truck simulation automatically superposes the AASHTO Design Lane Load (9.3 kN/m) and 33% Dynamic Impact allowance.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VEHICULAR LOAD TRAINS & STANDARDS */}
          {activeTab === 'vehicles' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Vehicle Picker */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 p-1 bg-slate-900 border border-slate-800 rounded-lg">
                  {(['ALL', 'AASHTO-LRFD', 'EUROCODE-1', 'IRC-6'] as const).map(std => (
                    <button
                      key={std}
                      onClick={() => setStandardFilter(std)}
                      className={`flex-1 py-1.5 text-[11px] font-semibold rounded-md transition ${
                        standardFilter === std ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {std === 'ALL' ? 'All Codes' : std.replace('-LRFD', '')}
                    </button>
                  ))}
                </div>

                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {availableVehicles.map(v => (
                    <div
                      key={v.id}
                      onClick={() => setSelectedVehicleId(v.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition ${
                        selectedVehicleId === v.id
                          ? 'bg-amber-500/10 border-amber-500/50 shadow-lg'
                          : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{v.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {v.standard}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{v.description}</p>
                      <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span>Weight: <strong className="text-amber-400">{v.totalWeightKn} kN</strong></span>
                        <span>Length: <strong className="text-slate-200">{v.overallLengthM} m</strong></span>
                        <span>Axles: <strong className="text-slate-200">{v.axles.length}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selected Vehicle Axle Schematic */}
              <div className="lg:col-span-2 space-y-4">
                <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">{activeVehicle.name}</h3>
                      <p className="text-xs text-slate-400">{activeVehicle.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Total Vehicle Weight</div>
                      <div className="text-xl font-bold text-amber-400 font-mono">
                        {activeVehicle.totalWeightKn} kN
                      </div>
                    </div>
                  </div>

                  {/* Variable Rear Axle Spacing Slider for AASHTO HL-93 */}
                  {selectedVehicleId === 'aashto-hl93-truck' && (
                    <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-medium">AASHTO Rear Axle Variable Spacing:</span>
                        <span className="text-amber-400 font-bold font-mono">{rearSpacingM.toFixed(1)} m (range 4.3m - 9.0m)</span>
                      </div>
                      <input
                        type="range"
                        min={4.3}
                        max={9.0}
                        step={0.1}
                        value={rearSpacingM}
                        onChange={e => setRearSpacingM(Number(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-500">
                        Note: 4.3 m governs positive moment on simple spans; 9.0 m governs fatigue and negative moments at continuous piers.
                      </span>
                    </div>
                  )}

                  {/* Axle Train Schematic Diagram */}
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto">
                    <div className="text-xs font-semibold text-slate-400 mb-3">Axle Configuration & Load Distribution:</div>
                    <div className="flex items-center space-x-6 min-w-[500px] justify-center py-4">
                      {activeVehicle.axles.map((ax) => (
                        <div key={ax.id} className="flex items-center">
                          {/* Axle Column */}
                          <div className="flex flex-col items-center space-y-1">
                            <span className="text-xs font-bold text-rose-400 font-mono">{ax.loadKn} kN</span>
                            <div className="w-0.5 h-6 bg-rose-500/60" />
                            <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-bold text-[11px] flex items-center justify-center shadow">
                              {ax.axleIndex}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">P/2 = {ax.wheelLoadKn} kN</span>
                          </div>

                          {/* Spacing to next axle */}
                          {ax.spacingToNextM > 0 && (
                            <div className="flex flex-col items-center px-4">
                              <span className="text-[11px] font-bold text-amber-300 font-mono">{ax.spacingToNextM.toFixed(2)} m</span>
                              <div className="w-16 h-0.5 bg-slate-700 relative">
                                <div className="absolute -left-1 -top-1 w-2 h-2 border-l border-b border-slate-400 rotate-45" />
                                <div className="absolute -right-1 -top-1 w-2 h-2 border-r border-t border-slate-400 rotate-45" />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Table of Axle Specifications */}
                  <table className="w-full text-xs text-left">
                    <thead className="text-[11px] uppercase bg-slate-950/80 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Axle #</th>
                        <th className="p-2.5">Axle Load (kN)</th>
                        <th className="p-2.5">Wheel Load (kN)</th>
                        <th className="p-2.5">Track Width (m)</th>
                        <th className="p-2.5">Spacing to Next (m)</th>
                        <th className="p-2.5">Tire Contact (mm)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                      {activeVehicle.axles.map(ax => (
                        <tr key={ax.id} className="hover:bg-slate-900/50">
                          <td className="p-2.5 font-bold text-amber-400">Axle {ax.axleIndex}</td>
                          <td className="p-2.5 text-white">{ax.loadKn}</td>
                          <td className="p-2.5 text-slate-400">{ax.wheelLoadKn}</td>
                          <td className="p-2.5">{ax.transverseTrackWidthM}</td>
                          <td className="p-2.5 text-amber-300">{ax.spacingToNextM > 0 ? `${ax.spacingToNextM} m` : 'End'}</td>
                          <td className="p-2.5 text-slate-400">{ax.contactPatch.lengthMm} &times; {ax.contactPatch.widthMm}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: INFLUENCE LINES & MÜLLER-BRESLAU */}
          {activeTab === 'influence' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Controls */}
              <div className="space-y-4">
                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Influence Action</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setInfluenceAction('moment')}
                      className={`p-2.5 rounded-lg text-xs font-semibold border transition ${
                        influenceAction === 'moment' ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-900 text-slate-300 border-slate-800'
                      }`}
                    >
                      Bending Moment M
                    </button>
                    <button
                      onClick={() => setInfluenceAction('shear')}
                      className={`p-2.5 rounded-lg text-xs font-semibold border transition ${
                        influenceAction === 'shear' ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-900 text-slate-300 border-slate-800'
                      }`}
                    >
                      Shear Force V
                    </button>
                    <button
                      onClick={() => setInfluenceAction('reaction')}
                      className={`p-2.5 rounded-lg text-xs font-semibold border transition ${
                        influenceAction === 'reaction' ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-900 text-slate-300 border-slate-800'
                      }`}
                    >
                      Support Reaction R
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Evaluation Station (x0):</span>
                      <span className="text-amber-400 font-bold font-mono">
                        {(spanLengthM * influenceStationRatio).toFixed(1)} m ({influenceStationRatio * 100}%)
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.05}
                      max={0.95}
                      step={0.05}
                      value={influenceStationRatio}
                      onChange={e => setInfluenceStationRatio(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg space-y-1.5 text-xs font-mono">
                    <div className="text-slate-400">Peak Positive: <span className="text-emerald-400 font-bold">+{influenceLine.peakPositiveValue.toFixed(3)}</span></div>
                    <div className="text-slate-400">Peak Negative: <span className="text-rose-400 font-bold">{influenceLine.peakNegativeValue.toFixed(3)}</span></div>
                    <div className="text-slate-400">Positive Area: <span className="text-slate-200">{influenceLine.positiveAreaM.toFixed(2)} m</span></div>
                    <div className="text-slate-400">Negative Area: <span className="text-slate-200">{influenceLine.negativeAreaM.toFixed(2)} m</span></div>
                  </div>
                </div>
              </div>

              {/* Graphical Plot of Influence Line */}
              <div className="lg:col-span-2 p-5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">
                    Influence Line for {influenceAction === 'moment' ? 'Bending Moment M(x0)' : influenceAction === 'shear' ? 'Shear Force V(x0)' : 'Reaction R_A'} at x0 = {(spanLengthM * influenceStationRatio).toFixed(1)}m
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    Jump: {influenceAction === 'shear' ? 'Delta V = 1.0' : 'Continuous'}
                  </span>
                </div>

                {/* SVG Curve Canvas */}
                <div className="h-64 bg-slate-950 border border-slate-800 rounded-xl relative p-4 flex items-center justify-center">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 500 200" preserveAspectRatio="none">
                    {/* Baseline */}
                    <line x1="20" y1="100" x2="480" y2="100" stroke="#475569" strokeWidth="1.5" strokeDasharray="4 4" />
                    
                    {/* Supports */}
                    <polygon points="15,100 25,100 20,115" fill="#f59e0b" />
                    <polygon points="475,100 485,100 480,115" fill="#f59e0b" />

                    {/* Evaluation station marker */}
                    <line
                      x1={20 + (460 * influenceStationRatio)}
                      y1="20"
                      x2={20 + (460 * influenceStationRatio)}
                      y2="180"
                      stroke="#ef4444"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />

                    {/* Influence Line Path */}
                    {(() => {
                      const scale = influenceAction === 'moment' ? 12 : 60;
                      const points = influenceLine.ordinates.map(o => {
                        const px = 20 + (o.xM / spanLengthM) * 460;
                        const py = 100 - o.value * scale;
                        return `${px},${py}`;
                      }).join(' ');

                      return (
                        <polyline
                          points={points}
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="2.5"
                        />
                      );
                    })()}
                  </svg>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 px-2 font-mono">
                  <span>x = 0m (Left Support)</span>
                  <span className="text-rose-400 font-bold">x0 = {(spanLengthM * influenceStationRatio).toFixed(1)}m</span>
                  <span>x = {spanLengthM}m (Right Support)</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: GIRDER DISTRIBUTION (LLDF) & SKEW */}
          {activeTab === 'distribution' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Properties and Skew Slider */}
              <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Sliders size={16} className="text-amber-400" />
                  <span>AASHTO LRFD Section 4.6.2.2 Parameters</span>
                </h3>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Support Skew Angle (&theta;):</span>
                      <span className="text-amber-400 font-bold font-mono">{skewAngleDeg}&deg;</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={60}
                      step={1}
                      value={skewAngleDeg}
                      onChange={e => setSkewAngleDeg(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>0&deg; (Right Bridge)</span>
                      <span>30&deg;</span>
                      <span>60&deg; (Severe Skew)</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Girder Spacing (m)</label>
                      <input
                        type="number"
                        step={0.1}
                        min={1.2}
                        max={4.8}
                        value={girderSpacingM}
                        onChange={e => setGirderSpacingM(Math.max(1.2, Math.min(5.0, Number(e.target.value))))}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Number of Girders</label>
                      <input
                        type="number"
                        step={1}
                        min={3}
                        max={12}
                        value={numberOfGirders}
                        onChange={e => setNumberOfGirders(Math.max(3, Math.min(16, parseInt(e.target.value) || 3)))}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Slab Thickness (mm)</label>
                      <input
                        type="number"
                        step={10}
                        min={150}
                        max={350}
                        value={slabThicknessMm}
                        onChange={e => setSlabThicknessMm(Math.max(150, Math.min(400, Number(e.target.value))))}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Girder Depth (mm)</label>
                      <input
                        type="number"
                        step={50}
                        min={800}
                        max={3000}
                        value={girderDepthMm}
                        onChange={e => setGirderDepthMm(Math.max(800, Math.min(4000, Number(e.target.value))))}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Deck f'c (MPa)</label>
                      <input
                        type="number"
                        step={5}
                        min={25}
                        max={60}
                        value={deckConcreteFcMpa}
                        onChange={e => setDeckConcreteFcMpa(Math.max(20, Math.min(80, Number(e.target.value))))}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Girder Eg (GPa)</label>
                      <input
                        type="number"
                        step={5}
                        min={20}
                        max={210}
                        value={girderModulusGpa}
                        onChange={e => setGirderModulusGpa(Math.max(20, Math.min(250, Number(e.target.value))))}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg text-xs">
                    <div className="text-slate-400">Longitudinal Stiffness Kg</div>
                    <div className="text-base font-bold text-slate-200 font-mono">
                      {distributionResult.longitudinalStiffnessKgM4} m&sup4;
                    </div>
                  </div>
                  <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg text-xs">
                    <div className="text-slate-400">Modular Ratio n (Eg / Ec)</div>
                    <div className="text-base font-bold text-slate-200 font-mono">
                      {distributionResult.modularRatioN}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg text-xs">
                    <div className="text-slate-400">Moment Skew Factor</div>
                    <div className="text-base font-bold text-emerald-400 font-mono">
                      {distributionResult.skewCorrectionFactorMoment}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg text-xs">
                    <div className="text-slate-400">Shear Skew Factor</div>
                    <div className="text-base font-bold text-rose-400 font-mono">
                      {distributionResult.skewCorrectionFactorShear}
                    </div>
                  </div>
                </div>
              </div>

              {/* Distribution Factors Summary */}
              <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <ShieldCheck size={16} className="text-emerald-400" />
                  <span>Computed Distribution Factors (Lanes/Girder)</span>
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  {/* Interior Girders */}
                  <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-xl space-y-2">
                    <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">Interior Girder</div>
                    <div className="text-xs text-slate-400">Design Moment Factor:</div>
                    <div className="text-2xl font-bold text-white font-mono">
                      {distributionResult.designMomentFactorInterior}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      1 Lane: {distributionResult.momentInteriorOneLane} | 2+ Lanes: {distributionResult.momentInteriorMultiLane}
                    </div>
                    <div className="text-xs text-slate-400 pt-2">Design Shear Factor:</div>
                    <div className="text-xl font-bold text-cyan-400 font-mono">
                      {distributionResult.designShearFactorInterior}
                    </div>
                  </div>

                  {/* Exterior Girders */}
                  <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-xl space-y-2">
                    <div className="text-xs font-bold text-blue-400 uppercase tracking-wider">Exterior Girder</div>
                    <div className="text-xs text-slate-400">Design Moment Factor:</div>
                    <div className="text-2xl font-bold text-white font-mono">
                      {distributionResult.designMomentFactorExterior}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Lever Rule & Rigid Deck Rotation
                    </div>
                    <div className="text-xs text-slate-400 pt-2">Design Shear Factor:</div>
                    <div className="text-xl font-bold text-cyan-400 font-mono">
                      {distributionResult.designShearFactorExterior}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ENVELOPES & DYNAMIC FORCES */}
          {activeTab === 'envelopes' && (
            <div className="space-y-6">
              {/* Dynamic Lateral & Longitudinal Forces */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1">
                  <div className="text-xs text-slate-400 font-medium">Dynamic Load Allowance (IM)</div>
                  <div className="text-2xl font-bold text-amber-400 font-mono">
                    +{(envelopeResult.dynamicAllowance * 100).toFixed(0)}%
                  </div>
                  <div className="text-[11px] text-slate-500">AASHTO 33% (Strength) / 15% (Fatigue)</div>
                </div>

                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1">
                  <div className="text-xs text-slate-400 font-medium">Centrifugal Lateral Force (C)</div>
                  <div className="text-2xl font-bold text-blue-400 font-mono">
                    {dynamicReport.centrifugal.forceKn} <span className="text-xs text-slate-400">kN</span>
                  </div>
                  <div className="text-[11px] text-slate-500">Overturning M: {dynamicReport.centrifugal.overturningMomentKNm} kNm</div>
                </div>

                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1">
                  <div className="text-xs text-slate-400 font-medium">Braking Longitudinal Force (BR)</div>
                  <div className="text-2xl font-bold text-rose-400 font-mono">
                    {dynamicReport.braking.forceKn} <span className="text-xs text-slate-400">kN</span>
                  </div>
                  <div className="text-[11px] text-slate-500">{dynamicReport.braking.governingCriteria}</div>
                </div>
              </div>

              {/* Critical Envelopes Table */}
              <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-4">
                <h3 className="text-sm font-bold text-white">Discretized Span Envelopes</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="text-[11px] uppercase bg-slate-950 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Station x (m)</th>
                        <th className="p-2.5">Max Moment (kNm)</th>
                        <th className="p-2.5">Max Shear (kN)</th>
                        <th className="p-2.5">Min Shear (kN)</th>
                        <th className="p-2.5">Fatigue Range &Delta;M (kNm)</th>
                        <th className="p-2.5">Gov Truck Head (m)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                      {envelopeResult.stations.map((stn, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/50">
                          <td className="p-2.5 font-bold text-amber-400">{stn.xM.toFixed(1)}</td>
                          <td className="p-2.5 text-white font-bold">{stn.maxMomentKNm.toFixed(1)}</td>
                          <td className="p-2.5 text-emerald-400">{stn.maxShearKn.toFixed(1)}</td>
                          <td className="p-2.5 text-rose-400">{stn.minShearKn.toFixed(1)}</td>
                          <td className="p-2.5 text-cyan-400">{stn.fatigueMomentRangeKNm.toFixed(1)}</td>
                          <td className="p-2.5 text-slate-400">{stn.governingTruckHeadForMaxMomentM.toFixed(1)}</td>
                        </tr>
                      ))}
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
