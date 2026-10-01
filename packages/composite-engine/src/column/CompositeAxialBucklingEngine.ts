import {
  CompositeColumnDefinition,
  ColumnBoundaryConditions,
} from './CompositeColumnModels';

export interface SectionGeometryResult {
  steelArea: number; // mm^2
  concreteArea: number; // mm^2
  rebarArea: number; // mm^2
  totalArea: number; // mm^2
  steelIx: number; // mm^4
  steelIy: number; // mm^4
  concreteIx: number; // mm^4
  concreteIy: number; // mm^4
  c2Factor: number;
}

export interface ColumnBucklingResult {
  columnType: string;
  unbracedLengthM: number;
  effectiveLengthFactorK: number;
  steelAreaAs: number; // mm^2
  concreteAreaAc: number; // mm^2
  squashLoadPp0: number; // kN (P_p0)
  effectiveStiffnessEIeffX: number; // kN*m^2
  effectiveStiffnessEIeffY: number; // kN*m^2
  eulerBucklingLoadPeX: number; // kN
  eulerBucklingLoadPeY: number; // kN
  governingEulerLoadPe: number; // kN
  slendernessRatioPp0OverPe: number;
  nominalCompressiveStrengthPn: number; // kN
  aiscLrfdDesignCapacityPhiPn: number; // kN (phi = 0.75)
  aiscAsdAllowableCapacityPnOverOmega: number; // kN (Omega = 2.00)
  eurocodeDesignResistanceNbRd: number; // kN
  governingAxis: 'X' | 'Y';
}

/**
 * CompositeAxialBucklingEngine computes cross-section geometry, effective flexural stiffness,
 * Euler elastic buckling load, and nominal axial compressive strength
 * according to AISC 360-22 Section I2 and Eurocode 4 EN 1994-1-1 Section 6.7.
 */
export class CompositeAxialBucklingEngine {
  /**
   * Calculate geometric areas, moments of inertia, and concrete confinement factors.
   */
  public static calculateSectionGeometry(column: CompositeColumnDefinition): SectionGeometryResult {
    if (column.type === 'rectangular_cft') {
      const B = column.widthB;
      const H = column.depthH;
      const t = column.wallThickness;
      const bInner = Math.max(1, B - 2 * t);
      const hInner = Math.max(1, H - 2 * t);

      const Ag = B * H;
      const Ac = bInner * hInner;
      const As = Ag - Ac;

      const Isx = (B * Math.pow(H, 3) - bInner * Math.pow(hInner, 3)) / 12;
      const Isy = (H * Math.pow(B, 3) - hInner * Math.pow(bInner, 3)) / 12;
      const Icx = (bInner * Math.pow(hInner, 3)) / 12;
      const Icy = (hInner * Math.pow(bInner, 3)) / 12;

      return {
        steelArea: As,
        concreteArea: Ac,
        rebarArea: 0,
        totalArea: Ag,
        steelIx: Isx,
        steelIy: Isy,
        concreteIx: Icx,
        concreteIy: Icy,
        c2Factor: 0.85,
      };
    } else if (column.type === 'circular_cft') {
      const D = column.outerDiameter;
      const t = column.wallThickness;
      const dInner = Math.max(1, D - 2 * t);

      const Ag = (Math.PI * Math.pow(D, 2)) / 4;
      const Ac = (Math.PI * Math.pow(dInner, 2)) / 4;
      const As = Ag - Ac;

      const Is = (Math.PI * (Math.pow(D, 4) - Math.pow(dInner, 4))) / 64;
      const Ic = (Math.PI * Math.pow(dInner, 4)) / 64;

      return {
        steelArea: As,
        concreteArea: Ac,
        rebarArea: 0,
        totalArea: Ag,
        steelIx: Is,
        steelIy: Is,
        concreteIx: Ic,
        concreteIy: Ic,
        // AISC 360-22 Section I2.2b: C2 = 0.95 for round CFT due to hoop confinement
        c2Factor: 0.95,
      };
    } else {
      // Encased wide-flange column
      const bc = column.concreteWidth;
      const hc = column.concreteDepth;
      const Ag = bc * hc;
      const As = column.embeddedSteel.area;
      const Asr = column.rebar.areaTotal;
      const Ac = Math.max(0, Ag - As - Asr);

      const Isx = column.embeddedSteel.Ix;
      const Isy = column.embeddedSteel.Iy;
      const Irx = column.rebar.Ix;
      const Iry = column.rebar.Iy;

      const grossConcIx = (bc * Math.pow(hc, 3)) / 12;
      const grossConcIy = (hc * Math.pow(bc, 3)) / 12;
      const Icx = Math.max(0, grossConcIx - Isx - Irx);
      const Icy = Math.max(0, grossConcIy - Isy - Iry);

      return {
        steelArea: As,
        concreteArea: Ac,
        rebarArea: Asr,
        totalArea: Ag,
        steelIx: Isx,
        steelIy: Isy,
        concreteIx: Icx,
        concreteIy: Icy,
        c2Factor: 0.85,
      };
    }
  }

  /**
   * Determine nominal axial compressive strength Pn and design capacities.
   */
  public static calculateAxialCapacity(
    column: CompositeColumnDefinition,
    bc: ColumnBoundaryConditions
  ): ColumnBucklingResult {
    const geo = this.calculateSectionGeometry(column);
    const L = bc.unbracedLength; // m
    const K = bc.effectiveLengthFactor ?? 1.0;
    const KL_mm = K * L * 1000; // mm

    // Material strengths
    const Es =
      column.type === 'encased_wide_flange'
        ? column.embeddedSteel.elasticModulus
        : (column.steelElasticModulus ?? 200000);
    const Fy =
      column.type === 'encased_wide_flange'
        ? column.embeddedSteel.yieldStrength
        : column.steelYieldStrength;
    const fc = column.concreteStrengthFc;
    const Ec = 4700 * Math.sqrt(fc); // MPa (AISC normal weight)

    const Fyr = column.type === 'encased_wide_flange' ? column.rebar.yieldStrength : 0;

    // 1. Pure axial plastic squash load Pp0 (AISC 360-22 Section I2)
    // Pp0 = Fy * As + Fyr * Asr + C2 * f'c * Ac (N)
    const pp0N = Fy * geo.steelArea + Fyr * geo.rebarArea + geo.c2Factor * fc * geo.concreteArea;
    const Pp0 = pp0N / 1000; // kN

    // 2. Effective flexural stiffness (EI)eff (AISC 360-22 Eq. I2-6 / I2-14)
    // C1 = 0.6 + 2 * (As / (As + Ac)) <= 0.9 for filled
    // For encased: C1 = 0.1 + 2 * (As / (As + Ac)) <= 0.3
    let C1 = 0.8;
    if (column.type === 'rectangular_cft' || column.type === 'circular_cft') {
      C1 = Math.min(0.9, 0.6 + 2 * (geo.steelArea / (geo.steelArea + geo.concreteArea)));
    } else {
      C1 = Math.min(0.3, 0.1 + 2 * (geo.steelArea / (geo.steelArea + geo.concreteArea)));
    }

    const rebarIx = column.type === 'encased_wide_flange' ? column.rebar.Ix : 0;
    const rebarIy = column.type === 'encased_wide_flange' ? column.rebar.Iy : 0;

    // EI in N*mm^2
    const EIeffX_Nmm2 = Es * geo.steelIx + Es * rebarIx + C1 * Ec * geo.concreteIx;
    const EIeffY_Nmm2 = Es * geo.steelIy + Es * rebarIy + C1 * Ec * geo.concreteIy;

    // Convert to kN*m^2 (1 N*mm^2 = 1e-3 N * (1e-3 m)^2 = 1e-9 kN*m^2)
    const EIeffX = EIeffX_Nmm2 * 1e-9;
    const EIeffY = EIeffY_Nmm2 * 1e-9;

    // 3. Elastic Euler Buckling Load Pe
    // Pe = (pi^2 * EIeff) / (KL)^2 in N
    const peX_N = (Math.PI * Math.PI * EIeffX_Nmm2) / Math.pow(KL_mm, 2);
    const peY_N = (Math.PI * Math.PI * EIeffY_Nmm2) / Math.pow(KL_mm, 2);
    const PeX = peX_N / 1000; // kN
    const PeY = peY_N / 1000; // kN

    const governingPe = Math.min(PeX, PeY);
    const governingAxis: 'X' | 'Y' = PeX <= PeY ? 'X' : 'Y';

    // 4. AISC 360-22 Nominal Compressive Strength Pn (Eq. I2-2 and I2-3)
    const lambdaCol = governingPe > 0 ? Pp0 / governingPe : 999;
    let Pn = 0;
    if (lambdaCol <= 2.25) {
      Pn = Pp0 * Math.pow(0.658, lambdaCol);
    } else {
      Pn = 0.877 * governingPe;
    }

    // AISC LRFD and ASD capacities
    const phiPn = 0.75 * Pn; // LRFD phi = 0.75
    const pnOmega = Pn / 2.0; // ASD Omega = 2.00

    // 5. Eurocode 4 EN 1994-1-1 Clause 6.7.3.5
    // Plastic resistance Npl,Rd
    const gammaM0 = 1.0;
    const gammaS = 1.15;
    const gammaC = 1.5;
    const NplRd =
      (geo.steelArea * Fy) / (gammaM0 * 1000) +
      (geo.rebarArea * Fyr) / (gammaS * 1000) +
      (geo.concreteArea * fc) / (gammaC * 1000);

    // Relative slenderness lambda_bar = sqrt(Npl,Rk / Ncr)
    const NplRk = (geo.steelArea * Fy + geo.rebarArea * Fyr + geo.concreteArea * fc) / 1000;
    const Ncr = governingPe;
    const lambdaBar = Ncr > 0 ? Math.sqrt(NplRk / Ncr) : 1.0;

    // Buckling curve b (alpha = 0.34) for CFT, curve c (alpha = 0.49) for encased
    const alpha = column.type === 'encased_wide_flange' ? 0.49 : 0.34;
    const phiCurve = 0.5 * (1 + alpha * (lambdaBar - 0.2) + Math.pow(lambdaBar, 2));
    const chi = Math.min(
      1.0,
      1.0 / (phiCurve + Math.sqrt(Math.max(0, Math.pow(phiCurve, 2) - Math.pow(lambdaBar, 2))))
    );
    const NbRd = chi * NplRd;

    return {
      columnType: column.type,
      unbracedLengthM: L,
      effectiveLengthFactorK: K,
      steelAreaAs: Math.round(geo.steelArea),
      concreteAreaAc: Math.round(geo.concreteArea),
      squashLoadPp0: Math.round(Pp0 * 10) / 10,
      effectiveStiffnessEIeffX: Math.round(EIeffX * 10) / 10,
      effectiveStiffnessEIeffY: Math.round(EIeffY * 10) / 10,
      eulerBucklingLoadPeX: Math.round(PeX * 10) / 10,
      eulerBucklingLoadPeY: Math.round(PeY * 10) / 10,
      governingEulerLoadPe: Math.round(governingPe * 10) / 10,
      slendernessRatioPp0OverPe: Math.round(lambdaCol * 1000) / 1000,
      nominalCompressiveStrengthPn: Math.round(Pn * 10) / 10,
      aiscLrfdDesignCapacityPhiPn: Math.round(phiPn * 10) / 10,
      aiscAsdAllowableCapacityPnOverOmega: Math.round(pnOmega * 10) / 10,
      eurocodeDesignResistanceNbRd: Math.round(NbRd * 10) / 10,
      governingAxis,
    };
  }
}
