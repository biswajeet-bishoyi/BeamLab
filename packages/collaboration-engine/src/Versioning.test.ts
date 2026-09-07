import { describe, it, expect, beforeEach } from 'vitest';
import {
  createEmptySnapshot,
  cloneSnapshot,
  calculateMemberLengthM,
  calculateTotalMassKg,
  computeSnapshotHash,
  EngineeringModelSnapshot,
} from '../src/versioning/ModelSnapshot';
import {
  ModelBranchManager,
  EngineeringCommit,
} from '../src/versioning/ModelBranchManager';
import {
  StructuralModelDiffer,
  StructuralDiffReport,
} from '../src/versioning/StructuralModelDiffer';
import {
  Visual3DDiffMap,
  DEFAULT_DIFF_PALETTE,
} from '../src/versioning/Visual3DDiffMap';
import {
  ModelMergeResolver,
} from '../src/versioning/ModelMergeResolver';

describe('Phase B7.3: Structural Engineering Version Control', () => {
  let baseSnapshot: EngineeringModelSnapshot;

  beforeEach(() => {
    baseSnapshot = createEmptySnapshot('test_portal_frame', 'Single Bay Portal Frame');

    // Setup materials & sections
    baseSnapshot.materials['S355'] = {
      id: 'S355',
      name: 'Structural Steel S355',
      elasticModulusN_M2: 2.1e11,
      yieldStrengthN_M2: 355e6,
      densityKg_M3: 7850,
      type: 'steel',
    };

    baseSnapshot.sections['HEB300'] = {
      id: 'HEB300',
      name: 'HEB 300',
      areaM2: 0.0149,
      weightPerM: 117,
      materialId: 'S355',
    };

    baseSnapshot.sections['IPE360'] = {
      id: 'IPE360',
      name: 'IPE 360',
      areaM2: 0.00727,
      weightPerM: 57.1,
      materialId: 'S355',
    };

    // 4 nodes: 2 base pins (N1, N2 at Z=0), 2 eaves (N3, N4 at Z=4m)
    baseSnapshot.nodes['N1'] = { id: 'N1', coords: { x: 0, y: 0, z: 0 }, restraint: { fx: true, fy: true, fz: true, mx: false, my: false, mz: false } };
    baseSnapshot.nodes['N2'] = { id: 'N2', coords: { x: 6, y: 0, z: 0 }, restraint: { fx: true, fy: true, fz: true, mx: false, my: false, mz: false } };
    baseSnapshot.nodes['N3'] = { id: 'N3', coords: { x: 0, y: 0, z: 4 } };
    baseSnapshot.nodes['N4'] = { id: 'N4', coords: { x: 6, y: 0, z: 4 } };

    // 3 members: 2 columns (M1: N1-N3, M2: N2-N4), 1 rafter (M3: N3-N4)
    baseSnapshot.members['M1'] = { id: 'M1', startNodeId: 'N1', endNodeId: 'N3', sectionId: 'HEB300', type: 'column' };
    baseSnapshot.members['M2'] = { id: 'M2', startNodeId: 'N2', endNodeId: 'N4', sectionId: 'HEB300', type: 'column' };
    baseSnapshot.members['M3'] = { id: 'M3', startNodeId: 'N3', endNodeId: 'N4', sectionId: 'IPE360', type: 'beam' };

    // 1 UDL load on rafter M3
    baseSnapshot.loads['L1'] = {
      id: 'L1',
      type: 'member_udl',
      memberId: 'M3',
      magnitude: -15000,
      direction: 'Z',
      loadCaseId: 'DL',
    };
  });

  // ─── 1. ModelSnapshot & Physical Metrics ─────────────────────────────────────

  describe('ModelSnapshot Utilities', () => {
    it('calculates member length correctly', () => {
      const lenCol = calculateMemberLengthM(baseSnapshot.members['M1'], baseSnapshot.nodes);
      expect(lenCol).toBeCloseTo(4.0);

      const lenBeam = calculateMemberLengthM(baseSnapshot.members['M3'], baseSnapshot.nodes);
      expect(lenBeam).toBeCloseTo(6.0);
    });

    it('calculates total steel mass accurately from section weightPerM', () => {
      // M1: 4m * 117 kg/m = 468 kg
      // M2: 4m * 117 kg/m = 468 kg
      // M3: 6m * 57.1 kg/m = 342.6 kg
      // Total = 468 + 468 + 342.6 = 1278.6 kg
      const mass = calculateTotalMassKg(baseSnapshot);
      expect(mass).toBeCloseTo(1278.6, 1);
    });

    it('generates consistent pseudo-hash signature', () => {
      const hash1 = computeSnapshotHash(baseSnapshot);
      const hash2 = computeSnapshotHash(cloneSnapshot(baseSnapshot));
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBeGreaterThan(0);
    });
  });

  // ─── 2. ModelBranchManager ──────────────────────────────────────────────────

  describe('ModelBranchManager', () => {
    let mgr: ModelBranchManager;

    beforeEach(() => {
      mgr = new ModelBranchManager(baseSnapshot, { id: 'eng-1', name: 'Lead Designer' });
    });

    it('initializes with main branch and root commit', () => {
      expect(mgr.getCurrentBranch()).toBe('main');
      const head = mgr.getHeadCommit();
      expect(head.branch).toBe('main');
      expect(head.parentCommitIds).toHaveLength(0);
      expect(head.tags).toContain('root');
      expect(head.message).toBe('Initial model baseline');
    });

    it('records subsequent commits with parentage', () => {
      const updated = mgr.getHeadSnapshot();
      // Add a ridge node N5 at (3, 0, 5.5)
      updated.nodes['N5'] = { id: 'N5', coords: { x: 3, y: 0, z: 5.5 } };
      const commit2 = mgr.commit('Add apex ridge node', updated);

      expect(commit2.branch).toBe('main');
      expect(commit2.parentCommitIds).toEqual([mgr.getHistory('main')[1].commitId]);
      expect(mgr.getHeadCommit().commitId).toBe(commit2.commitId);
    });

    it('creates and switches branches', () => {
      const optBranch = mgr.createBranch('option-pitched-roof');
      expect(optBranch.name).toBe('option-pitched-roof');
      expect(mgr.listBranches()).toHaveLength(2);

      mgr.checkout('option-pitched-roof');
      expect(mgr.getCurrentBranch()).toBe('option-pitched-roof');

      const s = mgr.getHeadSnapshot();
      s.nodes['N5'] = { id: 'N5', coords: { x: 3, y: 0, z: 5.5 } };
      const c = mgr.commit('Pitched roof conversion', s);

      expect(c.branch).toBe('option-pitched-roof');
      expect(mgr.getHeadCommit().commitId).toBe(c.commitId);

      // Main branch HEAD should remain unaffected
      mgr.checkout('main');
      expect(mgr.getHeadSnapshot().nodes['N5']).toBeUndefined();
    });

    it('prevents deleting active branch or main branch', () => {
      expect(() => mgr.deleteBranch('main')).toThrow();

      mgr.createBranch('temp-branch');
      mgr.checkout('temp-branch');
      expect(() => mgr.deleteBranch('temp-branch')).toThrow();

      mgr.checkout('main');
      expect(mgr.deleteBranch('temp-branch')).toBe(true);
    });

    it('creates tags on commits', () => {
      mgr.createTag('v1.0-preliminary');
      const tags = mgr.listTags();
      expect(tags).toHaveLength(1);
      expect(tags[0].tag).toBe('v1.0-preliminary');
      expect(mgr.getHeadCommit().tags).toContain('v1.0-preliminary');
    });

    it('finds common ancestor between branches', () => {
      const rootId = mgr.getHeadCommit().commitId;

      mgr.createBranch('branch-a');
      mgr.createBranch('branch-b');

      mgr.checkout('branch-a');
      mgr.commit('Commit A1', mgr.getHeadSnapshot());
      mgr.commit('Commit A2', mgr.getHeadSnapshot());

      mgr.checkout('branch-b');
      mgr.commit('Commit B1', mgr.getHeadSnapshot());

      const ancestor = mgr.findCommonAncestor('branch-a', 'branch-b');
      expect(ancestor).toBe(rootId);

      const div = mgr.getBranchDivergence('branch-a', 'branch-b');
      expect(div.ahead).toBe(2);
      expect(div.behind).toBe(1);
      expect(div.commonAncestorId).toBe(rootId);
    });
  });

  // ─── 3. StructuralModelDiffer ───────────────────────────────────────────────

  describe('StructuralModelDiffer', () => {
    it('detects zero changes between identical snapshots', () => {
      const diff = StructuralModelDiffer.diff(baseSnapshot, cloneSnapshot(baseSnapshot));
      expect(diff.summary.hasStructuralModifications).toBe(false);
      expect(diff.summary.membersAdded).toBe(0);
      expect(diff.summary.deltaSteelMassKg).toBe(0);
      expect(diff.summary.changeSummaryText).toContain('Identical');
    });

    it('detects node movements and restraint modifications', () => {
      const target = cloneSnapshot(baseSnapshot);
      // Move N4 0.5m higher and release fz restraint on N1
      target.nodes['N4'].coords.z = 4.5;
      target.nodes['N1'].restraint!.fz = false;

      const diff = StructuralModelDiffer.diff(baseSnapshot, target);
      expect(diff.summary.hasStructuralModifications).toBe(true);
      expect(diff.summary.nodesModified).toBe(2);

      const n4Diff = diff.nodeDiffs.find(n => n.id === 'N4')!;
      expect(n4Diff.changeType).toBe('modified');
      expect(n4Diff.deltaDistanceM).toBe(0.5);

      const n1Diff = diff.nodeDiffs.find(n => n.id === 'N1')!;
      expect(n1Diff.restraintChanged).toBe(true);
    });

    it('detects member section changes and steel weight delta', () => {
      const target = cloneSnapshot(baseSnapshot);
      // Upgrade columns M1 & M2 from HEB300 (117 kg/m) to HEB360 (weightPerM = 142 kg/m)
      target.sections['HEB360'] = {
        id: 'HEB360',
        name: 'HEB 360',
        weightPerM: 142,
        materialId: 'S355',
      };
      target.members['M1'].sectionId = 'HEB360';
      target.members['M2'].sectionId = 'HEB360';

      const diff = StructuralModelDiffer.diff(baseSnapshot, target);
      expect(diff.summary.membersModified).toBe(2);

      // Column weight increase: 2 * 4m * (142 - 117) = 200 kg
      expect(diff.summary.deltaSteelMassKg).toBeCloseTo(200, 1);
      expect(diff.summary.deltaSteelMassPercent).toBeGreaterThan(0);
      expect(diff.summary.changeSummaryText).toContain('+200 kg');
    });

    it('detects added and removed members and loads', () => {
      const target = cloneSnapshot(baseSnapshot);
      // Add diagonal cross brace M4 (N1-N4)
      target.members['M4'] = { id: 'M4', startNodeId: 'N1', endNodeId: 'N4', sectionId: 'IPE360', type: 'brace' };
      // Remove load L1 and add point load L2
      delete target.loads['L1'];
      target.loads['L2'] = { id: 'L2', type: 'nodal_force', nodeId: 'N3', magnitude: -25000, direction: 'Z' };

      const diff = StructuralModelDiffer.diff(baseSnapshot, target);
      expect(diff.summary.membersAdded).toBe(1);
      expect(diff.summary.loadsRemoved).toBe(1);
      expect(diff.summary.loadsAdded).toBe(1);
    });
  });

  // ─── 4. Visual3DDiffMap ─────────────────────────────────────────────────────

  describe('Visual3DDiffMap', () => {
    it('generates correct visual directives and colors for 3D canvas', () => {
      const visualizer = new Visual3DDiffMap();
      const target = cloneSnapshot(baseSnapshot);

      // Add N5, M4; modify section M1; remove M2
      target.nodes['N5'] = { id: 'N5', coords: { x: 3, y: 0, z: 5 } };
      target.members['M4'] = { id: 'M4', startNodeId: 'N3', endNodeId: 'N5', sectionId: 'IPE360' };
      target.members['M1'].sectionId = 'HEB360';
      delete target.members['M2'];

      const report = StructuralModelDiffer.diff(baseSnapshot, target);
      const visualMap = visualizer.generateMap(report, baseSnapshot, target);

      // Added member M4 -> Emerald green
      const vM4 = visualMap.get('M4')!;
      expect(vM4.classification).toBe('added');
      expect(vM4.colorHex).toBe(DEFAULT_DIFF_PALETTE.added);
      expect(vM4.wireframe).toBe(false);

      // Removed member M2 -> Crimson red dashed wireframe ghost
      const vM2 = visualMap.get('M2')!;
      expect(vM2.classification).toBe('removed');
      expect(vM2.colorHex).toBe(DEFAULT_DIFF_PALETTE.removed);
      expect(vM2.wireframe).toBe(true);
      expect(vM2.dashed).toBe(true);
      expect(vM2.ghost).toBeDefined();

      // Modified section M1 -> Violet Purple
      const vM1 = visualMap.get('M1')!;
      expect(vM1.classification).toBe('modified_section');
      expect(vM1.colorHex).toBe(DEFAULT_DIFF_PALETTE.modifiedSection);

      // Unchanged member M3 -> Slate gray muted opacity
      const vM3 = visualMap.get('M3')!;
      expect(vM3.classification).toBe('unchanged');
      expect(vM3.opacity).toBeLessThan(0.5);
    });

    it('generates UI legend with entity counts', () => {
      const visualizer = new Visual3DDiffMap();
      const target = cloneSnapshot(baseSnapshot);
      target.nodes['N5'] = { id: 'N5', coords: { x: 3, y: 0, z: 5 } };

      const report = StructuralModelDiffer.diff(baseSnapshot, target);
      const legend = visualizer.generateLegend(report);

      expect(legend).toHaveLength(6);
      const addedItem = legend.find(l => l.classification === 'added')!;
      expect(addedItem.count).toBe(1);
    });
  });

  // ─── 5. ModelMergeResolver ──────────────────────────────────────────────────

  describe('ModelMergeResolver', () => {
    let mgr: ModelBranchManager;

    beforeEach(() => {
      mgr = new ModelBranchManager(baseSnapshot, { id: 'eng-1', name: 'Lead' });
    });

    it('performs fast-forward merge cleanly', () => {
      mgr.createBranch('feature-roof');
      mgr.checkout('feature-roof');

      const s = mgr.getHeadSnapshot();
      s.nodes['N5'] = { id: 'N5', coords: { x: 3, y: 0, z: 5.5 } };
      mgr.commit('Add apex node', s);

      // Fast-forward merge feature-roof into main
      const res = ModelMergeResolver.merge(mgr, 'feature-roof', 'main');
      expect(res.success).toBe(true);
      expect(res.isFastForward).toBe(true);
      expect(res.conflicts).toHaveLength(0);
      expect(mgr.getHeadSnapshot().nodes['N5']).toBeDefined();
    });

    it('returns clean success if target already contains source (up-to-date)', () => {
      mgr.createBranch('temp');
      const res = ModelMergeResolver.merge(mgr, 'temp', 'main');
      expect(res.success).toBe(true);
      expect(res.isFastForward).toBe(false);
      expect(res.conflicts).toHaveLength(0);
    });

    it('cleanly merges non-conflicting concurrent changes (3-way merge)', () => {
      // Branch A adds wind load
      mgr.createBranch('branch-wind');
      mgr.checkout('branch-wind');
      const sWind = mgr.getHeadSnapshot();
      sWind.loads['L_WIND'] = { id: 'L_WIND', type: 'nodal_force', nodeId: 'N3', magnitude: 12000, direction: 'X' };
      mgr.commit('Add lateral wind load', sWind);

      // Branch B (main) adds bracing M4
      mgr.checkout('main');
      const sBrace = mgr.getHeadSnapshot();
      sBrace.members['M4'] = { id: 'M4', startNodeId: 'N1', endNodeId: 'N4', sectionId: 'IPE360', type: 'brace' };
      mgr.commit('Add cross brace', sBrace);

      // Merge branch-wind into main
      const res = ModelMergeResolver.merge(mgr, 'branch-wind', 'main', { commitMessage: 'Merge wind load' });
      expect(res.success).toBe(true);
      expect(res.conflicts).toHaveLength(0);

      // Merged snapshot on main must contain BOTH the bracing AND the wind load!
      const finalSnapshot = mgr.getHeadSnapshot();
      expect(finalSnapshot.members['M4']).toBeDefined();
      expect(finalSnapshot.loads['L_WIND']).toBeDefined();
      expect(res.mergeCommit?.parentCommitIds).toHaveLength(2);
    });

    it('detects concurrent property conflict on member sections', () => {
      // Branch A upgrades beam to IPE400
      mgr.createBranch('branch-beam-opt');
      mgr.checkout('branch-beam-opt');
      const sA = mgr.getHeadSnapshot();
      sA.sections['IPE400'] = { id: 'IPE400', name: 'IPE 400', areaM2: 0.00845, weightPerM: 66.3 };
      sA.members['M3'].sectionId = 'IPE400';
      mgr.commit('Upgrade beam to IPE 400', sA);

      // Main branch upgrades beam to HEB280 concurrently
      mgr.checkout('main');
      const sB = mgr.getHeadSnapshot();
      sB.sections['HEB280'] = { id: 'HEB280', name: 'HEB 280', areaM2: 0.0131, weightPerM: 103 };
      sB.members['M3'].sectionId = 'HEB280';
      mgr.commit('Upgrade beam to HEB 280', sB);

      // Merge without strategy should report conflict
      const res = ModelMergeResolver.merge(mgr, 'branch-beam-opt', 'main', { strategy: 'manual' });
      expect(res.success).toBe(false);
      expect(res.unresolvedConflictCount).toBe(1);
      expect(res.conflicts[0].conflictType).toBe('property_conflict');
      expect(res.conflicts[0].entityId).toBe('M3');
    });

    it('resolves conflicts using strategy "theirs" or "ours"', () => {
      mgr.createBranch('branch-opt');
      mgr.checkout('branch-opt');
      const sA = mgr.getHeadSnapshot();
      sA.members['M3'].sectionId = 'OPT_A';
      mgr.commit('Opt A', sA);

      mgr.checkout('main');
      const sB = mgr.getHeadSnapshot();
      sB.members['M3'].sectionId = 'OPT_B';
      mgr.commit('Opt B', sB);

      // Strategy 'theirs': incoming branch-opt wins
      const res = ModelMergeResolver.merge(mgr, 'branch-opt', 'main', { strategy: 'theirs' });
      expect(res.success).toBe(true);
      expect(res.conflicts[0].resolution).toBe('theirs');
      expect(res.mergedSnapshot.members['M3'].sectionId).toBe('OPT_A');
    });

    it('detects topological orphan conflict and safely drops orphan member', () => {
      // Branch A deletes node N4 (and column M2)
      mgr.createBranch('branch-cut');
      mgr.checkout('branch-cut');
      const sCut = mgr.getHeadSnapshot();
      delete sCut.nodes['N4'];
      delete sCut.members['M2'];
      mgr.commit('Remove right column', sCut);

      // Main attaches a new roof truss M5 to N4
      mgr.checkout('main');
      const sTruss = mgr.getHeadSnapshot();
      sTruss.members['M5'] = { id: 'M5', startNodeId: 'N3', endNodeId: 'N4', sectionId: 'IPE360' };
      mgr.commit('Attach truss to N4', sTruss);

      // Merge branch-cut into main: N4 is deleted by branch-cut, but M5 on main requires N4!
      const res = ModelMergeResolver.merge(mgr, 'branch-cut', 'main', { strategy: 'ours' });

      // An orphan conflict should be identified for M5 or M3
      const orphanConflict = res.conflicts.find(c => c.conflictType === 'topological_orphan_conflict');
      expect(orphanConflict).toBeDefined();
      // The merged snapshot must not have any member referencing deleted N4
      for (const m of Object.values(res.mergedSnapshot.members)) {
        expect(res.mergedSnapshot.nodes[m.startNodeId]).toBeDefined();
        expect(res.mergedSnapshot.nodes[m.endNodeId]).toBeDefined();
      }
    });
  });
});
