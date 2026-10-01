export interface PrestressingStrand {
  id: string;
  name: string;
  standard: 'ASTM A416' | 'EN 10138-3' | 'IS 14268';
  nominalDiameterMm: number;
  nominalAreaMm2: number;
  nominalWeightKgPerM: number;
  fpuMpa: number;       // Ultimate tensile strength (e.g., 1860 MPa)
  fpyMpa: number;       // Yield strength at 1% extension (0.90 * fpu for low relaxation)
  elasticModulusMpa: number; // Ep, typically 195,000 MPa
  relaxationType: 'low-relaxation' | 'normal-relaxation';
}

export interface TendonAssemblyInput {
  strandId: string;
  numberOfStrands: number;
  systemType: 'bonded' | 'unbonded';
  ductType?: 'corrugated-metal' | 'corrugated-plastic' | 'greased-pe-sheath';
  customDuctDiameterMm?: number;
  jackingStressRatio?: number; // Fraction of fpu, typically 0.75 to 0.80 (default 0.75)
}

export interface TendonAssembly {
  strand: PrestressingStrand;
  numberOfStrands: number;
  systemType: 'bonded' | 'unbonded';
  ductType: 'corrugated-metal' | 'corrugated-plastic' | 'greased-pe-sheath';
  ductDiameterMm: number;
  totalAreaMm2: number;
  fpuMpa: number;
  fpyMpa: number;
  elasticModulusMpa: number;
  jackingStressRatio: number;
  jackingStressMpa: number;
  jackingForceKn: number;
  maxAllowableJackingStressMpa: number; // ACI 318-19 Sec 20.3.2.5.1: min(0.80*fpu, 0.94*fpy)
  maxAllowableTransferStressMpa: number; // min(0.70*fpu, 0.82*fpy)
  compliance: {
    jackingStressPass: boolean;
    utilization: number;
    governingClause: string;
  };
}

export const PRESTRESSING_STRANDS: Record<string, PrestressingStrand> = {
  'ASTM-A416-0.5': {
    id: 'ASTM-A416-0.5',
    name: 'ASTM A416 Gr 270 0.5" (12.7 mm)',
    standard: 'ASTM A416',
    nominalDiameterMm: 12.7,
    nominalAreaMm2: 98.7,
    nominalWeightKgPerM: 0.775,
    fpuMpa: 1860,
    fpyMpa: 1674, // 0.90 * fpu
    elasticModulusMpa: 195000,
    relaxationType: 'low-relaxation',
  },
  'ASTM-A416-0.6': {
    id: 'ASTM-A416-0.6',
    name: 'ASTM A416 Gr 270 0.6" (15.24 mm)',
    standard: 'ASTM A416',
    nominalDiameterMm: 15.24,
    nominalAreaMm2: 140.0,
    nominalWeightKgPerM: 1.102,
    fpuMpa: 1860,
    fpyMpa: 1674,
    elasticModulusMpa: 195000,
    relaxationType: 'low-relaxation',
  },
  'ASTM-A416-0.7': {
    id: 'ASTM-A416-0.7',
    name: 'ASTM A416 Gr 270 0.7" (17.8 mm)',
    standard: 'ASTM A416',
    nominalDiameterMm: 17.8,
    nominalAreaMm2: 223.0,
    nominalWeightKgPerM: 1.750,
    fpuMpa: 1860,
    fpyMpa: 1674,
    elasticModulusMpa: 195000,
    relaxationType: 'low-relaxation',
  },
  'EN-10138-3-Y1860S7-12.9': {
    id: 'EN-10138-3-Y1860S7-12.9',
    name: 'Eurocode EN 10138-3 Y1860S7 (12.9 mm)',
    standard: 'EN 10138-3',
    nominalDiameterMm: 12.9,
    nominalAreaMm2: 100.0,
    nominalWeightKgPerM: 0.785,
    fpuMpa: 1860,
    fpyMpa: 1674,
    elasticModulusMpa: 195000,
    relaxationType: 'low-relaxation',
  },
  'EN-10138-3-Y1860S7-15.7': {
    id: 'EN-10138-3-Y1860S7-15.7',
    name: 'Eurocode EN 10138-3 Y1860S7 (15.7 mm)',
    standard: 'EN 10138-3',
    nominalDiameterMm: 15.7,
    nominalAreaMm2: 150.0,
    nominalWeightKgPerM: 1.180,
    fpuMpa: 1860,
    fpyMpa: 1674,
    elasticModulusMpa: 195000,
    relaxationType: 'low-relaxation',
  },
  'IS-14268-Class2-12.7': {
    id: 'IS-14268-Class2-12.7',
    name: 'IS 14268 Class 2 (12.7 mm)',
    standard: 'IS 14268',
    nominalDiameterMm: 12.7,
    nominalAreaMm2: 98.7,
    nominalWeightKgPerM: 0.775,
    fpuMpa: 1860,
    fpyMpa: 1674,
    elasticModulusMpa: 195000,
    relaxationType: 'low-relaxation',
  },
};

export class StrandCatalog {
  public static getStrand(strandId: string): PrestressingStrand {
    const strand = PRESTRESSING_STRANDS[strandId];
    if (!strand) {
      throw new Error(`Prestressing strand with ID '${strandId}' not found in catalog.`);
    }
    return strand;
  }

  public static listStrands(): PrestressingStrand[] {
    return Object.values(PRESTRESSING_STRANDS);
  }

  public static createTendonAssembly(input: TendonAssemblyInput): TendonAssembly {
    const strand = this.getStrand(input.strandId);
    const n = Math.max(1, Math.round(input.numberOfStrands));
    const totalAreaMm2 = n * strand.nominalAreaMm2;

    const jackingStressRatio = input.jackingStressRatio ?? 0.75;
    const jackingStressMpa = jackingStressRatio * strand.fpuMpa;
    const jackingForceKn = (jackingStressMpa * totalAreaMm2) / 1000;

    // ACI 318-19 Section 20.3.2.5.1 limits:
    // Jacking: min(0.80 * fpu, 0.94 * fpy)
    // Transfer/post-seating: min(0.70 * fpu, 0.82 * fpy)
    const maxAllowableJackingStressMpa = Math.min(0.80 * strand.fpuMpa, 0.94 * strand.fpyMpa);
    const maxAllowableTransferStressMpa = Math.min(0.70 * strand.fpuMpa, 0.82 * strand.fpyMpa);

    const defaultDuctType = input.systemType === 'unbonded' ? 'greased-pe-sheath' : 'corrugated-metal';
    const ductType = input.ductType ?? defaultDuctType;

    // Standard duct diameter heuristic based on strand count (PTI recommendations)
    let ductDiameterMm = input.customDuctDiameterMm;
    if (!ductDiameterMm) {
      if (input.systemType === 'unbonded') {
        ductDiameterMm = strand.nominalDiameterMm + 2.5; // Sheath tight fit
      } else {
        // PTI duct area ratio >= 2.0 to 2.5 times strand area
        const requiredDuctArea = 2.25 * totalAreaMm2;
        ductDiameterMm = Math.round(Math.sqrt((4 * requiredDuctArea) / Math.PI));
        // Common standard internal duct sizes: 45mm, 55mm, 65mm, 75mm, 85mm, 100mm
        ductDiameterMm = Math.max(40, ductDiameterMm);
      }
    }

    const jackingStressPass = jackingStressMpa <= maxAllowableJackingStressMpa + 0.1;
    const utilization = jackingStressMpa / maxAllowableJackingStressMpa;

    return {
      strand,
      numberOfStrands: n,
      systemType: input.systemType,
      ductType,
      ductDiameterMm,
      totalAreaMm2,
      fpuMpa: strand.fpuMpa,
      fpyMpa: strand.fpyMpa,
      elasticModulusMpa: strand.elasticModulusMpa,
      jackingStressRatio,
      jackingStressMpa,
      jackingForceKn,
      maxAllowableJackingStressMpa,
      maxAllowableTransferStressMpa,
      compliance: {
        jackingStressPass,
        utilization,
        governingClause: 'ACI 318-19 Section 20.3.2.5.1 / Eurocode 2 Section 5.10.2.1',
      },
    };
  }
}
