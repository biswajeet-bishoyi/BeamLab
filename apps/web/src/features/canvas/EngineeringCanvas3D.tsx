/**
 * BeamLab B2.6 — Interactive 3D Engineering Canvas
 *
 * High-performance 3D structural viewport with parametric cross-section profile extrusions,
 * member local coordinate system alignment, 3D boundary supports, floor slab extrusion,
 * interactive spatial raycasting, hover highlights, floating engineering tooltip,
 * CAD spatial snapping (nodes, midpoints, perpendiculars, grid), snap glyphs,
 * 3D load visualization pipeline (point forces, moments, distributed UDL curtains, slab pressure),
 * deformed shape & dynamic modal vibration animation pipeline with continuous heatmap colormaps,
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
  SpatialSnappingEngine,
  SnapGlyphOverlay,
  DEFAULT_SNAP_OPTIONS,
  type SnapOptions,
  type SnapResult,
} from './snapping';
import {
  LoadVisualizationController,
  DEFAULT_LOAD_OPTIONS,
  type LoadDisplayOptions,
} from './loads';
import {
  ModalAnimationController,
  HeatmapLegendOverlay,
  DEFAULT_DEFORMATION_OPTIONS,
  type DeformationDisplayOptions,
  type DeformationViewMode,
} from './deformation';
import {
  DiagramController,
  DEFAULT_DIAGRAM_OPTIONS,
  type DiagramOptions,
  type DiagramType,
} from './diagrams';
import type { LoadPatternType } from '@beamstudio/engineering-model';
import {
  Box,
  Grid,
  Maximize2,
  Layers,
  Rotate3d,
  MousePointer,
  Magnet,
  ArrowDownToLine,
  Activity,
  Play,
  Pause,
  Spline,
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
  const snappingEngineRef = useRef<SpatialSnappingEngine | null>(null);
  const loadControllerRef = useRef<LoadVisualizationController | null>(null);
  const modalControllerRef = useRef<ModalAnimationController | null>(null);
  const diagramControllerRef = useRef<DiagramController | null>(null);

  // Keep selection callback references stable so Three.js canvas doesn't tear down on render
  const onSelectNodeRef = useRef(onSelectNode);
  const onSelectMemberRef = useRef(onSelectMember);
  useEffect(() => {
    onSelectNodeRef.current = onSelectNode;
    onSelectMemberRef.current = onSelectMember;
  });

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

  // CAD Spatial Snapping state
  const [snapOptions, setSnapOptions] = useState<SnapOptions>(DEFAULT_SNAP_OPTIONS);
  const [showSnapMenu, setShowSnapMenu] = useState<boolean>(false);
  const [activeSnap, setActiveSnap] = useState<SnapResult | null>(null);
  const snapOptionsRef = useRef<SnapOptions>(snapOptions);
  snapOptionsRef.current = snapOptions;

  // 3D Load Visualization state
  const [loadOptions, setLoadOptions] = useState<LoadDisplayOptions>(DEFAULT_LOAD_OPTIONS);
  const [showLoadMenu, setShowLoadMenu] = useState<boolean>(false);

  // 3D Deformation & Modal Animation state
  const [deformationOptions, setDeformationOptions] = useState<DeformationDisplayOptions>(DEFAULT_DEFORMATION_OPTIONS);
  const [showDeformationMenu, setShowDeformationMenu] = useState<boolean>(false);

  // 3D Internal Force Diagrams state
  const [diagramOptions, setDiagramOptions] = useState<DiagramOptions>(DEFAULT_DIAGRAM_OPTIONS);
  const [showDiagramMenu, setShowDiagramMenu] = useState<boolean>(false);

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

  const handleToggleMasterSnap = useCallback(() => {
    setSnapOptions((prev) => ({ ...prev, enabled: !prev.enabled }));
  }, []);

  const handleToggleSnapOption = useCallback((key: keyof SnapOptions) => {
    setSnapOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Load visualization controls
  const handleToggleLoadsVisible = useCallback(() => {
    setLoadOptions((prev) => {
      const updated = { ...prev, visible: !prev.visible };
      if (loadControllerRef.current) {
        loadControllerRef.current.setDisplayOptions(updated);
      }
      return updated;
    });
  }, []);

  const handleSelectLoadPattern = useCallback((pattern: 'All' | LoadPatternType) => {
    setLoadOptions((prev) => {
      const updated = { ...prev, activePattern: pattern };
      if (loadControllerRef.current) {
        loadControllerRef.current.setDisplayOptions(updated);
      }
      return updated;
    });
  }, []);

  const handleSetLoadScale = useCallback((scale: number) => {
    setLoadOptions((prev) => {
      const updated = { ...prev, scaleMultiplier: scale };
      if (loadControllerRef.current) {
        loadControllerRef.current.setDisplayOptions(updated);
      }
      return updated;
    });
  }, []);

  const handleToggleLoadLabels = useCallback(() => {
    setLoadOptions((prev) => {
      const updated = { ...prev, showLabels: !prev.showLabels };
      if (loadControllerRef.current) {
        loadControllerRef.current.setDisplayOptions(updated);
      }
      return updated;
    });
  }, []);

  // Deformation & Modal controls
  const handleSelectDeformationMode = useCallback((mode: DeformationViewMode) => {
    setDeformationOptions((prev) => {
      const updated = { ...prev, viewMode: mode };
      if (modalControllerRef.current) {
        modalControllerRef.current.setOptions(updated);
      }
      // If entering deformation mode, hide standard extruded members to highlight deflected curved shape
      if (sceneControllerRef.current) {
        sceneControllerRef.current.updateOptions({
          showMembers: mode === 'undeformed',
        });
      }
      return updated;
    });
  }, []);

  const handleSelectModalMode = useCallback((modeNum: number) => {
    setDeformationOptions((prev) => {
      const updated = { ...prev, activeModalMode: modeNum };
      if (modalControllerRef.current) {
        modalControllerRef.current.setOptions(updated);
      }
      return updated;
    });
  }, []);

  const handleTogglePlayModal = useCallback(() => {
    setDeformationOptions((prev) => {
      const updated = { ...prev, isPlaying: !prev.isPlaying };
      if (modalControllerRef.current) {
        modalControllerRef.current.setOptions(updated);
      }
      return updated;
    });
  }, []);

  const handleSetDeformationScale = useCallback((scale: number) => {
    setDeformationOptions((prev) => {
      const updated = { ...prev, scaleMultiplier: scale };
      if (modalControllerRef.current) {
        modalControllerRef.current.setOptions(updated);
      }
      return updated;
    });
  }, []);

  const handleToggleGhost = useCallback(() => {
    setDeformationOptions((prev) => {
      const updated = { ...prev, showGhost: !prev.showGhost };
      if (modalControllerRef.current) {
        modalControllerRef.current.setOptions(updated);
      }
      return updated;
    });
  }, []);

  // 3D Internal Force Diagram controls
  const handleSelectDiagramType = useCallback((type: DiagramType) => {
    setDiagramOptions((prev) => {
      const updated = { ...prev, type };
      if (diagramControllerRef.current) {
        diagramControllerRef.current.setDiagramType(type);
      }
      return updated;
    });
  }, []);

  const handleSetDiagramScale = useCallback((scale: number) => {
    setDiagramOptions((prev) => {
      const updated = { ...prev, scaleMultiplier: scale };
      if (diagramControllerRef.current) {
        diagramControllerRef.current.setOptions({ scaleMultiplier: scale });
      }
      return updated;
    });
  }, []);

  const handleToggleDiagramLabels = useCallback(() => {
    setDiagramOptions((prev) => {
      const updated = { ...prev, showPeakLabels: !prev.showPeakLabels };
      if (diagramControllerRef.current) {
        diagramControllerRef.current.setOptions({ showPeakLabels: updated.showPeakLabels });
      }
      return updated;
    });
  }, []);

  const handleToggleDiagramSign = useCallback(() => {
    setDiagramOptions((prev) => {
      const nextSign: 'tension_face' | 'cartesian' =
        prev.signConvention === 'tension_face' ? 'cartesian' : 'tension_face';
      const updated: DiagramOptions = { ...prev, signConvention: nextSign };
      if (diagramControllerRef.current) {
        diagramControllerRef.current.setOptions({ signConvention: nextSign });
      }
      return updated;
    });
  }, []);

  // Load selected preset into the scene
  const loadPresetModel = useCallback((preset: ModelPreset) => {
    if (!sceneControllerRef.current || !cameraManagerRef.current || !kernelRef.current) return;

    if (selectionManagerRef.current) {
      selectionManagerRef.current.clearSelection();
    }

    let modelData;
    let loadData;
    let analysisData;

    if (preset === 'portal_frame') {
      modelData = StructuralSceneController.createPortalFrameModel();
      loadData = LoadVisualizationController.createPortalFrameLoads(modelData.system);
      analysisData = ModalAnimationController.createPortalFrameAnalysisData(modelData.system);
    } else if (preset === 'space_truss') {
      modelData = StructuralSceneController.createSpaceTrussModel();
      loadData = LoadVisualizationController.createSpaceTrussLoads(modelData.system);
      analysisData = ModalAnimationController.createSpaceTrussAnalysisData(modelData.system);
    } else {
      modelData = StructuralSceneController.createBuildingWithSlabsModel();
      loadData = LoadVisualizationController.createBuildingLoads(modelData.system, modelData.plates);
      analysisData = ModalAnimationController.createBuildingAnalysisData(modelData.system);
    }

    sceneControllerRef.current.loadSystem(modelData.system, modelData.plates);
    if (loadControllerRef.current) {
      loadControllerRef.current.setLoads(loadData.point, loadData.dist, loadData.surf, modelData.plates);
    }
    if (modalControllerRef.current) {
      modalControllerRef.current.loadModelData(modelData.system, analysisData.displacements, analysisData.modes);
    }
    if (diagramControllerRef.current) {
      diagramControllerRef.current.setSystem(modelData.system, preset);
    }

    setModelStats({
      nodes: modelData.system.nodes.size,
      members: modelData.system.members.size,
      supports: modelData.system.supports.size,
      slabs: modelData.plates.length,
    });

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

    // 8. Initialize Spatial Snapping Engine
    const snappingEngine = new SpatialSnappingEngine();
    snappingEngineRef.current = snappingEngine;

    // 9. Initialize 3D Load Visualization Controller
    const loadController = new LoadVisualizationController(kernel.scene);
    loadControllerRef.current = loadController;

    const initialLoads = LoadVisualizationController.createPortalFrameLoads(initialModel.system);
    loadController.setLoads(initialLoads.point, initialLoads.dist, initialLoads.surf, initialModel.plates);

    // 10. Initialize 3D Deformation & Modal Animation Controller
    const modalController = new ModalAnimationController(kernel.scene);
    modalControllerRef.current = modalController;

    const initialAnalysis = ModalAnimationController.createPortalFrameAnalysisData(initialModel.system);
    modalController.loadModelData(initialModel.system, initialAnalysis.displacements, initialAnalysis.modes);

    // 11. Initialize 3D Internal Force Diagram Controller
    const diagramController = new DiagramController(kernel.scene);
    diagramControllerRef.current = diagramController;
    diagramController.setSystem(initialModel.system, 'portal_frame');

    // Bind selection state observer
    const unbindSelection = selectionManager.onSelectionChange((state: SelectionState) => {
      const total = selectionManager.getTotalSelectedCount();
      setSelectedCount(total);

      if (total === 0) {
        setSelectionSummary(null);
        diagramController.setSelectedMember(null);
      } else {
        const parts: string[] = [];
        if (state.members.size > 0) {
          parts.push(`${state.members.size} Member${state.members.size > 1 ? 's' : ''}`);
          if (state.members.size === 1) {
            const selMemberId = Array.from(state.members)[0]!;
            diagramController.setSelectedMember(selMemberId);
            onSelectMemberRef.current?.(selMemberId);
          }
        }
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

    // 11. Ground Plane & Pointer Tracking with Snapping
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

      // Snapping evaluation
      const snap = snappingEngine.findSnap(
        { x: e.clientX, y: e.clientY },
        rect,
        cameraManager.activeCamera,
        sceneController.getActiveSystem(),
        snapOptionsRef.current,
      );
      setActiveSnap(snap);

      if (snap) {
        setCursorCoords({
          x: Math.round(snap.worldPoint.x * 100) / 100,
          y: Math.round(snap.worldPoint.y * 100) / 100,
          z: Math.round(snap.worldPoint.z * 100) / 100,
        });
      } else {
        // Ground plane coordinates fallback
        groundRaycaster.setFromCamera(mouse, cameraManager.activeCamera);
        const intersection = new THREE.Vector3();
        if (groundRaycaster.ray.intersectPlane(groundPlane, intersection)) {
          setCursorCoords({
            x: Math.round(intersection.x * 100) / 100,
            y: Math.round(intersection.y * 100) / 100,
            z: Math.round(intersection.z * 100) / 100,
          });
        }
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
      if (gizmo.handleClick(e.clientX, e.clientY, rect)) {
        return;
      }

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

        if (hit.entityType === 'node') {
          onSelectNodeRef.current?.(hit.entityId);
        } else if (hit.entityType === 'member') {
          onSelectMemberRef.current?.(hit.entityId);
        }
      } else {
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

    // 12. Setup Render Loop Hook, FPS calculation & Modal Animation Frame
    let frameCount = 0;
    let lastTime = performance.now();

    const unbindRender = kernel.onRender(() => {
      const activeCam = cameraManager.activeCamera;
      cameraManager.updateAspect(kernel.getAspect());

      const now = performance.now();

      // Update dynamic modal vibration animation
      modalController.update(now / 1000);

      // Main scene render
      kernel.render(activeCam);

      // Render orientation gizmo overlay in corner
      gizmo.render(kernel.renderer, activeCam);

      // FPS tally
      frameCount++;
      if (now - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;
      }
    });

    // 13. Cleanup
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
      loadController.dispose();
      modalController.dispose();
      diagramController.dispose();
      sceneController.dispose();
      kernel.dispose();
    };
  }, [handleFitAll]);

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

      {/* CAD Snap Glyph Overlay */}
      <SnapGlyphOverlay snap={activeSnap} />

      {/* Strain / Deflection Heatmap Color Legend */}
      <HeatmapLegendOverlay
        viewMode={deformationOptions.viewMode}
        maxDisplacementMeters={modalControllerRef.current?.getMaxDisplacement() ?? 0.025}
        scaleMultiplier={deformationOptions.scaleMultiplier}
      />

      {/* Top Left: Viewport Controls & Camera HUD */}
      <div className="absolute top-12 left-3 flex flex-col gap-2 z-10">
        {/* Main Toolbar */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-800 shadow-xl text-xs">
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

          {/* 3D Load Visualization Controls Button */}
          <div className="relative">
            <button
              onClick={() => {
                setShowLoadMenu(!showLoadMenu);
                setShowDeformationMenu(false);
                setShowSnapMenu(false);
              }}
              title="3D Structural Load Visualization Controls"
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-all ${
                loadOptions.visible
                  ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              <span>Loads</span>
            </button>

            {showLoadMenu && (
              <div className="absolute top-full left-0 mt-1.5 w-52 p-2 rounded-lg bg-slate-900/95 backdrop-blur-md border border-slate-700/80 shadow-2xl flex flex-col gap-1.5 text-[11px] z-50">
                <div className="flex items-center justify-between px-1 pb-1 border-b border-slate-800">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    3D Load Display
                  </span>
                  <button
                    onClick={handleToggleLoadsVisible}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      loadOptions.visible ? 'bg-amber-500 text-slate-950' : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {loadOptions.visible ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* Pattern Filter */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400">Load Pattern</span>
                  <div className="grid grid-cols-2 gap-1">
                    {(['All', 'Dead', 'Live', 'Wind', 'Snow'] as const).map((pat) => (
                      <button
                        key={pat}
                        onClick={() => handleSelectLoadPattern(pat)}
                        className={`px-1.5 py-1 rounded text-[10px] font-medium transition-all text-left ${
                          loadOptions.activePattern === pat
                            ? 'bg-blue-600/40 text-blue-300 font-semibold border border-blue-500/50'
                            : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {pat === 'All' ? 'All Loads' : `${pat} (DL/LL)`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scale Multipliers */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                  <span className="text-slate-400">Scale</span>
                  <div className="flex items-center gap-1 font-mono">
                    {[0.5, 1.0, 2.0].map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSetLoadScale(s)}
                        className={`px-1.5 py-0.5 rounded text-[10px] ${
                          loadOptions.scaleMultiplier === s
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {s}×
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggle Labels */}
                <label className="flex items-center justify-between px-1 py-1 rounded hover:bg-slate-800 cursor-pointer pt-1 border-t border-slate-800">
                  <span className="text-slate-300">Magnitude Callouts</span>
                  <input
                    type="checkbox"
                    checked={loadOptions.showLabels}
                    onChange={handleToggleLoadLabels}
                    className="accent-amber-500"
                  />
                </label>
              </div>
            )}
          </div>

          {/* 3D Deformed Shape & Modal Dynamics Button */}
          <div className="relative">
            <button
              onClick={() => {
                setShowDeformationMenu(!showDeformationMenu);
                setShowLoadMenu(false);
                setShowSnapMenu(false);
              }}
              title="Deformed Shape & Modal Vibration Dynamics"
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-all ${
                deformationOptions.viewMode !== 'undeformed'
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>
                {deformationOptions.viewMode === 'undeformed'
                  ? 'Deformation'
                  : deformationOptions.viewMode === 'static'
                  ? 'Deflection'
                  : `Mode ${deformationOptions.activeModalMode}`}
              </span>
            </button>

            {showDeformationMenu && (
              <div className="absolute top-full left-0 mt-1.5 w-56 p-2 rounded-lg bg-slate-900/95 backdrop-blur-md border border-slate-700/80 shadow-2xl flex flex-col gap-1.5 text-[11px] z-50">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1 pb-1 border-b border-slate-800">
                  Deformation & Dynamics
                </div>

                {/* View Mode Switcher */}
                <div className="grid grid-cols-3 gap-1">
                  {(
                    [
                      { id: 'undeformed', label: 'Undef.' },
                      { id: 'static', label: 'Static |u|' },
                      { id: 'modal', label: 'Modal' },
                    ] as const
                  ).map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => handleSelectDeformationMode(mode.id)}
                      className={`px-1.5 py-1 rounded text-[10px] font-medium text-center transition-all ${
                        deformationOptions.viewMode === mode.id
                          ? 'bg-purple-600 text-white font-semibold shadow'
                          : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>

                {/* Modal Controls (Only when in Modal mode) */}
                {deformationOptions.viewMode === 'modal' && (
                  <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">Modal Mode</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3].map((m) => (
                          <button
                            key={m}
                            onClick={() => handleSelectModalMode(m)}
                            className={`px-2 py-0.5 rounded text-[10px] ${
                              deformationOptions.activeModalMode === m
                                ? 'bg-purple-500 text-slate-950 font-bold'
                                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            M{m}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">Animation</span>
                      <button
                        onClick={handleTogglePlayModal}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                          deformationOptions.isPlaying
                            ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                            : 'bg-amber-600/30 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {deformationOptions.isPlaying ? (
                          <>
                            <Pause className="w-3 h-3" />
                            <span>Pause</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3" />
                            <span>Play</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Scale Multipliers */}
                {deformationOptions.viewMode !== 'undeformed' && (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                    <span className="text-slate-400">Disp. Scale</span>
                    <div className="flex items-center gap-1 font-mono">
                      {[10, 50, 100, 200].map((sc) => (
                        <button
                          key={sc}
                          onClick={() => handleSetDeformationScale(sc)}
                          className={`px-1.5 py-0.5 rounded text-[10px] ${
                            deformationOptions.scaleMultiplier === sc
                              ? 'bg-purple-500 text-slate-950 font-bold'
                              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {sc}×
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ghost Wireframe Checkbox */}
                {deformationOptions.viewMode !== 'undeformed' && (
                  <label className="flex items-center justify-between px-1 py-1 rounded hover:bg-slate-800 cursor-pointer pt-1 border-t border-slate-800">
                    <span className="text-slate-300">Undeformed Ghost</span>
                    <input
                      type="checkbox"
                      checked={deformationOptions.showGhost}
                      onChange={handleToggleGhost}
                      className="accent-purple-500"
                    />
                  </label>
                )}
              </div>
            )}
          </div>

          {/* 3D Internal Force Diagrams Menu Button */}
          <div className="relative">
            <button
              onClick={() => {
                setShowDiagramMenu(!showDiagramMenu);
                setShowLoadMenu(false);
                setShowDeformationMenu(false);
                setShowSnapMenu(false);
              }}
              title="3D Internal Force Diagram Extrusions (SFD, BMD, Axial)"
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-all ${
                diagramOptions.type !== 'none'
                  ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Spline className="w-3.5 h-3.5" />
              <span>
                {diagramOptions.type === 'none'
                  ? 'Diagrams'
                  : diagramOptions.type === 'Mz'
                  ? 'BMD (Mz)'
                  : diagramOptions.type === 'Vy'
                  ? 'SFD (Vy)'
                  : diagramOptions.type === 'N'
                  ? 'Axial (N)'
                  : diagramOptions.type === 'envelope_Mz'
                  ? 'Env (Mz)'
                  : diagramOptions.type}
              </span>
            </button>

            {showDiagramMenu && (
              <div className="absolute top-full left-0 mt-1.5 w-56 p-2 rounded-lg bg-slate-900/95 backdrop-blur-md border border-slate-700/80 shadow-2xl flex flex-col gap-1.5 text-[11px] z-50">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1 pb-1 border-b border-slate-800">
                  3D Force Diagrams
                </div>

                {/* Diagram Mode Quick Switcher */}
                <div className="grid grid-cols-3 gap-1">
                  {(
                    [
                      { id: 'none', label: 'Off' },
                      { id: 'Mz', label: 'BMD (Mz)' },
                      { id: 'Vy', label: 'SFD (Vy)' },
                      { id: 'N', label: 'Axial (N)' },
                      { id: 'envelope_Mz', label: 'Env (Mz)' },
                      { id: 'deflection', label: 'Deflect.' },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleSelectDiagramType(m.id)}
                      className={`px-1.5 py-1 rounded text-[10px] font-medium text-center transition-all ${
                        diagramOptions.type === m.id
                          ? 'bg-blue-600 text-white font-semibold shadow'
                          : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {diagramOptions.type !== 'none' && (
                  <>
                    {/* Scale Multipliers */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                      <span className="text-slate-400">Scale</span>
                      <div className="flex items-center gap-1 font-mono">
                        {[0.5, 1.0, 2.0, 3.0].map((sc) => (
                          <button
                            key={sc}
                            onClick={() => handleSetDiagramScale(sc)}
                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                              diagramOptions.scaleMultiplier === sc
                                ? 'bg-blue-500 text-slate-950 font-bold'
                                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {sc}×
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Peak Values Callouts */}
                    <label className="flex items-center justify-between px-1 py-1 rounded hover:bg-slate-800 cursor-pointer pt-1 border-t border-slate-800">
                      <span className="text-slate-300">Peak 3D Badges</span>
                      <input
                        type="checkbox"
                        checked={diagramOptions.showPeakLabels}
                        onChange={handleToggleDiagramLabels}
                        className="accent-blue-500"
                      />
                    </label>

                    {/* Sign Convention Toggle */}
                    <div className="flex items-center justify-between px-1 py-1 pt-1 border-t border-slate-800">
                      <span className="text-slate-400">Convention</span>
                      <button
                        onClick={handleToggleDiagramSign}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-blue-400 font-medium"
                      >
                        {diagramOptions.signConvention === 'tension_face' ? 'Tension Face' : 'Cartesian'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* CAD Spatial Snapping Menu Button */}
          <div className="relative">
            <button
              onClick={() => {
                setShowSnapMenu(!showSnapMenu);
                setShowLoadMenu(false);
                setShowDeformationMenu(false);
              }}
              title="CAD Spatial Snapping Controls"
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-all ${
                snapOptions.enabled
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Magnet className="w-3.5 h-3.5" />
              <span>Snap</span>
            </button>

            {showSnapMenu && (
              <div className="absolute top-full left-0 mt-1.5 w-48 p-2 rounded-lg bg-slate-900/95 backdrop-blur-md border border-slate-700/80 shadow-2xl flex flex-col gap-1 text-[11px] z-50">
                <div className="flex items-center justify-between px-1 pb-1 border-b border-slate-800">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Spatial Snapping
                  </span>
                  <button
                    onClick={handleToggleMasterSnap}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      snapOptions.enabled ? 'bg-amber-500 text-slate-950' : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {snapOptions.enabled ? 'ON' : 'OFF'}
                  </button>
                </div>

                <label className="flex items-center justify-between px-1.5 py-1 rounded hover:bg-slate-800 cursor-pointer">
                  <span className="text-slate-300">Node / Endpoints (□)</span>
                  <input
                    type="checkbox"
                    checked={snapOptions.snapToNodes}
                    onChange={() => handleToggleSnapOption('snapToNodes')}
                    className="accent-amber-500"
                  />
                </label>

                <label className="flex items-center justify-between px-1.5 py-1 rounded hover:bg-slate-800 cursor-pointer">
                  <span className="text-slate-300">Member Midpoints (△)</span>
                  <input
                    type="checkbox"
                    checked={snapOptions.snapToMidpoints}
                    onChange={() => handleToggleSnapOption('snapToMidpoints')}
                    className="accent-amber-500"
                  />
                </label>

                <label className="flex items-center justify-between px-1.5 py-1 rounded hover:bg-slate-800 cursor-pointer">
                  <span className="text-slate-300">Along Members (⊾)</span>
                  <input
                    type="checkbox"
                    checked={snapOptions.snapToPerpendicular}
                    onChange={() => handleToggleSnapOption('snapToPerpendicular')}
                    className="accent-amber-500"
                  />
                </label>

                <label className="flex items-center justify-between px-1.5 py-1 rounded hover:bg-slate-800 cursor-pointer">
                  <span className="text-slate-300">Metric Grid (+)</span>
                  <input
                    type="checkbox"
                    checked={snapOptions.snapToGrid}
                    onChange={() => handleToggleSnapOption('snapToGrid')}
                    className="accent-amber-500"
                  />
                </label>
              </div>
            )}
          </div>

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

          {/* Model Presets Compact Dropdown */}
          <div className="w-px h-4 bg-slate-800 mx-0.5" />
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-500 font-medium pl-1">Preset:</span>
            <select
              value={selectedPreset}
              onChange={(e) => handlePresetChange(e.target.value as ModelPreset)}
              className="bg-slate-800/90 text-slate-300 hover:text-white border border-slate-700/80 rounded px-2 py-0.5 text-[11px] font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="portal_frame">Portal Frame (Steel)</option>
              <option value="space_truss">Space Truss (CHS)</option>
              <option value="building_slabs">Building & Slabs (RC)</option>
            </select>
          </div>
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
