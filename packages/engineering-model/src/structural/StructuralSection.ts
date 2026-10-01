import { BaseEngineeringObject, EngineeringObjectType } from '../core/IEngineeringObject';
import { ValidationResult } from '../validation/ValidationResult';

// ─── Section classification ───────────────────────────────────────────────────

export type SectionType =
  | 'I'            // Wide flange / UB / UC / W-shape
  | 'H'            // H-pile / HP shape
  | 'T'            // T-section / WT
  | 'L'            // Angle
  | 'C'            // Channel / PFC
  | 'Z'            // Z-section
  | 'Box'          // RHS / SHS / hollow rectangular
  | 'CHS'          // Circular hollow section
  | 'SolidRect'    // Solid rectangular
  | 'SolidCirc'    // Solid circular
  | 'Parametric'   // User-defined by properties only
  | 'Custom';

// ─── Geometric section properties ────────────────────────────────────────────

export interface SectionProperties {
  /** Cross-sectional area [length²] */
  area: number;
  /** Moment of inertia about strong axis (Iy) [length⁴] */
  momentOfInertiaY: number;
  /** Moment of inertia about weak axis (Iz) [length⁴] */
  momentOfInertiaZ: number;
  /** Torsional constant J [length⁴] */
  torsionalConstant: number;
  /** Warping constant Cw [length⁶] */
  warpingConstant?: number;
  /** Radius of gyration about Y [length] */
  radiusOfGyrationY?: number;
  /** Radius of gyration about Z [length] */
  radiusOfGyrationZ?: number;
  /** Effective shear area Y [length²] */
  shearAreaY?: number;
  /** Effective shear area Z [length²] */
  shearAreaZ?: number;
  /** Elastic section modulus Y (Sy = Iy / ymax) [length³] */
  sectionModulusY?: number;
  /** Elastic section modulus Z (Sz = Iz / zmax) [length³] */
  sectionModulusZ?: number;
  /** Plastic section modulus Y (Zy) [length³] */
  plasticModulusY?: number;
  /** Plastic section modulus Z (Zz) [length³] */
  plasticModulusZ?: number;
}

// ─── Section dimension dictionary ────────────────────────────────────────────

export type SectionDimensions = Record<string, number>;
// Examples:
//   I:       { d, bf, tf, tw }
//   Box:     { d, b, t }
//   CHS:     { od, t }
//   SolidRect: { b, h }

// ─── Provider interface ───────────────────────────────────────────────────────

export interface ISectionProvider {
  readonly providerId: string;
  readonly displayName: string;
  /** e.g., "IS 808", "AISC 16th Ed", "EN 10365" */
  readonly standard?: string;
  getProfiles(): SectionProfile[];
  getProfile(designation: string): SectionProfile | undefined;
}

// ─── Section profile ──────────────────────────────────────────────────────────

export interface SectionProfile {
  /** Designation label, e.g. "W12x26", "IPE 200", "ISMB 300" */
  readonly designation: string;
  readonly type: SectionType;
  readonly properties: SectionProperties;
  readonly dimensions?: SectionDimensions;
  readonly mass?: number; // mass per unit length [mass/length]
}

// ─── Section Registry ─────────────────────────────────────────────────────────

export class SectionRegistry {
  private readonly _providers: Map<string, ISectionProvider> = new Map();
  private readonly _custom: Map<string, SectionProfile> = new Map();

  public registerProvider(provider: ISectionProvider): void {
    this._providers.set(provider.providerId, provider);
  }

  public registerCustom(profile: SectionProfile): void {
    this._custom.set(profile.designation, profile);
  }

  public resolve(designation: string): SectionProfile | undefined {
    for (const provider of this._providers.values()) {
      const profile = provider.getProfile(designation);
      if (profile) return profile;
    }
    return this._custom.get(designation);
  }

  public allDesignations(): string[] {
    const set = new Set<string>();
    for (const provider of this._providers.values()) {
      provider.getProfiles().forEach(p => set.add(p.designation));
    }
    this._custom.forEach((_, k) => set.add(k));
    return Array.from(set);
  }
}

// ─── Parametric section profiles (built-in) ───────────────────────────────────

export const SECTION_PRESETS: Record<string, SectionProfile> = {
  'IPE 200': {
    designation: 'IPE 200', type: 'I',
    properties: { area: 0.002848, momentOfInertiaY: 1.943e-5, momentOfInertiaZ: 1.42e-6, torsionalConstant: 7.02e-8, warpingConstant: 1.3e-10, radiusOfGyrationY: 0.0826, radiusOfGyrationZ: 0.0223 },
    dimensions: { d: 0.200, bf: 0.100, tf: 0.00560, tw: 0.00560 },
    mass: 22.4,
  },
  'IPE 300': {
    designation: 'IPE 300', type: 'I',
    properties: { area: 0.005381, momentOfInertiaY: 8.356e-5, momentOfInertiaZ: 6.04e-6, torsionalConstant: 2.01e-7, warpingConstant: 1.26e-9, radiusOfGyrationY: 0.1246, radiusOfGyrationZ: 0.0335 },
    dimensions: { d: 0.300, bf: 0.150, tf: 0.0107, tw: 0.0071 },
    mass: 42.2,
  },
  'W12x26': {
    designation: 'W12x26', type: 'I',
    properties: { area: 0.004903, momentOfInertiaY: 8.37e-5, momentOfInertiaZ: 2.04e-5, torsionalConstant: 1.17e-7 },
    dimensions: { d: 0.3099, bf: 0.1651, tf: 0.00940, tw: 0.00610 },
    mass: 38.7,
  },
};

// ─── Structural Section entity ────────────────────────────────────────────────

export class StructuralSection extends BaseEngineeringObject {
  readonly objectType: EngineeringObjectType = 'Section';

  profile: SectionProfile;

  constructor(id: string, profile: SectionProfile) {
    super(id, profile.designation);
    this.profile = profile;
  }

  get properties(): SectionProperties { return this.profile.properties; }
  get sectionType(): SectionType { return this.profile.type; }

  validate(): ValidationResult {
    const p = this.profile.properties;
    const diagnostics = [];

    if (p.area <= 0) {
      diagnostics.push({ code: 'SDM-SEC001', severity: 'error' as const, message: 'Section area must be positive.', objectId: this.identity.id, field: 'area' });
    }
    if (p.momentOfInertiaY <= 0) {
      diagnostics.push({ code: 'SDM-SEC002', severity: 'error' as const, message: 'Moment of inertia Iy must be positive.', objectId: this.identity.id, field: 'momentOfInertiaY' });
    }
    if (p.momentOfInertiaZ <= 0) {
      diagnostics.push({ code: 'SDM-SEC003', severity: 'error' as const, message: 'Moment of inertia Iz must be positive.', objectId: this.identity.id, field: 'momentOfInertiaZ' });
    }
    if (p.torsionalConstant < 0) {
      diagnostics.push({ code: 'SDM-SEC004', severity: 'error' as const, message: 'Torsional constant J must be non-negative.', objectId: this.identity.id, field: 'torsionalConstant' });
    }

    return new ValidationResult(this.identity.id, diagnostics);
  }
}
