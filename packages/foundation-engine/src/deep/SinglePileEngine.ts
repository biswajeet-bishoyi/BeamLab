import { SoilStratigraphy, SoilLayer } from '../soil/SoilStratigraphy';

export type PileType = 'BORED_CAST_IN_SITU' | 'DRIVEN_PRECAST' | 'STEEL_PIPE';
export type PileCrossSectionShape = 'CIRCULAR' | 'SQUARE';

export interface PileGeometry {
  pileType: PileType;
  shape: PileCrossSectionShape;
  diameter_m: number; // or width_m if SQUARE
  length_m: number;
  concreteStrength_MPa?: number; // default 30 MPa
  rebarYield_MPa?: number;       // default 500 MPa
  rebarRatio?: number;           // default 0.01 (1%)
  concreteUnitWeight_kN_m3?: number; // default 24.5 kN/m3
}

export interface SinglePileAnalysisOptions {
  factorOfSafetyCompression?: number; // default 2.5
  factorOfSafetyUplift?: number;      // default 3.0
  criticalDepthRatio?: number;        // default 15 (z_crit = 15*D)
}

export interface LayerShaftContribution {
  layerIndex: number;
  layerName: string;
  depthTop_m: number;
  depthBottom_m: number;
  effectiveThickness_m: number;
  avgEffectiveStress_kPa: number;
  unitFriction_kPa: number;
  shaftArea_m2: number;
  shaftCapacity_kN: number;
}

export interface SinglePileCapacityResult {
  pileType: PileType;
  diameter_m: number;
  length_m: number;
  perimeter_m: number;
  tipArea_m2: number;
  pileSelfWeight_kN: number;
  totalShaftCapacity_kN: number;
  unitEndBearing_kPa: number;
  endBearingCapacity_kN: number;
  ultimateCompression_kN: number;
  allowableCompression_kN: number;
  ultimateUplift_kN: number;
  allowableUplift_kN: number;
  structuralAxialCapacity_kN: number;
  governingCompressionCapacity_kN: number;
  factorOfSafetyCompression: number;
  factorOfSafetyUplift: number;
  layers: LayerShaftContribution[];
}

export class SinglePileEngine {
  /**
   * Computes the geotechnical and structural axial capacity of a single pile
   * through multi-layer soil stratigraphy.
   */
  public analyzeSinglePile(
    stratigraphy: SoilStratigraphy,
    pile: PileGeometry,
    options: SinglePileAnalysisOptions = {}
  ): SinglePileCapacityResult {
    const fsComp = options.factorOfSafetyCompression ?? 2.5;
    const fsUplift = options.factorOfSafetyUplift ?? 3.0;
    const critDepthRatio = options.criticalDepthRatio ?? 15;

    const D = pile.diameter_m;
    const L = pile.length_m;
    const fck = pile.concreteStrength_MPa ?? 30;
    const fy = pile.rebarYield_MPa ?? 500;
    const rhoRebar = pile.rebarRatio ?? 0.01;
    const gammaConcrete = pile.concreteUnitWeight_kN_m3 ?? 24.5;

    // Cross-sectional geometric properties
    const perimeter = pile.shape === 'CIRCULAR' ? Math.PI * D : 4 * D;
    const tipArea = pile.shape === 'CIRCULAR' ? (Math.PI * D * D) / 4 : D * D;
    const pileVolume = tipArea * L;
    const pileSelfWeight = pileVolume * gammaConcrete;

    const zCrit = critDepthRatio * D;
    const layers = stratigraphy.getLayers();

    // 1. Shaft Resistance summation across soil layers
    const layerContributions: LayerShaftContribution[] = [];
    let totalShaftCap = 0;

    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      if (!layer) continue;
      const layerTop = layer.depthTop_m;
      const layerBottom = layer.depthBottom_m;

      // Pile only penetrates up to L
      if (layerTop >= L) {
        continue;
      }

      const penTop = layerTop;
      const penBottom = Math.min(layerBottom, L);
      const penThickness = penBottom - penTop;

      if (penThickness > 0) {
        const midDepth = (penTop + penBottom) / 2;
        // Evaluate effective vertical stress at mid-depth, capped at critical depth
        const effMidDepth = Math.min(midDepth, zCrit);
        const sigmaV = stratigraphy.getEffectiveVerticalStress(effMidDepth);

        let unitFs = 0;
        if (layer.cohesion_kPa > 0) {
          // Cohesive soil: Tomlinson Alpha Method
          // cu = undrained shear strength
          const cu = layer.cohesion_kPa;
          let alpha = 1.0;
          if (cu <= 25) {
            alpha = 1.0;
          } else if (cu <= 75) {
            alpha = 1.0 - 0.5 * ((cu - 25) / 50); // 1.0 down to 0.5
          } else {
            alpha = Math.max(0.35, 0.5 * Math.sqrt(75 / cu));
          }
          if (pile.pileType === 'BORED_CAST_IN_SITU') {
            alpha *= 0.85; // Boring disturbance reduction
          }
          unitFs = alpha * cu;
        } else {
          // Cohesionless soil: Beta Method
          // fs = beta * sigmaV' = K * tan(delta) * sigmaV'
          const phiRad = (layer.frictionAngle_deg * Math.PI) / 180;
          let K = 1 - Math.sin(phiRad);
          if (pile.pileType === 'DRIVEN_PRECAST') {
            K *= 1.4; // Displacement effect
          } else {
            K *= 0.7; // Bored stress relaxation
          }
          const delta = 0.8 * phiRad;
          const beta = K * Math.tan(delta);
          unitFs = beta * sigmaV;
          // Practical maximum unit skin friction limits
          const maxUnitFs = pile.pileType === 'DRIVEN_PRECAST' ? 150 : 100;
          unitFs = Math.min(unitFs, maxUnitFs);
        }

        const shaftArea = perimeter * penThickness;
        const shaftCap = unitFs * shaftArea;
        totalShaftCap += shaftCap;

        layerContributions.push({
          layerIndex: i,
          layerName: layer.name,
          depthTop_m: Number(penTop.toFixed(2)),
          depthBottom_m: Number(penBottom.toFixed(2)),
          effectiveThickness_m: Number(penThickness.toFixed(2)),
          avgEffectiveStress_kPa: Number(sigmaV.toFixed(1)),
          unitFriction_kPa: Number(unitFs.toFixed(1)),
          shaftArea_m2: Number(shaftArea.toFixed(2)),
          shaftCapacity_kN: Number(shaftCap.toFixed(1)),
        });
      }
    }

    // 2. End Bearing Resistance at pile tip (depth L)
    const tipLayer = stratigraphy.getLayerAtDepth(L);
    const effTipDepth = Math.min(L, zCrit);
    const sigmaV_tip = stratigraphy.getEffectiveVerticalStress(effTipDepth);

    let unitEndBearing = 0;
    if (tipLayer && tipLayer.cohesion_kPa > 0) {
      // Cohesive soil: qb = Nc * cu, Nc = 9 for deep foundations
      unitEndBearing = 9 * tipLayer.cohesion_kPa;
    } else if (tipLayer) {
      // Cohesionless soil: qb = Nq * sigmaV_tip'
      const phi = tipLayer.frictionAngle_deg;
      const phiRad = (phi * Math.PI) / 180;
      // Meyerhof / Berezantsev Nq approximation for deep foundations
      const Nq = Math.exp(Math.PI * Math.tan(phiRad)) * Math.tan(Math.PI / 4 + phiRad / 2) ** 2;
      unitEndBearing = Nq * sigmaV_tip;

      // Meyerhof maximum tip resistance limit: qb_max = 50 * Nq * tan(phi) (kPa)
      const qbMax = 50 * Nq * Math.tan(phiRad);
      unitEndBearing = Math.min(unitEndBearing, qbMax);
    }

    if (pile.pileType === 'BORED_CAST_IN_SITU') {
      unitEndBearing *= 0.8; // Base softness / debris factor
    }

    const endBearingCap = unitEndBearing * tipArea;

    // 3. Geotechnical Ultimate and Allowable Capacities
    const ultComp = totalShaftCap + endBearingCap;
    const allowComp = ultComp / fsComp;

    // Uplift capacity: 70% shaft friction + buoyant pile self-weight
    const ultUplift = 0.75 * totalShaftCap + pileSelfWeight;
    const allowUplift = ultUplift / fsUplift;

    // 4. Structural Axial Capacity of Pile (Concrete + Rebar)
    // ACI 318 tied compression column formula:
    // P_structural = phi * 0.80 * [0.85 * f'c * (Ag - Ast) + fy * Ast] with phi = 0.65
    const Ag = tipArea;
    const Ast = rhoRebar * Ag;
    const Ac = Ag - Ast;
    // In kN: 1 MPa = 1000 kN/m2
    const pStructural_kN = 0.65 * 0.80 * (0.85 * fck * 1000 * Ac + fy * 1000 * Ast);

    const governingCompression = Math.min(allowComp, pStructural_kN);

    return {
      pileType: pile.pileType,
      diameter_m: Number(D.toFixed(3)),
      length_m: Number(L.toFixed(2)),
      perimeter_m: Number(perimeter.toFixed(3)),
      tipArea_m2: Number(tipArea.toFixed(4)),
      pileSelfWeight_kN: Number(pileSelfWeight.toFixed(1)),
      totalShaftCapacity_kN: Number(totalShaftCap.toFixed(1)),
      unitEndBearing_kPa: Number(unitEndBearing.toFixed(1)),
      endBearingCapacity_kN: Number(endBearingCap.toFixed(1)),
      ultimateCompression_kN: Number(ultComp.toFixed(1)),
      allowableCompression_kN: Number(allowComp.toFixed(1)),
      ultimateUplift_kN: Number(ultUplift.toFixed(1)),
      allowableUplift_kN: Number(allowUplift.toFixed(1)),
      structuralAxialCapacity_kN: Number(pStructural_kN.toFixed(1)),
      governingCompressionCapacity_kN: Number(governingCompression.toFixed(1)),
      factorOfSafetyCompression: fsComp,
      factorOfSafetyUplift: fsUplift,
      layers: layerContributions,
    };
  }
}
