import { BaseEngineeringObject, EngineeringObjectType } from '../core/IEngineeringObject';
import { ValidationResult } from '../validation/ValidationResult';
import {
  LoadType, LoadCategory, LoadDistribution, LoadVector,
} from './LoadTypes';

// ─── Base Structural Load ─────────────────────────────────────────────────────

/**
 * The canonical engineering load entity.
 *
 * Concrete subtypes (PointLoad, DistributedLoad, etc.) extend this class.
 * A load is only meaningful when assigned to a target via LoadAssignment.
 * Loads never store their own target references — assignments do.
 */
export abstract class StructuralLoad extends BaseEngineeringObject {
  readonly objectType: EngineeringObjectType = 'NodeLoad'; // reuse slot

  /** Classification for filtering and reporting */
  category: LoadCategory;

  /** Coordinate system in which the load is expressed */
  coordinateSystemId: string;

  abstract loadType: LoadType;

  constructor(id: string, name: string, category: LoadCategory, coordinateSystemId = 'cs-global') {
    super(id, name);
    this.category = category;
    this.coordinateSystemId = coordinateSystemId;
  }
}

// ─── Point Load ───────────────────────────────────────────────────────────────

/**
 * Concentrated force and/or moment applied at a point.
 * Applied to nodes via LoadAssignment.
 */
export class PointLoad extends StructuralLoad {
  readonly loadType: LoadType = 'PointLoad';

  /** Force/moment components [force / moment units] */
  vector: LoadVector;

  constructor(
    id: string,
    name: string,
    vector: LoadVector,
    category: LoadCategory = 'Gravity',
    coordinateSystemId = 'cs-global',
  ) {
    super(id, name, category, coordinateSystemId);
    this.vector = vector;
  }

  validate(): ValidationResult {
    const hasAny = Object.values(this.vector).some(v => v !== undefined && v !== 0);
    if (!hasAny) {
      return ValidationResult.warning(this.identity.id, 'LDM-PL001', 'Point load has all zero components — it has no effect.');
    }
    return ValidationResult.ok(this.identity.id);
  }
}

// ─── Distributed Load ─────────────────────────────────────────────────────────

/**
 * Load distributed along a member.
 * Supports Uniform, Linear, Trapezoidal, Triangular, and Parabolic profiles.
 */
export class DistributedLoad extends StructuralLoad {
  readonly loadType: LoadType = 'DistributedLoad';

  /** Load magnitude at the start [force/length] */
  magnitudeStart: number;
  /** Load magnitude at the end [force/length] */
  magnitudeEnd: number;
  /** Distribution profile */
  distribution: LoadDistribution;
  /** Global or local direction for the load */
  direction: 'Fx' | 'Fy' | 'Fz';
  /** Application span: [0, 1] relative to member length */
  spanStart: number;
  spanEnd: number;

  constructor(
    id: string,
    name: string,
    magnitudeStart: number,
    magnitudeEnd: number = magnitudeStart,
    direction: 'Fx' | 'Fy' | 'Fz' = 'Fy',
    distribution: LoadDistribution = 'Uniform',
    spanStart = 0,
    spanEnd = 1,
    category: LoadCategory = 'Gravity',
    coordinateSystemId = 'cs-global',
  ) {
    super(id, name, category, coordinateSystemId);
    this.magnitudeStart = magnitudeStart;
    this.magnitudeEnd = magnitudeEnd;
    this.direction = direction;
    this.distribution = distribution;
    this.spanStart = spanStart;
    this.spanEnd = spanEnd;
  }

  validate(): ValidationResult {
    const diags = [];
    if (this.spanStart < 0 || this.spanEnd > 1 || this.spanStart >= this.spanEnd) {
      diags.push({ code: 'LDM-DL001', severity: 'error' as const, message: 'Distributed load span must satisfy 0 ≤ spanStart < spanEnd ≤ 1.', objectId: this.identity.id, field: 'span' });
    }
    return new ValidationResult(this.identity.id, diags);
  }
}

// ─── Moment Load ──────────────────────────────────────────────────────────────

export class MomentLoad extends StructuralLoad {
  readonly loadType: LoadType = 'Moment';

  mx: number; my: number; mz: number;

  constructor(id: string, name: string, mx = 0, my = 0, mz = 0, coordinateSystemId = 'cs-global') {
    super(id, name, 'Gravity', coordinateSystemId);
    this.mx = mx; this.my = my; this.mz = mz;
  }

  validate(): ValidationResult {
    const hasAny = this.mx !== 0 || this.my !== 0 || this.mz !== 0;
    if (!hasAny) {
      return ValidationResult.warning(this.identity.id, 'LDM-ML001', 'Moment load has all zero components.');
    }
    return ValidationResult.ok(this.identity.id);
  }
}

// ─── Temperature Load ─────────────────────────────────────────────────────────

export class TemperatureLoad extends StructuralLoad {
  readonly loadType: LoadType = 'TemperatureLoad';

  /** Uniform temperature change [°C or °F] */
  uniformDeltaT: number;
  /** Top–bottom temperature gradient (positive = top hotter) [°C/length or °F/length] */
  gradientDeltaT: number;

  constructor(id: string, name: string, uniformDeltaT: number, gradientDeltaT = 0) {
    super(id, name, 'Thermal');
    this.uniformDeltaT = uniformDeltaT;
    this.gradientDeltaT = gradientDeltaT;
  }

  validate(): ValidationResult {
    if (this.uniformDeltaT === 0 && this.gradientDeltaT === 0) {
      return ValidationResult.warning(this.identity.id, 'LDM-TL001', 'Temperature load is zero — it has no effect.');
    }
    return ValidationResult.ok(this.identity.id);
  }
}

// ─── Settlement Load ──────────────────────────────────────────────────────────

export class SettlementLoad extends StructuralLoad {
  readonly loadType: LoadType = 'Settlement';

  /** Prescribed displacements [length] and rotations [radian] */
  dx: number; dy: number; dz: number;
  rx: number; ry: number; rz: number;

  constructor(id: string, name: string, dx = 0, dy = 0, dz = 0, rx = 0, ry = 0, rz = 0) {
    super(id, name, 'Settlement');
    this.dx = dx; this.dy = dy; this.dz = dz;
    this.rx = rx; this.ry = ry; this.rz = rz;
  }

  validate(): ValidationResult {
    const hasAny = [this.dx, this.dy, this.dz, this.rx, this.ry, this.rz].some(v => v !== 0);
    if (!hasAny) {
      return ValidationResult.warning(this.identity.id, 'LDM-SL001', 'Settlement load is all zero — it has no effect.');
    }
    return ValidationResult.ok(this.identity.id);
  }
}

// ─── Pretension Load ──────────────────────────────────────────────────────────

export class PretensionLoad extends StructuralLoad {
  readonly loadType: LoadType = 'Pretension';

  /** Pretension force magnitude [force units] */
  pretensionForce: number;
  /** Pretension strain (alternative to force) */
  pretensionStrain?: number;

  constructor(id: string, name: string, pretensionForce: number, pretensionStrain?: number) {
    super(id, name, 'Pretension');
    this.pretensionForce = pretensionForce;
    this.pretensionStrain = pretensionStrain;
  }

  validate(): ValidationResult {
    if (this.pretensionForce < 0) {
      return ValidationResult.error(this.identity.id, 'LDM-PT001', 'Pretension force must be non-negative.', 'pretensionForce');
    }
    return ValidationResult.ok(this.identity.id);
  }
}

// ─── Pressure Load ────────────────────────────────────────────────────────────

export class PressureLoad extends StructuralLoad {
  readonly loadType: LoadType = 'Pressure';

  /** Pressure magnitude [pressure units] */
  pressure: number;
  /** Normal direction: positive = outward from surface */
  isNormalToSurface: boolean;

  constructor(id: string, name: string, pressure: number, isNormalToSurface = true) {
    super(id, name, 'Environmental');
    this.pressure = pressure;
    this.isNormalToSurface = isNormalToSurface;
  }

  validate(): ValidationResult {
    return ValidationResult.ok(this.identity.id);
  }
}

// ─── Load Registry ────────────────────────────────────────────────────────────

export class LoadRegistry {
  private readonly _loads: Map<string, StructuralLoad> = new Map();

  public register(load: StructuralLoad): void {
    this._loads.set(load.identity.id, load);
  }

  public get(id: string): StructuralLoad | undefined {
    return this._loads.get(id);
  }

  public getByType(type: LoadType): StructuralLoad[] {
    return Array.from(this._loads.values()).filter(l => l.loadType === type);
  }

  public getByCategory(category: LoadCategory): StructuralLoad[] {
    return Array.from(this._loads.values()).filter(l => l.category === category);
  }

  public all(): StructuralLoad[] {
    return Array.from(this._loads.values());
  }

  public remove(id: string): void {
    this._loads.delete(id);
  }
}
