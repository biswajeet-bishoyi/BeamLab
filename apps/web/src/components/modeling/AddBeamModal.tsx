import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Box, 
  X, 
  Plus, 
  Layers, 
  Anchor, 
  ArrowDownToLine, 
  Ruler, 
  CheckCircle2, 
  Sparkles 
} from 'lucide-react';
import { structuralBridge } from '../../features/canvas/structuralBridge';
import { useStore } from '../../store';
import { workspace } from '@beamstudio/workspace-runtime';
import { toLength, toForce, toForcePerLength } from '@beamworks/core-engine/units/brands';
import type { SupportPreset } from '@beamstudio/engineering-model';

interface AddBeamModalProps {
  onClose: () => void;
}

const SECTION_PROFILES = [
  { id: 'W12x26', label: 'W12x26 (Universal Beam / Column)', area: '49.0 cm²', depth: '310 mm' },
  { id: 'W14x30', label: 'W14x30 (Heavy Girder)', area: '57.0 cm²', depth: '352 mm' },
  { id: 'W18x50', label: 'W18x50 (Long Span Girder)', area: '94.8 cm²', depth: '457 mm' },
  { id: 'IPE 300', label: 'IPE 300 (Eurocode I-Section)', area: '53.8 cm²', depth: '300 mm' },
  { id: 'HEB 200', label: 'HEB 200 (Compact Column)', area: '78.1 cm²', depth: '200 mm' },
  { id: 'CHS 168.3x8', label: 'CHS 168.3x8 (Circular Hollow)', area: '40.3 cm²', depth: '168 mm' },
  { id: 'CHS 114.3x5', label: 'CHS 114.3x5 (Pipe Brace)', area: '17.2 cm²', depth: '114 mm' },
];

const MATERIALS = [
  { grade: 'A992', label: 'A992 Structural Steel (fy = 345 MPa, E = 200 GPa)' },
  { grade: 'S355', label: 'S355 Structural Steel (fy = 355 MPa, E = 200 GPa)' },
  { grade: 'C30/37', label: 'C30/37 Concrete (fck = 30 MPa, E = 33 GPa)' },
];

export const AddBeamModal: React.FC<AddBeamModalProps> = ({ onClose }) => {
  const [tab, setTab] = useState<'quick' | 'coords' | 'nodes'>('quick');

  // Quick Beam Settings
  const [length, setLength] = useState<string>('6.0');
  const [supportCondition, setSupportCondition] = useState<'simply_supported' | 'fixed_fixed' | 'cantilever' | 'none'>('simply_supported');
  const [section, setSection] = useState<string>('W12x26');
  const [material, setMaterial] = useState<string>('A992');
  const [initialLoad, setInitialLoad] = useState<'none' | 'point' | 'udl'>('none');

  // Custom 3D Coordinates
  const [x1, setX1] = useState<string>('0');
  const [y1, setY1] = useState<string>('0');
  const [z1, setZ1] = useState<string>('0');
  const [x2, setX2] = useState<string>('6');
  const [y2, setY2] = useState<string>('0');
  const [z2, setZ2] = useState<string>('0');
  const [coordStartSupport, setCoordStartSupport] = useState<SupportPreset | 'None'>('Pinned');
  const [coordEndSupport, setCoordEndSupport] = useState<SupportPreset | 'None'>('RollerX');

  // Connect Nodes
  const existingNodes = structuralBridge.getAllNodes();
  const [nodeA, setNodeA] = useState<string>(existingNodes[0]?.identity.id || '');
  const [nodeB, setNodeB] = useState<string>(existingNodes[1]?.identity.id || '');

  const dispatchCommand = useStore(state => state.dispatchCommand);

  const handleCreateQuickBeam = () => {
    const L = Math.max(0.5, parseFloat(length) || 6.0);

    // 1. Build in 3D Structural Bridge
    const n1 = structuralBridge.addNode(0, 0, 0, undefined, 'Beam-Start');
    const n2 = structuralBridge.addNode(L, 0, 0, undefined, 'Beam-End');

    if (supportCondition === 'simply_supported') {
      structuralBridge.setNodeSupport(n1, 'Pinned');
      structuralBridge.setNodeSupport(n2, 'RollerX');
    } else if (supportCondition === 'fixed_fixed') {
      structuralBridge.setNodeSupport(n1, 'Fixed');
      structuralBridge.setNodeSupport(n2, 'Fixed');
    } else if (supportCondition === 'cantilever') {
      structuralBridge.setNodeSupport(n1, 'Fixed');
    }

    const memberId = structuralBridge.addMember(n1, n2, section, material, 'Beam');

    // 2. Sync 2D Core Engine
    dispatchCommand({
      type: 'UPDATE_SPAN',
      timestamp: Date.now(),
      payload: { newSpan: toLength(L) },
    });

    if (supportCondition === 'simply_supported') {
      const s1 = `s-${Date.now()}-1`;
      const s2 = `s-${Date.now()}-2`;
      dispatchCommand({
        type: 'ADD_SUPPORT',
        timestamp: Date.now(),
        payload: { support: { id: s1, position: toLength(0), type: 'pin' } },
      });
      dispatchCommand({
        type: 'ADD_SUPPORT',
        timestamp: Date.now(),
        payload: { support: { id: s2, position: toLength(L), type: 'roller' } },
      });
    } else if (supportCondition === 'fixed_fixed') {
      const s1 = `s-${Date.now()}-1`;
      const s2 = `s-${Date.now()}-2`;
      dispatchCommand({
        type: 'ADD_SUPPORT',
        timestamp: Date.now(),
        payload: { support: { id: s1, position: toLength(0), type: 'fixed' } },
      });
      dispatchCommand({
        type: 'ADD_SUPPORT',
        timestamp: Date.now(),
        payload: { support: { id: s2, position: toLength(L), type: 'fixed' } },
      });
    } else if (supportCondition === 'cantilever') {
      const s1 = `s-${Date.now()}-1`;
      dispatchCommand({
        type: 'ADD_SUPPORT',
        timestamp: Date.now(),
        payload: { support: { id: s1, position: toLength(0), type: 'fixed' } },
      });
    }

    if (initialLoad === 'point') {
      const lId = `l-${Date.now()}`;
      dispatchCommand({
        type: 'ADD_LOAD',
        timestamp: Date.now(),
        payload: {
          load: { id: lId, type: 'point', position: toLength(L / 2), magnitude: toForce(-50) },
        },
      });
    } else if (initialLoad === 'udl') {
      const lId = `l-${Date.now()}`;
      dispatchCommand({
        type: 'ADD_LOAD',
        timestamp: Date.now(),
        payload: {
          load: {
            id: lId,
            type: 'distributed',
            startPosition: toLength(0),
            endPosition: toLength(L),
            magnitude: toForcePerLength(-15),
          },
        },
      });
    }

    // Select the new member
    workspace.select([memberId]);
    useStore.getState().selectObject(memberId);

    workspace.notifications.notify({
      type: 'success',
      title: 'Beam Added Successfully',
      message: `Created ${L}m ${section} beam with ${supportCondition.replace('_', ' ')}.`,
    });

    onClose();
  };

  const handleCreateCoordBeam = () => {
    const px1 = parseFloat(x1) || 0;
    const py1 = parseFloat(y1) || 0;
    const pz1 = parseFloat(z1) || 0;
    const px2 = parseFloat(x2) || 0;
    const py2 = parseFloat(y2) || 0;
    const pz2 = parseFloat(z2) || 0;

    const n1 = structuralBridge.addNode(px1, py1, pz1, undefined, 'Node-A');
    const n2 = structuralBridge.addNode(px2, py2, pz2, undefined, 'Node-B');

    if (coordStartSupport !== 'None') {
      structuralBridge.setNodeSupport(n1, coordStartSupport);
    }
    if (coordEndSupport !== 'None') {
      structuralBridge.setNodeSupport(n2, coordEndSupport);
    }

    const memberId = structuralBridge.addMember(n1, n2, section, material, 'Beam');

    workspace.select([memberId]);
    useStore.getState().selectObject(memberId);

    workspace.notifications.notify({
      type: 'success',
      title: '3D Beam Created',
      message: `Created 3D member between (${px1},${py1},${pz1}) and (${px2},${py2},${pz2}).`,
    });

    onClose();
  };

  const handleConnectExisting = () => {
    if (!nodeA || !nodeB || nodeA === nodeB) return;
    const memberId = structuralBridge.addMember(nodeA, nodeB, section, material, 'Beam');

    if (memberId) {
      workspace.select([memberId]);
      useStore.getState().selectObject(memberId);
      workspace.notifications.notify({
        type: 'success',
        title: 'Nodes Connected',
        message: `Connected node ${nodeA} to ${nodeB} with ${section}.`,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-lg bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100"
      >
        {/* Header */}
        <div className="h-14 px-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Box className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                Add Structural Beam / Member
                <span className="px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-800 text-[10px] font-mono">
                  B
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">Place beams, boundary supports, and section profiles</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 pt-2 gap-2 text-xs">
          <button
            onClick={() => setTab('quick')}
            className={`pb-2 px-2.5 font-medium border-b-2 transition-all ${
              tab === 'quick'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Quick Beam (1-Click)
          </button>
          <button
            onClick={() => setTab('coords')}
            className={`pb-2 px-2.5 font-medium border-b-2 transition-all ${
              tab === 'coords'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            3D Coordinates
          </button>
          {existingNodes.length >= 2 && (
            <button
              onClick={() => setTab('nodes')}
              className={`pb-2 px-2.5 font-medium border-b-2 transition-all ${
                tab === 'nodes'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Connect Nodes ({existingNodes.length})
            </button>
          )}
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto max-h-[70vh] space-y-4 text-xs custom-scrollbar">
          {tab === 'quick' && (
            <div className="space-y-4">
              {/* Length input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-slate-300 flex items-center justify-between">
                  <span>Beam Span Length</span>
                  <span className="text-[10px] text-slate-500 font-mono">meters</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="50"
                    value={length}
                    onChange={(e) => setLength(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                  <div className="absolute right-3 top-2.5 text-xs text-slate-500 font-mono">m</div>
                </div>
              </div>

              {/* Boundary Condition presets */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-slate-300">Boundary Supports</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'simply_supported', label: 'Simply Supported', desc: 'Pin (0m) + Roller (Lm)' },
                    { id: 'fixed_fixed', label: 'Fixed - Fixed', desc: 'Clamped on both ends' },
                    { id: 'cantilever', label: 'Cantilever', desc: 'Fixed (0m) + Free (Lm)' },
                    { id: 'none', label: 'Continuous / Free', desc: 'Internal member without base' },
                  ].map((cond) => (
                    <button
                      key={cond.id}
                      type="button"
                      onClick={() => setSupportCondition(cond.id as any)}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        supportCondition === cond.id
                          ? 'bg-blue-600/15 border-blue-500 text-white shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-semibold text-xs text-slate-200">{cond.label}</div>
                      <div className="text-[10px] text-slate-500">{cond.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cross-Section Profile */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-slate-300">Cross-Section Profile</label>
                <select
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {SECTION_PROFILES.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.id} — {sec.label} ({sec.depth})
                    </option>
                  ))}
                </select>
              </div>

              {/* Engineering Material */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-slate-300">Engineering Material</label>
                <select
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {MATERIALS.map((m) => (
                    <option key={m.grade} value={m.grade}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Optional Load */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-slate-300">Initial Load (Optional)</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'none', label: 'No Load' },
                    { id: 'point', label: 'Point (-50 kN)' },
                    { id: 'udl', label: 'UDL (-15 kN/m)' },
                  ].map((ld) => (
                    <button
                      key={ld.id}
                      type="button"
                      onClick={() => setInitialLoad(ld.id as any)}
                      className={`py-1.5 px-2 rounded-lg border text-center transition-all ${
                        initialLoad === ld.id
                          ? 'bg-blue-600/15 border-blue-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {ld.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'coords' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <span className="font-semibold text-slate-300 text-[11px] block">Start Point (Node 1)</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">X [m]</label>
                    <input
                      type="number"
                      step="0.5"
                      value={x1}
                      onChange={(e) => setX1(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">Y [m]</label>
                    <input
                      type="number"
                      step="0.5"
                      value={y1}
                      onChange={(e) => setY1(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">Z [m]</label>
                    <input
                      type="number"
                      step="0.5"
                      value={z1}
                      onChange={(e) => setZ1(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                    />
                  </div>
                </div>
                <div className="pt-1">
                  <label className="text-[10px] text-slate-400 block mb-0.5">Support at Start</label>
                  <select
                    value={coordStartSupport}
                    onChange={(e) => setCoordStartSupport(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                  >
                    <option value="None">Free (No support)</option>
                    <option value="Pinned">Pinned Support</option>
                    <option value="Fixed">Fixed Support</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <span className="font-semibold text-slate-300 text-[11px] block">End Point (Node 2)</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">X [m]</label>
                    <input
                      type="number"
                      step="0.5"
                      value={x2}
                      onChange={(e) => setX2(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">Y [m]</label>
                    <input
                      type="number"
                      step="0.5"
                      value={y2}
                      onChange={(e) => setY2(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">Z [m]</label>
                    <input
                      type="number"
                      step="0.5"
                      value={z2}
                      onChange={(e) => setZ2(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                    />
                  </div>
                </div>
                <div className="pt-1">
                  <label className="text-[10px] text-slate-400 block mb-0.5">Support at End</label>
                  <select
                    value={coordEndSupport}
                    onChange={(e) => setCoordEndSupport(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                  >
                    <option value="None">Free (No support)</option>
                    <option value="RollerX">RollerX Support</option>
                    <option value="Pinned">Pinned Support</option>
                    <option value="Fixed">Fixed Support</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-slate-300">Cross-Section Profile</label>
                <select
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-white"
                >
                  {SECTION_PROFILES.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.id} — {sec.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {tab === 'nodes' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-300">From Node</label>
                  <select
                    value={nodeA}
                    onChange={(e) => setNodeA(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                  >
                    {existingNodes.map((n) => (
                      <option key={n.identity.id} value={n.identity.id}>
                        {n.identity.id} ({n.x}, {n.y}, {n.z})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-300">To Node</label>
                  <select
                    value={nodeB}
                    onChange={(e) => setNodeB(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                  >
                    {existingNodes.map((n) => (
                      <option key={n.identity.id} value={n.identity.id}>
                        {n.identity.id} ({n.x}, {n.y}, {n.z})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-slate-300">Cross-Section Profile</label>
                <select
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-white"
                >
                  {SECTION_PROFILES.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.id} — {sec.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="h-16 px-5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-xs font-medium"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={
              tab === 'quick'
                ? handleCreateQuickBeam
                : tab === 'coords'
                ? handleCreateCoordBeam
                : handleConnectExisting
            }
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>
              {tab === 'quick'
                ? 'Place Beam in Model'
                : tab === 'coords'
                ? 'Create 3D Beam'
                : 'Connect Nodes with Beam'}
            </span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
