import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Mountain,
  Layers,
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
  Anchor,
  Compass,
  ArrowDownCircle,
  FileText,
  SlidersHorizontal,
} from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  LateralEarthPressureEngine,
  RetainingWallStabilityEngine,
  DeepExcavationEngine,
  SlopeStabilityEngine,
  SoilLayer,
  GroundWaterTable,
  SurchargeLoad,
  WallDimensions,
  SlopeProfilePoint,
} from '@beamstudio/earth-engine';

interface EarthStudioProps {
  onClose: () => void;
}

export type EarthDomainMode = 'retaining-wall' | 'sheet-pile' | 'peck-cut' | 'slope-stability';

export const EarthStudio: React.FC<EarthStudioProps> = ({ onClose }) => {
  // Domain selection
  const [activeMode, setActiveMode] = useState<EarthDomainMode>('retaining-wall');

  // Soil parameters
  const [soilUnitWeight, setSoilUnitWeight] = useState<number>(18.5); // kN/m3
  const [soilFrictionAngle, setSoilFrictionAngle] = useState<number>(32); // degrees
  const [soilCohesion, setSoilCohesion] = useState<number>(5); // kPa
  const [waterTableDepth, setWaterTableDepth] = useState<number>(3.5); // m from ground
  const [hasWaterTable, setHasWaterTable] = useState<boolean>(true);
  const [surchargeLoadKPa, setSurchargeLoadKPa] = useState<number>(15); // kPa

  // Retaining Wall Geometry
  const [wallHeightM, setWallHeightM] = useState<number>(5.0);
  const [baseThicknessM, setBaseThicknessM] = useState<number>(0.6);
  const [toeWidthM, setToeWidthM] = useState<number>(1.0);
  const [heelWidthM, setHeelWidthM] = useState<number>(2.0);
  const [stemTopWidthM, setStemTopWidthM] = useState<number>(0.35);
  const [stemBottomWidthM, setStemBottomWidthM] = useState<number>(0.55);
  const [hasShearKey, setHasShearKey] = useState<boolean>(false);
  const [shearKeyDepthM, setShearKeyDepthM] = useState<number>(0.5);

  // Sheet Pile & Deep Excavation
  const [excavationDepthM, setExcavationDepthM] = useState<number>(6.0);
  const [anchorDepthM, setAnchorDepthM] = useState<number>(1.8);
  const [isAnchored, setIsAnchored] = useState<boolean>(true);

  // Slope Stability
  const [slopeAngleDeg, setSlopeAngleDeg] = useState<number>(33); // degrees
  const [slopeHeightM, setSlopeHeightM] = useState<number>(6.0);
  const [slopeMethod, setSlopeMethod] = useState<'bishop' | 'fellenius'>('bishop');

  // View state
  const [view3D, setView3D] = useState<boolean>(true);
  const [showPressureDiagram, setShowPressureDiagram] = useState<boolean>(true);
  const [showSlices, setShowSlices] = useState<boolean>(true);

  const mountRef = useRef<HTMLDivElement>(null);

  // Soil layer definition
  const primarySoil: SoilLayer = useMemo(() => {
    return {
      id: 'soil-1',
      name: 'Stratified Glacial Till / Sand',
      depthTop: 0,
      depthBottom: 25,
      unitWeight: soilUnitWeight,
      saturatedUnitWeight: soilUnitWeight + 1.5,
      frictionAngle: soilFrictionAngle,
      cohesion: soilCohesion,
      undrainedShearStrength: soilCohesion > 0 ? soilCohesion * 2 : 30,
    };
  }, [soilUnitWeight, soilFrictionAngle, soilCohesion]);

  const waterTable: GroundWaterTable | undefined = useMemo(() => {
    return hasWaterTable ? { depth: waterTableDepth, unitWeightWater: 9.81 } : undefined;
  }, [hasWaterTable, waterTableDepth]);

  const surcharges: SurchargeLoad[] = useMemo(() => {
    if (surchargeLoadKPa <= 0) return [];
    return [
      {
        id: 'surcharge-1',
        type: 'uniform',
        magnitude: surchargeLoadKPa,
        distanceFromWall: 0,
      },
    ];
  }, [surchargeLoadKPa]);

  // Calculations for Retaining Wall
  const wallDimensions: WallDimensions = useMemo(() => {
    return {
      height: wallHeightM,
      baseThickness: baseThicknessM,
      stemTopWidth: stemTopWidthM,
      stemBottomWidth: stemBottomWidthM,
      toeWidth: toeWidthM,
      heelWidth: heelWidthM,
      soilDepthOverToe: 0.6,
      shearKey: hasShearKey
        ? {
            depth: shearKeyDepthM,
            width: 0.4,
            distanceFromToe: toeWidthM + 0.2,
          }
        : undefined,
    };
  }, [
    wallHeightM,
    baseThicknessM,
    stemTopWidthM,
    stemBottomWidthM,
    toeWidthM,
    heelWidthM,
    hasShearKey,
    shearKeyDepthM,
  ]);

  const wallStabilityResult = useMemo(() => {
    return RetainingWallStabilityEngine.analyzeStability({
      wall: wallDimensions,
      backfillLayers: [primarySoil],
      foundationSoil: {
        ...primarySoil,
        frictionAngle: Math.min(40, primarySoil.frictionAngle + 2),
        cohesion: primarySoil.cohesion + 5,
      },
      waterTable,
      surcharges,
      allowableBearingCapacity: 280, // kPa
    });
  }, [wallDimensions, primarySoil, waterTable, surcharges]);

  // Calculations for Deep Excavation & Sheet Piles
  const sheetPileResult = useMemo(() => {
    if (isAnchored) {
      return DeepExcavationEngine.designAnchoredSheetPile({
        excavationDepth: excavationDepthM,
        anchorDepth: anchorDepthM,
        soil: primarySoil,
      });
    } else {
      return DeepExcavationEngine.designCantileverSheetPile({
        excavationDepth: excavationDepthM,
        soil: primarySoil,
      });
    }
  }, [excavationDepthM, anchorDepthM, isAnchored, primarySoil]);

  // Calculations for Peck Strutted Cut
  const peckResult = useMemo(() => {
    return DeepExcavationEngine.calculatePeckEnvelope({
      excavationDepth: excavationDepthM,
      soil: primarySoil,
      strutLevels: [1.5, 3.5, 5.0].filter((d) => d < excavationDepthM),
      strutSpacing: 3.0,
    });
  }, [excavationDepthM, primarySoil]);

  // Slope profile points
  const slopeProfile: SlopeProfilePoint[] = useMemo(() => {
    const H = slopeHeightM;
    const run = H / Math.tan((slopeAngleDeg * Math.PI) / 180);
    return [
      { x: -8, y: 0 },
      { x: 0, y: 0 },
      { x: run, y: H },
      { x: run + 14, y: H },
    ];
  }, [slopeHeightM, slopeAngleDeg]);

  // Calculations for Slope Stability
  const slopeResult = useMemo(() => {
    const H = slopeHeightM;
    const run = H / Math.tan((slopeAngleDeg * Math.PI) / 180);
    return SlopeStabilityEngine.findCriticalSlipCircle({
      groundProfile: slopeProfile,
      soil: primarySoil,
      waterTableY: hasWaterTable ? Math.max(0, H - waterTableDepth) : undefined,
      method: slopeMethod,
      targetFS: 1.3,
      grid: {
        xcMin: run * 0.2,
        xcMax: run * 0.9,
        ycMin: H * 0.8,
        ycMax: H * 2.2,
        radiusMin: H * 0.9,
        radiusMax: H * 2.5,
        steps: 6,
      },
    });
  }, [slopeProfile, primarySoil, hasWaterTable, slopeHeightM, waterTableDepth, slopeMethod]);

  // 3D Three.js Scene Setup & Visualization
  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f18);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(12, 8, 16);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;

    mountRef.current.replaceChildren(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(3, 2, 0);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(15, 20, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const blueFill = new THREE.DirectionalLight(0x38bdf8, 0.4);
    blueFill.position.set(-10, -5, -10);
    scene.add(blueFill);

    // Ground Grid
    const grid = new THREE.GridHelper(30, 30, 0x1e293b, 0x0f172a);
    grid.position.y = -0.01;
    scene.add(grid);

    // Group for dynamic geotechnical models
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);

    if (activeMode === 'retaining-wall') {
      // 1. Concrete Retaining Wall Geometry
      const wallShape = new THREE.Shape();
      const B = wallDimensions.toeWidth + wallDimensions.stemBottomWidth + wallDimensions.heelWidth;
      const tBase = wallDimensions.baseThickness;
      const Hstem = wallDimensions.height;
      const Btoe = wallDimensions.toeWidth;
      const bTop = wallDimensions.stemTopWidth;
      const bBot = wallDimensions.stemBottomWidth;

      // Base slab outline: (0, 0) to (B, 0) to (B, tBase) ...
      wallShape.moveTo(0, 0);
      wallShape.lineTo(B, 0);
      wallShape.lineTo(B, tBase);
      // Back of stem:
      wallShape.lineTo(Btoe + bBot, tBase);
      wallShape.lineTo(Btoe + bTop, tBase + Hstem);
      // Top of stem:
      wallShape.lineTo(Btoe, tBase + Hstem);
      // Front of stem:
      wallShape.lineTo(Btoe, tBase);
      // Toe slab top:
      wallShape.lineTo(0, tBase);
      wallShape.closePath();

      const extrudeSettings = {
        depth: 6.0,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.05,
        bevelThickness: 0.05,
      };

      const wallGeom = new THREE.ExtrudeGeometry(wallShape, extrudeSettings);
      wallGeom.center();
      wallGeom.translate(B / 2, (tBase + Hstem) / 2, 0);

      const concreteMat = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        roughness: 0.6,
        metalness: 0.15,
      });

      const wallMesh = new THREE.Mesh(wallGeom, concreteMat);
      wallMesh.castShadow = true;
      wallMesh.receiveShadow = true;
      modelGroup.add(wallMesh);

      // Backfill Soil Mass Block (behind stem)
      const soilBackGeom = new THREE.BoxGeometry(wallDimensions.heelWidth, Hstem, 6.0);
      const soilBackMat = new THREE.MeshStandardMaterial({
        color: 0x78350f,
        roughness: 0.85,
        transparent: true,
        opacity: 0.45,
      });
      const soilBackMesh = new THREE.Mesh(soilBackGeom, soilBackMat);
      soilBackMesh.position.set(B - wallDimensions.heelWidth / 2, tBase + Hstem / 2, 0);
      modelGroup.add(soilBackMesh);

      // Water Table Plane if present
      if (hasWaterTable && waterTableDepth < Hstem) {
        const wtY = tBase + Hstem - waterTableDepth;
        const wtGeom = new THREE.PlaneGeometry(wallDimensions.heelWidth, 6.0);
        const wtMat = new THREE.MeshStandardMaterial({
          color: 0x0284c7,
          roughness: 0.1,
          transparent: true,
          opacity: 0.6,
          side: THREE.DoubleSide,
        });
        const wtMesh = new THREE.Mesh(wtGeom, wtMat);
        wtMesh.rotation.x = Math.PI / 2;
        wtMesh.position.set(B - wallDimensions.heelWidth / 2, wtY, 0);
        modelGroup.add(wtMesh);
      }

      // Pressure Vectors
      if (showPressureDiagram) {
        const numArrows = 6;
        for (let i = 1; i <= numArrows; i++) {
          const frac = i / numArrows;
          const yPos = tBase + Hstem * (1 - frac);
          const arrowLen = 1.0 + frac * 2.2;
          const dir = new THREE.Vector3(-1, 0, 0);
          const origin = new THREE.Vector3(B + arrowLen, yPos, 0);
          const arrowHelper = new THREE.ArrowHelper(dir, origin, arrowLen, 0xef4444, 0.4, 0.2);
          modelGroup.add(arrowHelper);
        }
      }
    } else if (activeMode === 'sheet-pile' || activeMode === 'peck-cut') {
      // 2. Sheet Pile Wall & Shoring Struts / Tiebacks
      const Hexc = excavationDepthM;
      const D = 'designEmbedmentDepth' in sheetPileResult ? sheetPileResult.designEmbedmentDepth : 3.0;
      const totalPileH = Hexc + D;

      // Steel sheet pile geometry
      const sheetGeom = new THREE.BoxGeometry(0.25, totalPileH, 6.0);
      const steelMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        metalness: 0.8,
        roughness: 0.3,
      });
      const sheetMesh = new THREE.Mesh(sheetGeom, steelMat);
      sheetMesh.position.set(0, totalPileH / 2 - D, 0);
      modelGroup.add(sheetMesh);

      // Dredge line cut indicator
      const soilPassiveGeom = new THREE.BoxGeometry(6.0, D, 6.0);
      const soilPassiveMat = new THREE.MeshStandardMaterial({
        color: 0x78350f,
        transparent: true,
        opacity: 0.4,
      });
      const soilPassiveMesh = new THREE.Mesh(soilPassiveGeom, soilPassiveMat);
      soilPassiveMesh.position.set(-3.0, -D / 2, 0);
      modelGroup.add(soilPassiveMesh);

      // Retained soil behind wall
      const soilActiveGeom = new THREE.BoxGeometry(6.0, totalPileH, 6.0);
      const soilActiveMesh = new THREE.Mesh(soilActiveGeom, soilPassiveMat);
      soilActiveMesh.position.set(3.0, totalPileH / 2 - D, 0);
      modelGroup.add(soilActiveMesh);

      // Ground Tieback Anchor or Struts
      if (activeMode === 'sheet-pile' && isAnchored) {
        const anchorY = Hexc - anchorDepthM;
        const tiebackGeom = new THREE.CylinderGeometry(0.06, 0.06, 7.0);
        const tiebackMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.7 });
        const tiebackMesh = new THREE.Mesh(tiebackGeom, tiebackMat);
        tiebackMesh.rotation.z = -Math.PI / 4;
        tiebackMesh.position.set(2.5, anchorY - 1.2, 0);
        modelGroup.add(tiebackMesh);
      } else if (activeMode === 'peck-cut') {
        // Multi-level Struts
        for (const strut of peckResult.strutLoads) {
          const strutY = Hexc - strut.depth;
          const strutGeom = new THREE.CylinderGeometry(0.12, 0.12, 5.0);
          const strutMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, metalness: 0.7 });
          const strutMesh = new THREE.Mesh(strutGeom, strutMat);
          strutMesh.rotation.z = Math.PI / 2;
          strutMesh.position.set(-2.5, strutY, 0);
          modelGroup.add(strutMesh);
        }
      }
    } else if (activeMode === 'slope-stability') {
      // 3. Slope Geometry & Circular Slip Arc
      const shape = new THREE.Shape();
      shape.moveTo(-8, 0);
      for (const pt of slopeProfile) {
        shape.lineTo(pt.x, pt.y);
      }
      shape.lineTo(slopeProfile[slopeProfile.length - 1]!.x, -2);
      shape.lineTo(-8, -2);
      shape.closePath();

      const extrudeSettings = { depth: 5.0, bevelEnabled: false };
      const slopeGeom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      slopeGeom.center();
      slopeGeom.translate(4, slopeHeightM / 2, 0);

      const earthMat = new THREE.MeshStandardMaterial({
        color: 0x854d0e,
        roughness: 0.9,
      });
      const slopeMesh = new THREE.Mesh(slopeGeom, earthMat);
      modelGroup.add(slopeMesh);

      // Critical Slip Circle Arc Visualization
      const circle = slopeResult.criticalCircle;
      const arcGeom = new THREE.RingGeometry(circle.radius - 0.08, circle.radius + 0.08, 64, 1, 0, Math.PI);
      const arcMat = new THREE.MeshBasicMaterial({
        color: slopeResult.isSafe ? 0x10b981 : 0xef4444,
        side: THREE.DoubleSide,
      });
      const arcMesh = new THREE.Mesh(arcGeom, arcMat);
      arcMesh.position.set(circle.xc, circle.yc, 2.6);
      arcMesh.rotation.z = Math.PI;
      modelGroup.add(arcMesh);

      // Slices wireframe visualization
      if (showSlices) {
        for (const slice of slopeResult.slices) {
          const sliceLineGeom = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(slice.xMid, 0, 2.6),
            new THREE.Vector3(slice.xMid, slice.sliceHeight, 2.6),
          ]);
          const sliceLineMat = new THREE.LineBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.5 });
          const line = new THREE.Line(sliceLineGeom, sliceLineMat);
          modelGroup.add(line);
        }
      }
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
    wallDimensions,
    hasWaterTable,
    waterTableDepth,
    showPressureDiagram,
    excavationDepthM,
    sheetPileResult,
    isAnchored,
    peckResult,
    slopeProfile,
    slopeHeightM,
    slopeResult,
    showSlices,
    anchorDepthM,
  ]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full h-full max-w-[1720px] max-h-[960px] bg-slate-900 border border-slate-700/60 rounded-2xl flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header Bar */}
        <header className="h-16 px-6 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-amber-600 to-yellow-600 rounded-xl shadow-lg border border-amber-500/30">
              <Mountain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                Earth Retaining & Deep Excavation Studio
                <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                  Rankine • Coulomb • Bishop Slices • Peck
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Limit equilibrium earth pressures, wall sliding & overturning, anchored shoring, and circular slope stability
              </p>
            </div>
          </div>

          {/* Domain Mode Switcher */}
          <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setActiveMode('retaining-wall')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeMode === 'retaining-wall'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Box className="w-3.5 h-3.5" /> Cantilever Wall
            </button>
            <button
              onClick={() => setActiveMode('sheet-pile')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeMode === 'sheet-pile'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Anchor className="w-3.5 h-3.5" /> Sheet Pile
            </button>
            <button
              onClick={() => setActiveMode('peck-cut')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeMode === 'peck-cut'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Peck Strutted Cut
            </button>
            <button
              onClick={() => setActiveMode('slope-stability')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeMode === 'slope-stability'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Mountain className="w-3.5 h-3.5" /> Slope Stability
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Configuration Sidebar */}
          <aside className="w-80 bg-slate-950/60 border-r border-slate-800/80 p-5 overflow-y-auto shrink-0 flex flex-col gap-5">
            {/* Geotechnical Soil Stratum */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-1.5">
                <Layers className="w-4 h-4" /> Soil & Hydrogeology
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Friction Angle (φ)</span>
                    <span className="font-mono text-amber-300">{soilFrictionAngle}°</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="45"
                    step="1"
                    value={soilFrictionAngle}
                    onChange={(e) => setSoilFrictionAngle(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Cohesion (c)</span>
                    <span className="font-mono text-amber-300">{soilCohesion} kPa</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    step="2"
                    value={soilCohesion}
                    onChange={(e) => setSoilCohesion(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Unit Weight (γ)</span>
                    <span className="font-mono text-amber-300">{soilUnitWeight} kN/m³</span>
                  </div>
                  <input
                    type="range"
                    min="14"
                    max="22"
                    step="0.5"
                    value={soilUnitWeight}
                    onChange={(e) => setSoilUnitWeight(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-300">Water Table</span>
                    <input
                      type="checkbox"
                      checked={hasWaterTable}
                      onChange={(e) => setHasWaterTable(e.target.checked)}
                      className="accent-amber-500"
                    />
                  </div>
                  {hasWaterTable && (
                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>Depth from Surface</span>
                        <span className="font-mono text-sky-400">{waterTableDepth} m</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="8"
                        step="0.5"
                        value={waterTableDepth}
                        onChange={(e) => setWaterTableDepth(Number(e.target.value))}
                        className="w-full accent-sky-500"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Uniform Surcharge (q)</span>
                    <span className="font-mono text-amber-300">{surchargeLoadKPa} kPa</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="5"
                    value={surchargeLoadKPa}
                    onChange={(e) => setSurchargeLoadKPa(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Mode-Specific Parameter Panels */}
            {activeMode === 'retaining-wall' && (
              <div className="pt-4 border-t border-slate-800">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-4 h-4" /> Wall Dimensions
                </h3>
                <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>Stem Height (H)</span>
                      <span className="font-mono text-amber-300">{wallHeightM} m</span>
                    </div>
                    <input
                      type="range"
                      min="3"
                      max="9"
                      step="0.5"
                      value={wallHeightM}
                      onChange={(e) => setWallHeightM(Number(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>Toe Width (B_toe)</span>
                      <span className="font-mono text-amber-300">{toeWidthM} m</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.5"
                      step="0.1"
                      value={toeWidthM}
                      onChange={(e) => setToeWidthM(Number(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>Heel Width (B_heel)</span>
                      <span className="font-mono text-amber-300">{heelWidthM} m</span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="4.0"
                      step="0.2"
                      value={heelWidthM}
                      onChange={(e) => setHeelWidthM(Number(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-slate-300">Base Shear Key</span>
                    <input
                      type="checkbox"
                      checked={hasShearKey}
                      onChange={(e) => setHasShearKey(e.target.checked)}
                      className="accent-amber-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {(activeMode === 'sheet-pile' || activeMode === 'peck-cut') && (
              <div className="pt-4 border-t border-slate-800">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-1.5">
                  <Anchor className="w-4 h-4" /> Excavation & Bracing
                </h3>
                <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>Excavation Depth (H)</span>
                      <span className="font-mono text-amber-300">{excavationDepthM} m</span>
                    </div>
                    <input
                      type="range"
                      min="3"
                      max="12"
                      step="0.5"
                      value={excavationDepthM}
                      onChange={(e) => setExcavationDepthM(Number(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                  </div>

                  {activeMode === 'sheet-pile' && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300">Anchored Tieback</span>
                        <input
                          type="checkbox"
                          checked={isAnchored}
                          onChange={(e) => setIsAnchored(e.target.checked)}
                          className="accent-amber-500"
                        />
                      </div>
                      {isAnchored && (
                        <div>
                          <div className="flex justify-between text-slate-300 mb-1">
                            <span>Anchor Depth (h_a)</span>
                            <span className="font-mono text-amber-300">{anchorDepthM} m</span>
                          </div>
                          <input
                            type="range"
                            min="1.0"
                            max="3.0"
                            step="0.2"
                            value={anchorDepthM}
                            onChange={(e) => setAnchorDepthM(Number(e.target.value))}
                            className="w-full accent-amber-500"
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {activeMode === 'slope-stability' && (
              <div className="pt-4 border-t border-slate-800">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-1.5">
                  <Mountain className="w-4 h-4" /> Slope Geometry
                </h3>
                <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>Slope Inclination (β)</span>
                      <span className="font-mono text-amber-300">{slopeAngleDeg}°</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="50"
                      step="1"
                      value={slopeAngleDeg}
                      onChange={(e) => setSlopeAngleDeg(Number(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>Slope Height (H)</span>
                      <span className="font-mono text-amber-300">{slopeHeightM} m</span>
                    </div>
                    <input
                      type="range"
                      min="3"
                      max="12"
                      step="0.5"
                      value={slopeHeightM}
                      onChange={(e) => setSlopeHeightM(Number(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                  </div>

                  <div className="pt-2">
                    <span className="text-slate-300 block mb-1">Slices Solver Method</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setSlopeMethod('bishop')}
                        className={`py-1 rounded text-[11px] font-semibold ${
                          slopeMethod === 'bishop'
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        Bishop's
                      </button>
                      <button
                        onClick={() => setSlopeMethod('fellenius')}
                        className={`py-1 rounded text-[11px] font-semibold ${
                          slopeMethod === 'fellenius'
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        Fellenius
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </aside>

          {/* Center 3D Viewport & Visualizer */}
          <main className="flex-1 flex flex-col relative bg-slate-950">
            {/* Overlay Viewport Controls */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/60 shadow-lg text-xs">
              <span className="text-slate-400 font-medium">Overlays:</span>
              <button
                onClick={() => setShowPressureDiagram(!showPressureDiagram)}
                className={`px-2 py-0.5 rounded font-mono transition-colors ${
                  showPressureDiagram ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400'
                }`}
              >
                Pressures
              </button>
              {activeMode === 'slope-stability' && (
                <button
                  onClick={() => setShowSlices(!showSlices)}
                  className={`px-2 py-0.5 rounded font-mono transition-colors ${
                    showSlices ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400'
                  }`}
                >
                  Slices
                </button>
              )}
            </div>

            {/* 3D Canvas Mount */}
            <div ref={mountRef} className="w-full flex-1" />

            {/* Bottom Floating Engineering Scorecard */}
            <div className="h-44 bg-slate-950/90 border-t border-slate-800/80 px-6 py-4 flex flex-col justify-between shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Geotechnical & Structural Design Verifications
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Standard: Eurocode 7 (EN 1997) • AASHTO LRFD • Peck (1969)
                </div>
              </div>

              {/* Dynamic KPI Cards Based on Active Domain */}
              {activeMode === 'retaining-wall' && (
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span>Sliding Safety Factor</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                          wallStabilityResult.status.slidingPass
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-950 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {wallStabilityResult.status.slidingPass ? 'PASS (≥1.5)' : 'FAIL'}
                      </span>
                    </div>
                    <div className="text-xl font-bold font-mono text-white mt-1">
                      {wallStabilityResult.safetyFactorSliding.toFixed(2)}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Resisting: {(wallStabilityResult.totalVerticalLoad * 0.45).toFixed(1)} kN/m
                    </div>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span>Overturning Safety Factor</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                          wallStabilityResult.status.overturningPass
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-950 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {wallStabilityResult.status.overturningPass ? 'PASS (≥2.0)' : 'FAIL'}
                      </span>
                    </div>
                    <div className="text-xl font-bold font-mono text-white mt-1">
                      {wallStabilityResult.safetyFactorOverturning.toFixed(2)}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Driving Moment: {wallStabilityResult.totalOverturningMoment.toFixed(1)} kN·m/m
                    </div>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span>Toe Bearing Pressure</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                          wallStabilityResult.status.bearingPass
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-950 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {wallStabilityResult.status.bearingPass ? 'PASS (≤280 kPa)' : 'FAIL'}
                      </span>
                    </div>
                    <div className="text-xl font-bold font-mono text-white mt-1">
                      {wallStabilityResult.bearingPressureToe.toFixed(1)}{' '}
                      <span className="text-xs text-slate-400">kPa</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Eccentricity: {wallStabilityResult.eccentricity.toFixed(2)} m (Kern: ≤{' '}
                      {wallStabilityResult.kernLimit.toFixed(2)} m)
                    </div>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span>Stem Base Demand</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-400 border border-amber-500/30">
                        RC STEM
                      </span>
                    </div>
                    <div className="text-xl font-bold font-mono text-amber-300 mt-1">
                      {wallStabilityResult.stemBaseMoment.toFixed(1)}{' '}
                      <span className="text-xs text-slate-400">kN·m/m</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Base Shear: {wallStabilityResult.stemBaseShear.toFixed(1)} kN/m
                    </div>
                  </div>
                </div>
              )}

              {activeMode === 'sheet-pile' && (
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span>Required Embedment Depth</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-950 text-sky-400 border border-sky-500/30">
                        D_design
                      </span>
                    </div>
                    <div className="text-xl font-bold font-mono text-white mt-1">
                      {sheetPileResult.designEmbedmentDepth.toFixed(2)}{' '}
                      <span className="text-xs text-slate-400">m</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Total Pile Length: {sheetPileResult.totalPileLength.toFixed(1)} m
                    </div>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span>Peak Bending Moment</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-400 border border-amber-500/30">
                        M_max
                      </span>
                    </div>
                    <div className="text-xl font-bold font-mono text-amber-300 mt-1">
                      {'maxSpanMoment' in sheetPileResult
                        ? sheetPileResult.maxSpanMoment.toFixed(1)
                        : sheetPileResult.maxBendingMoment.toFixed(1)}{' '}
                      <span className="text-xs text-slate-400">kN·m/m</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Req. Section Modulus: {sheetPileResult.requiredSectionModulus.toFixed(0)} cm³/m
                    </div>
                  </div>

                  {isAnchored && 'tieback' in sheetPileResult && (
                    <>
                      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                        <div className="flex justify-between items-center text-xs text-slate-400">
                          <span>Tieback Anchor Tension</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-950 text-indigo-400 border border-indigo-500/30">
                            ANCHOR
                          </span>
                        </div>
                        <div className="text-xl font-bold font-mono text-white mt-1">
                          {sheetPileResult.tieback.designAnchorLoad.toFixed(1)}{' '}
                          <span className="text-xs text-slate-400">kN</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Anchor Force: {sheetPileResult.anchorTensionForce.toFixed(1)} kN/m
                        </div>
                      </div>

                      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                        <div className="flex justify-between items-center text-xs text-slate-400">
                          <span>Grouted Bond Length</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                            L_bond
                          </span>
                        </div>
                        <div className="text-xl font-bold font-mono text-white mt-1">
                          {sheetPileResult.tieback.bondLength.toFixed(1)}{' '}
                          <span className="text-xs text-slate-400">m</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Free Length: {sheetPileResult.tieback.freeLength.toFixed(1)} m (Total:{' '}
                          {sheetPileResult.tieback.totalTiebackLength.toFixed(1)} m)
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeMode === 'peck-cut' && (
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span>Apparent Pressure Envelope</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-950 text-sky-400 border border-sky-500/30">
                        {peckResult.soilType.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-xl font-bold font-mono text-white mt-1">
                      {peckResult.apparentPressure.toFixed(1)}{' '}
                      <span className="text-xs text-slate-400">kPa</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Total Lateral: {peckResult.totalLateralLoad.toFixed(1)} kN/m
                    </div>
                  </div>

                  {peckResult.strutLoads.map((strut, idx) => (
                    <div
                      key={strut.level}
                      className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between"
                    >
                      <div className="flex justify-between items-center text-xs text-slate-400">
                        <span>Strut Tier {strut.level} Demand</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950 text-rose-400 border border-rose-500/30">
                          DEPTH {strut.depth}m
                        </span>
                      </div>
                      <div className="text-xl font-bold font-mono text-amber-300 mt-1">
                        {strut.designStrutLoad.toFixed(1)}{' '}
                        <span className="text-xs text-slate-400">kN</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Tributary Height: {strut.tributaryHeight.toFixed(2)} m ({strut.loadPerMeter.toFixed(1)} kN/m)
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeMode === 'slope-stability' && (
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span>Global Safety Factor</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                          slopeResult.isSafe
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-950 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {slopeResult.isSafe ? 'STABLE (≥1.3)' : 'UNSTABLE'}
                      </span>
                    </div>
                    <div className="text-xl font-bold font-mono text-white mt-1">
                      {slopeResult.factorOfSafety.toFixed(2)}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Method: {slopeResult.method === 'bishop' ? "Bishop's Simplified" : 'Fellenius Ordinary'}
                    </div>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span>Critical Slip Circle</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-400 border border-amber-500/30">
                        RADIUS {slopeResult.criticalCircle.radius.toFixed(1)}m
                      </span>
                    </div>
                    <div className="text-xl font-bold font-mono text-white mt-1">
                      ({slopeResult.criticalCircle.xc.toFixed(1)}, {slopeResult.criticalCircle.yc.toFixed(1)})
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Discretized into {slopeResult.slices.length} vertical slices
                    </div>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span>Driving Overturning Moment</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950 text-rose-400 border border-rose-500/30">
                        M_drive
                      </span>
                    </div>
                    <div className="text-xl font-bold font-mono text-rose-300 mt-1">
                      {slopeResult.totalDrivingMoment.toFixed(1)}{' '}
                      <span className="text-xs text-slate-400">kN·m/m</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Resisting Moment: {slopeResult.totalResistingMoment.toFixed(1)} kN·m/m
                    </div>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span>Phreatic Influence</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-950 text-sky-400 border border-sky-500/30">
                        PORE PRESSURE
                      </span>
                    </div>
                    <div className="text-xl font-bold font-mono text-sky-300 mt-1">
                      {hasWaterTable ? `${waterTableDepth} m` : 'DRY SLOPE'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {hasWaterTable ? 'Pore pressure reduces slice base shear' : 'Zero buoyant uplift'}
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
