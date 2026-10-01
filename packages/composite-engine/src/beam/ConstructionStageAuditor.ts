import { CompositeSectionDefinition } from '../material/CompositeMaterialModel';

export interface ConstructionLoads {
  /** Beam span length (m) */
  spanLength: number;
  /** Beam tributary width (m) */
  tributaryWidth: number;
  /** Metal deck self weight (kN/m^2), typical 0.10 to 0.15 kN/m^2 */
  deckWeight?: number;
  /** Wet concrete unit weight (kN/m^3), typical 24 kN/m^3 */
  wetConcreteDensity?: number;
  /** Construction live load (kN/m^2), typical 1.0 kN/m^2 (20 psf per ASCE 37) */
  constructionLiveLoad?: number;
  /** Ponding surcharge allowance factor (default 1.0 = no ponding, 1.1 = 10% ponding) */
  pondingFactor?: number;
}

export interface ConstructionStageAuditResult {
  spanLength: number;
  tributaryWidth: number;
  deadLoadTotal: number; // kN/m
  liveLoadTotal: number; // kN/m
  factoredLoadWconst: number; // kN/m
  factoredMomentMu: number; // kNm
  factoredShearVu: number; // kN
  bareSteelCapacityPhiMn: number; // kNm
  bareSteelShearCapacityPhiVn: number; // kN
  constructionDeadDeflection: number; // mm
  deflectionLimit: number; // mm (L/360 or 25mm max)
  momentUtilization: number;
  shearUtilization: number;
  deflectionUtilization: number;
  isPassing: boolean;
  shoredRecommended: boolean;
  summaryText: string;
}

/**
 * ConstructionStageAuditor verifies the bare steel wide-flange beam
 * during concrete placement before the slab hardens in unshored construction.
 */
export class ConstructionStageAuditor {
  public static audit(
    section: CompositeSectionDefinition,
    loads: ConstructionLoads
  ): ConstructionStageAuditResult {
    const L = loads.spanLength; // m
    const trib = loads.tributaryWidth; // m
    const deckWeight = loads.deckWeight ?? 0.12; // kN/m^2
    const wetDensity = loads.wetConcreteDensity ?? 24.0; // kN/m^3
    const liveLoad = loads.constructionLiveLoad ?? 1.0; // kN/m^2
    const ponding = loads.pondingFactor ?? 1.05;

    // Beam self-weight in kN/m
    const steelSelfWeight = (section.steel.area / 1e6) * 7850 * 9.81 * 1e-3; // kN/m

    // Concrete volume per m length
    const tSlabM = section.concrete.slabThickness / 1000;
    const hDeckM = (section.deck?.ribDepth ?? 0) / 1000;
    // Equivalent flat thickness including ribs (approx 50% void in ribs)
    const teq = tSlabM + 0.5 * hDeckM;
    const wetConcWeight = trib * teq * wetDensity * ponding; // kN/m
    const formworkWeight = trib * deckWeight; // kN/m

    const deadLoad = steelSelfWeight + wetConcWeight + formworkWeight; // kN/m
    const liveLoadLine = trib * liveLoad; // kN/m

    // ASCE 7 / AISC LRFD construction stage load combination: 1.2 D + 1.6 L_const
    const wu = 1.2 * deadLoad + 1.6 * liveLoadLine; // kN/m

    // Midspan moment and end shear
    const Mu = (wu * Math.pow(L, 2)) / 8; // kNm
    const Vu = (wu * L) / 2; // kN

    // Bare steel capacity (assuming top flange braced by deck every rib)
    const Zx = section.steel.plasticModulusX ?? section.steel.sectionModulusX * 1.14; // mm^3
    const Fy = section.steel.yieldStrength; // MPa
    const Mn = (Zx * Fy) / 1e6; // kNm
    const phiMn = 0.9 * Mn; // kNm

    // Bare steel shear capacity (AISC 360-22 G2.1)
    const d = section.steel.depth;
    const tw = section.steel.webThickness;
    const Aw = d * tw;
    const Vn = (0.6 * Fy * Aw) / 1000; // kN
    const phiVn = 0.9 * Vn; // kN

    // Construction deflection under dead load only (wet concrete + steel + deck)
    const Es = section.steel.elasticModulus; // MPa (N/mm^2)
    const Ix = section.steel.momentOfInertiaX * 1e4; // cm^4 to mm^4
    // Delta = (5 * wDL * L^4) / (384 * Es * Ix)
    // wDL in N/mm: deadLoad * 1000 / 1000 = deadLoad N/mm
    // L in mm: L * 1000
    const wDL_Nmm = deadLoad;
    const L_mm = L * 1000;
    const delta = (5 * wDL_Nmm * Math.pow(L_mm, 4)) / (384 * Es * Ix); // mm

    // Limits: min(L_mm / 360, 25.4 mm)
    const deflLimit = Math.min(L_mm / 360, 25.4);

    const momentUtil = Mu / phiMn;
    const shearUtil = Vu / phiVn;
    const deflUtil = delta / deflLimit;

    const isPassing = momentUtil <= 1.0 && shearUtil <= 1.0 && deflUtil <= 1.0;
    const shoredRecommended = !isPassing || deflUtil > 0.9;

    let summaryText = 'Unshored construction stage verified. Bare steel beam is adequate.';
    if (!isPassing) {
      const reasons: string[] = [];
      if (momentUtil > 1.0) reasons.push(`Flexure overloaded (${(momentUtil * 100).toFixed(1)}%)`);
      if (shearUtil > 1.0) reasons.push(`Shear overloaded (${(shearUtil * 100).toFixed(1)}%)`);
      if (deflUtil > 1.0) reasons.push(`Wet concrete deflection excessive (${delta.toFixed(1)} mm > ${deflLimit.toFixed(1)} mm)`);
      summaryText = `FAIL: ${reasons.join(', ')}. Shored construction or larger steel section required.`;
    }

    return {
      spanLength: L,
      tributaryWidth: trib,
      deadLoadTotal: Math.round(deadLoad * 100) / 100,
      liveLoadTotal: Math.round(liveLoadLine * 100) / 100,
      factoredLoadWconst: Math.round(wu * 100) / 100,
      factoredMomentMu: Math.round(Mu * 10) / 10,
      factoredShearVu: Math.round(Vu * 10) / 10,
      bareSteelCapacityPhiMn: Math.round(phiMn * 10) / 10,
      bareSteelShearCapacityPhiVn: Math.round(phiVn * 10) / 10,
      constructionDeadDeflection: Math.round(delta * 10) / 10,
      deflectionLimit: Math.round(deflLimit * 10) / 10,
      momentUtilization: Math.round(momentUtil * 1000) / 1000,
      shearUtilization: Math.round(shearUtil * 1000) / 1000,
      deflectionUtilization: Math.round(deflUtil * 1000) / 1000,
      isPassing,
      shoredRecommended,
      summaryText,
    };
  }
}
