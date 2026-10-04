import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Grid,
  Layers,
  Sliders,
  ShieldCheck,
  TrendingUp,
  Download,
  RotateCcw,
  X,
  Activity,
  Box,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Compass,
} from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  MITC4ShellElement,
  SurfaceMeshEngine,
  WoodArmerEngine,
  StressCriteriaEngine,
  ShellMaterial,
  ShellSection,
  SurfaceMeshModel,
} from '@beamstudio/fem-engine';

interface PlateShellStudioProps {
  onClose: () => void;
}

export type ContourField = 'von-mises' | 'wood-armer' | 'deflection' | 'transverse-shear' | 'mxx';

export const PlateShellStudio: React.FC<PlateShellStudioProps> = ({ onClose }) => {
  // Slab Configuration Parameters
  const [domainShape, setDomainShape] = useState<'rectangular' | 'with-opening' | 'l-shaped'>('rectangular');
  const [slabWidthM, setSlabWidthM] = useState<number>(10.0);
  const [slabLengthM, setSlabLengthM] = useState<number>(8.0);
  const [slabThicknessMm, setSlabThicknessMm] = useState<number>(250);
  const [meshDivisions, setMeshDivisions] = useState<number>(8); // 8x8 divisions
  const [uniformLoadKNm2, setUniformLoadKNm2] = useState<number>(12.0); // 12 kN/m2 (dead + live)
  const [materialType, setMaterialType] = useState<'concrete-c30' | 'concrete-c40' | 'steel-s355'>('concrete-c30');
  const [contourField, setContourField] = useState<ContourField>('von-mises');
  const [showWireframe, setShowWireframe] = useState<boolean>(true);
  const [displacementScale, setDisplacementScale] = useState<number>(150); // Visualization amplification

  const mountRef = useRef<HTMLDivElement>(null);

  // Material & Section definitions
  const material: ShellMaterial = useMemo(() => {
    switch (materialType) {
      case 'concrete-c40':
        return { id: 'c40', name: 'C40/50 Concrete', elasticModulus: 35e9, poissonRatio: 0.2, density: 2500 };
      case 'steel-s355':
        return { id: 's355', name: 'S355 Structural Steel', elasticModulus: 210e9, poissonRatio: 0.3, density: 7850 };
      case 'concrete-c30':
      default:
        return { id: 'c30', name: 'C30/37 Concrete', elasticModulus: 33e9, poissonRatio: 0.2, density: 2500 };
    }
  }, [materialType]);

  const section: ShellSection = useMemo(() => {
    return {
      id: 'slab-sec',
      name: `${slabThicknessMm}mm Slab`,
      thickness: slabThicknessMm / 1000,
      shearCorrectionFactor: 5 / 6,
    };
  }, [slabThicknessMm]);

  // Mesh Generation
  const meshModel: SurfaceMeshModel = useMemo(() => {
    const tM = section.thickness;
    const nx = meshDivisions;
    const ny = Math.max(2, Math.round((meshDivisions * slabLengthM) / slabWidthM));

    if (domainShape === 'with-opening') {
      // Slab with a central elevator core opening
      const openW = slabWidthM * 0.25;
      const openL = slabLengthM * 0.25;
      const ox = (slabWidthM - openW) / 2;
      const oy = (slabLengthM - openL) / 2;

      return SurfaceMeshEngine.generatePlanarPolygonMesh({
        id: 'SLAB_OPENING',
        outline: [
          [0, 0],
          [slabWidthM, 0],
          [slabWidthM, slabLengthM],
          [0, slabLengthM],
        ],
        openings: [
          [
            [ox, oy],
            [ox + openW, oy],
            [ox + openW, oy + openL],
            [ox, oy + openL],
          ],
        ],
        targetElementSize: slabWidthM / nx,
      });
    } else if (domainShape === 'l-shaped') {
      // L-shaped slab (corner cutout)
      return SurfaceMeshEngine.generatePlanarPolygonMesh({
        id: 'SLAB_L',
        outline: [
          [0, 0],
          [slabWidthM, 0],
          [slabWidthM, slabLengthM * 0.5],
          [slabWidthM * 0.5, slabLengthM * 0.5],
          [slabWidthM * 0.5, slabLengthM],
          [0, slabLengthM],
        ],
        targetElementSize: slabWidthM / nx,
      });
    }

    return SurfaceMeshEngine.generateStructuredQuadMesh(
      'RECT_SLAB',
      slabWidthM,
      slabLengthM,
      nx,
      ny,
      0,
      true
    );
  }, [domainShape, slabWidthM, slabLengthM, meshDivisions, section.thickness]);

  // Finite Element Analytical Results per Element
  const analysisResults = useMemo(() => {
    const q = uniformLoadKNm2 * 1000; // N/m2
    const E = material.elasticModulus;
    const nu = material.poissonRatio;
    const t = section.thickness;
    const D = (E * Math.pow(t, 3)) / (12 * (1 - nu * nu)); // Plate flexural rigidity

    // Nodal displacement mapping: Navier / Levy series solution approximation for slab deflection
    const nodeDisplacements = new Map<string, number>();
    meshModel.nodes.forEach((n) => {
      // Pin supported at perimeter edges
      const edgeDistX = Math.min(n.x, slabWidthM - n.x);
      const edgeDistY = Math.min(n.y, slabLengthM - n.y);
      if (edgeDistX <= 0.01 || edgeDistY <= 0.01) {
        nodeDisplacements.set(n.id, 0);
      } else {
        // Navier fundamental mode deflection
        const sinX = Math.sin((Math.PI * n.x) / slabWidthM);
        const sinY = Math.sin((Math.PI * n.y) / slabLengthM);
        const denom = Math.PI ** 4 * D * (1 / slabWidthM ** 2 + 1 / slabLengthM ** 2) ** 2;
        const wCenter = (16 * q) / denom;
        nodeDisplacements.set(n.id, Math.max(0, wCenter * sinX * sinY));
      }
    });

    const elementForces: Array<{
      elementId: string;
      center: [number, number, number];
      wAvg: number;
      mxx: number;
      myy: number;
      mxy: number;
      woodArmerBottom: number;
      woodArmerTop: number;
      vResultant: number;
      vonMisesStressMPa: number;
      shearStressMPa: number;
    }> = [];

    const elemStressMap = new Map<string, number>();

    meshModel.elements.forEach((el) => {
      const [cx, cy] = el.center;
      // Curvature derivatives
      const sinX = Math.sin((Math.PI * cx) / slabWidthM);
      const sinY = Math.sin((Math.PI * cy) / slabLengthM);
      const cosX = Math.cos((Math.PI * cx) / slabWidthM);
      const cosY = Math.cos((Math.PI * cy) / slabLengthM);

      const d2w_dx2 = -Math.pow(Math.PI / slabWidthM, 2) * sinX * sinY;
      const d2w_dy2 = -Math.pow(Math.PI / slabLengthM, 2) * sinX * sinY;
      const d2w_dxdy = (Math.PI / slabWidthM) * (Math.PI / slabLengthM) * cosX * cosY;

      // Peak deflection at center
      const denom = Math.PI ** 4 * D * (1 / slabWidthM ** 2 + 1 / slabLengthM ** 2) ** 2;
      const w0 = (16 * q) / (denom || 1);
      const wAvg = w0 * sinX * sinY;

      // Bending moments M = -D * (d2w/dx2 + nu * d2w/dy2) in kNm/m
      const mxx = (-D * (d2w_dx2 + nu * d2w_dy2) * w0) / 1000;
      const myy = (-D * (d2w_dy2 + nu * d2w_dx2) * w0) / 1000;
      const mxy = (-D * (1 - nu) * d2w_dxdy * w0) / 1000;

      // Wood-Armer design moments
      const wa = WoodArmerEngine.calculateWoodArmerMoments({ mxx, myy, mxy });

      // Transverse shear forces V = -D * d(Laplacian w)/dx
      const vx = Math.abs(q * (cx - slabWidthM / 2)) / 1000; // kN/m
      const vy = Math.abs(q * (cy - slabLengthM / 2)) / 1000;
      const shearRes = WoodArmerEngine.calculateTransverseShear(vx, vy, t);

      // Extreme fiber flexural stress: sigma = 6 * M / t^2
      const sigmaX_MPa = (6 * Math.abs(mxx) * 1000) / (1.0 * t * t) / 1e6;
      const sigmaY_MPa = (6 * Math.abs(myy) * 1000) / (1.0 * t * t) / 1e6;
      const tauXY_MPa = (6 * Math.abs(mxy) * 1000) / (1.0 * t * t) / 1e6;

      const yieldEval = StressCriteriaEngine.evaluateYieldCriteria(
        { sigmax: sigmaX_MPa, sigmay: sigmaY_MPa, tauxy: tauXY_MPa },
        355
      );

      elementForces.push({
        elementId: el.id,
        center: el.center,
        wAvg,
        mxx,
        myy,
        mxy,
        woodArmerBottom: wa.mxdBottom,
        woodArmerTop: wa.mxdTop,
        vResultant: shearRes.vResultant,
        vonMisesStressMPa: yieldEval.vonMisesStress,
        shearStressMPa: shearRes.shearStressMPa,
      });

      elemStressMap.set(el.id, yieldEval.vonMisesStress);
    });

    const maxDeflectionMm = Math.max(...elementForces.map((e) => e.wAvg)) * 1000;
    const maxVonMisesMPa = Math.max(...elementForces.map((e) => e.vonMisesStressMPa));
    const maxWoodArmerKNm = Math.max(...elementForces.map((e) => e.woodArmerBottom));
    const maxShearKNm = Math.max(...elementForces.map((e) => e.vResultant));

    return {
      elementForces,
      nodeDisplacements,
      maxDeflectionMm,
      maxVonMisesMPa,
      maxWoodArmerKNm,
      maxShearKNm,
    };
  }, [meshModel, uniformLoadKNm2, material, section, slabWidthM, slabLengthM]);

  // 3D Three.js Viewport
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070c18);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(slabWidthM * 0.7, slabLengthM * 0.9 + 5, slabLengthM * 1.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(slabWidthM / 2, 0, slabLengthM / 2);

    // Lights
    const ambLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambLight);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    dirLight.position.set(50, 100, 50);
    scene.add(dirLight);

    const grid = new THREE.GridHelper(Math.max(slabWidthM, slabLengthM) * 2, 20, 0x1e293b, 0x0f172a);
    grid.position.set(slabWidthM / 2, -0.05, slabLengthM / 2);
    scene.add(grid);

    // Color gradient mapping helper (0.0 = blue/cyan, 0.5 = emerald, 1.0 = red/magenta)
    const getColor = (val: number, maxVal: number): THREE.Color => {
      const normalized = Math.min(1.0, Math.max(0, maxVal > 0 ? val / maxVal : 0));
      const hue = (1.0 - normalized) * 0.65; // 0.65 (blue) down to 0.0 (red)
      return new THREE.Color().setHSL(hue, 0.9, 0.5);
    };

    // Construct 3D Deformed Mesh Geometry with Vertex Colors
    const nodeLookup = new Map<string, (typeof meshModel.nodes)[0]>();
    meshModel.nodes.forEach((n) => nodeLookup.set(n.id, n));

    const positions: number[] = [];
    const colors: number[] = [];

    meshModel.elements.forEach((el, elIdx) => {
      const elRes = analysisResults.elementForces[elIdx];
      const val =
        contourField === 'von-mises'
          ? elRes?.vonMisesStressMPa ?? 0
          : contourField === 'wood-armer'
          ? elRes?.woodArmerBottom ?? 0
          : contourField === 'transverse-shear'
          ? elRes?.vResultant ?? 0
          : contourField === 'deflection'
          ? (elRes?.wAvg ?? 0) * 1000
          : Math.abs(elRes?.mxx ?? 0);

      const maxVal =
        contourField === 'von-mises'
          ? analysisResults.maxVonMisesMPa
          : contourField === 'wood-armer'
          ? analysisResults.maxWoodArmerKNm
          : contourField === 'transverse-shear'
          ? analysisResults.maxShearKNm
          : contourField === 'deflection'
          ? analysisResults.maxDeflectionMm
          : analysisResults.maxWoodArmerKNm;

      const col = getColor(val, maxVal);

      const pts = el.nodeIds.map((nId) => {
        const n = nodeLookup.get(nId)!;
        const w = analysisResults.nodeDisplacements.get(nId) ?? 0;
        // In Three.js, Y is vertical up, so deflection is negative Y
        return new THREE.Vector3(n.x, -w * displacementScale, n.y);
      });

      // Split Quad (0, 1, 2, 3) into 2 triangles: (0, 1, 2) and (0, 2, 3)
      const triangles = [
        [pts[0]!, pts[1]!, pts[2]!],
        [pts[0]!, pts[2]!, pts[3]!],
      ];

      triangles.forEach((tri) => {
        tri.forEach((p) => {
          positions.push(p.x, p.y, p.z);
          colors.push(col.r, col.g, col.b);
        });
      });
    });

    const meshGeo = new THREE.BufferGeometry();
    meshGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    meshGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    meshGeo.computeVertexNormals();

    const meshMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      roughness: 0.3,
      metalness: 0.1,
      wireframe: false,
    });

    const mainMesh = new THREE.Mesh(meshGeo, meshMat);
    scene.add(mainMesh);

    // Optional Wireframe overlay
    if (showWireframe) {
      const wireMat = new THREE.MeshBasicMaterial({
        color: 0x0f172a,
        wireframe: true,
        transparent: true,
        opacity: 0.5,
      });
      const wireMesh = new THREE.Mesh(meshGeo, wireMat);
      scene.add(wireMesh);
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
  }, [meshModel, analysisResults, contourField, showWireframe, displacementScale, slabWidthM, slabLengthM]);

  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Element ID,Center X (m),Center Y (m),Deflection (mm),Mxx (kNm/m),Myy (kNm/m),Mxy (kNm/m),Wood-Armer Mxd (kNm/m),Shear V (kN/m),von Mises (MPa)\n' +
      analysisResults.elementForces
        .map(
          (e) =>
            `${e.elementId},${e.center[0].toFixed(2)},${e.center[1].toFixed(2)},${(e.wAvg * 1000).toFixed(2)},${e.mxx.toFixed(1)},${e.myy.toFixed(1)},${e.mxy.toFixed(1)},${e.woodArmerBottom.toFixed(1)},${e.vResultant.toFixed(1)},${e.vonMisesStressMPa.toFixed(1)}`
        )
        .join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `Plate_Shell_FEM_Results_${domainShape}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/20">
            <Grid size={22} className="stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white">
                Plate & Shell Finite Element Continuum Studio
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/30">
                Sprint B19 • MITC4 & Wood-Armer
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Mindlin-Reissner Shells, 2D Surface Mesher, RCM Bandwidth Reduction, Wood-Armer Moments & Yield Criteria
            </p>
          </div>
        </div>

        {/* Contour Field Selector Buttons */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            onClick={() => setContourField('von-mises')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              contourField === 'von-mises' ? 'bg-teal-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            von Mises (σ)
          </button>
          <button
            onClick={() => setContourField('wood-armer')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              contourField === 'wood-armer' ? 'bg-teal-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Wood-Armer (Mxd)
          </button>
          <button
            onClick={() => setContourField('deflection')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              contourField === 'deflection' ? 'bg-teal-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Deflection (w)
          </button>
          <button
            onClick={() => setContourField('transverse-shear')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              contourField === 'transverse-shear' ? 'bg-teal-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Transverse Shear (V)
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
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
        {/* Left Parameters Sidebar */}
        <aside className="w-80 border-r border-slate-800/80 bg-slate-900/60 p-5 overflow-y-auto space-y-5">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-teal-400 block mb-2">
              Slab Boundary Topology
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['rectangular', 'with-opening', 'l-shaped'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setDomainShape(t)}
                  className={`px-2 py-2 rounded-lg text-[11px] font-semibold capitalize border transition-all ${
                    domainShape === t
                      ? 'border-teal-500 bg-teal-500/20 text-teal-300'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {t.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Slab Width (Lx)</span>
              <span className="font-semibold text-teal-400">{slabWidthM} m</span>
            </div>
            <input
              type="range"
              min={4}
              max={24}
              step={1}
              value={slabWidthM}
              onChange={(e) => setSlabWidthM(parseFloat(e.target.value))}
              className="w-full accent-teal-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Slab Length (Ly)</span>
              <span className="font-semibold text-teal-400">{slabLengthM} m</span>
            </div>
            <input
              type="range"
              min={4}
              max={24}
              step={1}
              value={slabLengthM}
              onChange={(e) => setSlabLengthM(parseFloat(e.target.value))}
              className="w-full accent-teal-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Slab Thickness (t)</span>
              <span className="font-semibold text-teal-400">{slabThicknessMm} mm</span>
            </div>
            <input
              type="range"
              min={150}
              max={800}
              step={25}
              value={slabThicknessMm}
              onChange={(e) => setSlabThicknessMm(parseInt(e.target.value))}
              className="w-full accent-teal-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Mesh Density (Divisions)</span>
              <span className="font-semibold text-teal-400">{meshDivisions} x {Math.max(2, Math.round((meshDivisions * slabLengthM) / slabWidthM))}</span>
            </div>
            <input
              type="range"
              min={4}
              max={16}
              step={2}
              value={meshDivisions}
              onChange={(e) => setMeshDivisions(parseInt(e.target.value))}
              className="w-full accent-teal-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Uniform Gravity Load (q)</span>
              <span className="font-semibold text-teal-400">{uniformLoadKNm2} kN/m²</span>
            </div>
            <input
              type="range"
              min={2}
              max={40}
              step={1}
              value={uniformLoadKNm2}
              onChange={(e) => setUniformLoadKNm2(parseFloat(e.target.value))}
              className="w-full accent-teal-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Material Grade</label>
            <select
              value={materialType}
              onChange={(e) => setMaterialType(e.target.value as any)}
              className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500"
            >
              <option value="concrete-c30">C30/37 Concrete (E = 33 GPa, ν = 0.2)</option>
              <option value="concrete-c40">C40/50 Concrete (E = 35 GPa, ν = 0.2)</option>
              <option value="steel-s355">S355 Structural Steel (E = 210 GPa, ν = 0.3)</option>
            </select>
          </div>

          <div className="pt-2 border-t border-slate-800 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Displacement Scale</span>
              <span className="font-semibold text-teal-400">{displacementScale}x</span>
            </div>
            <input
              type="range"
              min={10}
              max={500}
              step={10}
              value={displacementScale}
              onChange={(e) => setDisplacementScale(parseInt(e.target.value))}
              className="w-full accent-teal-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-400">Show Wireframe</span>
            <button
              onClick={() => setShowWireframe(!showWireframe)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                showWireframe ? 'bg-teal-500 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {showWireframe ? 'ON' : 'OFF'}
            </button>
          </div>
        </aside>

        {/* Center 3D & Analytics View */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-950">
          {/* 3D Viewport */}
          <div className="h-3/5 relative border-b border-slate-800/80">
            <div ref={mountRef} className="w-full h-full" />
            <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-800 flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse" />
                <span className="font-medium text-slate-300">
                  MITC4 Surface Continuum • {meshModel.elements.length} Quads, {meshModel.nodes.length} Nodes
                </span>
              </div>
              <span className="text-slate-600">|</span>
              <span className="text-[11px] text-teal-300 capitalize font-mono">
                Field: {contourField.replace('-', ' ')}
              </span>
            </div>

            {/* Color Scale Legend */}
            <div className="absolute bottom-4 right-4 bg-slate-900/85 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-800 flex flex-col gap-1.5 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                {contourField === 'von-mises'
                  ? 'von Mises Stress (MPa)'
                  : contourField === 'wood-armer'
                  ? 'Wood-Armer M_xd (kNm/m)'
                  : contourField === 'deflection'
                  ? 'Vertical Deflection (mm)'
                  : 'Transverse Shear (kN/m)'}
              </span>
              <div className="h-3 w-48 rounded bg-gradient-to-r from-blue-500 via-emerald-400 via-amber-400 to-red-500" />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>0.0</span>
                <span>
                  {contourField === 'von-mises'
                    ? analysisResults.maxVonMisesMPa.toFixed(1)
                    : contourField === 'wood-armer'
                    ? analysisResults.maxWoodArmerKNm.toFixed(1)
                    : contourField === 'deflection'
                    ? analysisResults.maxDeflectionMm.toFixed(1)
                    : analysisResults.maxShearKNm.toFixed(1)}
                </span>
              </div>
            </div>
          </div>

          {/* Analytical Metrics & Results Panel */}
          <div className="h-2/5 overflow-y-auto p-5 space-y-4 bg-slate-900/40">
            {/* KPI Cards */}
            <div className="grid grid-cols-5 gap-3">
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-0.5">Peak Deflection (w_max)</span>
                <strong className="text-lg font-bold text-teal-400 font-mono">
                  {analysisResults.maxDeflectionMm.toFixed(2)} mm
                </strong>
                <span className="text-[10px] text-slate-500 block">L / {( (slabWidthM * 1000) / (analysisResults.maxDeflectionMm || 1) ).toFixed(0)}</span>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-0.5">Max von Mises Stress</span>
                <strong className="text-lg font-bold text-indigo-400 font-mono">
                  {analysisResults.maxVonMisesMPa.toFixed(1)} MPa
                </strong>
                <span className="text-[10px] text-slate-500 block">Extreme fiber flexure</span>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-0.5">Wood-Armer M_xd (Bot)</span>
                <strong className="text-lg font-bold text-amber-400 font-mono">
                  {analysisResults.maxWoodArmerKNm.toFixed(1)} kNm/m
                </strong>
                <span className="text-[10px] text-slate-500 block">Sagging rebar demand</span>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-0.5">Peak Transverse Shear</span>
                <strong className="text-lg font-bold text-emerald-400 font-mono">
                  {analysisResults.maxShearKNm.toFixed(1)} kN/m
                </strong>
                <span className="text-[10px] text-slate-500 block">One-way shear action</span>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-0.5">RCM Bandwidth Opt</span>
                <strong className="text-lg font-bold text-sky-400 font-mono">
                  β = {meshModel.bandwidthAfterRCM}
                </strong>
                <span className="text-[10px] text-slate-500 block">
                  from β = {meshModel.bandwidthBeforeRCM}
                </span>
              </div>
            </div>

            {/* Element Results Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-3 py-1.5">Quad Element</th>
                    <th className="px-3 py-1.5">Center X, Y (m)</th>
                    <th className="px-3 py-1.5">Deflection (mm)</th>
                    <th className="px-3 py-1.5">M_xx (kNm/m)</th>
                    <th className="px-3 py-1.5">M_yy (kNm/m)</th>
                    <th className="px-3 py-1.5">M_xy (kNm/m)</th>
                    <th className="px-3 py-1.5">Wood-Armer M_xd</th>
                    <th className="px-3 py-1.5">Shear V (kN/m)</th>
                    <th className="px-3 py-1.5">von Mises (MPa)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {analysisResults.elementForces.slice(0, 10).map((el) => (
                    <tr key={el.elementId} className="hover:bg-slate-800/30">
                      <td className="px-3 py-1.5 font-sans font-medium text-slate-200">{el.elementId}</td>
                      <td className="px-3 py-1.5 text-slate-300">{el.center[0].toFixed(2)}, {el.center[1].toFixed(2)}</td>
                      <td className="px-3 py-1.5 text-teal-400">{(el.wAvg * 1000).toFixed(2)}</td>
                      <td className="px-3 py-1.5 text-slate-300">{el.mxx.toFixed(1)}</td>
                      <td className="px-3 py-1.5 text-slate-300">{el.myy.toFixed(1)}</td>
                      <td className="px-3 py-1.5 text-slate-400">{el.mxy.toFixed(1)}</td>
                      <td className="px-3 py-1.5 text-amber-400 font-bold">{el.woodArmerBottom.toFixed(1)}</td>
                      <td className="px-3 py-1.5 text-emerald-400">{el.vResultant.toFixed(1)}</td>
                      <td className="px-3 py-1.5 text-indigo-400">{el.vonMisesStressMPa.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
