/**
 * BeamLab B1.5 — Interop Property & Unit Mapping
 */

export interface PropertyMapRule {
  readonly canonicalName: string;
  readonly externalName: string;
  readonly scaleFactorToCanonical: number; // e.g. 0.001 to convert mm to m
  readonly offsetToCanonical?: number;
}

export class PropertyMapper {
  private readonly _rules: Map<string, PropertyMapRule> = new Map();

  constructor(rules: PropertyMapRule[] = []) {
    for (const r of rules) {
      this.addRule(r);
    }
  }

  addRule(rule: PropertyMapRule): void {
    this._rules.set(rule.externalName.toLowerCase(), rule);
  }

  /** Convert external value to canonical value */
  toCanonical(externalName: string, value: number): number {
    const rule = this._rules.get(externalName.toLowerCase());
    if (!rule) return value;
    const scaled = value * rule.scaleFactorToCanonical;
    return rule.offsetToCanonical ? scaled + rule.offsetToCanonical : scaled;
  }

  /** Convert canonical value to external value */
  toExternal(externalName: string, canonicalValue: number): number {
    const rule = this._rules.get(externalName.toLowerCase());
    if (!rule) return canonicalValue;
    const base = rule.offsetToCanonical ? canonicalValue - rule.offsetToCanonical : canonicalValue;
    return base / rule.scaleFactorToCanonical;
  }

  /** Standard property conversion helper */
  static convertUnit(value: number, fromUnit: string, toUnit: string): number {
    const from = fromUnit.toLowerCase().trim();
    const to = toUnit.toLowerCase().trim();
    if (from === to) return value;

    // Length
    const lengthToM: Record<string, number> = {
      m: 1.0,
      meter: 1.0,
      meters: 1.0,
      mm: 0.001,
      millimeter: 0.001,
      cm: 0.01,
      centimeter: 0.01,
      in: 0.0254,
      inch: 0.0254,
      ft: 0.3048,
      foot: 0.3048,
      feet: 0.3048,
    };

    if (lengthToM[from] && lengthToM[to]) {
      const inMeters = value * lengthToM[from]!;
      return inMeters / lengthToM[to]!;
    }

    // Force
    const forceToN: Record<string, number> = {
      n: 1.0,
      kn: 1000.0,
      mn: 1e6,
      lbf: 4.44822,
      kip: 4448.22,
      kips: 4448.22,
      tonf: 9806.65,
    };

    if (forceToN[from] && forceToN[to]) {
      const inNewtons = value * forceToN[from]!;
      return inNewtons / forceToN[to]!;
    }

    // Stress / Pressure (to Pa)
    const stressToPa: Record<string, number> = {
      pa: 1.0,
      kpa: 1e3,
      mpa: 1e6,
      gpa: 1e9,
      n_mm2: 1e6,
      'n/mm2': 1e6,
      'kn/m2': 1e3,
      psi: 6894.76,
      ksi: 6.89476e6,
    };

    if (stressToPa[from] && stressToPa[to]) {
      const inPa = value * stressToPa[from]!;
      return inPa / stressToPa[to]!;
    }

    return value;
  }
}
