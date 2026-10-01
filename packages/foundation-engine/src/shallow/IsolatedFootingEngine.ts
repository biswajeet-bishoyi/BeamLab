/**
 * IsolatedFootingEngine.ts
 *
 * Shallow spread and eccentric isolated pad footing design engine.
 * Computes biaxial soil pressure distribution, one-way beam shear,
 * two-way punching shear on d/2 critical perimeter, and flexural bottom
 * reinforcement per ACI 318-19, Eurocode 2 (EN 1992-1-1), and IS 456:2000.
 */

export type ConcreteDesignCode = 'ACI_318_19' | 'EUROCODE_2' | 'IS_456';

export interface PadFootingDimensions {
  readonly width_m: number; // B (dimension along X)
  readonly length_m: number; // L (dimension along Y)
  readonly thickness_m: number; // H (total footing depth)
  readonly cover_m: number; // Clear concrete cover (typically 0.05 - 0.075m)
}

export interface ColumnStubDimensions {
  readonly width_m: number; // cx (column dimension along X)
  readonly length_m: number; // cy (column dimension along Y)
  readonly offsetX_m?: number; // Eccentric offset from footing center
  readonly offsetY_m?: number;
}

export interface FootingMaterialProperties {
  readonly fc_MPa: number; // f'c or fck (e.g. 25, 30, 35 MPa)
  readonly fy_MPa: number; // fy (e.g. 420, 500 MPa)
  readonly concreteDensity_kN_m3?: number; // default 24 kN/m3
}

export interface FootingAppliedLoads {
  readonly P_kN: number; // Axial load (downward is positive)
  readonly Mx_kNm: number; // Moment about X-axis (causes eccentricity along Y)
  readonly My_kNm: number; // Moment about Y-axis (causes eccentricity along X)
  readonly Vx_kN?: number; // Base shear X
  readonly Vy_kN?: number; // Base shear Y
  readonly isUltimate?: boolean; // True if factored ultimate (LRFD / Limit State)
}

export interface SoilPressureResults {
  readonly qMax_kPa: number;
  readonly qMin_kPa: number;
  readonly qAvg_kPa: number;
  readonly qCorner1_kPa: number; // ( -B/2, -L/2 )
  readonly qCorner2_kPa: number; // ( +B/2, -L/2 )
  readonly qCorner3_kPa: number; // ( +B/2, +L/2 )
  readonly qCorner4_kPa: number; // ( -B/2, +L/2 )
  readonly eccentricityX_m: number; // ex = My / P
  readonly eccentricityY_m: number; // ey = Mx / P
  readonly isFullContact: boolean; // True if within kern (|ex| <= B/6 and |ey| <= L/6)
  readonly upliftAreaRatio: number; // Percentage of footing area with tension cut-off
}

export interface OneWayShearCheck {
  readonly direction: 'X' | 'Y';
  readonly criticalSectionDistance_m: number; // Distance from column face = d
  readonly Vu_kN: number;
  readonly phiVc_kN: number;
  readonly utilization: number;
  readonly status: 'PASS' | 'FAIL';
}

export interface TwoWayPunchingShearCheck {
  readonly criticalPerimeter_b0_m: number; // Perimeter at d/2
  readonly criticalArea_m2: number;
  readonly Vup_kN: number;
  readonly phiVc_kN: number;
  readonly utilization: number;
  readonly status: 'PASS' | 'FAIL';
}

export interface FlexuralReinforcementCheck {
  readonly direction: 'X' | 'Y';
  readonly Mu_kNm: number;
  readonly AsRequired_mm2: number;
  readonly AsMin_mm2: number;
  readonly AsProvided_mm2: number;
  readonly barDiameter_mm: number;
  readonly barSpacing_mm: number;
  readonly barCount: number;
  readonly utilization: number;
  readonly status: 'PASS' | 'FAIL';
}

export interface IsolatedFootingDesignResult {
  readonly dimensions: PadFootingDimensions;
  readonly column: ColumnStubDimensions;
  readonly effectiveDepth_m: number; // d = H - cover - db/2
  readonly selfWeight_kN: number;
  readonly soilPressures: SoilPressureResults;
  readonly oneWayShearX: OneWayShearCheck;
  readonly oneWayShearY: OneWayShearCheck;
  readonly twoWayPunching: TwoWayPunchingShearCheck;
  readonly flexureX: FlexuralReinforcementCheck;
  readonly flexureY: FlexuralReinforcementCheck;
  readonly maxUtilization: number;
  readonly overallStatus: 'PASS' | 'FAIL';
  readonly codeUsed: ConcreteDesignCode;
}

export class IsolatedFootingEngine {
  /**
   * Evaluates and designs an isolated shallow spread footing under biaxial loads.
   */
  designFooting(
    dimensions: PadFootingDimensions,
    column: ColumnStubDimensions,
    materials: FootingMaterialProperties,
    loads: FootingAppliedLoads,
    code: ConcreteDesignCode = 'ACI_318_19'
  ): IsolatedFootingDesignResult {
    const B = dimensions.width_m;
    const L = dimensions.length_m;
    const H = dimensions.thickness_m;
    const cover = dimensions.cover_m;
    const gammaC = materials.concreteDensity_kN_m3 ?? 24.0;

    // Footing self weight
    const selfWeight_kN = B * L * H * gammaC;

    // Assumed primary rebar diameter = 16 mm (0.016 m)
    const assumedDb = 0.016;
    const d = H - cover - assumedDb / 2;

    const totalP = loads.P_kN + selfWeight_kN;
    const Mx = loads.Mx_kNm;
    const My = loads.My_kNm;

    // 1. Soil Pressure Distribution & Kern Verification
    const ex = totalP > 0 ? My / totalP : 0;
    const ey = totalP > 0 ? Mx / totalP : 0;

    const kernX = B / 6;
    const kernY = L / 6;
    const isFullContact = Math.abs(ex) <= kernX && Math.abs(ey) <= kernY;

    // Pressures at 4 corners: q = P/A * (1 +/- 6ex/B +/- 6ey/L)
    const baseP_A = totalP / (B * L);
    const q1 = baseP_A * (1 - (6 * ex) / B - (6 * ey) / L);
    const q2 = baseP_A * (1 + (6 * ex) / B - (6 * ey) / L);
    const q3 = baseP_A * (1 + (6 * ex) / B + (6 * ey) / L);
    const q4 = baseP_A * (1 - (6 * ex) / B + (6 * ey) / L);

    const qCorners = [q1, q2, q3, q4];
    let qMax = Math.max(...qCorners);
    let qMin = Math.min(...qCorners);

    let upliftAreaRatio = 0;
    if (!isFullContact && qMin < 0) {
      // Partial uplift: use Meyerhof equivalent effective area B' * L'
      const B_eff = Math.max(0.2 * B, B - 2 * Math.abs(ex));
      const L_eff = Math.max(0.2 * L, L - 2 * Math.abs(ey));
      qMax = totalP / (B_eff * L_eff);
      qMin = 0;
      upliftAreaRatio = Number((1 - (B_eff * L_eff) / (B * L)).toFixed(3));
    }

    const qAvg = (qMax + Math.max(0, qMin)) / 2;

    const soilPressures: SoilPressureResults = {
      qMax_kPa: Number(qMax.toFixed(1)),
      qMin_kPa: Number(Math.max(0, qMin).toFixed(1)),
      qAvg_kPa: Number(qAvg.toFixed(1)),
      qCorner1_kPa: Number(q1.toFixed(1)),
      qCorner2_kPa: Number(q2.toFixed(1)),
      qCorner3_kPa: Number(q3.toFixed(1)),
      qCorner4_kPa: Number(q4.toFixed(1)),
      eccentricityX_m: Number(ex.toFixed(4)),
      eccentricityY_m: Number(ey.toFixed(4)),
      isFullContact,
      upliftAreaRatio,
    };

    // Net upward design pressure for structural concrete design (exclude footing self weight)
    const qNetDesign = loads.P_kN / (B * L);

    // 2. One-Way (Beam) Shear Verification
    // Critical section at distance d from column face
    const colX = column.width_m;
    const colY = column.length_m;

    // Overhangs from column face
    const overhangX = (B - colX) / 2;
    const overhangY = (L - colY) / 2;

    // Shear in X-direction (cantilever overhang X): critical plane at distance d from col face
    const shearLengthX = Math.max(0, overhangX - d);
    const VuX = qNetDesign * shearLengthX * L;

    // Shear in Y-direction (cantilever overhang Y): critical plane at distance d from col face
    const shearLengthY = Math.max(0, overhangY - d);
    const VuY = qNetDesign * shearLengthY * B;

    // Concrete one-way shear strength
    // ACI 318-19: phi * 0.17 * sqrt(f'c) * b * d (with phi = 0.75)
    // Eurocode 2: 0.12 * k * (100 * rho * fck)^(1/3) * b * d (with k = 1 + sqrt(200/d_mm) <= 2.0)
    let phiVcX = 0;
    let phiVcY = 0;

    if (code === 'ACI_318_19') {
      const phi = 0.75;
      const v_c_MPa = 0.17 * Math.sqrt(materials.fc_MPa);
      phiVcX = phi * v_c_MPa * 1000 * L * d; // kN
      phiVcY = phi * v_c_MPa * 1000 * B * d; // kN
    } else if (code === 'EUROCODE_2') {
      const gammaC_m = 1.5;
      const k = Math.min(2.0, 1 + Math.sqrt(0.2 / Math.max(0.1, d)));
      const v_c_MPa = (0.18 / gammaC_m) * k * Math.pow(100 * 0.002 * materials.fc_MPa, 1 / 3);
      phiVcX = v_c_MPa * 1000 * L * d;
      phiVcY = v_c_MPa * 1000 * B * d;
    } else {
      // IS 456: tau_c * b * d (approx tau_c = 0.36 * sqrt(fck) / 2.5 ~ 0.35 MPa)
      const tau_c = 0.28 * Math.sqrt(materials.fc_MPa);
      phiVcX = (tau_c / 1.5) * 1000 * L * d;
      phiVcY = (tau_c / 1.5) * 1000 * B * d;
    }

    const util1WayX = phiVcX > 0 ? Number((VuX / phiVcX).toFixed(3)) : 0;
    const util1WayY = phiVcY > 0 ? Number((VuY / phiVcY).toFixed(3)) : 0;

    const oneWayShearX: OneWayShearCheck = {
      direction: 'X',
      criticalSectionDistance_m: Number(d.toFixed(3)),
      Vu_kN: Number(VuX.toFixed(1)),
      phiVc_kN: Number(phiVcX.toFixed(1)),
      utilization: util1WayX,
      status: util1WayX <= 1.0 ? 'PASS' : 'FAIL',
    };

    const oneWayShearY: OneWayShearCheck = {
      direction: 'Y',
      criticalSectionDistance_m: Number(d.toFixed(3)),
      Vu_kN: Number(VuY.toFixed(1)),
      phiVc_kN: Number(phiVcY.toFixed(1)),
      utilization: util1WayY,
      status: util1WayY <= 1.0 ? 'PASS' : 'FAIL',
    };

    // 3. Two-Way (Punching) Shear Verification
    // Critical perimeter b0 at d/2 from column face
    const critX = colX + d;
    const critY = colY + d;
    const b0 = 2 * (critX + critY);
    const critArea = critX * critY;

    // Upward force inside critical perimeter relieves punching shear
    const Vup = Math.max(0, loads.P_kN - qNetDesign * critArea);

    let phiVcp = 0;
    if (code === 'ACI_318_19') {
      const phi = 0.75;
      const beta_c = Math.max(colX, colY) / Math.min(colX, colY);
      const alpha_s = 40; // Interior column
      const vc1 = 0.33 * Math.sqrt(materials.fc_MPa);
      const vc2 = (0.17 + 0.33 / beta_c) * Math.sqrt(materials.fc_MPa);
      const vc3 = (0.083 * (alpha_s * d) / b0 + 0.17) * Math.sqrt(materials.fc_MPa);
      const vcMin = Math.min(vc1, vc2, vc3);
      phiVcp = phi * vcMin * 1000 * b0 * d; // kN
    } else if (code === 'EUROCODE_2') {
      const gammaC_m = 1.5;
      const k = Math.min(2.0, 1 + Math.sqrt(0.2 / Math.max(0.1, d)));
      const v_Rd_c = (0.18 / gammaC_m) * k * Math.pow(100 * 0.002 * materials.fc_MPa, 1 / 3);
      // EC2 critical perimeter u1 is at 2d from column face
      const u1 = 2 * (colX + colY) + 2 * Math.PI * (2 * d);
      phiVcp = v_Rd_c * 1000 * u1 * d;
    } else {
      // IS 456
      const beta_c = Math.max(colX, colY) / Math.min(colX, colY);
      const ks = Math.min(1.0, 0.5 + beta_c);
      const tau_c = 0.25 * Math.sqrt(materials.fc_MPa);
      phiVcp = (ks * tau_c / 1.5) * 1000 * b0 * d;
    }

    const utilPunching = phiVcp > 0 ? Number((Vup / phiVcp).toFixed(3)) : 0;
    const twoWayPunching: TwoWayPunchingShearCheck = {
      criticalPerimeter_b0_m: Number(b0.toFixed(3)),
      criticalArea_m2: Number(critArea.toFixed(3)),
      Vup_kN: Number(Vup.toFixed(1)),
      phiVc_kN: Number(phiVcp.toFixed(1)),
      utilization: utilPunching,
      status: utilPunching <= 1.0 ? 'PASS' : 'FAIL',
    };

    // 4. Flexural Moment Demand & Rebar Sizing
    // Moment at column face along X: Mu_X = qNetDesign * (overhangX^2 / 2) * L
    const MuX = qNetDesign * ((overhangX * overhangX) / 2) * L;
    // Moment at column face along Y: Mu_Y = qNetDesign * (overhangY^2 / 2) * B
    const MuY = qNetDesign * ((overhangY * overhangY) / 2) * B;

    const calcRebar = (Mu: number, b_m: number): { AsReq: number; AsMin: number; AsProv: number; count: number; spacing: number; util: number } => {
      const phiM = 0.9;
      // Approximate arm jd ~ 0.9 * d
      const jd = 0.9 * d;
      const AsReq_mm2 = (Mu * 1e6) / (phiM * materials.fy_MPa * (jd * 1000));
      // Min rebar ratio
      const rhoMin = code === 'ACI_318_19' ? 0.0018 : 0.0015;
      const AsMin_mm2 = rhoMin * (b_m * 1000) * (H * 1000);

      const AsTarget = Math.max(AsReq_mm2, AsMin_mm2);
      const barArea_mm2 = (Math.PI / 4) * Math.pow(assumedDb * 1000, 2); // ~201 mm2 for #16
      const count = Math.max(4, Math.ceil(AsTarget / barArea_mm2));
      const AsProv_mm2 = count * barArea_mm2;
      const spacing_mm = Math.floor(((b_m * 1000) - 2 * (cover * 1000)) / (count - 1));

      const util = AsProv_mm2 > 0 ? Number((AsTarget / AsProv_mm2).toFixed(3)) : 0;
      return { AsReq: AsReq_mm2, AsMin: AsMin_mm2, AsProv: AsProv_mm2, count, spacing: spacing_mm, util };
    };

    const rebX = calcRebar(MuX, L);
    const rebY = calcRebar(MuY, B);

    const flexureX: FlexuralReinforcementCheck = {
      direction: 'X',
      Mu_kNm: Number(MuX.toFixed(1)),
      AsRequired_mm2: Number(rebX.AsReq.toFixed(1)),
      AsMin_mm2: Number(rebX.AsMin.toFixed(1)),
      AsProvided_mm2: Number(rebX.AsProv.toFixed(1)),
      barDiameter_mm: Math.round(assumedDb * 1000),
      barSpacing_mm: rebX.spacing,
      barCount: rebX.count,
      utilization: rebX.util,
      status: rebX.util <= 1.0 ? 'PASS' : 'FAIL',
    };

    const flexureY: FlexuralReinforcementCheck = {
      direction: 'Y',
      Mu_kNm: Number(MuY.toFixed(1)),
      AsRequired_mm2: Number(rebY.AsReq.toFixed(1)),
      AsMin_mm2: Number(rebY.AsMin.toFixed(1)),
      AsProvided_mm2: Number(rebY.AsProv.toFixed(1)),
      barDiameter_mm: Math.round(assumedDb * 1000),
      barSpacing_mm: rebY.spacing,
      barCount: rebY.count,
      utilization: rebY.util,
      status: rebY.util <= 1.0 ? 'PASS' : 'FAIL',
    };

    const maxUtilization = Math.max(
      util1WayX,
      util1WayY,
      utilPunching,
      rebX.util,
      rebY.util
    );

    return {
      dimensions,
      column,
      effectiveDepth_m: Number(d.toFixed(3)),
      selfWeight_kN: Number(selfWeight_kN.toFixed(1)),
      soilPressures,
      oneWayShearX,
      oneWayShearY,
      twoWayPunching,
      flexureX,
      flexureY,
      maxUtilization,
      overallStatus: maxUtilization <= 1.0 ? 'PASS' : 'FAIL',
      codeUsed: code,
    };
  }
}
