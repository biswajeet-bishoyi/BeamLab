import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Layers, 
  Link as LinkIcon, 
  Trash2, 
  Plus, 
  ShieldCheck, 
  Anchor, 
  ArrowDownToLine, 
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { workspace } from '@beamstudio/workspace-runtime';
import { structuralBridge } from '../canvas/structuralBridge';
import { useStore } from '../../store';
import type { SupportPreset, MemberType } from '@beamstudio/engineering-model';
import { toLength, toForce, toForcePerLength } from '@beamworks/core-engine/units/brands';

const SECTION_OPTIONS = [
  'W12x26',
  'W14x30',
  'W18x50',
  'IPE 300',
  'HEB 200',
  'CHS 168.3x8',
  'CHS 114.3x5',
];

const MATERIAL_OPTIONS = [
  { grade: 'A992', label: 'A992 Structural Steel (345 MPa)' },
  { grade: 'S355', label: 'S355 Structural Steel (355 MPa)' },
  { grade: 'C30/37', label: 'C30/37 Concrete (30 MPa)' },
];

const SUPPORT_OPTIONS: (SupportPreset | 'None')[] = [
  'None',
  'Pinned',
  'Fixed',
  'RollerX',
  'RollerY',
  'RollerZ',
];

interface FocusCardProps {
  id: string | null;
}

export const FocusCard: React.FC<FocusCardProps> = ({ id }) => {
  const [, setTick] = useState(0);

  // Subscribe to structural bridge mutations
  useEffect(() => {
    const unsub = structuralBridge.subscribe(() => setTick(t => t + 1));
    return unsub;
  }, []);

  const model2D = useStore(state => state.model);
  const dispatchCommand = useStore(state => state.dispatchCommand);

  // Check 3D entities
  const node3D = id ? structuralBridge.getNode(id) : undefined;
  const member3D = id ? structuralBridge.getMember(id) : undefined;
  const support3D = id ? structuralBridge.getSupport(id) : undefined;

  // Check 2D entities
  const support2D = id ? model2D.supports.find(s => s.id === id) : undefined;
  const load2D = id ? model2D.loads.find(l => l.id === id) : undefined;

  // ─── 1. 3D NODE INSPECTOR ──────────────────────────────────────────────────
  if (node3D) {
    const activeSupport = structuralBridge.getSupportForNode(node3D.identity.id);
    const currentSupportType: SupportPreset | 'None' = (activeSupport?.preset as SupportPreset) || 'None';

    const handleCoordChange = (axis: 'x' | 'y' | 'z', val: number) => {
      const x = axis === 'x' ? val : node3D.x;
      const y = axis === 'y' ? val : node3D.y;
      const z = axis === 'z' ? val : node3D.z;
      structuralBridge.updateNode(node3D.identity.id, x, y, z);
    };

    const handleSupportChange = (preset: SupportPreset | 'None') => {
      structuralBridge.setNodeSupport(node3D.identity.id, preset);
    };

    const handleDelete = () => {
      structuralBridge.deleteNode(node3D.identity.id);
      workspace.clearSelection();
      useStore.getState().selectObject(null);
    };

    return (
      <div className="flex flex-col h-full space-y-4 text-xs animate-in fade-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-subtle">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <LinkIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-primary text-sm">{node3D.identity.name}</h3>
              <p className="text-[10px] text-muted font-mono">{node3D.identity.id}</p>
            </div>
          </div>
          <button
            onClick={handleDelete}
            className="p-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors"
            title="Delete Node"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Coordinates Section */}
        <div className="bg-panel border border-subtle rounded-lg p-3 space-y-3">
          <span className="font-semibold text-muted uppercase tracking-wider text-[10px] block">
            Spatial Coordinates (Meters)
          </span>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-muted block mb-1">X [m]</label>
              <input
                type="number"
                step="0.25"
                value={Math.round(node3D.x * 100) / 100}
                onChange={(e) => handleCoordChange('x', parseFloat(e.target.value) || 0)}
                className="w-full bg-[#161b26] border border-subtle rounded px-2 py-1 text-primary text-xs font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted block mb-1">Y [m]</label>
              <input
                type="number"
                step="0.25"
                value={Math.round(node3D.y * 100) / 100}
                onChange={(e) => handleCoordChange('y', parseFloat(e.target.value) || 0)}
                className="w-full bg-[#161b26] border border-subtle rounded px-2 py-1 text-primary text-xs font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted block mb-1">Z [m]</label>
              <input
                type="number"
                step="0.25"
                value={Math.round(node3D.z * 100) / 100}
                onChange={(e) => handleCoordChange('z', parseFloat(e.target.value) || 0)}
                className="w-full bg-[#161b26] border border-subtle rounded px-2 py-1 text-primary text-xs font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Boundary Support Section */}
        <div className="bg-panel border border-subtle rounded-lg p-3 space-y-2">
          <span className="font-semibold text-muted uppercase tracking-wider text-[10px] block">
            Boundary Support Condition
          </span>
          <select
            value={currentSupportType}
            onChange={(e) => handleSupportChange(e.target.value as SupportPreset | 'None')}
            className="w-full bg-[#161b26] border border-subtle rounded px-2.5 py-1.5 text-primary text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            {SUPPORT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt === 'None' ? 'Free (No Support)' : `${opt} Support`}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-muted">
            {currentSupportType === 'Fixed'
              ? 'Restrains all 6 DOFs (Ux, Uy, Uz, Rx, Ry, Rz).'
              : currentSupportType === 'Pinned'
              ? 'Restrains translations (Ux, Uy, Uz), allows rotation.'
              : currentSupportType.startsWith('Roller')
              ? 'Translational roller release along specified axis.'
              : 'Free internal connection node.'}
          </p>
        </div>

        {/* Connected Members */}
        <div className="bg-panel border border-subtle rounded-lg p-3 space-y-2">
          <span className="font-semibold text-muted uppercase tracking-wider text-[10px] block">
            Connected Members ({node3D.connectedMembers?.length || 0})
          </span>
          <div className="flex flex-wrap gap-1.5">
            {node3D.connectedMembers?.length > 0 ? (
              node3D.connectedMembers.map((cm, i) => (
                <button
                  key={i}
                  onClick={() => {
                    workspace.select([cm.memberId]);
                    useStore.getState().selectObject(cm.memberId);
                  }}
                  className="px-2 py-1 rounded bg-[#161b26] hover:bg-blue-600/20 border border-subtle text-slate-300 hover:text-blue-300 font-mono text-[10px] transition-colors"
                >
                  {cm.memberId} ({cm.end})
                </button>
              ))
            ) : (
              <span className="text-muted text-[11px] italic">Isolated node (no connected members)</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── 2. 3D MEMBER INSPECTOR ────────────────────────────────────────────────
  if (member3D) {
    const sys = structuralBridge.getSystem();
    const sec = sys?.getSection(member3D.sectionId);
    const startNode = sys?.nodes.get(member3D.startNodeId);
    const endNode = sys?.nodes.get(member3D.endNodeId);
    const length = startNode && endNode ? startNode.distanceTo(endNode) : 0;

    const handleSectionChange = (designation: string) => {
      structuralBridge.updateMember(member3D.identity.id, { sectionDesignation: designation });
    };

    const handleMaterialChange = (grade: string) => {
      structuralBridge.updateMember(member3D.identity.id, { materialGrade: grade });
    };

    const handleTypeChange = (type: MemberType) => {
      structuralBridge.updateMember(member3D.identity.id, { memberType: type });
    };

    const handleDelete = () => {
      structuralBridge.deleteMember(member3D.identity.id);
      workspace.clearSelection();
      useStore.getState().selectObject(null);
    };

    return (
      <div className="flex flex-col h-full space-y-4 text-xs animate-in fade-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-subtle">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Box className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-primary text-sm">{member3D.identity.name}</h3>
              <p className="text-[10px] text-muted font-mono">{member3D.identity.id}</p>
            </div>
          </div>
          <button
            onClick={handleDelete}
            className="p-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors"
            title="Delete Member"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Member Topology Info */}
        <div className="bg-panel border border-subtle rounded-lg p-3 space-y-2">
          <span className="font-semibold text-muted uppercase tracking-wider text-[10px] block">
            Topology & Geometry
          </span>
          <div className="grid grid-cols-2 gap-y-1.5 text-xs">
            <span className="text-muted">Length</span>
            <span className="text-right font-mono font-medium text-primary">
              {length.toFixed(3)} m
            </span>
            <span className="text-muted">Start Node</span>
            <button
              onClick={() => {
                workspace.select([member3D.startNodeId]);
                useStore.getState().selectObject(member3D.startNodeId);
              }}
              className="text-right font-mono text-blue-400 hover:underline"
            >
              {member3D.startNodeId}
            </button>
            <span className="text-muted">End Node</span>
            <button
              onClick={() => {
                workspace.select([member3D.endNodeId]);
                useStore.getState().selectObject(member3D.endNodeId);
              }}
              className="text-right font-mono text-blue-400 hover:underline"
            >
              {member3D.endNodeId}
            </button>
          </div>
        </div>

        {/* Structural Profile Editor */}
        <div className="bg-panel border border-subtle rounded-lg p-3 space-y-2">
          <span className="font-semibold text-muted uppercase tracking-wider text-[10px] block">
            Cross-Section Profile
          </span>
          <select
            value={sec?.profile.designation || 'W12x26'}
            onChange={(e) => handleSectionChange(e.target.value)}
            className="w-full bg-[#161b26] border border-subtle rounded px-2.5 py-1.5 text-primary text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            {SECTION_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-y-1 text-[10px] pt-1 text-muted">
            <span>Area (A):</span>
            <span className="text-right font-mono text-primary">
              {sec?.properties.area ? `${(sec.properties.area * 1e4).toFixed(1)} cm²` : '-'}
            </span>
            <span>Iy:</span>
            <span className="text-right font-mono text-primary">
              {sec?.properties.momentOfInertiaY ? `${(sec.properties.momentOfInertiaY * 1e8).toFixed(1)} cm⁴` : '-'}
            </span>
          </div>
        </div>

        {/* Material Selection */}
        <div className="bg-panel border border-subtle rounded-lg p-3 space-y-2">
          <span className="font-semibold text-muted uppercase tracking-wider text-[10px] block">
            Engineering Material
          </span>
          <select
            value={member3D.materialId.includes('concrete') ? 'C30/37' : 'A992'}
            onChange={(e) => handleMaterialChange(e.target.value)}
            className="w-full bg-[#161b26] border border-subtle rounded px-2.5 py-1.5 text-primary text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            {MATERIAL_OPTIONS.map((m) => (
              <option key={m.grade} value={m.grade}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Member Role / Type */}
        <div className="bg-panel border border-subtle rounded-lg p-3 space-y-2">
          <span className="font-semibold text-muted uppercase tracking-wider text-[10px] block">
            Member Type / Formulation
          </span>
          <select
            value={member3D.memberType || 'Beam'}
            onChange={(e) => handleTypeChange(e.target.value as MemberType)}
            className="w-full bg-[#161b26] border border-subtle rounded px-2.5 py-1.5 text-primary text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="Beam">Euler-Bernoulli Beam</option>
            <option value="Column">Compression Column</option>
            <option value="Brace">Axial Brace</option>
            <option value="Truss">Pure Pin-Ended Truss</option>
          </select>
        </div>
      </div>
    );
  }

  // ─── 3. 2D SUPPORT INSPECTOR ───────────────────────────────────────────────
  if (support2D) {
    const handlePosChange = (pos: number) => {
      dispatchCommand({
        type: 'MOVE_SUPPORT',
        timestamp: Date.now(),
        payload: { id: support2D.id, newPosition: toLength(pos) },
      });
    };

    const handleDelete = () => {
      dispatchCommand({
        type: 'REMOVE_OBJECT',
        timestamp: Date.now(),
        payload: { id: support2D.id },
      });
      useStore.getState().selectObject(null);
    };

    return (
      <div className="flex flex-col h-full space-y-4 text-xs animate-in fade-in duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-subtle">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Anchor className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-primary text-sm uppercase">Support {support2D.type}</h3>
              <p className="text-[10px] text-muted font-mono">{support2D.id}</p>
            </div>
          </div>
          <button
            onClick={handleDelete}
            className="p-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-panel border border-subtle rounded-lg p-3 space-y-2">
          <label className="text-[10px] text-muted block">Position Along Beam Span (x)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.5"
              min="0"
              max={model2D.span}
              value={support2D.position}
              onChange={(e) => handlePosChange(parseFloat(e.target.value) || 0)}
              className="flex-1 bg-[#161b26] border border-subtle rounded px-2.5 py-1.5 text-primary text-xs font-mono focus:outline-none focus:border-blue-500"
            />
            <span className="text-muted font-mono">m</span>
          </div>
        </div>
      </div>
    );
  }

  // ─── 4. 2D LOAD INSPECTOR ──────────────────────────────────────────────────
  if (load2D) {
    const handleMagChange = (mag: number) => {
      dispatchCommand({
        type: 'UPDATE_LOAD_MAGNITUDE',
        timestamp: Date.now(),
        payload: { id: load2D.id, newMagnitude: toForce(mag) },
      });
    };

    const handlePosChange = (pos: number) => {
      dispatchCommand({
        type: 'MOVE_LOAD',
        timestamp: Date.now(),
        payload: { id: load2D.id, newPosition: toLength(pos) },
      });
    };

    const handleDelete = () => {
      dispatchCommand({
        type: 'REMOVE_OBJECT',
        timestamp: Date.now(),
        payload: { id: load2D.id },
      });
      useStore.getState().selectObject(null);
    };

    return (
      <div className="flex flex-col h-full space-y-4 text-xs animate-in fade-in duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-subtle">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <ArrowDownToLine className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-primary text-sm uppercase">{load2D.type} Load</h3>
              <p className="text-[10px] text-muted font-mono">{load2D.id}</p>
            </div>
          </div>
          <button
            onClick={handleDelete}
            className="p-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-panel border border-subtle rounded-lg p-3 space-y-3">
          <div>
            <label className="text-[10px] text-muted block mb-1">Magnitude (kN, downward is negative)</label>
            <input
              type="number"
              step="10"
              value={load2D.magnitude}
              onChange={(e) => handleMagChange(parseFloat(e.target.value) || 0)}
              className="w-full bg-[#161b26] border border-subtle rounded px-2.5 py-1.5 text-primary text-xs font-mono focus:outline-none focus:border-amber-500"
            />
          </div>
          {load2D.type === 'point' && (
            <div>
              <label className="text-[10px] text-muted block mb-1">Position (m)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max={model2D.span}
                value={load2D.position}
                onChange={(e) => handlePosChange(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#161b26] border border-subtle rounded px-2.5 py-1.5 text-primary text-xs font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── 5. BLANK CANVAS / NOTHING SELECTED: CAD CREATION TOOLKIT ───────────────
  return <CADElementCreator />;
};

/**
 * Interactive creation panel shown when nothing is selected,
 * allowing users to build nodes and connect members directly into the 3D model.
 */
function CADElementCreator() {
  const [nodeX, setNodeX] = useState<string>('0');
  const [nodeY, setNodeY] = useState<string>('0');
  const [nodeZ, setNodeZ] = useState<string>('0');

  const [startNodeId, setStartNodeId] = useState<string>('');
  const [endNodeId, setEndNodeId] = useState<string>('');
  const [sectionChoice, setSectionChoice] = useState<string>('W12x26');

  const nodes = structuralBridge.getAllNodes();
  const members = structuralBridge.getAllMembers();

  // Keep dropdowns populated with existing nodes
  useEffect(() => {
    if (nodes.length >= 2) {
      if (!startNodeId) setStartNodeId(nodes[0]!.identity.id);
      if (!endNodeId) setEndNodeId(nodes[1]!.identity.id);
    }
  }, [nodes.length, startNodeId, endNodeId]);

  const handleAddNode = (e: React.FormEvent) => {
    e.preventDefault();
    const x = parseFloat(nodeX) || 0;
    const y = parseFloat(nodeY) || 0;
    const z = parseFloat(nodeZ) || 0;
    const id = structuralBridge.addNode(x, y, z);
    workspace.select([id]);
    useStore.getState().selectObject(id);
  };

  const handleConnectMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startNodeId || !endNodeId || startNodeId === endNodeId) return;
    const id = structuralBridge.addMember(startNodeId, endNodeId, sectionChoice);
    if (id) {
      workspace.select([id]);
      useStore.getState().selectObject(id);
    }
  };

  const handleQuickBeam = () => {
    const res = structuralBridge.quickAddBeamSpan(6);
    workspace.select([res.member]);
    useStore.getState().selectObject(res.member);
  };

  const handleQuickPortal = () => {
    structuralBridge.quickAddPortalBay(6, 3.5);
  };

  const handleClearAll = () => {
    structuralBridge.clearAll();
    workspace.clearSelection();
    useStore.getState().selectObject(null);
  };

  return (
    <div className="flex flex-col space-y-4 text-xs animate-in fade-in duration-200">
      {/* Overview Banner */}
      <div className="bg-panel border border-subtle rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-primary flex items-center gap-1.5 text-xs">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            Active Model Overview
          </span>
          {nodes.length === 0 && (
            <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              Blank Canvas
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px] text-muted">
          <div>Nodes: <span className="font-mono text-primary font-semibold">{nodes.length}</span></div>
          <div>Members: <span className="font-mono text-primary font-semibold">{members.length}</span></div>
        </div>
        {nodes.length > 0 && (
          <button
            onClick={handleClearAll}
            className="mt-2.5 w-full py-1 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 rounded transition-colors"
          >
            Clear to Blank Canvas
          </button>
        )}
      </div>

      {/* Primary Action: Add Beam */}
      <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/20 border border-blue-500/30 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-white flex items-center gap-1.5 text-xs">
            <Box className="w-4 h-4 text-blue-400" />
            Add Beam / Member
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-300 font-mono">
            Key: B
          </span>
        </div>
        <p className="text-[11px] text-muted leading-tight">
          Create beams with custom length, supports, 3D coordinates, or profiles.
        </p>
        <button
          onClick={() => useStore.getState().setAddBeamModalOpen(true)}
          className="w-full py-2 px-3 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-md transition-all flex items-center justify-center gap-2 group"
        >
          <Plus className="w-4 h-4 transition-transform group-hover:scale-110" />
          <span>Add Beam (Configurator)</span>
        </button>
      </div>

      {/* Quick 1-Click Starters */}
      <div className="space-y-2">
        <span className="font-semibold text-muted uppercase tracking-wider text-[10px] block">
          Quick Structural Starters
        </span>
        <div className="grid grid-cols-1 gap-2">
          <button
            onClick={handleQuickBeam}
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-panel hover:bg-subtle border border-subtle hover:border-accent text-primary transition-all text-left group"
          >
            <div>
              <div className="font-medium text-xs">6m Beam with Supports</div>
              <div className="text-[10px] text-muted">Pin at (0,0,0), Roller at (6,0,0)</div>
            </div>
            <Plus className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
          </button>

          <button
            onClick={handleQuickPortal}
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-panel hover:bg-subtle border border-subtle hover:border-accent text-primary transition-all text-left group"
          >
            <div>
              <div className="font-medium text-xs">Portal Frame Bay</div>
              <div className="text-[10px] text-muted">6m span × 3.5m height frame</div>
            </div>
            <Plus className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>

      {/* Add 3D Node Section */}
      <form onSubmit={handleAddNode} className="bg-panel border border-subtle rounded-lg p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-muted uppercase tracking-wider text-[10px]">
            Add Node at Coordinates
          </span>
          <LinkIcon className="w-3 h-3 text-muted" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[9px] text-muted block mb-0.5">X [m]</label>
            <input
              type="number"
              step="0.5"
              value={nodeX}
              onChange={(e) => setNodeX(e.target.value)}
              className="w-full bg-[#161b26] border border-subtle rounded px-2 py-1 text-primary text-xs font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-[9px] text-muted block mb-0.5">Y [m]</label>
            <input
              type="number"
              step="0.5"
              value={nodeY}
              onChange={(e) => setNodeY(e.target.value)}
              className="w-full bg-[#161b26] border border-subtle rounded px-2 py-1 text-primary text-xs font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-[9px] text-muted block mb-0.5">Z [m]</label>
            <input
              type="number"
              step="0.5"
              value={nodeZ}
              onChange={(e) => setNodeZ(e.target.value)}
              className="w-full bg-[#161b26] border border-subtle rounded px-2 py-1 text-primary text-xs font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <button
          type="submit"
          className="w-full py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow transition-colors flex items-center justify-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Node</span>
        </button>
      </form>

      {/* Connect Member Section */}
      {nodes.length >= 2 && (
        <form onSubmit={handleConnectMember} className="bg-panel border border-subtle rounded-lg p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-muted uppercase tracking-wider text-[10px]">
              Connect Member
            </span>
            <Box className="w-3 h-3 text-muted" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] text-muted block mb-0.5">Start Node</label>
              <select
                value={startNodeId}
                onChange={(e) => setStartNodeId(e.target.value)}
                className="w-full bg-[#161b26] border border-subtle rounded px-2 py-1 text-primary text-xs font-mono focus:outline-none focus:border-emerald-500"
              >
                {nodes.map(n => (
                  <option key={n.identity.id} value={n.identity.id}>
                    {n.identity.id} ({n.x},{n.y},{n.z})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] text-muted block mb-0.5">End Node</label>
              <select
                value={endNodeId}
                onChange={(e) => setEndNodeId(e.target.value)}
                className="w-full bg-[#161b26] border border-subtle rounded px-2 py-1 text-primary text-xs font-mono focus:outline-none focus:border-emerald-500"
              >
                {nodes.map(n => (
                  <option key={n.identity.id} value={n.identity.id}>
                    {n.identity.id} ({n.x},{n.y},{n.z})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[9px] text-muted block mb-0.5">Section Profile</label>
            <select
              value={sectionChoice}
              onChange={(e) => setSectionChoice(e.target.value)}
              className="w-full bg-[#161b26] border border-subtle rounded px-2 py-1 text-primary text-xs focus:outline-none focus:border-emerald-500"
            >
              {SECTION_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={!startNodeId || !endNodeId || startNodeId === endNodeId}
            className="w-full py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs shadow transition-colors flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Connect Member</span>
          </button>
        </form>
      )}

      {/* Helper tips */}
      <div className="p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/10 text-[10px] text-blue-300/80 leading-relaxed">
        Tip: Click any node or member in the 3D viewport to inspect and modify its coordinates, section profile, boundary supports, or delete it.
      </div>
    </div>
  );
}
