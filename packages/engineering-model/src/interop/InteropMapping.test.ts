import { describe, it, expect } from 'vitest';
import {
  CoordinateMapper,
  MaterialMapper,
  SectionMapper,
  RelationshipMapper,
  ExternalObjectMapper,
} from './mapping';
import { InteropRegistry } from './InteropRegistry';
import { CsvInteropProvider } from './providers/CsvInteropProvider';
import { DxfInteropProvider } from './providers/DxfInteropProvider';

describe('B1.5 Interop Mapping Engine', () => {
  describe('CoordinateMapper', () => {
    it('scales millimeters to meters correctly', () => {
      const mapper = new CoordinateMapper({ scaleFactor: 0.001 });
      const transformed = mapper.toCanonical({ x: 1000, y: 2500, z: 5000 });
      expect(transformed.x).toBeCloseTo(1.0);
      expect(transformed.y).toBeCloseTo(2.5);
      expect(transformed.z).toBeCloseTo(5.0);

      const roundTrip = mapper.toExternal(transformed);
      expect(roundTrip.x).toBeCloseTo(1000);
      expect(roundTrip.y).toBeCloseTo(2500);
      expect(roundTrip.z).toBeCloseTo(5000);
    });

    it('transposes Y-up (CAD/STAAD) to Canonical Z-up', () => {
      const mapper = new CoordinateMapper({ sourceUpAxis: 'Y', targetUpAxis: 'Z' });
      // Point with Y as elevation: X=3, Y=10 (elevation), Z=4 (depth)
      const canonical = mapper.toCanonical({ x: 3, y: 10, z: 4 });
      expect(canonical.x).toBe(3);
      expect(canonical.z).toBe(10); // Elevation is now Z
      expect(canonical.y).toBe(-4);
    });

    it('applies origin offsets and vertical rotation', () => {
      const mapper = new CoordinateMapper({
        originOffset: { x: 10, y: 20, z: 0 },
        rotationAngleDeg: 90,
      });
      const canonical = mapper.toCanonical({ x: 1, y: 0, z: 5 });
      // 90 deg rotation of (1, 0): cos(90)=0, sin(90)=1 -> (-y, x) = (0, 1) + offset (10, 20)
      expect(canonical.x).toBeCloseTo(10);
      expect(canonical.y).toBeCloseTo(21);
      expect(canonical.z).toBeCloseTo(5);
    });
  });

  describe('MaterialMapper', () => {
    const mapper = new MaterialMapper();

    it('resolves standard structural steel grades', () => {
      const s355 = mapper.resolveMaterial('S355 JR');
      expect(s355.definition.category).toBe('Steel');
      expect(s355.definition.grade).toBe('S355');
      expect(s355.elasticModulus).toBe(210e9);

      const a992 = mapper.resolveMaterial('ASTM A992');
      expect(a992.definition.grade).toBe('S355');

      const s275 = mapper.resolveMaterial('S275');
      expect(s275.definition.grade).toBe('S275');
      expect(s275.definition.yieldStrength).toBe(275e6);
    });

    it('resolves concrete grades', () => {
      const m30 = mapper.resolveMaterial('Concrete M30');
      expect(m30.definition.category).toBe('Concrete');
      expect(m30.definition.grade).toBe('M30');
      expect(m30.elasticModulus).toBe(27.4e9);
    });

    it('resolves timber and aluminum grades', () => {
      const timber = mapper.resolveMaterial('GL24h GlueLam');
      expect(timber.definition.category).toBe('Timber');
      expect(timber.definition.grade).toBe('GL24h');

      const al = mapper.resolveMaterial('Aluminum 6061-T6');
      expect(al.definition.category).toBe('Aluminium');
      expect(al.definition.grade).toBe('6061-T6');
    });

    it('creates custom material fallback for unknown designations', () => {
      const custom = mapper.resolveMaterial('Exotic-Alloy-99');
      expect(custom.definition.grade).toBe('Exotic-Alloy-99');
      expect(custom.definition.category).toBe('Steel');
    });
  });

  describe('SectionMapper', () => {
    const mapper = new SectionMapper();

    it('resolves standard European and AISC profiles', () => {
      const ipe200 = mapper.resolveSection('IPE 200');
      expect(ipe200.profile.designation).toBe('IPE 200');
      expect(ipe200.profile.type).toBe('I');
      expect(ipe200.properties.area).toBe(2.85e-3);

      const w12 = mapper.resolveSection('W12X26');
      expect(w12.profile.designation).toBe('W12x26');
      expect(w12.profile.type).toBe('I');
    });

    it('parses parametric rectangular section strings', () => {
      const rect = mapper.resolveSection('RECT_300x500');
      expect(rect.profile.type).toBe('SolidRect');
      expect(rect.properties.area).toBeCloseTo(0.15); // 0.3 * 0.5
      expect(rect.profile.dimensions?.b).toBeCloseTo(0.3);
      expect(rect.profile.dimensions?.h).toBeCloseTo(0.5);
    });

    it('provides fallback for unknown shapes', () => {
      const unknown = mapper.resolveSection('SpecialShape99');
      expect(unknown.profile.type).toBe('I');
      expect(unknown.identity.name).toBe('SpecialShape99');
    });
  });

  describe('RelationshipMapper', () => {
    it('tracks bidirectional external and canonical ID pairs', () => {
      const relMapper = new RelationshipMapper();
      relMapper.registerIdMapping('EXT_NODE_101', 'node-101');
      relMapper.registerIdMapping('EXT_MEM_201', 'mem-201');

      expect(relMapper.toCanonicalId('EXT_NODE_101')).toBe('node-101');
      expect(relMapper.toExternalId('node-101')).toBe('EXT_NODE_101');
      expect(relMapper.toCanonicalId('UNKNOWN')).toBeUndefined();
    });
  });

  describe('ExternalObjectMapper', () => {
    it('encapsulates coordinated mapping logic', () => {
      const objMapper = new ExternalObjectMapper({
        coordinateOptions: { scaleFactor: 0.001 },
      });
      const pt = objMapper.coordinates.toCanonical({ x: 2000, y: 3000, z: 4000 });
      expect(pt.x).toBe(2);

      const mat = objMapper.materials.resolveMaterial('S355');
      expect(mat.definition.grade).toBe('S355');

      const sec = objMapper.sections.resolveSection('IPE 300');
      expect(sec.profile.type).toBe('I');
    });
  });

  describe('InteropRegistry', () => {
    it('manages pluggable interop providers', () => {
      const registry = new InteropRegistry();
      registry.registerProvider(new CsvInteropProvider());
      registry.registerProvider(new DxfInteropProvider());

      expect(registry.hasFormat('csv')).toBe(true);
      expect(registry.hasFormat('dxf')).toBe(true);
      expect(registry.hasFormat('unregistered-format')).toBe(false);

      const csvProvider = registry.getProvider('csv');
      expect(csvProvider?.name).toContain('CSV');

      const formats = registry.getSupportedFormats();
      expect(formats).toContain('csv');
      expect(formats).toContain('dxf');
    });
  });
});
