import { describe, it, expect } from 'vitest';
import { KingeryBulmashEngine, EXPLOSIVES_CATALOG } from '../src/waveforms/KingeryBulmash';

describe('KingeryBulmashEngine', () => {
  it('correctly retrieves explosive properties and TNT equivalency', () => {
    expect(EXPLOSIVES_CATALOG.TNT.tntEquivalentMass).toBe(1.0);
    expect(EXPLOSIVES_CATALOG.C4.tntEquivalentMass).toBeGreaterThan(1.0);
    expect(EXPLOSIVES_CATALOG.ANFO.tntEquivalentMass).toBeLessThan(1.0);
  });

  it('calculates blast parameters for 100 kg TNT at 10 m standoff', () => {
    const res = KingeryBulmashEngine.calculateWaveformParameters({
      chargeMass: 100,
      explosiveType: 'TNT',
      standoffDistance: 10,
      burstType: 'surface',
    });

    expect(res.scaledDistanceZ).toBeGreaterThan(1.0);
    expect(res.peakIncidentPressure).toBeGreaterThan(50); // kPa
    expect(res.peakReflectedPressure).toBeGreaterThan(res.peakIncidentPressure * 2); // Rankine-Hugoniot reflection
    expect(res.positivePhaseDuration).toBeGreaterThan(1.0); // ms
    expect(res.shockArrivalTimestamp).toBeGreaterThan(0.5); // ms
    expect(res.positiveIncidentImpulse).toBeGreaterThan(0);
    expect(res.positiveReflectedImpulse).toBeGreaterThan(res.positiveIncidentImpulse);
  });

  it('generates Friedlander pressure-time history curve', () => {
    const params = KingeryBulmashEngine.calculateWaveformParameters({
      chargeMass: 50,
      standoffDistance: 8,
      burstType: 'free-air',
    });

    const history = KingeryBulmashEngine.generateTimeHistory(params, undefined, 50);
    expect(history.length).toBeGreaterThan(40);

    // Peak overpressure occurs at arrival time
    const maxIncident = Math.max(...history.map((h) => h.incidentPressureKPa));
    expect(maxIncident).toBeCloseTo(params.peakIncidentPressure, 0);

    // Final points decay to zero or suction
    const lastPoint = history[history.length - 1]!;
    expect(Math.abs(lastPoint.incidentPressureKPa)).toBeLessThan(5);
  });
});
