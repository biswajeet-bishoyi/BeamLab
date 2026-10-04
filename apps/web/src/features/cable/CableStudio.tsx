import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Activity,
  Layers,
  Sliders,
  ShieldCheck,
  TrendingUp,
  Download,
  RotateCcw,
  X,
  Info,
  Play,
  CheckCircle2,
  AlertTriangle,
  Cable,
  Anchor,
  Compass,
} from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  CatenaryGeometryEngine,
  ErnstModulusEngine,
  StayCableTuningEngine,
  SuspensionCableSystemEngine,
  STANDARD_CABLE_MATERIALS,
  STANDARD_CABLE_SECTIONS,
  CableStayGeometry,
  StayCableDefinition,
  DeckStationPoint,
  SuspensionBridgeGeometryInput,
} from '@beamstudio/cable-engine';

interface CableStudioProps {
  onClose: () => void;
}

export const CableStudio: React.FC<CableStudioProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'stay-bridge' | 'suspension' | 'ernst-catenary' | 'catalog'>('stay-bridge');

  // --- Cable-Stayed Bridge Parameters ---
  const [stayConfigType, setStayConfigType] = useState<'fan' | 'harp' | 'semi-harp'>('semi-harp');
  const [stayCountPerSide, setStayCountPerSide] = useState<number>(6); // per side (total 12 per tower)
  const [mainSpanM, setMainSpanM] = useState<number>(240);
  const [sideSpanM, setSideSpanM] = useState<number>(120);
  const [towerHeightM, setTowerHeightM] = useState<number>(70);
  const [deckDeadLoadKNm, setDeckDeadLoadKNm] = useState<number>(90);
  const [selectedStaySectionIdx, setSelectedStaySectionIdx] = useState<number>(3); // Ø80mm stay cable

  // --- Suspension Bridge Parameters ---
  const [suspMainSpanM, setSuspMainSpanM] = useState<number>(800);
  const [suspSagM, setSuspSagM] = useState<number>(80);
  const [suspTowerHeightM, setSuspTowerHeightM] = useState<number>(95);
  const [suspDeckDeadLoadKNm, setSuspDeckDeadLoadKNm] = useState<number>(110);
  const [suspHangerSpacingM, setSuspHangerSpacingM] = useState<number>(20);
  const [selectedMainCableIdx, setSelectedMainCableIdx] = useState<number>(5); // Ø250mm
  const [selectedHangerIdx, setSelectedHangerIdx] = useState<number>(1); // Ø30mm

  // --- Ernst & Catenary Parameters ---
  const [catenarySpanM, setCatenarySpanM] = useState<number>(150);
  const [catenaryLevelDiffM, setCatenaryLevelDiffM] = useState<number>(60);
  const [catenaryTensionKN, setCatenaryTensionKN] = useState<number>(1800);

  // 3D Canvas Mount
  const mountRef = useRef<HTMLDivElement>(null);

  // --- Calculations for Cable-Stayed Bridge & Tuning ---
  const stayBridgeAnalysis = useMemo(() => {
    const sec = STANDARD_CABLE_SECTIONS[selectedStaySectionIdx] ?? STANDARD_CABLE_SECTIONS[3]!;
    const mat = STANDARD_CABLE_MATERIALS.BRIDGE_STRAND_1860!;

    const cables: StayCableDefinition[] = [];
    const tributaryLengths: number[] = [];
    const deckSpacing = mainSpanM / (stayCountPerSide + 1);
    const sideDeckSpacing = sideSpanM / (stayCountPerSide + 1);

    // Create Backstays (Side Span)
    for (let i = 1; i <= stayCountPerSide; i++) {
      const xDeck = -i * sideDeckSpacing;
      let yTower = towerHeightM;
      if (stayConfigType === 'harp') {
        yTower = towerHeightM * (i / stayCountPerSide);
      } else if (stayConfigType === 'semi-harp') {
        yTower = towerHeightM * (0.5 + 0.5 * (i / stayCountPerSide));
      }

      const geom = ErnstModulusEngine.createGeometry(`BACK-${i}`, xDeck, 0, 0, yTower);
      cables.push({
        id: `BS-${i}`,
        name: `Backstay #${i}`,
        geometry: geom,
        section: sec,
        material: mat,
        deckAttachmentIndex: i - 1,
        towerAttachmentHeight: yTower,
      });
      tributaryLengths.push(sideDeckSpacing);
    }

    // Create Fore-stays (Main Span)
    for (let i = 1; i <= stayCountPerSide; i++) {
      const xDeck = i * deckSpacing;
      let yTower = towerHeightM;
      if (stayConfigType === 'harp') {
        yTower = towerHeightM * (i / stayCountPerSide);
      } else if (stayConfigType === 'semi-harp') {
        yTower = towerHeightM * (0.5 + 0.5 * (i / stayCountPerSide));
      }

      const geom = ErnstModulusEngine.createGeometry(`FORE-${i}`, xDeck, 0, 0, yTower);
      cables.push({
        id: `FS-${i}`,
        name: `Fore-stay #${i}`,
        geometry: geom,
        section: sec,
        material: mat,
        deckAttachmentIndex: stayCountPerSide + i - 1,
        towerAttachmentHeight: yTower,
      });
      tributaryLengths.push(deckSpacing);
    }

    const deadLoadNm = deckDeadLoadKNm * 1000;
    const tuningItems = StayCableTuningEngine.solveZeroDisplacementTensions(
      cables,
      deadLoadNm,
      tributaryLengths
    );

    // Deck moments simulation with/without tuning
    const deckStations: DeckStationPoint[] = [];
    const numStations = 21;
    for (let s = 0; s <= numStations; s++) {
      const x = (mainSpanM * s) / numStations;
      // Parabolic uncompensated beam moment
      const M0 = (deadLoadNm * x * (mainSpanM - x)) / 2 / 1000; // kNm
      const d0 = (5 * deadLoadNm * Math.pow(x, 2) * Math.pow(mainSpanM - x, 2)) / (384 * 35e9 * 0.8);
      deckStations.push({
        id: `st_${s}`,
        x,
        deadLoadMoment: M0,
        deadLoadDeflection: d0,
      });
    }

    const totalTension = tuningItems.reduce((acc, c) => acc + c.optimalTension, 0);
    const avgSafetyFactor = tuningItems.reduce((acc, c) => acc + c.safetyFactor, 0) / tuningItems.length;

    return {
      cables,
      tuningItems,
      deckStations,
      totalTensionKN: totalTension / 1000,
      avgSafetyFactor,
      deckSpacing,
      sideDeckSpacing,
    };
  }, [
    stayConfigType,
    stayCountPerSide,
    mainSpanM,
    sideSpanM,
    towerHeightM,
    deckDeadLoadKNm,
    selectedStaySectionIdx,
  ]);

  // --- Calculations for Suspension Bridge ---
  const suspensionAnalysis = useMemo(() => {
    const mainSec = STANDARD_CABLE_SECTIONS[selectedMainCableIdx] ?? STANDARD_CABLE_SECTIONS[5]!;
    const hangerSec = STANDARD_CABLE_SECTIONS[selectedHangerIdx] ?? STANDARD_CABLE_SECTIONS[1]!;
    const mat = STANDARD_CABLE_MATERIALS.BRIDGE_STRAND_1860!;

    const suspInput: SuspensionBridgeGeometryInput = {
      id: 'SUSP-STUDIO',
      name: 'Studio Suspension Model',
      mainSpanLength: suspMainSpanM,
      sideSpan1Length: suspMainSpanM * 0.35,
      sideSpan2Length: suspMainSpanM * 0.35,
      mainSpanSag: suspSagM,
      tower1HeightAboveDeck: suspTowerHeightM,
      tower2HeightAboveDeck: suspTowerHeightM,
      deckDeadLoadPerMeter: suspDeckDeadLoadKNm * 1000,
      hangerSpacing: suspHangerSpacingM,
      mainCableSection: mainSec,
      mainCableMaterial: mat,
      hangerSection: hangerSec,
      hangerMaterial: mat,
      saddleRadius: 5.5,
      saddleFrictionCoeff: 0.15,
    };

    return SuspensionCableSystemEngine.solveSuspensionSystem(suspInput);
  }, [
    suspMainSpanM,
    suspSagM,
    suspTowerHeightM,
    suspDeckDeadLoadKNm,
    suspHangerSpacingM,
    selectedMainCableIdx,
    selectedHangerIdx,
  ]);

  // --- Calculations for Ernst & Catenary ---
  const ernstAnalysis = useMemo(() => {
    const sec = STANDARD_CABLE_SECTIONS[selectedStaySectionIdx] ?? STANDARD_CABLE_SECTIONS[3]!;
    const mat = STANDARD_CABLE_MATERIALS.BRIDGE_STRAND_1860!;
    const geom = ErnstModulusEngine.createGeometry(
      'CAT-01',
      0,
      0,
      catenarySpanM,
      catenaryLevelDiffM
    );

    const tensionN = catenaryTensionKN * 1000;
    const ernstRes = ErnstModulusEngine.calculateTangentModulus(geom, sec, mat, tensionN);

    const supportA = { id: 'A', x: 0, y: 0, type: 'fixed_anchor' as const };
    const supportB = { id: 'B', x: catenarySpanM, y: catenaryLevelDiffM, type: 'fixed_anchor' as const };
    const catenaryProfile = CatenaryGeometryEngine.solveCatenaryByTension(
      supportA,
      supportB,
      sec,
      mat,
      tensionN,
      41
    );

    // Stress degradation curve points (from 50 MPa to 1000 MPa)
    const curvePoints: { stressMPa: number; eta: number; eTanGpa: number }[] = [];
    for (let sigma = 50; sigma <= 1000; sigma += 50) {
      const t = sigma * 1e6 * sec.metallicArea;
      const res = ErnstModulusEngine.calculateTangentModulus(geom, sec, mat, t);
      curvePoints.push({
        stressMPa: sigma,
        eta: res.reductionFactor,
        eTanGpa: res.tangentModulus / 1e9,
      });
    }

    return {
      geom,
      ernstRes,
      catenaryProfile,
      curvePoints,
      materialE0Gpa: mat.elasticModulus / 1e9,
    };
  }, [catenarySpanM, catenaryLevelDiffM, catenaryTensionKN, selectedStaySectionIdx]);

  // --- 3D Scene Rendering ---
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1d);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 3000);
    camera.position.set(0, 100, 350);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    dirLight.position.set(100, 200, 150);
    scene.add(dirLight);

    const gridHelper = new THREE.GridHelper(800, 40, 0x1e293b, 0x0f172a);
    gridHelper.position.y = -1;
    scene.add(gridHelper);

    if (activeTab === 'stay-bridge') {
      // 3D Cable-Stayed Bridge Model
      // Bridge Deck
      const totalLen = mainSpanM + sideSpanM;
      const deckGeo = new THREE.BoxGeometry(totalLen, 2, 14);
      const deckMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 });
      const deckMesh = new THREE.Mesh(deckGeo, deckMat);
      deckMesh.position.set((mainSpanM - sideSpanM) / 2, 0, 0);
      scene.add(deckMesh);

      // Centerline Road Marking
      const roadGeo = new THREE.PlaneGeometry(totalLen, 0.3);
      const roadMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
      const roadMesh = new THREE.Mesh(roadGeo, roadMat);
      roadMesh.rotation.x = -Math.PI / 2;
      roadMesh.position.set((mainSpanM - sideSpanM) / 2, 1.05, 0);
      scene.add(roadMesh);

      // Pylon / Tower (A-frame or H-pylon)
      const towerColGeo = new THREE.BoxGeometry(4, towerHeightM, 4);
      const towerMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.3, metalness: 0.2 });

      const towerLeft = new THREE.Mesh(towerColGeo, towerMat);
      towerLeft.position.set(0, towerHeightM / 2, -6);
      scene.add(towerLeft);

      const towerRight = new THREE.Mesh(towerColGeo, towerMat);
      towerRight.position.set(0, towerHeightM / 2, 6);
      scene.add(towerRight);

      const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(3, 4, 14), towerMat);
      crossBeam.position.set(0, towerHeightM * 0.9, 0);
      scene.add(crossBeam);

      // Render Stay Cables with stress heatmap
      stayBridgeAnalysis.tuningItems.forEach((tuning) => {
        const cableDef = stayBridgeAnalysis.cables.find((c) => c.id === tuning.cableId);
        if (!cableDef) return;

        // Color mapped by stress ratio (0.15 = cyan, 0.30 = emerald, 0.45 = amber)
        const ratio = tuning.stressRatioGuts;
        const color = new THREE.Color().setHSL(0.55 - ratio * 0.8, 1.0, 0.55);

        const xDeck = cableDef.geometry.spanHorizontal * (cableDef.id.startsWith('BS') ? -1 : 1);
        const yTower = cableDef.towerAttachmentHeight;

        // Two planes of cables (+Z and -Z)
        [-5, 5].forEach((zOffset) => {
          const points = [
            new THREE.Vector3(xDeck, 1, zOffset),
            new THREE.Vector3(0, yTower, zOffset * 0.7),
          ];
          const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
          const lineMat = new THREE.LineBasicMaterial({ color, linewidth: 2 });
          const line = new THREE.Line(lineGeo, lineMat);
          scene.add(line);
        });
      });
    } else {
      // 3D Suspension Bridge Model
      const L = suspMainSpanM;
      const f = suspSagM;
      const Ht = suspTowerHeightM;

      // Deck
      const deckGeo = new THREE.BoxGeometry(L * 1.5, 3, 18);
      const deckMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
      const deck = new THREE.Mesh(deckGeo, deckMat);
      scene.add(deck);

      // Towers at -L/2 and +L/2
      [-L / 2, L / 2].forEach((xPos) => {
        const pylon = new THREE.Mesh(
          new THREE.BoxGeometry(6, Ht, 6),
          new THREE.MeshStandardMaterial({ color: 0x94a3b8 })
        );
        pylon.position.set(xPos, Ht / 2, 0);
        scene.add(pylon);
      });

      // Main Cable Catenary Curve
      const cablePoints: THREE.Vector3[] = [];
      const numPts = 60;
      for (let i = 0; i <= numPts; i++) {
        const u = i / numPts; // 0 to 1
        const x = -L / 2 + u * L;
        const y = Ht - 4 * f * u * (1 - u);
        cablePoints.push(new THREE.Vector3(x, y, 7));
      }
      const cableGeo = new THREE.BufferGeometry().setFromPoints(cablePoints);
      const cableLineMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 3 });
      scene.add(new THREE.Line(cableGeo, cableLineMat));

      // Suspenders
      suspensionAnalysis.hangers.forEach((hgr) => {
        const x = -L / 2 + hgr.stationX;
        const pts = [new THREE.Vector3(x, 1.5, 7), new THREE.Vector3(x, hgr.mainCableY, 7)];
        const hgrGeo = new THREE.BufferGeometry().setFromPoints(pts);
        const hgrMat = new THREE.LineBasicMaterial({ color: 0x10b981, linewidth: 1.5 });
        scene.add(new THREE.Line(hgrGeo, hgrMat));
      });
    }

    let reqId: number;
    const animate = () => {
      reqId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [
    activeTab,
    stayBridgeAnalysis,
    suspensionAnalysis,
    mainSpanM,
    sideSpanM,
    towerHeightM,
    suspMainSpanM,
    suspSagM,
    suspTowerHeightM,
  ]);

  const handleExportSchedule = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Cable ID,Tension (kN),Stress (MPa),Stress/fpu,Safety Factor,Lift Force (kN),Horiz Force (kN)\n' +
      stayBridgeAnalysis.tuningItems
        .map(
          (c) =>
            `${c.cableId},${(c.optimalTension / 1000).toFixed(1)},${(c.optimalStress / 1e6).toFixed(1)},${(c.stressRatioGuts * 100).toFixed(1)}%,${c.safetyFactor.toFixed(2)},${(c.verticalLiftForce / 1000).toFixed(1)},${(c.horizontalForce / 1000).toFixed(1)}`
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Cable_Tuning_Schedule_${stayConfigType}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Studio Header */}
      <header className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 via-sky-500 to-cyan-500 text-white shadow-lg shadow-sky-500/20">
            <Cable size={22} className="stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white">
                Cable & Tension Structures Engineering Studio
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/30">
                Sprint B18 • Ernst & Catenary Kernel
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Exact Catenary Kinematics, Ernst Equivalent Modulus, Stay Pre-Tension Tuning & Suspension Saddles
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            onClick={() => setActiveTab('stay-bridge')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'stay-bridge'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Anchor size={14} />
            <span>Cable-Stayed Bridge & Tuning</span>
          </button>
          <button
            onClick={() => setActiveTab('suspension')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'suspension'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Compass size={14} />
            <span>Suspension Bridge System</span>
          </button>
          <button
            onClick={() => setActiveTab('ernst-catenary')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'ernst-catenary'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <TrendingUp size={14} />
            <span>Ernst Modulus & Catenary</span>
          </button>
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'catalog'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers size={14} />
            <span>Strand & Cable Catalog</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportSchedule}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* Main Studio Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Interactive Parameter Sidebar */}
        <aside className="w-84 border-r border-slate-800/80 bg-slate-900/60 p-5 overflow-y-auto space-y-6">
          {activeTab === 'stay-bridge' && (
            <>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-sky-400 block mb-2">
                  Stay Configuration Topology
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['fan', 'semi-harp', 'harp'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setStayConfigType(type)}
                      className={`px-2 py-2 rounded-lg text-xs font-semibold capitalize border transition-all ${
                        stayConfigType === type
                          ? 'border-sky-500 bg-sky-500/20 text-sky-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Stays per Span</span>
                  <span className="font-semibold text-sky-400">{stayCountPerSide} stays</span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={12}
                  step={1}
                  value={stayCountPerSide}
                  onChange={(e) => setStayCountPerSide(parseInt(e.target.value))}
                  className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Main Span Length</span>
                  <span className="font-semibold text-sky-400">{mainSpanM} m</span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={500}
                  step={20}
                  value={mainSpanM}
                  onChange={(e) => setMainSpanM(parseFloat(e.target.value))}
                  className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Tower Height Above Deck</span>
                  <span className="font-semibold text-sky-400">{towerHeightM} m</span>
                </div>
                <input
                  type="range"
                  min={30}
                  max={150}
                  step={5}
                  value={towerHeightM}
                  onChange={(e) => setTowerHeightM(parseFloat(e.target.value))}
                  className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Deck Dead Load</span>
                  <span className="font-semibold text-sky-400">{deckDeadLoadKNm} kN/m</span>
                </div>
                <input
                  type="range"
                  min={40}
                  max={200}
                  step={10}
                  value={deckDeadLoadKNm}
                  onChange={(e) => setDeckDeadLoadKNm(parseFloat(e.target.value))}
                  className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1.5">
                  Stay Cable Cross Section
                </label>
                <select
                  value={selectedStaySectionIdx}
                  onChange={(e) => setSelectedStaySectionIdx(parseInt(e.target.value))}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                >
                  {STANDARD_CABLE_SECTIONS.map((sec, idx) => (
                    <option key={sec.id} value={idx}>
                      {sec.name} (Ø{(sec.diameter * 1000).toFixed(0)}mm)
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {activeTab === 'suspension' && (
            <>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Main Span Length</span>
                  <span className="font-semibold text-sky-400">{suspMainSpanM} m</span>
                </div>
                <input
                  type="range"
                  min={300}
                  max={1600}
                  step={50}
                  value={suspMainSpanM}
                  onChange={(e) => setSuspMainSpanM(parseFloat(e.target.value))}
                  className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Main Cable Sag (f)</span>
                  <span className="font-semibold text-sky-400">{suspSagM} m (1:{(suspMainSpanM / suspSagM).toFixed(1)})</span>
                </div>
                <input
                  type="range"
                  min={30}
                  max={200}
                  step={5}
                  value={suspSagM}
                  onChange={(e) => setSuspSagM(parseFloat(e.target.value))}
                  className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Tower Height</span>
                  <span className="font-semibold text-sky-400">{suspTowerHeightM} m</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={250}
                  step={5}
                  value={suspTowerHeightM}
                  onChange={(e) => setSuspTowerHeightM(parseFloat(e.target.value))}
                  className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Suspender Hanger Spacing</span>
                  <span className="font-semibold text-sky-400">{suspHangerSpacingM} m</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={40}
                  step={5}
                  value={suspHangerSpacingM}
                  onChange={(e) => setSuspHangerSpacingM(parseFloat(e.target.value))}
                  className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            </>
          )}

          {activeTab === 'ernst-catenary' && (
            <>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Horizontal Chord Span</span>
                  <span className="font-semibold text-sky-400">{catenarySpanM} m</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={500}
                  step={25}
                  value={catenarySpanM}
                  onChange={(e) => setCatenarySpanM(parseFloat(e.target.value))}
                  className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Tower Level Difference</span>
                  <span className="font-semibold text-sky-400">{catenaryLevelDiffM} m</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={200}
                  step={10}
                  value={catenaryLevelDiffM}
                  onChange={(e) => setCatenaryLevelDiffM(parseFloat(e.target.value))}
                  className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Applied Cable Tension</span>
                  <span className="font-semibold text-sky-400">{catenaryTensionKN} kN</span>
                </div>
                <input
                  type="range"
                  min={200}
                  max={6000}
                  step={100}
                  value={catenaryTensionKN}
                  onChange={(e) => setCatenaryTensionKN(parseFloat(e.target.value))}
                  className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            </>
          )}
        </aside>

        {/* Center 3D / Analytics Canvas */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-950">
          {/* Top 3D Viewport */}
          <div className="h-3/5 relative border-b border-slate-800/80">
            <div ref={mountRef} className="w-full h-full" />
            <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-800 flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-medium text-slate-300">
                  {activeTab === 'stay-bridge' ? 'Cable-Stayed 3D Kernel' : 'Suspension 3D Catenary'}
                </span>
              </div>
              <span className="text-slate-600">|</span>
              <span className="text-[11px] text-slate-400">Drag to Orbit • Scroll to Zoom</span>
            </div>
          </div>

          {/* Bottom Analytical Results Panel */}
          <div className="h-2/5 overflow-y-auto p-5 space-y-4 bg-slate-900/40">
            {activeTab === 'stay-bridge' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-400" />
                    <span>PTI Stay Cable Tuning & Stress Verification</span>
                  </h3>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-slate-400">
                      Total Prestress: <strong className="text-sky-400">{stayBridgeAnalysis.totalTensionKN.toFixed(0)} kN</strong>
                    </span>
                    <span className="text-slate-400">
                      Mean Safety Factor: <strong className="text-emerald-400">{stayBridgeAnalysis.avgSafetyFactor.toFixed(2)}</strong>
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="px-3.5 py-2">Stay Cable</th>
                        <th className="px-3.5 py-2">Chord (m)</th>
                        <th className="px-3.5 py-2">Angle (°)</th>
                        <th className="px-3.5 py-2">Tuning Tension (kN)</th>
                        <th className="px-3.5 py-2">Stress (MPa)</th>
                        <th className="px-3.5 py-2">Stress / f_pu</th>
                        <th className="px-3.5 py-2">Vertical Lift (kN)</th>
                        <th className="px-3.5 py-2">Safety Factor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {stayBridgeAnalysis.tuningItems.map((item) => {
                        const cableDef = stayBridgeAnalysis.cables.find((c) => c.id === item.cableId);
                        const deg = cableDef ? (cableDef.geometry.inclinationAngleRad * 180) / Math.PI : 0;
                        const chord = cableDef ? cableDef.geometry.chordLength : 0;
                        const inEnvelope = item.stressRatioGuts >= 0.15 && item.stressRatioGuts <= 0.45;

                        return (
                          <tr key={item.cableId} className="hover:bg-slate-800/30 transition-colors">
                            <td className="px-3.5 py-2 font-sans font-medium text-slate-200">
                              {item.cableId}
                            </td>
                            <td className="px-3.5 py-2 text-slate-300">{chord.toFixed(1)}</td>
                            <td className="px-3.5 py-2 text-slate-300">{deg.toFixed(1)}°</td>
                            <td className="px-3.5 py-2 font-bold text-sky-400">
                              {(item.optimalTension / 1000).toFixed(0)}
                            </td>
                            <td className="px-3.5 py-2 text-slate-200">
                              {(item.optimalStress / 1e6).toFixed(0)}
                            </td>
                            <td className="px-3.5 py-2">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  inEnvelope
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                }`}
                              >
                                {(item.stressRatioGuts * 100).toFixed(1)}% PTI
                              </span>
                            </td>
                            <td className="px-3.5 py-2 text-slate-300">
                              {(item.verticalLiftForce / 1000).toFixed(0)}
                            </td>
                            <td className="px-3.5 py-2 text-emerald-400 font-bold">
                              {item.safetyFactor.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'suspension' && (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-3">
                  <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400 block mb-1">Horizontal Cable Tension (H)</span>
                    <strong className="text-lg font-bold text-sky-400 font-mono">
                      {(suspensionAnalysis.mainHorizontalTension / 1e6).toFixed(2)} MN
                    </strong>
                  </div>
                  <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400 block mb-1">Max Tension at Saddle (T_max)</span>
                    <strong className="text-lg font-bold text-indigo-400 font-mono">
                      {(suspensionAnalysis.maxMainCableTension / 1e6).toFixed(2)} MN
                    </strong>
                  </div>
                  <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400 block mb-1">Tower Vertical Thrust</span>
                    <strong className="text-lg font-bold text-emerald-400 font-mono">
                      {(suspensionAnalysis.saddles[0].verticalTowerThrust / 1e6).toFixed(2)} MN
                    </strong>
                  </div>
                  <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400 block mb-1">Saddle Sliding Safety Factor</span>
                    <strong className="text-lg font-bold text-emerald-400 font-mono">
                      {suspensionAnalysis.saddles[0].saddleSlippingSafetyFactor.toFixed(2)} SF
                    </strong>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="px-3 py-1.5">Hanger</th>
                        <th className="px-3 py-1.5">Station X (m)</th>
                        <th className="px-3 py-1.5">Stressed Length (m)</th>
                        <th className="px-3 py-1.5">Fabrication L_0 (m)</th>
                        <th className="px-3 py-1.5">Elastic Stretch (mm)</th>
                        <th className="px-3 py-1.5">Tension (kN)</th>
                        <th className="px-3 py-1.5">Clamp Slip SF</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {suspensionAnalysis.hangers.slice(0, 8).map((hgr) => (
                        <tr key={hgr.id} className="hover:bg-slate-800/30">
                          <td className="px-3 py-1.5 font-sans font-medium text-slate-200">{hgr.id}</td>
                          <td className="px-3 py-1.5 text-slate-300">{hgr.stationX}</td>
                          <td className="px-3 py-1.5 text-sky-400">{hgr.stressedLength.toFixed(2)}</td>
                          <td className="px-3 py-1.5 text-emerald-400">{hgr.unstressedLength.toFixed(2)}</td>
                          <td className="px-3 py-1.5 text-slate-300">{(hgr.elasticElongation * 1000).toFixed(1)}</td>
                          <td className="px-3 py-1.5 text-slate-200">{(hgr.tension / 1000).toFixed(0)}</td>
                          <td className="px-3 py-1.5 text-emerald-400">{hgr.clampSlippingSafetyFactor.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'ernst-catenary' && (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400 block mb-1">Ernst Tangent Modulus</span>
                    <strong className="text-base font-bold text-sky-400 font-mono">
                      {(ernstAnalysis.ernstRes.tangentModulus / 1e9).toFixed(1)} GPa
                    </strong>
                    <span className="text-[10px] text-slate-500 block">
                      vs {ernstAnalysis.materialE0Gpa.toFixed(0)} GPa virgin
                    </span>
                  </div>
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400 block mb-1">Modulus Retention (eta)</span>
                    <strong className="text-base font-bold text-emerald-400 font-mono">
                      {(ernstAnalysis.ernstRes.reductionFactor * 100).toFixed(1)}%
                    </strong>
                  </div>
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400 block mb-1">Irvine Parameter (lambda^2)</span>
                    <strong className="text-base font-bold text-indigo-400 font-mono">
                      {ernstAnalysis.ernstRes.irvineParameter.toFixed(3)}
                    </strong>
                  </div>
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400 block mb-1">Exact Catenary Sag</span>
                    <strong className="text-base font-bold text-amber-400 font-mono">
                      {ernstAnalysis.catenaryProfile.sag.toFixed(2)} m
                    </strong>
                  </div>
                </div>

                <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
                  <h4 className="text-xs font-bold text-slate-300 mb-2">
                    Ernst Modulus vs Axial Cable Stress Degradation Curve
                  </h4>
                  <div className="flex items-end gap-1.5 h-28 pt-4">
                    {ernstAnalysis.curvePoints.map((pt) => (
                      <div key={pt.stressMPa} className="flex-1 flex flex-col items-center gap-1 group">
                        <div
                          style={{ height: `${pt.eta * 100}%` }}
                          className="w-full bg-gradient-to-t from-sky-600 to-cyan-400 rounded-t-sm transition-all group-hover:brightness-125"
                        />
                        <span className="text-[9px] text-slate-500 rotate-45 mt-1 font-mono">
                          {pt.stressMPa}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-3 text-center">
                    Axial Stress σ (MPa) • Bar height represents equivalent modulus retention η = E_eq / E_0
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'catalog' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                    Standard Cable Materials (ASTM, EN 12385, PTI)
                  </h4>
                  <div className="space-y-2">
                    {Object.values(STANDARD_CABLE_MATERIALS).map((mat) => (
                      <div key={mat.id} className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800/80">
                        <div className="flex justify-between items-center mb-1">
                          <strong className="text-xs text-white">{mat.name}</strong>
                          <span className="text-[11px] font-mono text-sky-400">{(mat.elasticModulus / 1e9).toFixed(0)} GPa</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span>f_pu: {(mat.tensileStrength / 1e6).toFixed(0)} MPa</span>
                          <span>f_y: {(mat.yieldStrength / 1e6).toFixed(0)} MPa</span>
                          <span>Fill: {mat.fillFactor ? `${(mat.fillFactor * 100).toFixed(0)}%` : '85%'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Factory Stay & Hanger Cross Sections
                  </h4>
                  <div className="space-y-2">
                    {STANDARD_CABLE_SECTIONS.map((sec) => (
                      <div key={sec.id} className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800/80">
                        <div className="flex justify-between items-center mb-1">
                          <strong className="text-xs text-white">{sec.name}</strong>
                          <span className="text-[11px] font-mono text-emerald-400">{(sec.breakingLoad / 1e6).toFixed(2)} MN</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span>Area: {(sec.metallicArea * 1e6).toFixed(0)} mm²</span>
                          <span>Weight: {sec.unitWeight.toFixed(1)} N/m</span>
                          <span>Ø: {(sec.diameter * 1000).toFixed(1)} mm</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
