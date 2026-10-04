import * as THREE from 'three';
import type { SectionType, SectionDimensions } from '@beamstudio/engineering-model';

/**
 * Procedural geometry builder for structural cross-sections.
 * Generates 2D profile shapes and extrudes them into 3D solid meshes along member length.
 */
export class ProfileGeometryBuilder {
  /**
   * Generates a 3D BufferGeometry for a given section type, dimensions, and span length.
   * Cross section is centered at (0, 0) in the local YZ plane, and extruded along +X by `length`.
   */
  public static createGeometry(
    sectionType: SectionType,
    dimensions: SectionDimensions = {},
    length: number = 1.0,
  ): THREE.BufferGeometry {
    // Sanitize length to avoid zero-length geometry errors
    const span = Math.max(0.01, length);

    switch (sectionType) {
      case 'I':
      case 'H':
        return this.createExtrudedGeometry(this.createIShape(dimensions), span);

      case 'Box':
        return this.createExtrudedGeometry(this.createBoxShape(dimensions), span);

      case 'CHS':
        return this.createCHSTubeGeometry(dimensions, span);

      case 'C':
        return this.createExtrudedGeometry(this.createChannelShape(dimensions), span);

      case 'L':
        return this.createExtrudedGeometry(this.createAngleShape(dimensions), span);

      case 'T':
        return this.createExtrudedGeometry(this.createTeeShape(dimensions), span);

      case 'SolidRect':
        return this.createSolidRectGeometry(dimensions, span);

      case 'SolidCirc':
        return this.createSolidCircGeometry(dimensions, span);

      default:
        // Default generic rectangular fallback
        return this.createSolidRectGeometry({ b: 0.15, h: 0.25, ...dimensions }, span);
    }
  }

  // ─── 2D Section Shapes ──────────────────────────────────────────────────────

  /**
   * I / Wide-Flange shape:
   * d  = total depth (height along Y)
   * bf = flange width (width along Z)
   * tf = flange thickness
   * tw = web thickness
   */
  public static createIShape(dim: SectionDimensions): THREE.Shape {
    const d = dim.d ?? 0.30;
    const bf = dim.bf ?? 0.15;
    const tf = dim.tf ?? 0.010;
    const tw = dim.tw ?? 0.007;

    const halfD = d / 2;
    const halfBf = bf / 2;
    const halfTw = tw / 2;
    const innerY = halfD - tf;

    const shape = new THREE.Shape();
    // Start at top-right of top flange
    shape.moveTo(halfBf, halfD);
    // Top flange top edge to top-left
    shape.lineTo(-halfBf, halfD);
    // Top flange left edge down
    shape.lineTo(-halfBf, innerY);
    // Top flange bottom edge to web left
    shape.lineTo(-halfTw, innerY);
    // Left side of web down
    shape.lineTo(-halfTw, -innerY);
    // Bottom flange top edge left
    shape.lineTo(-halfBf, -innerY);
    // Bottom flange left edge down
    shape.lineTo(-halfBf, -halfD);
    // Bottom flange bottom edge to bottom-right
    shape.lineTo(halfBf, -halfD);
    // Bottom flange right edge up
    shape.lineTo(halfBf, -innerY);
    // Bottom flange top edge to web right
    shape.lineTo(halfTw, -innerY);
    // Right side of web up
    shape.lineTo(halfTw, innerY);
    // Top flange bottom edge right
    shape.lineTo(halfBf, innerY);
    // Close back to top-right
    shape.closePath();

    return shape;
  }

  /**
   * Hollow Box / RHS shape:
   * d = depth (Y)
   * b = width (Z)
   * t = wall thickness
   */
  public static createBoxShape(dim: SectionDimensions): THREE.Shape {
    const d = dim.d ?? 0.20;
    const b = dim.b ?? 0.12;
    const t = dim.t ?? 0.008;

    const halfD = d / 2;
    const halfB = b / 2;

    const shape = new THREE.Shape();
    // Outer perimeter (counter-clockwise)
    shape.moveTo(halfB, halfD);
    shape.lineTo(-halfB, halfD);
    shape.lineTo(-halfB, -halfD);
    shape.lineTo(halfB, -halfD);
    shape.closePath();

    // Inner hole (clockwise)
    const inHalfD = Math.max(0.001, halfD - t);
    const inHalfB = Math.max(0.001, halfB - t);
    const hole = new THREE.Path();
    hole.moveTo(inHalfB, inHalfD);
    hole.lineTo(inHalfB, -inHalfD);
    hole.lineTo(-inHalfB, -inHalfD);
    hole.lineTo(-inHalfB, inHalfD);
    hole.closePath();

    shape.holes.push(hole);
    return shape;
  }

  /**
   * Channel (C-shape / PFC):
   * d = depth
   * bf = flange width
   * tf = flange thickness
   * tw = web thickness
   */
  public static createChannelShape(dim: SectionDimensions): THREE.Shape {
    const d = dim.d ?? 0.20;
    const bf = dim.bf ?? 0.075;
    const tf = dim.tf ?? 0.009;
    const tw = dim.tw ?? 0.006;

    const halfD = d / 2;
    const halfBf = bf / 2;
    const webBack = -halfBf;
    const webFront = webBack + tw;
    const innerY = halfD - tf;

    const shape = new THREE.Shape();
    shape.moveTo(halfBf, halfD);
    shape.lineTo(webBack, halfD);
    shape.lineTo(webBack, -halfD);
    shape.lineTo(halfBf, -halfD);
    shape.lineTo(halfBf, -innerY);
    shape.lineTo(webFront, -innerY);
    shape.lineTo(webFront, innerY);
    shape.lineTo(halfBf, innerY);
    shape.closePath();

    return shape;
  }

  /**
   * Angle (L-shape):
   * d = leg 1 length (depth)
   * b = leg 2 length (width)
   * t = thickness
   */
  public static createAngleShape(dim: SectionDimensions): THREE.Shape {
    const d = dim.d ?? 0.10;
    const b = dim.b ?? 0.10;
    const t = dim.t ?? 0.010;

    const halfD = d / 2;
    const halfB = b / 2;

    const shape = new THREE.Shape();
    shape.moveTo(-halfB, halfD);
    shape.lineTo(-halfB + t, halfD);
    shape.lineTo(-halfB + t, -halfD + t);
    shape.lineTo(halfB, -halfD + t);
    shape.lineTo(halfB, -halfD);
    shape.lineTo(-halfB, -halfD);
    shape.closePath();

    return shape;
  }

  /**
   * Tee (T-shape):
   * d = total depth
   * bf = flange width
   * tf = flange thickness
   * tw = stem thickness
   */
  public static createTeeShape(dim: SectionDimensions): THREE.Shape {
    const d = dim.d ?? 0.15;
    const bf = dim.bf ?? 0.15;
    const tf = dim.tf ?? 0.010;
    const tw = dim.tw ?? 0.008;

    const halfD = d / 2;
    const halfBf = bf / 2;
    const halfTw = tw / 2;
    const innerY = halfD - tf;

    const shape = new THREE.Shape();
    shape.moveTo(halfBf, halfD);
    shape.lineTo(-halfBf, halfD);
    shape.lineTo(-halfBf, innerY);
    shape.lineTo(-halfTw, innerY);
    shape.lineTo(-halfTw, -halfD);
    shape.lineTo(halfTw, -halfD);
    shape.lineTo(halfTw, innerY);
    shape.lineTo(halfBf, innerY);
    shape.closePath();

    return shape;
  }

  /**
   * Solid Rectangular shape:
   * b = width (Z)
   * h = height (Y)
   */
  public static createSolidRectShape(dim: SectionDimensions): THREE.Shape {
    const h = dim.h ?? dim.d ?? 0.30;
    const b = dim.b ?? dim.bf ?? 0.20;

    const halfH = h / 2;
    const halfB = b / 2;

    const shape = new THREE.Shape();
    shape.moveTo(halfB, halfH);
    shape.lineTo(-halfB, halfH);
    shape.lineTo(-halfB, -halfH);
    shape.lineTo(halfB, -halfH);
    shape.closePath();

    return shape;
  }

  // ─── 3D Geometry Generators ─────────────────────────────────────────────────

  /**
   * Extrudes a 2D cross-section shape along +X by `length`.
   * Three.js extrudes along +Z by default, so we rotate the geometry 90 deg around Y
   * so that it extends along +X (the member local axis) from 0 to length.
   */
  private static createExtrudedGeometry(shape: THREE.Shape, length: number): THREE.BufferGeometry {
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      steps: 1,
      depth: length,
      bevelEnabled: false,
    };

    const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    // ExtrudeGeometry extrudes along +Z. Rotate 90 deg around Y so it extrudes along +X
    geom.rotateY(Math.PI / 2);
    geom.computeVertexNormals();
    return geom;
  }

  /**
   * Circular Hollow Section (CHS) pipe geometry.
   * od = outer diameter
   * t = wall thickness
   */
  private static createCHSTubeGeometry(dim: SectionDimensions, length: number): THREE.BufferGeometry {
    const od = dim.od ?? dim.d ?? 0.168;
    const rOut = od / 2;
    const t = dim.t ?? 0.008;
    const rIn = Math.max(0.001, rOut - t);

    // We construct a tubular cylinder using a 2D circle with inner circular hole
    const shape = new THREE.Shape();
    shape.absarc(0, 0, rOut, 0, Math.PI * 2, false);

    const hole = new THREE.Path();
    hole.absarc(0, 0, rIn, 0, Math.PI * 2, true);
    shape.holes.push(hole);

    return this.createExtrudedGeometry(shape, length);
  }

  /**
   * Solid Rectangular section: Box geometry aligned from x = 0 to x = length.
   */
  private static createSolidRectGeometry(dim: SectionDimensions, length: number): THREE.BufferGeometry {
    const h = dim.h ?? dim.d ?? 0.30;
    const b = dim.b ?? dim.bf ?? 0.20;

    const geom = new THREE.BoxGeometry(length, h, b);
    // Translate so start is at x = 0 instead of centered at x = 0
    geom.translate(length / 2, 0, 0);
    geom.computeVertexNormals();
    return geom;
  }

  /**
   * Solid Circular section: Cylinder geometry aligned from x = 0 to x = length.
   */
  private static createSolidCircGeometry(dim: SectionDimensions, length: number): THREE.BufferGeometry {
    const od = dim.od ?? dim.d ?? 0.15;
    const radius = od / 2;

    const geom = new THREE.CylinderGeometry(radius, radius, length, 24);
    // Rotate cylinder from Y-axis to X-axis
    geom.rotateZ(-Math.PI / 2);
    // Shift along X so it spans from 0 to length
    geom.translate(length / 2, 0, 0);
    geom.computeVertexNormals();
    return geom;
  }
}
