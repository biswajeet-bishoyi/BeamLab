/**
 * Missile Impact & High-Velocity Penetration Mechanics Engine
 * Formulated using Modified NDRC and Ballistic Research Laboratory (BRL) Equations
 * @packageDocumentation
 */

import { ProjectileImpactParams, ProjectileImpactResult } from '../types';

export class ImpactEngine {
  /**
   * Evaluate projectile penetration depth, scabbing, and perforation limits
   */
  public static evaluateImpact(params: ProjectileImpactParams): ProjectileImpactResult {
    const {
      projectileMassKg: M,
      initialVelocityMPerS: v0,
      projectileDiameterM: d,
      noseShapeFactor = 1.0,
      targetMaterial,
      targetThicknessM: H,
      concreteCompressiveStrengthMPa = 35,
      steelYieldStrengthMPa = 355,
    } = params;

    if (targetMaterial === 'reinforced-concrete') {
      // Modified NDRC Formula for Concrete Barriers
      const fc = Math.max(15, concreteCompressiveStrengthMPa);
      const Nstar = noseShapeFactor;

      // NDRC dimensionless impact factor G:
      // K = (180 / sqrt(fc_psi)) * (W / d^3) * (v0 / 1000)^1.8 in US customary
      // SI form: K_SI = (0.00799 / sqrt(fc_MPa)) * (M / d^3) * (v0 / 1000)^1.8
      // where M in kg, d in m, fc in MPa, v0 in m/s
      const termM_d3 = M / (d ** 3);
      const termV = (v0 / 1000) ** 1.8;
      const K = (0.00799 / Math.sqrt(fc)) * termM_d3 * termV;
      const G = K * Nstar;

      // Penetration ratio x/d
      let xOverD = 0;
      if (G <= 1.0) {
        xOverD = 2 * Math.sqrt(Math.max(0, G));
      } else {
        xOverD = 1 + G;
      }
      const xPenetrationM = xOverD * d;

      // Scabbing thickness limit hs
      let hsOverD = 0;
      if (xOverD <= 0.65) {
        hsOverD = 7.91 * xOverD - 5.06 * (xOverD ** 2);
      } else {
        hsOverD = 2.12 + 1.36 * xOverD;
      }
      const hsM = hsOverD * d;

      // Perforation thickness limit hp
      let hpOverD = 0;
      if (xOverD <= 0.65) {
        hpOverD = 3.19 * xOverD - 0.718 * (xOverD ** 2);
      } else {
        hpOverD = 1.32 + 1.24 * xOverD;
      }
      const hpM = hpOverD * d;

      const perforated = H < hpM;
      const scabbingOccurs = H < hsM;

      // Residual exit velocity if perforated
      let residualVelocity = 0;
      if (perforated && hpM > 0) {
        const ballisticLimit = v0 * Math.sqrt(H / hpM);
        residualVelocity = Math.sqrt(Math.max(0, v0 ** 2 - ballisticLimit ** 2));
      }

      let damageLevel: ProjectileImpactResult['damageLevel'] = 'superficial';
      if (perforated) {
        damageLevel = 'full-perforation';
      } else if (scabbingOccurs) {
        damageLevel = 'scabbing';
      } else if (xPenetrationM > 0.05 * H) {
        damageLevel = 'cratering';
      }

      return {
        penetrationDepthM: xPenetrationM,
        scabbingLimitThicknessM: hsM,
        perforationLimitThicknessM: hpM,
        residualVelocityMPerS: residualVelocity,
        perforated,
        scabbingOccurs,
        damageLevel,
      };
    } else {
      // BRL (Ballistic Research Laboratory) Formula for Structural Steel Plates
      const kineticEnergyJoules = 0.5 * M * (v0 ** 2);
      const fy = Math.max(200, steelYieldStrengthMPa);

      // Perforation thickness limit hp for steel (m):
      // hp = (KE^0.67) / (672 * d) * (355 / fy) in SI units
      const hpM = Math.max(0.001, (kineticEnergyJoules ** 0.67) / (672000 * d) * (355 / fy));
      const perforated = H < hpM;

      let residualVelocity = 0;
      if (perforated && hpM > 0) {
        const ballisticLimit = v0 * Math.sqrt(H / hpM);
        residualVelocity = Math.sqrt(Math.max(0, v0 ** 2 - ballisticLimit ** 2));
      }

      return {
        penetrationDepthM: Math.min(H, (H / hpM) * H),
        scabbingLimitThicknessM: hpM * 1.15,
        perforationLimitThicknessM: hpM,
        residualVelocityMPerS: residualVelocity,
        perforated,
        scabbingOccurs: perforated,
        damageLevel: perforated ? 'full-perforation' : 'cratering',
      };
    }
  }
}
