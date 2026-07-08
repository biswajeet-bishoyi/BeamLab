/**
 * Unit system definitions for the Canonical Engineering Model.
 * 
 * No engineering property should hardcode units.
 * All numeric values must carry a unit reference or be interpreted
 * in the context of the active UnitSystem.
 */

// ─── Base quantity kinds ────────────────────────────────────────────────────

export type QuantityKind =
  | 'length'
  | 'force'
  | 'moment'
  | 'mass'
  | 'pressure'   // stress, elastic modulus
  | 'density'
  | 'temperature'
  | 'angle'
  | 'dimensionless';

// ─── Unit system presets ────────────────────────────────────────────────────

export type UnitSystemPreset = 'SI' | 'Metric' | 'Imperial' | 'Custom';

// ─── Individual unit definitions ────────────────────────────────────────────

export interface UnitDefinition {
  /** Machine-readable symbol, e.g. "m", "kN", "ft" */
  readonly symbol: string;
  /** Human-readable name, e.g. "metre", "kilonewton" */
  readonly name: string;
  /** Conversion factor to SI base unit for this quantity kind */
  readonly toSIFactor: number;
}

// ─── Unit system configuration ──────────────────────────────────────────────

export interface UnitSystem {
  readonly preset: UnitSystemPreset;
  readonly length: UnitDefinition;
  readonly force: UnitDefinition;
  readonly moment: UnitDefinition;
  readonly mass: UnitDefinition;
  readonly pressure: UnitDefinition;
  readonly density: UnitDefinition;
  readonly temperature: UnitDefinition;
}

// ─── Preset implementations ─────────────────────────────────────────────────

export const SI_UNITS: UnitSystem = {
  preset: 'SI',
  length:      { symbol: 'm',   name: 'metre',         toSIFactor: 1 },
  force:       { symbol: 'kN',  name: 'kilonewton',    toSIFactor: 1e3 },
  moment:      { symbol: 'kN·m',name: 'kilonewton-metre', toSIFactor: 1e3 },
  mass:        { symbol: 'kg',  name: 'kilogram',      toSIFactor: 1 },
  pressure:    { symbol: 'kPa', name: 'kilopascal',    toSIFactor: 1e3 },
  density:     { symbol: 'kg/m³', name: 'kilogram per cubic metre', toSIFactor: 1 },
  temperature: { symbol: '°C',  name: 'degree Celsius', toSIFactor: 1 },
};

export const METRIC_UNITS: UnitSystem = {
  preset: 'Metric',
  length:      { symbol: 'cm',  name: 'centimetre',    toSIFactor: 0.01 },
  force:       { symbol: 'kN',  name: 'kilonewton',    toSIFactor: 1e3 },
  moment:      { symbol: 'kN·m',name: 'kilonewton-metre', toSIFactor: 1e3 },
  mass:        { symbol: 'kg',  name: 'kilogram',      toSIFactor: 1 },
  pressure:    { symbol: 'MPa', name: 'megapascal',    toSIFactor: 1e6 },
  density:     { symbol: 'kg/m³', name: 'kilogram per cubic metre', toSIFactor: 1 },
  temperature: { symbol: '°C',  name: 'degree Celsius', toSIFactor: 1 },
};

export const IMPERIAL_UNITS: UnitSystem = {
  preset: 'Imperial',
  length:      { symbol: 'ft',  name: 'foot',          toSIFactor: 0.3048 },
  force:       { symbol: 'kip', name: 'kilopound',     toSIFactor: 4448.22 },
  moment:      { symbol: 'kip·ft', name: 'kilopound-foot', toSIFactor: 4448.22 * 0.3048 },
  mass:        { symbol: 'lb',  name: 'pound',         toSIFactor: 0.453592 },
  pressure:    { symbol: 'ksi', name: 'kilopound per square inch', toSIFactor: 6894757 },
  density:     { symbol: 'lb/ft³', name: 'pound per cubic foot', toSIFactor: 16.0185 },
  temperature: { symbol: '°F',  name: 'degree Fahrenheit', toSIFactor: 1 },
};

// ─── Converter ──────────────────────────────────────────────────────────────

export class UnitConverter {
  constructor(
    private readonly from: UnitSystem,
    private readonly to: UnitSystem,
  ) {}

  public convertLength(value: number): number {
    return (value * this.from.length.toSIFactor) / this.to.length.toSIFactor;
  }

  public convertForce(value: number): number {
    return (value * this.from.force.toSIFactor) / this.to.force.toSIFactor;
  }

  public convertPressure(value: number): number {
    return (value * this.from.pressure.toSIFactor) / this.to.pressure.toSIFactor;
  }

  public convertMass(value: number): number {
    return (value * this.from.mass.toSIFactor) / this.to.mass.toSIFactor;
  }

  /** Generic conversion by quantity kind */
  public convert(value: number, kind: QuantityKind): number {
    switch (kind) {
      case 'length':      return this.convertLength(value);
      case 'force':       return this.convertForce(value);
      case 'pressure':    return this.convertPressure(value);
      case 'mass':        return this.convertMass(value);
      default:            return value; // dimensionless, angle
    }
  }
}
