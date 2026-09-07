import { CompositeSectionDefinition } from '../material/CompositeMaterialModel';
import { TransformedSectionEngine } from '../material/TransformedSectionEngine';

export interface ServiceLoads {
  /** Beam span length L (m) */
  spanLength: number;
  /** Beam tributary width (m) */
  tributaryWidth: number;
  /** Unshored construction dead load (kN/m) [steel + slab + deck] */
  constructionDeadLoad?: number;
  /** Post-composite superimposed dead load (kN/m^2) [MEP, finishes, ceilings] */
  superimposedDeadLoad?: number;
  /** Service live load (kN/m^2) */
  liveLoad: number;
  /** Degree of composite action eta (0.25 to 1.0) */
  eta: number;
  /** Sustained live load factor (default 0.25) */
  sustainedLiveFactor?: number;
  /** Concrete ultimate shrinkage strain (default 0.0003 or 300 microstrain) */
  shrinkageStrain?: number;
}

export interface DeflectionSummaryResult {
  spanLengthM: number;
  bareSteelIx: number; // cm^4
  transformedIxShort: number; // cm^4
  transformedIxLong: number; // cm^4
  effectiveIxShort: number; // cm^4 (AISC Eq. C-I3-1)
  effectiveIxLong: number; // cm^4
  constructionDeadDeflection: number; // mm
  superimposedDeadDeflection: number; // mm
  liveLoadDeflection: number; // mm
  shrinkageDeflection: number; // mm
  longTermTotalDeflection: number; // mm
  liveLoadLimit: number; // mm (L/360)
  totalLimit: number; // mm (L/240)
  liveLoadUtilization: number;
  totalUtilization: number;
  isPassing: boolean;
  recommendedCamber: number; // mm (typically ~75% of dead deflection rounded to nearest 5mm)
}

/**
 * CompositeDeflectionAuditor computes short-term, sustained creep, and shrinkage deflections
 * using the AISC 360-22 effective moment of inertia formulation:
 * I_eff = I_s + sqrt(eta) * (I_tr - I_s)
 */
export class CompositeDeflectionAuditor {
  public static calculateDeflections(
    section: CompositeSectionDefinition,
    effectiveWidthMm: number,
    loads: ServiceLoads
  ): DeflectionSummaryResult {
    const L_m = loads.spanLength;
    const L_mm = L_m * 1000;
    const trib = loads.tributaryWidth;
    const eta = Math.min(1.0, Math.max(0.25, loads.eta));

    const Es = section.steel.elasticModulus; // MPa
    const bareIx_cm4 = section.steel.momentOfInertiaX;
    const bareIx_mm4 = bareIx_cm4 * 1e4;

    // Modular ratios
    const Ec = section.concrete.elasticModulus;
    const n0 = TransformedSectionEngine.computeShortTermModularRatio(Es, Ec);
    const nLong = TransformedSectionEngine.computeLongTermModularRatio(n0, 2.0); // 3 * n0

    // Transformed section properties
    const steelProps = {
      id: 'steel',
      name: 'steel',
      d: section.steel.depth,
      bf: section.steel.flangeWidth,
      tf: section.steel.flangeThickness,
      tw: section.steel.webThickness,
      area: section.steel.area,
      Ix: bareIx_mm4,
      Sx: section.steel.sectionModulusX,
      Zx: section.steel.plasticModulusX ?? section.steel.sectionModulusX * 1.14,
      Fy: section.steel.yieldStrength,
      Es,
    };

    const concreteProps = {
      fc: section.concrete.fc,
      totalThickness: section.concrete.totalSlabThickness ?? section.concrete.slabThickness + 75,
      ribHeight: section.deck?.ribDepth ?? 0,
      toppingThickness: section.concrete.slabThickness,
      density: section.concrete.density ?? 2400,
      Ec,
      fctm: 0.3 * Math.pow(section.concrete.fc, 2 / 3),
    };

    const trShort = TransformedSectionEngine.computeTransformedSection(
      steelProps,
      concreteProps,
      effectiveWidthMm,
      n0
    );
    const trLong = TransformedSectionEngine.computeTransformedSection(
      steelProps,
      concreteProps,
      effectiveWidthMm,
      nLong
    );

    const ItrShort_mm4 = trShort.Itr;
    const ItrLong_mm4 = trLong.Itr;

    // AISC 360-22 Commentary Section I3.2:
    // Ieff = Is + sqrt(eta) * (Itr - Is)
    const sqrtEta = Math.sqrt(eta);
    const IeffShort_mm4 = bareIx_mm4 + sqrtEta * (ItrShort_mm4 - bareIx_mm4);
    const IeffLong_mm4 = bareIx_mm4 + sqrtEta * (ItrLong_mm4 - bareIx_mm4);

    // Dead load during construction (kN/m)
    let wConstDL = loads.constructionDeadLoad;
    if (wConstDL === undefined) {
      const steelWeight = (section.steel.area / 1e6) * 7850 * 9.81 * 1e-3;
      const concVol = trib * (concreteProps.toppingThickness / 1000 + (0.5 * concreteProps.ribHeight) / 1000);
      const concWeight = concVol * (concreteProps.density * 9.81 * 1e-3);
      wConstDL = steelWeight + concWeight + trib * 0.12;
    }

    // Superimposed dead load (kN/m)
    const wSDL = (loads.superimposedDeadLoad ?? 0.5) * trib;
    // Live load (kN/m)
    const wLL = loads.liveLoad * trib;

    // Delta = (5 * w * L^4) / (384 * E * I)
    // w in N/mm = kN/m
    const deltaConst = (5 * wConstDL * Math.pow(L_mm, 4)) / (384 * Es * bareIx_mm4);
    const deltaSDL = (5 * wSDL * Math.pow(L_mm, 4)) / (384 * Es * IeffLong_mm4);
    const deltaLL = (5 * wLL * Math.pow(L_mm, 4)) / (384 * Es * IeffShort_mm4);

    // Shrinkage deflection:
    // Psh = epsSh * Ec * Ac (N) -> converted to steel units: Psh / Es = (epsSh * Ac) / nLong
    const epsSh = loads.shrinkageStrain ?? 0.00025;
    const Ac = effectiveWidthMm * concreteProps.toppingThickness;
    const yCentroidConc = section.steel.depth + concreteProps.ribHeight + concreteProps.toppingThickness / 2;
    const eConc = yCentroidConc - trLong.ybarTr;
    const curSh = (epsSh * (Ac / nLong) * eConc) / ItrLong_mm4; // 1/mm
    const deltaSh = (curSh * Math.pow(L_mm, 2)) / 8; // mm (typically 2 - 5 mm)

    // Deflection limits (AISC Design Guide 3 / AISC 360-22 Section L):
    // 1. Live load deflection <= L / 360
    // 2. Post-composite deflection (SDL + LL + Shrinkage) <= L / 240 (or L/360 if plaster)
    const deltaPostComposite = deltaSDL + deltaLL + deltaSh;

    // Camber recommendation: round to nearest 5 mm of (0.8 * deltaConst)
    const rawCamber = 0.8 * deltaConst;
    const recommendedCamber = rawCamber >= 15 ? Math.round(rawCamber / 5) * 5 : 0;

    const totalAll = deltaConst - recommendedCamber + deltaPostComposite;

    // Deflection limits
    const limitLL = L_mm / 360;
    const limitTotal = L_mm / 240;

    const utilLL = deltaLL / limitLL;
    const utilTotal = deltaPostComposite / limitTotal;
    const isPassing = utilLL <= 1.0 && utilTotal <= 1.0;

    return {
      spanLengthM: L_m,
      bareSteelIx: Math.round(bareIx_cm4),
      transformedIxShort: Math.round(ItrShort_mm4 / 1e4),
      transformedIxLong: Math.round(ItrLong_mm4 / 1e4),
      effectiveIxShort: Math.round(IeffShort_mm4 / 1e4),
      effectiveIxLong: Math.round(IeffLong_mm4 / 1e4),
      constructionDeadDeflection: Math.round(deltaConst * 10) / 10,
      superimposedDeadDeflection: Math.round(deltaSDL * 10) / 10,
      liveLoadDeflection: Math.round(deltaLL * 10) / 10,
      shrinkageDeflection: Math.round(deltaSh * 10) / 10,
      longTermTotalDeflection: Math.round(totalAll * 10) / 10,
      liveLoadLimit: Math.round(limitLL * 10) / 10,
      totalLimit: Math.round(limitTotal * 10) / 10,
      liveLoadUtilization: Math.round(utilLL * 1000) / 1000,
      totalUtilization: Math.round(utilTotal * 1000) / 1000,
      isPassing,
      recommendedCamber,
    };
  }
}
