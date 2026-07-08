import { describe, it, expect, beforeEach } from 'vitest';
import { EngineeringModel } from './model/EngineeringModel';
import { UnitConverter, SI_UNITS, IMPERIAL_UNITS } from './core/UnitSystem';
import { ValidationResult } from './validation/ValidationResult';
import { JsonSerializationProvider } from './registries/SerializationRegistry';

// ─── Identity ─────────────────────────────────────────────────────────────────

describe('Object Identity', () => {
  let model: EngineeringModel;

  beforeEach(() => {
    model = new EngineeringModel('proj-1', { name: 'Test Project' });
    model.addStructure('str-1', 'Main Structure');
    model.addMaterial('mat-1', 'Steel', 200e6, 77e6, 0.3, 7850, 'steel');
    model.addSection('sec-1', 'W12x26', 0.00491, 8.37e-5, 2.04e-5, 1.17e-7);
  });

  it('assigns stable UUIDs to objects', () => {
    const node = model.addNode('n-1', 'Node 1', 0, 0, 0, 'str-1');
    expect(node.identity.id).toBe('n-1');
    expect(node.identity.name).toBe('Node 1');
    expect(node.identity.createdAt).toBeTruthy();
  });

  it('object registry finds by id', () => {
    model.addNode('n-2', 'Node 2', 1, 0, 0, 'str-1');
    const found = model.objects.get('n-2');
    expect(found).toBeDefined();
    expect(found!.identity.name).toBe('Node 2');
  });

  it('object registry finds by type', () => {
    model.addNode('n-3', 'Node 3', 2, 0, 0, 'str-1');
    model.addNode('n-4', 'Node 4', 3, 0, 0, 'str-1');
    const nodes = model.objects.getByType('Node');
    expect(nodes.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── Validation ───────────────────────────────────────────────────────────────

describe('Validation Engine', () => {
  let model: EngineeringModel;

  beforeEach(() => {
    model = new EngineeringModel('proj-2', { name: 'Validation Test' });
    model.addStructure('str-1', 'Frame');
    model.addMaterial('mat-1', 'Steel', 200e6, 77e6, 0.3, 7850);
    model.addSection('sec-1', 'IPE 200', 0.00285, 1.943e-5, 1.42e-6, 7.02e-8);
  });

  it('passes for a valid member', () => {
    model.addNode('n-1', 'N1', 0, 0, 0, 'str-1');
    model.addNode('n-2', 'N2', 0, 3, 0, 'str-1');
    model.addMember('m-1', 'Col-1', 'n-1', 'n-2', 'mat-1', 'sec-1', 'str-1');

    const results = model.validateAll();
    const memberResult = results.find(r => r.objectId === 'm-1');
    expect(memberResult?.isValid).toBe(true);
  });

  it('fails validation for member with same start and end node', () => {
    model.addNode('n-1', 'N1', 0, 0, 0, 'str-1');
    const member = model.addMember('m-bad', 'Bad', 'n-1', 'n-1', 'mat-1', 'sec-1', 'str-1');
    const result = member.validate();
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.code === 'CEM-M002')).toBe(true);
  });

  it('detects orphan references via cross-reference rule', () => {
    model.addNode('n-1', 'N1', 0, 0, 0, 'str-1');
    // Member references n-999 which does not exist
    model.addMember('m-orphan', 'M', 'n-1', 'n-999', 'mat-1', 'sec-1', 'str-1');
    const results = model.validateAll();
    const memberResult = results.find(r => r.objectId === 'm-orphan');
    expect(memberResult?.isValid).toBe(false);
    expect(memberResult?.errors.some(e => e.code === 'CEM-XREF-001')).toBe(true);
  });

  it('warns when support has no restraints active', () => {
    model.addNode('n-1', 'N1', 0, 0, 0, 'str-1');
    const sup = model.addSupport('sup-1', 'Sup1', 'n-1', 'str-1');
    // Override restraints with all-false
    (sup as any).restraints = { dx: false, dy: false, dz: false, rx: false, ry: false, rz: false };
    const result = sup.validate();
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

// ─── Unit System ──────────────────────────────────────────────────────────────

describe('Unit System', () => {
  it('converts length from SI to Imperial correctly', () => {
    const converter = new UnitConverter(SI_UNITS, IMPERIAL_UNITS);
    const feet = converter.convertLength(1); // 1 m → 3.2808... ft
    expect(feet).toBeCloseTo(3.2808, 3);
  });

  it('converts pressure from SI to Imperial', () => {
    const converter = new UnitConverter(SI_UNITS, IMPERIAL_UNITS);
    // 1 kPa → ksi: 1e3 Pa / 6894757 = ~0.000145
    const ksi = converter.convertPressure(1);
    expect(ksi).toBeCloseTo(1e3 / 6894757, 8);
  });

  it('sets and reads active unit system', () => {
    const model = new EngineeringModel('p', { name: 'P' });
    model.setUnitSystem('Imperial');
    expect(model.activeUnits.preset).toBe('Imperial');
    model.setUnitSystem('SI');
    expect(model.activeUnits.preset).toBe('SI');
  });
});

// ─── Serialization ────────────────────────────────────────────────────────────

describe('Serialization', () => {
  it('JSON round-trip works', () => {
    const provider = new JsonSerializationProvider();
    const obj = { id: 'test', value: 42 };
    const json = provider.serialize(obj);
    const parsed = provider.deserialize(json);
    expect(parsed).toEqual(obj);
  });

  it('model.toJSON returns correct structure', () => {
    const model = new EngineeringModel('m1', { name: 'Test' });
    model.addStructure('s1', 'S1');
    model.addMaterial('mat-1', 'Steel', 200e6, 77e6, 0.3, 7850);
    const json = model.toJSON() as any;
    expect(json.id).toBe('m1');
    expect(json.structures.length).toBe(1);
    expect(json.units).toBe('SI');
  });
});

// ─── Events ───────────────────────────────────────────────────────────────────

describe('CEM Events', () => {
  it('fires EngineeringObjectCreated when a node is added', () => {
    const model = new EngineeringModel('p', { name: 'P' });
    model.addStructure('s', 'S');
    const received: string[] = [];
    model.events.on('EngineeringObjectCreated', e => received.push(e.objectId!));
    model.addNode('n-evt', 'N', 0, 0, 0, 's');
    expect(received).toContain('n-evt');
  });

  it('fires ValidationCompleted after validateAll()', () => {
    const model = new EngineeringModel('p', { name: 'P' });
    let fired = false;
    model.events.on('ValidationCompleted', () => { fired = true; });
    model.validateAll();
    expect(fired).toBe(true);
  });
});

// ─── Change tracking ──────────────────────────────────────────────────────────

describe('Change Tracking', () => {
  it('version increments with each add', () => {
    const model = new EngineeringModel('p', { name: 'P' });
    model.addStructure('s', 'S');
    const v0 = model.currentVersion.number;
    model.addMaterial('mat-1', 'Steel', 200e6, 77e6, 0.3, 7850);
    model.addSection('sec-1', 'S100', 0.01, 1e-4, 5e-5, 1e-7);
    expect(model.currentVersion.number).toBeGreaterThan(v0);
  });
});
