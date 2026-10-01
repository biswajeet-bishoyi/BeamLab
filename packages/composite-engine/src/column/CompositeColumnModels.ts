export type CompositeColumnType = 'rectangular_cft' | 'circular_cft' | 'encased_wide_flange';

export interface RectangularCftDefinition {
  type: 'rectangular_cft';
  id: string;
  name: string;
  /** Outer width B (mm) */
  widthB: number;
  /** Outer depth H (mm) */
  depthH: number;
  /** Steel tube wall thickness t_w (mm) */
  wallThickness: number;
  /** Steel yield strength Fy (MPa) */
  steelYieldStrength: number;
  /** Steel elastic modulus Es (MPa), default 200,000 */
  steelElasticModulus?: number;
  /** Concrete compressive strength f'c (MPa) */
  concreteStrengthFc: number;
  /** Concrete density (kg/m^3), default 2400 */
  concreteDensity?: number;
}

export interface CircularCftDefinition {
  type: 'circular_cft';
  id: string;
  name: string;
  /** Outer diameter D (mm) */
  outerDiameter: number;
  /** Steel tube wall thickness t_w (mm) */
  wallThickness: number;
  /** Steel yield strength Fy (MPa) */
  steelYieldStrength: number;
  /** Steel elastic modulus Es (MPa), default 200,000 */
  steelElasticModulus?: number;
  /** Concrete compressive strength f'c (MPa) */
  concreteStrengthFc: number;
  /** Concrete density (kg/m^3), default 2400 */
  concreteDensity?: number;
}

export interface EncasedColumnDefinition {
  type: 'encased_wide_flange';
  id: string;
  name: string;
  /** Concrete column width bc (mm) */
  concreteWidth: number;
  /** Concrete column depth hc (mm) */
  concreteDepth: number;
  /** Embedded steel profile */
  embeddedSteel: {
    depth: number;
    flangeWidth: number;
    flangeThickness: number;
    webThickness: number;
    area: number; // mm^2
    Ix: number; // mm^4
    Iy: number; // mm^4
    yieldStrength: number; // MPa
    elasticModulus: number; // MPa
  };
  /** Longitudinal rebar reinforcement */
  rebar: {
    areaTotal: number; // mm^2
    yieldStrength: number; // MPa
    Ix: number; // mm^4
    Iy: number; // mm^4
  };
  /** Concrete compressive strength f'c (MPa) */
  concreteStrengthFc: number;
  concreteDensity?: number;
}

export type CompositeColumnDefinition =
  | RectangularCftDefinition
  | CircularCftDefinition
  | EncasedColumnDefinition;

export interface ColumnBoundaryConditions {
  /** Unbraced column length L (m) */
  unbracedLength: number;
  /** Effective length factor K (default 1.0 for pinned-pinned, 0.7 for fixed-pinned, etc.) */
  effectiveLengthFactor?: number;
}
