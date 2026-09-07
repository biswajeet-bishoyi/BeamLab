/**
 * BeamLab B1.5 — Interop Material Mapping
 */

import { StructuralMaterial, MaterialDefinition } from '../../structural/StructuralMaterial';

export interface MaterialAliasRule {
  readonly externalPattern: RegExp;
  readonly canonicalId: string;
  readonly defaultDefinition: MaterialDefinition;
}

export class MaterialMapper {
  private readonly _aliases: MaterialAliasRule[] = [];

  constructor() {
    this._registerBuiltInAliases();
  }

  registerAlias(pattern: RegExp, canonicalId: string, definition: MaterialDefinition): void {
    this._aliases.push({ externalPattern: pattern, canonicalId, defaultDefinition: definition });
  }

  /**
   * Resolve an external material name/string to a canonical StructuralMaterial
   */
  resolveMaterial(externalName: string): StructuralMaterial {
    const trimmed = externalName.trim();
    for (const alias of this._aliases) {
      if (alias.externalPattern.test(trimmed)) {
        return new StructuralMaterial(alias.canonicalId, alias.defaultDefinition);
      }
    }

    // Fallback default steel S355
    return new StructuralMaterial(
      `mat-custom-${trimmed.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'default'}`,
      {
        category: 'Steel',
        grade: trimmed || 'Custom',
        elasticModulus: 210e9,
        shearModulus: 81e9,
        poissonRatio: 0.3,
        density: 7850,
        thermalExpansion: 1.2e-5,
        yieldStrength: 355e6,
        ultimateStrength: 490e6,
      },
    );
  }

  private _registerBuiltInAliases(): void {
    // Structural Steels (S275, S355, A36, A992, Fe410, IS2062)
    this.registerAlias(/s\s*355|fe\s*410|a\s*992/i, 'mat-s355', {
      category: 'Steel',
      grade: 'S355',
      elasticModulus: 210e9,
      shearModulus: 81e9,
      poissonRatio: 0.3,
      density: 7850,
      thermalExpansion: 1.2e-5,
      yieldStrength: 355e6,
      ultimateStrength: 490e6,
    });

    this.registerAlias(/s\s*275|a\s*36|fe\s*250/i, 'mat-s275', {
      category: 'Steel',
      grade: 'S275',
      elasticModulus: 210e9,
      shearModulus: 81e9,
      poissonRatio: 0.3,
      density: 7850,
      thermalExpansion: 1.2e-5,
      yieldStrength: 275e6,
      ultimateStrength: 410e6,
    });

    // Concrete Grades (M25, M30, C25/30, C30/37)
    this.registerAlias(/m\s*30|c\s*30\/37|concrete/i, 'mat-m30', {
      category: 'Concrete',
      grade: 'M30',
      elasticModulus: 27.4e9,
      shearModulus: 11.4e9,
      poissonRatio: 0.2,
      density: 2500,
      thermalExpansion: 1.0e-5,
      yieldStrength: 30e6,
    });

    this.registerAlias(/m\s*25|c\s*25\/30/i, 'mat-m25', {
      category: 'Concrete',
      grade: 'M25',
      elasticModulus: 25e9,
      shearModulus: 10.4e9,
      poissonRatio: 0.2,
      density: 2500,
      thermalExpansion: 1.0e-5,
      yieldStrength: 25e6,
    });

    // Timber (GL24, C24)
    this.registerAlias(/timber|wood|c\s*24|gl\s*24/i, 'mat-gl24h', {
      category: 'Timber',
      grade: 'GL24h',
      elasticModulus: 11.5e9,
      shearModulus: 0.65e9,
      poissonRatio: 0.35,
      density: 420,
      thermalExpansion: 5.0e-6,
      yieldStrength: 24e6,
    });

    // Aluminum (6061-T6)
    this.registerAlias(/al\s*6061|aluminum|aluminium/i, 'mat-al6061-t6', {
      category: 'Aluminium',
      grade: '6061-T6',
      elasticModulus: 69e9,
      shearModulus: 26e9,
      poissonRatio: 0.33,
      density: 2700,
      thermalExpansion: 2.3e-5,
      yieldStrength: 276e6,
      ultimateStrength: 310e6,
    });
  }
}
