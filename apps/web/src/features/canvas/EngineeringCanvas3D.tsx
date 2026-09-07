/**
 * BeamLab B2.1 — Interactive 3D Engineering Canvas
 *
 * High-performance 3D structural viewport with multi-camera projection modes,
 * CAD navigation, orientation gizmo, spatial grid, and real-time cursor coordinate tracking.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  ViewportKernel,
  CameraManager,
  NavigationControls,
  OrientationGizmo,
  AdaptiveSpatialGrid,
} from './viewport';
import type { ProjectionMode, ViewOrientation } from './viewport';
import { Box, Grid, Maximize2 } from 'lucide-react';

interface EngineeringCanvas3DProps {
  className?: string;
  onSelectNode?: (nodeId: string) => void;
  onSelectMember?: (memberId: string) => void;
}

export const EngineeringCanvas3D: React.FC<EngineeringCanvas3DProps> = ({
  className = 'w-full h-full min-h-[450px]',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const kernelRef = useRef<ViewportKernel | null>(null);
  const cameraManagerRef = useRef<CameraManager | null>(null);
  const controlsRef = useRef<NavigationControls | null>(null);
  const gizmoRef = useRef<OrientationGizmo | null>(null);
  const gridRef = useRef<AdaptiveSpatialGrid | null>(null);

  const [projection, setProjection] = useState<ProjectionMode>('Perspective');
  const [currentView, setCurrentView] = useState<ViewOrientation>('Isometric');
  const [gridVisible, setGridVisible] = useState<boolean>(true);
  const [cursorCoords, setCursorCoords] = useState<{ x: number; y: number; z: number } | null>(null);
  const [fps, setFps] = useState<number>(60);

  const handleFitAll = useCallback(() => {
    if (cameraManagerRef.current && kernelRef.current) {
      const box = new THREE.Box3().setFromObject(kernelRef.current.scene);
      cameraManagerRef.current.zoomToFit(box, kernelRef.current.getAspect());
    }
  }, []);

  const handleToggleProjection = useCallback(() => {
    if (cameraManagerRef.current && kernelRef.current) {
      const nextMode = projection === 'Perspective' ? 'Orthographic' : 'Perspective';
      cameraManagerRef.current.setProjectionMode(nextMode, kernelRef.current.getAspect());
      setProjection(nextMode);
    }
  }, [projection]);

  const handleSelectOrientation = useCallback((view: ViewOrientation) => {
    if (cameraManagerRef.current) {
      cameraManagerRef.current.setOrientation(view);
      setCurrentView(view);
    }
  }, []);

  const handleToggleGrid = useCallback(() => {
    if (gridRef.current) {
      gridRef.current.visible = !gridVisible;
      setGridVisible(!gridVisible);
    }
  }, [gridVisible]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Initialize Viewport Kernel
    const kernel = new ViewportKernel(container, {
      antialias: true,
      backgroundColor: 0x090d16, // Rich dark engineering slate
    });
    kernelRef.current = kernel;

    // 2. Initialize Camera Manager
    const cameraManager = new CameraManager(kernel.getAspect());
    cameraManagerRef.current = cameraManager;

    // 3. Initialize CAD Navigation Controls
    const controls = new NavigationControls(kernel.canvas, cameraManager);
    controls.onOrientationChange = (view) => setCurrentView(view);
    controls.onFitRequested = handleFitAll;
    controlsRef.current = controls;

    // 4. Initialize Orientation Gizmo
    const gizmo = new OrientationGizmo();
    gizmo.onSnapOrientation = (view) => {
      cameraManager.setOrientation(view);
      setCurrentView(view);
    };
    gizmoRef.current = gizmo;

    // 5. Initialize Adaptive 3D Spatial Grid
    const grid = new AdaptiveSpatialGrid({ size: 40, divisions: 40 });
    kernel.scene.add(grid.group);
    gridRef.current = grid;

    // 6. Build Initial Structural Demonstration Model (3D Steel Frame)
    const structureGroup = new THREE.Group();
    structureGroup.name = 'DemonstrationStructure';

    // Materials
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6, // BeamLab Blue
      metalness: 0.8,
      roughness: 0.25,
    });
    const colMat = new THREE.MeshStandardMaterial({
      color: 0x60a5fa,
      metalness: 0.85,
      roughness: 0.2,
    });
    const nodeMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Amber node sphere
      metalness: 0.5,
      roughness: 0.3,
    });
    const supportMat = new THREE.MeshStandardMaterial({
      color: 0x10b981, // Emerald support cone
      metalness: 0.4,
      roughness: 0.4,
    });

    // Helper: Add node sphere
    const addNodeMesh = (x: number, y: number, z: number) => {
      const geo = new THREE.SphereGeometry(0.18, 16, 16);
      const mesh = new THREE.Mesh(geo, nodeMat);
      mesh.position.set(x, y, z);
      structureGroup.add(mesh);
    };

    // Helper: Add structural cylinder member between two 3D points
    const addMemberMesh = (p1: [number, number, number], p2: [number, number, number], mat: THREE.Material, radius = 0.12) => {
      const start = new THREE.Vector3(...p1);
      const end = new THREE.Vector3(...p2);
      const dir = new THREE.Vector3().subVectors(end, start);
      const len = dir.length();

      const geo = new THREE.CylinderGeometry(radius, radius, len, 16);
      geo.translate(0, len / 2, 0);
      geo.rotateX(Math.PI / 2);

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(start);
      mesh.lookAt(end);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      structureGroup.add(mesh);
    };

    // Helper: Add support pyramid at base
    const addSupportMesh = (x: number, y: number) => {
      const geo = new THREE.ConeGeometry(0.35, 0.5, 4);
      geo.rotateX(-Math.PI / 2); // Point upward along Z
      const mesh = new THREE.Mesh(geo, supportMat);
      mesh.position.set(x, y, 0.25);
      structureGroup.add(mesh);
    };

    // 4 Column Base Nodes (Elevation Z = 0)
    const spanX = 6.0;
    const spanY = 5.0;
    const heightZ = 3.6;

    const baseCoords: Array<[number, number, number]> = [
      [0, 0, 0],
      [spanX, 0, 0],
      [spanX, spanY, 0],
      [0, spanY, 0],
    ];

    // 4 Top Roof Nodes (Elevation Z = heightZ)
    const roofCoords: Array<[number, number, number]> = [
      [0, 0, heightZ],
      [spanX, 0, heightZ],
      [spanX, spanY, heightZ],
      [0, spanY, heightZ],
    ];

    // Add nodes & supports
    baseCoords.forEach(([x, y, z]) => {
      addNodeMesh(x, y, z);
      addSupportMesh(x, y);
    });
    roofCoords.forEach(([x, y, z]) => addNodeMesh(x, y, z));

    // Vertical Columns
    for (let i = 0; i < 4; i++) {
      addMemberMesh(baseCoords[i]!, roofCoords[i]!, colMat, 0.14);
    }

    // Horizontal Roof Beams
    addMemberMesh(roofCoords[0]!, roofCoords[1]!, steelMat, 0.12);
    addMemberMesh(roofCoords[1]!, roofCoords[2]!, steelMat, 0.12);
    addMemberMesh(roofCoords[2]!, roofCoords[3]!, steelMat, 0.12);
    addMemberMesh(roofCoords[3]!, roofCoords[0]!, steelMat, 0.12);

    // Diagonal Cross Bracing on rear frame (between node 0 and node 2 on roof)
    addMemberMesh(roofCoords[0]!, roofCoords[2]!, colMat, 0.08);

    kernel.scene.add(structureGroup);

    // Initial Zoom to Fit
    const initialBox = new THREE.Box3().setFromObject(structureGroup);
    cameraManager.zoomToFit(initialBox, kernel.getAspect(), 1.4);

    // 7. Raycaster for Cursor Tracking on Ground Plane
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); // Z=0 plane
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraManager.activeCamera);
      const intersection = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(groundPlane, intersection)) {
        setCursorCoords({
          x: Math.round(intersection.x * 100) / 100,
          y: Math.round(intersection.y * 100) / 100,
          z: Math.round(intersection.z * 100) / 100,
        });
      }
    };
    container.addEventListener('mousemove', handlePointerMove);

    // Handle clicks on orientation gizmo
    const handleCanvasClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      gizmo.handleClick(e.clientX, e.clientY, rect);
    };
    kernel.canvas.addEventListener('click', handleCanvasClick);

    // 8. Setup Render Loop Hook & FPS calculation
    let frameCount = 0;
    let lastTime = performance.now();

    const unbindRender = kernel.onRender(() => {
      const activeCam = cameraManager.activeCamera;
      cameraManager.updateAspect(kernel.getAspect());

      // Main scene render
      kernel.render(activeCam);

      // Render orientation gizmo overlay in corner
      gizmo.render(kernel.renderer, activeCam);

      // FPS tally
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;
      }
    });

    // 9. Cleanup
    return () => {
      unbindRender();
      container.removeEventListener('mousemove', handlePointerMove);
      kernel.canvas.removeEventListener('click', handleCanvasClick);
      controls.dispose();
      gizmo.dispose();
      grid.dispose();
      kernel.dispose();
    };
  }, [handleFitAll]);

  return (
    <div className={`relative overflow-hidden select-none bg-[#090d16] ${className}`}>
      {/* Three.js canvas container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Top Left: Viewport Controls & Camera HUD */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-800/80 shadow-lg text-xs z-10">
        {/* Projection Mode Toggle */}
        <button
          onClick={handleToggleProjection}
          title={`Switch to ${projection === 'Perspective' ? 'Orthographic' : 'Perspective'} Mode (P)`}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded font-medium transition-all ${
            projection === 'Perspective'
              ? 'bg-blue-600 text-white shadow'
              : 'bg-slate-800 text-slate-300 hover:text-white'
          }`}
        >
          <Box className="w-3.5 h-3.5" />
          <span>{projection}</span>
        </button>

        <div className="w-px h-4 bg-slate-800" />

        {/* View Orientation Quick Selectors */}
        {(['Isometric', 'Top', 'Front', 'Right'] as ViewOrientation[]).map((view) => (
          <button
            key={view}
            onClick={() => handleSelectOrientation(view)}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
              currentView === view
                ? 'bg-slate-700/80 text-blue-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            {view}
          </button>
        ))}

        <div className="w-px h-4 bg-slate-800" />

        {/* Zoom to Fit Extents */}
        <button
          onClick={handleFitAll}
          title="Zoom to Fit Model Extents (F)"
          className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        {/* Grid Visibility Toggle */}
        <button
          onClick={handleToggleGrid}
          title="Toggle 3D Spatial Grid"
          className={`p-1.5 rounded transition-colors ${
            gridVisible ? 'text-blue-400 bg-blue-950/40' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Grid className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Top Right: Viewport Mode Badge & FPS */}
      <div className="absolute top-3 right-3 flex items-center gap-2 text-[10px] font-mono z-10">
        <div className="px-2 py-1 rounded bg-slate-900/80 backdrop-blur-md border border-slate-800 text-slate-400 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>WebGL 2.0</span>
          <span className="text-slate-600">·</span>
          <span className="text-emerald-400">{fps} FPS</span>
        </div>
      </div>

      {/* Bottom Left: Spatial Coordinates HUD & Unit Readout */}
      <div className="absolute bottom-3 left-3 flex items-center gap-3 text-[11px] font-mono z-10">
        <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-800/80 text-slate-300 shadow">
          <div className="flex items-center gap-1">
            <span className="text-red-400 font-semibold">X:</span>
            <span>{cursorCoords ? cursorCoords.x.toFixed(2) : '0.00'} m</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-green-400 font-semibold">Y:</span>
            <span>{cursorCoords ? cursorCoords.y.toFixed(2) : '0.00'} m</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-blue-400 font-semibold">Z:</span>
            <span>{cursorCoords ? cursorCoords.z.toFixed(2) : '0.00'} m</span>
          </div>
        </div>

        <div className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-800/80 text-[10px] text-slate-500">
          Left/Middle: Orbit · Right/Shift: Pan · Wheel: Zoom
        </div>
      </div>
    </div>
  );
};
