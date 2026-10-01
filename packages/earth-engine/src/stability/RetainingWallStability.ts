/**
 * Cantilever and Gravity Retaining Wall Stability Analysis Engine
 * Evaluates Overturning, Sliding, Bearing Eccentricity, and Stem Design
 * @packageDocumentation
 */

import { SoilLayer, GroundWaterTable, SurchargeLoad } from '../types';
import { LateralEarthPressureEngine } from '../pressures/LateralEarthPressure';

export interface WallDimensions {
  height: number; // m total height above base slab
  baseThickness: number; // m thickness of base foundation slab
  stemTopWidth: number; // m
  stemBottomWidth: number; // m
  toeWidth: number; // m
  heelWidth: number; // m
  soilDepthOverToe?: number; // m (embedment depth Df)
  concreteUnitWeight?: number; // kN/m³, default 24
  shearKey?: {
    depth: number; // m
    width: number; // m
    distanceFromToe: number; // m
  };
}

export interface WallStabilityResult {
  totalVerticalLoad: number; // kN/m
  totalResistingMoment: number; // kN·m/m about toe
  totalDrivingHorizontalForce: number; // kN/m
  totalOverturningMoment: number; // kN·m/m about toe
  safetyFactorOverturning: number; // FS_ot
  safetyFactorSliding: number; // FS_slide
  eccentricity: number; // m from base centerline (positive towards toe)
  kernLimit: number; // B / 6
  isWithinKern: boolean;
  bearingPressureToe: number; // kPa
  bearingPressureHeel: number; // kPa
  passiveResistanceToe: number; // kN/m
  stemBaseMoment: number; // kN·m/m
  stemBaseShear: number; // kN/m
  status: {
    overturningPass: boolean;
    slidingPass: boolean;
    bearingPass: boolean;
    eccentricityPass: boolean;
  };
}

export class RetainingWallStabilityEngine {
  /**
   * Perform comprehensive retaining wall stability and bearing capacity checks
   */
  public static analyzeStability(params: {
    wall: WallDimensions;
    backfillLayers: SoilLayer[];
    foundationSoil: SoilLayer;
    waterTable?: GroundWaterTable;
    surcharges?: SurchargeLoad[];
    allowableBearingCapacity: number; // kPa (q_all)
    minFSSliding?: number; // default 1.5
    minFSOverturning?: number; // default 2.0
    wallFrictionRatio?: number; // delta / phi, default 0.67
    baseAdhesionRatio?: number; // ca / c, default 0.5
  }): WallStabilityResult {
    const {
      wall,
      backfillLayers,
      foundationSoil,
      waterTable,
      surcharges = [],
      allowableBearingCapacity,
      minFSSliding = 1.5,
      minFSOverturning = 2.0,
      wallFrictionRatio = 0.67,
      baseAdhesionRatio = 0.5,
    } = params;

    const gammaC = wall.concreteUnitWeight ?? 24.0;
    const Hstem = wall.height;
    const tBase = wall.baseThickness;
    const Btoe = wall.toeWidth;
    const bTop = wall.stemTopWidth;
    const bBot = wall.stemBottomWidth;
    const Bheel = wall.heelWidth;
    const B = Btoe + bBot + Bheel;
    const Df = wall.soilDepthOverToe ?? 0.5;

    // Total height from base of foundation
    const Htotal = Hstem + tBase;

    // 1. Calculate Lateral Earth Pressures behind heel
    const topBackfill = backfillLayers[0] ?? {
      id: 'backfill',
      name: 'Backfill',
      depthTop: 0,
      depthBottom: Htotal,
      unitWeight: 18,
      frictionAngle: 30,
      cohesion: 0,
    };

    const deltaDeg = topBackfill.frictionAngle * wallFrictionRatio;

    const pressureResult = LateralEarthPressureEngine.analyze({
      wall: {
        height: Htotal,
        wallFrictionAngle: deltaDeg,
      },
      layers: backfillLayers,
      waterTable,
      surcharges,
      theory: 'coulomb',
    });

    // Active thrust components
    const deltaRad = (deltaDeg * Math.PI) / 180;
    const Pa = pressureResult.totalActiveForce;
    const Pah = Pa * Math.cos(deltaRad);
    const Pav = Pa * Math.sin(deltaRad);

    const Psh = pressureResult.totalSurchargeForce;
    const Pwh = pressureResult.totalWaterForce;

    // Driving Horizontal Force
    const totalDrivingH = Pah + Psh + Pwh;

    // Overturning Moment about Toe (Point O at bottom-left corner of base)
    const MotActive = Pah > 0 ? Pah * pressureResult.activeForceLineOfAction : 0;
    const MotSurcharge = Psh > 0 ? Psh * pressureResult.surchargeLineOfAction : 0;
    const MotWater = Pwh > 0 ? Pwh * pressureResult.waterLineOfAction : 0;
    const totalOverturningMoment = MotActive + MotSurcharge + MotWater;

    // 2. Weights and Resisting Moments about Toe (Point O)
    let totalVertical = 0;
    let totalResistingMoment = 0;

    // Helper to add component
    const addComponent = (weight: number, leverArm: number) => {
      totalVertical += weight;
      totalResistingMoment += weight * leverArm;
    };

    // Component W1: Base slab
    const wBase = B * tBase * gammaC;
    addComponent(wBase, B / 2);

    // Component W2: Rectangular portion of stem (top width)
    // Assuming stem front is battered or vertical. Standard cantilever: stem front vertical or battered.
    // Let's assume vertical front face for stem:
    const stemXFront = Btoe;
    const wStemRect = bTop * Hstem * gammaC;
    addComponent(wStemRect, stemXFront + bTop / 2);

    // Component W3: Triangular portion of stem (batter on back or front)
    if (bBot > bTop) {
      const bTri = bBot - bTop;
      const wStemTri = 0.5 * bTri * Hstem * gammaC;
      addComponent(wStemTri, stemXFront + bTop + (bTri / 3));
    }

    // Component W4: Soil on heel slab
    const gammaSoilBack = topBackfill.unitWeight;
    const wSoilHeel = Bheel * Hstem * gammaSoilBack;
    addComponent(wSoilHeel, B - Bheel / 2);

    // Component W5: Surcharge on heel (vertical load)
    for (const s of surcharges) {
      if (s.type === 'uniform') {
        const wSurHeel = s.magnitude * Bheel;
        addComponent(wSurHeel, B - Bheel / 2);
      }
    }

    // Component W6: Soil on toe (embedment Df)
    if (Df > 0) {
      const wSoilToe = Btoe * Df * topBackfill.unitWeight;
      addComponent(wSoilToe, Btoe / 2);
    }

    // Component W7: Shear key (if present)
    if (wall.shearKey) {
      const { depth: Dk, width: Bk, distanceFromToe: xk } = wall.shearKey;
      const wKey = Bk * Dk * gammaC;
      addComponent(wKey, xk + Bk / 2);
    }

    // Component W8: Vertical component of active thrust Pav acting at heel back (x = B)
    addComponent(Pav, B);

    // 3. Sliding Resistance
    const phiBaseRad = (foundationSoil.frictionAngle * Math.PI) / 180;
    const deltaBase = foundationSoil.frictionAngle * wallFrictionRatio;
    const deltaBaseRad = (deltaBase * Math.PI) / 180;
    const adhesion = foundationSoil.cohesion * baseAdhesionRatio;

    const baseFrictionForce = totalVertical * Math.tan(deltaBaseRad) + adhesion * B;

    // Passive resistance in front of toe:
    // Kp for foundation / toe soil
    const KpToe = Math.tan(Math.PI / 4 + phiBaseRad / 2) ** 2;
    const hPassive = Df + (wall.shearKey ? wall.shearKey.depth : 0);
    // Rankine passive resistance over hPassive (neglecting top 0.3m for frost/erosion if Df is shallow)
    const effectiveHPassive = Math.max(0, hPassive - 0.2);
    const Pp = 0.5 * foundationSoil.unitWeight * effectiveHPassive ** 2 * KpToe + 2 * foundationSoil.cohesion * Math.sqrt(KpToe) * effectiveHPassive;

    // Allowable total resisting force against sliding (apply 1/1.5 reduction factor on passive)
    const totalSlidingResistance = baseFrictionForce + Pp / 1.5;

    const FS_ot = totalOverturningMoment > 0 ? totalResistingMoment / totalOverturningMoment : 999;
    const FS_slide = totalDrivingH > 0 ? totalSlidingResistance / totalDrivingH : 999;

    // 4. Bearing Pressures & Eccentricity
    const Mnet = totalResistingMoment - totalOverturningMoment;
    const xResultant = totalVertical > 0 ? Mnet / totalVertical : B / 2;
    const eccentricity = B / 2 - xResultant;
    const kernLimit = B / 6;
    const isWithinKern = Math.abs(eccentricity) <= kernLimit;

    let qToe = 0;
    let qHeel = 0;

    if (isWithinKern) {
      qToe = (totalVertical / B) * (1 + (6 * eccentricity) / B);
      qHeel = (totalVertical / B) * (1 - (6 * eccentricity) / B);
    } else {
      // Resultant is outside middle third: tension develops at heel
      qToe = (2 * totalVertical) / (3 * Math.max(0.01, xResultant));
      qHeel = 0;
    }

    // 5. Stem Base Moment & Shear (for reinforced concrete stem design)
    const stemPressureResult = LateralEarthPressureEngine.analyze({
      wall: { height: Hstem },
      layers: backfillLayers,
      waterTable,
      surcharges,
      theory: 'rankine',
    });

    const stemBaseMoment = stemPressureResult.activeMomentAboutBase + stemPressureResult.totalSurchargeForce * stemPressureResult.surchargeLineOfAction;
    const stemBaseShear = stemPressureResult.totalActiveForce + stemPressureResult.totalSurchargeForce;

    return {
      totalVerticalLoad: totalVertical,
      totalResistingMoment,
      totalDrivingHorizontalForce: totalDrivingH,
      totalOverturningMoment,
      safetyFactorOverturning: FS_ot,
      safetyFactorSliding: FS_slide,
      eccentricity,
      kernLimit,
      isWithinKern,
      bearingPressureToe: qToe,
      bearingPressureHeel: qHeel,
      passiveResistanceToe: Pp,
      stemBaseMoment,
      stemBaseShear,
      status: {
        overturningPass: FS_ot >= minFSOverturning,
        slidingPass: FS_slide >= minFSSliding,
        bearingPass: qToe <= allowableBearingCapacity,
        eccentricityPass: isWithinKern,
      },
    };
  }
}
