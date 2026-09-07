/**
 * BeamLab B2.3 — Interactive 3D Engineering Canvas
 *
 * High-performance 3D structural viewport with parametric cross-section profile extrusions,
 * member local coordinate system alignment, 3D boundary supports, floor slab extrusion,
 * interactive spatial raycasting, hover highlights, floating engineering tooltip,
 * single & multi-selection, CAD navigation, orientation gizmo, and real-time model controls.
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
import {
  StructuralSceneController,
  DEFAULT_RENDER_OPTIONS,
  type SceneRenderOptions,
} from './StructuralSceneController';
import {
  SpatialRaycaster,
  SelectionManager,
  FloatingEngineeringTooltip,
  type RaycastHit,
  type SelectionState,
} from './interaction';
import {
  Box,
  Grid,
  Maximize2,
  Layers,
  Rotate3d,
  MousePointer,
  X,
} from 'lucide-react';

export type ModelPreset = 'portal_frame' | 'space_truss' | 'building_slabs';

interface EngineeringCanvas3DProps {
  className?: string;
  onSelectNode?: (nodeId: string) => void;
  onSelectMember?: (memberId: string) => void;
}

export const EngineeringCanvas3D: React.FC<EngineeringCanvas3DProps> = ({
  className = 'w-full h-full min-h-[450px]',
  onSelectNode,
  onSelectMember,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const kernelRef = useRef<ViewportKernel | null>(null);
  const cameraManagerRef = useRef<CameraManager | null>(null);
  const controlsRef = useRef<NavigationControls | null>(null);
  const gizmoRef = useRef<OrientationGizmo | null>(null);
  const gridRef = useRef<AdaptiveSpatialGrid | null>(null);
  const sceneControllerRef = useRef<StructuralSceneController | null>(null);
  const raycasterRef = useRef<SpatialRaycaster | null>(null);
  const selectionManagerRef = useRef<SelectionManager | null>(null);

  // Viewport & Navigation state
  const [projection, setProjection] = useState<ProjectionMode>('Perspective');
  const [currentView, setCurrentView] = useState<ViewOrientation>('Isometric');
  const [gridVisible, setGridVisible] = useState<boolean>(true);
  const [cursorCoords, setCursorCoords] = useState<{ x: number; y: number; z: number } | null>(null);
  const [fps, setFps] = useState<number>(60);

  // Scene rendering & model state
  const [selectedPreset, setSelectedPreset] = useState<ModelPreset>('portal_frame');
  const [renderOptions, setRenderOptions] = useState<SceneRenderOptions>(DEFAULT_RENDER_OPTIONS);
  const [showLayerMenu, setShowLayerMenu] = useState<boolean>(false);
  const [modelStats, setModelStats] = useState({
    nodes: 0,
    members: 0,
    supports: 0,
    slabs: 0,
  });

  // Interaction & Selection state
  const [hoveredHit, setHoveredHit] = useState<RaycastHit | null>(null);
  const [cursorScreenPos, setCursorScreenPos] = useState<{ x: number; y: number } | null>(null);
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);
  const [selectedCount, setSelectedCount] = useState<number>(0);
  const [selectionSummary, setSelectionSummary] = useState<string | null>(null);

  const handleFitAll = useCallback(() => {
    if (cameraManagerRef.current && kernelRef.current && sceneControllerRef.current) {
      const box = sceneControllerRef.current.computeBoundingBox();
      cameraManagerRef.current.zoomToFit(box, kernelRef.current.getAspect(), 1.35);
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

  const handleToggleRenderMode = useCallback(() => {
    const nextMode: 'extruded' | 'centerline' =
      renderOptions.renderMode === 'extruded' ? 'centerline' : 'extruded';
    const updated: SceneRenderOptions = { ...renderOptions, renderMode: nextMode };
    setRenderOptions(updated);
    if (sceneControllerRef.current) {
      sceneControllerRef.current.updateOptions({ renderMode: nextMode });
      if (selectionManagerRef.current) {
        selectionManagerRef.current.applyVisualHighlights(sceneControllerRef.current.getRootGroup());
      }
    }
  }, [renderOptions]);

  const handleToggleLayer = useCallback((key: keyof SceneRenderOptions) => {
    setRenderOptions((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      if (sceneControllerRef.current) {
        sceneControllerRef.current.updateOptions(updated);
      }
      return updated;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    if (selectionManagerRef.current && sceneControllerRef.current) {
      selectionManagerRef.current.clearSelection();
      selectionManagerRef.current.applyVisualHighlights(sceneControllerRef.current.getRootGroup());
    }
  }, []);

  // Load selected preset into the scene
  const loadPresetModel = useCallback((preset: ModelPreset) => {
    if (!sceneControllerRef.current || !cameraManagerRef.current || !kernelRef.current) return;

    // Clear existing selection before loading new model
    if (selectionManagerRef.current) {
      selectionManagerRef.current.clearSelection();
    }

    let modelData;
    if (preset === 'portal_frame') {
      modelData = StructuralSceneController.createPortalFrameModel();
    } else if (preset === 'space_truss') {
      modelData = StructuralSceneController.createSpaceTrussModel();
    } else {
      modelData = StructuralSceneController.createBuildingWithSlabsModel();
    }

    sceneControllerRef.current.loadSystem(modelData.system, modelData.plates);
    setModelStats({
      nodes: modelData.system.nodes.size,
      members: modelData.system.members.size,
      supports: modelData.system.supports.size,
      slabs: modelData.plates.length,
    });

    // Auto zoom to fit the newly loaded model
    const box = sceneControllerRef.current.computeBoundingBox();
    cameraManagerRef.current.zoomToFit(box, kernelRef.current.getAspect(), 1.35);
  }, []);

  const handlePresetChange = (preset: ModelPreset) => {
    setSelectedPreset(preset);
    loadPresetModel(preset);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Initialize Viewport Kernel
    const kernel = new ViewportKernel(container, {
      antialias: true,
      backgroundColor: 0x090d16, // Dark engineering slate
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

    // 6. Initialize Structural Scene Controller & Load Initial Model
    const sceneController = new StructuralSceneController(kernel.scene);
    sceneControllerRef.current = sceneController;

    const initialModel = StructuralSceneController.createPortalFrameModel();
    sceneController.loadSystem(initialModel.system, initialModel.plates);
    setModelStats({
      nodes: initialModel.system.nodes.size,
      members: initialModel.system.members.size,
      supports: initialModel.system.supports.size,
      slabs: initialModel.plates.length,
    });

    const initialBox = sceneController.computeBoundingBox();
    cameraManager.zoomToFit(initialBox, kernel.getAspect(), 1.35);

    // 7. Initialize Spatial Raycaster & Selection Manager
    const raycaster = new SpatialRaycaster();
    raycasterRef.current = raycaster;

    const selectionManager = new SelectionManager();
    selectionManagerRef.current = selectionManager;

    // Bind selection state observer
    const unbindSelection = selectionManager.onSelectionChange((state: SelectionState) => {
      const total = selectionManager.getTotalSelectedCount();
      setSelectedCount(total);

      if (total === 0) {
        setSelectionSummary(null);
      } else {
        const parts: string[] = [];
        if (state.members.size > 0) parts.push(`${state.members.size} Member${state.members.size > 1 ? 's' : ''}`);
        if (state.nodes.size > 0) parts.push(`${state.nodes.size} Node${state.nodes.size > 1 ? 's' : ''}`);
        if (state.supports.size > 0) parts.push(`${state.supports.size} Support${state.supports.size > 1 ? 's' : ''}`);
        if (state.plates.size > 0) parts.push(`${state.plates.size} Slab${state.plates.size > 1 ? 's' : ''}`);
        setSelectionSummary(parts.join(', '));
      }

      selectionManager.applyVisualHighlights(sceneController.getRootGroup());
    });

    const unbindHover = selectionManager.onHoverChange((hit) => {
      setHoveredHit(hit);
      selectionManager.applyVisualHighlights(sceneController.getRootGroup());
      container.style.cursor = hit ? 'pointer' : 'default';
    });

    // 8. Ground Plane & Pointer Tracking
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const groundRaycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    let pointerDownPos = { x: 0, y: 0 };

    const handlePointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      setContainerRect(rect);
      setCursorScreenPos({ x: e.clientX, y: e.clientY });

      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // Ground plane coordinates readout
      groundRaycaster.setFromCamera(mouse, cameraManager.activeCamera);
      const intersection = new THREE.Vector3();
      if (groundRaycaster.ray.intersectPlane(groundPlane, intersection)) {
        setCursorCoords({
          x: Math.round(intersection.x * 100) / 100,
          y: Math.round(intersection.y * 100) / 100,
          z: Math.round(intersection.z * 100) / 100,
        });
      }

      // Entity raycasting for hover
      const hit = raycaster.castRay(
        mouse,
        cameraManager.activeCamera,
        sceneController.getRaycastCandidates(),
        sceneController.getActiveSystem(),
        sceneController.getActivePlates(),
      );
      selectionManager.setHovered(hit);
    };

    const handlePointerUp = (e: PointerEvent) => {
      // If pointer was dragged more than 4px, it was an orbit/pan, not a click
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist > 4) return;

      const rect = container.getBoundingClientRect();
      // Check gizmo click first
      if (gizmo.handleClick(e.clientX, e.clientY, rect)) {
        return;
      }

      // Raycast on click
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const hit = raycaster.castRay(
        mouse,
        cameraManager.activeCamera,
        sceneController.getRaycastCandidates(),
        sceneController.getActiveSystem(),
        sceneController.getActivePlates(),
      );

      if (hit) {
        if (e.shiftKey) {
          selectionManager.toggle(hit.entityType, hit.entityId);
        } else {
          selectionManager.select(hit.entityType, hit.entityId, false);
        }

        // Notify parent callbacks
        if (hit.entityType === 'node') {
          onSelectNode?.(hit.entityId);
        } else if (hit.entityType === 'member') {
          onSelectMember?.(hit.entityId);
        }
      } else {
        // Click on empty space clears selection
        selectionManager.clearSelection();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        selectionManager.clearSelection();
      }
    };

    container.addEventListener('pointerdown', handlePointerDown);
    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('keydown', handleKeyDown);

    // 9. Setup Render Loop Hook & FPS calculation
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

    // 10. Cleanup
    return () => {
      unbindRender();
      unbindSelection();
      unbindHover();
      container.removeEventListener('pointerdown', handlePointerDown);
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('keydown', handleKeyDown);
      controls.dispose();
      gizmo.dispose();
      grid.dispose();
      selectionManager.dispose();
      sceneController.dispose();
      kernel.dispose();
    };
  }, [handleFitAll, onSelectNode, onSelectMember]);

  return (
    <div className={`relative overflow-hidden select-none bg-[#090d16] ${className}`}>
      {/* Three.js canvas container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Floating Engineering Tooltip following cursor */}
      <FloatingEngineeringTooltip
        hit={hoveredHit}
        cursorScreenPos={cursorScreenPos}
        containerRect={containerRect}
      />

      {/* Top Left: Viewport Controls & Camera HUD */}
      <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
        {/* Main Toolbar */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-900/85 backdrop-blur-md border border-slate-800 shadow-lg text-xs">
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

          <div className="w-px h-4 bg-slate-800" />

          {/* Render Mode Toggle (Extruded 3D Profile vs Centerline) */}
          <button
            onClick={handleToggleRenderMode}
            title="Toggle between Solid 3D Profile Extrusions and Centerline Wireframe"
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium transition-all ${
              renderOptions.renderMode === 'extruded'
                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                : 'bg-amber-600/30 text-amber-300 border border-amber-500/40'
            }`}
          >
            <Rotate3d className="w-3.5 h-3.5" />
            <span>{renderOptions.renderMode === 'extruded' ? '3D Extruded' : 'Centerline'}</span>
          </button>

          {/* Visibility Layers Menu Button */}
          <div className="relative">
            <button
              onClick={() => setShowLayerMenu(!showLayerMenu)}
              title="Toggle Entity Layers & Visibility"
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-all ${
                showLayerMenu ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Layers</span>
            </button>

            {/* Dropdown Menu for Layers */}
            {showLayerMenu && (
              <div className="absolute top-full left-0 mt-1.5 w-44 p-2 rounded-lg bg-slate-900/95 backdrop-blur-md border border-slate-700/80 shadow-2xl flex flex-col gap-1 text-[11px] z-50">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1 pb-1 border-b border-slate-800">
                  Model Layers
                </div>

                <label className="flex items-center justify-between px-1.5 py-1 rounded hover:bg-slate-800 cursor-pointer">
                  <span className="text-slate-300">Members</span>
                  <input
                    type="checkbox"
                    checked={renderOptions.showMembers}
                    onChange={() => handleToggleLayer('showMembers')}
                    className="accent-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between px-1.5 py-1 rounded hover:bg-slate-800 cursor-pointer">
                  <span className="text-slate-300">Nodes</span>
                  <input
                    type="checkbox"
                    checked={renderOptions.showNodes}
                    onChange={() => handleToggleLayer('showNodes')}
                    className="accent-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between px-1.5 py-1 rounded hover:bg-slate-800 cursor-pointer">
                  <span className="text-slate-300">Supports (3D)</span>
                  <input
                    type="checkbox"
                    checked={renderOptions.showSupports}
                    onChange={() => handleToggleLayer('showSupports')}
                    className="accent-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between px-1.5 py-1 rounded hover:bg-slate-800 cursor-pointer">
                  <span className="text-slate-300">Floor Slabs / Plates</span>
                  <input
                    type="checkbox"
                    checked={renderOptions.showPlates}
                    onChange={() => handleToggleLayer('showPlates')}
                    className="accent-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between px-1.5 py-1 rounded hover:bg-slate-800 cursor-pointer">
                  <span className="text-slate-300">Local Axes (LCS)</span>
                  <input
                    type="checkbox"
                    checked={renderOptions.showLCS}
                    onChange={() => handleToggleLayer('showLCS')}
                    className="accent-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between px-1.5 py-1 rounded hover:bg-slate-800 cursor-pointer">
                  <span className="text-slate-300">Node Labels</span>
                  <input
                    type="checkbox"
                    checked={renderOptions.showNodeLabels}
                    onChange={() => handleToggleLayer('showNodeLabels')}
                    className="accent-blue-500"
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Model Presets Selector Bar */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-800/80 text-[11px] self-start shadow">
          <span className="text-slate-500 px-1.5 font-medium">Preset:</span>
          {(
            [
              { id: 'portal_frame', label: 'Portal Frame (Steel)' },
              { id: 'space_truss', label: 'Space Truss (CHS)' },
              { id: 'building_slabs', label: 'Building & Slabs (RC)' },
            ] as const
          ).map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetChange(preset.id)}
              className={`px-2 py-1 rounded font-medium transition-all ${
                selectedPreset === preset.id
                  ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top Right: Viewport Mode Badge, Model Stats & FPS */}
      <div className="absolute top-3 right-3 flex items-center gap-2 text-[10px] font-mono z-10">
        {/* Model Stats */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-800 text-slate-300">
          <span className="text-blue-400">{modelStats.nodes}</span> Nodes
          <span className="text-slate-600">·</span>
          <span className="text-emerald-400">{modelStats.members}</span> Members
          <span className="text-slate-600">·</span>
          <span className="text-amber-400">{modelStats.supports}</span> Supports
          {modelStats.slabs > 0 && (
            <>
              <span className="text-slate-600">·</span>
              <span className="text-purple-400">{modelStats.slabs}</span> Slabs
            </>
          )}
        </div>

        {/* WebGL Engine & FPS */}
        <div className="px-2.5 py-1 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-800 text-slate-400 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Three.js WebGL</span>
          <span className="text-slate-600">·</span>
          <span className="text-emerald-400 font-semibold">{fps} FPS</span>
        </div>
      </div>

      {/* Bottom Left: Spatial Coordinates HUD, Selection Readout & Navigation Tips */}
      <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-2 text-[11px] font-mono z-10">
        {/* Coordinates HUD */}
        <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-900/85 backdrop-blur-md border border-slate-800 text-slate-300 shadow">
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

        {/* Active Selection Badge (when entities are selected) */}
        {selectedCount > 0 && (
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-sky-950/90 backdrop-blur-md border border-sky-500/50 text-sky-300 shadow animate-in fade-in">
            <MousePointer className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-semibold">{selectionSummary}</span>
            <button
              onClick={handleClearSelection}
              title="Clear selection (Esc)"
              className="p-0.5 rounded hover:bg-sky-900/60 text-sky-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="hidden lg:block px-2.5 py-1.5 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-800 text-[10px] text-slate-500">
          Click: Select · Shift+Click: Multi · Left: Orbit · Right/Shift: Pan · Wheel: Zoom · F: Fit
        </div>
      </div>
    </div>
  );
};
