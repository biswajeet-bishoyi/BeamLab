import { describe, it, expect } from 'vitest';
import { SurfaceMeshEngine } from './SurfaceMeshEngine';
import { PlanarPolygonBoundary } from './types';

describe('Sprint B19.2 — Surface Mesh & Bandwidth Optimization Engine', () => {
  it('generates structured quadrilateral mesh with valid node connectivity and area', () => {
    const width = 10;
    const length = 6;
    const divX = 5;
    const divY = 3;

    const mesh = SurfaceMeshEngine.generateStructuredQuadMesh(
      'SLAB-01',
      width,
      length,
      divX,
      divY,
      3.0, // elevation z = 3m
      true // RCM enabled
    );

    // Number of nodes = (divX + 1) * (divY + 1) = 6 * 4 = 24 nodes
    expect(mesh.nodes.length).toBe(24);
    // Number of elements = divX * divY = 15 elements
    expect(mesh.elements.length).toBe(15);
    expect(mesh.totalArea).toBeCloseTo(60.0, 3);

    // All nodes should be at z = 3.0
    mesh.nodes.forEach((n) => expect(n.z).toBe(3.0));

    // Bandwidth after RCM must be well-bounded
    expect(mesh.bandwidthAfterRCM).toBeGreaterThan(0);
    expect(mesh.bandwidthAfterRCM).toBeLessThanOrEqual(mesh.nodes.length);
  });

  it('generates planar polygon mesh with interior cutout opening', () => {
    // 8m x 8m slab with a 2m x 2m central elevator shaft opening
    const boundary: PlanarPolygonBoundary = {
      id: 'SLAB-WITH-OPENING',
      outline: [
        [0, 0],
        [8, 0],
        [8, 8],
        [0, 8],
      ],
      openings: [
        [
          [3, 3],
          [5, 3],
          [5, 5],
          [3, 5],
        ],
      ],
      targetElementSize: 1.0, // 1m target element size
    };

    const mesh = SurfaceMeshEngine.generatePlanarPolygonMesh(boundary, 0);

    // Full 8x8 area = 64 m2, minus 2x2 opening = 4 m2 => Net area = 60 m2
    expect(mesh.totalArea).toBeCloseTo(60.0, 0);

    // No element should have its center inside the opening [3, 5] x [3, 5]
    mesh.elements.forEach((el) => {
      const [cx, cy] = el.center;
      const inOpening = cx > 3.01 && cx < 4.99 && cy > 3.01 && cy < 4.99;
      expect(inOpening).toBe(false);
    });

    expect(mesh.elements.length).toBeGreaterThan(0);
    expect(mesh.nodes.length).toBeGreaterThan(0);
  });

  it('throws an error for non-positive dimensions', () => {
    expect(() => {
      SurfaceMeshEngine.generateStructuredQuadMesh('ERR', 0, 10, 4, 4);
    }).toThrow(/Dimensions and divisions must be strictly positive/);
  });
});
