export interface ConcreteCrossSection {
  type: 'rectangular' | 't-beam' | 'i-girder';
  totalHeightMm: number;        // h
  webWidthMm: number;           // b_w (or b for rectangular)
  flangeWidthMm?: number;       // b_f (for T-beam or top flange of I-girder)
  flangeThicknessMm?: number;   // t_f (top flange)
  bottomFlangeWidthMm?: number; // for I-girder
  bottomFlangeThicknessMm?: number;
  areaMm2: number;              // A_c
  inertiaMm4: number;           // I_g
  cgcFromBottomMm: number;      // y_bot
  cgcFromTopMm: number;         // y_top
  sectionModulusTopMm3: number; // S_top = I_g / y_top
  sectionModulusBottomMm3: number; // S_bot = I_g / y_bot
}

export interface ConcreteMaterialProperties {
  fciMpa: number;               // Concrete compressive strength at transfer (e.g., 32 MPa)
  fcMpa: number;                // 28-day concrete compressive strength (e.g., 45 MPa)
  densityKgPerM3?: number;      // Typically 2400 kg/m^3
}

export interface FiberStressInput {
  section: ConcreteCrossSection;
  concrete: ConcreteMaterialProperties;
  transferForceKn: number;      // P_i
  effectiveForceKn: number;     // P_eff
  eccentricityMm: number;       // e (at station, positive upwards, negative downwards)
  selfWeightMomentKnm: number;  // M_0
  sustainedDeadMomentKnm: number; // M_D
  totalServiceMomentKnm: number;  // M_D + M_L
}

export interface FiberStressReport {
  transferStage: {
    topFiberStressMpa: number;
    bottomFiberStressMpa: number;
    allowableCompressionMpa: number; // 0.60 * fci
    allowableTensionMpa: number;     // 0.25 * sqrt(fci)
    topStressPass: boolean;
    bottomStressPass: boolean;
    utilizationCompression: number;
    utilizationTension: number;
  };
  serviceStage: {
    topFiberStressMpa: number;
    bottomFiberStressMpa: number;
    sustainedTopFiberStressMpa: number;
    allowableSustainedCompressionMpa: number; // 0.45 * fc
    allowableTotalCompressionMpa: number;     // 0.60 * fc
    allowableClassUTensionMpa: number;        // 0.62 * sqrt(fc)
    allowableClassTTensionMpa: number;        // 1.00 * sqrt(fc)
    crackClassification: 'Class U (Uncracked)' | 'Class T (Transition)' | 'Class C (Cracked)';
    decompressionMomentKnm: number;           // M_dec (moment to cause zero bottom stress)
    serviceStressPass: boolean;
    topUtilization: number;
    bottomUtilization: number;
  };
}

export class FiberStressAuditor {
  public static createRectangularSection(widthMm: number, heightMm: number): ConcreteCrossSection {
    const b = widthMm;
    const h = heightMm;
    const areaMm2 = b * h;
    const inertiaMm4 = (b * Math.pow(h, 3)) / 12;
    const cgc = h / 2;
    const sMod = inertiaMm4 / cgc;

    return {
      type: 'rectangular',
      totalHeightMm: h,
      webWidthMm: b,
      areaMm2,
      inertiaMm4,
      cgcFromBottomMm: cgc,
      cgcFromTopMm: cgc,
      sectionModulusTopMm3: sMod,
      sectionModulusBottomMm3: sMod,
    };
  }

  public static createTBeamSection(
    webWidthMm: number,
    totalHeightMm: number,
    flangeWidthMm: number,
    flangeThicknessMm: number
  ): ConcreteCrossSection {
    const bw = webWidthMm;
    const h = totalHeightMm;
    const bf = flangeWidthMm;
    const tf = flangeThicknessMm;

    const aFlange = bf * tf;
    const aWeb = bw * (h - tf);
    const areaMm2 = aFlange + aWeb;

    // Centroid from bottom:
    const yFlange = h - tf / 2;
    const yWeb = (h - tf) / 2;
    const cgcFromBottomMm = (aFlange * yFlange + aWeb * yWeb) / areaMm2;
    const cgcFromTopMm = h - cgcFromBottomMm;

    // Moment of inertia about neutral axis:
    const iFlange = (bf * Math.pow(tf, 3)) / 12 + aFlange * Math.pow(yFlange - cgcFromBottomMm, 2);
    const iWeb = (bw * Math.pow(h - tf, 3)) / 12 + aWeb * Math.pow(yWeb - cgcFromBottomMm, 2);
    const inertiaMm4 = iFlange + iWeb;

    return {
      type: 't-beam',
      totalHeightMm: h,
      webWidthMm: bw,
      flangeWidthMm: bf,
      flangeThicknessMm: tf,
      areaMm2,
      inertiaMm4,
      cgcFromBottomMm,
      cgcFromTopMm,
      sectionModulusTopMm3: inertiaMm4 / cgcFromTopMm,
      sectionModulusBottomMm3: inertiaMm4 / cgcFromBottomMm,
    };
  }

  public static auditFiberStresses(input: FiberStressInput): FiberStressReport {
    const { section, concrete, transferForceKn: Pi, effectiveForceKn: Peff, eccentricityMm: e } = input;
    const M0 = input.selfWeightMomentKnm;
    const MD = input.sustainedDeadMomentKnm;
    const MS = input.totalServiceMomentKnm;

    const Ac = section.areaMm2;
    const Stop = section.sectionModulusTopMm3;
    const Sbot = section.sectionModulusBottomMm3;

    // Sign convention:
    // Compression is POSITIVE (+), Tension is NEGATIVE (-) in structural concrete stress checks!
    // Axial compression stress: sigma_a = +P / Ac
    // Prestress moment about cgc: M_p = P * (-e) where e < 0 (below cgc) produces positive sagging moment!
    // Bottom fiber stress from M_p: +M_p / Sbot = -P*e / Sbot (compression)
    // Top fiber stress from M_p: -M_p / Stop = +P*e / Stop (tension)
    // Gravity positive sagging moment M creates: top compression (+M / Stop), bottom tension (-M / Sbot).

    // --- STAGE 1: INITIAL TRANSFER (t = 0) ---
    // Top fiber: sigma_top = +Pi/Ac - (Pi*(-e))/Stop + M0/Stop = +Pi/Ac + Pi*e/Stop + M0/Stop
    // When e is negative (-350mm), Pi*e/Stop is negative (tension).
    const topStressTransfer = (Pi * 1000) / Ac + (Pi * 1000 * e) / Stop + (M0 * 1e6) / Stop;
    // Bottom fiber: sigma_bot = +Pi/Ac + (Pi*(-e))/Sbot - M0/Sbot = +Pi/Ac - Pi*e/Sbot - M0/Sbot
    // When e is negative (-350mm), -Pi*e/Sbot is positive (high compression).
    const botStressTransfer = (Pi * 1000) / Ac - (Pi * 1000 * e) / Sbot - (M0 * 1e6) / Sbot;

    const allowableCompTransfer = 0.60 * concrete.fciMpa;
    const allowableTensTransfer = -0.25 * Math.sqrt(concrete.fciMpa);

    const topStressPassTransfer = topStressTransfer >= allowableTensTransfer && topStressTransfer <= allowableCompTransfer;
    const botStressPassTransfer = botStressTransfer >= allowableTensTransfer && botStressTransfer <= allowableCompTransfer;

    // --- STAGE 2: SERVICEABILITY LIMIT STATE (SLS) ---
    // Sustained load (Prestress + MD):
    const sustainedTopStress = (Peff * 1000) / Ac + (Peff * 1000 * e) / Stop + (MD * 1e6) / Stop;
    // Total service load (Prestress + MS):
    const topStressService = (Peff * 1000) / Ac + (Peff * 1000 * e) / Stop + (MS * 1e6) / Stop;
    const botStressService = (Peff * 1000) / Ac - (Peff * 1000 * e) / Sbot - (MS * 1e6) / Sbot;

    const allowableSustainedComp = 0.45 * concrete.fcMpa;
    const allowableTotalComp = 0.60 * concrete.fcMpa;
    const allowableTensClassU = -0.62 * Math.sqrt(concrete.fcMpa);
    const allowableTensClassT = -1.00 * Math.sqrt(concrete.fcMpa);

    let crackClass: 'Class U (Uncracked)' | 'Class T (Transition)' | 'Class C (Cracked)';
    if (botStressService >= allowableTensClassU) {
      crackClass = 'Class U (Uncracked)';
    } else if (botStressService >= allowableTensClassT) {
      crackClass = 'Class T (Transition)';
    } else {
      crackClass = 'Class C (Cracked)';
    }

    // Decompression moment: moment M_dec where sigma_bot = 0:
    // 0 = +Peff/Ac - Peff*e/Sbot - M_dec/Sbot => M_dec = Peff * Sbot/Ac - Peff*e
    // in kNm: (Peff * (Sbot/Ac - e)) / 1000
    const decompressionMomentKnm = (Peff * (Sbot / Ac - e)) / 1000;

    const servicePass = topStressService <= allowableTotalComp && sustainedTopStress <= allowableSustainedComp && botStressService >= allowableTensClassU;

    return {
      transferStage: {
        topFiberStressMpa: Math.round(topStressTransfer * 100) / 100,
        bottomFiberStressMpa: Math.round(botStressTransfer * 100) / 100,
        allowableCompressionMpa: Math.round(allowableCompTransfer * 100) / 100,
        allowableTensionMpa: Math.round(allowableTensTransfer * 100) / 100,
        topStressPass: topStressPassTransfer,
        bottomStressPass: botStressPassTransfer,
        utilizationCompression: Math.round((Math.max(topStressTransfer, botStressTransfer) / allowableCompTransfer) * 1000) / 1000,
        utilizationTension: Math.round((Math.abs(Math.min(0, topStressTransfer)) / Math.abs(allowableTensTransfer || 1)) * 1000) / 1000,
      },
      serviceStage: {
        topFiberStressMpa: Math.round(topStressService * 100) / 100,
        bottomFiberStressMpa: Math.round(botStressService * 100) / 100,
        sustainedTopFiberStressMpa: Math.round(sustainedTopStress * 100) / 100,
        allowableSustainedCompressionMpa: Math.round(allowableSustainedComp * 100) / 100,
        allowableTotalCompressionMpa: Math.round(allowableTotalComp * 100) / 100,
        allowableClassUTensionMpa: Math.round(allowableTensClassU * 100) / 100,
        allowableClassTTensionMpa: Math.round(allowableTensClassT * 100) / 100,
        crackClassification: crackClass,
        decompressionMomentKnm: Math.round(decompressionMomentKnm * 10) / 10,
        serviceStressPass: servicePass,
        topUtilization: Math.round((topStressService / allowableTotalComp) * 1000) / 1000,
        bottomUtilization: Math.round((Math.abs(Math.min(0, botStressService)) / Math.abs(allowableTensClassU || 1)) * 1000) / 1000,
      },
    };
  }
}
