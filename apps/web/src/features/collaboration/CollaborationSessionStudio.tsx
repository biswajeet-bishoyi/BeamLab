import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  GitBranch,
  GitCommit,
  GitMerge,
  Layers,
  Activity,
  Maximize2,
  Minimize2,
  X,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Compass,
  Radio,
  ArrowRight,
  Shield,
  Plus,
  RefreshCw,
  Sparkles,
  ChevronRight,
  Copy,
  Check,
  Send,
  Lock,
} from 'lucide-react';

import {
  ModelBranchManager,
  StructuralModelDiffer,
  Visual3DDiffMap,
  ModelMergeResolver,
  calculateTotalMassKg,
  type EngineeringModelSnapshot,
  type EngineeringCommit,
  type MergeConflict,
  type ConflictResolutionChoice,
  type VisualEntityDiff,
  type DiffLegendItem,
} from '@beamstudio/collaboration-engine';

interface CollaborationSessionStudioProps {
  onClose: () => void;
}

// ─── Initial Collaborative Snapshots ──────────────────────────────────────────

const BASE_SNAPSHOT: EngineeringModelSnapshot = {
  schemaVersion: '1.0',
  modelId: 'portal_frame_baseline',
  title: 'Portal Frame Baseline',
  nodes: {
    N1: { id: 'N1', coords: { x: 0, y: 0, z: 0 }, restraint: { fx: true, fy: true, fz: true, mx: true, my: true, mz: true } },
    N2: { id: 'N2', coords: { x: 6, y: 0, z: 0 }, restraint: { fx: false, fy: true, fz: true, mx: true, my: true, mz: true } },
    N3: { id: 'N3', coords: { x: 12, y: 0, z: 0 }, restraint: { fx: false, fy: true, fz: true, mx: true, my: true, mz: true } },
    N4: { id: 'N4', coords: { x: 6, y: 0, z: 4 } },
  },
  members: {
    M1: { id: 'M1', startNodeId: 'N1', endNodeId: 'N4', sectionId: 'IPE300', materialId: 'STEEL_S355' },
    M2: { id: 'M2', startNodeId: 'N4', endNodeId: 'N3', sectionId: 'IPE300', materialId: 'STEEL_S355' },
    M3: { id: 'M3', startNodeId: 'N2', endNodeId: 'N4', sectionId: 'HEB200', materialId: 'STEEL_S355' },
  },
  sections: {
    IPE300: { id: 'IPE300', name: 'IPE 300', areaM2: 0.00538, IyyM4: 8.356e-5, IzzM4: 6.038e-6, materialId: 'STEEL_S355', weightPerM: 42.2 },
    HEB200: { id: 'HEB200', name: 'HEB 200', areaM2: 0.00781, IyyM4: 5.696e-5, IzzM4: 2.003e-5, materialId: 'STEEL_S355', weightPerM: 61.3 },
    HEB300: { id: 'HEB300', name: 'HEB 300', areaM2: 0.01491, IyyM4: 2.517e-4, IzzM4: 8.563e-5, materialId: 'STEEL_S355', weightPerM: 117.0 },
  },
  materials: {
    STEEL_S355: { id: 'STEEL_S355', name: 'Structural Steel S355', elasticModulusN_M2: 210e9, densityKg_M3: 7850 },
  },
  loads: {
    L1: { id: 'L1', type: 'nodal_force', nodeId: 'N4', magnitude: -75000, direction: 'Z' },
  },
};

// Branch "ours" (e.g. main updated with roof crown truss)
const OURS_SNAPSHOT: EngineeringModelSnapshot = {
  ...BASE_SNAPSHOT,
  nodes: {
    ...BASE_SNAPSHOT.nodes,
    N5: { id: 'N5', coords: { x: 6, y: 0, z: 6.5 } },
  },
  members: {
    ...BASE_SNAPSHOT.members,
    M4: { id: 'M4', startNodeId: 'N4', endNodeId: 'N5', sectionId: 'HEB200', materialId: 'STEEL_S355' },
  },
  loads: {
    ...BASE_SNAPSHOT.loads,
    L1: { id: 'L1', type: 'nodal_force', nodeId: 'N4', magnitude: -95000, direction: 'Z' },
  },
};

// Branch "theirs" (e.g. seismic optimization with upgraded section and shifted apex)
const THEIRS_SNAPSHOT: EngineeringModelSnapshot = {
  ...BASE_SNAPSHOT,
  nodes: {
    ...BASE_SNAPSHOT.nodes,
    N4: { id: 'N4', coords: { x: 6, y: 0, z: 4.8 } }, // Raised apex
  },
  members: {
    ...BASE_SNAPSHOT.members,
    M1: { id: 'M1', startNodeId: 'N1', endNodeId: 'N4', sectionId: 'HEB300', materialId: 'STEEL_S355' }, // Upgraded section
    M2: { id: 'M2', startNodeId: 'N4', endNodeId: 'N3', sectionId: 'HEB300', materialId: 'STEEL_S355' },
  },
};

// ─── Peers Mock Data ─────────────────────────────────────────────────────────

interface ActivePeer {
  id: string;
  name: string;
  role: 'Lead Structural' | 'BIM Modeler' | 'Senior Checker' | 'FEA Specialist';
  status: 'active' | 'idle';
  color: string;
  coords: { x: number; y: number; z: number };
  selection: string;
  pingMs: number;
}

const INITIAL_PEERS: ActivePeer[] = [
  {
    id: 'peer-1',
    name: 'Elena Rostova (You)',
    role: 'Lead Structural',
    status: 'active',
    color: '#10B981',
    coords: { x: 6.0, y: 0.0, z: 4.0 },
    selection: 'Node N4',
    pingMs: 14,
  },
  {
    id: 'peer-2',
    name: 'Marcus Vance',
    role: 'BIM Modeler',
    status: 'active',
    color: '#3B82F6',
    coords: { x: 12.0, y: 0.0, z: 0.0 },
    selection: 'Member M2',
    pingMs: 22,
  },
  {
    id: 'peer-3',
    name: 'Dr. Hiroshi Tanaka',
    role: 'Senior Checker',
    status: 'idle',
    color: '#F59E0B',
    coords: { x: 0.0, y: 0.0, z: 0.0 },
    selection: 'Support N1',
    pingMs: 41,
  },
];

export const CollaborationSessionStudio: React.FC<CollaborationSessionStudioProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'presence' | 'history' | 'diff' | 'merge'>('presence');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Presence State
  const [peers, setPeers] = useState<ActivePeer[]>(INITIAL_PEERS);
  const [showPeerCursors, setShowPeerCursors] = useState(true);
  const [showFrustums, setShowFrustums] = useState(true);
  const [showLaserTrails, setShowLaserTrails] = useState(true);
  const [followingPeerId, setFollowingPeerId] = useState<string | null>(null);

  // Chat/Annotations State
  const [chatMessages, setChatMessages] = useState<{ id: string; sender: string; color: string; text: string; time: string; pin?: string }[]>([
    { id: '1', sender: 'Marcus Vance', color: '#3B82F6', text: 'Checked apex node N4 deflections under dead load. Margin is 18%.', time: '12:04 PM', pin: 'Node N4' },
    { id: '2', sender: 'Dr. Hiroshi Tanaka', color: '#F59E0B', text: 'Consider upgrading portal rafters to HEB300 to satisfy Eurocode 3 L/250 limit.', time: '12:08 PM', pin: 'Member M1' },
  ]);
  const [chatInput, setChatInput] = useState('');

  // Version Control & Branch State
  const [branchManager] = useState(() => {
    const bm = new ModelBranchManager(BASE_SNAPSHOT, { id: 'elena-1', name: 'Elena Rostova', email: 'elena@beamlab.io' });
    const rootCommitId = bm.getHeadCommit().commitId;

    bm.createBranch('opt/heavier-flanges', rootCommitId);
    bm.checkout('opt/heavier-flanges');
    bm.commit('Upgrade rafters to HEB300 and raise apex to 4.8m', THEIRS_SNAPSHOT, {
      id: 'marcus-2',
      name: 'Marcus Vance',
    });

    bm.checkout('main');
    const mainCommit = bm.commit('Add vertical crown strut M4 and increase point load to 95kN', OURS_SNAPSHOT, {
      id: 'elena-1',
      name: 'Elena Rostova',
    });
    bm.createTag('Rev-B-Internal-Review', mainCommit.commitId);

    return bm;
  });

  const [activeBranch, setActiveBranch] = useState('main');
  const [allBranches, setAllBranches] = useState<string[]>([]);
  const [commits, setCommits] = useState<EngineeringCommit[]>([]);
  const [newBranchName, setNewBranchName] = useState('');
  const [showNewBranchModal, setShowNewBranchModal] = useState(false);
  const [selectedTagCommit, setSelectedTagCommit] = useState<string | null>(null);
  const [tagNameInput, setTagNameInput] = useState('Rev-C-Client-Submission');

  // Diff State
  const [diffBaseCommitId, setDiffBaseCommitId] = useState<string>('');
  const [diffTargetCommitId, setDiffTargetCommitId] = useState<string>('');
  const [, setSelectedDiffElementId] = useState<string | null>(null);

  // Merge State
  const [mergeSourceBranch, setMergeSourceBranch] = useState('opt/heavier-flanges');
  const [mergeConflicts, setMergeConflicts] = useState<MergeConflict[]>([]);
  const [conflictResolutions, setConflictResolutions] = useState<Record<string, ConflictResolutionChoice>>({});
  const [mergeCompleted, setMergeCompleted] = useState(false);
  const [mergeNotice, setMergeNotice] = useState<string | null>(null);

  // Refresh branch and commit lists
  const refreshBranchData = () => {
    const bList = branchManager.listBranches().map(b => b.name);
    setAllBranches(bList);
    const history = branchManager.getHistory(activeBranch);
    setCommits(history);
    if (history.length >= 2) {
      setDiffBaseCommitId(history[history.length - 1].commitId);
      setDiffTargetCommitId(history[0].commitId);
    } else if (history.length === 1) {
      setDiffBaseCommitId(history[0].commitId);
      setDiffTargetCommitId(history[0].commitId);
    }
  };

  useEffect(() => {
    refreshBranchData();
  }, [activeBranch]);

  // Periodic simulated peer movement to show real-time live telemetry
  useEffect(() => {
    const interval = setInterval(() => {
      setPeers(prev => prev.map(p => {
        if (p.id === 'peer-1') return p; // Keep local peer stable
        const dx = (Math.random() - 0.5) * 0.4;
        const dz = (Math.random() - 0.5) * 0.3;
        return {
          ...p,
          coords: {
            x: Math.max(0, Math.min(12, Number((p.coords.x + dx).toFixed(2)))),
            y: 0,
            z: Math.max(0, Math.min(6, Number((p.coords.z + dz).toFixed(2)))),
          },
          pingMs: Math.floor(18 + Math.random() * 12),
        };
      }));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Compute Diff results
  const diffResult = useMemo(() => {
    if (!diffBaseCommitId || !diffTargetCommitId) return null;
    const baseCommit = branchManager.getCommit(diffBaseCommitId);
    const targetCommit = branchManager.getCommit(diffTargetCommitId);
    if (!baseCommit || !targetCommit) return null;

    const report = StructuralModelDiffer.diff(baseCommit.snapshot, targetCommit.snapshot, {
      baseCommitId: diffBaseCommitId,
      targetCommitId: diffTargetCommitId,
    });
    const differMap = new Visual3DDiffMap();
    const entityMap = differMap.generateMap(report, baseCommit.snapshot, targetCommit.snapshot);
    const legend = differMap.generateLegend(report);

    const directives: VisualEntityDiff[] = Array.from(entityMap.values());
    return { report, legend, directives };
  }, [diffBaseCommitId, diffTargetCommitId, branchManager]);

  // Handle Branch Switch
  const handleSwitchBranch = (bName: string) => {
    branchManager.checkout(bName);
    setActiveBranch(bName);
  };

  // Handle Create Branch
  const handleCreateBranch = () => {
    if (!newBranchName.trim()) return;
    const cleanName = newBranchName.trim().replace(/\s+/g, '-');
    const head = branchManager.getHeadCommit();
    branchManager.createBranch(cleanName, head.commitId);
    setShowNewBranchModal(false);
    setNewBranchName('');
    handleSwitchBranch(cleanName);
  };

  // Handle Milestone Tagging
  const handleAddMilestone = () => {
    if (!selectedTagCommit || !tagNameInput.trim()) return;
    branchManager.createTag(tagNameInput.trim(), selectedTagCommit);
    setSelectedTagCommit(null);
    setTagNameInput('Rev-C-Client-Submission');
    refreshBranchData();
  };

  // Analyze Merge between activeBranch and mergeSourceBranch
  const handleCheckMerge = () => {
    const result = ModelMergeResolver.merge(branchManager, mergeSourceBranch, activeBranch, {
      strategy: 'manual',
      autoCommit: false,
    });

    setMergeConflicts(result.conflicts);
    const initialResolutions: Record<string, ConflictResolutionChoice> = {};
    result.conflicts.forEach(c => {
      initialResolutions[c.entityId] = 'ours';
    });
    setConflictResolutions(initialResolutions);
    setMergeNotice(
      result.conflicts.length === 0
        ? 'Clean merge: No conflicting entity modifications detected.'
        : `${result.conflicts.length} conflict(s) require engineering resolution.`
    );
  };

  // Apply Merge Commit
  const handleExecuteMerge = () => {
    const result = ModelMergeResolver.merge(branchManager, mergeSourceBranch, activeBranch, {
      strategy: 'manual',
      customResolutions: conflictResolutions,
      autoCommit: true,
      commitMessage: `Merge branch '${mergeSourceBranch}' into '${activeBranch}' with topological orphan validation`,
      author: { id: 'elena-1', name: 'Elena Rostova' },
    });

    if (result.success) {
      setMergeCompleted(true);
      setMergeNotice(`Successfully merged '${mergeSourceBranch}' into '${activeBranch}'! Merged ${result.summary.mergedMembersCount} members and ${result.summary.mergedNodesCount} nodes.`);
      refreshBranchData();
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setChatMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: 'Elena Rostova',
        color: '#10B981',
        text: chatInput.trim(),
        time: 'Just now',
      },
    ]);
    setChatInput('');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText('https://beamlab.app/session/BL-PORTAL-FRAME-492');
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        className={`relative flex flex-col bg-slate-950/95 border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-2xl transition-all duration-300 ${
          isFullscreen ? 'w-full h-full' : 'w-full max-w-6xl h-[90vh]'
        }`}
      >
        {/* Top Header */}
        <header className="h-16 px-6 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-950">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Collaborative Engineering Session Studio
                </h2>
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync Active
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <span>Room: <span className="font-mono text-emerald-300 font-semibold">BL-PORTAL-FRAME-492</span></span>
                <span>•</span>
                <span>CRDT Replication: <span className="text-slate-300 font-mono">v.482 ops synced</span></span>
                <span>•</span>
                <span>Latency: <span className="text-emerald-400 font-mono">14ms</span></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              {copiedLink ? 'Link Copied' : 'Share Session'}
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800/80 bg-slate-900/30 px-6 gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('presence')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'presence'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Users size={15} />
            <span>Peers & Presence</span>
            <span className="px-1.5 py-0.2 text-[10px] bg-slate-800 text-emerald-300 rounded-full font-mono">
              {peers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'history'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <GitBranch size={15} />
            <span>Branches & History</span>
            <span className="px-1.5 py-0.2 text-[10px] bg-slate-800 text-cyan-300 rounded-full font-mono">
              {commits.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('diff')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'diff'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Layers size={15} />
            <span>3D Model Diff</span>
            {diffResult && (
              <span className="px-1.5 py-0.2 text-[10px] bg-slate-800 text-amber-300 rounded-full font-mono">
                {diffResult.directives.filter(d => d.classification !== 'unchanged').length} Δ
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('merge')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'merge'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <GitMerge size={15} />
            <span>Merge & Conflicts</span>
            {mergeConflicts.length > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] bg-rose-950 text-rose-400 rounded-full font-mono border border-rose-500/30">
                {mergeConflicts.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content Panels */}
        <div className="flex-1 overflow-hidden flex flex-col bg-slate-950/50">
          {/* TAB 1: PEERS & PRESENCE */}
          {activeTab === 'presence' && (
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Active Peer Roster & 3D Spatial Telemetry */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                {/* 3D Presence Controls Bar */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                    <Compass className="w-4 h-4 text-emerald-400" />
                    <span>3D Spatial Telemetry:</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                      <input
                        type="checkbox"
                        checked={showPeerCursors}
                        onChange={e => setShowPeerCursors(e.target.checked)}
                        className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                      />
                      <span>Peer 3D Cursors</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                      <input
                        type="checkbox"
                        checked={showFrustums}
                        onChange={e => setShowFrustums(e.target.checked)}
                        className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                      />
                      <span>Camera Frustums</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                      <input
                        type="checkbox"
                        checked={showLaserTrails}
                        onChange={e => setShowLaserTrails(e.target.checked)}
                        className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                      />
                      <span>Laser Trails</span>
                    </label>
                  </div>
                </div>

                {/* Peer Roster Cards */}
                <div className="flex flex-col gap-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Active Engineers in Session ({peers.length})
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {peers.map(peer => {
                      const isFollowing = followingPeerId === peer.id;
                      return (
                        <div
                          key={peer.id}
                          className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/70 hover:border-slate-700 transition-all flex flex-col justify-between gap-3"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-slate-900 text-xs shadow-md"
                                style={{ backgroundColor: peer.color }}
                              >
                                {peer.name.charAt(0)}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <h4 className="text-sm font-bold text-white">{peer.name}</h4>
                                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                </div>
                                <span className="text-xs text-slate-400">{peer.role}</span>
                              </div>
                            </div>
                            <span className="text-[11px] font-mono text-slate-500">
                              {peer.pingMs}ms
                            </span>
                          </div>

                          <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 text-slate-400">
                              <Radio size={13} className="text-emerald-400" />
                              <span className="font-mono">
                                ({peer.coords.x}, {peer.coords.y}, {peer.coords.z})m
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-medium">
                                {peer.selection}
                              </span>
                              {peer.id !== 'peer-1' && (
                                <button
                                  onClick={() => setFollowingPeerId(isFollowing ? null : peer.id)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors flex items-center gap-1 ${
                                    isFollowing
                                      ? 'bg-emerald-500 text-slate-900'
                                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                                  }`}
                                >
                                  <Eye size={11} />
                                  {isFollowing ? 'Following' : 'Follow'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Collaborative Model Locking Status */}
                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <Lock size={14} className="text-cyan-400" />
                      <span>Element Edit Locks & Concurrency</span>
                    </h3>
                    <span className="text-xs text-slate-500">CRDT Granular Multi-Writer Enabled</span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-300 font-mono font-medium">Apex Node N4</span>
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Elena
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-300 font-mono font-medium">Rafter Member M2</span>
                      <span className="text-blue-400 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> Marcus
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-300 font-mono font-medium">Support Node N1</span>
                      <span className="text-amber-400 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Hiroshi
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Col: Live Session Chat & Engineering Annotations */}
              <div className="flex flex-col bg-slate-900/60 border border-slate-800/80 rounded-xl overflow-hidden h-[540px]">
                <div className="p-3.5 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity size={15} className="text-emerald-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Session Annotations
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">Encrypted Team Channel</span>
                </div>

                <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
                  {chatMessages.map(msg => (
                    <div key={msg.id} className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold" style={{ color: msg.color }}>
                          {msg.sender}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">{msg.time}</span>
                      </div>
                      <p className="text-slate-200 leading-relaxed">{msg.text}</p>
                      {msg.pin && (
                        <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-[10px] text-cyan-300 font-mono border border-cyan-500/20">
                          <Radio size={10} /> Pinned: {msg.pin}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendChat} className="p-3 border-t border-slate-800 bg-slate-900/80 flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="Comment on model or element..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                  >
                    <Send size={13} />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: BRANCHES & HISTORY */}
          {activeTab === 'history' && (
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              {/* Branch Selector & Controls */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                    <GitBranch className="w-4 h-4 text-cyan-400" />
                    <span>Active Branch:</span>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                    {allBranches.map(b => (
                      <button
                        key={b}
                        onClick={() => handleSwitchBranch(b)}
                        className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                          activeBranch === b
                            ? 'bg-cyan-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowNewBranchModal(true)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Plus size={14} /> New Branch
                  </button>
                </div>
              </div>

              {/* Commit Timeline Tree */}
              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Engineering Commit History ({commits.length})
                </h3>

                <div className="space-y-3">
                  {commits.map((commit, idx) => {
                    const massKg = calculateTotalMassKg(commit.snapshot);
                    const isLatest = idx === 0;
                    return (
                      <div
                        key={commit.commitId}
                        className={`p-4 rounded-xl border transition-all ${
                          isLatest
                            ? 'bg-slate-900/70 border-cyan-500/40 shadow-lg shadow-cyan-950/20'
                            : 'bg-slate-900/40 border-slate-800/80'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 p-2 rounded-lg bg-slate-800 border border-slate-700 text-cyan-400">
                              <GitCommit size={16} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-white">{commit.message}</h4>
                                {isLatest && (
                                  <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold border border-cyan-500/30">
                                    HEAD
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                                <span>Author: <strong className="text-slate-200">{commit.author.name}</strong></span>
                                <span>•</span>
                                <span className="font-mono text-slate-400">{new Date(commit.timestamp).toLocaleTimeString()}</span>
                                <span>•</span>
                                <span className="font-mono text-cyan-300 font-semibold">{commit.commitId.slice(0, 8)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-emerald-400 font-semibold">
                                {massKg.toFixed(1)} kg steel
                              </span>
                              <button
                                onClick={() => setSelectedTagCommit(commit.commitId)}
                                className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1"
                              >
                                <Shield size={12} className="text-amber-400" /> Tag
                              </button>
                            </div>

                            {/* Milestone Tag Badges */}
                            {commit.tags && commit.tags.length > 0 && (
                              <div className="flex items-center gap-1 mt-1">
                                {commit.tags.map((tag: string) => (
                                  <span
                                    key={tag}
                                    className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1"
                                  >
                                    <Sparkles size={10} /> {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: 3D MODEL DIFF */}
          {activeTab === 'diff' && (
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              {/* Diff Comparator Controls */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Base Model Commit:
                  </label>
                  <select
                    value={diffBaseCommitId}
                    onChange={e => setDiffBaseCommitId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  >
                    {commits.map(c => (
                      <option key={c.commitId} value={c.commitId}>
                        {c.commitId.slice(0, 8)} - {c.message} ({c.author.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Target Model Commit:
                  </label>
                  <select
                    value={diffTargetCommitId}
                    onChange={e => setDiffTargetCommitId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  >
                    {commits.map(c => (
                      <option key={c.commitId} value={c.commitId}>
                        {c.commitId.slice(0, 8)} - {c.message} ({c.author.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {diffResult && (
                <>
                  {/* Physical Quantities & Summary Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-col">
                      <span className="text-[11px] font-bold text-slate-400 uppercase">Steel Mass Shift</span>
                      <span
                        className={`text-xl font-bold font-mono mt-1 ${
                          diffResult.report.summary.deltaSteelMassKg >= 0 ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {diffResult.report.summary.deltaSteelMassKg >= 0 ? '+' : ''}
                        {diffResult.report.summary.deltaSteelMassKg.toFixed(1)} kg
                      </span>
                      <span className="text-xs text-slate-500 font-mono mt-0.5">
                        {diffResult.report.summary.deltaSteelMassPercent >= 0 ? '+' : ''}
                        {diffResult.report.summary.deltaSteelMassPercent.toFixed(1)}% total
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-col">
                      <span className="text-[11px] font-bold text-slate-400 uppercase">Added Entities</span>
                      <span className="text-xl font-bold font-mono mt-1 text-emerald-400">
                        +{diffResult.report.summary.membersAdded + diffResult.report.summary.nodesAdded + diffResult.report.summary.loadsAdded}
                      </span>
                      <span className="text-xs text-slate-500 mt-0.5">Structural components</span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-col">
                      <span className="text-[11px] font-bold text-slate-400 uppercase">Modified Geometry</span>
                      <span className="text-xl font-bold font-mono mt-1 text-amber-400">
                        {diffResult.report.summary.nodesModified}
                      </span>
                      <span className="text-xs text-slate-500 mt-0.5">Displaced nodes / spans</span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-col">
                      <span className="text-[11px] font-bold text-slate-400 uppercase">Modified Sections/Loads</span>
                      <span className="text-xl font-bold font-mono mt-1 text-violet-400">
                        {diffResult.report.summary.membersModified + diffResult.report.summary.loadsModified}
                      </span>
                      <span className="text-xs text-slate-500 mt-0.5">Profiles & forces</span>
                    </div>
                  </div>

                  {/* 3D Visual Color Legend Bar */}
                  <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      3D Viewport CAD Legend:
                    </span>
                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      {diffResult.legend.map((item: DiffLegendItem) => (
                        <div key={item.classification} className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.colorHex }} />
                          <span className="text-slate-300">{item.label} ({item.count})</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Detailed Differences Table */}
                  <div className="flex flex-col gap-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Detected Structural Delta Directives ({diffResult.directives.length})
                    </h3>

                    <div className="divide-y divide-slate-800/80 border border-slate-800/80 rounded-xl overflow-hidden bg-slate-900/30">
                      {diffResult.directives.map((dir: VisualEntityDiff) => (
                        <div
                          key={dir.entityId}
                          onClick={() => setSelectedDiffElementId(dir.entityId)}
                          className="p-3.5 hover:bg-slate-800/40 cursor-pointer flex items-center justify-between text-xs transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: dir.colorHex }}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-white">{dir.entityId}</span>
                                <span className="text-slate-400 font-medium">({dir.entityType})</span>
                                <span
                                  className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase"
                                  style={{ color: dir.colorHex, backgroundColor: `${dir.colorHex}15` }}
                                >
                                  {dir.classification}
                                </span>
                              </div>
                              <p className="text-slate-300 text-xs mt-0.5">{dir.tooltip}</p>
                            </div>
                          </div>

                          <ChevronRight size={16} className="text-slate-500" />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 4: MERGE & CONFLICTS */}
          {activeTab === 'merge' && (
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              {/* Merge Branch Header */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-bold text-slate-300">Merge Target:</span>
                  <span className="px-2.5 py-1 rounded bg-slate-950 text-cyan-300 font-mono font-bold border border-slate-800">
                    {activeBranch}
                  </span>
                  <ArrowRight size={14} className="text-slate-500" />
                  <span className="font-bold text-slate-300">Source Branch:</span>
                  <select
                    value={mergeSourceBranch}
                    onChange={e => setMergeSourceBranch(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                  >
                    {allBranches.filter(b => b !== activeBranch).map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCheckMerge}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw size={14} /> Analyze Conflicts
                  </button>
                  <button
                    onClick={handleExecuteMerge}
                    disabled={mergeCompleted}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm ${
                      mergeCompleted
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    <GitMerge size={14} /> {mergeCompleted ? 'Merged' : 'Resolve & Commit Merge'}
                  </button>
                </div>
              </div>

              {/* Merge Status Notice */}
              {mergeNotice && (
                <div
                  className={`p-4 rounded-xl border flex items-center gap-3 text-xs font-medium ${
                    mergeConflicts.length === 0
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  }`}
                >
                  {mergeConflicts.length === 0 ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                  <span>{mergeNotice}</span>
                </div>
              )}

              {/* Conflict Resolution Cards */}
              {mergeConflicts.length > 0 && (
                <div className="flex flex-col gap-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Conflicting Structural Changes ({mergeConflicts.length})
                  </h3>

                  <div className="space-y-4">
                    {mergeConflicts.map(conflict => {
                      const currentChoice = conflictResolutions[conflict.entityId] || 'ours';
                      return (
                        <div
                          key={conflict.conflictId}
                          className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/90 flex flex-col gap-3"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-white text-sm">
                                  {conflict.entityId}
                                </span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                  {conflict.conflictType.replace(/_/g, ' ')}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 mt-0.5">{conflict.description}</p>
                            </div>

                            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
                              <button
                                onClick={() => setConflictResolutions(prev => ({ ...prev, [conflict.entityId]: 'ours' }))}
                                className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                                  currentChoice === 'ours'
                                    ? 'bg-emerald-600 text-white'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                              >
                                Keep Ours ({activeBranch})
                              </button>
                              <button
                                onClick={() => setConflictResolutions(prev => ({ ...prev, [conflict.entityId]: 'theirs' }))}
                                className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                                  currentChoice === 'theirs'
                                    ? 'bg-cyan-600 text-white'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                              >
                                Take Theirs ({mergeSourceBranch})
                              </button>
                            </div>
                          </div>

                          {/* 3-Way Values Matrix */}
                          <div className="grid grid-cols-3 gap-3 text-xs bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                            <div>
                              <span className="text-[10px] font-bold text-slate-500 uppercase">Ancestor</span>
                              <pre className="mt-1 font-mono text-[11px] text-slate-400 overflow-x-auto">
                                {JSON.stringify(conflict.ancestorValue, null, 2)}
                              </pre>
                            </div>
                            <div className={currentChoice === 'ours' ? 'border-l-2 border-emerald-500 pl-2' : ''}>
                              <span className="text-[10px] font-bold text-emerald-400 uppercase">
                                Ours ({activeBranch})
                              </span>
                              <pre className="mt-1 font-mono text-[11px] text-emerald-200 overflow-x-auto">
                                {JSON.stringify(conflict.oursValue, null, 2)}
                              </pre>
                            </div>
                            <div className={currentChoice === 'theirs' ? 'border-l-2 border-cyan-500 pl-2' : ''}>
                              <span className="text-[10px] font-bold text-cyan-400 uppercase">
                                Theirs ({mergeSourceBranch})
                              </span>
                              <pre className="mt-1 font-mono text-[11px] text-cyan-200 overflow-x-auto">
                                {JSON.stringify(conflict.theirsValue, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal: Create New Branch */}
        <AnimatePresence>
          {showNewBranchModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col gap-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <GitBranch className="text-emerald-400" size={16} /> Create Engineering Branch
                  </h3>
                  <button onClick={() => setShowNewBranchModal(false)} className="text-slate-400 hover:text-white">
                    <X size={16} />
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-300">Branch Identifier</label>
                  <input
                    type="text"
                    value={newBranchName}
                    onChange={e => setNewBranchName(e.target.value)}
                    placeholder="e.g. seismic-retrofit or opt/tapered-girders"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-500">
                    Branches create an isolated copy of the structural model graph for non-destructive design iterations.
                  </p>
                </div>

                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => setShowNewBranchModal(false)}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateBranch}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm"
                  >
                    Create Branch
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal: Tag Milestone */}
        <AnimatePresence>
          {selectedTagCommit && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col gap-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Shield className="text-amber-400" size={16} /> Tag Milestone Sign-Off
                  </h3>
                  <button onClick={() => setSelectedTagCommit(null)} className="text-slate-400 hover:text-white">
                    <X size={16} />
                  </button>
                </div>

                <div className="flex flex-col gap-3 text-xs">
                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">Tag Name / Identifier</label>
                    <input
                      type="text"
                      value={tagNameInput}
                      onChange={e => setTagNameInput(e.target.value)}
                      placeholder="e.g. IFC-Issued-For-Construction"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => setSelectedTagCommit(null)}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddMilestone}
                    className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-sm"
                  >
                    Apply Milestone Tag
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
