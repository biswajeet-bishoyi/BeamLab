import { BaseEngineeringObject, EngineeringObjectType } from '../core/IEngineeringObject';
import { ValidationResult } from '../validation/ValidationResult';

// ─── Material category ────────────────────────────────────────────────────────

export type MaterialCategory =
  | 'Steel'
  | 'Concrete'
  | 'Timber'
  | 'Aluminium'
  | 'Composite'
  | 'Masonry'
  | 'FRP'   // Fibre Reinforced Polymer
  | 'Custom';

// ─── Provider interface ───────────────────────────────────────────────────────

/**
 * Pluggable material provider.
 * Implementations: IS2062SteelProvider, EC2ConcreteProvider, etc.
 */
export interface IMaterialProvider {
  readonly providerId: string;
  readonly displayName: string;
  /** Returns all material definitions offered by this provider */
  getDefinitions(): MaterialDefinition[];
  /** Lookup a single definition by name/grade */
  getDefinition(nameOrGrade: string): MaterialDefinition | undefined;
}

// ─── Core material definition ─────────────────────────────────────────────────

export interface MaterialDefinition {
  /** Unique name / grade label (e.g. "S355", "M30", "GL24h") */
  readonly grade: string;
  readonly category: MaterialCategory;
  /** Elastic modulus [pressure units] */
  readonly elasticModulus: number;
  /** Shear modulus [pressure units] */
  readonly shearModulus: number;
  /** Poisson's ratio [dimensionless] */
  readonly poissonRatio: number;
  /** Mass density [density units] */
  readonly density: number;
  /** Coefficient of thermal expansion [1/°C or 1/°F] */
  readonly thermalExpansion?: number;
  /** Characteristic yield / design strength [pressure units] */
  readonly yieldStrength?: number;
  /** Ultimate tensile strength [pressure units] */
  readonly ultimateStrength?: number;
  /** Provider-specific additional properties */
  readonly customProperties?: Record<string, number | string>;
}

// ─── Built-in presets ─────────────────────────────────────────────────────────

/** SI units: kN/m² (kPa) for moduli, kg/m³ for density */
export const MATERIAL_PRESETS: Record<string, MaterialDefinition> = {
  'S275': {
    grade: 'S275', category: 'Steel',
    elasticModulus: 210e6, shearModulus: 80.77e6, poissonRatio: 0.3,
    density: 7850, thermalExpansion: 12e-6,
    yieldStrength: 275e3, ultimateStrength: 430e3,
  },
  'S355': {
    grade: 'S355', category: 'Steel',
    elasticModulus: 210e6, shearModulus: 80.77e6, poissonRatio: 0.3,
    density: 7850, thermalExpansion: 12e-6,
    yieldStrength: 355e3, ultimateStrength: 510e3,
  },
  'M25': {
    grade: 'M25', category: 'Concrete',
    elasticModulus: 25e6, shearModulus: 10.4e6, poissonRatio: 0.2,
    density: 2500, thermalExpansion: 10e-6,
    yieldStrength: 25e3,
  },
  'M30': {
    grade: 'M30', category: 'Concrete',
    elasticModulus: 27.4e6, shearModulus: 11.4e6, poissonRatio: 0.2,
    density: 2500, thermalExpansion: 10e-6,
    yieldStrength: 30e3,
  },
  'GL24h': {
    grade: 'GL24h', category: 'Timber',
    elasticModulus: 11.5e6, shearModulus: 0.72e6, poissonRatio: 0.5,
    density: 420, thermalExpansion: 5e-6,
    yieldStrength: 24e3,
  },
  'Al-6061-T6': {
    grade: 'Al-6061-T6', category: 'Aluminium',
    elasticModulus: 68.9e6, shearModulus: 26e6, poissonRatio: 0.33,
    density: 2700, thermalExpansion: 23.6e-6,
    yieldStrength: 276e3, ultimateStrength: 310e3,
  },
};

// ─── Material Registry ────────────────────────────────────────────────────────

export class MaterialRegistry {
  private readonly _providers: Map<string, IMaterialProvider> = new Map();
  private readonly _custom: Map<string, MaterialDefinition> = new Map();

  /** Register a material provider (e.g., IS2062, EC3, AISC) */
  public registerProvider(provider: IMaterialProvider): void {
    this._providers.set(provider.providerId, provider);
  }

  /** Register a one-off custom material definition */
  public registerCustom(def: MaterialDefinition): void {
    this._custom.set(def.grade, def);
  }

  /** Resolve a material by grade, searching providers then custom defs then built-in presets */
  public resolve(grade: string): MaterialDefinition | undefined {
    for (const provider of this._providers.values()) {
      const def = provider.getDefinition(grade);
      if (def) return def;
    }
    if (this._custom.has(grade)) return this._custom.get(grade);
    return MATERIAL_PRESETS[grade];
  }

  /** All known grades across all providers + custom + presets */
  public allGrades(): string[] {
    const grades = new Set<string>();
    for (const provider of this._providers.values()) {
      provider.getDefinitions().forEach(d => grades.add(d.grade));
    }
    this._custom.forEach((_, k) => grades.add(k));
    Object.keys(MATERIAL_PRESETS).forEach(k => grades.add(k));
    return Array.from(grades);
  }
}

// ─── Structural Material entity ───────────────────────────────────────────────

/**
 * An engineering material entity in the structural model.
 * Wraps a MaterialDefinition and participates in the EngineeringModel registry.
 */
export class StructuralMaterial extends BaseEngineeringObject {
  readonly objectType: EngineeringObjectType = 'Material';

  /** The resolved material definition */
  definition: MaterialDefinition;

  constructor(id: string, definition: MaterialDefinition) {
    super(id, definition.grade);
    this.definition = definition;
  }

  // Convenience accessors
  get elasticModulus(): number { return this.definition.elasticModulus; }
  get shearModulus(): number { return this.definition.shearModulus; }
  get poissonRatio(): number { return this.definition.poissonRatio; }
  get density(): number { return this.definition.density; }
  get category(): MaterialCategory { return this.definition.category; }

  validate(): ValidationResult {
    const d = this.definition;
    const diagnostics = [];

    if (d.elasticModulus <= 0) {
      diagnostics.push({ code: 'SDM-MAT001', severity: 'error' as const, message: 'Elastic modulus must be positive.', objectId: this.identity.id, field: 'elasticModulus' });
    }
    if (d.shearModulus <= 0) {
      diagnostics.push({ code: 'SDM-MAT002', severity: 'error' as const, message: 'Shear modulus must be positive.', objectId: this.identity.id, field: 'shearModulus' });
    }
    if (d.poissonRatio < 0 || d.poissonRatio >= 0.5) {
      diagnostics.push({ code: 'SDM-MAT003', severity: 'warning' as const, message: 'Poisson ratio is outside typical range [0, 0.5).', objectId: this.identity.id, field: 'poissonRatio' });
    }
    if (d.density <= 0) {
      diagnostics.push({ code: 'SDM-MAT004', severity: 'error' as const, message: 'Density must be positive.', objectId: this.identity.id, field: 'density' });
    }
    if (d.thermalExpansion !== undefined && d.thermalExpansion < 0) {
      diagnostics.push({ code: 'SDM-MAT005', severity: 'warning' as const, message: 'Thermal expansion coefficient is negative — verify intent.', objectId: this.identity.id, field: 'thermalExpansion' });
    }

    return new ValidationResult(this.identity.id, diagnostics);
  }
}
