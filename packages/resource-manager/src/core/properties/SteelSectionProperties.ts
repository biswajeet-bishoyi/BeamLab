export interface SteelSectionProperties {
  sectionName: string;
  designation: string;
  depth: number;
  width: number;
  webThickness: number;
  flangeThickness: number;
  crossSectionalArea: number;
  massPerMeter: number;
  momentOfInertiaX: number;
  momentOfInertiaY: number;
  radiusOfGyrationX: number;
  radiusOfGyrationY: number;
  elasticModulusX: number;
  elasticModulusY: number;
  plasticModulusX: number;
  plasticModulusY: number;
  torsionalConstant?: number;
  warpingConstant?: number;
  yieldStrength?: number;
  ultimateStrength?: number;
  density?: number;
  materialGrade?: string;
}
