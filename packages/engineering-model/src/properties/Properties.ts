import { BaseEngineeringObject, EngineeringObjectType } from '../core/IEngineeringObject';
import { ValidationResult } from '../validation/ValidationResult';

/**
 * Engineering material definition.
 * All moduli / strengths are stored in the project's UnitSystem (pressure).
 */
export class EngineeringMaterial extends BaseEngineeringObject {
  readonly objectType: EngineeringObjectType = 'Material';

  constructor(
    id: string,
    name: string,
    /** Elastic modulus (E) in pressure units */
    public elasticModulus: number,
    /** Shear modulus (G) in pressure units */
    public shearModulus: number,
    /** Poisson's ratio — dimensionless */
    public poissonRatio: number,
    /** Mass density in density units */
    public density: number,
    /** Characteristic yield/compressive strength in pressure units (optional) */
    public strength?: number,
    /** Material category, e.g. "steel", "concrete", "timber" */
    public materialType: string = 'generic',
  ) {
    super(id, name);
  }

  validate(): ValidationResult {
    const diagnostics = [];
    if (this.elasticModulus <= 0) {
      diagnostics.push({ code: 'CEM-MAT001', severity: 'error' as const, message: 'Elastic modulus must be positive.', objectId: this.identity.id, field: 'elasticModulus' });
    }
    if (this.shearModulus <= 0) {
      diagnostics.push({ code: 'CEM-MAT002', severity: 'error' as const, message: 'Shear modulus must be positive.', objectId: this.identity.id, field: 'shearModulus' });
    }
    if (this.poissonRatio < 0 || this.poissonRatio >= 0.5) {
      diagnostics.push({ code: 'CEM-MAT003', severity: 'warning' as const, message: 'Poisson ratio is outside the typical range [0, 0.5).', objectId: this.identity.id, field: 'poissonRatio' });
    }
    if (this.density <= 0) {
      diagnostics.push({ code: 'CEM-MAT004', severity: 'error' as const, message: 'Material density must be positive.', objectId: this.identity.id, field: 'density' });
    }
    return new ValidationResult(this.identity.id, diagnostics);
  }
}

// ─── Section ────────────────────────────────────────────────────────────────

export type SectionShape = 'rectangular' | 'circular' | 'I' | 'T' | 'L' | 'C' | 'box' | 'custom';

// NOTE: The canonical SectionDimensions type is in structural/StructuralSection.ts.
// This is retained for backward compatibility with EngineeringSection (B1.1).
export interface CemSectionDimensions {
  [key: string]: number; // e.g., { width, height } or { flangeWidth, webHeight, … }
}

/**
 * Cross-section properties for a structural member.
 * All section properties are in the project's UnitSystem (length⁴ for inertia, length² for area).
 */
export class EngineeringSection extends BaseEngineeringObject {
  readonly objectType: EngineeringObjectType = 'Section';

  constructor(
    id: string,
    name: string,
    /** Cross-sectional area [length²] */
    public area: number,
    /** Moment of inertia about local y-axis [length⁴] */
    public momentOfInertiaY: number,
    /** Moment of inertia about local z-axis [length⁴] */
    public momentOfInertiaZ: number,
    /** Torsional constant J [length⁴] */
    public torsionalConstant: number,
    /** Section shape for visualisation and design checks */
    public shape: SectionShape = 'custom',
    /** Geometry dimensions keyed by dimension name */
    public dimensions: CemSectionDimensions = {},
    /** Shear area factor (Ay/A) — dimensionless */
    public shearAreaFactorY: number = 1,
    /** Shear area factor (Az/A) — dimensionless */
    public shearAreaFactorZ: number = 1,
  ) {
    super(id, name);
  }

  validate(): ValidationResult {
    const diagnostics = [];
    if (this.area <= 0) {
      diagnostics.push({ code: 'CEM-SEC001', severity: 'error' as const, message: 'Section area must be positive.', objectId: this.identity.id, field: 'area' });
    }
    if (this.momentOfInertiaY <= 0) {
      diagnostics.push({ code: 'CEM-SEC002', severity: 'error' as const, message: 'Moment of inertia Iy must be positive.', objectId: this.identity.id, field: 'momentOfInertiaY' });
    }
    if (this.momentOfInertiaZ <= 0) {
      diagnostics.push({ code: 'CEM-SEC003', severity: 'error' as const, message: 'Moment of inertia Iz must be positive.', objectId: this.identity.id, field: 'momentOfInertiaZ' });
    }
    return new ValidationResult(this.identity.id, diagnostics);
  }
}
