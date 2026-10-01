/**
 * ReconciliationPipeline.test.ts
 *
 * Unit tests for Analytical-to-Physical Model Reconciliation & Profile Mapping:
 * - SpatialNodeSnapper near-miss cluster snapping
 * - CrossPlatformCatalogMapper cross-vendor profile & material alias normalization
 * - ModelIntegrityAuditor pre-analysis diagnostics & auto-healing
 */

import { describe, it, expect } from 'vitest';
import { IfcStructuralAnalysisModel } from '../ifc/IfcStructuralSchema';
import { SpatialNodeSnapper } from './SpatialNodeSnapper';
import { ModelIntegrityAuditor } from './ModelIntegrityAuditor';
import { CrossPlatformCatalogMapper } from '../mapping/CrossPlatformCatalogMapper';

describe('Analytical-to-Physical Model Reconciliation & Profile Mapping', () => {
  describe('SpatialNodeSnapper', () => {
    it('snaps near-miss nodes within tolerance and updates member connectivity', () => {
      const modelWithGap: IfcStructuralAnalysisModel = {
        globalId: 'MODEL_GAP',
        name: 'Model With Geometric Eccentricity Gap',
        isLoaded: false,
        connections: [
          {
            globalId: 'N1',
            name: 'Base Column',
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
            globalId: 'N2_COL_TOP',
            name: 'Column Top',
            location: { coordinates: [0, 0, 4.0] },
          },
          {
            // Near-miss node 12mm away from N2_COL_TOP along X
            globalId: 'N2_BEAM_START',
            name: 'Beam Start (Physical Offset)',
            location: { coordinates: [0.012, 0, 4.0] },
          },
          {
            globalId: 'N3',
            name: 'Beam End',
            location: { coordinates: [6.0, 0, 4.0] },
          },
        ],
        curveMembers: [
          {
            globalId: 'COL_1',
            name: 'Column',
            predefinedType: 'RIGID_JOINED_MEMBER',
            startConnectionId: 'N1',
            endConnectionId: 'N2_COL_TOP',
            profileName: 'HEB240',
          },
          {
            globalId: 'BEAM_1',
            name: 'Beam',
            predefinedType: 'RIGID_JOINED_MEMBER',
            startConnectionId: 'N2_BEAM_START', // Unconnected gap
            endConnectionId: 'N3',
            profileName: 'IPE360',
          },
        ],
        surfaceMembers: [],
        loadGroups: [],
        pointActions: [],
        curveActions: [],
      };

      const snapper = new SpatialNodeSnapper();
      const result = snapper.healModel(modelWithGap, { tolerance_m: 0.025, preferSupportedNodes: true });

      expect(result.nodesMergedCount).toBe(1);
      expect(result.modifiedMembersCount).toBe(1);
      expect(result.healedModel.connections).toHaveLength(3);

      const healedBeam = result.healedModel.curveMembers.find(m => m.globalId === 'BEAM_1');
      expect(healedBeam?.startConnectionId).toBe('N2_COL_TOP');
      expect(healedBeam?.endConnectionId).toBe('N3');
    });
  });

  describe('CrossPlatformCatalogMapper', () => {
    const mapper = new CrossPlatformCatalogMapper();

    it('normalizes Autodesk Revit family profile strings', () => {
      const res1 = mapper.mapProfile('W-Wide Flange-Column: W14X90');
      expect(res1.canonicalName).toBe('W14X90');
      expect(res1.standard).toBe('AISC');
      expect(res1.shapeType).toBe('I_SHAPE');
      expect(res1.depth_mm).toBeCloseTo(355.6, 1);
    });

    it('normalizes Trimble Tekla profile strings', () => {
      const resIpe = mapper.mapProfile('IPE300');
      expect(resIpe.canonicalName).toBe('IPE300');
      expect(resIpe.standard).toBe('EUROCODE');
      expect(resIpe.depth_mm).toBe(300);

      const resHeb = mapper.mapProfile('HE200B');
      expect(resHeb.canonicalName).toBe('HE200B');
      expect(resHeb.depth_mm).toBe(200);
      expect(resHeb.webThickness_mm).toBe(9.0);
    });

    it('normalizes SCIA / SAF profile strings with spaces and slashes', () => {
      const resSaf = mapper.mapProfile('IPE 300');
      expect(resSaf.canonicalName).toBe('IPE300');

      const resHss = mapper.mapProfile('RHS 200*100*6');
      expect(resHss.canonicalName).toBe('RHS200x100x6');
      expect(resHss.shapeType).toBe('HSS_RECT');
    });

    it('maps materials with standard yield strengths and elastic moduli', () => {
      const steel = mapper.mapMaterial('Structural Steel S355JR');
      expect(steel.canonicalName).toBe('Steel_S355');
      expect(steel.materialClass).toBe('STEEL');
      expect(steel.fy_MPa).toBe(355);
      expect(steel.E_GPa).toBe(210);

      const concrete = mapper.mapMaterial('Concrete C30/37');
      expect(concrete.canonicalName).toBe('Concrete_C30_37');
      expect(concrete.materialClass).toBe('CONCRETE');
      expect(concrete.fck_MPa).toBe(30);
      expect(concrete.E_GPa).toBe(33);
    });

    it('supports custom registered aliases', () => {
      mapper.registerAlias('MY_SPECIAL_BEAM', 'IPE400');
      const custom = mapper.mapProfile('MY_SPECIAL_BEAM');
      expect(custom.canonicalName).toBe('IPE400');
      expect(custom.depth_mm).toBe(400);
    });
  });

  describe('ModelIntegrityAuditor', () => {
    const auditor = new ModelIntegrityAuditor();

    it('detects orphaned nodes, unconstrained mechanisms, and zero-length elements', () => {
      const flawedModel: IfcStructuralAnalysisModel = {
        globalId: 'FLAWED_MODEL',
        name: 'Model With Multiple Defects',
        isLoaded: false,
        connections: [
          {
            globalId: 'N1',
            name: 'Node 1',
            location: { coordinates: [0, 0, 0] },
            // NO supports!
          },
          {
            globalId: 'N2',
            name: 'Node 2',
            location: { coordinates: [0, 0, 3] },
          },
          {
            // Degenerate node right on top of N2
            globalId: 'N2_DUP',
            name: 'Node 2 Dup',
            location: { coordinates: [0, 0, 3] },
          },
          {
            // Orphaned node
            globalId: 'N_ORPHAN',
            name: 'Floating Node',
            location: { coordinates: [10, 10, 10] },
          },
        ],
        curveMembers: [
          {
            globalId: 'M1',
            name: 'Normal Column',
            predefinedType: 'RIGID_JOINED_MEMBER',
            startConnectionId: 'N1',
            endConnectionId: 'N2',
            profileName: 'HEB200',
          },
          {
            // Zero-length member
            globalId: 'M_ZERO',
            name: 'Zero Length Member',
            predefinedType: 'RIGID_JOINED_MEMBER',
            startConnectionId: 'N2',
            endConnectionId: 'N2_DUP',
            profileName: 'HEB200',
          },
          {
            // Member missing profile name
            globalId: 'M_NO_PROFILE',
            name: 'Unassigned Section Member',
            predefinedType: 'RIGID_JOINED_MEMBER',
            startConnectionId: 'N1',
            endConnectionId: 'N2',
            profileName: '',
          },
        ],
        surfaceMembers: [],
        loadGroups: [],
        pointActions: [],
        curveActions: [],
      };

      const report = auditor.audit(flawedModel);

      expect(report.status).toBe('FAIL');
      expect(report.errorCount).toBeGreaterThanOrEqual(2); // Zero length member + No supports

      const orphanedIssue = report.issues.find(i => i.id === 'ISSUE_ORPHANED_NODES');
      expect(orphanedIssue).toBeDefined();
      expect(orphanedIssue?.affectedEntityIds).toContain('N_ORPHAN');

      const zeroLengthIssue = report.issues.find(i => i.id === 'ISSUE_ZERO_LENGTH_MEMBER');
      expect(zeroLengthIssue).toBeDefined();
      expect(zeroLengthIssue?.affectedEntityIds).toContain('M_ZERO');

      const noSupportIssue = report.issues.find(i => i.id === 'ISSUE_NO_SUPPORTS');
      expect(noSupportIssue).toBeDefined();

      const unassignedSectionIssue = report.issues.find(i => i.id === 'ISSUE_UNASSIGNED_SECTION');
      expect(unassignedSectionIssue).toBeDefined();
      expect(unassignedSectionIssue?.affectedEntityIds).toContain('M_NO_PROFILE');

      // Test autoFix
      const fixedModel = auditor.autoFix(flawedModel);
      expect(fixedModel.connections.find(n => n.globalId === 'N_ORPHAN')).toBeUndefined();
      expect(fixedModel.curveMembers.find(m => m.globalId === 'M_ZERO')).toBeUndefined();
      const fixedMember = fixedModel.curveMembers.find(m => m.globalId === 'M_NO_PROFILE');
      expect(fixedMember?.profileName).toBe('DEFAULT_IPE300');
    });
  });
});
