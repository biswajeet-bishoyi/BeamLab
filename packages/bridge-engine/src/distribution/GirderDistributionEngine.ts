/**
 * @beamlab/bridge-engine - AASHTO LRFD Girder Live Load Distribution Factors (LLDF) & Skew Engine
 * Compliant with AASHTO LRFD Bridge Design Specifications (Section 4.6.2.2)
 */

export interface BridgeSuperstructureProperties {
  spanLengthM: number;            // Bridge span length L (m)
  girderSpacingM: number;         // Center-to-center girder spacing S (m)
  slabThicknessMm: number;        // Structural deck slab thickness t_s (mm)
  numberOfGirders: number;        // Total number of parallel girders N_g >= 3
  girderAreaM2: number;           // Girder cross-sectional area A (m^2)
  girderMomentOfInertiaM4: number; // Girder strong-axis moment of inertia I_x (m^4)
  girderDepthMm: number;          // Total depth of bare girder d (mm)
  deckConcreteFcMpa: number;      // Deck concrete compressive strength f'c (MPa)
  girderModulusGpa: number;       // Girder Young's modulus E_g (GPa)
  overhangWidthM: number;         // Deck overhang from exterior girder centerline to barrier curb (m)
  distanceDeM?: number;           // Distance from exterior web of exterior girder to barrier face (m)
  skewAngleDeg?: number;          // Angle of support skew from normal theta (degrees)
}

export interface GirderDistributionResult {
  spanLengthM: number;
  girderSpacingM: number;
  numberOfGirders: number;
  skewAngleDeg: number;
  modularRatioN: number;
  eccentricityEgMm: number;
  longitudinalStiffnessKgM4: number;
  stiffnessParameterKgTerm: number; // (Kg / (L * ts^3))^0.1
  // Interior Girder Factors (lanes/girder)
  momentInteriorOneLane: number;
  momentInteriorMultiLane: number;
  governingMomentInterior: number;
  shearInteriorOneLane: number;
  shearInteriorMultiLane: number;
  governingShearInterior: number;
  // Exterior Girder Factors
  momentExteriorOneLane: number;
  momentExteriorMultiLane: number;
  governingMomentExterior: number;
  shearExteriorOneLane: number;
  shearExteriorMultiLane: number;
  governingShearExterior: number;
  // Skew Corrections
  skewCorrectionFactorMoment: number;
  skewCorrectionFactorShear: number;
  // Final Skew-Adjusted Factors
  designMomentFactorInterior: number;
  designShearFactorInterior: number;
  designMomentFactorExterior: number;
  designShearFactorExterior: number;
}

export class GirderDistributionEngine {
  /**
   * Compute AASHTO LRFD Section 4.6.2.2 Live Load Distribution Factors
   */
  public static calculateDistributionFactors(props: BridgeSuperstructureProperties): GirderDistributionResult {
    const L = props.spanLengthM;
    const S = props.girderSpacingM;
    const tsMm = props.slabThicknessMm;
    const tsM = tsMm / 1000.0;
    const skewDeg = Math.max(0, Math.min(60, props.skewAngleDeg ?? 0));
    const de = props.distanceDeM ?? (props.overhangWidthM - 0.4); // typical barrier width 0.4 m

    // Concrete modulus: E_c = 4700 * sqrt(f'c) in MPa -> GPa
    const EdeckGpa = (4700 * Math.sqrt(props.deckConcreteFcMpa)) / 1000.0;
    const modularRatioN = Math.max(0.5, props.girderModulusGpa / EdeckGpa);

    // Distance between centers of gravity of girder and slab:
    // e_g = (girderDepth / 2) + (slabThickness / 2) in mm
    const egMm = (props.girderDepthMm / 2) + (tsMm / 2);
    const egM = egMm / 1000.0;

    // Longitudinal stiffness parameter: K_g = n * (I + A * e_g^2) in m^4
    const KgM4 = modularRatioN * (props.girderMomentOfInertiaM4 + props.girderAreaM2 * Math.pow(egM, 2));

    // Non-dimensional term: (K_g / (L * t_s^3))^0.1
    const rawKgTerm = KgM4 / (L * Math.pow(tsM, 3));
    const kgTerm = Math.pow(Math.max(0.1, rawKgTerm), 0.1);

    // 1. Interior Girder Bending Moment (AASHTO Table 4.6.2.2.2b-1)
    // One design lane loaded: g_m1 = 0.06 + (S / 4.3)^0.4 * (S / L)^0.3 * (Kg / (L * ts^3))^0.1
    const gm1 = 0.06 + Math.pow(S / 4.3, 0.4) * Math.pow(S / L, 0.3) * kgTerm;

    // Two or more design lanes loaded: g_m2 = 0.075 + (S / 2.9)^0.6 * (S / L)^0.2 * kgTerm
    const gm2 = 0.075 + Math.pow(S / 2.9, 0.6) * Math.pow(S / L, 0.2) * kgTerm;

    const govGmInt = Math.max(gm1, gm2);

    // 2. Interior Girder Shear (AASHTO Table 4.6.2.2.3a-1)
    // One design lane loaded: g_v1 = 0.36 + (S / 7.6)
    const gv1 = 0.36 + (S / 7.6);

    // Two or more design lanes loaded: g_v2 = 0.2 + (S / 3.6) - (S / 10.7)^2.0
    const gv2 = 0.2 + (S / 3.6) - Math.pow(S / 10.7, 2.0);

    const govGvInt = Math.max(gv1, gv2);

    // 3. Exterior Girder Bending Moment (AASHTO Table 4.6.2.2.2d-1)
    // One lane: Lever rule approximation:
    // Distance from exterior girder to wheel 1 = de - 0.6m. Lever arm = (S + de - 0.6) / S
    const wheelArm1 = (S + de - 0.6) / S;
    const wheelArm2 = (S + de - 0.6 - 1.8) / S; // 1.8m track width
    const leverRuleOneLane = Math.max(0.4, 0.5 * (Math.max(0, wheelArm1) + Math.max(0, wheelArm2)) * 1.20); // with m = 1.20
    const gmExt1 = leverRuleOneLane;

    // Two or more lanes: g_ext = e * g_int where e = 0.77 + de / 2.8
    const eFactorM = Math.max(0.6, 0.77 + de / 2.8);
    const gmExt2 = eFactorM * gm2;

    const govGmExt = Math.max(gmExt1, gmExt2);

    // 4. Exterior Girder Shear (AASHTO Table 4.6.2.2.3b-1)
    const gvExt1 = leverRuleOneLane;
    const eFactorV = Math.max(0.6, 0.60 + de / 3.0);
    const gvExt2 = eFactorV * gv2;

    const govGvExt = Math.max(gvExt1, gvExt2);

    // 5. Skew Angle Correction Factors (AASHTO Table 4.6.2.2.2e-1 & 4.6.2.2.3c-1)
    let skewFactorM = 1.0;
    let skewFactorV = 1.0;

    if (skewDeg > 0) {
      const thetaRad = (skewDeg * Math.PI) / 180.0;
      const tanTheta = Math.tan(thetaRad);

      // Moment skew reduction: 1 - c1 * (tan theta)^1.5 where c1 = 0.25 * (Kg / (L * ts^3))^0.25 * (S / L)^0.5
      const c1 = 0.25 * Math.pow(Math.max(0.1, rawKgTerm), 0.25) * Math.pow(S / L, 0.5);
      skewFactorM = Math.max(0.70, Math.min(1.0, 1.0 - c1 * Math.pow(tanTheta, 1.5)));

      // Shear skew amplification at obtuse corner: 1 + 0.20 * (L * ts^3 / Kg)^0.1 * sqrt(tan theta)
      const invKgTerm = Math.pow(Math.max(0.01, 1.0 / rawKgTerm), 0.1);
      skewFactorV = Math.max(1.0, Math.min(1.40, 1.0 + 0.20 * invKgTerm * Math.sqrt(tanTheta)));
    }

    return {
      spanLengthM: L,
      girderSpacingM: S,
      numberOfGirders: props.numberOfGirders,
      skewAngleDeg: skewDeg,
      modularRatioN: Math.round(modularRatioN * 100) / 100,
      eccentricityEgMm: Math.round(egMm * 10) / 10,
      longitudinalStiffnessKgM4: Math.round(KgM4 * 10000) / 10000,
      stiffnessParameterKgTerm: Math.round(kgTerm * 1000) / 1000,
      momentInteriorOneLane: Math.round(gm1 * 1000) / 1000,
      momentInteriorMultiLane: Math.round(gm2 * 1000) / 1000,
      governingMomentInterior: Math.round(govGmInt * 1000) / 1000,
      shearInteriorOneLane: Math.round(gv1 * 1000) / 1000,
      shearInteriorMultiLane: Math.round(gv2 * 1000) / 1000,
      governingShearInterior: Math.round(govGvInt * 1000) / 1000,
      momentExteriorOneLane: Math.round(gmExt1 * 1000) / 1000,
      momentExteriorMultiLane: Math.round(gmExt2 * 1000) / 1000,
      governingMomentExterior: Math.round(govGmExt * 1000) / 1000,
      shearExteriorOneLane: Math.round(gvExt1 * 1000) / 1000,
      shearExteriorMultiLane: Math.round(gvExt2 * 1000) / 1000,
      governingShearExterior: Math.round(govGvExt * 1000) / 1000,
      skewCorrectionFactorMoment: Math.round(skewFactorM * 1000) / 1000,
      skewCorrectionFactorShear: Math.round(skewFactorV * 1000) / 1000,
      designMomentFactorInterior: Math.round(govGmInt * skewFactorM * 1000) / 1000,
      designShearFactorInterior: Math.round(govGvInt * skewFactorV * 1000) / 1000,
      designMomentFactorExterior: Math.round(govGmExt * skewFactorM * 1000) / 1000,
      designShearFactorExterior: Math.round(govGvExt * skewFactorV * 1000) / 1000,
    };
  }
}
