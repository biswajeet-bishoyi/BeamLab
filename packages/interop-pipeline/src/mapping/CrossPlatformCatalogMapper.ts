/**
 * CrossPlatformCatalogMapper.ts
 *
 * Cross-platform structural profile and material catalog mapping engine.
 * Resolves vendor-specific naming variances across Autodesk Revit, Trimble Tekla,
 * SCIA Engineer, Dlubal RFEM, and standard AISC/Eurocode/IS libraries.
 */

export interface MappedSectionProfile {
  readonly originalName: string;
  readonly canonicalName: string;
  readonly standard: 'AISC' | 'EUROCODE' | 'BRITISH' | 'AUSTRALIAN' | 'CUSTOM';
  readonly shapeType: 'I_SHAPE' | 'HSS_RECT' | 'CHS_CIRC' | 'RECTANGULAR' | 'CIRCULAR' | 'ANGLE' | 'CHANNEL' | 'TEE';
  readonly depth_mm: number;
  readonly width_mm: number;
  readonly webThickness_mm?: number;
  readonly flangeThickness_mm?: number;
  readonly area_mm2?: number;
  readonly isExactCatalogMatch: boolean;
}

export interface MappedMaterial {
  readonly originalName: string;
  readonly canonicalName: string;
  readonly materialClass: 'STEEL' | 'CONCRETE' | 'TIMBER' | 'ALUMINUM' | 'UNKNOWN';
  readonly fy_MPa?: number;
  readonly fck_MPa?: number;
  readonly E_GPa: number;
  readonly nu: number;
}

export class CrossPlatformCatalogMapper {
  private customAliases = new Map<string, string>();

  /**
   * Register a user-defined alias for a specific proprietary catalog code.
   */
  registerAlias(alias: string, canonicalName: string): void {
    this.customAliases.set(this.cleanKey(alias), canonicalName.trim());
  }

  private cleanKey(str: string): string {
    return str
      .toUpperCase()
      .replace(/[\*]/g, 'X')
      .replace(/[\s_\-\/\\]+/g, '')
      .replace(/FAMILY.*:/g, '')
      .replace(/TYPE.*:/g, '');
  }

  /**
   * Resolves an incoming vendor section profile string into a standardized MappedSectionProfile.
   */
  mapProfile(rawName: string): MappedSectionProfile {
    if (!rawName || rawName.trim().length === 0) {
      return this.fallbackProfile(rawName || 'UNKNOWN');
    }

    const trimmed = rawName.trim();
    const clean = this.cleanKey(trimmed);

    // 1. Check custom registered aliases
    if (this.customAliases.has(clean)) {
      const canonical = this.customAliases.get(clean)!;
      return this.mapProfile(canonical);
    }

    // 2. European IPE profiles (e.g. "IPE300", "IPE 300", "IPE-300")
    const ipeMatch = clean.match(/^IPE(\d{2,3})$/);
    if (ipeMatch && ipeMatch[1]) {
      const depth = parseInt(ipeMatch[1], 10);
      const widthApprox = Number((depth * 0.5).toFixed(1));
      return {
        originalName: rawName,
        canonicalName: `IPE${depth}`,
        standard: 'EUROCODE',
        shapeType: 'I_SHAPE',
        depth_mm: depth,
        width_mm: widthApprox,
        webThickness_mm: Number((depth * 0.024).toFixed(1)),
        flangeThickness_mm: Number((depth * 0.035).toFixed(1)),
        isExactCatalogMatch: true,
      };
    }

    // 3. European HE profiles (e.g. "HEB200", "HE 200 B", "HE200-B", "HEA300", "HEM180")
    const heMatch = clean.match(/^HE([ABM])(\d{2,3})$/) || clean.match(/^HE(\d{2,3})([ABM])$/);
    if (heMatch) {
      const type = (heMatch[1]!.length === 1 ? heMatch[1]! : heMatch[2]!).toUpperCase();
      const depthNum = parseInt(heMatch[1]!.length > 1 ? heMatch[1]! : heMatch[2]!, 10);
      return {
        originalName: rawName,
        canonicalName: `HE${depthNum}${type}`,
        standard: 'EUROCODE',
        shapeType: 'I_SHAPE',
        depth_mm: depthNum,
        width_mm: depthNum,
        webThickness_mm: type === 'B' ? 9.0 : type === 'M' ? 15.0 : 6.5,
        flangeThickness_mm: type === 'B' ? 15.0 : type === 'M' ? 24.0 : 10.0,
        isExactCatalogMatch: true,
      };
    }

    // 4. US AISC W-Shapes (e.g. "W14X90", "W 14*90", "W14/90", "W-Wide Flange: W14X90")
    const wMatch = clean.match(/W(\d{1,2})X(\d{2,3})/);
    if (wMatch && wMatch[1] && wMatch[2]) {
      const nominalDepthInches = parseInt(wMatch[1], 10);
      const weightLbsPerFt = parseInt(wMatch[2], 10);
      const depth_mm = Number((nominalDepthInches * 25.4).toFixed(1));
      const width_mm = Number((depth_mm * (weightLbsPerFt > 50 ? 0.95 : 0.65)).toFixed(1));
      return {
        originalName: rawName,
        canonicalName: `W${nominalDepthInches}X${weightLbsPerFt}`,
        standard: 'AISC',
        shapeType: 'I_SHAPE',
        depth_mm,
        width_mm,
        isExactCatalogMatch: true,
      };
    }

    // 5. Rectangular Hollow Sections RHS / HSS (e.g. "RHS200x100x6", "HSS8X8X1/2", "HSS200X100X6")
    const rhsMatch = clean.match(/(?:RHS|HSS)(\d{2,3})X(\d{2,3})X(\d{1,2})/);
    if (rhsMatch && rhsMatch[1] && rhsMatch[2] && rhsMatch[3]) {
      const depth = parseInt(rhsMatch[1], 10);
      const width = parseInt(rhsMatch[2], 10);
      const thickness = parseInt(rhsMatch[3], 10);
      return {
        originalName: rawName,
        canonicalName: `RHS${depth}x${width}x${thickness}`,
        standard: 'EUROCODE',
        shapeType: 'HSS_RECT',
        depth_mm: depth,
        width_mm: width,
        webThickness_mm: thickness,
        flangeThickness_mm: thickness,
        isExactCatalogMatch: true,
      };
    }

    // 6. Parametric Solid Rectangular (e.g. "REC400x600", "RECT_300X500", "B300x600")
    const rectMatch = clean.match(/(?:REC|RECT|B|COL)?(\d{2,4})X(\d{2,4})/);
    if (rectMatch && rectMatch[1] && rectMatch[2]) {
      const d1 = parseInt(rectMatch[1], 10);
      const d2 = parseInt(rectMatch[2], 10);
      return {
        originalName: rawName,
        canonicalName: `RECT_${d1}x${d2}`,
        standard: 'CUSTOM',
        shapeType: 'RECTANGULAR',
        depth_mm: Math.max(d1, d2),
        width_mm: Math.min(d1, d2),
        isExactCatalogMatch: false,
      };
    }

    return this.fallbackProfile(rawName);
  }

  private fallbackProfile(rawName: string): MappedSectionProfile {
    return {
      originalName: rawName,
      canonicalName: rawName.trim().toUpperCase(),
      standard: 'CUSTOM',
      shapeType: 'I_SHAPE',
      depth_mm: 300,
      width_mm: 150,
      isExactCatalogMatch: false,
    };
  }

  /**
   * Resolves material string into canonical MappedMaterial.
   */
  mapMaterial(rawName: string): MappedMaterial {
    const clean = this.cleanKey(rawName || '');

    // Steel: S235, S275, S355, A36, A992, Gr50
    if (clean.includes('S355') || clean.includes('GR50') || clean.includes('A992')) {
      return {
        originalName: rawName,
        canonicalName: 'Steel_S355',
        materialClass: 'STEEL',
        fy_MPa: 355,
        E_GPa: 210,
        nu: 0.3,
      };
    }

    if (clean.includes('S275') || clean.includes('A36')) {
      return {
        originalName: rawName,
        canonicalName: 'Steel_S275',
        materialClass: 'STEEL',
        fy_MPa: 275,
        E_GPa: 210,
        nu: 0.3,
      };
    }

    // Concrete: C25/30, C30/37, C35/45, C40/50, 4000PSI, 5000PSI
    if (clean.includes('C30') || clean.includes('4000PSI')) {
      return {
        originalName: rawName,
        canonicalName: 'Concrete_C30_37',
        materialClass: 'CONCRETE',
        fck_MPa: 30,
        E_GPa: 33,
        nu: 0.2,
      };
    }

    if (clean.includes('C25') || clean.includes('3000PSI')) {
      return {
        originalName: rawName,
        canonicalName: 'Concrete_C25_30',
        materialClass: 'CONCRETE',
        fck_MPa: 25,
        E_GPa: 31,
        nu: 0.2,
      };
    }

    // Default Steel
    return {
      originalName: rawName,
      canonicalName: rawName.trim() || 'Steel_S355',
      materialClass: clean.includes('CONC') ? 'CONCRETE' : 'STEEL',
      E_GPa: clean.includes('CONC') ? 30 : 210,
      nu: clean.includes('CONC') ? 0.2 : 0.3,
    };
  }
}
