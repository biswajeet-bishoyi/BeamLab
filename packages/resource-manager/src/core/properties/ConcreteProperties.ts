export interface ConcreteProperties {
  grade: string; // e.g. 'M20'
  compressiveStrength: number;
  elasticModulus: number;
  density: number;
  poissonsRatio: number;
  thermalExpansion: number;
  creepCoefficient?: number;
  shrinkageCoefficient?: number;
}
