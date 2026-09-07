/**
 * BeamLab Sprint B3.2 — Multi-Case Result Enveloping & Critical Station Hunter
 * Computes dual-bound max/min envelope curves across multiple ULS/SLS load combinations
 * and identifies governing critical design stations with cross-section utilization ratios.
 */

import {
  type MemberEvaluationResult,
  type StationResult,
  MemberForceEvaluator,
} from './MemberForceEvaluator';

export interface LoadCombinationDef {
  id: string;
  name: string;
  category: 'ULS' | 'SLS';
  factors: {
    dead: number;
    live: number;
    wind?: number;
    snow?: number;
    seismic?: number;
  };
  formula: string;
}

export const STANDARD_LOAD_COMBINATIONS: LoadCombinationDef[] = [
  { id: 'combo_uls_1', name: 'ULS 1 (Dead Only)', category: 'ULS', factors: { dead: 1.4, live: 0 }, formula: '1.4 D' },
  { id: 'combo_uls_2', name: 'ULS 2 (Gravity Governing)', category: 'ULS', factors: { dead: 1.2, live: 1.6 }, formula: '1.2 D + 1.6 L' },
  { id: 'combo_uls_3', name: 'ULS 3 (Gravity + Wind +X)', category: 'ULS', factors: { dead: 1.2, live: 1.0, wind: 1.0 }, formula: '1.2 D + 1.0 L + 1.0 Wx' },
  { id: 'combo_uls_4', name: 'ULS 4 (Gravity + Wind -X)', category: 'ULS', factors: { dead: 1.2, live: 1.0, wind: -1.0 }, formula: '1.2 D + 1.0 L - 1.0 Wx' },
  { id: 'combo_uls_5', name: 'ULS 5 (Uplift / Reversal)', category: 'ULS', factors: { dead: 0.9, live: 0, wind: 1.0 }, formula: '0.9 D + 1.0 Wx' },
  { id: 'combo_uls_6', name: 'ULS 6 (Gravity + Seismic)', category: 'ULS', factors: { dead: 1.2, live: 1.0, seismic: 1.0 }, formula: '1.2 D + 1.0 L + 1.0 E' },
  { id: 'combo_sls_1', name: 'SLS 1 (Total Service)', category: 'SLS', factors: { dead: 1.0, live: 1.0 }, formula: '1.0 D + 1.0 L' },
  { id: 'combo_sls_2', name: 'SLS 2 (Live Service)', category: 'SLS', factors: { dead: 0, live: 1.0 }, formula: '1.0 L' },
];

export interface EnvelopedStation {
  x: number;
  t: number;
  /** Bending Moment Mz bounds [kNm] */
  maxMz: number;
  maxMzCombo: string;
  minMz: number;
  minMzCombo: string;
  /** Shear Force Vy bounds [kN] */
  maxVy: number;
  maxVyCombo: string;
  minVy: number;
  minVyCombo: string;
  /** Axial Force N bounds [kN] */
  maxN: number; // Maximum tension
  maxNCombo: string;
  minN: number; // Maximum compression
  minNCombo: string;
  /** Peak Deflection [mm] */
  maxDeflection: number;
  maxDeflectionCombo: string;
}

export interface CriticalDesignStation {
  memberId: string;
  memberName: string;
  memberType: string;
  section: string;
  governingType: 'Moment (Sagging)' | 'Moment (Hogging)' | 'Shear' | 'Axial Compression' | 'Axial Tension' | 'Deflection';
  x: number;
  stationRatio: number;
  governingValue: number;
  unit: string;
  governingCombo: string;
  capacity?: number;
  utilization: number; // 0.0 to 1.5+
  status: 'Safe' | 'Moderate' | 'Critical' | 'Overstressed';
}

export interface MemberEnvelopeResult {
  memberId: string;
  memberName: string;
  length: number;
  section: string;
  material: string;
  combinationsEvaluated: number;
  stations: EnvelopedStation[];
  criticalStations: CriticalDesignStation[];
  governingSummary: {
    peakSaggingMz: { value: number; x: number; combo: string };
    peakHoggingMz: { value: number; x: number; combo: string };
    peakShearVy: { value: number; x: number; combo: string };
    peakAxialComp: { value: number; x: number; combo: string };
    peakAxialTens: { value: number; x: number; combo: string };
    peakDeflection: { value: number; x: number; combo: string };
    maxUtilization: number;
    overallStatus: 'Safe' | 'Moderate' | 'Critical' | 'Overstressed';
  };
}

export class EnvelopeEngine {
  /**
   * Generates multi-case envelope from an array of single-case evaluation runs.
   */
  public static computeMemberEnvelope(
    memberId: string,
    memberName: string,
    length: number,
    section: string,
    material: string,
    caseResults: Array<{ combo: LoadCombinationDef; evalResult: MemberEvaluationResult }>,
  ): MemberEnvelopeResult {
    if (caseResults.length === 0) {
      throw new Error('At least one combination result is required for enveloping');
    }

    const stationCount = caseResults[0]!.evalResult.stations.length;
    const stations: EnvelopedStation[] = [];

    let peakSaggingMz = { value: -Infinity, x: 0, combo: '' };
    let peakHoggingMz = { value: Infinity, x: 0, combo: '' };
    let peakShearVy = { value: 0, x: 0, combo: '' };
    let peakAxialComp = { value: Infinity, x: 0, combo: '' };
    let peakAxialTens = { value: -Infinity, x: 0, combo: '' };
    let peakDeflection = { value: 0, x: 0, combo: '' };

    for (let i = 0; i < stationCount; i++) {
      const x = caseResults[0]!.evalResult.stations[i]!.x;
      const t = caseResults[0]!.evalResult.stations[i]!.t;

      let maxMz = -Infinity, maxMzCombo = '';
      let minMz = Infinity, minMzCombo = '';
      let maxVy = -Infinity, maxVyCombo = '';
      let minVy = Infinity, minVyCombo = '';
      let maxN = -Infinity, maxNCombo = '';
      let minN = Infinity, minNCombo = '';
      let maxDefl = 0, maxDeflCombo = '';

      for (const { combo, evalResult } of caseResults) {
        const st: StationResult = evalResult.stations[i]!;

        // Moment Mz
        if (st.Mz > maxMz) {
          maxMz = st.Mz;
          maxMzCombo = combo.formula;
        }
        if (st.Mz < minMz) {
          minMz = st.Mz;
          minMzCombo = combo.formula;
        }

        // Shear Vy
        if (st.Vy > maxVy) {
          maxVy = st.Vy;
          maxVyCombo = combo.formula;
        }
        if (st.Vy < minVy) {
          minVy = st.Vy;
          minVyCombo = combo.formula;
        }

        // Axial N
        if (st.N > maxN) {
          maxN = st.N;
          maxNCombo = combo.formula;
        }
        if (st.N < minN) {
          minN = st.N;
          minNCombo = combo.formula;
        }

        // Deflection
        if (st.deflection > maxDefl) {
          maxDefl = st.deflection;
          maxDeflCombo = combo.formula;
        }
      }

      // Check global peaks
      if (maxMz > peakSaggingMz.value) {
        peakSaggingMz = { value: maxMz, x, combo: maxMzCombo };
      }
      if (minMz < peakHoggingMz.value) {
        peakHoggingMz = { value: minMz, x, combo: minMzCombo };
      }
      if (Math.max(Math.abs(maxVy), Math.abs(minVy)) > peakShearVy.value) {
        peakShearVy = {
          value: Math.max(Math.abs(maxVy), Math.abs(minVy)),
          x,
          combo: Math.abs(maxVy) >= Math.abs(minVy) ? maxVyCombo : minVyCombo,
        };
      }
      if (minN < peakAxialComp.value) {
        peakAxialComp = { value: minN, x, combo: minNCombo };
      }
      if (maxN > peakAxialTens.value) {
        peakAxialTens = { value: maxN, x, combo: maxNCombo };
      }
      if (maxDefl > peakDeflection.value) {
        peakDeflection = { value: maxDefl, x, combo: maxDeflCombo };
      }

      stations.push({
        x,
        t,
        maxMz: Number(maxMz.toFixed(2)),
        maxMzCombo,
        minMz: Number(minMz.toFixed(2)),
        minMzCombo,
        maxVy: Number(maxVy.toFixed(2)),
        maxVyCombo,
        minVy: Number(minVy.toFixed(2)),
        minVyCombo,
        maxN: Number(maxN.toFixed(2)),
        maxNCombo,
        minN: Number(minN.toFixed(2)),
        minNCombo,
        maxDeflection: Number(maxDefl.toFixed(2)),
        maxDeflectionCombo: maxDeflCombo,
      });
    }

    // Estimate cross-section capacities based on section designation
    const { capacityM, capacityV, capacityN } = this.estimateSectionCapacities(section);

    // Critical design stations
    const criticalStations: CriticalDesignStation[] = [];

    // 1. Peak Sagging Moment
    if (peakSaggingMz.value > 1.0) {
      const util = capacityM > 0 ? peakSaggingMz.value / capacityM : 0.5;
      criticalStations.push({
        memberId,
        memberName,
        memberType: caseResults[0]!.evalResult.memberType,
        section,
        governingType: 'Moment (Sagging)',
        x: peakSaggingMz.x,
        stationRatio: Number((peakSaggingMz.x / length).toFixed(2)),
        governingValue: Number(peakSaggingMz.value.toFixed(1)),
        unit: 'kNm',
        governingCombo: peakSaggingMz.combo,
        capacity: capacityM,
        utilization: Number(util.toFixed(3)),
        status: this.resolveStatus(util),
      });
    }

    // 2. Peak Hogging Moment
    if (peakHoggingMz.value < -1.0) {
      const util = capacityM > 0 ? Math.abs(peakHoggingMz.value) / capacityM : 0.5;
      criticalStations.push({
        memberId,
        memberName,
        memberType: caseResults[0]!.evalResult.memberType,
        section,
        governingType: 'Moment (Hogging)',
        x: peakHoggingMz.x,
        stationRatio: Number((peakHoggingMz.x / length).toFixed(2)),
        governingValue: Number(peakHoggingMz.value.toFixed(1)),
        unit: 'kNm',
        governingCombo: peakHoggingMz.combo,
        capacity: capacityM,
        utilization: Number(util.toFixed(3)),
        status: this.resolveStatus(util),
      });
    }

    // 3. Peak Shear
    if (peakShearVy.value > 1.0) {
      const util = capacityV > 0 ? peakShearVy.value / capacityV : 0.4;
      criticalStations.push({
        memberId,
        memberName,
        memberType: caseResults[0]!.evalResult.memberType,
        section,
        governingType: 'Shear',
        x: peakShearVy.x,
        stationRatio: Number((peakShearVy.x / length).toFixed(2)),
        governingValue: Number(peakShearVy.value.toFixed(1)),
        unit: 'kN',
        governingCombo: peakShearVy.combo,
        capacity: capacityV,
        utilization: Number(util.toFixed(3)),
        status: this.resolveStatus(util),
      });
    }

    // 4. Peak Axial Compression
    if (peakAxialComp.value < -1.0) {
      const util = capacityN > 0 ? Math.abs(peakAxialComp.value) / capacityN : 0.45;
      criticalStations.push({
        memberId,
        memberName,
        memberType: caseResults[0]!.evalResult.memberType,
        section,
        governingType: 'Axial Compression',
        x: peakAxialComp.x,
        stationRatio: Number((peakAxialComp.x / length).toFixed(2)),
        governingValue: Number(peakAxialComp.value.toFixed(1)),
        unit: 'kN',
        governingCombo: peakAxialComp.combo,
        capacity: capacityN,
        utilization: Number(util.toFixed(3)),
        status: this.resolveStatus(util),
      });
    }

    // 5. Peak Deflection
    if (peakDeflection.value > 0.1) {
      // Allowable deflection: L / 300
      const limitDefl = (length * 1000) / 300;
      const util = peakDeflection.value / limitDefl;
      criticalStations.push({
        memberId,
        memberName,
        memberType: caseResults[0]!.evalResult.memberType,
        section,
        governingType: 'Deflection',
        x: peakDeflection.x,
        stationRatio: Number((peakDeflection.x / length).toFixed(2)),
        governingValue: Number(peakDeflection.value.toFixed(1)),
        unit: 'mm',
        governingCombo: peakDeflection.combo,
        capacity: Number(limitDefl.toFixed(1)),
        utilization: Number(util.toFixed(3)),
        status: this.resolveStatus(util),
      });
    }

    // Maximum utilization among all checks
    let maxUtil = 0;
    for (const cs of criticalStations) {
      if (cs.utilization > maxUtil) maxUtil = cs.utilization;
    }

    return {
      memberId,
      memberName,
      length,
      section,
      material,
      combinationsEvaluated: caseResults.length,
      stations,
      criticalStations,
      governingSummary: {
        peakSaggingMz: {
          value: Number(peakSaggingMz.value.toFixed(1)),
          x: peakSaggingMz.x,
          combo: peakSaggingMz.combo,
        },
        peakHoggingMz: {
          value: Number(peakHoggingMz.value.toFixed(1)),
          x: peakHoggingMz.x,
          combo: peakHoggingMz.combo,
        },
        peakShearVy: {
          value: Number(peakShearVy.value.toFixed(1)),
          x: peakShearVy.x,
          combo: peakShearVy.combo,
        },
        peakAxialComp: {
          value: Number(peakAxialComp.value.toFixed(1)),
          x: peakAxialComp.x,
          combo: peakAxialComp.combo,
        },
        peakAxialTens: {
          value: Number(peakAxialTens.value.toFixed(1)),
          x: peakAxialTens.x,
          combo: peakAxialTens.combo,
        },
        peakDeflection: {
          value: Number(peakDeflection.value.toFixed(1)),
          x: peakDeflection.x,
          combo: peakDeflection.combo,
        },
        maxUtilization: Number(maxUtil.toFixed(3)),
        overallStatus: this.resolveStatus(maxUtil),
      },
    };
  }

  /**
   * Generates complete multi-case envelopes for all members in a demo preset.
   */
  public static getDemoModelEnvelopes(
    preset: 'portal_frame' | 'space_truss' | 'building_slabs',
  ): Map<string, MemberEnvelopeResult> {
    const envelopes = new Map<string, MemberEnvelopeResult>();

    if (preset === 'portal_frame') {
      // 1. Rafter Left
      const casesRafter1 = STANDARD_LOAD_COMBINATIONS.filter((c) => c.category === 'ULS').map((combo) => {
        const dFac = combo.factors.dead;
        const lFac = combo.factors.live;
        const wFac = combo.factors.wind ?? 0;
        return {
          combo,
          evalResult: MemberForceEvaluator.evaluateMember(
            'm_rafter1',
            'Rafter Left',
            'Rafter',
            6.08,
            'IPE 360',
            'S355',
            {
              length: 6.08,
              axialStart: -25.0 * dFac - 18.0 * lFac + 12.0 * wFac,
              axialEnd: -20.0 * dFac - 12.0 * lFac + 8.0 * wFac,
              udlY: 7.0 * dFac + 6.5 * lFac + 2.0 * wFac,
              startMoments: { Mz: -45.0 * dFac - 35.0 * lFac - 22.0 * wFac },
              endMoments: { Mz: 12.0 * dFac + 8.0 * lFac + 4.0 * wFac },
              pointLoads: [{ x: 3.04, Py: 12.0 * dFac + 15.0 * lFac }],
            },
          ),
        };
      });
      envelopes.set('m_rafter1', this.computeMemberEnvelope('m_rafter1', 'Rafter Left', 6.08, 'IPE 360', 'S355', casesRafter1));

      // 2. Rafter Right
      const casesRafter2 = STANDARD_LOAD_COMBINATIONS.filter((c) => c.category === 'ULS').map((combo) => {
        const dFac = combo.factors.dead;
        const lFac = combo.factors.live;
        const wFac = combo.factors.wind ?? 0;
        return {
          combo,
          evalResult: MemberForceEvaluator.evaluateMember(
            'm_rafter2',
            'Rafter Right',
            'Rafter',
            6.08,
            'IPE 360',
            'S355',
            {
              length: 6.08,
              axialStart: -20.0 * dFac - 12.0 * lFac - 8.0 * wFac,
              axialEnd: -25.0 * dFac - 18.0 * lFac - 12.0 * wFac,
              udlY: 7.0 * dFac + 6.5 * lFac - 2.0 * wFac,
              startMoments: { Mz: 12.0 * dFac + 8.0 * lFac - 4.0 * wFac },
              endMoments: { Mz: -45.0 * dFac - 35.0 * lFac + 22.0 * wFac },
              pointLoads: [{ x: 3.04, Py: 12.0 * dFac + 15.0 * lFac }],
            },
          ),
        };
      });
      envelopes.set('m_rafter2', this.computeMemberEnvelope('m_rafter2', 'Rafter Right', 6.08, 'IPE 360', 'S355', casesRafter2));

      // 3. Column Left (windward column, high moments under lateral load)
      const casesCol1 = STANDARD_LOAD_COMBINATIONS.filter((c) => c.category === 'ULS').map((combo) => {
        const dFac = combo.factors.dead;
        const lFac = combo.factors.live;
        const wFac = combo.factors.wind ?? 0;
        return {
          combo,
          evalResult: MemberForceEvaluator.evaluateMember(
            'm_col1',
            'Column Left',
            'Column',
            4.5,
            'IPE 360',
            'S355',
            {
              length: 4.5,
              axialStart: -45.0 * dFac - 40.0 * lFac - 15.0 * wFac,
              axialEnd: -42.0 * dFac - 38.0 * lFac - 14.0 * wFac,
              udlY: 1.0 * dFac + 5.5 * wFac,
              startMoments: { Mz: 35.0 * dFac + 28.0 * lFac + 48.0 * wFac },
              endMoments: { Mz: -45.0 * dFac - 35.0 * lFac - 22.0 * wFac },
            },
          ),
        };
      });
      envelopes.set('m_col1', this.computeMemberEnvelope('m_col1', 'Column Left', 4.5, 'IPE 360', 'S355', casesCol1));

      // 4. Column Right
      const casesCol2 = STANDARD_LOAD_COMBINATIONS.filter((c) => c.category === 'ULS').map((combo) => {
        const dFac = combo.factors.dead;
        const lFac = combo.factors.live;
        const wFac = combo.factors.wind ?? 0;
        return {
          combo,
          evalResult: MemberForceEvaluator.evaluateMember(
            'm_col2',
            'Column Right',
            'Column',
            4.5,
            'IPE 360',
            'S355',
            {
              length: 4.5,
              axialStart: -45.0 * dFac - 40.0 * lFac + 15.0 * wFac,
              axialEnd: -42.0 * dFac - 38.0 * lFac + 14.0 * wFac,
              udlY: -1.8 * wFac,
              startMoments: { Mz: -25.0 * dFac - 20.0 * lFac + 35.0 * wFac },
              endMoments: { Mz: -45.0 * dFac - 35.0 * lFac + 22.0 * wFac },
            },
          ),
        };
      });
      envelopes.set('m_col2', this.computeMemberEnvelope('m_col2', 'Column Right', 4.5, 'IPE 360', 'S355', casesCol2));
    } else if (preset === 'space_truss') {
      // Space truss chords
      for (let i = 0; i < 4; i++) {
        const id = `m_bchord_L_${i}`;
        const cases = STANDARD_LOAD_COMBINATIONS.filter((c) => c.category === 'ULS').map((combo) => {
          const dFac = combo.factors.dead;
          const lFac = combo.factors.live;
          const wFac = combo.factors.wind ?? 0;
          return {
            combo,
            evalResult: MemberForceEvaluator.evaluateMember(id, `BotChord-L${i}`, 'Truss', 3.0, 'CHS 168.3x8', 'S355', {
              length: 3.0,
              axialStart: 90.0 * dFac + 95.0 * lFac + i * 25.0 - 45.0 * wFac,
              axialEnd: 90.0 * dFac + 95.0 * lFac + i * 25.0 - 45.0 * wFac,
              udlY: 0.6 * dFac,
            }),
          };
        });
        envelopes.set(id, this.computeMemberEnvelope(id, `BotChord-L${i}`, 3.0, 'CHS 168.3x8', 'S355', cases));
      }
    } else {
      // Building girders
      for (let floor = 1; floor <= 2; floor++) {
        for (let bay = 1; bay <= 2; bay++) {
          const id = `m_b_x_${floor}_${bay}_0`;
          const cases = STANDARD_LOAD_COMBINATIONS.filter((c) => c.category === 'ULS').map((combo) => {
            const dFac = combo.factors.dead;
            const lFac = combo.factors.live;
            const wFac = combo.factors.wind ?? 0;
            return {
              combo,
              evalResult: MemberForceEvaluator.evaluateMember(id, `Girder-F${floor}-B${bay}`, 'Beam', 6.0, 'W16x31', 'A992', {
                length: 6.0,
                axialStart: -6.0 * dFac - 6.0 * lFac,
                axialEnd: -6.0 * dFac - 6.0 * lFac,
                udlY: 12.0 * dFac + 14.5 * lFac + 2.5 * wFac,
                startMoments: { Mz: -38.0 * dFac - 42.0 * lFac - 18.0 * wFac },
                endMoments: { Mz: -38.0 * dFac - 42.0 * lFac + 18.0 * wFac },
                pointLoads: [{ x: 3.0, Py: 8.0 * dFac + 10.0 * lFac }],
              }),
            };
          });
          envelopes.set(id, this.computeMemberEnvelope(id, `Girder-F${floor}-B${bay}`, 6.0, 'W16x31', 'A992', cases));
        }
      }
    }

    return envelopes;
  }

  /**
   * Sweeps all member envelopes in the structural model and extracts all critical design stations,
   * sorted by utilization ratio descending (worst-case first).
   */
  public static huntCriticalStations(envelopes: Map<string, MemberEnvelopeResult>): CriticalDesignStation[] {
    const allStations: CriticalDesignStation[] = [];
    for (const env of envelopes.values()) {
      allStations.push(...env.criticalStations);
    }
    // Sort descending by utilization
    return allStations.sort((a, b) => b.utilization - a.utilization);
  }

  private static estimateSectionCapacities(section: string): { capacityM: number; capacityV: number; capacityN: number } {
    // Standard yield strength fy = 355 MPa for S355 / 345 MPa for A992
    const fy = 355e3; // kN/m^2

    if (section.includes('IPE 360')) {
      // Zx = 1.019e-3 m^3, Av = 3.51e-3 m^2, A = 7.27e-3 m^2
      const capacityM = 1.019e-3 * fy; // ~361.7 kNm
      const capacityV = 3.51e-3 * (fy / Math.sqrt(3)); // ~719 kN
      const capacityN = 7.27e-3 * fy; // ~2580 kN
      return { capacityM: Math.round(capacityM), capacityV: Math.round(capacityV), capacityN: Math.round(capacityN) };
    }

    if (section.includes('W16x31')) {
      // Zx = 0.885e-3 m^3, Av = 2.4e-3 m^2, A = 5.88e-3 m^2
      const capacityM = 0.885e-3 * fy; // ~314 kNm
      const capacityV = 2.4e-3 * (fy / Math.sqrt(3)); // ~492 kN
      const capacityN = 5.88e-3 * fy; // ~2087 kN
      return { capacityM: Math.round(capacityM), capacityV: Math.round(capacityV), capacityN: Math.round(capacityN) };
    }

    if (section.includes('CHS 168.3x8')) {
      const capacityM = 0.203e-3 * fy; // ~72 kNm
      const capacityV = 2.0e-3 * (fy / Math.sqrt(3)); // ~410 kN
      const capacityN = 4.03e-3 * fy; // ~1430 kN
      return { capacityM: Math.round(capacityM), capacityV: Math.round(capacityV), capacityN: Math.round(capacityN) };
    }

    // Generic default
    return { capacityM: 250, capacityV: 400, capacityN: 1800 };
  }

  private static resolveStatus(utilization: number): 'Safe' | 'Moderate' | 'Critical' | 'Overstressed' {
    if (utilization > 1.0) return 'Overstressed';
    if (utilization >= 0.90) return 'Critical';
    if (utilization >= 0.70) return 'Moderate';
    return 'Safe';
  }
}
