import {
  CompositeColumnDefinition,
  ColumnBoundaryConditions,
} from './CompositeColumnModels';
import {
  CompositeAxialBucklingEngine,
  ColumnBucklingResult,
} from './CompositeAxialBucklingEngine';

export interface InteractionPoint {
  pointId: 'A' | 'B' | 'C' | 'D';
  description: string;
  axialForceP: number; // kN
  momentM: number; // kNm
}

export interface PlasticEnvelopeResult {
  nominalPoints: InteractionPoint[];
  designPointsAisc: InteractionPoint[]; // Scaled by phi (phi_c = 0.75, phi_b = 0.90)
  designPointsEc4: InteractionPoint[];
  plasticMomentX: number; // kNm
  plasticMomentY: number; // kNm
}

export interface AppliedColumnLoads {
  /** Factored axial compression Pu (kN) */
  factoredAxialPu: number;
  /** Factored strong-axis bending moment Mux (kNm) */
  factoredMomentMux: number;
  /** Factored weak-axis bending moment Muy (kNm) */
  factoredMomentMuy?: number;
}

export interface ColumnInteractionCheckResult {
  buckling: ColumnBucklingResult;
  envelope: PlasticEnvelopeResult;
  appliedLoads: {
    pu: number;
    mux: number;
    muy: number;
  };
  axialUtilization: number;
  momentXUtilization: number;
  momentYUtilization: number;
  combinedUtilizationAisc: number;
  isPassing: boolean;
  governingCheckText: string;
}

/**
 * CompositeInteractionEngine constructs the 4-point plastic P-M interaction diagram
 * (Points A, B, C, D) and performs AISC 360-22 Section H1 / Eurocode 4 combined
 * axial-flexural utilization audits.
 */
export class CompositeInteractionEngine {
  /**
   * Calculate plastic flexural capacities (Mpx, Mpy) of the composite column section.
   */
  public static calculatePlasticMoments(
    column: CompositeColumnDefinition
  ): { mpx: number; mpy: number } {
    if (column.type === 'rectangular_cft') {
      const B = column.widthB;
      const H = column.depthH;
      const t = column.wallThickness;
      const Fy = column.steelYieldStrength;
      const fc = column.concreteStrengthFc;

      const bInner = Math.max(1, B - 2 * t);
      const hInner = Math.max(1, H - 2 * t);

      // Strong-axis plastic modulus
      const Zsx = (B * Math.pow(H, 2) - bInner * Math.pow(hInner, 2)) / 4;
      const Zcx = (bInner * Math.pow(hInner, 2)) / 4;
      // Weak-axis plastic modulus
      const Zsy = (H * Math.pow(B, 2) - hInner * Math.pow(bInner, 2)) / 4;
      const Zcy = (hInner * Math.pow(bInner, 2)) / 4;

      // Mpx = Zs*Fy + 0.5*Zc*(0.85*f'c) (kN*m)
      const mpx = (Zsx * Fy + 0.5 * Zcx * 0.85 * fc) / 1e6;
      const mpy = (Zsy * Fy + 0.5 * Zcy * 0.85 * fc) / 1e6;

      return {
        mpx: Math.round(mpx * 10) / 10,
        mpy: Math.round(mpy * 10) / 10,
      };
    } else if (column.type === 'circular_cft') {
      const D = column.outerDiameter;
      const t = column.wallThickness;
      const Fy = column.steelYieldStrength;
      const fc = column.concreteStrengthFc;
      const dInner = Math.max(1, D - 2 * t);

      // Plastic section modulus of circular tube: Zs = (D^3 - dInner^3) / 6
      const Zs = (Math.pow(D, 3) - Math.pow(dInner, 3)) / 6;
      const Zc = Math.pow(dInner, 3) / 6;

      const mp = (Zs * Fy + 0.5 * Zc * 0.95 * fc) / 1e6;
      return {
        mpx: Math.round(mp * 10) / 10,
        mpy: Math.round(mp * 10) / 10,
      };
    } else {
      // Encased wide-flange
      const Fy = column.embeddedSteel.yieldStrength;
      const fc = column.concreteStrengthFc;
      const bc = column.concreteWidth;
      const hc = column.concreteDepth;

      // Steel core Zx (approx 1.15 * Sx if not directly given)
      const Zsx = 1.15 * (column.embeddedSteel.Ix / (column.embeddedSteel.depth / 2));
      const Zsy = 1.5 * (column.embeddedSteel.Iy / (column.embeddedSteel.flangeWidth / 2));

      // Gross concrete plastic modulus
      const Zcx = (bc * Math.pow(hc, 2)) / 4 - Zsx;
      const Zcy = (hc * Math.pow(bc, 2)) / 4 - Zsy;

      const mpx = (Zsx * Fy + 0.5 * Math.max(0, Zcx) * 0.85 * fc) / 1e6;
      const mpy = (Zsy * Fy + 0.5 * Math.max(0, Zcy) * 0.85 * fc) / 1e6;

      return {
        mpx: Math.round(mpx * 10) / 10,
        mpy: Math.round(mpy * 10) / 10,
      };
    }
  }

  /**
   * Build the 4-point plastic P-M interaction envelope.
   */
  public static generatePlasticEnvelope(
    column: CompositeColumnDefinition,
    bc: ColumnBoundaryConditions,
    axis: 'X' | 'Y' = 'X'
  ): PlasticEnvelopeResult {
    const buckling = CompositeAxialBucklingEngine.calculateAxialCapacity(column, bc);
    const geo = CompositeAxialBucklingEngine.calculateSectionGeometry(column);
    const moments = this.calculatePlasticMoments(column);
    const Mp = axis === 'X' ? moments.mpx : moments.mpy;

    const Pp0 = buckling.squashLoadPp0;
    const fc = column.concreteStrengthFc;
    const c2 = geo.c2Factor;

    // Point A: Pure axial compression
    const PA_nom = Pp0;
    const MA_nom = 0;

    // Point B: Pure plastic flexure at zero axial thrust
    const PB_nom = 0;
    const MB_nom = Mp;

    // Point C: Full concrete compression force, steel in pure bending
    // PC = C2 * f'c * Ac
    const PC_nom = (c2 * fc * geo.concreteArea) / 1000; // kN
    const MC_nom = Mp;

    // Point D: Halfway between Point A and Point C
    const PD_nom = (PA_nom + PC_nom) / 2;
    // Moment capacity at Point D: transition point, slightly reduced from Mp (~85%)
    const MD_nom = 0.88 * Mp;

    const nominalPoints: InteractionPoint[] = [
      { pointId: 'A', description: 'Pure Axial Squash Load', axialForceP: PA_nom, momentM: MA_nom },
      { pointId: 'D', description: 'Compression-Flexure Intermediate', axialForceP: PD_nom, momentM: MD_nom },
      { pointId: 'C', description: 'Balanced Concrete Thrust (Steel in Pure Flexure)', axialForceP: PC_nom, momentM: MC_nom },
      { pointId: 'B', description: 'Pure Plastic Moment (Zero Axial Force)', axialForceP: PB_nom, momentM: MB_nom },
    ];

    // AISC 360-22 LRFD Design Envelope (phi_c = 0.75, phi_b = 0.90)
    // Point A scaled by column buckling reduction Pn / Pp0
    const bucklingReduction = Pp0 > 0 ? buckling.nominalCompressiveStrengthPn / Pp0 : 1.0;
    const phiC = 0.75;
    const phiB = 0.90;

    const designPointsAisc: InteractionPoint[] = [
      {
        pointId: 'A',
        description: 'Design Axial Capacity phi_c * Pn',
        axialForceP: Math.round(buckling.aiscLrfdDesignCapacityPhiPn * 10) / 10,
        momentM: 0,
      },
      {
        pointId: 'D',
        description: 'Design Point D',
        axialForceP: Math.round(PD_nom * bucklingReduction * phiC * 10) / 10,
        momentM: Math.round(MD_nom * phiB * 10) / 10,
      },
      {
        pointId: 'C',
        description: 'Design Point C',
        axialForceP: Math.round(PC_nom * phiC * 10) / 10,
        momentM: Math.round(MC_nom * phiB * 10) / 10,
      },
      {
        pointId: 'B',
        description: 'Design Moment Capacity phi_b * Mp',
        axialForceP: 0,
        momentM: Math.round(MB_nom * phiB * 10) / 10,
      },
    ];

    // Eurocode 4 design envelope
    const ec4Chi = buckling.eurocodeDesignResistanceNbRd / (buckling.squashLoadPp0 || 1.0);
    const designPointsEc4: InteractionPoint[] = [
      {
        pointId: 'A',
        description: 'Eurocode Design Resistance Nb,Rd',
        axialForceP: Math.round(buckling.eurocodeDesignResistanceNbRd * 10) / 10,
        momentM: 0,
      },
      {
        pointId: 'D',
        description: 'EC4 Point D',
        axialForceP: Math.round(PD_nom * ec4Chi * 10) / 10,
        momentM: Math.round(MD_nom * 10) / 10,
      },
      {
        pointId: 'C',
        description: 'EC4 Point C',
        axialForceP: Math.round(PC_nom * 10) / 10,
        momentM: Math.round(MC_nom * 10) / 10,
      },
      {
        pointId: 'B',
        description: 'EC4 Point B (MRd)',
        axialForceP: 0,
        momentM: Math.round(MB_nom * 10) / 10,
      },
    ];

    return {
      nominalPoints,
      designPointsAisc,
      designPointsEc4,
      plasticMomentX: moments.mpx,
      plasticMomentY: moments.mpy,
    };
  }

  /**
   * Verify combined axial-flexural loading per AISC 360-22 Section H1.
   */
  public static verifyInteraction(
    column: CompositeColumnDefinition,
    bc: ColumnBoundaryConditions,
    applied: AppliedColumnLoads
  ): ColumnInteractionCheckResult {
    const buckling = CompositeAxialBucklingEngine.calculateAxialCapacity(column, bc);
    const envelope = this.generatePlasticEnvelope(column, bc, 'X');

    const Pu = applied.factoredAxialPu;
    const Mux = applied.factoredMomentMux;
    const Muy = applied.factoredMomentMuy ?? 0;

    const phiPn = buckling.aiscLrfdDesignCapacityPhiPn;
    const phiMnx = 0.9 * envelope.plasticMomentX;
    const phiMny = 0.9 * envelope.plasticMomentY;

    const axialRatio = phiPn > 0 ? Pu / phiPn : 0;
    const momentXRatio = phiMnx > 0 ? Mux / phiMnx : 0;
    const momentYRatio = phiMny > 0 ? Muy / phiMny : 0;

    // AISC 360-22 Eq. H1-1a and H1-1b
    let combinedRatio = 0;
    if (axialRatio >= 0.2) {
      combinedRatio = axialRatio + (8 / 9) * (momentXRatio + momentYRatio);
    } else {
      combinedRatio = axialRatio / 2 + (momentXRatio + momentYRatio);
    }

    const isPassing = combinedRatio <= 1.0;
    let governingText = `AISC Eq. H1: Combined interaction ${(combinedRatio * 100).toFixed(1)}% <= 100% (PASS)`;
    if (!isPassing) {
      governingText = `FAIL: Combined interaction ratio exceeds 1.00 (${(combinedRatio * 100).toFixed(1)}%)`;
    }

    return {
      buckling,
      envelope,
      appliedLoads: {
        pu: Pu,
        mux: Mux,
        muy: Muy,
      },
      axialUtilization: Math.round(axialRatio * 1000) / 1000,
      momentXUtilization: Math.round(momentXRatio * 1000) / 1000,
      momentYUtilization: Math.round(momentYRatio * 1000) / 1000,
      combinedUtilizationAisc: Math.round(combinedRatio * 1000) / 1000,
      isPassing,
      governingCheckText: governingText,
    };
  }
}
