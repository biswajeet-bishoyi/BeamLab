import { describe, it, expect } from 'vitest';
import {
  TIMBER_GRADES_DATABASE,
  getTimberGrade,
  TimberModificationEngine,
  OrthotropicWoodModel,
  TimberMaterialEngine,
} from './index';

describe('Sprint B14.1: Timber Material Domain & Orthotropic Constitutive Engine', () => {
  it('should retrieve standard wood grades with valid orthotropic engineering properties', () => {
    const c24 = getTimberGrade('C24');
    expect(c24.name).toBe('C24 Structural Softwood');
    expect(c24.category).toBe('SOFTWOOD');
    expect(c24.fm_k).toBe(24.0);
    expect(c24.E0_mean).toBe(11000);
    expect(c24.E90_mean).toBe(370);
    expect(c24.G0_mean).toBe(690);

    const gl28h = getTimberGrade('GL28h');
    expect(gl28h.category).toBe('GLULAM');
    expect(gl28h.fm_k).toBe(28.0);
    expect(gl28h.density).toBe(460);

    const teak = getTimberGrade('Teak');
    expect(teak.standard).toBe('IS_883');
    expect(teak.category).toBe('HARDWOOD');
    expect(teak.fm_k).toBe(16.8);
  });

  it('should compute Eurocode 5 k_mod factors accurately across service classes and durations', () => {
    // Service Class 1
    expect(TimberModificationEngine.getEc5Kmod('SOFTWOOD', 1, 'PERMANENT')).toBe(0.60);
    expect(TimberModificationEngine.getEc5Kmod('SOFTWOOD', 1, 'MEDIUM_TERM')).toBe(0.80);
    expect(TimberModificationEngine.getEc5Kmod('SOFTWOOD', 1, 'SHORT_TERM')).toBe(0.90);
    expect(TimberModificationEngine.getEc5Kmod('SOFTWOOD', 1, 'INSTANTANEOUS')).toBe(1.10);

    // Service Class 3 (exterior / humid)
    expect(TimberModificationEngine.getEc5Kmod('SOFTWOOD', 3, 'PERMANENT')).toBe(0.50);
    expect(TimberModificationEngine.getEc5Kmod('SOFTWOOD', 3, 'SHORT_TERM')).toBe(0.70);
  });

  it('should calculate Eurocode 5 depth factor k_h with upper bound limits', () => {
    // Solid timber: h = 100 mm (< 150 mm)
    const kh_solid = TimberModificationEngine.getEc5Kh(100, 'SOFTWOOD');
    expect(kh_solid).toBeGreaterThan(1.0);
    expect(kh_solid).toBeLessThanOrEqual(1.3);

    // Deep glulam beam: h = 800 mm (>= 600 mm)
    const kh_glulam_deep = TimberModificationEngine.getEc5Kh(800, 'GLULAM');
    expect(kh_glulam_deep).toBe(1.0);

    // Shallow glulam beam: h = 300 mm (< 600 mm)
    const kh_glulam_shallow = TimberModificationEngine.getEc5Kh(300, 'GLULAM');
    expect(kh_glulam_shallow).toBeGreaterThan(1.0);
    expect(kh_glulam_shallow).toBeLessThanOrEqual(1.1);
  });

  it('should evaluate NDS 2024 load duration and size adjustment factors', () => {
    expect(TimberModificationEngine.getNdsCd('DEAD_0_9')).toBe(0.90);
    expect(TimberModificationEngine.getNdsCd('OCCUPANCY_1_0')).toBe(1.00);
    expect(TimberModificationEngine.getNdsCd('SNOW_1_15')).toBe(1.15);
    expect(TimberModificationEngine.getNdsCd('WIND_SEISMIC_1_6')).toBe(1.60);
    expect(TimberModificationEngine.getNdsCd('IMPACT_2_0')).toBe(2.00);

    // Sawn lumber size factor CF for 2x4 (depth 89mm / 3.5 in)
    const cf_2x4 = TimberModificationEngine.getNdsCf(89, 38);
    expect(cf_2x4).toBe(1.5);

    // Glulam volume factor CV for 6m beam
    const cv = TimberModificationEngine.getNdsCv(6.0, 400, 140);
    expect(cv).toBeGreaterThan(0.7);
    expect(cv).toBeLessThanOrEqual(1.0);
  });

  it('should evaluate Hankinson off-axis strength formula smoothly from 0 to 90 degrees', () => {
    const f0 = 24.0;  // parallel (e.g. 24 MPa)
    const f90 = 2.5;  // perpendicular (e.g. 2.5 MPa)

    const at0Deg = OrthotropicWoodModel.hankinson(f0, f90, 0);
    expect(at0Deg).toBeCloseTo(f0, 4);

    const at90Deg = OrthotropicWoodModel.hankinson(f0, f90, Math.PI / 2);
    expect(at90Deg).toBeCloseTo(f90, 4);

    const at45Deg = OrthotropicWoodModel.hankinson(f0, f90, Math.PI / 4);
    // f_45 = (24 * 2.5) / (24 * 0.5 + 2.5 * 0.5) = 60 / 13.25 = 4.528 MPa
    expect(at45Deg).toBeGreaterThan(f90);
    expect(at45Deg).toBeLessThan(f0);
    expect(at45Deg).toBeCloseTo(4.528, 2);
  });

  it('should calculate 2D plane stress stiffness matrix and evaluate Norris failure criterion', () => {
    const stiffness = OrthotropicWoodModel.computePlaneStressStiffness(11000, 370, 690, 0.40);
    expect(stiffness.C11).toBeGreaterThan(11000);
    expect(stiffness.C22).toBeGreaterThan(370);
    expect(stiffness.C33).toBe(690);

    // Safe stress state
    const safeCheck = OrthotropicWoodModel.evaluateNorrisCriterion(10.0, 0.5, 1.0, 24.0, 2.5, 4.0);
    expect(safeCheck.isCompliant).toBe(true);
    expect(safeCheck.dcr).toBeLessThan(1.0);

    // Excessive stress state
    const overCheck = OrthotropicWoodModel.evaluateNorrisCriterion(30.0, 3.0, 5.0, 24.0, 2.5, 4.0);
    expect(overCheck.isCompliant).toBe(false);
    expect(overCheck.dcr).toBeGreaterThan(1.0);
  });

  it('should compute full codified design strengths for Eurocode 5 and NDS', () => {
    // Eurocode 5 design for C24 in Service Class 1 with medium-term load (e.g. imposed floor load)
    const ec5Design = TimberMaterialEngine.computeEurocode5DesignStrengths('C24', {
      serviceClass: 1,
      loadDuration: 'MEDIUM_TERM',
      memberType: 'SOLID_TIMBER',
      h: 200,
    });
    // fm_d = (0.80 / 1.30) * 24.0 = 14.77 MPa
    expect(ec5Design.fm_d).toBeCloseTo(14.77, 1);
    expect(ec5Design.fc0_d).toBeCloseTo((0.80 / 1.30) * 21.0, 1);
    expect(ec5Design.E0_eff).toBeCloseTo(11000 / (1 + 0.60), 0);

    // NDS design for DF_L_No1 with Snow Load (CD = 1.15)
    const ndsDesign = TimberMaterialEngine.computeNdsDesignStrengths('DF_L_No1', {
      loadDuration: 'SNOW_1_15',
      isWetService: false,
      temperatureC: 20,
      d: 200,
      b: 50,
    });
    expect(ndsDesign.fm_d).toBeGreaterThan(TIMBER_GRADES_DATABASE['DF_L_No1'].fm_k);
    expect(ndsDesign.standard).toBe('NDS');
  });
});
