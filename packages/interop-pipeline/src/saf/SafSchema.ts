/**
 * SafSchema.ts
 *
 * Structural Analysis Format (SAF) v2.x Schema Definitions.
 * SAF is the industry-standard tabular format for bi-directional structural data exchange
 * between analytical software (SCIA Engineer, Dlubal RFEM, AxisVM, SOFiSTiK)
 * and BIM authoring tools (Allplan, Archicad, Revit).
 */

export type SafSupportType = 'Free' | 'Rigid' | number; // Number indicates spring stiffness in kN/m or kNm/rad

export interface SafProjectInfo {
  readonly modelName: string;
  readonly description?: string;
  readonly author?: string;
  readonly dateCreated?: string;
  readonly units: {
    readonly length: 'm' | 'mm';
    readonly force: 'kN' | 'N';
    readonly moment: 'kNm' | 'Nm';
    readonly angle: 'rad' | 'deg';
    readonly mass: 'kg' | 't';
  };
}

export type SafMaterialType = 'Steel' | 'Concrete' | 'Timber' | 'Aluminium' | 'Other';

export interface SafMaterial {
  readonly name: string; // e.g. "S355", "C30/37"
  readonly materialType: SafMaterialType;
  readonly E_GPa: number; // Young's modulus
  readonly G_GPa?: number; // Shear modulus
  readonly nu: number; // Poisson's ratio
  readonly density_kg_m3: number; // Unit mass density
  readonly thermalExpansion_perK?: number; // Thermal expansion coefficient
  readonly yieldStrength_MPa?: number; // Steel fy or concrete fck
}

export type SafCrossSectionForm =
  | 'Standard' // Catalog profile e.g. IPE, HEB, W-shape
  | 'Parametric' // Rectangular, Circular, RHS, CHS, Angle, Channel, T-shape
  | 'General'; // Custom polygon / compound

export interface SafCrossSection {
  readonly name: string; // e.g. "IPE300", "RECT_400x600"
  readonly materialName: string;
  readonly form: SafCrossSectionForm;
  readonly profileName?: string; // Standard profile code
  // Parametric dimensions in meters
  readonly shapeType?: 'Rectangular' | 'Circular' | 'I-Shape' | 'Box' | 'Angle' | 'Channel' | 'T-Shape';
  readonly height_m?: number;
  readonly width_m?: number;
  readonly webThickness_m?: number;
  readonly flangeThickness_m?: number;
  readonly diameter_m?: number;
  // Section properties (calculated or catalog)
  readonly area_m2?: number;
  readonly Iy_m4?: number;
  readonly Iz_m4?: number;
  readonly It_m4?: number; // Torsional constant
}

export interface SafPointSupportCondition {
  readonly Ux: SafSupportType;
  readonly Uy: SafSupportType;
  readonly Uz: SafSupportType;
  readonly Rx: SafSupportType;
  readonly Ry: SafSupportType;
  readonly Rz: SafSupportType;
}

export interface SafPointConnection {
  readonly name: string; // Node ID e.g. "N1", "N2"
  readonly x_m: number;
  readonly y_m: number;
  readonly z_m: number;
  readonly support?: SafPointSupportCondition;
}

export type SafMemberType = 'Beam' | 'Column' | 'Truss' | 'Rib' | 'General';

export interface SafMemberEndRelease {
  readonly Rx: boolean; // Pinned if true
  readonly Ry: boolean;
  readonly Rz: boolean;
}

export interface SafCurveMember {
  readonly name: string; // Member ID e.g. "B1", "C1"
  readonly memberType: SafMemberType;
  readonly crossSectionName: string;
  readonly startNodeName: string;
  readonly endNodeName: string;
  readonly rotationAngle_deg?: number; // LCS rotation angle beta
  readonly startRelease?: SafMemberEndRelease;
  readonly endRelease?: SafMemberEndRelease;
  readonly eccentricityX_m?: number;
  readonly eccentricityY_m?: number;
  readonly eccentricityZ_m?: number;
}

export type SafSurfaceType = 'Wall' | 'Slab' | 'Plate' | 'Shell';

export interface SafSurfaceMember {
  readonly name: string; // Panel ID e.g. "S1", "W1"
  readonly surfaceType: SafSurfaceType;
  readonly thickness_m: number;
  readonly materialName: string;
  readonly boundaryNodeNames: string[]; // Ordered vertices enclosing surface
}

export type SafActionType = 'Permanent' | 'Variable' | 'Wind' | 'Seismic' | 'Accidental' | 'Temperature';

export interface SafLoadCase {
  readonly name: string; // e.g. "LC1_Dead", "LC2_Live"
  readonly actionType: SafActionType;
  readonly description?: string;
  readonly selfWeightFactor?: number; // 1.0 if auto-weight enabled
}

export interface SafPointLoad {
  readonly name: string;
  readonly nodeName: string;
  readonly loadCaseName: string;
  readonly Fx_kN: number;
  readonly Fy_kN: number;
  readonly Fz_kN: number;
  readonly Mx_kNm: number;
  readonly My_kNm: number;
  readonly Mz_kNm: number;
}

export interface SafCurveLoad {
  readonly name: string;
  readonly memberName: string;
  readonly loadCaseName: string;
  readonly coordinateSystem: 'Global' | 'Local';
  readonly isUniform: boolean;
  // Uniform or start values (kN/m)
  readonly qx_kN_m: number;
  readonly qy_kN_m: number;
  readonly qz_kN_m: number;
  // End values for trapezoidal loads (kN/m)
  readonly qx_end_kN_m?: number;
  readonly qy_end_kN_m?: number;
  readonly qz_end_kN_m?: number;
}

export interface SafLoadCombination {
  readonly name: string; // e.g. "ULS_101", "SLS_201"
  readonly combinationType: 'Ultimate' | 'Serviceability' | 'Accidental';
  readonly loadCaseFactors: Record<string, number>; // { "LC1_Dead": 1.35, "LC2_Live": 1.5 }
}

export interface SafModel {
  readonly project: SafProjectInfo;
  readonly materials: SafMaterial[];
  readonly crossSections: SafCrossSection[];
  readonly nodes: SafPointConnection[];
  readonly members: SafCurveMember[];
  readonly surfaces: SafSurfaceMember[];
  readonly loadCases: SafLoadCase[];
  readonly pointLoads: SafPointLoad[];
  readonly curveLoads: SafCurveLoad[];
  readonly combinations: SafLoadCombination[];
}
