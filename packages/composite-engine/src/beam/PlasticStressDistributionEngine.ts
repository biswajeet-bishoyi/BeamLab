import { CompositeSectionDefinition } from '../material/CompositeMaterialModel';

export type PnaLocationCase = 'in_slab' | 'in_top_flange' | 'in_web';

export interface PnaResult {
  locationCase: PnaLocationCase;
  /** Depth of concrete compression block a (mm) from top of slab */
  concreteBlockDepthA: number;
  /** Distance of PNA from top of steel flange (mm). 0 if PNA in slab */
  ypnaFromTopFlange: number;
  /** Distance of PNA from bottom of steel section (mm) */
  ypnaFromBottom: number;
  concreteCompressionCc: number; // kN
  steelCompressionCs: number; // kN
  steelTensionTs: number; // kN
}

export interface CompositeFlexureResult {
  eta: number; // Degree of composite action (0.25 to 1.0)
  pna: PnaResult;
  /** Plastic moment capacity Mp (kNm) */
  plasticMomentMp: number;
  /** AISC 360-22 LRFD design moment phi_b * Mp (phi = 0.90) (kNm) */
  aiscDesignMomentPhiMp: number;
  /** AISC 360-22 ASD allowable moment Mp / Omega_b (Omega = 1.67) (kNm) */
  aiscAllowableMomentMpOverOmega: number;
  /** Eurocode 4 design moment MRd = Mp / gamma_M0 (kNm) */
  ec4DesignMomentMrd: number;
  /** Bare steel plastic moment capacity Mp,steel = Zx * Fy (kNm) */
  bareSteelPlasticMoment: number;
  /** Composite moment gain over bare steel (%) */
  compositeCapacityGainPercent: number;
}

export interface PartialInteractionCurvePoint {
  eta: number;
  studsHalfSpan: number;
  plasticMomentMp: number; // kNm
  aiscPhiMp: number; // kNm
  pnaCase: PnaLocationCase;
}

/**
 * PlasticStressDistributionEngine computes the plastic neutral axis (PNA)
 * and plastic moment capacity Mp for composite beams under full or partial interaction
 * in accordance with AISC 360-22 Chapter I and Eurocode 4 EN 1994-1-1 Section 6.2.1.
 */
export class PlasticStressDistributionEngine {
  /**
   * Determine plastic moment capacity and PNA location for a given degree of composite action eta.
   */
  public static calculateFlexuralCapacity(
    section: CompositeSectionDefinition,
    effectiveWidth: number,
    eta: number = 1.0
  ): CompositeFlexureResult {
    const clampedEta = Math.min(1.0, Math.max(0.25, eta));

    const fc = section.concrete.fc; // MPa
    const tSlab = section.concrete.slabThickness; // mm (topping above deck)
    const hDeck = section.deck ? section.deck.ribDepth : 0; // mm

    const d = section.steel.depth; // mm
    const bf = section.steel.flangeWidth; // mm
    const tf = section.steel.flangeThickness; // mm
    const tw = section.steel.webThickness; // mm
    const As = section.steel.area; // mm^2
    const Fy = section.steel.yieldStrength; // MPa
    const Zx = section.steel.plasticModulusX ?? section.steel.sectionModulusX * 1.14; // mm^3

    // Bare steel capacity for comparison
    const bareMp = (Zx * Fy) / 1e6; // kNm

    // Maximum capacities
    const Cmax = 0.85 * fc * effectiveWidth * tSlab; // N
    const Tmax = As * Fy; // N

    // Transferred interface shear
    const Vprime = clampedEta * Math.min(Cmax, Tmax); // N

    // Slab compression
    const Cc = Vprime; // N
    const a = Math.min(tSlab, Cc / (0.85 * fc * effectiveWidth)); // mm

    let pnaCase: PnaLocationCase = 'in_slab';
    let ypnaFromTop = 0; // mm below top of steel flange
    let ypnaFromBottom = d;
    let Cs = 0; // N
    let Ts = Tmax; // N
    let Mp = 0; // kNm

    // Check equilibrium: does concrete alone carry full steel tension?
    if (clampedEta >= 0.999 && Cmax >= Tmax) {
      // Case 1: PNA is in the Concrete Slab
      pnaCase = 'in_slab';
      ypnaFromTop = 0;
      ypnaFromBottom = d;
      Cs = 0;
      Ts = Tmax;

      // Moment arm between concrete centroid and steel centroid
      // Concrete centroid is at (d + hDeck + tSlab - a/2) from bottom
      // Steel centroid is at d / 2 from bottom
      const arm = d / 2 + hDeck + tSlab - a / 2; // mm
      Mp = (Ts * arm) / 1e6; // kNm
    } else {
      // Concrete cannot equilibrate full steel tension -> steel compression Cs develops
      Cs = (Tmax - Cc) / 2; // N
      Ts = Tmax - Cs; // N

      const topFlangeMaxComp = bf * tf * Fy; // N

      if (Cs <= topFlangeMaxComp) {
        // Case 2: PNA is in the Steel Top Flange
        pnaCase = 'in_top_flange';
        ypnaFromTop = Cs / (bf * Fy); // mm
        ypnaFromBottom = d - ypnaFromTop;

        // Calculate moment by taking moments of each component about the PNA
        // Concrete compression:
        const yConcCentroid = d + hDeck + tSlab - a / 2;
        const armConc = yConcCentroid - ypnaFromBottom;
        const mConc = Cc * armConc;

        // Steel top flange compression (from d - ypnaFromTop to d):
        const armTopFlangeComp = ypnaFromTop / 2;
        const mTopFlangeComp = Cs * armTopFlangeComp;

        // Steel top flange tension (from d - tf to d - ypnaFromTop):
        const tRemainingTf = tf - ypnaFromTop;
        const forceRemainingTf = bf * tRemainingTf * Fy;
        const armRemainingTf = tRemainingTf / 2;
        const mRemainingTf = forceRemainingTf * armRemainingTf;

        // Steel web tension:
        const hw = d - 2 * tf;
        const forceWeb = tw * hw * Fy;
        const yWebCentroid = tf + hw / 2;
        const armWeb = ypnaFromBottom - yWebCentroid;
        const mWeb = forceWeb * armWeb;

        // Steel bottom flange tension:
        const forceBf = bf * tf * Fy;
        const yBfCentroid = tf / 2;
        const armBf = ypnaFromBottom - yBfCentroid;
        const mBf = forceBf * armBf;

        Mp = (mConc + mTopFlangeComp + mRemainingTf + mWeb + mBf) / 1e6; // kNm
      } else {
        // Case 3: PNA is in the Steel Web
        pnaCase = 'in_web';
        const cWeb = Cs - topFlangeMaxComp; // N
        const yw = cWeb / (tw * Fy); // mm of web in compression
        ypnaFromTop = tf + yw;
        ypnaFromBottom = d - ypnaFromTop;

        // Concrete compression:
        const yConcCentroid = d + hDeck + tSlab - a / 2;
        const armConc = yConcCentroid - ypnaFromBottom;
        const mConc = Cc * armConc;

        // Top flange compression:
        const yTfCentroid = d - tf / 2;
        const armTfComp = yTfCentroid - ypnaFromBottom;
        const mTfComp = topFlangeMaxComp * armTfComp;

        // Web compression:
        const armWebComp = yw / 2;
        const mWebComp = cWeb * armWebComp;

        // Web tension:
        const hw = d - 2 * tf;
        const tensionWebHeight = hw - yw;
        const forceTensionWeb = tw * tensionWebHeight * Fy;
        const armTensionWeb = tensionWebHeight / 2;
        const mTensionWeb = forceTensionWeb * armTensionWeb;

        // Bottom flange tension:
        const forceBf = bf * tf * Fy;
        const yBfCentroid = tf / 2;
        const armBf = ypnaFromBottom - yBfCentroid;
        const mBf = forceBf * armBf;

        Mp = (mConc + mTfComp + mWebComp + mTensionWeb + mBf) / 1e6; // kNm
      }
    }

    const phiMp = 0.9 * Mp; // AISC LRFD (phi = 0.90)
    const mpOmega = Mp / 1.67; // AISC ASD (Omega = 1.67)
    const mrd = Mp / 1.0; // Eurocode 4 (gamma_M0 = 1.0)
    const gainPercent = bareMp > 0 ? ((Mp - bareMp) / bareMp) * 100 : 0;

    const pna: PnaResult = {
      locationCase: pnaCase,
      concreteBlockDepthA: Math.round(a * 10) / 10,
      ypnaFromTopFlange: Math.round(ypnaFromTop * 10) / 10,
      ypnaFromBottom: Math.round(ypnaFromBottom * 10) / 10,
      concreteCompressionCc: Math.round((Cc / 1000) * 10) / 10,
      steelCompressionCs: Math.round((Cs / 1000) * 10) / 10,
      steelTensionTs: Math.round((Ts / 1000) * 10) / 10,
    };

    return {
      eta: clampedEta,
      pna,
      plasticMomentMp: Math.round(Mp * 10) / 10,
      aiscDesignMomentPhiMp: Math.round(phiMp * 10) / 10,
      aiscAllowableMomentMpOverOmega: Math.round(mpOmega * 10) / 10,
      ec4DesignMomentMrd: Math.round(mrd * 10) / 10,
      bareSteelPlasticMoment: Math.round(bareMp * 10) / 10,
      compositeCapacityGainPercent: Math.round(gainPercent * 10) / 10,
    };
  }

  /**
   * Generate partial interaction curve points for eta from 0.25 to 1.0 in discrete steps.
   */
  public static generateInteractionCurve(
    section: CompositeSectionDefinition,
    effectiveWidth: number,
    totalRequiredStudsHalfSpan: number,
    steps: number = 10
  ): PartialInteractionCurvePoint[] {
    const points: PartialInteractionCurvePoint[] = [];
    const minEta = 0.25;
    const maxEta = 1.0;
    const dEta = (maxEta - minEta) / steps;

    for (let i = 0; i <= steps; i++) {
      const etaVal = minEta + i * dEta;
      const res = this.calculateFlexuralCapacity(section, effectiveWidth, etaVal);
      const studs = Math.ceil(etaVal * totalRequiredStudsHalfSpan);
      points.push({
        eta: Math.round(etaVal * 100) / 100,
        studsHalfSpan: studs,
        plasticMomentMp: res.plasticMomentMp,
        aiscPhiMp: res.aiscDesignMomentPhiMp,
        pnaCase: res.pna.locationCase,
      });
    }

    return points;
  }
}
