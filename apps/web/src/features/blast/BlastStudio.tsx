import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Flame,
  ShieldAlert,
  Sliders,
  ShieldCheck,
  TrendingUp,
  RotateCcw,
  X,
  Activity,
  Box,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Compass,
  Bomb,
  Target,
  Zap,
  Layers,
} from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  KingeryBulmashEngine,
  SDOFBlastEngine,
  ProgressiveCollapseEngine,
  ImpactEngine,
  ExplosiveType,
  EXPLOSIVES_CATALOG,
  SDOFSystemParams,
  ProgressiveCollapseScenario,
  ProjectileImpactParams,
} from '@beamlab/blast-engine';

interface BlastStudioProps {
  onClose: () => void;
}

export type BlastDomainMode = 'airblast' | 'sdof-dynamics' | 'progressive-collapse' | 'projectile-impact';

export const BlastStudio: React.FC<BlastStudioProps> = ({ onClose }) => {
  const [activeMode, setActiveMode] = useState<BlastDomainMode>('airblast');

  // Airblast Source Parameters
  const [chargeMassKg, setChargeMassKg] = useState<number>(250); // 250 kg
  const [explosiveType, setExplosiveType] = useState<ExplosiveType>('TNT');
  const [standoffDistanceM, setStandoffDistanceM] = useState<number>(15); // 15 m
  const [burstType, setBurstType] = useState<'surface' | 'free-air'>('surface');

  // SDOF System Parameters
  const [spanLengthM, setSpanLengthM] = useState<number>(4.5);
  const [memberBoundary, setMemberBoundary] = useState<SDOFSystemParams['boundary']>('simply-supported');
  const [yieldResistanceKN, setYieldResistanceKN] = useState<number>(400); // 400 kN
  const [elasticStiffnessKNm, setElasticStiffnessKNm] = useState<number>(30000); // 30 MN/m
  const [elementMassKg, setElementMassKg] = useState<number>(1800); // 1.8 tons
  const [dynamicIncreaseFactor, setDynamicIncreaseFactor] = useState<number>(1.25);

  // Progressive Collapse Parameters
  const [columnLocation, setColumnLocation] = useState<'corner' | 'exterior-middle' | 'interior'>('exterior-middle');
  const [tributaryGravityLoadKN, setTributaryGravityLoadKN] = useState<number>(750); // 750 kN
  const [spanBeamCapacityKNm, setSpanBeamCapacityKNm] = useState<number>(600); // 600 kNm
  const [collapseSpanM, setCollapseSpanM] = useState<number>(6.5);

  // Projectile Impact Parameters
  const [projectileMassKg, setProjectileMassKg] = useState<number>(40); // 40 kg pipe/debris
  const [impactVelocityMPerS, setImpactVelocityMPerS] = useState<number>(75); // 75 m/s (~270 km/h)
  const [projectileDiameterM, setProjectileDiameterM] = useState<number>(0.15); // 15 cm
  const [barrierThicknessM, setBarrierThicknessM] = useState<number>(0.40); // 40 cm
  const [barrierConcreteFcMPa, setBarrierConcreteFcMPa] = useState<number>(40); // 40 MPa

  const mountRef = useRef<HTMLDivElement>(null);

  // Airblast Calculation
  const blastWaveform = useMemo(() => {
    return KingeryBulmashEngine.calculateWaveformParameters({
      chargeMass: chargeMassKg,
      explosiveType,
      standoffDistance: standoffDistanceM,
      burstType,
    });
  }, [chargeMassKg, explosiveType, standoffDistanceM, burstType]);

  // SDOF Dynamic Response Calculation
  const sdofResult = useMemo(() => {
    const system: SDOFSystemParams = {
      memberType: 'one-way-slab',
      boundary: memberBoundary,
      spanLength: spanLengthM,
      width: 1.0,
      totalMassKg: elementMassKg,
      yieldResistanceKN,
      elasticStiffnessKNm,
      dynamicIncreaseFactor,
      dampingRatio: 0.02,
    };

    return SDOFBlastEngine.solveResponse({
      system,
      blast: blastWaveform,
    });
  }, [
    memberBoundary,
    spanLengthM,
    elementMassKg,
    yieldResistanceKN,
    elasticStiffnessKNm,
    dynamicIncreaseFactor,
    blastWaveform,
  ]);

  // Progressive Collapse Calculation
  const collapseResult = useMemo(() => {
    const scenario: ProgressiveCollapseScenario = {
      scenarioId: 'ALT-PATH-01',
      removedColumnId: 'COL-G4',
      columnLocation,
      tributaryGravityLoadKN,
      spanBeamCapacityKNm,
      beamLengthM: collapseSpanM,
    };

    return ProgressiveCollapseEngine.evaluateAlternatePath(scenario);
  }, [columnLocation, tributaryGravityLoadKN, spanBeamCapacityKNm, collapseSpanM]);

  // Projectile Impact Calculation
  const impactResult = useMemo(() => {
    const params: ProjectileImpactParams = {
      projectileMassKg,
      initialVelocityMPerS: impactVelocityMPerS,
      projectileDiameterM,
      noseShapeFactor: 1.0,
      targetMaterial: 'reinforced-concrete',
      targetThicknessM: barrierThicknessM,
      concreteCompressiveStrengthMPa: barrierConcreteFcMPa,
    };

    return ImpactEngine.evaluateImpact(params);
  }, [
    projectileMassKg,
    impactVelocityMPerS,
    projectileDiameterM,
    barrierThicknessM,
    barrierConcreteFcMPa,
  ]);

  // 3D Three.js Scene Setup & Visualizer
  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070b12);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(12, 10, 18);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;

    mountRef.current.replaceChildren(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 2, 0);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffedd5, 1.3);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const redGlow = new THREE.PointLight(0xf43f5e, 2.5, 30);
    redGlow.position.set(-standoffDistanceM * 0.5, 2, 0);
    scene.add(redGlow);

    // Ground Grid
    const grid = new THREE.GridHelper(40, 40, 0x1e293b, 0x0f172a);
    grid.position.y = -0.01;
    scene.add(grid);

    const modelGroup = new THREE.Group();
    scene.add(modelGroup);

    if (activeMode === 'airblast' || activeMode === 'sdof-dynamics') {
      // 1. Detonation Point & Fireball Sphere
      const blastX = -standoffDistanceM * 0.6;
      const chargeRadius = Math.max(0.4, Math.cbrt(chargeMassKg) * 0.15);

      const chargeGeom = new THREE.SphereGeometry(chargeRadius, 32, 32);
      const chargeMat = new THREE.MeshStandardMaterial({
        color: 0xf97316,
        emissive: 0xef4444,
        emissiveIntensity: 0.8,
        roughness: 0.2,
      });
      const chargeMesh = new THREE.Mesh(chargeGeom, chargeMat);
      chargeMesh.position.set(blastX, burstType === 'surface' ? chargeRadius : 2.5, 0);
      modelGroup.add(chargeMesh);

      // Expanding Shock Wave Spherical Shell
      const waveRadius = Math.min(12, standoffDistanceM * 0.45);
      const waveGeom = new THREE.SphereGeometry(waveRadius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
      const waveMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.25,
        wireframe: true,
      });
      const waveMesh = new THREE.Mesh(waveGeom, waveMat);
      waveMesh.position.copy(chargeMesh.position);
      modelGroup.add(waveMesh);

      // Structural Target Wall / Facade Panel
      const wallW = 1.5;
      const wallH = spanLengthM;
      const wallT = 0.3;
      const targetGeom = new THREE.BoxGeometry(wallT, wallH, 4.0);
      const targetMat = new THREE.MeshStandardMaterial({
        color: 0x64748b,
        metalness: 0.2,
        roughness: 0.7,
      });
      const targetMesh = new THREE.Mesh(targetGeom, targetMat);
      targetMesh.position.set(0, wallH / 2, 0);
      modelGroup.add(targetMesh);

      // Deflected ghost mesh if SDOF dynamic mode
      if (activeMode === 'sdof-dynamics' && sdofResult.maxDisplacementMm > 0) {
        const deflM = Math.min(1.0, (sdofResult.maxDisplacementMm / 1000) * 3); // scaled for visual clarity
        const deflGeom = new THREE.BoxGeometry(wallT * 0.8, wallH, 4.0);
        const deflMat = new THREE.MeshStandardMaterial({
          color: sdofResult.protectionLevel === 'high' ? 0x10b981 : 0xf43f5e,
          transparent: true,
          opacity: 0.5,
          wireframe: true,
        });
        const deflMesh = new THREE.Mesh(deflGeom, deflMat);
        deflMesh.position.set(deflM, wallH / 2, 0);
        modelGroup.add(deflMesh);
      }
    } else if (activeMode === 'progressive-collapse') {
      // 2. Building Frame with Removed Column
      const bayW = collapseSpanM;
      const storyH = 3.8;

      const columnMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.5 });
      const beamMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.4 });
      const removedMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e, wireframe: true });

      // Left Column
      const col1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, storyH, 0.5), columnMat);
      col1.position.set(-bayW, storyH / 2, 0);
      modelGroup.add(col1);

      // Right Column
      const col3 = new THREE.Mesh(new THREE.BoxGeometry(0.5, storyH, 0.5), columnMat);
      col3.position.set(bayW, storyH / 2, 0);
      modelGroup.add(col3);

      // Center Removed Column Ghost Wireframe
      const col2Ghost = new THREE.Mesh(new THREE.BoxGeometry(0.5, storyH, 0.5), removedMat);
      col2Ghost.position.set(0, storyH / 2, 0);
      modelGroup.add(col2Ghost);

      // Continuous Double-Span Girder over removed column
      const girderGeom = new THREE.BoxGeometry(bayW * 2 + 0.5, 0.6, 0.4);
      const girderMesh = new THREE.Mesh(girderGeom, beamMat);
      girderMesh.position.set(0, storyH, 0);
      modelGroup.add(girderMesh);

      // Upper Story Column
      const upperCol = new THREE.Mesh(new THREE.BoxGeometry(0.45, storyH, 0.45), columnMat);
      upperCol.position.set(0, storyH + storyH / 2, 0);
      modelGroup.add(upperCol);
    } else if (activeMode === 'projectile-impact') {
      // 3. Projectile Impact on Reinforced Concrete Barrier
      const barH = 5.0;
      const barW = 5.0;
      const barT = barrierThicknessM;

      const barGeom = new THREE.BoxGeometry(barT, barH, barW);
      const barMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 });
      const barMesh = new THREE.Mesh(barGeom, barMat);
      barMesh.position.set(0, barH / 2, 0);
      modelGroup.add(barMesh);

      // Missile projectile cylinder
      const pLen = 1.2;
      const pRadius = projectileDiameterM / 2;
      const pGeom = new THREE.CylinderGeometry(pRadius, pRadius, pLen, 16);
      const pMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8 });
      const pMesh = new THREE.Mesh(pGeom, pMat);
      pMesh.rotation.z = Math.PI / 2;
      pMesh.position.set(-2.0, barH / 2, 0);
      modelGroup.add(pMesh);

      // Impact crater visualization
      const craterRadius = Math.max(pRadius * 1.8, impactResult.penetrationDepthM * 0.8);
      const craterGeom = new THREE.SphereGeometry(craterRadius, 16, 16);
      const craterMat = new THREE.MeshStandardMaterial({ color: 0xef4444, wireframe: true });
      const craterMesh = new THREE.Mesh(craterGeom, craterMat);
      craterMesh.position.set(-barT / 2, barH / 2, 0);
      modelGroup.add(craterMesh);
    }

    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [
    activeMode,
    chargeMassKg,
    standoffDistanceM,
    burstType,
    spanLengthM,
    sdofResult,
    collapseSpanM,
    barrierThicknessM,
    projectileDiameterM,
    impactResult,
  ]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 font-sans">
      <div className="w-full h-full max-w-[1720px] max-h-[960px] bg-slate-900 border border-slate-700/60 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header Bar */}
        <header className="h-16 px-6 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-rose-600 to-orange-600 rounded-xl shadow-lg border border-rose-500/30">
              <Bomb className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                Blast, Impact & Extreme Loading Studio
                <span className="px-2 py-0.5 text-xs rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono">
                  Kingery-Bulmash • Biggs SDOF • UFC 4-023-03 • Modified NDRC
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Nonlinear dynamic blast wave overpressure, elasto-plastic SDOF response, progressive collapse alternate path & missile penetration
              </p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setActiveMode('airblast')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeMode === 'airblast' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5" /> Airblast Waves
            </button>
            <button
              onClick={() => setActiveMode('sdof-dynamics')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeMode === 'sdof-dynamics' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" /> SDOF Dynamics
            </button>
            <button
              onClick={() => setActiveMode('progressive-collapse')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeMode === 'progressive-collapse'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Progressive Collapse
            </button>
            <button
              onClick={() => setActiveMode('projectile-impact')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeMode === 'projectile-impact'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Target className="w-3.5 h-3.5" /> Missile Impact
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Studio Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Parameter Sidebar */}
          <aside className="w-80 bg-slate-950/60 border-r border-slate-800/80 p-5 overflow-y-auto shrink-0 flex flex-col gap-5">
            {/* Airblast & Explosive Source Panel */}
            {(activeMode === 'airblast' || activeMode === 'sdof-dynamics') && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-400 mb-3 flex items-center gap-1.5">
                  <Bomb className="w-4 h-4" /> Explosive Detonation Source
                </h3>
                <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>Charge Mass (W)</span>
                      <span className="font-mono text-rose-300">{chargeMassKg} kg</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="1000"
                      step="20"
                      value={chargeMassKg}
                      onChange={(e) => setChargeMassKg(Number(e.target.value))}
                      className="w-full accent-rose-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>Standoff Distance (R)</span>
                      <span className="font-mono text-rose-300">{standoffDistanceM} m</span>
                    </div>
                    <input
                      type="range"
                      min="3"
                      max="40"
                      step="1"
                      value={standoffDistanceM}
                      onChange={(e) => setStandoffDistanceM(Number(e.target.value))}
                      className="w-full accent-rose-500"
                    />
                  </div>

                  <div>
                    <span className="text-slate-300 block mb-1">Explosive Type</span>
                    <select
                      value={explosiveType}
                      onChange={(e) => setExplosiveType(e.target.value as ExplosiveType)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    >
                      {Object.keys(EXPLOSIVES_CATALOG).map((t) => (
                        <option key={t} value={t}>
                          {EXPLOSIVES_CATALOG[t as ExplosiveType].name} (equiv: {EXPLOSIVES_CATALOG[t as ExplosiveType].tntEquivalentMass})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-2">
                    <span className="text-slate-300 block mb-1">Burst Environment</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setBurstType('surface')}
                        className={`py-1 rounded text-[11px] font-semibold ${
                          burstType === 'surface' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        Surface (1.8x)
                      </button>
                      <button
                        onClick={() => setBurstType('free-air')}
                        className={`py-1 rounded text-[11px] font-semibold ${
                          burstType === 'free-air' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        Free-Air
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SDOF Structural Panel */}
            {activeMode === 'sdof-dynamics' && (
              <div className="pt-4 border-t border-slate-800">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-400 mb-3 flex items-center gap-1.5">
                  <Activity className="w-4 h-4" /> SDOF Member Properties
                </h3>
                <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>Span Length (L)</span>
                      <span className="font-mono text-rose-300">{spanLengthM} m</span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="8"
                      step="0.5"
                      value={spanLengthM}
                      onChange={(e) => setSpanLengthM(Number(e.target.value))}
                      className="w-full accent-rose-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>Yield Resistance (R_y)</span>
                      <span className="font-mono text-rose-300">{yieldResistanceKN} kN</span>
                    </div>
                    <input
                      type="range"
                      min="100"
                      max="1200"
                      step="50"
                      value={yieldResistanceKN}
                      onChange={(e) => setYieldResistanceKN(Number(e.target.value))}
                      className="w-full accent-rose-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>Dynamic Increase Factor (DIF)</span>
                      <span className="font-mono text-rose-300">{dynamicIncreaseFactor.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="1.5"
                      step="0.05"
                      value={dynamicIncreaseFactor}
                      onChange={(e) => setDynamicIncreaseFactor(Number(e.target.value))}
                      className="w-full accent-rose-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Progressive Collapse Panel */}
            {activeMode === 'progressive-collapse' && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-400 mb-3 flex items-center gap-1.5">
                  <Layers className="w-4 h-4" /> UFC 4-023-03 Alternate Path
                </h3>
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-300 block mb-1">Removed Column Location</span>
                    <select
                      value={columnLocation}
                      onChange={(e) => setColumnLocation(e.target.value as any)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    >
                      <option value="exterior-middle">Exterior Middle Column</option>
                      <option value="corner">Corner Column (Critical)</option>
                      <option value="interior">Interior Column</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>Bay Span (L)</span>
                      <span className="font-mono text-rose-300">{collapseSpanM} m</span>
                    </div>
                    <input
                      type="range"
                      min="4"
                      max="10"
                      step="0.5"
                      value={collapseSpanM}
                      onChange={(e) => setCollapseSpanM(Number(e.target.value))}
                      className="w-full accent-rose-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>Tributary Gravity Load (P)</span>
                      <span className="font-mono text-rose-300">{tributaryGravityLoadKN} kN</span>
                    </div>
                    <input
                      type="range"
                      min="300"
                      max="1800"
                      step="50"
                      value={tributaryGravityLoadKN}
                      onChange={(e) => setTributaryGravityLoadKN(Number(e.target.value))}
                      className="w-full accent-rose-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>Beam Capacity (M_cap)</span>
                      <span className="font-mono text-rose-300">{spanBeamCapacityKNm} kN·m</span>
                    </div>
                    <input
                      type="range"
                      min="200"
                      max="1200"
                      step="50"
                      value={spanBeamCapacityKNm}
                      onChange={(e) => setSpanBeamCapacityKNm(Number(e.target.value))}
                      className="w-full accent-rose-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Projectile Impact Panel */}
            {activeMode === 'projectile-impact' && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-400 mb-3 flex items-center gap-1.5">
                  <Target className="w-4 h-4" /> Missile Penetration (NDRC)
                </h3>
                <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>Impact Velocity (v0)</span>
                      <span className="font-mono text-rose-300">{impactVelocityMPerS} m/s</span>
                    </div>
                    <input
                      type="range"
                      min="30"
                      max="180"
                      step="5"
                      value={impactVelocityMPerS}
                      onChange={(e) => setImpactVelocityMPerS(Number(e.target.value))}
                      className="w-full accent-rose-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>Projectile Mass</span>
                      <span className="font-mono text-rose-300">{projectileMassKg} kg</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="150"
                      step="5"
                      value={projectileMassKg}
                      onChange={(e) => setProjectileMassKg(Number(e.target.value))}
                      className="w-full accent-rose-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>Barrier Thickness</span>
                      <span className="font-mono text-rose-300">{(barrierThicknessM * 100).toFixed(0)} cm</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="1.0"
                      step="0.05"
                      value={barrierThicknessM}
                      onChange={(e) => setBarrierThicknessM(Number(e.target.value))}
                      className="w-full accent-rose-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>Concrete Compressive f'c</span>
                      <span className="font-mono text-rose-300">{barrierConcreteFcMPa} MPa</span>
                    </div>
                    <input
                      type="range"
                      min="25"
                      max="70"
                      step="5"
                      value={barrierConcreteFcMPa}
                      onChange={(e) => setBarrierConcreteFcMPa(Number(e.target.value))}
                      className="w-full accent-rose-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </aside>

          {/* Center 3D Viewport */}
          <main className="flex-1 flex flex-col relative bg-slate-950">
            {/* Viewport Canvas */}
            <div ref={mountRef} className="w-full flex-1" />

            {/* Bottom HUD Scorecard */}
            <div className="h-44 bg-slate-950/90 border-t border-slate-800/80 px-6 py-4 flex flex-col justify-between shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-rose-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Blast & Extreme Loading Compliance Scorecard
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Standards: DoD UFC 3-340-02 • ASCE 59-11 • DoD UFC 4-023-03 • Modified NDRC
                </div>
              </div>

              {/* Dynamic Scorecard by Active Mode */}
              {activeMode === 'airblast' && (
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span>Scaled Distance</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
                        Z-PARAM
                      </span>
                    </div>
                    <div className="text-xl font-bold font-mono text-white mt-1">
                      {blastWaveform.scaledDistanceZ.toFixed(2)}{' '}
                      <span className="text-xs text-slate-400">m/kg⅓</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Effective TNT: {blastWaveform.effectiveChargeMassTNT.toFixed(0)} kg
                    </div>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span>Peak Reflected Overpressure</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950 text-rose-400 border border-rose-500/30">
                        P_r
                      </span>
                    </div>
                    <div className="text-xl font-bold font-mono text-rose-300 mt-1">
                      {blastWaveform.peakReflectedPressure.toFixed(0)}{' '}
                      <span className="text-xs text-slate-400">kPa</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Incident P_so: {blastWaveform.peakIncidentPressure.toFixed(0)} kPa
                    </div>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span>Positive Duration & Arrival</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-400 border border-amber-500/30">
                        t_d
                      </span>
                    </div>
                    <div className="text-xl font-bold font-mono text-white mt-1">
                      {blastWaveform.positivePhaseDuration.toFixed(1)}{' '}
                      <span className="text-xs text-slate-400">ms</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Arrival Time: {blastWaveform.shockArrivalTimestamp.toFixed(1)} ms (U = {blastWaveform.shockVelocity.toFixed(0)} m/s)
                    </div>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span>Reflected Impulse</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-950 text-sky-400 border border-sky-500/30">
                        I_r
                      </span>
                    </div>
                    <div className="text-xl font-bold font-mono text-sky-300 mt-1">
                      {blastWaveform.positiveReflectedImpulse.toFixed(0)}{' '}
                      <span className="text-xs text-slate-400">kPa·ms</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Friedlander decay shape b = {blastWaveform.decayWaveformFactor.toFixed(2)}
                    </div>
                  </div>
                </div>
              )}

              {activeMode === 'sdof-dynamics' && (
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span>Damage Protection Category</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                          sdofResult.protectionLevel === 'high'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                            : sdofResult.protectionLevel === 'medium'
                            ? 'bg-amber-950 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-950 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {sdofResult.protectionLevel.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-xl font-bold font-mono text-white mt-1">
                      {sdofResult.maxDisplacementMm.toFixed(1)}{' '}
                      <span className="text-xs text-slate-400">mm</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Yield Deflection: {sdofResult.yieldDisplacementMm.toFixed(1)} mm
                    </div>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span>Ductility Ratio (μ)</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
                        μ = y_max / y_el
                      </span>
                    </div>
                    <div className="text-xl font-bold font-mono text-amber-300 mt-1">
                      {sdofResult.ductilityRatio.toFixed(2)}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Allowable: ≤ 3.0 (High), ≤ 6.0 (Medium)
                    </div>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span>Support Rotation (θ)</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
                        ROTATION
                      </span>
                    </div>
                    <div className="text-xl font-bold font-mono text-white mt-1">
                      {sdofResult.supportRotationDeg.toFixed(2)}°
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Allowable: ≤ 2.0° (High), ≤ 4.0° (Medium)
                    </div>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span>Dynamic Period & Mass</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-950 text-sky-400 border border-sky-500/30">
                        T_n
                      </span>
                    </div>
                    <div className="text-xl font-bold font-mono text-sky-300 mt-1">
                      {sdofResult.naturalPeriodMs.toFixed(1)}{' '}
                      <span className="text-xs text-slate-400">ms</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Equivalent M_e: {sdofResult.equivalentMassKg.toFixed(0)} kg (K_LM = {sdofResult.loadMassFactorKLM.toFixed(2)})
                    </div>
                  </div>
                </div>
              )}

              {activeMode === 'progressive-collapse' && (
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span>Alternate Path Status</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                          collapseResult.collapsePrevented
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-950 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {collapseResult.collapsePrevented ? 'STABLE' : 'COLLAPSE RISK'}
                      </span>
                    </div>
                    <div className="text-xl font-bold font-mono text-white mt-1">
                      {collapseResult.failureMechanism.toUpperCase()}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Double Span: {(collapseSpanM * 2).toFixed(1)} m
                    </div>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span>Demand-Capacity Ratio (DCR)</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
                        DCR
                      </span>
                    </div>
                    <div className="text-xl font-bold font-mono text-amber-300 mt-1">
                      {collapseResult.demandCapacityRatio.toFixed(2)}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Allowable: ≤ {columnLocation === 'corner' ? '1.50' : '2.00'}
                    </div>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span>Amplified Dynamic Demand</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950 text-rose-400 border border-rose-500/30">
                        M_demand
                      </span>
                    </div>
                    <div className="text-xl font-bold font-mono text-rose-300 mt-1">
                      {collapseResult.dynamicAmplifiedDemandKNm.toFixed(0)}{' '}
                      <span className="text-xs text-slate-400">kN·m</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Capacity: {spanBeamCapacityKNm} kN·m
                    </div>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span>Catenary Tensile Pull</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-950 text-indigo-400 border border-indigo-500/30">
                        T_catenary
                      </span>
                    </div>
                    <div className="text-xl font-bold font-mono text-indigo-300 mt-1">
                      {collapseResult.catenaryTensionDemandKN.toFixed(0)}{' '}
                      <span className="text-xs text-slate-400">kN</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Tie force required across bays
                    </div>
                  </div>
                </div>
              )}

              {activeMode === 'projectile-impact' && (
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span>Damage Classification</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                          !impactResult.perforated && !impactResult.scabbingOccurs
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-950 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {impactResult.damageLevel.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-xl font-bold font-mono text-white mt-1">
                      {impactResult.perforated ? 'PERFORATED' : 'CONTAINED'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Scabbing: {impactResult.scabbingOccurs ? 'YES (Backface Ejection)' : 'NONE'}
                    </div>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span>Penetration Depth (x)</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
                        NDRC
                      </span>
                    </div>
                    <div className="text-xl font-bold font-mono text-amber-300 mt-1">
                      {(impactResult.penetrationDepthM * 100).toFixed(1)}{' '}
                      <span className="text-xs text-slate-400">cm</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Barrier Thickness: {(barrierThicknessM * 100).toFixed(0)} cm
                    </div>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span>Scabbing Limit Thickness</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-400 border border-amber-500/30">
                        h_s
                      </span>
                    </div>
                    <div className="text-xl font-bold font-mono text-white mt-1">
                      {(impactResult.scabbingLimitThicknessM * 100).toFixed(1)}{' '}
                      <span className="text-xs text-slate-400">cm</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Min thickness to prevent backface spall
                    </div>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span>Perforation Limit Thickness</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950 text-rose-400 border border-rose-500/30">
                        h_p
                      </span>
                    </div>
                    <div className="text-xl font-bold font-mono text-rose-300 mt-1">
                      {(impactResult.perforationLimitThicknessM * 100).toFixed(1)}{' '}
                      <span className="text-xs text-slate-400">cm</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Residual Velocity: {impactResult.residualVelocityMPerS.toFixed(1)} m/s
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
