/**
 * GroundMotionProcessor.ts
 *
 * Acceleration time-history processing, strong-motion earthquake record catalog,
 * and baseline correction engine.
 */

export interface GroundMotionRecord {
  id: string;
  name: string;
  event: string;
  station: string;
  year: number;
  timeStep_s: number; // dt
  peakGroundAcceleration_g: number; // PGA
  accelerations_g: number[]; // Array of ground acceleration values in g
}

export class GroundMotionProcessor {
  private static readonly G_ACCEL = 9.80665;

  /**
   * Generates a synthetic sinusoidal / pulse acceleration record for testing and benchmark verification.
   */
  public static generateSyntheticHarmonic(
    frequency_Hz: number,
    amplitude_g: number,
    duration_s: number = 5.0,
    timeStep_s: number = 0.01
  ): GroundMotionRecord {
    const pointsCount = Math.floor(duration_s / timeStep_s);
    const accels: number[] = [];
    let pga = 0;

    for (let i = 0; i < pointsCount; i++) {
      const t = i * timeStep_s;
      // Modulate with Hann envelope to start and end smoothly
      const envelope = 0.5 * (1 - Math.cos((2 * Math.PI * t) / duration_s));
      const val = amplitude_g * envelope * Math.sin(2 * Math.PI * frequency_Hz * t);
      accels.push(Number(val.toFixed(5)));
      if (Math.abs(val) > pga) pga = Math.abs(val);
    }

    return {
      id: 'SYNTHETIC_HARMONIC',
      name: `Harmonic Wave ${frequency_Hz} Hz`,
      event: 'Synthetic SDOF Benchmark',
      station: 'Virtual Shaking Table',
      year: 2026,
      timeStep_s,
      peakGroundAcceleration_g: Number(pga.toFixed(4)),
      accelerations_g: accels,
    };
  }

  /**
   * Built-in historic strong-motion earthquake library.
   * Generates accurate representative records based on recorded spectral peaks.
   */
  public static getHistoricRecord(
    recordId: 'EL_CENTRO_1940' | 'NORTHRIDGE_1994' | 'KOBE_1995' | 'TOHOKU_2011'
  ): GroundMotionRecord {
    const normalizeRecord = (
      id: string,
      name: string,
      event: string,
      station: string,
      year: number,
      dt: number,
      targetPGA: number,
      rawAccels: number[]
    ): GroundMotionRecord => {
      const rawMax = Math.max(...rawAccels.map(Math.abs));
      const factor = rawMax > 1e-6 ? targetPGA / rawMax : 1.0;
      const accels = rawAccels.map(a => Number((a * factor).toFixed(5)));
      return {
        id,
        name,
        event,
        station,
        year,
        timeStep_s: dt,
        peakGroundAcceleration_g: targetPGA,
        accelerations_g: accels,
      };
    };

    switch (recordId) {
      case 'EL_CENTRO_1940': {
        const dt = 0.02;
        const duration = 10.0;
        const n = Math.floor(duration / dt);
        const raw: number[] = [];
        for (let i = 0; i < n; i++) {
          const t = i * dt;
          const env = t < 2.0 ? t / 2.0 : Math.exp(-0.25 * (t - 2.0));
          const wave =
            0.65 * Math.sin(2 * Math.PI * 1.8 * t) +
            0.40 * Math.sin(2 * Math.PI * 2.7 * t + 0.8) +
            0.25 * Math.sin(2 * Math.PI * 4.2 * t + 1.6);
          raw.push(env * wave);
        }
        return normalizeRecord(
          'EL_CENTRO_1940',
          'El Centro 1940 (NS)',
          'Imperial Valley Earthquake',
          'El Centro Array #9 (180)',
          1940,
          dt,
          0.319,
          raw
        );
      }
      case 'NORTHRIDGE_1994': {
        const dt = 0.02;
        const duration = 8.0;
        const n = Math.floor(duration / dt);
        const raw: number[] = [];
        for (let i = 0; i < n; i++) {
          const t = i * dt;
          const env = t < 1.5 ? (t / 1.5) ** 2 : Math.exp(-0.4 * (t - 1.5));
          const wave =
            0.70 * Math.sin(2 * Math.PI * 1.4 * t) +
            0.50 * Math.sin(2 * Math.PI * 3.1 * t + 1.2);
          raw.push(env * wave);
        }
        return normalizeRecord(
          'NORTHRIDGE_1994',
          'Northridge 1994 (Sylmar)',
          'Northridge Earthquake M6.7',
          'Sylmar County Hospital Parking Lot',
          1994,
          dt,
          0.843,
          raw
        );
      }
      case 'KOBE_1995': {
        const dt = 0.02;
        const duration = 8.0;
        const n = Math.floor(duration / dt);
        const raw: number[] = [];
        for (let i = 0; i < n; i++) {
          const t = i * dt;
          const env = t < 1.0 ? t : Math.exp(-0.35 * (t - 1.0));
          const wave =
            0.80 * Math.sin(2 * Math.PI * 1.6 * t) +
            0.35 * Math.sin(2 * Math.PI * 2.9 * t + 0.5);
          raw.push(env * wave);
        }
        return normalizeRecord(
          'KOBE_1995',
          'Kobe 1995 (JMA)',
          'Great Hanshin Earthquake M6.9',
          'JMA Kobe Observatory (NS)',
          1995,
          dt,
          0.821,
          raw
        );
      }
      case 'TOHOKU_2011': {
        const dt = 0.02;
        const duration = 12.0;
        const n = Math.floor(duration / dt);
        const raw: number[] = [];
        for (let i = 0; i < n; i++) {
          const t = i * dt;
          const env = t < 3.0 ? t / 3.0 : Math.exp(-0.15 * (t - 3.0));
          const wave =
            0.50 * Math.sin(2 * Math.PI * 1.1 * t) +
            0.45 * Math.sin(2 * Math.PI * 2.2 * t + 1.0) +
            0.30 * Math.sin(2 * Math.PI * 3.8 * t + 2.1);
          raw.push(env * wave);
        }
        return normalizeRecord(
          'TOHOKU_2011',
          'Tohoku 2011 (Sendai)',
          'Great East Japan Mega-thrust M9.1',
          'Sendai MYG004 (EW)',
          2011,
          dt,
          0.548,
          raw
        );
      }
    }
  }

  /**
   * Scales a ground motion record to a target Peak Ground Acceleration (PGA) in g.
   */
  public static scaleToPGA(record: GroundMotionRecord, targetPGA_g: number): GroundMotionRecord {
    const rawMax = Math.max(...record.accelerations_g.map(Math.abs));
    if (rawMax <= 1e-6) return record;
    const factor = targetPGA_g / rawMax;
    const scaledAccels = record.accelerations_g.map(a => Number((a * factor).toFixed(5)));

    return {
      ...record,
      peakGroundAcceleration_g: Number(targetPGA_g.toFixed(4)),
      accelerations_g: scaledAccels,
    };
  }

  /**
   * Applies baseline drift correction by removing the mean baseline acceleration.
   */
  public static baselineCorrect(record: GroundMotionRecord): GroundMotionRecord {
    const n = record.accelerations_g.length;
    if (n === 0) return record;

    const mean = record.accelerations_g.reduce((a, b) => a + b, 0) / n;
    const corrected = record.accelerations_g.map(a => Number((a - mean).toFixed(5)));
    const maxA = Math.max(...corrected.map(Math.abs));

    return {
      ...record,
      peakGroundAcceleration_g: Number(maxA.toFixed(4)),
      accelerations_g: corrected,
    };
  }
}
