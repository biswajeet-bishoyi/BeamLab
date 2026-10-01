import { describe, it, expect } from 'vitest';
import { VehicularCatalog } from './VehicularCatalog.js';

describe('VehicularCatalog & Bridge Standards Domain', () => {
  describe('AASHTO LRFD HL-93 Vehicles', () => {
    it('should correctly configure AASHTO HL-93 Design Truck with standard spacing', () => {
      const truck = VehicularCatalog.getAashtoHL93Truck();
      expect(truck.standard).toBe('AASHTO-LRFD');
      expect(truck.totalWeightKn).toBe(319.0);
      expect(truck.axles.length).toBe(3);
      expect(truck.axles[0].loadKn).toBe(35.0);
      expect(truck.axles[1].loadKn).toBe(142.0);
      expect(truck.axles[2].loadKn).toBe(142.0);
      expect(truck.axles[0].spacingToNextM).toBe(4.3);
      expect(truck.axles[1].spacingToNextM).toBe(4.3);
      expect(truck.overallLengthM).toBe(8.6);
      expect(truck.hasAssociatedLaneLoad).toBe(true);
      expect(truck.laneLoadKnPerM).toBe(9.3);
      expect(truck.dynamicLoadAllowance).toBe(0.33);

      const offsets = VehicularCatalog.getAxleOffsetsFromFront(truck);
      expect(offsets).toEqual([0, 4.3, 8.6]);
    });

    it('should support variable rear axle spacing within 4.3 m to 9.0 m range', () => {
      const longTruck = VehicularCatalog.getAashtoHL93Truck(9.0);
      expect(longTruck.overallLengthM).toBe(13.3);
      expect(longTruck.axles[1].spacingToNextM).toBe(9.0);

      // Verify clamping if out of range
      const clampedLow = VehicularCatalog.getAashtoHL93Truck(2.0);
      expect(clampedLow.axles[1].spacingToNextM).toBe(4.3);

      const clampedHigh = VehicularCatalog.getAashtoHL93Truck(12.0);
      expect(clampedHigh.axles[1].spacingToNextM).toBe(9.0);
    });

    it('should correctly configure AASHTO HL-93 Design Tandem and Fatigue Truck', () => {
      const tandem = VehicularCatalog.getAashtoHL93Tandem();
      expect(tandem.totalWeightKn).toBe(220.0);
      expect(tandem.axles.length).toBe(2);
      expect(tandem.axles[0].spacingToNextM).toBe(1.2);
      expect(tandem.laneLoadKnPerM).toBe(9.3);

      const fatigue = VehicularCatalog.getAashtoFatigueTruck();
      expect(fatigue.isFatigueTruck).toBe(true);
      expect(fatigue.hasAssociatedLaneLoad).toBe(false);
      expect(fatigue.dynamicLoadAllowance).toBe(0.15);
      expect(fatigue.axles[1].spacingToNextM).toBe(9.0);
    });
  });

  describe('Eurocode 1 EN 1991-2 Vehicles', () => {
    it('should correctly configure Load Model 1 (LM1) Tandem Systems and UDL', () => {
      const lm1Lane1 = VehicularCatalog.getEurocodeLM1Lane1();
      expect(lm1Lane1.standard).toBe('EUROCODE-1');
      expect(lm1Lane1.totalWeightKn).toBe(600.0);
      expect(lm1Lane1.axles[0].loadKn).toBe(300.0);
      expect(lm1Lane1.axles[1].loadKn).toBe(300.0);
      expect(lm1Lane1.laneLoadKnPerM).toBe(27.0);

      const lm1Lane2 = VehicularCatalog.getEurocodeLM1Lane2();
      expect(lm1Lane2.totalWeightKn).toBe(400.0);
      expect(lm1Lane2.axles[0].loadKn).toBe(200.0);
      expect(lm1Lane2.laneLoadKnPerM).toBe(7.5);
    });

    it('should correctly configure Load Model 2 (LM2) single axle', () => {
      const lm2 = VehicularCatalog.getEurocodeLM2SingleAxle();
      expect(lm2.totalWeightKn).toBe(400.0);
      expect(lm2.axles.length).toBe(1);
      expect(lm2.axles[0].wheelLoadKn).toBe(200.0);
      expect(lm2.overallLengthM).toBe(0.0);
    });
  });

  describe('IRC 6:2017 Vehicles', () => {
    it('should correctly configure IRC Class 70R Tracked and Wheeled', () => {
      const tracked = VehicularCatalog.getIrcClass70RTracked();
      expect(tracked.standard).toBe('IRC-6');
      expect(tracked.totalWeightKn).toBe(700.0);
      expect(tracked.overallLengthM).toBe(4.57);

      const wheeled = VehicularCatalog.getIrcClass70RWheeled();
      expect(wheeled.totalWeightKn).toBe(1000.0);
      expect(wheeled.axles.length).toBe(7);
      expect(wheeled.axles[0].loadKn).toBe(80.0);
      expect(wheeled.axles[1].loadKn).toBe(120.0);
      expect(wheeled.axles[6].loadKn).toBe(170.0);
    });

    it('should correctly configure IRC Class A Vehicle Train', () => {
      const classA = VehicularCatalog.getIrcClassATrain();
      expect(classA.totalWeightKn).toBe(554.0);
      expect(classA.axles.length).toBe(8);
      expect(classA.axles[0].loadKn).toBe(27.0);
      expect(classA.axles[2].loadKn).toBe(114.0);
      expect(classA.axles[7].loadKn).toBe(68.0);
    });
  });

  describe('Custom Vehicle Builder & Catalog Filtering', () => {
    it('should filter vehicles by standard', () => {
      const aashtoOnly = VehicularCatalog.getAllVehicles('AASHTO-LRFD');
      expect(aashtoOnly.every(v => v.standard === 'AASHTO-LRFD')).toBe(true);
      expect(aashtoOnly.length).toBe(3);

      const ecOnly = VehicularCatalog.getAllVehicles('EUROCODE-1');
      expect(ecOnly.length).toBe(3);

      const ircOnly = VehicularCatalog.getAllVehicles('IRC-6');
      expect(ircOnly.length).toBe(3);
    });

    it('should create custom vehicle trains with validated spacings', () => {
      const custom = VehicularCatalog.createCustomVehicle({
        id: 'special-crane-500',
        name: '4-Axle Heavy Mobile Crane',
        axleLoadsKn: [100, 120, 140, 140],
        axleSpacingsM: [2.5, 1.8, 1.8],
        transverseTrackWidthM: 2.1,
      });

      expect(custom.totalWeightKn).toBe(500.0);
      expect(custom.overallLengthM).toBeCloseTo(6.1, 2);
      expect(custom.axles.length).toBe(4);
      expect(VehicularCatalog.getAxleOffsetsFromFront(custom)).toEqual([0, 2.5, 4.3, 6.1]);

      expect(() => {
        VehicularCatalog.createCustomVehicle({
          id: 'invalid',
          name: 'Invalid Vehicle',
          axleLoadsKn: [100, 100],
          axleSpacingsM: [2.0, 3.0], // Spacing count mismatch
        });
      }).toThrow();
    });
  });
});
