import { CompositeSectionDefinition } from '../material/CompositeMaterialModel';

export interface ShearStudDefinition {
  /** Stud shank diameter (mm), typically 19mm (3/4") or 22mm (7/8") */
  diameter: number;
  /** Length of stud after welding (mm), typically >= 100mm */
  length: number;
  /** Specified minimum tensile strength Fu (MPa), default 450 MPa */
  fu?: number;
  /** Number of studs per transverse cross-section / rib */
  studsPerRow?: number;
}

export interface StudCapacityResult {
  studDiameter: number;
  studArea: number; // mm^2
  nominalShearStrengthQn: number; // kN per stud (AISC 360-22)
  designResistancePrd: number; // kN per stud (Eurocode 4 EN 1994-1-1)
  rgFactor: number;
  rpFactor: number;
  deckReductionFactorKt: number;
}

export interface FullShearConnectionResult {
  studCapacity: StudCapacityResult;
  concreteCompressiveCapacityCmax: number; // kN
  steelTensileCapacityTmax: number; // kN
  governingInterfaceShearVp: number; // kN
  requiredStudsHalfSpanFullComposite: number;
  requiredStudsTotalSpanFullComposite: number;
}

export interface PartialInteractionResult {
  providedStudsHalfSpan: number;
  providedStudsTotalSpan: number;
  shearTransferredVprime: number; // kN
  degreeOfCompositeActionEta: number; // 0.0 - 1.0
  isFullComposite: boolean;
  meetsMinimumInteraction: boolean; // AISC requires >= 0.25 (or EC4 ductility)
  statusMessage: string;
}

/**
 * ShearStudConnectorEngine implements shear stud resistance and interaction degree
 * according to AISC 360-22 Chapter I (Eq. I8-1) and Eurocode 4 EN 1994-1-1 (Clause 6.6.3 / 6.6.4).
 */
export class ShearStudConnectorEngine {
  /**
   * Calculate nominal shear strength of a single headed shear stud.
   */
  public static calculateStudCapacity(
    stud: ShearStudDefinition,
    section: CompositeSectionDefinition
  ): StudCapacityResult {
    const fu = stud.fu ?? 450; // MPa
    const d = stud.diameter;
    const asa = (Math.PI * Math.pow(d, 2)) / 4; // mm^2
    const studsPerRow = stud.studsPerRow ?? 1;

    // Metal deck factors Rg and Rp according to AISC 360-22 Section I8.2a
    let rg = 1.0;
    let rp = 1.0;
    let kt = 1.0; // EC4 reduction factor

    if (section.deck && section.deck.ribDepth > 0) {
      const hr = section.deck.ribDepth;
      const wr = section.deck.averageRibWidth;
      const orientation = section.deck.orientation;

      if (orientation === 'perpendicular') {
        rg = studsPerRow >= 2 ? 0.85 : 1.0;
        // AISC 360-22: Rp = 0.75 if emid-ht >= 50mm, 0.60 if < 50mm
        rp = 0.75;

        // EC4 EN 1994-1-1 Eq 6.23: kt = (0.7 / sqrt(nr)) * (b0 / hp) * (hsc / hp - 1) <= 1.0
        const nr = Math.min(studsPerRow, 2);
        const hsc = stud.length;
        if (hr > 0) {
          kt = Math.min(1.0, (0.7 / Math.sqrt(nr)) * (wr / hr) * (hsc / hr - 1));
          kt = Math.max(kt, 0.4); // typical lower bound in practice
        }
      } else {
        // Parallel ribs
        rg = 1.0;
        rp = wr / hr >= 1.5 ? 0.75 : 0.60;
        // EC4 EN 1994-1-1 Eq 6.22: kl = 0.6 * (b0 / hp) * (hsc / hp - 1) <= 1.0
        const hsc = stud.length;
        if (hr > 0) {
          kt = Math.min(1.0, 0.6 * (wr / hr) * (hsc / hr - 1));
          kt = Math.max(kt, 0.5);
        }
      }
    }

    // Concrete material properties
    const fc = section.concrete.fc; // MPa
    const Ec = section.concrete.elasticModulus; // MPa

    // AISC 360-22 Eq. I8-1:
    // Qn = 0.5 * Asa * sqrt(f'c * Ec) <= Rg * Rp * Asa * Fu
    const concreteCrushingTerm = 0.5 * asa * Math.sqrt(fc * Ec); // N
    const studShearTerm = rg * rp * asa * fu; // N
    const qnN = Math.min(concreteCrushingTerm, studShearTerm);
    const nominalShearStrengthQn = qnN / 1000; // kN

    // Eurocode 4 EN 1994-1-1 Clause 6.6.3.1 (Eq. 6.19 & 6.20):
    // PRd = min( 0.8 * fu * (pi*d^2/4) / gamma_v , 0.29 * alpha * d^2 * sqrt(fck * Ecm) / gamma_v ) * kt
    const gammaV = 1.25;
    const hsc = stud.length;
    const alpha = hsc / d >= 4 ? 1.0 : 0.2 * (hsc / d + 1);
    const pSteel = (0.8 * fu * asa) / gammaV;
    const pConc = (0.29 * alpha * Math.pow(d, 2) * Math.sqrt(fc * Ec)) / gammaV;
    const prdBase = Math.min(pSteel, pConc);
    const prdWithDeck = prdBase * kt;
    const designResistancePrd = prdWithDeck / 1000; // kN

    return {
      studDiameter: d,
      studArea: Math.round(asa * 10) / 10,
      nominalShearStrengthQn: Math.round(nominalShearStrengthQn * 100) / 100,
      designResistancePrd: Math.round(designResistancePrd * 100) / 100,
      rgFactor: rg,
      rpFactor: rp,
      deckReductionFactorKt: Math.round(kt * 1000) / 1000,
    };
  }

  /**
   * Determine total and half-span shear connector requirements for 100% full composite action.
   */
  public static calculateFullShearConnection(
    stud: ShearStudDefinition,
    section: CompositeSectionDefinition,
    effectiveWidth: number
  ): FullShearConnectionResult {
    const studCapacity = this.calculateStudCapacity(stud, section);

    // Concrete compressive capacity Cmax = 0.85 * f'c * Ac (slab topping above ribs)
    const Ac = effectiveWidth * section.concrete.slabThickness; // mm^2
    const Cmax = (0.85 * section.concrete.fc * Ac) / 1000; // kN

    // Steel tensile capacity Tmax = As * Fy
    const Tmax = (section.steel.area * section.steel.yieldStrength) / 1000; // kN

    // Governing interface shear between zero and maximum positive moment
    const Vp = Math.min(Cmax, Tmax); // kN

    // Half span required studs
    const requiredHalfSpan = Math.ceil(Vp / studCapacity.nominalShearStrengthQn);
    const requiredTotalSpan = requiredHalfSpan * 2;

    return {
      studCapacity,
      concreteCompressiveCapacityCmax: Math.round(Cmax * 10) / 10,
      steelTensileCapacityTmax: Math.round(Tmax * 10) / 10,
      governingInterfaceShearVp: Math.round(Vp * 10) / 10,
      requiredStudsHalfSpanFullComposite: requiredHalfSpan,
      requiredStudsTotalSpanFullComposite: requiredTotalSpan,
    };
  }

  /**
   * Compute actual partial interaction degree eta given number of provided studs.
   */
  public static evaluatePartialInteraction(
    providedStudsHalfSpan: number,
    fullConnection: FullShearConnectionResult
  ): PartialInteractionResult {
    const totalProvided = providedStudsHalfSpan * 2;
    const qn = fullConnection.studCapacity.nominalShearStrengthQn;
    const Vprime = providedStudsHalfSpan * qn; // kN transferred
    const Vp = fullConnection.governingInterfaceShearVp;

    const etaRaw = Vp > 0 ? Vprime / Vp : 0;
    const eta = Math.min(1.0, Math.max(0, Math.round(etaRaw * 1000) / 1000));
    const isFull = eta >= 1.0;
    const meetsMin = eta >= 0.25;

    let status = 'Full composite action (eta >= 1.0)';
    if (eta < 0.25) {
      status = 'Insufficient composite action (eta < 0.25 per AISC 360-22 Section I3.2d)';
    } else if (eta < 1.0) {
      status = `Partial composite action (${(eta * 100).toFixed(1)}% interaction)`;
    }

    return {
      providedStudsHalfSpan,
      providedStudsTotalSpan: totalProvided,
      shearTransferredVprime: Math.round(Math.min(Vprime, Vp) * 10) / 10,
      degreeOfCompositeActionEta: eta,
      isFullComposite: isFull,
      meetsMinimumInteraction: meetsMin,
      statusMessage: status,
    };
  }
}
