/**
 * BIMInteropStudio.tsx
 *
 * Interactive BIM & Structural Interoperability Studio.
 * Bi-directional buildingSMART IFC4 Structural Analysis Domain (ISO 16739-1) &
 * SAF (Structural Analysis Format v2.0+) Exchange, Spatial Reconciliation,
 * Profile Mapping, and Model Integrity Audit.
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FileCode2,
  FileSpreadsheet,
  Layers,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Download,
  Upload,
  RefreshCw,
  Box,
  Eye,
  Sliders,
  Sparkles,
  X,
  FileCheck,
  Compass,
} from 'lucide-react';
import {
  IfcStructuralAnalysisModel,
  StepSerializer,
  StepParser,
  SafModel,
  SafExporter,
  SafImporter,
  SpatialNodeSnapper,
  CrossPlatformCatalogMapper,
  ModelIntegrityAuditor,
  ModelAuditReport,
} from '@beamlab/interop-pipeline';

interface BIMInteropStudioProps {
  onClose: () => void;
}

type StudioTab = 'exchange' | 'reconcile' | 'mapping' | 'audit';
type ViewportMode = 'analytical' | 'physical';

export const BIMInteropStudio: React.FC<BIMInteropStudioProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<StudioTab>('exchange');
  const [viewportMode, setViewportMode] = useState<ViewportMode>('physical');
  const [toleranceMm, setToleranceMm] = useState<number>(25);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // Default initial demo model (2-Bay Portal Frame)
  const [currentModel, setCurrentModel] = useState<IfcStructuralAnalysisModel>(() => ({
    globalId: 'PORTAL_FRAME_BIM_01',
    name: 'Industrial Portal Frame 2-Bay',
    description: 'BIM Analytical Model from Revit Structural 2026',
    isLoaded: true,
    connections: [
      {
        globalId: 'N_BASE_1',
        name: 'Base Left Column',
        location: { coordinates: [0, 0, 0] },
        condition: {
          translationalStiffnessX: 'FIXED',
          translationalStiffnessY: 'FIXED',
          translationalStiffnessZ: 'FIXED',
          rotationalStiffnessX: 'FIXED',
          rotationalStiffnessY: 'FIXED',
          rotationalStiffnessZ: 'FIXED',
        },
      },
      {
        globalId: 'N_BASE_2',
        name: 'Base Center Column',
        location: { coordinates: [6.0, 0, 0] },
        condition: {
          translationalStiffnessX: 'FIXED',
          translationalStiffnessY: 'FIXED',
          translationalStiffnessZ: 'FIXED',
          rotationalStiffnessX: 'FIXED',
          rotationalStiffnessY: 'FIXED',
          rotationalStiffnessZ: 'FIXED',
        },
      },
      {
        globalId: 'N_BASE_3',
        name: 'Base Right Column',
        location: { coordinates: [12.0, 0, 0] },
        condition: {
          translationalStiffnessX: 'FIXED',
          translationalStiffnessY: 'FIXED',
          translationalStiffnessZ: 'FIXED',
          rotationalStiffnessX: 'FREE',
          rotationalStiffnessY: 'FREE',
          rotationalStiffnessZ: 'FREE',
        },
      },
      {
        globalId: 'N_TOP_1',
        name: 'Eaves Left',
        location: { coordinates: [0, 0, 4.5] },
      },
      {
        // Near-miss geometric gap (15 mm offset along X)
        globalId: 'N_TOP_1_GAP',
        name: 'Physical Beam Inset (15mm Gap)',
        location: { coordinates: [0.015, 0, 4.5] },
      },
      {
        globalId: 'N_TOP_2',
        name: 'Center Column Top',
        location: { coordinates: [6.0, 0, 4.5] },
      },
      {
        globalId: 'N_TOP_3',
        name: 'Eaves Right',
        location: { coordinates: [12.0, 0, 4.5] },
      },
      {
        globalId: 'N_APEX_1',
        name: 'Roof Apex Bay 1',
        location: { coordinates: [3.0, 0, 6.0] },
      },
      {
        globalId: 'N_APEX_2',
        name: 'Roof Apex Bay 2',
        location: { coordinates: [9.0, 0, 6.0] },
      },
      {
        // Orphaned node for auditor demonstration
        globalId: 'N_ORPHAN_TEMP',
        name: 'Floating Survey Marker',
        location: { coordinates: [14.0, 2.0, 0] },
      },
    ],
    curveMembers: [
      {
        globalId: 'MEM_C1',
        name: 'W-Wide Flange-Column: W14X90',
        predefinedType: 'RIGID_JOINED_MEMBER',
        startConnectionId: 'N_BASE_1',
        endConnectionId: 'N_TOP_1',
        profileName: 'W14X90',
        materialName: 'Steel S355',
      },
      {
        globalId: 'MEM_C2',
        name: 'Column Center (HE240B)',
        predefinedType: 'RIGID_JOINED_MEMBER',
        startConnectionId: 'N_BASE_2',
        endConnectionId: 'N_TOP_2',
        profileName: 'HE240B',
        materialName: 'Steel S355',
      },
      {
        globalId: 'MEM_C3',
        name: 'Column Right (W14X90)',
        predefinedType: 'RIGID_JOINED_MEMBER',
        startConnectionId: 'N_BASE_3',
        endConnectionId: 'N_TOP_3',
        profileName: 'W14X90',
        materialName: 'Steel S355',
      },
      {
        globalId: 'MEM_RAFTER_1A',
        name: 'Rafter Bay 1 Left (IPE360)',
        predefinedType: 'RIGID_JOINED_MEMBER',
        startConnectionId: 'N_TOP_1_GAP', // Connects to gap node!
        endConnectionId: 'N_APEX_1',
        profileName: 'IPE360',
        materialName: 'Steel S355',
      },
      {
        globalId: 'MEM_RAFTER_1B',
        name: 'Rafter Bay 1 Right (IPE360)',
        predefinedType: 'RIGID_JOINED_MEMBER',
        startConnectionId: 'N_APEX_1',
        endConnectionId: 'N_TOP_2',
        profileName: 'IPE360',
        materialName: 'Steel S355',
      },
      {
        globalId: 'MEM_RAFTER_2A',
        name: 'Rafter Bay 2 Left (IPE360)',
        predefinedType: 'RIGID_JOINED_MEMBER',
        startConnectionId: 'N_TOP_2',
        endConnectionId: 'N_APEX_2',
        profileName: 'IPE360',
        materialName: 'Steel S355',
      },
      {
        globalId: 'MEM_RAFTER_2B',
        name: 'Rafter Bay 2 Right (IPE360)',
        predefinedType: 'RIGID_JOINED_MEMBER',
        startConnectionId: 'N_APEX_2',
        endConnectionId: 'N_TOP_3',
        profileName: 'IPE360',
        materialName: 'Steel S355',
      },
    ],
    surfaceMembers: [],
    loadGroups: [
      {
        globalId: 'LG_DEAD',
        name: 'Permanent Roof Dead Load',
        actionType: 'PERMANENT_G',
        predefinedType: 'LOAD_CASE',
        coefficient: 1.35,
      },
      {
        globalId: 'LG_WIND',
        name: 'Crosswind Pressure Load',
        actionType: 'WIND',
        predefinedType: 'LOAD_CASE',
        coefficient: 1.5,
      },
    ],
    pointActions: [
      {
        globalId: 'ACT_P_01',
        name: 'Lateral Eaves Wind Force',
        connectionGlobalId: 'N_TOP_1',
        loadGroupGlobalId: 'LG_WIND',
        forces_kN: [35.0, 0, 0],
        moments_kNm: [0, 0, 0],
      },
    ],
    curveActions: [
      {
        globalId: 'ACT_C_01',
        name: 'Rafter Gravity Uniform Dead Load',
        memberGlobalId: 'MEM_RAFTER_1A',
        loadGroupGlobalId: 'LG_DEAD',
        distributionType: 'UNIFORM',
        startForce_kN_m: [0, 0, -14.5],
      },
      {
        globalId: 'ACT_C_02',
        name: 'Rafter Gravity Uniform Dead Load',
        memberGlobalId: 'MEM_RAFTER_1B',
        loadGroupGlobalId: 'LG_DEAD',
        distributionType: 'UNIFORM',
        startForce_kN_m: [0, 0, -14.5],
      },
    ],
  }));

  // Reconciled notification
  const [reconcileLog, setReconcileLog] = useState<string | null>(null);

  // Pipelines
  const serializer = useMemo(() => new StepSerializer(), []);
  const parser = useMemo(() => new StepParser(), []);
  const safExporter = useMemo(() => new SafExporter(), []);
  const safImporter = useMemo(() => new SafImporter(), []);
  const snapper = useMemo(() => new SpatialNodeSnapper(), []);
  const mapper = useMemo(() => new CrossPlatformCatalogMapper(), []);
  const auditor = useMemo(() => new ModelIntegrityAuditor(), []);

  // Run audit on current model
  const auditReport: ModelAuditReport = useMemo(() => {
    return auditor.audit(currentModel);
  }, [auditor, currentModel]);

  // Profile mappings for current model
  const mappedProfiles = useMemo(() => {
    const list: Array<{
      memberId: string;
      rawName: string;
      canonical: ReturnType<CrossPlatformCatalogMapper['mapProfile']>;
    }> = [];
    for (const mem of currentModel.curveMembers) {
      const raw = mem.profileName || mem.name;
      list.push({
        memberId: mem.globalId,
        rawName: raw,
        canonical: mapper.mapProfile(raw),
      });
    }
    return list;
  }, [currentModel, mapper]);

  // Handler: Reconcile / Snap Near-Miss Gaps
  const handleHealGaps = () => {
    const res = snapper.healModel(currentModel, {
      tolerance_m: toleranceMm / 1000,
      preferSupportedNodes: true,
    });
    setCurrentModel(res.healedModel);
    setReconcileLog(
      `Spatial Healing Complete: Merged ${res.nodesMergedCount} near-miss nodes within ${toleranceMm}mm tolerance. Reconnected ${res.modifiedMembersCount} member endpoints.`
    );
  };

  // Handler: Auto-Fix Diagnostics
  const handleAutoFix = () => {
    const healed = auditor.autoFix(currentModel);
    setCurrentModel(healed);
    setReconcileLog('Diagnostic Auto-Fix Applied: Pruned orphaned nodes and repaired section assignments.');
  };

  // Handler: Export IFC4 STEP
  const handleDownloadIFC = () => {
    const stepText = serializer.serialize(currentModel);
    const blob = new Blob([stepText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentModel.name.replace(/\s+/g, '_')}_IFC4.ifc`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Handler: Export SAF JSON / Workbook
  const handleDownloadSAF = () => {
    const safModel = safExporter.fromIfcModel(currentModel);
    const workbook = safExporter.exportToWorkbook(safModel);
    const jsonStr = JSON.stringify(workbook, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentModel.name.replace(/\s+/g, '_')}_SAF.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Handler: Upload File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      const content = evt.target?.result as string;
      if (!content) return;

      if (file.name.endsWith('.ifc')) {
        try {
          const parsed = parser.parse(content);
          setCurrentModel(parsed);
          setReconcileLog(`Successfully imported IFC4 STEP model with ${parsed.connections.length} nodes and ${parsed.curveMembers.length} members.`);
        } catch {
          alert('Failed to parse IFC file. Please verify ISO 10303-21 syntax.');
        }
      } else if (file.name.endsWith('.json') || file.name.endsWith('.saf')) {
        try {
          const parsedJson = JSON.parse(content);
          const safModel: SafModel = parsedJson.project ? (parsedJson as SafModel) : safImporter.importFromWorkbook(parsedJson);
          const convertedIfc = safImporter.toIfcModel(safModel);
          setCurrentModel(convertedIfc);
          setReconcileLog(`Successfully imported SAF format model with ${safModel.nodes.length} nodes and ${safModel.members.length} members.`);
        } catch {
          alert('Failed to parse SAF JSON format.');
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-xl text-slate-100 font-sans"
    >
      {/* Top Header */}
      <header className="h-14 px-6 border-b border-cyan-500/20 bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950/60 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 shadow-md shadow-cyan-500/20">
            <Compass className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">
                OpenBIM & Structural Interoperability Studio
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded">
                IFC4 ISO 16739-1
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded">
                SAF v2.0+
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Cross-platform engineering exchange, centerline reconciliation, and profile catalog mapping
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm">
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Upload File</span>
            <input
              type="file"
              accept=".ifc,.saf,.json"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>

          <button
            onClick={handleDownloadIFC}
            className="px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export IFC4</span>
          </button>

          <button
            onClick={handleDownloadSAF}
            className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export SAF</span>
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Model Metrics Ribbon */}
      <div className="h-10 px-6 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-5 text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-mono">Model:</span>
            <span className="font-semibold text-white">{currentModel.name}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-mono">Nodes:</span>
            <span className="font-mono text-cyan-400 font-bold">{currentModel.connections.length}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-mono">1D Members:</span>
            <span className="font-mono text-indigo-400 font-bold">{currentModel.curveMembers.length}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-mono">Load Groups:</span>
            <span className="font-mono text-amber-400 font-bold">{currentModel.loadGroups.length}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-mono">Actions:</span>
            <span className="font-mono text-pink-400 font-bold">
              {currentModel.pointActions.length + currentModel.curveActions.length}
            </span>
          </div>
        </div>

        {/* Audit Status Pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-mono">Integrity:</span>
            {auditReport.status === 'PASS' && (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> PASS
              </span>
            )}
            {auditReport.status === 'WARNING' && (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {auditReport.warningCount} WARNINGS
              </span>
            )}
            {auditReport.status === 'FAIL' && (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                <AlertOctagon className="w-3 h-3" /> {auditReport.errorCount} DEFECTS
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Reconcile Notification Banner if active */}
      {reconcileLog && (
        <div className="px-6 py-2 bg-cyan-950/60 border-b border-cyan-800/40 text-cyan-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>{reconcileLog}</span>
          </div>
          <button
            onClick={() => setReconcileLog(null)}
            className="text-cyan-400 hover:text-white font-mono text-[10px] underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Studio Body: Viewport (Left) + Inspection Panel (Right) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: 3D / SVG Dual Model Viewport */}
        <div className="flex-1 flex flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-zinc-950 relative border-r border-slate-800/80">
          {/* Viewport Toolbar */}
          <div className="absolute top-3 left-4 z-10 flex items-center gap-2 bg-slate-900/90 backdrop-blur border border-slate-800 rounded-lg p-1 shadow-lg">
            <button
              onClick={() => setViewportMode('analytical')}
              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewportMode === 'analytical'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Analytical Centerlines</span>
            </button>
            <button
              onClick={() => setViewportMode('physical')}
              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewportMode === 'physical'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>Physical 3D Solids</span>
            </button>
          </div>

          {/* Model Display Visualizer */}
          <div className="flex-1 w-full h-full flex items-center justify-center p-8 select-none">
            <svg
              viewBox="-20 -20 180 120"
              className="w-full h-full max-h-[580px]"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Coordinate Grid Background */}
              <defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#1e293b" strokeWidth="0.3" />
                </pattern>
                {/* Linear gradient for physical beams */}
                <linearGradient id="beamSteelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
                <linearGradient id="columnSteelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#4338ca" />
                </linearGradient>
              </defs>
              <rect x="-20" y="-20" width="180" height="120" fill="url(#grid)" />

              {/* Ground Plane */}
              <line x1="-15" y1="80" x2="155" y2="80" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
              <text x="140" y="85" fill="#64748b" fontSize="3" fontFamily="monospace">Z = 0.00m (Base Level)</text>

              {/* Node mapping to 2D SVG canvas:
                  X: 0m -> 10, 6m -> 70, 12m -> 130  (scale = 10 units/m, offset = 10)
                  Z: 0m -> 80, 4.5m -> 35, 6.0m -> 20 (scale = -10 units/m, offset = 80)
              */}
              {(() => {
                const nodeMap = new Map<string, { x: number; y: number; original: any }>();
                for (const node of currentModel.connections) {
                  const [x, , z] = node.location.coordinates;
                  nodeMap.set(node.globalId, {
                    x: 10 + x * 10,
                    y: 80 - z * 10,
                    original: node,
                  });
                }

                return (
                  <g>
                    {/* Render Members */}
                    {currentModel.curveMembers.map(mem => {
                      const p1 = nodeMap.get(mem.startConnectionId);
                      const p2 = nodeMap.get(mem.endConnectionId);
                      if (!p1 || !p2) return null;

                      const isSelected = selectedProfileId === mem.globalId;

                      if (viewportMode === 'analytical') {
                        return (
                          <g key={mem.globalId} onClick={() => setSelectedProfileId(mem.globalId)} className="cursor-pointer">
                            <line
                              x1={p1.x}
                              y1={p1.y}
                              x2={p2.x}
                              y2={p2.y}
                              stroke={isSelected ? '#38bdf8' : '#64748b'}
                              strokeWidth={isSelected ? '2.5' : '1.5'}
                              strokeLinecap="round"
                            />
                            {/* Member Label */}
                            <text
                              x={(p1.x + p2.x) / 2}
                              y={(p1.y + p2.y) / 2 - 2}
                              fill={isSelected ? '#38bdf8' : '#94a3b8'}
                              fontSize="3"
                              fontFamily="monospace"
                              textAnchor="middle"
                            >
                              {mem.profileName || mem.name}
                            </text>
                          </g>
                        );
                      }

                      // Physical 3D extruded solid appearance
                      const dx = p2.x - p1.x;
                      const dy = p2.y - p1.y;
                      const len = Math.sqrt(dx * dx + dy * dy);
                      const isCol = Math.abs(dx) < 1;
                      const thickness = isCol ? 4.5 : 3.5;

                      const nx = -(dy / len) * (thickness / 2);
                      const ny = (dx / len) * (thickness / 2);

                      const polyPoints = `${p1.x + nx},${p1.y + ny} ${p2.x + nx},${p2.y + ny} ${p2.x - nx},${p2.y - ny} ${p1.x - nx},${p1.y - ny}`;

                      return (
                        <g key={mem.globalId} onClick={() => setSelectedProfileId(mem.globalId)} className="cursor-pointer group">
                          {/* Flange solid polygon */}
                          <polygon
                            points={polyPoints}
                            fill={isCol ? 'url(#columnSteelGrad)' : 'url(#beamSteelGrad)'}
                            stroke={isSelected ? '#38bdf8' : '#0f172a'}
                            strokeWidth="0.6"
                            className="transition-all hover:brightness-125"
                          />
                          {/* Centerline highlight */}
                          <line
                            x1={p1.x}
                            y1={p1.y}
                            x2={p2.x}
                            y2={p2.y}
                            stroke="rgba(255,255,255,0.25)"
                            strokeWidth="0.4"
                            strokeDasharray="1.5 1.5"
                          />
                          {/* Section tag */}
                          <text
                            x={(p1.x + p2.x) / 2}
                            y={(p1.y + p2.y) / 2 - 3}
                            fill="#f8fafc"
                            fontSize="2.8"
                            fontFamily="monospace"
                            fontWeight="bold"
                            textAnchor="middle"
                            className="pointer-events-none drop-shadow"
                          >
                            {mem.profileName || mem.name}
                          </text>
                        </g>
                      );
                    })}

                    {/* Render Distributed Loads on Members */}
                    {currentModel.curveActions.map(ca => {
                      const mem = currentModel.curveMembers.find(m => m.globalId === ca.memberGlobalId);
                      if (!mem) return null;
                      const p1 = nodeMap.get(mem.startConnectionId);
                      const p2 = nodeMap.get(mem.endConnectionId);
                      if (!p1 || !p2) return null;

                      // Draw 4 load arrows pointing downwards
                      const arrows = [0.2, 0.4, 0.6, 0.8].map(t => ({
                        x: p1.x + (p2.x - p1.x) * t,
                        y: p1.y + (p2.y - p1.y) * t,
                      }));

                      return (
                        <g key={ca.globalId} className="pointer-events-none">
                          {arrows.map((pt, idx) => (
                            <g key={idx}>
                              <line x1={pt.x} y1={pt.y - 7} x2={pt.x} y2={pt.y - 1} stroke="#ec4899" strokeWidth="0.8" />
                              <polygon
                                points={`${pt.x},${pt.y} ${pt.x - 1},${pt.y - 2} ${pt.x + 1},${pt.y - 2}`}
                                fill="#ec4899"
                              />
                            </g>
                          ))}
                          <text
                            x={(p1.x + p2.x) / 2}
                            y={(p1.y + p2.y) / 2 - 9}
                            fill="#f472b6"
                            fontSize="2.6"
                            fontFamily="monospace"
                            textAnchor="middle"
                          >
                            {ca.startForce_kN_m[2]} kN/m
                          </text>
                        </g>
                      );
                    })}

                    {/* Render Nodes & Boundary Conditions */}
                    {Array.from(nodeMap.values()).map(n => {
                      const node = n.original;
                      const isSupported = Boolean(node.condition);
                      const isOrphan = !currentModel.curveMembers.some(
                        m => m.startConnectionId === node.globalId || m.endConnectionId === node.globalId
                      );

                      return (
                        <g key={node.globalId}>
                          {/* Node circle */}
                          <circle
                            cx={n.x}
                            cy={n.y}
                            r={isOrphan ? '2.2' : '1.6'}
                            fill={isOrphan ? '#ef4444' : isSupported ? '#10b981' : '#38bdf8'}
                            stroke="#020617"
                            strokeWidth="0.6"
                          />

                          {/* 6-DOF Boundary Support Glyph */}
                          {isSupported && (
                            <g transform={`translate(${n.x}, ${n.y})`}>
                              {/* Fixed Support: Rectangle hatching */}
                              {node.condition?.rotationalStiffnessZ === 'FIXED' ? (
                                <g>
                                  <rect x="-4" y="1.5" width="8" height="3" fill="#10b981" rx="0.5" />
                                  <line x1="-5" y1="4.5" x2="5" y2="4.5" stroke="#047857" strokeWidth="0.8" />
                                </g>
                              ) : (
                                /* Pinned Support: Triangle */
                                <polygon points="0,1.5 -3.5,6 3.5,6" fill="#10b981" />
                              )}
                            </g>
                          )}

                          {/* Node Name Label */}
                          <text
                            x={n.x + 2}
                            y={n.y + 4}
                            fill={isOrphan ? '#f87171' : '#94a3b8'}
                            fontSize="2.4"
                            fontFamily="monospace"
                          >
                            {node.name}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                );
              })()}
            </svg>
          </div>

          {/* Viewport Footer legend */}
          <div className="h-9 px-4 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Supported Base Nodes
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" /> Framing Centerline Nodes
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Orphaned / Offset Nodes
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-pink-500 inline-block" /> Applied Actions (kN/m)
              </span>
            </div>
            <div className="text-slate-500 font-mono">
              Projection: ISO Plane X-Z • Scale: 1:100
            </div>
          </div>
        </div>

        {/* Right: Inspection, Reconciliation & Catalog Tab Panel */}
        <div className="w-[480px] flex flex-col bg-slate-900 border-l border-slate-800">
          {/* Tabs Navigation */}
          <div className="flex border-b border-slate-800 bg-slate-950">
            <button
              onClick={() => setActiveTab('exchange')}
              className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                activeTab === 'exchange'
                  ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>Exchange</span>
            </button>

            <button
              onClick={() => setActiveTab('reconcile')}
              className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                activeTab === 'reconcile'
                  ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Heal Gaps</span>
            </button>

            <button
              onClick={() => setActiveTab('mapping')}
              className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                activeTab === 'mapping'
                  ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Catalog</span>
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                activeTab === 'audit'
                  ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Audit</span>
            </button>
          </div>

          {/* Tab Content Panels */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* TAB 1: Exchange & Formats */}
            {activeTab === 'exchange' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Compass className="w-4 h-4 text-cyan-400" />
                    <span>OpenBIM IFC4 Structural Pipeline</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Complies with buildingSMART International ISO 16739-1 standard schema. Includes 6-DOF boundary support definitions, 1D curve members, 2D planar panels, and structural actions.
                  </p>
                  <div className="pt-2 flex gap-2">
                    <button
                      onClick={handleDownloadIFC}
                      className="flex-1 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-cyan-600/20"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .IFC Model</span>
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span>SAF (Structural Analysis Format v2.0+)</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Official format for structural interop between SCIA Engineer, Dlubal RFEM, Allplan, and AxisVM. Multi-sheet workbook architecture with parametric cross-sections.
                  </p>
                  <div className="pt-2 flex gap-2">
                    <button
                      onClick={handleDownloadSAF}
                      className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-emerald-600/20"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .SAF Tables</span>
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <h4 className="text-xs font-semibold text-slate-300">Supported Software Platforms:</h4>
                  <ul className="text-[11px] text-slate-400 space-y-1">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> Autodesk Revit (Structural Analytical Model)
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> Trimble Tekla Structures
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> SCIA Engineer / Graphisoft Archicad
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Dlubal RFEM / RSTAB
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* TAB 2: Reconcile & Spatial Snapper */}
            {activeTab === 'reconcile' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-cyan-400" />
                      <span>Near-Miss Snapping Tolerance</span>
                    </h3>
                    <span className="font-mono text-sm font-bold text-cyan-400">{toleranceMm} mm</span>
                  </div>

                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={toleranceMm}
                    onChange={e => setToleranceMm(parseInt(e.target.value, 10))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Merges analytical nodes within the specified Euclidean distance. Automatically collapses multi-node clusters into boundary-supported foundation nodes and updates member connectivities.
                  </p>

                  <button
                    onClick={handleHealGaps}
                    className="w-full py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-cyan-600/20"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Execute Spatial Snapping</span>
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <h4 className="text-xs font-semibold text-slate-200">Reconciliation Diagnostics:</h4>
                  <div className="space-y-1.5 text-[11px] font-mono text-slate-400">
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span>Total Original Nodes:</span>
                      <span className="text-slate-200">{currentModel.connections.length}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span>Candidate Offset Nodes:</span>
                      <span className="text-amber-400">
                        {currentModel.connections.filter(c => c.name.includes('Gap') || c.name.includes('Offset')).length}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>Support Condition Inheritance:</span>
                      <span className="text-emerald-400">Enabled (Rigid Priority)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Cross-Platform Profile Catalog Mapping */}
            {activeTab === 'mapping' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Discovered Section Profiles ({mappedProfiles.length})
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">Revit / Tekla / SAF</span>
                </div>

                <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                  {mappedProfiles.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedProfileId(item.memberId)}
                      className={`p-3 rounded-lg border transition-all cursor-pointer ${
                        selectedProfileId === item.memberId
                          ? 'bg-cyan-950/40 border-cyan-500 shadow-sm shadow-cyan-500/20'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-white">{item.canonical.canonicalName}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                          {item.canonical.standard}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400 font-mono truncate mb-2">
                        Source: <span className="text-slate-300">{item.rawName}</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-slate-400 bg-slate-900/60 p-1.5 rounded">
                        <div>
                          Depth: <span className="text-slate-200">{item.canonical.depth_mm}mm</span>
                        </div>
                        <div>
                          Width: <span className="text-slate-200">{item.canonical.width_mm}mm</span>
                        </div>
                        <div>
                          Shape: <span className="text-cyan-400">{item.canonical.shapeType}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: Integrity Auditor */}
            {activeTab === 'audit' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Pre-Analysis Integrity Diagnostic
                    </h3>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded font-mono ${
                        auditReport.status === 'PASS'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : auditReport.status === 'WARNING'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {auditReport.status}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Inspecting model for kinematic instability, orphaned nodes, zero-length elements, and boundary support adequacy.
                  </p>

                  {auditReport.issues.some(i => i.autoFixAvailable) && (
                    <button
                      onClick={handleAutoFix}
                      className="w-full mt-2 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-emerald-600/20"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Apply Diagnostic Auto-Fix</span>
                    </button>
                  )}
                </div>

                {/* Issues List */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-300">
                    Detected Diagnostics ({auditReport.issues.length})
                  </h4>

                  {auditReport.issues.length === 0 ? (
                    <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Model passes all geometric and topological integrity checks.</span>
                    </div>
                  ) : (
                    auditReport.issues.map(issue => (
                      <div
                        key={issue.id}
                        className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                          issue.severity === 'ERROR'
                            ? 'bg-rose-950/20 border-rose-800/50 text-rose-300'
                            : 'bg-amber-950/20 border-amber-800/50 text-amber-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold flex items-center gap-1.5">
                            {issue.severity === 'ERROR' ? (
                              <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            )}
                            {issue.category}
                          </span>
                          {issue.autoFixAvailable && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400 border border-emerald-500/30">
                              Auto-Fixable
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-300 leading-snug">{issue.message}</p>
                        {issue.affectedEntityIds.length > 0 && (
                          <div className="text-[10px] font-mono text-slate-400 truncate">
                            Entities: {issue.affectedEntityIds.join(', ')}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
