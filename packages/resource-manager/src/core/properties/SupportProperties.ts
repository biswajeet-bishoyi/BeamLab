export interface SupportProperties {
  type: 'Pinned' | 'Fixed' | 'Roller' | 'Custom';
  ux: boolean; // true if fixed
  uy: boolean;
  uz: boolean;
  rx: boolean;
  ry: boolean;
  rz: boolean;
}
