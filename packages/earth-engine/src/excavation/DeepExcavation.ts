/**
 * Deep Excavation & Shoring Engine
 * Cantilever & Anchored Sheet Piles, Ground Tiebacks, and Peck Apparent Pressure Envelopes
 * @packageDocumentation
 */

import { SoilLayer } from '../types';
import { LateralEarthPressureEngine } from '../pressures/LateralEarthPressure';

export interface CantileverSheetPileResult {
  excavationDepth: number; // m
  calculatedEmbedmentDepth: number; // m (D_calc)
  designEmbedmentDepth: number; // m (D_design with safety factor 1.25)
  totalPileLength: number; // m (H + D_design)
  maxBendingMoment: number; // kN·m/m
  zeroShearDepth: number; // m below top
  requiredSectionModulus: number; // cm³/m (for specified yield strength fy)
  activePressureAtDredge: number; // kPa
  passivePressureAtBase: number; // kPa
}

export interface AnchoredSheetPileResult {
  excavationDepth: number; // m
  anchorDepthFromTop: number; // m (ha)
  calculatedEmbedmentDepth: number; // m
  designEmbedmentDepth: number; // m
  totalPileLength: number; // m
  anchorTensionForce: number; // kN/m
  maxSpanMoment: number; // kN·m/m
  zeroShearDepth: number; // m below top
  requiredSectionModulus: number; // cm³/m
  tieback: {
    inclinationAngle: number; // degrees
    designAnchorLoad: number; // kN (per anchor at given spacing)
    freeLength: number; // m (outside active wedge)
    bondLength: number; // m (in bond zone)
    totalTiebackLength: number; // m
  };
}

export interface PeckEnvelopeResult {
  excavationDepth: number; // m
  soilType: 'sand' | 'soft-medium-clay' | 'stiff-clay';
  apparentPressure: number; // kPa (peak envelope pressure sigma_a)
  strutLevels: number[]; // m depths from ground surface
  strutLoads: {
    level: number;
    depth: number;
    tributaryHeight: number; // m
    loadPerMeter: number; // kN/m
    designStrutLoad: number; // kN (for given strut horizontal spacing)
  }[];
  totalLateralLoad: number; // kN/m
}

export class DeepExcavationEngine {
  /**
   * Cantilever Sheet Pile Wall Design (Free earth support in granular / cohesive soil)
   */
  public static designCantileverSheetPile(params: {
    excavationDepth: number; // m (H)
    soil: SoilLayer;
    steelYieldStrength?: number; // MPa (e.g. 355 MPa)
    passiveSafetyFactor?: number; // default 1.5
  }): CantileverSheetPileResult {
    const { excavationDepth: H, soil, steelYieldStrength = 355, passiveSafetyFactor = 1.5 } = params;

    const phiRad = (soil.frictionAngle * Math.PI) / 180;
    const Ka = Math.tan(Math.PI / 4 - phiRad / 2) ** 2;
    const Kp = Math.tan(Math.PI / 4 + phiRad / 2) ** 2;
    const KpEff = Kp / passiveSafetyFactor; // Reduced passive coefficient

    const gamma = soil.unitWeight;

    // Active force behind wall over excavation depth H
    // Pa = 0.5 * Ka * gamma * H^2
    const Pa = 0.5 * Ka * gamma * H ** 2;
    const ya = H / 3; // distance from dredge line to Pa line of action

    // Solve for required embedment depth D such that passive moment about toe balances active moment
    // For net pressure method in sand: (KpEff - Ka) * gamma * D^3 / 6 ~= Pa * (ya + D)
    // We solve for D numerically using Brent's / Newton-Raphson method
    let D = H; // initial guess
    for (let iter = 0; iter < 50; iter++) {
      const netK = Math.max(0.1, KpEff - Ka);
      // M_net(D) = (netK * gamma * D^3) / 6 - Pa * (ya + D)
      const f = (netK * gamma * D ** 3) / 6 - Pa * (ya + D);
      const df = (netK * gamma * D ** 2) / 2 - Pa;
      const step = f / (df !== 0 ? df : 1);
      D -= step;
      if (Math.abs(step) < 1e-4) break;
    }
    D = Math.max(0.5, D);

    const Dcalc = D;
    const Ddesign = Math.ceil(Dcalc * 1.25 * 10) / 10; // 25% embedment increase
    const totalLength = H + Ddesign;

    // Point of zero shear occurs where net passive force equals Pa:
    // 0.5 * (KpEff - Ka) * gamma * z0^2 = Pa  ==> z0 from dredge line
    const netK = Math.max(0.1, KpEff - Ka);
    const z0 = Math.sqrt((2 * Pa) / (netK * gamma));
    const zeroShearDepth = H + z0;

    // Max bending moment at zero shear depth:
    // Mmax = Pa * (ya + z0) - (netK * gamma * z0^3) / 6
    const Mmax = Pa * (ya + z0) - (netK * gamma * z0 ** 3) / 6;

    // Required elastic section modulus: S = M / (0.66 * fy) in cm^3/m
    const allowableStressKPa = 0.66 * steelYieldStrength * 1000;
    const SreqM3 = Math.max(0, Mmax) / allowableStressKPa;
    const SreqCm3 = SreqM3 * 1e6; // convert m^3 to cm^3

    return {
      excavationDepth: H,
      calculatedEmbedmentDepth: Dcalc,
      designEmbedmentDepth: Ddesign,
      totalPileLength: totalLength,
      maxBendingMoment: Mmax,
      zeroShearDepth,
      requiredSectionModulus: SreqCm3,
      activePressureAtDredge: Ka * gamma * H,
      passivePressureAtBase: Kp * gamma * Ddesign,
    };
  }

  /**
   * Anchored Sheet Pile Wall Design (Free Earth Support method)
   */
  public static designAnchoredSheetPile(params: {
    excavationDepth: number; // m (H)
    anchorDepth: number; // m (ha from top of wall)
    soil: SoilLayer;
    anchorSpacing?: number; // m center-to-center (default 2.5m)
    anchorInclination?: number; // degrees (default 20°)
    groutHoleDiameter?: number; // m (default 0.15m)
    soilUltimateGroutFriction?: number; // kPa (default 120 kPa)
    steelYieldStrength?: number; // MPa (default 355)
    passiveSafetyFactor?: number; // default 1.5
    anchorSafetyFactor?: number; // default 2.0
  }): AnchoredSheetPileResult {
    const {
      excavationDepth: H,
      anchorDepth: ha,
      soil,
      anchorSpacing = 2.5,
      anchorInclination = 20,
      groutHoleDiameter = 0.15,
      soilUltimateGroutFriction = 120,
      steelYieldStrength = 355,
      passiveSafetyFactor = 1.5,
      anchorSafetyFactor = 2.0,
    } = params;

    const phiRad = (soil.frictionAngle * Math.PI) / 180;
    const Ka = Math.tan(Math.PI / 4 - phiRad / 2) ** 2;
    const Kp = Math.tan(Math.PI / 4 + phiRad / 2) ** 2;
    const KpEff = Kp / passiveSafetyFactor;
    const gamma = soil.unitWeight;

    // Iteratively determine embedment depth D such that moments about anchor point balance:
    // M_active(ha) = M_passive(ha)
    // Active pressure acts from z = 0 to H + D:
    // Passive pressure acts from z = H to H + D:
    let D = 0.5 * H;
    for (let iter = 0; iter < 50; iter++) {
      const Htot = H + D;
      // Active moment about anchor (anchor at depth ha):
      // sigma_a(z) = Ka * gamma * z. Lever arm about anchor = (z - ha).
      // Integral_0^Htot [ Ka*gamma*z * (z - ha) ] dz = Ka*gamma * [ Htot^3 / 3 - ha * Htot^2 / 2 ]
      const Mactive = Ka * gamma * (Htot ** 3 / 3 - (ha * Htot ** 2) / 2);

      // Passive moment about anchor:
      // sigma_p(z) = KpEff * gamma * (z - H). Lever arm = (z - ha).
      // Let y = z - H in [0, D]. z = H + y. Lever arm = (H - ha + y).
      // Integral_0^D [ KpEff*gamma*y * (H - ha + y) ] dy = KpEff*gamma * [ (H - ha) * D^2 / 2 + D^3 / 3 ]
      const Mpassive = KpEff * gamma * (((H - ha) * D ** 2) / 2 + D ** 3 / 3);

      const f = Mpassive - Mactive;
      // df/dD approximation
      const df = KpEff * gamma * ((H - ha) * D + D ** 2) - Ka * gamma * (Htot ** 2 - ha * Htot);
      const step = f / (df !== 0 ? df : 1);
      D -= step;
      if (Math.abs(step) < 1e-4) break;
    }
    D = Math.max(0.4 * H, D);

    const Dcalc = D;
    const Ddesign = Math.ceil(Dcalc * 1.2 * 10) / 10;
    const totalLength = H + Ddesign;

    // Anchor force T per linear meter from horizontal equilibrium:
    // Pa_tot = 0.5 * Ka * gamma * (H + Ddesign)^2
    // Pp_tot = 0.5 * KpEff * gamma * Ddesign^2
    // T = Pa_tot - Pp_tot
    const PaTot = 0.5 * Ka * gamma * (H + Ddesign) ** 2;
    const PpTot = 0.5 * KpEff * gamma * Ddesign ** 2;
    const anchorForcePerM = Math.max(10, PaTot - PpTot);

    // Max bending moment between anchor and dredge line:
    // At depth z between ha and H:
    // Shear V(z) = T - 0.5 * Ka * gamma * z^2 = 0 ==> z0 = sqrt(2 * T / (Ka * gamma))
    const z0 = Math.min(H, Math.max(ha, Math.sqrt((2 * anchorForcePerM) / (Ka * gamma))));
    // Moment at z0: M(z0) = T * (z0 - ha) - (Ka * gamma * z0^3) / 6
    const maxMoment = anchorForcePerM * (z0 - ha) - (Ka * gamma * z0 ** 3) / 6;

    // Required section modulus
    const allowableStressKPa = 0.66 * steelYieldStrength * 1000;
    const SreqCm3 = (Math.max(0, maxMoment) / allowableStressKPa) * 1e6;

    // Tieback Ground Anchor Design:
    const alphaRad = (anchorInclination * Math.PI) / 180;
    const anchorTensionPerAnchor = (anchorForcePerM * anchorSpacing) / Math.cos(alphaRad);
    const designAnchorLoad = anchorTensionPerAnchor * anchorSafetyFactor;

    // Bond length Lb in grout hole: Td = pi * d * Lb * tau_ult
    const bondCircumference = Math.PI * groutHoleDiameter;
    const bondLength = Math.max(3.0, Math.ceil((designAnchorLoad / (bondCircumference * soilUltimateGroutFriction)) * 10) / 10);

    // Free length Lf: distance through active failure wedge (inclined at 45 + phi/2)
    const wedgeAngleRad = Math.PI / 4 + phiRad / 2;
    const depthBelowAnchor = H - ha;
    const distToFailureSurface = depthBelowAnchor / Math.tan(wedgeAngleRad);
    const freeLength = Math.max(4.5, Math.ceil((distToFailureSurface / Math.cos(alphaRad) + 1.5) * 10) / 10);

    return {
      excavationDepth: H,
      anchorDepthFromTop: ha,
      calculatedEmbedmentDepth: Dcalc,
      designEmbedmentDepth: Ddesign,
      totalPileLength: totalLength,
      anchorTensionForce: anchorForcePerM,
      maxSpanMoment: maxMoment,
      zeroShearDepth: z0,
      requiredSectionModulus: SreqCm3,
      tieback: {
        inclinationAngle: anchorInclination,
        designAnchorLoad: anchorTensionPerAnchor,
        freeLength,
        bondLength,
        totalTiebackLength: freeLength + bondLength,
      },
    };
  }

  /**
   * Peck (1969) Apparent Earth Pressure Envelope & Strut Load Engine
   */
  public static calculatePeckEnvelope(params: {
    excavationDepth: number; // m (H)
    soil: SoilLayer;
    strutLevels: number[]; // m depths of struts from surface
    strutSpacing?: number; // m horizontal spacing (default 3.0m)
  }): PeckEnvelopeResult {
    const { excavationDepth: H, soil, strutLevels, strutSpacing = 3.0 } = params;

    const gamma = soil.unitWeight;
    const phi = soil.frictionAngle;
    const cu = soil.undrainedShearStrength ?? soil.cohesion;

    let soilType: 'sand' | 'soft-medium-clay' | 'stiff-clay' = 'sand';
    let apparentPressure = 0;

    if (phi > 25) {
      // Sand envelope: rectangular sigma_a = 0.65 * gamma * H * Ka
      soilType = 'sand';
      const phiRad = (phi * Math.PI) / 180;
      const Ka = Math.tan(Math.PI / 4 - phiRad / 2) ** 2;
      apparentPressure = 0.65 * gamma * H * Ka;
    } else {
      // Clay: stability number N = gamma * H / cu
      const stabilityNumber = cu > 0 ? (gamma * H) / cu : 10;
      if (stabilityNumber > 4) {
        // Soft to medium clay: sigma_a = max(0.2*gamma*H, gamma * H * (1 - 4 * cu / (gamma * H)))
        soilType = 'soft-medium-clay';
        const reduction = 1 - (4 * cu) / (gamma * H);
        apparentPressure = Math.max(0.2 * gamma * H, gamma * H * Math.max(0.2, reduction));
      } else {
        // Stiff fissured clay: 0.2 to 0.4 gamma * H, typically 0.3 gamma * H
        soilType = 'stiff-clay';
        apparentPressure = 0.3 * gamma * H;
      }
    }

    // Calculate tributary strut loads
    const sortedStruts = [...strutLevels].sort((a, b) => a - b);
    const strutLoads = sortedStruts.map((depth, idx) => {
      let tribTop = 0;
      let tribBottom = H;

      if (idx === 0) {
        tribTop = 0;
      } else {
        tribTop = 0.5 * (sortedStruts[idx - 1]! + depth);
      }

      if (idx === sortedStruts.length - 1) {
        tribBottom = H;
      } else {
        tribBottom = 0.5 * (depth + sortedStruts[idx + 1]!);
      }

      const tribHeight = Math.max(0, tribBottom - tribTop);
      const loadPerMeter = apparentPressure * tribHeight;
      const designStrutLoad = loadPerMeter * strutSpacing;

      return {
        level: idx + 1,
        depth,
        tributaryHeight: tribHeight,
        loadPerMeter,
        designStrutLoad,
      };
    });

    const totalLateralLoad = apparentPressure * H;

    return {
      excavationDepth: H,
      soilType,
      apparentPressure,
      strutLevels: sortedStruts,
      strutLoads,
      totalLateralLoad,
    };
  }
}
