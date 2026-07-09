import { describe, it, expect, beforeEach } from 'vitest';
import { StructuralSystem } from './StructuralSystem';
import { StructuralNode } from './StructuralNode';
import { StructuralMember, FIXED_FIXED_RELEASES, PIN_PIN_RELEASES } from './StructuralMember';
import { StructuralMaterial, MATERIAL_PRESETS, MaterialRegistry } from './StructuralMaterial';
import { StructuralSection, SECTION_PRESETS, SectionRegistry } from './StructuralSection';
import { StructuralSupport } from './StructuralSupport';
import { StructuralAssembly } from './StructuralAssembly';
import { CoordinateRegistry, GLOBAL_COORDINATE_SYSTEM, normalizeAxis } from '../coordinate/CoordinateSystem';
import { SI_UNITS, IMPERIAL_UNITS, UnitConverter } from '../core/UnitSystem';
import { DuplicateNodeCoordinateRule, MemberNodeExistenceRule } from './StructuralValidationRules';
import { ValidationContext } from '../validation/ValidationEngine';

// ─── System fixture ───────────────────────────────────────────────────────────

function buildPortalFrame(): StructuralSystem {
  const sys = new StructuralSystem('sys-1', 'Portal Frame', 'proj-1');

  // Materials
  sys.addMaterialByGrade('mat-s355', 'S355');

  // Sections
  sys.addSectionByDesignation('sec-ipe300', 'IPE 300');

  // Nodes
  sys.addNode('n1', 'N1', 0, 0, 0);
  sys.addNode('n2', 'N2', 0, 4, 0);
  sys.addNode('n3', 'N3', 6, 4, 0);
  sys.addNode('n4', 'N4', 6, 0, 0);

  // Members
  sys.addMember('m1', 'Col-L', 'n1', 'n2', 'mat-s355', 'sec-ipe300', 'Column');
  sys.addMember('m2', 'Beam',  'n2', 'n3', 'mat-s355', 'sec-ipe300', 'Beam');
  sys.addMember('m3', 'Col-R', 'n4', 'n3', 'mat-s355', 'sec-ipe300', 'Column');

  // Supports
  sys.addSupport('sup1', 'Fixed-L', 'n1', 'Fixed');
  sys.addSupport('sup2', 'Fixed-R', 'n4', 'Fixed');

  return sys;
}

// ─── StructuralSystem ─────────────────────────────────────────────────────────

describe('StructuralSystem', () => {
  it('creates a portal frame with correct summary', () => {
    const sys = buildPortalFrame();
    const s = sys.summary();
    expect(s.nodes).toBe(4);
    expect(s.members).toBe(3);
    expect(s.materials).toBe(1);
    expect(s.sections).toBe(1);
    expect(s.supports).toBe(2);
  });

  it('computes member lengths correctly', () => {
    const sys = buildPortalFrame();
    expect(sys.memberLength('m1')).toBeCloseTo(4, 5);  // column height 4m
    expect(sys.memberLength('m2')).toBeCloseTo(6, 5);  // beam span 6m
  });

  it('validates a complete valid system with no errors', () => {
    const sys = buildPortalFrame();
    const result = sys.validate();
    expect(result.errors).toHaveLength(0);
  });

  it('validates with error when no supports exist', () => {
    const sys = new StructuralSystem('s', 'S', 'p');
    sys.addMaterialByGrade('m', 'S275');
    sys.addSectionByDesignation('sec', 'IPE 200');
    sys.addNode('n1', 'N1', 0, 0, 0);
    sys.addNode('n2', 'N2', 0, 3, 0);
    sys.addMember('m1', 'M1', 'n1', 'n2', 'm', 'sec');
    const result = sys.validate();
    expect(result.errors.some(e => e.code === 'SDM-SYS003')).toBe(true);
  });

  it('throws when resolving unknown material grade', () => {
    const sys = new StructuralSystem('s', 'S', 'p');
    expect(() => sys.addMaterialByGrade('id', 'UNKNOWN-GRADE')).toThrow();
  });
});

// ─── StructuralNode ───────────────────────────────────────────────────────────

describe('StructuralNode', () => {
  it('computes distance between two nodes', () => {
    const n1 = new StructuralNode('n1', 'N1', { x: 0, y: 0, z: 0 });
    const n2 = new StructuralNode('n2', 'N2', { x: 3, y: 4, z: 0 });
    expect(n1.distanceTo(n2)).toBeCloseTo(5, 8);
  });

  it('tracks connected members', () => {
    const sys = buildPortalFrame();
    const n2 = sys.getNode('n2');
    // n2 is the end of Col-L and the start of Beam
    expect(n2?.connectedMembers).toHaveLength(2);
  });

  it('fails validation for non-finite coordinates', () => {
    const node = new StructuralNode('n', 'N', { x: NaN, y: 0, z: 0 });
    const result = node.validate();
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.code === 'SDM-N001')).toBe(true);
  });
});

// ─── StructuralMember ────────────────────────────────────────────────────────

describe('StructuralMember', () => {
  it('fails validation for zero-length (same-node) member', () => {
    const m = new StructuralMember('m', 'M', 'n1', 'n1', 'mat', 'sec');
    const result = m.validate();
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.code === 'SDM-M003')).toBe(true);
  });

  it('stores PIN_PIN releases correctly', () => {
    const sys = buildPortalFrame();
    const beam = sys.getMember('m2')!;
    beam.releases = PIN_PIN_RELEASES;
    expect(beam.releases.startReleases.Mz).toBe(true);
    expect(beam.releases.endReleases.Mz).toBe(true);
  });

  it('has correct reference relationships', () => {
    const sys = buildPortalFrame();
    const col = sys.getMember('m1')!;
    expect(col.relationships.references['startNode']).toBe('n1');
    expect(col.relationships.references['endNode']).toBe('n2');
    expect(col.relationships.references['material']).toBe('mat-s355');
    expect(col.relationships.references['section']).toBe('sec-ipe300');
  });
});

// ─── StructuralMaterial ──────────────────────────────────────────────────────

describe('StructuralMaterial', () => {
  it('resolves S355 preset correctly', () => {
    const reg = new MaterialRegistry();
    const def = reg.resolve('S355');
    expect(def).toBeDefined();
    expect(def!.yieldStrength).toBe(355e3);
    expect(def!.category).toBe('Steel');
  });

  it('resolves custom registered material', () => {
    const reg = new MaterialRegistry();
    reg.registerCustom({ grade: 'Custom-XYZ', category: 'Custom', elasticModulus: 50e6, shearModulus: 20e6, poissonRatio: 0.3, density: 5000 });
    const def = reg.resolve('Custom-XYZ');
    expect(def).toBeDefined();
    expect(def!.elasticModulus).toBe(50e6);
  });

  it('validates steel material', () => {
    const mat = new StructuralMaterial('m', MATERIAL_PRESETS['S355']!);
    const result = mat.validate();
    expect(result.isValid).toBe(true);
  });
});

// ─── StructuralSection ───────────────────────────────────────────────────────

describe('StructuralSection', () => {
  it('resolves IPE 300 preset', () => {
    const sec = new StructuralSection('s', SECTION_PRESETS['IPE 300']!);
    expect(sec.sectionType).toBe('I');
    expect(sec.properties.area).toBeCloseTo(0.005381, 5);
  });

  it('validates section with negative area', () => {
    const badProfile = { ...SECTION_PRESETS['IPE 200']!, properties: { ...SECTION_PRESETS['IPE 200']!.properties, area: -1 } };
    const sec = new StructuralSection('s', badProfile);
    const result = sec.validate();
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.code === 'SDM-SEC001')).toBe(true);
  });
});

// ─── StructuralSupport ───────────────────────────────────────────────────────

describe('StructuralSupport', () => {
  it('Fixed preset has all DOFs restrained', () => {
    const sup = new StructuralSupport('s', 'S', 'n1', 'Fixed');
    expect(Object.values(sup.restraints).every(Boolean)).toBe(true);
  });

  it('Pinned preset allows rotations', () => {
    const sup = new StructuralSupport('s', 'S', 'n1', 'Pinned');
    expect(sup.restraints.Tx && sup.restraints.Ty && sup.restraints.Tz).toBe(true);
    expect(sup.restraints.Rx || sup.restraints.Ry || sup.restraints.Rz).toBe(false);
  });

  it('warns for empty restraint support', () => {
    const sup = new StructuralSupport('s', 'S', 'n1', 'Spring', {});
    // Spring with no stiffness = effectively free
    const result = sup.validate();
    expect(result.warnings.some(w => w.code === 'SDM-SUP002')).toBe(true);
  });
});

// ─── StructuralAssembly ───────────────────────────────────────────────────────

describe('StructuralAssembly', () => {
  it('stores member and node IDs', () => {
    const asm = new StructuralAssembly('a', 'Frame-1', 'Frame');
    asm.addNode('n1');
    asm.addNode('n2');
    asm.addMember('m1');
    expect(asm.nodeIds).toEqual(['n1', 'n2']);
    expect(asm.memberIds).toEqual(['m1']);
    expect(asm.totalObjectCount).toBe(3);
  });

  it('warns when empty', () => {
    const asm = new StructuralAssembly('a', 'Empty', 'Group');
    const result = asm.validate();
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

// ─── Coordinate System ────────────────────────────────────────────────────────

describe('CoordinateRegistry', () => {
  it('transforms a point from local to global', () => {
    const reg = new CoordinateRegistry();
    // CS translated by (10, 0, 0), no rotation
    reg.register({
      id: 'cs-local',
      name: 'Local',
      type: 'Local',
      origin: { x: 10, y: 0, z: 0 },
      rotation: [1,0,0, 0,1,0, 0,0,1],
    });
    const pt = reg.toGlobal({ x: 1, y: 2, z: 3 }, 'cs-local');
    expect(pt.x).toBeCloseTo(11, 8);
    expect(pt.y).toBeCloseTo(2, 8);
    expect(pt.z).toBeCloseTo(3, 8);
  });

  it('global CS returns point unchanged', () => {
    const reg = new CoordinateRegistry();
    const pt = reg.toGlobal({ x: 5, y: 6, z: 7 }, 'cs-global');
    expect(pt).toEqual({ x: 5, y: 6, z: 7 });
  });

  it('normalizeAxis returns unit vector', () => {
    const axis = normalizeAxis({ x: 3, y: 4, z: 0 });
    expect(axis.x).toBeCloseTo(0.6, 8);
    expect(axis.y).toBeCloseTo(0.8, 8);
    expect(axis.z).toBeCloseTo(0, 8);
  });
});

// ─── Cross-object validation rules ────────────────────────────────────────────

describe('Structural Validation Rules', () => {
  it('DuplicateNodeCoordinateRule detects duplicates', () => {
    const n1 = new StructuralNode('n1', 'N1', { x: 0, y: 0, z: 0 });
    const n2 = new StructuralNode('n2', 'N2', { x: 0, y: 0, z: 0 }); // duplicate

    const rule = new DuplicateNodeCoordinateRule();
    const context: ValidationContext = {
      resolve: (id) => id === 'n1' ? n1 : id === 'n2' ? n2 : undefined,
      resolveAll: () => [n1, n2],
    };

    const diags = rule.evaluate(n1, context);
    expect(diags.some(d => d.code === 'SDM-XREF-N001')).toBe(true);
  });

  it('MemberNodeExistenceRule flags missing nodes', () => {
    const member = new StructuralMember('m', 'M', 'n-missing', 'n2', 'mat', 'sec');
    const n2 = new StructuralNode('n2', 'N2', { x: 1, y: 0, z: 0 });

    const rule = new MemberNodeExistenceRule();
    const context: ValidationContext = {
      resolve: (id) => id === 'n2' ? n2 : undefined,
    };

    const diags = rule.evaluate(member, context);
    expect(diags.some(d => d.code === 'SDM-XREF-M001')).toBe(true);
  });
});
