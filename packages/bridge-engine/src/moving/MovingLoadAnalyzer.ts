/**
 * @beamlab/bridge-engine - Moving Load Stepping & Critical Envelope Hunter
 * Traverses vehicular load trains along bridge superstructures to find governing maximum/minimum internal forces
 * and fatigue stress ranges compliant with AASHTO LRFD and Eurocode 1
 */

import { VehicularTrain, VehicularCatalog } from '../vehicles/VehicularCatalog.js';
import { InfluenceLineEngine } from '../influence/InfluenceLineEngine.js';

export interface CriticalActionRecord {
  value: number;                  // Maximum or minimum factored action (kNm for moment, kN for shear/reaction)
  stationM: number;               // Station along bridge where action occurs
  governingTruckHeadPositionM: number; // Front axle position yielding the peak response
  isReversedDirection: boolean;   // Whether truck was traversing backwards
  truckContributionKnOrKNm: number; // Raw truck action before dynamic impact
  laneContributionKnOrKNm: number;  // Accompanying lane load contribution
  dynamicAllowance: number;       // IM factor used (e.g. 0.33)
}

export interface StationEnvelopeResult {
  xM: number;
  maxMomentKNm: number;
  minMomentKNm: number;
  maxShearKn: number;
  minShearKn: number;
  fatigueMomentRangeKNm: number; // Delta M for fatigue limit state
  governingTruckHeadForMaxMomentM: number;
  governingTruckHeadForMaxShearM: number;
}

export interface MovingLoadAnalysisInput {
  spanLengthM: number;
  vehicle: VehicularTrain;
  stepSizeM?: number;             // Stepping increment (default 0.1 m)
  dynamicAllowanceOverride?: number; // Override dynamic load allowance (e.g. 0.33)
  includeLaneLoad?: boolean;      // Whether to apply lane load (default true if vehicle.hasAssociatedLaneLoad)
  numberOfStations?: number;      // Evaluation stations along span (default 21)
  bidirectional?: boolean;        // Evaluate both travel directions (default true)
  sectionModulusM3?: number;      // Optional elastic section modulus S_x (m^3) to compute fatigue stress range (MPa)
}

export interface MovingLoadEnvelopeResult {
  spanLengthM: number;
  vehicleName: string;
  dynamicAllowance: number;
  hasLaneLoad: boolean;
  laneLoadKnPerM: number;
  stations: StationEnvelopeResult[];
  governingMaxMoment: CriticalActionRecord;
  governingMinMoment: CriticalActionRecord;
  governingMaxShear: CriticalActionRecord;
  governingMinShear: CriticalActionRecord;
  governingMaxReactionLeft: CriticalActionRecord;
  governingMaxReactionRight: CriticalActionRecord;
  maxFatigueMomentRangeKNm: number;
  maxFatigueStressRangeMpa?: number;
}

export class MovingLoadAnalyzer {
  /**
   * Perform comprehensive moving load analysis across a simple-span bridge
   */
  public static analyzeSimpleSpan(input: MovingLoadAnalysisInput): MovingLoadEnvelopeResult {
    const L = input.spanLengthM;
    const vehicle = input.vehicle;
    const stepSize = Math.max(0.02, input.stepSizeM ?? 0.1);
    const numStations = Math.max(5, input.numberOfStations ?? 21);
    const dynamicAllowance = input.dynamicAllowanceOverride ?? vehicle.dynamicLoadAllowance;
    const includeLane = input.includeLaneLoad ?? vehicle.hasAssociatedLaneLoad;
    const laneLoad = includeLane ? vehicle.laneLoadKnPerM : 0;
    const bidirectional = input.bidirectional ?? true;

    // Extract axle configurations
    const normalOffsets = VehicularCatalog.getAxleOffsetsFromFront(vehicle);
    const normalLoads = vehicle.axles.map(a => a.loadKn);

    // Reversed axle configuration (if traveling in opposite direction)
    const reversedLoads = [...normalLoads].reverse();
    const truckLength = vehicle.overallLengthM;
    const reversedOffsets: number[] = [0];
    let runningDist = 0;
    const reversedSpacings = [...vehicle.axles.map(a => a.spacingToNextM).slice(0, -1)].reverse();
    for (let i = 0; i < reversedSpacings.length; i++) {
      runningDist += reversedSpacings[i];
      reversedOffsets.push(runningDist);
    }

    const configurations = [
      { offsets: normalOffsets, loads: normalLoads, isReversed: false },
    ];
    if (bidirectional && vehicle.axles.length > 1) {
      configurations.push({ offsets: reversedOffsets, loads: reversedLoads, isReversed: true });
    }

    // Initialize tracking variables
    let maxMomentRec: CriticalActionRecord = {
      value: -Infinity,
      stationM: 0,
      governingTruckHeadPositionM: 0,
      isReversedDirection: false,
      truckContributionKnOrKNm: 0,
      laneContributionKnOrKNm: 0,
      dynamicAllowance,
    };

    let minMomentRec: CriticalActionRecord = {
      value: Infinity,
      stationM: 0,
      governingTruckHeadPositionM: 0,
      isReversedDirection: false,
      truckContributionKnOrKNm: 0,
      laneContributionKnOrKNm: 0,
      dynamicAllowance,
    };

    let maxShearRec: CriticalActionRecord = {
      value: -Infinity,
      stationM: 0,
      governingTruckHeadPositionM: 0,
      isReversedDirection: false,
      truckContributionKnOrKNm: 0,
      laneContributionKnOrKNm: 0,
      dynamicAllowance,
    };

    let minShearRec: CriticalActionRecord = {
      value: Infinity,
      stationM: 0,
      governingTruckHeadPositionM: 0,
      isReversedDirection: false,
      truckContributionKnOrKNm: 0,
      laneContributionKnOrKNm: 0,
      dynamicAllowance,
    };

    const stationResults: StationEnvelopeResult[] = [];
    let maxFatigueRange = 0;

    // Also prepare fatigue truck for fatigue range assessment
    const fatigueTruck = VehicularCatalog.getAashtoFatigueTruck();
    const fatigueOffsets = VehicularCatalog.getAxleOffsetsFromFront(fatigueTruck);
    const fatigueLoads = fatigueTruck.axles.map(a => a.loadKn);

    const stationDx = L / (numStations - 1);

    for (let s = 0; s < numStations; s++) {
      const x0 = s * stationDx;

      const ilMoment = InfluenceLineEngine.generateSimpleSpanInfluenceLine({
        spanLengthM: L,
        actionType: 'moment',
        evaluationStationM: x0,
      });

      const ilShear = InfluenceLineEngine.generateSimpleSpanInfluenceLine({
        spanLengthM: L,
        actionType: 'shear',
        evaluationStationM: x0,
      });

      // Lane load contribution
      const laneMoment = ilMoment.calculateLaneResponse(laneLoad, 'max-positive');
      const laneShearPos = ilShear.calculateLaneResponse(laneLoad, 'max-positive');
      const laneShearNeg = ilShear.calculateLaneResponse(laneLoad, 'max-negative');

      let stnMaxMoment = -Infinity;
      let stnMinMoment = Infinity;
      let stnMaxShear = -Infinity;
      let stnMinShear = Infinity;
      let govHeadForM = 0;
      let govHeadForV = 0;

      // Fatigue tracking for this station
      let stnFatigueMaxM = 0;
      let stnFatigueMinM = 0;

      // Step truck across span: head starts at -truckLength and ends at L + truckLength
      const minHead = -truckLength;
      const maxHead = L + truckLength;
      const numSteps = Math.ceil((maxHead - minHead) / stepSize) + 1;

      for (const config of configurations) {
        for (let step = 0; step < numSteps; step++) {
          const xHead = minHead + step * stepSize;

          // Calculate current axle positions: x_i = xHead - offset_i
          const currentAxlePositions = config.offsets.map(off => xHead - off);

          // Evaluate raw truck moment and shear
          const truckM = ilMoment.calculateVehicleResponse(currentAxlePositions, config.loads);
          const truckVPosRaw = ilShear.calculateVehicleResponse(currentAxlePositions, config.loads, 'positive');
          const truckVNegRaw = ilShear.calculateVehicleResponse(currentAxlePositions, config.loads, 'negative');

          // Factored with dynamic allowance (1 + IM)
          const totalM = truckM * (1 + dynamicAllowance) + laneMoment;
          const totalVPos = (truckVPosRaw > 0 ? truckVPosRaw * (1 + dynamicAllowance) : truckVPosRaw) + laneShearPos;
          const totalVNeg = (truckVNegRaw < 0 ? truckVNegRaw * (1 + dynamicAllowance) : truckVNegRaw) + laneShearNeg;

          if (totalM > stnMaxMoment) {
            stnMaxMoment = totalM;
            govHeadForM = xHead;
            if (totalM > maxMomentRec.value) {
              maxMomentRec = {
                value: totalM,
                stationM: x0,
                governingTruckHeadPositionM: xHead,
                isReversedDirection: config.isReversed,
                truckContributionKnOrKNm: truckM,
                laneContributionKnOrKNm: laneMoment,
                dynamicAllowance,
              };
            }
          }

          if (totalM < stnMinMoment) {
            stnMinMoment = totalM;
            if (totalM < minMomentRec.value) {
              minMomentRec = {
                value: totalM,
                stationM: x0,
                governingTruckHeadPositionM: xHead,
                isReversedDirection: config.isReversed,
                truckContributionKnOrKNm: truckM,
                laneContributionKnOrKNm: 0,
                dynamicAllowance,
              };
            }
          }

          if (totalVPos > stnMaxShear) {
            stnMaxShear = totalVPos;
            govHeadForV = xHead;
            if (totalVPos > maxShearRec.value) {
              maxShearRec = {
                value: totalVPos,
                stationM: x0,
                governingTruckHeadPositionM: xHead,
                isReversedDirection: config.isReversed,
                truckContributionKnOrKNm: truckVPosRaw,
                laneContributionKnOrKNm: laneShearPos,
                dynamicAllowance,
              };
            }
          }

          if (totalVNeg < stnMinShear) {
            stnMinShear = totalVNeg;
            if (totalVNeg < minShearRec.value) {
              minShearRec = {
                value: totalVNeg,
                stationM: x0,
                governingTruckHeadPositionM: xHead,
                isReversedDirection: config.isReversed,
                truckContributionKnOrKNm: truckVNegRaw,
                laneContributionKnOrKNm: laneShearNeg,
                dynamicAllowance,
              };
            }
          }
        }
      }

      // Step fatigue truck (single truck, no lane load, IM = 0.15)
      for (let step = 0; step < numSteps; step++) {
        const xHead = minHead + step * stepSize;
        const currentAxlePositions = fatigueOffsets.map(off => xHead - off);
        const fatM = ilMoment.calculateVehicleResponse(currentAxlePositions, fatigueLoads) * (1 + 0.15);
        if (fatM > stnFatigueMaxM) stnFatigueMaxM = fatM;
        if (fatM < stnFatigueMinM) stnFatigueMinM = fatM;
      }

      const stnFatigueRange = Math.max(0, stnFatigueMaxM - stnFatigueMinM);
      if (stnFatigueRange > maxFatigueRange) {
        maxFatigueRange = stnFatigueRange;
      }

      stationResults.push({
        xM: x0,
        maxMomentKNm: Math.max(0, stnMaxMoment),
        minMomentKNm: Math.min(0, stnMinMoment),
        maxShearKn: Math.max(0, stnMaxShear),
        minShearKn: Math.min(0, stnMinShear),
        fatigueMomentRangeKNm: stnFatigueRange,
        governingTruckHeadForMaxMomentM: govHeadForM,
        governingTruckHeadForMaxShearM: govHeadForV,
      });
    }

    // Reaction calculations at x = 0 (left) and x = L (right)
    const ilRA = InfluenceLineEngine.generateSimpleSpanInfluenceLine({
      spanLengthM: L,
      actionType: 'reaction',
      evaluationStationM: 0,
    });
    const ilRB = InfluenceLineEngine.generateSimpleSpanInfluenceLine({
      spanLengthM: L,
      actionType: 'reaction',
      evaluationStationM: L,
    });

    let maxRA = 0;
    let govHeadRA = 0;
    let maxRB = 0;
    let govHeadRB = 0;

    const minHead = -truckLength;
    const maxHead = L + truckLength;
    const numSteps = Math.ceil((maxHead - minHead) / stepSize) + 1;

    for (const config of configurations) {
      for (let step = 0; step < numSteps; step++) {
        const xHead = minHead + step * stepSize;
        const currentAxlePositions = config.offsets.map(off => xHead - off);
        const rA = ilRA.calculateVehicleResponse(currentAxlePositions, config.loads);
        const rB = ilRB.calculateVehicleResponse(currentAxlePositions, config.loads);

        if (rA > maxRA) {
          maxRA = rA;
          govHeadRA = xHead;
        }
        if (rB > maxRB) {
          maxRB = rB;
          govHeadRB = xHead;
        }
      }
    }

    const laneRA = ilRA.calculateLaneResponse(laneLoad, 'max-positive');
    const laneRB = ilRB.calculateLaneResponse(laneLoad, 'max-positive');

    const governingLeftReaction: CriticalActionRecord = {
      value: maxRA * (1 + dynamicAllowance) + laneRA,
      stationM: 0,
      governingTruckHeadPositionM: govHeadRA,
      isReversedDirection: false,
      truckContributionKnOrKNm: maxRA,
      laneContributionKnOrKNm: laneRA,
      dynamicAllowance,
    };

    const governingRightReaction: CriticalActionRecord = {
      value: maxRB * (1 + dynamicAllowance) + laneRB,
      stationM: L,
      governingTruckHeadPositionM: govHeadRB,
      isReversedDirection: false,
      truckContributionKnOrKNm: maxRB,
      laneContributionKnOrKNm: laneRB,
      dynamicAllowance,
    };

    let maxFatigueStressRangeMpa: number | undefined;
    if (input.sectionModulusM3 && input.sectionModulusM3 > 0) {
      // Delta f = Delta M / S_x in MPa: Delta M (kNm) / S_x (m^3) / 1000 = MPa
      maxFatigueStressRangeMpa = (maxFatigueRange / input.sectionModulusM3) / 1000;
    }

    return {
      spanLengthM: L,
      vehicleName: vehicle.name,
      dynamicAllowance,
      hasLaneLoad: includeLane,
      laneLoadKnPerM: laneLoad,
      stations: stationResults,
      governingMaxMoment: maxMomentRec,
      governingMinMoment: minMomentRec,
      governingMaxShear: maxShearRec,
      governingMinShear: minShearRec,
      governingMaxReactionLeft: governingLeftReaction,
      governingMaxReactionRight: governingRightReaction,
      maxFatigueMomentRangeKNm: maxFatigueRange,
      maxFatigueStressRangeMpa,
    };
  }
}
