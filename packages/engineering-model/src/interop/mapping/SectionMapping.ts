/**
 * BeamLab B1.5 — Interop Section Profile Mapping
 */

import { StructuralSection, SectionProfile } from '../../structural/StructuralSection';

export class SectionMapper {
  private readonly _profileMap: Map<string, SectionProfile> = new Map();

  constructor() {
    this._registerBuiltInProfiles();
  }

  registerProfile(designation: string, profile: SectionProfile): void {
    this._profileMap.set(designation.toUpperCase().replace(/\s+/g, ''), profile);
  }

  /**
   * Resolve an external section name to a StructuralSection
   */
  resolveSection(externalDesignation: string): StructuralSection {
    const key = externalDesignation.toUpperCase().replace(/\s+/g, '');
    const found = this._profileMap.get(key);
    if (found) {
      return new StructuralSection(`sec-${key.toLowerCase()}`, found);
    }

    // Try parsing parametric rectangle "RECT_300x500" or "B300_D500"
    const rectMatch = externalDesignation.match(/(?:rect|rec|beam|col)?\s*(\d+)\s*[xX*]\s*(\d+)/i);
    if (rectMatch && rectMatch[1] && rectMatch[2]) {
      const b = parseFloat(rectMatch[1]) * 0.001; // mm to m
      const h = parseFloat(rectMatch[2]) * 0.001;
      const area = b * h;
      const iz = (b * Math.pow(h, 3)) / 12.0;
      const iy = (h * Math.pow(b, 3)) / 12.0;
      const j = (b * h * (b * b + h * h)) / 12.0; // approx
      return new StructuralSection(`sec-rect-${Math.round(b * 1000)}x${Math.round(h * 1000)}`, {
        designation: externalDesignation,
        type: 'SolidRect',
        properties: {
          area,
          momentOfInertiaY: iy,
          momentOfInertiaZ: iz,
          torsionalConstant: j,
        },
        dimensions: { b, h },
      });
    }

    // Fallback default IPE 300
    return new StructuralSection(
      `sec-${key.toLowerCase() || 'default'}`,
      {
        designation: externalDesignation || 'IPE 300 (Assumed)',
        type: 'I',
        properties: {
          area: 5.38e-3,
          momentOfInertiaY: 6.04e-6,
          momentOfInertiaZ: 8.36e-5,
          torsionalConstant: 2.01e-7,
        },
        dimensions: {
          d: 0.3,
          bf: 0.15,
          tw: 0.0071,
          tf: 0.0107,
        },
      },
    );
  }

  private _registerBuiltInProfiles(): void {
    // IPE series
    this.registerProfile('IPE200', {
      designation: 'IPE 200',
      type: 'I',
      properties: {
        area: 2.85e-3,
        momentOfInertiaY: 1.42e-6,
        momentOfInertiaZ: 1.94e-5,
        torsionalConstant: 6.98e-8,
      },
      dimensions: {
        d: 0.2,
        bf: 0.1,
        tw: 0.0056,
        tf: 0.0085,
      },
    });

    this.registerProfile('IPE300', {
      designation: 'IPE 300',
      type: 'I',
      properties: {
        area: 5.38e-3,
        momentOfInertiaY: 6.04e-6,
        momentOfInertiaZ: 8.36e-5,
        torsionalConstant: 2.01e-7,
      },
      dimensions: {
        d: 0.3,
        bf: 0.15,
        tw: 0.0071,
        tf: 0.0107,
      },
    });

    // AISC W series
    this.registerProfile('W12X26', {
      designation: 'W12x26',
      type: 'I',
      properties: {
        area: 4.94e-3,
        momentOfInertiaY: 7.2e-6,
        momentOfInertiaZ: 8.49e-5,
        torsionalConstant: 1.25e-7,
      },
      dimensions: {
        d: 0.31,
        bf: 0.165,
        tw: 0.0058,
        tf: 0.0097,
      },
    });

    // Indian ISMB series
    this.registerProfile('ISMB300', {
      designation: 'ISMB 300',
      type: 'I',
      properties: {
        area: 5.63e-3,
        momentOfInertiaY: 4.54e-6,
        momentOfInertiaZ: 8.6e-5,
        torsionalConstant: 2.12e-7,
      },
      dimensions: {
        d: 0.3,
        bf: 0.14,
        tw: 0.0075,
        tf: 0.0124,
      },
    });
  }
}
