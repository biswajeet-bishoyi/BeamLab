export interface LoadProperties {
  type: 'Point' | 'UDL' | 'Moment' | 'Area' | 'Thermal';
  direction: 'X' | 'Y' | 'Z' | 'Global_X' | 'Global_Y' | 'Global_Z';
  magnitude?: number; // Representative magnitude, usually loads are instance specific, but this might be a template
  isPattern: boolean;
}
