import { TendonGeometryResult } from '../tendon/TendonProfileEngine.js';
import { LoadBalancingResult } from './LoadBalancingEngine.js';

export type StructuralBoundaryCondition = 
  | 'simply-supported' 
  | 'continuous-two-span' 
  | 'propped-cantilever';

export interface HyperstaticMomentInput {
  boundaryCondition: StructuralBoundaryCondition;
  geometry: TendonGeometryResult;
  loadBalancing: LoadBalancingResult;
  effectivePrestressForceKn: number;
  deadLoadMomentMidspanKnm: number; // M_D at midspan
  liveLoadMomentMidspanKnm?: number; // M_L at midspan
}

export interface MomentStation {
  xM: number;
  xRatio: number;
  primaryMomentKnm: number;    // M_1(x) = P_eff * e(x)
  secondaryMomentKnm: number;  // M_2(x) = M_total - M_1
  totalPrestressMomentKnm: number; // M_total(x)
  deadLoadMomentKnm: number;   // M_D(x)
  liveLoadMomentKnm: number;   // M_L(x)
  factoredAiscMomentKnm: number; // 1.2*M_D + 1.6*M_L + 1.0*M_2
  factoredEc2MomentKnm: number;  // 1.35*M_D + 1.5*M_L + 1.0*M_2
}

export interface HyperstaticAnalysisResult {
  boundaryCondition: StructuralBoundaryCondition;
  isStaticallyDeterminate: boolean;
  maxPrimaryMomentKnm: number;
  maxSecondaryMomentKnm: number;
  midspanSecondaryMomentKnm: number;
  supportSecondaryMomentKnm: number;
  criticalFactoredMomentAciKnm: number;
  criticalFactoredMomentEc2Knm: number;
  momentStations: MomentStation[];
}

export class HyperstaticPrestressEngine {
  public static analyzePrestressMoments(input: HyperstaticMomentInput): HyperstaticAnalysisResult {
    const { boundaryCondition, geometry, loadBalancing, effectivePrestressForceKn: Peff } = input;
    const L = geometry.spanLengthM;
    const wBal = loadBalancing.balancedUniformLoadKnPerM;
    const mDMid = input.deadLoadMomentMidspanKnm;
    const mLMid = input.liveLoadMomentMidspanKnm ?? 0;

    const isDeterminate = boundaryCondition === 'simply-supported';

    // Primary moment distribution M_1(x) = -P_eff * e(x) / 1000
    // Sign convention: positive moment causes tension at bottom fiber.
    // Negative eccentricity (below cgc) causes positive sagging moment:
    // M_1(x) = -P_eff * (e(x) / 1000) (kNm)
    const stations = geometry.stations;

    let getSecondaryMomentAt: (xM: number) => number;
    let supportSecondaryKnm = 0;
    let midspanSecondaryKnm = 0;

    if (isDeterminate) {
      // In simply supported members, reactions to prestress are zero:
      // M_total = M_1 => M_2 = 0 everywhere
      getSecondaryMomentAt = () => 0;
    } else if (boundaryCondition === 'continuous-two-span') {
      // Continuous 2-span symmetric beam:
      // Under uniform upward load w_bal, interior support moment:
      // M_total,sup = -w_bal * L^2 / 8 (sagging/hogging)
      const mTotalSup = -(wBal * L * L) / 8;
      const atSup = geometry.evaluateAt(L);
      // Primary moment at support:
      const m1Sup = -Peff * (atSup.eccentricityMm / 1000);
      supportSecondaryKnm = mTotalSup - m1Sup;
      // Secondary moment varies linearly from 0 at simple end (x=0) to supportSecondary at x=L:
      getSecondaryMomentAt = (xM: number) => supportSecondaryKnm * (xM / L);
      midspanSecondaryKnm = supportSecondaryKnm * 0.5;
    } else {
      // Propped cantilever (fixed at x = 0, pinned at x = L):
      const mTotalFix = -(wBal * L * L) / 8;
      const at0 = geometry.evaluateAt(0);
      const m1Fix = -Peff * (at0.eccentricityMm / 1000);
      const m2Fix = mTotalFix - m1Fix;
      supportSecondaryKnm = m2Fix;
      getSecondaryMomentAt = (xM: number) => m2Fix * (1 - xM / L);
      midspanSecondaryKnm = m2Fix * 0.5;
    }

    const cleanZero = (v: number) => (Math.abs(v) < 1e-6 ? 0 : Math.round(v * 10) / 10);

    const momentStations: MomentStation[] = stations.map((st) => {
      const u = st.xRatio;
      // Parabolic shape for simply supported gravity moments: 4 * M_mid * u * (1 - u)
      const mD = 4 * mDMid * u * (1 - u);
      const mL = 4 * mLMid * u * (1 - u);

      const m1 = -Peff * (st.eccentricityMm / 1000);
      const m2 = getSecondaryMomentAt(st.xM);
      const mTotal = m1 + m2;

      // Factored moments per ACI 318-19 Section 5.3.11: 1.2*D + 1.6*L + 1.0*M2
      const factoredAci = 1.2 * mD + 1.6 * mL + 1.0 * m2;
      // Eurocode 2: 1.35*D + 1.5*L + 1.0*M2
      const factoredEc2 = 1.35 * mD + 1.5 * mL + 1.0 * m2;

      return {
        xM: st.xM,
        xRatio: st.xRatio,
        primaryMomentKnm: cleanZero(m1),
        secondaryMomentKnm: cleanZero(m2),
        totalPrestressMomentKnm: cleanZero(mTotal),
        deadLoadMomentKnm: cleanZero(mD),
        liveLoadMomentKnm: cleanZero(mL),
        factoredAiscMomentKnm: cleanZero(factoredAci),
        factoredEc2MomentKnm: cleanZero(factoredEc2),
      };
    });

    const maxM1 = Math.max(...momentStations.map(s => Math.abs(s.primaryMomentKnm)));
    const maxM2 = Math.max(...momentStations.map(s => Math.abs(s.secondaryMomentKnm)));
    const criticalAci = Math.max(...momentStations.map(s => s.factoredAiscMomentKnm));
    const criticalEc2 = Math.max(...momentStations.map(s => s.factoredEc2MomentKnm));

    return {
      boundaryCondition,
      isStaticallyDeterminate: isDeterminate,
      maxPrimaryMomentKnm: cleanZero(maxM1),
      maxSecondaryMomentKnm: cleanZero(maxM2),
      midspanSecondaryMomentKnm: cleanZero(midspanSecondaryKnm),
      supportSecondaryMomentKnm: cleanZero(supportSecondaryKnm),
      criticalFactoredMomentAciKnm: cleanZero(criticalAci),
      criticalFactoredMomentEc2Knm: cleanZero(criticalEc2),
      momentStations,
    };
  }
}
