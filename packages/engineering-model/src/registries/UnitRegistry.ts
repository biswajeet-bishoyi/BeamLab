import { UnitSystem, SI_UNITS, METRIC_UNITS, IMPERIAL_UNITS, UnitSystemPreset } from '../core/UnitSystem';

/**
 * Registry of available unit systems.
 * External providers can register custom unit systems.
 */
export class UnitRegistry {
  private readonly _systems: Map<string, UnitSystem> = new Map([
    ['SI', SI_UNITS],
    ['Metric', METRIC_UNITS],
    ['Imperial', IMPERIAL_UNITS],
  ]);

  private _active: UnitSystem = SI_UNITS;

  public register(key: string, system: UnitSystem): void {
    this._systems.set(key, system);
  }

  public activate(key: UnitSystemPreset | string): void {
    const sys = this._systems.get(key);
    if (!sys) throw new Error(`Unknown unit system: "${key}"`);
    this._active = sys;
  }

  public get active(): UnitSystem {
    return this._active;
  }

  public get(key: string): UnitSystem | undefined {
    return this._systems.get(key);
  }

  public list(): string[] {
    return Array.from(this._systems.keys());
  }
}
