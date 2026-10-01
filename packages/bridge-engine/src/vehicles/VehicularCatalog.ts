/**
 * @beamlab/bridge-engine - Vehicular Live Load Trains & Standards Catalog
 * Compliant with AASHTO LRFD (9th/10th Ed), Eurocode 1 (EN 1991-2), and IRC 6:2017
 */

export type BridgeStandard = 'AASHTO-LRFD' | 'EUROCODE-1' | 'IRC-6' | 'CUSTOM';

export interface WheelContactPatch {
  lengthMm: number; // Length along traffic direction
  widthMm: number;  // Width transverse to traffic direction
}

export interface AxleDefinition {
  id: string;
  axleIndex: number;
  loadKn: number;               // Total axle weight (kN)
  wheelLoadKn: number;          // Single wheel load = loadKn / 2 (kN)
  transverseTrackWidthM: number; // Transverse center-to-center wheel spacing (m)
  spacingToNextM: number;       // Longitudinal spacing to subsequent trailing axle (m), 0 for last axle
  contactPatch: WheelContactPatch;
}

export interface VehicularTrain {
  id: string;
  name: string;
  standard: BridgeStandard;
  category: 'truck' | 'tandem' | 'tracked' | 'lane-train' | 'special';
  description: string;
  totalWeightKn: number;
  overallLengthM: number;
  axles: AxleDefinition[];
  hasAssociatedLaneLoad: boolean;
  laneLoadKnPerM: number;       // Accompanying design lane uniform load (kN/m)
  designLaneWidthM: number;     // Standard width of design traffic lane (m)
  dynamicLoadAllowance: number; // Default dynamic impact factor IM (e.g. 0.33 for AASHTO)
  isFatigueTruck: boolean;
}

export class VehicularCatalog {
  /**
   * AASHTO LRFD HL-93 Design Truck (AASHTO 3.6.1.2.2)
   * 3 axles: 35 kN, 142 kN, 142 kN.
   * Spacing: Axle 1 to 2 = 4.3 m, Axle 2 to 3 = variable 4.3 m to 9.0 m (default 4.3 m for max simple-span moment).
   */
  public static getAashtoHL93Truck(rearSpacingM: number = 4.3): VehicularTrain {
    const validSpacing = Math.max(4.3, Math.min(9.0, rearSpacingM));
    const axles: AxleDefinition[] = [
      {
        id: 'axle-1',
        axleIndex: 1,
        loadKn: 35.0,
        wheelLoadKn: 17.5,
        transverseTrackWidthM: 1.8,
        spacingToNextM: 4.3,
        contactPatch: { lengthMm: 250, widthMm: 510 },
      },
      {
        id: 'axle-2',
        axleIndex: 2,
        loadKn: 142.0,
        wheelLoadKn: 71.0,
        transverseTrackWidthM: 1.8,
        spacingToNextM: validSpacing,
        contactPatch: { lengthMm: 250, widthMm: 510 },
      },
      {
        id: 'axle-3',
        axleIndex: 3,
        loadKn: 142.0,
        wheelLoadKn: 71.0,
        transverseTrackWidthM: 1.8,
        spacingToNextM: 0,
        contactPatch: { lengthMm: 250, widthMm: 510 },
      },
    ];

    return {
      id: 'aashto-hl93-truck',
      name: 'AASHTO HL-93 Design Truck',
      standard: 'AASHTO-LRFD',
      category: 'truck',
      description: 'Standard 3-axle design truck (35 kN front, 142 kN drive, 142 kN trailer) with accompanying 9.3 kN/m lane load.',
      totalWeightKn: 319.0,
      overallLengthM: 4.3 + validSpacing,
      axles,
      hasAssociatedLaneLoad: true,
      laneLoadKnPerM: 9.3,
      designLaneWidthM: 3.6,
      dynamicLoadAllowance: 0.33,
      isFatigueTruck: false,
    };
  }

  /**
   * AASHTO LRFD HL-93 Design Tandem (AASHTO 3.6.1.2.3)
   * 2 axles: 110 kN each spaced at 1.2 m.
   */
  public static getAashtoHL93Tandem(): VehicularTrain {
    const axles: AxleDefinition[] = [
      {
        id: 'tandem-1',
        axleIndex: 1,
        loadKn: 110.0,
        wheelLoadKn: 55.0,
        transverseTrackWidthM: 1.8,
        spacingToNextM: 1.2,
        contactPatch: { lengthMm: 250, widthMm: 510 },
      },
      {
        id: 'tandem-2',
        axleIndex: 2,
        loadKn: 110.0,
        wheelLoadKn: 55.0,
        transverseTrackWidthM: 1.8,
        spacingToNextM: 0,
        contactPatch: { lengthMm: 250, widthMm: 510 },
      },
    ];

    return {
      id: 'aashto-hl93-tandem',
      name: 'AASHTO HL-93 Design Tandem',
      standard: 'AASHTO-LRFD',
      category: 'tandem',
      description: 'Pair of 110 kN axles spaced at 1.2 m with accompanying 9.3 kN/m lane load (governs short spans < 12 m).',
      totalWeightKn: 220.0,
      overallLengthM: 1.2,
      axles,
      hasAssociatedLaneLoad: true,
      laneLoadKnPerM: 9.3,
      designLaneWidthM: 3.6,
      dynamicLoadAllowance: 0.33,
      isFatigueTruck: false,
    };
  }

  /**
   * AASHTO LRFD Fatigue Truck (AASHTO 3.6.1.4.1)
   * Single design truck with fixed 9.0 m rear axle spacing and 15% dynamic allowance.
   */
  public static getAashtoFatigueTruck(): VehicularTrain {
    const truck = this.getAashtoHL93Truck(9.0);
    return {
      ...truck,
      id: 'aashto-fatigue-truck',
      name: 'AASHTO Fatigue Design Truck',
      description: 'Single HL-93 truck with constant 9.0 m rear axle spacing, without lane load, used for Fatigue I & II limit states.',
      hasAssociatedLaneLoad: false,
      laneLoadKnPerM: 0,
      dynamicLoadAllowance: 0.15,
      isFatigueTruck: true,
    };
  }

  /**
   * Eurocode 1 EN 1991-2 Load Model 1 (LM1) - Lane 1
   * Tandem System TS: 2 axles of 300 kN spaced at 1.2 m, track 2.0 m.
   * UDL: 9.0 kN/m² over 3.0 m lane = 27.0 kN/m.
   */
  public static getEurocodeLM1Lane1(): VehicularTrain {
    const axles: AxleDefinition[] = [
      {
        id: 'ec-lm1-axle1',
        axleIndex: 1,
        loadKn: 300.0,
        wheelLoadKn: 150.0,
        transverseTrackWidthM: 2.0,
        spacingToNextM: 1.2,
        contactPatch: { lengthMm: 400, widthMm: 400 },
      },
      {
        id: 'ec-lm1-axle2',
        axleIndex: 2,
        loadKn: 300.0,
        wheelLoadKn: 150.0,
        transverseTrackWidthM: 2.0,
        spacingToNextM: 0,
        contactPatch: { lengthMm: 400, widthMm: 400 },
      },
    ];

    return {
      id: 'ec-lm1-lane1',
      name: 'Eurocode LM1 (Lane 1 TS + UDL)',
      standard: 'EUROCODE-1',
      category: 'tandem',
      description: 'EN 1991-2 Load Model 1 Lane 1: Double axle 2x300 kN tandem system with 9.0 kN/m² (27 kN/m) UDL.',
      totalWeightKn: 600.0,
      overallLengthM: 1.2,
      axles,
      hasAssociatedLaneLoad: true,
      laneLoadKnPerM: 27.0,
      designLaneWidthM: 3.0,
      dynamicLoadAllowance: 0.0, // Dynamic amplification already incorporated in LM1 alpha factors
      isFatigueTruck: false,
    };
  }

  /**
   * Eurocode 1 EN 1991-2 Load Model 1 (LM1) - Lane 2
   * Tandem System TS: 2 axles of 200 kN spaced at 1.2 m.
   * UDL: 2.5 kN/m² over 3.0 m lane = 7.5 kN/m.
   */
  public static getEurocodeLM1Lane2(): VehicularTrain {
    const axles: AxleDefinition[] = [
      {
        id: 'ec-lm1-l2-axle1',
        axleIndex: 1,
        loadKn: 200.0,
        wheelLoadKn: 100.0,
        transverseTrackWidthM: 2.0,
        spacingToNextM: 1.2,
        contactPatch: { lengthMm: 400, widthMm: 400 },
      },
      {
        id: 'ec-lm1-l2-axle2',
        axleIndex: 2,
        loadKn: 200.0,
        wheelLoadKn: 100.0,
        transverseTrackWidthM: 2.0,
        spacingToNextM: 0,
        contactPatch: { lengthMm: 400, widthMm: 400 },
      },
    ];

    return {
      id: 'ec-lm1-lane2',
      name: 'Eurocode LM1 (Lane 2 TS + UDL)',
      standard: 'EUROCODE-1',
      category: 'tandem',
      description: 'EN 1991-2 Load Model 1 Lane 2: Double axle 2x200 kN tandem system with 2.5 kN/m² (7.5 kN/m) UDL.',
      totalWeightKn: 400.0,
      overallLengthM: 1.2,
      axles,
      hasAssociatedLaneLoad: true,
      laneLoadKnPerM: 7.5,
      designLaneWidthM: 3.0,
      dynamicLoadAllowance: 0.0,
      isFatigueTruck: false,
    };
  }

  /**
   * Eurocode 1 EN 1991-2 Load Model 2 (LM2)
   * Single heavy 400 kN axle for short span members and local deck slab punching.
   */
  public static getEurocodeLM2SingleAxle(): VehicularTrain {
    const axles: AxleDefinition[] = [
      {
        id: 'ec-lm2-axle1',
        axleIndex: 1,
        loadKn: 400.0,
        wheelLoadKn: 200.0,
        transverseTrackWidthM: 2.0,
        spacingToNextM: 0,
        contactPatch: { lengthMm: 350, widthMm: 600 },
      },
    ];

    return {
      id: 'ec-lm2-single-axle',
      name: 'Eurocode LM2 (Single 400 kN Axle)',
      standard: 'EUROCODE-1',
      category: 'truck',
      description: 'EN 1991-2 Load Model 2: Single 400 kN heavy axle for local deck slab design and short expansion joints.',
      totalWeightKn: 400.0,
      overallLengthM: 0.0,
      axles,
      hasAssociatedLaneLoad: false,
      laneLoadKnPerM: 0.0,
      designLaneWidthM: 3.0,
      dynamicLoadAllowance: 0.0,
      isFatigueTruck: false,
    };
  }

  /**
   * IRC 6:2017 Class 70R (Tracked Vehicle)
   * Total weight: 700 kN (70 tonnes) on two continuous crawler tracks.
   * Discretized as two 350 kN track loads over 4.57 m bogie length.
   */
  public static getIrcClass70RTracked(): VehicularTrain {
    // Discretize into 4 equivalent bogie axle contact pairs spaced at 1.52 m
    const axleLoad = 700.0 / 4; // 175 kN per station
    const axles: AxleDefinition[] = [
      {
        id: 'irc-70r-track-1',
        axleIndex: 1,
        loadKn: axleLoad,
        wheelLoadKn: axleLoad / 2,
        transverseTrackWidthM: 2.06,
        spacingToNextM: 1.52,
        contactPatch: { lengthMm: 1140, widthMm: 840 },
      },
      {
        id: 'irc-70r-track-2',
        axleIndex: 2,
        loadKn: axleLoad,
        wheelLoadKn: axleLoad / 2,
        transverseTrackWidthM: 2.06,
        spacingToNextM: 1.52,
        contactPatch: { lengthMm: 1140, widthMm: 840 },
      },
      {
        id: 'irc-70r-track-3',
        axleIndex: 3,
        loadKn: axleLoad,
        wheelLoadKn: axleLoad / 2,
        transverseTrackWidthM: 2.06,
        spacingToNextM: 1.52,
        contactPatch: { lengthMm: 1140, widthMm: 840 },
      },
      {
        id: 'irc-70r-track-4',
        axleIndex: 4,
        loadKn: axleLoad,
        wheelLoadKn: axleLoad / 2,
        transverseTrackWidthM: 2.06,
        spacingToNextM: 0,
        contactPatch: { lengthMm: 1140, widthMm: 840 },
      },
    ];

    return {
      id: 'irc-70r-tracked',
      name: 'IRC Class 70R (Tracked)',
      standard: 'IRC-6',
      category: 'tracked',
      description: 'IRC 6:2017 Class 70R 700 kN (70 tonne) tracked military/commercial tank carrier.',
      totalWeightKn: 700.0,
      overallLengthM: 4.57,
      axles,
      hasAssociatedLaneLoad: false,
      laneLoadKnPerM: 0,
      designLaneWidthM: 3.5,
      dynamicLoadAllowance: 0.25, // 25% for spans <= 5m, decreasing with span
      isFatigueTruck: false,
    };
  }

  /**
   * IRC 6:2017 Class 70R (Wheeled Vehicle)
   * 7-axle bogie train totaling 1000 kN (100 tonnes).
   * Axles: 80, 120, 120, 170, 170, 170, 170 kN.
   * Spacings: 3.96, 1.52, 2.13, 1.37, 3.05, 1.37 m.
   */
  public static getIrcClass70RWheeled(): VehicularTrain {
    const loads = [80.0, 120.0, 120.0, 170.0, 170.0, 170.0, 170.0];
    const spacings = [3.96, 1.52, 2.13, 1.37, 3.05, 1.37, 0.0];

    const axles: AxleDefinition[] = loads.map((loadKn, i) => ({
      id: `irc-70r-wheel-${i + 1}`,
      axleIndex: i + 1,
      loadKn,
      wheelLoadKn: loadKn / 2,
      transverseTrackWidthM: 1.93,
      spacingToNextM: spacings[i],
      contactPatch: { lengthMm: 300, widthMm: 450 },
    }));

    return {
      id: 'irc-70r-wheeled',
      name: 'IRC Class 70R (Wheeled 100t)',
      standard: 'IRC-6',
      category: 'truck',
      description: 'IRC 6:2017 Class 70R 7-axle heavy wheeled vehicle (1000 kN total weight).',
      totalWeightKn: 1000.0,
      overallLengthM: spacings.reduce((sum, s) => sum + s, 0),
      axles,
      hasAssociatedLaneLoad: false,
      laneLoadKnPerM: 0,
      designLaneWidthM: 3.5,
      dynamicLoadAllowance: 0.25,
      isFatigueTruck: false,
    };
  }

  /**
   * IRC 6:2017 Class A Train of Vehicles
   * 8-axle vehicle train totaling 554 kN (55.4 tonnes).
   * Axles: 27, 27, 114, 114, 68, 68, 68, 68 kN.
   * Spacings: 1.1, 3.2, 1.2, 4.3, 3.0, 3.0, 3.0 m.
   */
  public static getIrcClassATrain(): VehicularTrain {
    const loads = [27.0, 27.0, 114.0, 114.0, 68.0, 68.0, 68.0, 68.0];
    const spacings = [1.1, 3.2, 1.2, 4.3, 3.0, 3.0, 3.0, 0.0];

    const axles: AxleDefinition[] = loads.map((loadKn, i) => ({
      id: `irc-class-a-axle-${i + 1}`,
      axleIndex: i + 1,
      loadKn,
      wheelLoadKn: loadKn / 2,
      transverseTrackWidthM: 1.80,
      spacingToNextM: spacings[i],
      contactPatch: { lengthMm: 250, widthMm: 400 },
    }));

    return {
      id: 'irc-class-a',
      name: 'IRC Class A Train of Vehicles',
      standard: 'IRC-6',
      category: 'lane-train',
      description: 'IRC 6:2017 Class A standard highway design vehicle train (554 kN total across 8 axles).',
      totalWeightKn: 554.0,
      overallLengthM: spacings.reduce((sum, s) => sum + s, 0),
      axles,
      hasAssociatedLaneLoad: false,
      laneLoadKnPerM: 0,
      designLaneWidthM: 3.5,
      dynamicLoadAllowance: 0.25,
      isFatigueTruck: false,
    };
  }

  /**
   * Return all standard vehicular live load trains in the catalog
   */
  public static getAllVehicles(standard?: BridgeStandard): VehicularTrain[] {
    const all: VehicularTrain[] = [
      this.getAashtoHL93Truck(),
      this.getAashtoHL93Tandem(),
      this.getAashtoFatigueTruck(),
      this.getEurocodeLM1Lane1(),
      this.getEurocodeLM1Lane2(),
      this.getEurocodeLM2SingleAxle(),
      this.getIrcClass70RTracked(),
      this.getIrcClass70RWheeled(),
      this.getIrcClassATrain(),
    ];

    if (standard && standard !== 'CUSTOM') {
      return all.filter(v => v.standard === standard);
    }
    return all;
  }

  /**
   * Find vehicle by ID
   */
  public static getVehicleById(id: string): VehicularTrain | undefined {
    return this.getAllVehicles().find(v => v.id === id);
  }

  /**
   * Create custom axle train
   */
  public static createCustomVehicle(params: {
    id: string;
    name: string;
    description?: string;
    axleLoadsKn: number[];
    axleSpacingsM: number[]; // Length should be axleLoadsKn.length - 1
    transverseTrackWidthM?: number;
    hasLaneLoad?: boolean;
    laneLoadKnPerM?: number;
    dynamicLoadAllowance?: number;
  }): VehicularTrain {
    const trackWidth = params.transverseTrackWidthM ?? 1.8;
    const dynamicAllowance = params.dynamicLoadAllowance ?? 0.33;

    if (params.axleSpacingsM.length !== params.axleLoadsKn.length - 1) {
      throw new Error(`Axle spacings count (${params.axleSpacingsM.length}) must be exactly one less than axle loads count (${params.axleLoadsKn.length})`);
    }

    const axles: AxleDefinition[] = params.axleLoadsKn.map((loadKn, i) => ({
      id: `custom-axle-${i + 1}`,
      axleIndex: i + 1,
      loadKn,
      wheelLoadKn: loadKn / 2,
      transverseTrackWidthM: trackWidth,
      spacingToNextM: i < params.axleSpacingsM.length ? params.axleSpacingsM[i] : 0,
      contactPatch: { lengthMm: 250, widthMm: 500 },
    }));

    const totalWeightKn = params.axleLoadsKn.reduce((sum, l) => sum + l, 0);
    const overallLengthM = params.axleSpacingsM.reduce((sum, s) => sum + s, 0);

    return {
      id: params.id,
      name: params.name,
      standard: 'CUSTOM',
      category: 'truck',
      description: params.description ?? 'Custom user-defined multi-axle vehicle train.',
      totalWeightKn,
      overallLengthM,
      axles,
      hasAssociatedLaneLoad: params.hasLaneLoad ?? false,
      laneLoadKnPerM: params.laneLoadKnPerM ?? 0,
      designLaneWidthM: 3.6,
      dynamicLoadAllowance: dynamicAllowance,
      isFatigueTruck: false,
    };
  }

  /**
   * Return axle stations relative to front axle (x = 0)
   */
  public static getAxleOffsetsFromFront(vehicle: VehicularTrain): number[] {
    const offsets: number[] = [0];
    let runningDist = 0;
    for (let i = 0; i < vehicle.axles.length - 1; i++) {
      runningDist += vehicle.axles[i].spacingToNextM;
      offsets.push(runningDist);
    }
    return offsets;
  }
}
